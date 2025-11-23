import { Signal } from '@angular/core';

/**
 * Result interface returned by spQuery
 * Provides reactive signals for query state management
 *
 * @template T - The type of data returned by the query
 */
export interface QueryResult<T = unknown> {
  /** Signal containing the query data */
  data: Signal<T | undefined>;

  /** Signal containing any error that occurred */
  error: Signal<Error | null>;

  /** Signal indicating if initial fetch is in progress */
  isLoading: Signal<boolean>;

  /** Signal indicating if any fetch is in progress (including refetch) */
  isFetching: Signal<boolean>;

  /** Signal indicating if data is stale and needs refetching */
  isStale: Signal<boolean>;

  /** Signal indicating if query completed successfully */
  isSuccess: Signal<boolean>;

  /** Signal indicating if query failed with error */
  isError: Signal<boolean>;

  /** Signal indicating if query is idle (not started) */
  isIdle: Signal<boolean>;

  /** Method to manually refetch the query */
  refetch: () => Promise<T>;

  /** Method to mark query as stale */
  invalidate: () => void;
}
