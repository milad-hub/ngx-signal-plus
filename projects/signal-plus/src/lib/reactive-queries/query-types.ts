import { Signal } from '@angular/core';

/**
 * Represents a query key that can be used for caching and identification.
 * Query keys can be arrays of any values and optionally include a custom equality function.
 */
export interface QueryKey {
  /** The array of values that uniquely identify this query */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: any[];
  /** Optional custom equality function to compare query keys */
  equals?: (a: unknown, b: unknown) => boolean;
}

/**
 * Configuration options for creating a query.
 *
 * @template T - The type of data returned by the query function
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
 * Configuration options for creating a mutation.
 *
 * @template TData - The type of data returned by the mutation
 * @template TVariables - The type of variables passed to the mutation
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
 * Represents the current state of a query.
 *
 * @template T - The type of data in the query
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
 * Represents the current state of a mutation.
 *
 * @template TData - The type of data returned by the mutation
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
 * Observer interface for subscribing to query state changes.
 *
 * @template T - The type of data in the query
 */
export interface QueryObserver<T = unknown> {
  /** Callback invoked when query state changes */
  onStateUpdate: (state: QueryState<T>) => void;

  /** The query options for this observer */
  options: QueryOptions<T>;
}

/**
 * Observer interface for subscribing to mutation state changes.
 *
 * @template TData - The type of data returned by the mutation
 * @template TVariables - The type of variables passed to the mutation
 */
export interface MutationObserver<TData = unknown, TVariables = unknown> {
  /** Callback invoked when mutation state changes */
  onStateUpdate: (state: MutationState<TData>) => void;

  /** The mutation options for this observer */
  options: MutationOptions<TData, TVariables>;
}

/**
 * Status of a query operation.
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Status of a mutation operation.
 */
export type MutationStatus = 'idle' | 'loading' | 'success' | 'error';
