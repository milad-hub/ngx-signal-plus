import { hashQueryKey } from './query-key';
import {
  QueryKey,
  QueryObserver,
  QueryOptions,
  QueryState,
} from './query-types';

export class QueryCache {
  private queries = new Map<string, Query<unknown>>();
  private gcTimeout: ReturnType<typeof setTimeout> | null = null;

  get<T>(queryKey: QueryKey | string[]): Query<T> | undefined {
    const key = hashQueryKey(queryKey);
    return this.queries.get(key) as Query<T> | undefined;
  }

  getAll<T>(): Query<T>[] {
    return Array.from(this.queries.values()) as Query<T>[];
  }

  set<T>(queryKey: QueryKey | string[], query: Query<T>): void {
    const key = hashQueryKey(queryKey);
    this.queries.set(key, query as Query<unknown>);
  }

  delete(queryKey: QueryKey | string[]): void {
    const key = hashQueryKey(queryKey);
    const query = this.queries.get(key);
    if (query) {
      query.destroy();
      this.queries.delete(key);
    }
  }

  invalidate(queryKey: QueryKey | string[]): void {
    const key = hashQueryKey(queryKey);
    const query = this.queries.get(key);
    if (query) {
      query.invalidate();
    }
  }

  invalidateAll(): void {
    this.queries.forEach((query) => query.invalidate());
  }

  gc(): void {
    const now = Date.now();
    for (const [key, query] of this.queries.entries()) {
      if (query.canBeGarbageCollected(now)) {
        this.queries.delete(key);
        query.destroy();
      }
    }
  }

  scheduleGC(): void {
    if (this.gcTimeout) {
      clearTimeout(this.gcTimeout);
    }
    this.gcTimeout = setTimeout(() => {
      this.gc();
      this.scheduleGC();
    }, 60000);
  }

  getStats(): {
    totalQueries: number;
    activeQueries: number;
    gcReadyQueries: number;
  } {
    const totalQueries = this.queries.size;
    const activeQueries = Array.from(this.queries.values()).filter((q) =>
      q.hasObservers(),
    ).length;
    const gcReadyQueries = Array.from(this.queries.values()).filter((q) =>
      q.canBeGarbageCollected(Date.now()),
    ).length;

    return { totalQueries, activeQueries, gcReadyQueries };
  }
}

