import { Query, QueryCache } from './query-cache';
import { QueryOptions, QueryState } from './query-types';

/**
 * Central manager for queries with caching, refetching, and invalidation.
 *
 * @example
 * ```typescript
 * const queryClient = new QueryClient({
 *   defaultOptions: { staleTime: 5000, retry: 3 }
 * });
 * setGlobalQueryClient(queryClient);
 *
 * // Get/set cache
 * const user = queryClient.getQueryData(['user', id]);
 * queryClient.setQueryData(['user', id], newUser);
 * queryClient.invalidateQueries(['user', id]);
 * ```
 */
export class QueryClient {
  private queryCache: QueryCache;
  private mutationCache = new Map<string, unknown>();
  private defaultOptions: Partial<QueryOptions> = {
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    retry: 0,
    retryDelay: 10,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    structuralSharing: true,
  };

  /**
   * Creates a new QueryClient.
   *
   * @param options - Configuration with default query options
   */
  constructor(options: { defaultOptions?: Partial<QueryOptions> } = {}) {
    this.queryCache = new QueryCache();
    if (options.defaultOptions) {
      this.defaultOptions = {
        ...this.defaultOptions,
        ...options.defaultOptions,
      };
    }
    this.queryCache.scheduleGC();
  }

  /**
   * Gets cached data for a query.
   *
   * @template T - Data type
   * @param queryKey - Query identifier
   * @returns Cached data or undefined
   */
  getQueryData<T>(queryKey: string[]): T | undefined {
    const query = this.queryCache.get<T>(queryKey);
    return query?.getState().data;
  }

  /**
   * Sets or updates cached data for a query.
   *
   * @template T - Data type
   * @param queryKey - Query identifier
   * @param updater - New data or updater function
   * @param markStale - Mark as stale after updating (default: false)
   */
  setQueryData<T>(
    queryKey: string[],
    updater: T | ((old: T | undefined) => T),
    markStale = false,
  ): void {
    let query = this.queryCache.get<T>(queryKey);
    if (!query) {
      const mergedOptions: QueryOptions<T> = {
        ...(this.defaultOptions as Partial<QueryOptions<T>>),
        queryKey,
        queryFn: async () => updater as T,
      };
      query = new Query<T>(queryKey, mergedOptions);
      this.queryCache.set(queryKey, query);
    }
    query.setOptimisticData(updater, markStale);
  }

  /**
   * Marks queries as stale and triggers refetch.
   *
   * @param queryKey - Query to invalidate (omit for all queries)
   */
  invalidateQueries(queryKey?: string[]): void {
    if (queryKey) {
      this.queryCache.invalidate(queryKey);
    } else {
      this.queryCache.invalidateAll();
    }
  }

  /**
   * Refetches queries immediately.
   *
   * @param queryKey - Query to refetch (omit for all active queries)
   * @returns Promise that resolves when refetch completes
   */
  refetchQueries(queryKey?: string[]): Promise<void> {
    const promises: Promise<unknown>[] = [];
    if (queryKey) {
      const query = this.queryCache.get(queryKey);
      if (query) {
        promises.push(query.refetch());
      }
    } else {
      const queries = this.queryCache.getAll();
      queries.forEach((q) => {
        if (q.hasObservers()) {
          promises.push(q.refetch());
        }
      });
    }
    return Promise.all(promises).then(() => undefined);
  }

  resetQueries(): void {
    this.queryCache.invalidateAll();
  }

  clear(): void {
    this.queryCache.invalidateAll();
    this.mutationCache.clear();
  }

  getQueryCache(): QueryCache {
    return this.queryCache;
  }

  getDefaultOptions(): Partial<QueryOptions> {
    return this.defaultOptions;
  }

  setDefaultOptions(options: Partial<QueryOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Fetches a query and returns the data.
   *
   * @template T - Data type
   * @param queryKey - Query identifier
   * @param options - Query options with queryFn
   * @returns Promise with the data
   */
  fetchQuery<T>(queryKey: string[], options: QueryOptions<T>): Promise<T> {
    const mergedOptions: QueryOptions<T> = {
      ...(this.defaultOptions as Partial<QueryOptions<T>>),
      ...options,
    };
    let query = this.queryCache.get<T>(queryKey);

    if (!query) {
      query = new Query<T>(queryKey, mergedOptions);
      this.queryCache.set(queryKey, query);
    }

    return query.fetch();
  }

  /**
   * Prefetches a query and caches it.
   *
   * @template T - Data type
   * @param queryKey - Query identifier
   * @param options - Query options with queryFn
   * @returns Promise that resolves when complete
   */
  prefetchQuery<T>(
    queryKey: string[],
    options: QueryOptions<T>,
  ): Promise<void> {
    return this.fetchQuery(queryKey, options).then(() => undefined);
  }

  cancelQueries(queryKey?: string[]): void {
    if (queryKey) {
      const query = this.queryCache.get(queryKey);
      if (query) {
        query.cancel();
      }
    } else {
      const queries = this.queryCache.getAll();
      queries.forEach((query) => query.cancel());
    }
  }

  /**
   * Gets the current state of a query.
   *
   * @template T - Data type
   * @param queryKey - Query identifier
   * @returns Query state or undefined
   */
  getQueryState<T>(queryKey: string[]): QueryState<T> | undefined {
    const query = this.queryCache.get<T>(queryKey);
    return query?.getState();
  }

  isFetching(): boolean {
    const queries = this.queryCache.getAll();
    return queries.some((q) => q.getState().isFetching);
  }

  isMutating(): boolean {
    return this.mutationCache.size > 0;
  }

  getStats() {
    return this.queryCache.getStats();
  }
}

let globalQueryClient: QueryClient | null = null;

/**
 * Gets the global QueryClient, creating one if needed.
 *
 * @returns The global QueryClient instance
 */
export function getGlobalQueryClient(): QueryClient {
  if (!globalQueryClient) {
    globalQueryClient = new QueryClient();
  }
  return globalQueryClient;
}

/**
 * Sets the global QueryClient instance.
 *
 * @param client - QueryClient to use globally
 *
 * @example
 * ```typescript
 * const queryClient = new QueryClient({
 *   defaultOptions: { staleTime: 5000, retry: 3 }
 * });
 * setGlobalQueryClient(queryClient);
 * ```
 */
export function setGlobalQueryClient(client: QueryClient): void {
  globalQueryClient = client;
}

