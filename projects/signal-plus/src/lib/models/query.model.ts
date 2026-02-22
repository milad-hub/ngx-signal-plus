import { Signal } from '@angular/core';

/**
 * Represents a query key used for cache identity.
 *
 * @remarks
 * You can pass this object form or pass an array key directly.
 *
 * @example
 * ```typescript
 * const key: QueryKey = { key: ['user', userId] };
 * ```
 */
export interface QueryKey {
  /** The array of values that uniquely identify this query */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: any[];
  /** Optional custom equality function to compare query keys */
  equals?: (a: unknown, b: unknown) => boolean;
}

/**
 * Configuration options for `spQuery`.
 *
 * @template T - Query result data type
 *
 * @example
 * ```typescript
 * const options: QueryOptions<User> = {
 *   queryKey: ['user', id],
 *   queryFn: () => fetchUser(id),
 *   staleTime: 5000,
 * };
 * ```
 */
export interface QueryOptions<T = unknown> {
  /** Unique identifier for the query */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryKey: QueryKey | any[];

  /** Function that fetches and returns the data */
  queryFn: () => Promise<T>;

  /** Time in ms until data is stale (default: 0) */
  staleTime?: number;

  /** Time in ms to keep inactive queries in cache (default: 5 minutes) */
  cacheTime?: number;

  /** Number of retry attempts or function returning whether to retry. Default: 0 */
  retry?: number | ((failureCount: number, error: Error) => boolean);

  /** Delay in ms between retries or function returning delay. Default: exponential backoff */
  retryDelay?: number | ((retryAttempt: number) => number);

  /** Whether the query should run. Can be a boolean or reactive Signal. Default: true */
  enabled?: boolean | Signal<boolean>;

  /** Whether to refetch when window regains focus. Default: true */
  refetchOnWindowFocus?: boolean;

  /** Whether to refetch when network reconnects. Default: true */
  refetchOnReconnect?: boolean;

  /** Interval in ms to automatically refetch. Default: disabled */
  refetchInterval?: number;

  /** Whether to refetch on interval when window is not focused. Default: false */
  refetchIntervalInBackground?: boolean;

  /** Initial data to use before the first fetch completes */
  initialData?: T;

  /** Placeholder data shown while loading (not cached) */
  placeholderData?: T | (() => T);

  /** Whether to use structural sharing to optimize re-renders. Default: true */
  structuralSharing?: boolean;

  /** Callback invoked when query succeeds */
  onSuccess?: (data: T) => void;

  /** Callback invoked when query fails */
  onError?: (error: Error) => void;

  /** Callback invoked when query settles (success or error) */
  onSettled?: (data: T | undefined, error: Error | null) => void;
}

/**
 * Configuration options for `spMutation`.
 *
 * @template TData - Mutation result data type
 * @template TVariables - Mutation variables type
 *
 * @example
 * ```typescript
 * const options: MutationOptions<User, UpdateUserInput> = {
 *   mutationFn: (input) => updateUser(input),
 *   onSuccess: (data) => console.log(data.id),
 * };
 * ```
 */
export interface InfiniteQueryOptions<TData = unknown, TPageParam = unknown> {
  queryKey: QueryKey | any[];
  queryFn: (pageParam: TPageParam) => Promise<TData>;
  initialPageParam: TPageParam;
  getNextPageParam: (lastPage: TData, allPages: TData[]) => TPageParam | undefined;
  enabled?: boolean | Signal<boolean>;
}

export interface OptimisticMutationOptions<TVariables = unknown, TQueryData = unknown> {
  queryKey: string[];
  updater: (current: TQueryData | undefined, variables: TVariables) => TQueryData;
  rollbackOnError?: boolean;
  invalidateOnSettled?: boolean;
}

export interface MutationOptions<TData = unknown, TVariables = unknown> {
  /** Function that performs the mutation */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /** Called before mutation runs (for optimistic updates) */
  onMutate?: (variables: TVariables) => void | Promise<void>;

  /** Built-in optimistic update behavior for cached query data */
  optimisticUpdate?: OptimisticMutationOptions<TVariables>;

  /** Called when mutation succeeds */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /** Callback invoked when mutation fails */
  onError?: (error: Error, variables: TVariables) => void;

  /** Callback invoked when mutation settles (success or error) */
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
  ) => void;

  /** Number of retry attempts or function returning whether to retry. Default: 0 */
  retry?: number | ((failureCount: number, error: Error) => boolean);

  /** Delay in ms between retries or function returning delay. Default: exponential backoff */
  retryDelay?: number | ((retryAttempt: number) => number);
}

/**
 * Reactive state snapshot for a query.
 *
 * @template T - Query data type
 */
export interface QueryState<T = unknown> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchCount: number;
  failureCount: number;
}

/**
 * Reactive state snapshot for a mutation.
 *
 * @template TData - Mutation result data type
 */
export interface MutationState<TData = unknown> {
  data: TData | undefined;
  error: Error | null;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  variables: unknown;
  submittedAt: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
}

/**
 * Observer contract for query state updates.
 */
export interface QueryObserver<T = unknown> {
  onStateUpdate: (state: QueryState<T>) => void;
  options: QueryOptions<T>;
}

/**
 * Observer contract for mutation state updates.
 */
export interface MutationObserver<TData = unknown, TVariables = unknown> {
  onStateUpdate: (state: MutationState<TData>) => void;
  options: MutationOptions<TData, TVariables>;
}

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export type MutationStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Result interface returned by spQuery.
 */
export interface QueryResult<T = unknown> {
  data: Signal<T | undefined>;
  error: Signal<Error | null>;
  isLoading: Signal<boolean>;
  isFetching: Signal<boolean>;
  isStale: Signal<boolean>;
  isSuccess: Signal<boolean>;
  isError: Signal<boolean>;
  isIdle: Signal<boolean>;
  refetch: () => Promise<T>;
  invalidate: () => void;
}

/**
 * Result interface returned by spMutation.
 */
export interface MutationResult<TData = unknown, TVariables = unknown> {
  data: Signal<TData | undefined>;
  error: Signal<Error | null>;
  isLoading: Signal<boolean>;
  isSuccess: Signal<boolean>;
  isError: Signal<boolean>;
  isIdle: Signal<boolean>;
  variables: Signal<TVariables | undefined>;
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

export interface InfiniteQueryResult<T = unknown> {
  pages: Signal<T[]>;
  error: Signal<Error | null>;
  isLoading: Signal<boolean>;
  isFetching: Signal<boolean>;
  isFetchingNextPage: Signal<boolean>;
  hasNextPage: Signal<boolean>;
  refetch: () => Promise<void>;
  fetchNextPage: () => Promise<void>;
}
