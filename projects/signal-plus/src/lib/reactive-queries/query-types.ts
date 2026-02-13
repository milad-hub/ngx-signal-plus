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
export interface MutationOptions<TData = unknown, TVariables = unknown> {
  /** Function that performs the mutation */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /** Called before mutation runs (for optimistic updates) */
  onMutate?: (variables: TVariables) => void | Promise<void>;

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
 *
 * @example
 * ```typescript
 * const state: QueryState<User> = {
 *   data: undefined,
 *   error: null,
 *   isLoading: true,
 *   isFetching: true,
 *   isStale: true,
 *   isSuccess: false,
 *   isError: false,
 *   isIdle: false,
 *   dataUpdatedAt: 0,
 *   errorUpdatedAt: 0,
 *   fetchCount: 1,
 *   failureCount: 0,
 * };
 * ```
 */
export interface QueryState<T = unknown> {
  /** The data returned by the query, or undefined if not yet loaded */
  data: T | undefined;

  /** The error thrown by the query, or null if no error */
  error: Error | null;

  /** True when no data exists and query is fetching for the first time */
  isLoading: boolean;

  /** True whenever the query is fetching (including background refetches) */
  isFetching: boolean;

  /** True when data exists but is considered stale (past staleTime) */
  isStale: boolean;

  /** True when the query has successfully fetched and has data */
  isSuccess: boolean;

  /** True when the query encountered an error */
  isError: boolean;

  /** True when the query has not started fetching yet */
  isIdle: boolean;

  /** Timestamp of when data was last updated */
  dataUpdatedAt: number;

  /** Timestamp of when error was last updated */
  errorUpdatedAt: number;

  /** Total number of fetch attempts made */
  fetchCount: number;

  /** Number of consecutive failures */
  failureCount: number;
}

/**
 * Reactive state snapshot for a mutation.
 *
 * @template TData - Mutation result data type
 *
 * @example
 * ```typescript
 * const state: MutationState<User> = {
 *   data: undefined,
 *   error: null,
 *   isIdle: true,
 *   isLoading: false,
 *   isSuccess: false,
 *   isError: false,
 *   variables: undefined,
 *   submittedAt: 0,
 *   dataUpdatedAt: 0,
 *   errorUpdatedAt: 0,
 * };
 * ```
 */
export interface MutationState<TData = unknown> {
  /** The data returned by the mutation, or undefined if not yet completed */
  data: TData | undefined;

  /** The error thrown by the mutation, or null if no error */
  error: Error | null;

  /** True when the mutation has not been triggered */
  isIdle: boolean;

  /** True when the mutation is currently executing */
  isLoading: boolean;

  /** True when the mutation has completed successfully */
  isSuccess: boolean;

  /** True when the mutation encountered an error */
  isError: boolean;

  /** The variables passed to the mutation function */
  variables: unknown;

  /** Timestamp of when the mutation was submitted */
  submittedAt: number;

  /** Timestamp of when data was last updated */
  dataUpdatedAt: number;

  /** Timestamp of when error was last updated */
  errorUpdatedAt: number;
}

/**
 * Observer contract for query state updates.
 *
 * @template T - Query data type
 *
 * @example
 * ```typescript
 * const observer: QueryObserver<User> = {
 *   options,
 *   onStateUpdate: (state) => console.log(state.isFetching),
 * };
 * ```
 */
export interface QueryObserver<T = unknown> {
  /** Callback invoked when query state changes */
  onStateUpdate: (state: QueryState<T>) => void;

  /** The query options for this observer */
  options: QueryOptions<T>;
}

/**
 * Observer contract for mutation state updates.
 *
 * @template TData - Mutation result data type
 * @template TVariables - Mutation variables type
 *
 * @example
 * ```typescript
 * const observer: MutationObserver<User, UpdateUserInput> = {
 *   options,
 *   onStateUpdate: (state) => console.log(state.isLoading),
 * };
 * ```
 */
export interface MutationObserver<TData = unknown, TVariables = unknown> {
  /** Callback invoked when mutation state changes */
  onStateUpdate: (state: MutationState<TData>) => void;

  /** The mutation options for this observer */
  options: MutationOptions<TData, TVariables>;
}

/**
 * Query lifecycle status values.
 *
 * @example
 * ```typescript
 * const status: QueryStatus = 'success';
 * ```
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Mutation lifecycle status values.
 *
 * @example
 * ```typescript
 * const status: MutationStatus = 'loading';
 * ```
 */
export type MutationStatus = 'idle' | 'loading' | 'success' | 'error';
