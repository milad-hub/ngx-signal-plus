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
    const seeded = this.options.initialData !== undefined;

    return Query.withInvariants({
      data: this.options.initialData,
      error: null,
      isLoading: false,
      isFetching: false,
      isStale: true,
      isSuccess: seeded,
      isError: false,
      isIdle: !seeded,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      fetchCount: 0,
      failureCount: 0,
    });
  }

  /**
   * Enforces the state machine's exclusivity rules on a candidate state
   *
   * @param state The candidate state, before invariants are applied
   * @returns The same state with the mutually exclusive flags reconciled
   *
   * @remarks
   * The status flags describe one of four positions — idle, loading, success,
   * error — so at most one of them may be true. `isFetching` and `isStale` are
   * deliberately outside that set: a background refetch of data already present
   * is both fetching and successful, and staleness is orthogonal to all four.
   *
   * `isIdle` is derived rather than assigned. Idle means nothing has ever been
   * attempted or seeded, so any fetch, any result, and any `initialData` ends
   * it permanently.
   */
  private static withInvariants<S>(state: QueryState<S>): QueryState<S> {
    const isError = state.isError;
    const isSuccess = isError ? false : state.isSuccess;
    const isLoading = isError || isSuccess ? false : state.isLoading;
    const isIdle =
      state.fetchCount === 0 &&
      !isSuccess &&
      !isError &&
      !isLoading &&
      !state.isFetching;

    if (
      isSuccess === state.isSuccess &&
      isLoading === state.isLoading &&
      isIdle === state.isIdle
    ) {
      return state;
    }

    return { ...state, isSuccess, isLoading, isIdle };
  }

  private static sameState<S>(a: QueryState<S>, b: QueryState<S>): boolean {
    return (
      a.data === b.data &&
      a.error === b.error &&
      a.isLoading === b.isLoading &&
      a.isFetching === b.isFetching &&
      a.isStale === b.isStale &&
      a.isSuccess === b.isSuccess &&
      a.isError === b.isError &&
      a.isIdle === b.isIdle &&
      a.dataUpdatedAt === b.dataUpdatedAt &&
      a.errorUpdatedAt === b.errorUpdatedAt &&
      a.fetchCount === b.fetchCount &&
      a.failureCount === b.failureCount
    );
  }

  /**
   * The single write path for query state
   *
   * @param patch The fields this transition changes
   *
   * @remarks
   * Every transition applies the invariants and notifies observers, so no
   * caller can produce a contradictory state or change one silently. A patch
   * that changes nothing notifies nobody.
   */
  private transition(patch: Partial<QueryState<T>>): void {
    const next = Query.withInvariants({ ...this.state, ...patch });

    if (Query.sameState(this.state, next)) {
      return;
    }

    this.state = next;
    this.notify();
  }

  /**
   * Whether the stored data has aged past `staleTime`
   *
   * @returns True when the entry should be treated as stale right now
   */
  private isStaleNow(): boolean {
    if (this.state.isStale) {
      return true;
    }

    const staleTime = this.options.staleTime;

    if (staleTime === undefined || this.state.data === undefined) {
      return false;
    }

    return Date.now() - this.state.dataUpdatedAt > staleTime;
  }

  subscribe(observer: QueryObserver<T>): () => void {
    if (this.gcTimeout) {
      clearTimeout(this.gcTimeout);
      this.gcTimeout = null;
    }

    this.observers.add(observer);

    observer.onStateUpdate(this.state);

    this.scheduleRefetch();

    // Derived rather than the stored flag: with no staleTime, or with one that
    // schedules no timer, the stored flag stays false while the data ages out,
    // and this is the only place that would notice
    if (this.isStaleNow() && observer.options.enabled !== false) {
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

    this.transition({
      isLoading: this.state.data === undefined,
      isFetching: true,
      isError: false,
      error: null,
      fetchCount: this.state.fetchCount + 1,
    });

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
    this.transition({
      data,
      error: null,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      failureCount: 0,
    });
    this.scheduleRefetchInterval();
    this.scheduleStaleUpdate();
  }

  private setError(error: Error): void {
    this.transition({
      error,
      isLoading: false,
      isFetching: false,
      isError: true,
      isSuccess: false,
      errorUpdatedAt: Date.now(),
      failureCount: this.state.failureCount + 1,
    });

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
    this.transition({
      data: nextData,
      error: null,
      isSuccess: true,
      isError: false,
      isLoading: false,
      isFetching: false,
      isStale: markStale ? true : this.state.isStale,
      dataUpdatedAt: Date.now(),
    });

    // Entries written straight into the cache never ran fetch(), so this is
    // their only chance to schedule the transition to stale; without it the
    // flip would be visible only to a getState() caller and never reach a
    // subscribed observer
    this.scheduleStaleUpdate();
  }

  invalidate(): void {
    this.transition({ isStale: true });

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
      this.transition({ isFetching: false, isLoading: false });
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
        this.transition({ isStale: true });
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

  /**
   * The current state, with staleness evaluated as of now
   *
   * @returns The stored state, or a stale-corrected copy of it
   *
   * @remarks
   * Pure. This used to assign the corrected state back and skip `notify()`, so
   * reading a query changed it and subscribed observers were never told. The
   * transition to stale is now scheduled wherever data is written, and this
   * only reports it.
   */
  getState(): QueryState<T> {
    const isStale = this.isStaleNow();

    if (isStale === this.state.isStale) {
      return this.state;
    }

    return { ...this.state, isStale };
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
