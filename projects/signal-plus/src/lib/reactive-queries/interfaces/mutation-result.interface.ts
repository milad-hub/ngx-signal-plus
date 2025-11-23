import { Signal } from '@angular/core';

/**
 * Result interface returned by spMutation
 * Provides reactive signals for mutation state management
 *
 * @template TData - The type of data returned by the mutation
 * @template TVariables - The type of variables passed to the mutation
 */
export interface MutationResult<TData = unknown, TVariables = unknown> {
  /** Signal containing the mutation result data */
  data: Signal<TData | undefined>;

  /** Signal containing any error that occurred */
  error: Signal<Error | null>;

  /** Signal indicating if mutation is in progress */
  isLoading: Signal<boolean>;

  /** Signal indicating if mutation completed successfully */
  isSuccess: Signal<boolean>;

  /** Signal indicating if mutation failed with error */
  isError: Signal<boolean>;

  /** Signal indicating if mutation is idle (not started) */
  isIdle: Signal<boolean>;

  /** Signal containing the variables passed to the mutation */
  variables: Signal<TVariables | undefined>;

  /** Method to execute the mutation */
  mutate: (variables: TVariables) => Promise<TData>;

  /** Async variant of mutate method */
  mutateAsync: (variables: TVariables) => Promise<TData>;

  /** Method to reset mutation state */
  reset: () => void;
}