export class Query<T = unknown> {
  private observers = new Set<QueryObserver<T>>();
  private state: QueryState<T>;
  private fetchPromise: Promise<T> | null = null;
  private gcTimeout: ReturnType<typeof setTimeout> | null = null;
  private refetchInterval: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;
  private staleTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private queryKey: QueryKey | string[],
    private options: QueryOptions<T>,
  ) {
    this.state = this.createInitialState();
  }

  private createInitialState(): QueryState<T> {
    return {
      data: this.options.initialData,
      error: null,
      isLoading: false,
      isFetching: false,
      isStale: true,
      isSuccess: false,
      isError: false,
      isIdle: true,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      fetchCount: 0,
      failureCount: 0,
    };
  }

  subscribe(observer: QueryObserver<T>): () => void {
    this.observers.add(observer);

    observer.onStateUpdate(this.state);

    this.scheduleRefetch();

    if (this.state.isStale && this.options.enabled !== false) {
      this.fetch().catch(() => undefined);
    }

    return () => {
      this.observers.delete(observer);
      this.cancelRefetchInterval();

      if (this.observers.size === 0) {
        this.scheduleGarbageCollection();
      }
    };
  }

  private notify(): void {
    this.observers.forEach((observer) => observer.onStateUpdate(this.state));
  }

  async fetch(): Promise<T> {
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.state = {
      ...this.state,
      isLoading: this.state.data === undefined,
      isFetching: true,
      isError: false,
      error: null,
      fetchCount: this.state.fetchCount + 1,
    };
    this.notify();

    this.fetchPromise = this.executeFetch();

    try {
      const data = await this.fetchPromise;
      this.setData(data);
      return data;
    } catch (error) {
      this.setError(error as Error);
      throw error;
    } finally {
      this.fetchPromise = null;
      this.abortController = null;
    }
  }

  private async executeFetch(): Promise<T> {
    const { queryFn, retry = 0, retryDelay = 10 } = this.options;

    let attempt = 0;
    let lastError: Error;

    while (attempt <= (typeof retry === 'number' ? retry : Infinity)) {
      try {
        if (this.abortController?.signal.aborted) {
          throw new Error('Query aborted');
        }

        const result = await queryFn();

        if (this.options.onSuccess) {
          this.options.onSuccess(result);
        }

        if (this.options.onSettled) {
          this.options.onSettled(result, null);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const shouldRetry =
          typeof retry === 'function'
            ? retry(attempt, lastError)
            : attempt <= retry;

        if (!shouldRetry || this.abortController?.signal.aborted) {
          throw lastError;
        }

        const delay =
          typeof retryDelay === 'function'
            ? retryDelay(attempt)
            : retryDelay * Math.pow(2, attempt - 1);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private setData(data: T): void {
    this.state = {
      ...this.state,
      data,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isStale: false,
      dataUpdatedAt: Date.now(),
      failureCount: 0,
    };
    this.notify();
    this.scheduleRefetchInterval();
    this.scheduleStaleUpdate();
  }

  private setError(error: Error): void {
    this.state = {
      ...this.state,
      error,
      isLoading: false,
      isFetching: false,
      isError: true,
      errorUpdatedAt: Date.now(),
      failureCount: this.state.failureCount + 1,
    };
    this.notify();

    if (this.options.onError) {
      this.options.onError(error);
    }

    if (this.options.onSettled) {
      this.options.onSettled(undefined, error);
    }
  }

  setOptimisticData(
    updater: T | ((old: T | undefined) => T),
    markStale = false,
  ): void {
    const nextData =
      typeof updater === 'function'
        ? (updater as (old: T | undefined) => T)(this.state.data)
        : (updater as T);
    this.state = {
      ...this.state,
      data: nextData,
      isSuccess: true,
      isError: false,
      isLoading: false,
      isFetching: false,
      isStale: markStale ? true : this.state.isStale,
      dataUpdatedAt: Date.now(),
    };
    this.notify();
  }

  invalidate(): void {
    this.state = {
      ...this.state,
      isStale: true,
    };
    this.notify();

    if (this.hasObservers() && this.options.enabled !== false) {
      this.fetch().catch(() => undefined);
    }
  }

  refetch(): Promise<T> {
    return this.fetch();
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.fetchPromise) {
      this.fetchPromise = null;
    }
    if (this.state.isFetching) {
      this.state = {
        ...this.state,
        isFetching: false,
        isLoading: false,
      };
      this.notify();
    }
  }

  private scheduleRefetch(): void {
    if (this.options.refetchOnWindowFocus && typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleFocus);
    }

    if (this.options.refetchOnReconnect && typeof window !== 'undefined') {
      window.addEventListener('online', this.handleReconnect);
    }
  }

  private scheduleRefetchInterval(): void {
    this.cancelRefetchInterval();

    if (this.options.refetchInterval && this.options.refetchInterval > 0) {
      this.refetchInterval = setInterval(() => {
        if (
          this.options.refetchIntervalInBackground ||
          document.visibilityState === 'visible'
        ) {
          this.fetch().catch(() => undefined);
        }
      }, this.options.refetchInterval);
    }
  }

  private scheduleStaleUpdate(): void {
    if (this.staleTimeout) {
      clearTimeout(this.staleTimeout);
      this.staleTimeout = null;
    }

    if (this.options.staleTime && this.options.staleTime > 0) {
      const delay = this.options.staleTime;
      this.staleTimeout = setTimeout(() => {
        if (!this.state.isStale) {
          this.state = { ...this.state, isStale: true };
          this.notify();
        }
      }, delay);
    }
  }

  private cancelRefetchInterval(): void {
    if (this.refetchInterval) {
      clearInterval(this.refetchInterval);
      this.refetchInterval = null;
    }
  }

  private scheduleGarbageCollection(): void {
    if (this.gcTimeout) {
      clearTimeout(this.gcTimeout);
    }

    this.gcTimeout = setTimeout(
      () => {
        this.destroy();
      },
      this.options.cacheTime || 5 * 60 * 1000,
    );
  }

  private handleFocus = (): void => {
    if (this.options.refetchOnWindowFocus && this.hasObservers()) {
      this.fetch().catch(() => undefined);
    }
  };

  private handleReconnect = (): void => {
    if (this.options.refetchOnReconnect && this.hasObservers()) {
      this.fetch().catch(() => undefined);
    }
  };

  canBeGarbageCollected(now: number): boolean {
    const cacheTime = this.options.cacheTime || 5 * 60 * 1000;
    const lastAccessTime = Math.max(
      this.state.dataUpdatedAt,
      this.state.errorUpdatedAt,
    );
    if (lastAccessTime === 0) {
      return false;
    }
    return this.observers.size === 0 && now - lastAccessTime > cacheTime;
  }

  hasObservers(): boolean {
    return this.observers.size > 0;
  }

  getState(): QueryState<T> {
    if (this.state.data !== undefined && this.options.staleTime !== undefined) {
      const timeSinceUpdate = Date.now() - this.state.dataUpdatedAt;
      if (timeSinceUpdate > this.options.staleTime && !this.state.isStale) {
        this.state = { ...this.state, isStale: true };
      }
    }
    return this.state;
  }

  destroy(): void {
    this.cancelRefetchInterval();

    if (this.staleTimeout) {
      clearTimeout(this.staleTimeout);
      this.staleTimeout = null;
    }

    if (this.gcTimeout) {
      clearTimeout(this.gcTimeout);
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.handleFocus);
      window.removeEventListener('online', this.handleReconnect);
    }
  }
}