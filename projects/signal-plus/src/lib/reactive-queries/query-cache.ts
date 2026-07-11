import { isBrowser } from '../utils/platform';
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
    const storedQuery = query as Query<unknown>;
    this.queries.set(key, storedQuery);
    query.setEvictionHandler(() => this.evict(key, storedQuery));
  }

  delete(queryKey: QueryKey | string[]): void {
    const key = hashQueryKey(queryKey);
    this.evict(key);
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
        this.evict(key, query);
      }
    }
  }

  scheduleGC(): void {
    if (!isBrowser()) {
      return;
    }
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

  private evict(key: string, expected?: Query<unknown>): void {
    const query = this.queries.get(key);
    if (!query || (expected && query !== expected)) {
      return;
    }

    this.queries.delete(key);
    query.destroy();
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
  private evictionHandler: (() => void) | null = null;

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
    if (this.gcTimeout) {
      clearTimeout(this.gcTimeout);
      this.gcTimeout = null;
    }

    this.observers.add(observer);

    observer.onStateUpdate(this.state);

    this.scheduleRefetch();

    if (this.state.isStale && observer.options.enabled !== false) {
      this.fetch().catch(() => undefined);
    }

    return () => {
      this.observers.delete(observer);

      if (this.observers.size === 0) {
        this.cancelRefetchInterval();
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

    const abortController = new AbortController();
    this.abortController = abortController;

    this.state = {
      ...this.state,
      isLoading: this.state.data === undefined,
      isFetching: true,
      isError: false,
      error: null,
      fetchCount: this.state.fetchCount + 1,
    };
    this.notify();

    const fetchPromise = this.executeFetch(abortController.signal);
    this.fetchPromise = fetchPromise;

    try {
      const data = await fetchPromise;
      if (this.fetchPromise === fetchPromise) {
        this.setData(data);
      }
      return data;
    } catch (error) {
      if (this.fetchPromise === fetchPromise) {
        this.setError(error as Error);
      }
      throw error;
    } finally {
      // Only clear state that still belongs to this fetch; a cancel() followed
      // by a refetch() may have replaced both fields with a newer fetch's.
      if (this.fetchPromise === fetchPromise) {
        this.fetchPromise = null;
      }
      if (this.abortController === abortController) {
        this.abortController = null;
      }
    }
  }

  private async executeFetch(signal: AbortSignal): Promise<T> {
    const { queryFn, retry = 0, retryDelay = 10 } = this.options;

    let attempt = 0;
    let lastError: Error;

    for (;;) {
      try {
        if (signal.aborted) {
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

        if (!shouldRetry || signal.aborted) {
          throw lastError;
        }

        const delay =
          typeof retryDelay === 'function'
            ? retryDelay(attempt)
            : retryDelay * Math.pow(2, attempt - 1);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
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

    if (this.hasEnabledObservers()) {
      this.fetch().catch(() => undefined);
    }
  }

  refetch(): Promise<T> {
    return this.fetch();
  }

  cancel(): void {
    if (this.abortController) {
      // The in-flight retry loop holds this signal and observes the abort;
      // the owning fetch() clears the reference in its finally block.
      this.abortController.abort();
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
    if (this.options.refetchOnWindowFocus && isBrowser()) {
      window.addEventListener('focus', this.handleFocus);
    }

    if (this.options.refetchOnReconnect && isBrowser()) {
      window.addEventListener('online', this.handleReconnect);
    }
  }

  private scheduleRefetchInterval(): void {
    this.cancelRefetchInterval();

    if (
      this.options.refetchInterval &&
      this.options.refetchInterval > 0 &&
      isBrowser()
    ) {
      this.refetchInterval = setInterval(() => {
        if (
          this.hasEnabledObservers() &&
          (this.options.refetchIntervalInBackground ||
            document.visibilityState === 'visible')
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
        if (!this.hasObservers()) {
          this.evictionHandler?.();
          if (!this.evictionHandler) {
            this.destroy();
          }
        }
      },
      this.options.cacheTime ?? 5 * 60 * 1000,
    );
  }

  private handleFocus = (): void => {
    if (this.options.refetchOnWindowFocus && this.hasEnabledObservers()) {
      this.fetch().catch(() => undefined);
    }
  };

  private handleReconnect = (): void => {
    if (this.options.refetchOnReconnect && this.hasEnabledObservers()) {
      this.fetch().catch(() => undefined);
    }
  };

  canBeGarbageCollected(now: number): boolean {
    const cacheTime = this.options.cacheTime ?? 5 * 60 * 1000;
    const lastAccessTime = Math.max(
      this.state.dataUpdatedAt,
      this.state.errorUpdatedAt,
    );
    if (lastAccessTime === 0) {
      return false;
    }
    return this.observers.size === 0 && now - lastAccessTime >= cacheTime;
  }

  hasObservers(): boolean {
    return this.observers.size > 0;
  }

  hasEnabledObservers(): boolean {
    return Array.from(this.observers).some(
      (observer) => observer.options.enabled !== false,
    );
  }

  setEvictionHandler(handler: () => void): void {
    this.evictionHandler = handler;
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

    if (isBrowser()) {
      window.removeEventListener('focus', this.handleFocus);
      window.removeEventListener('online', this.handleReconnect);
    }
  }
}
