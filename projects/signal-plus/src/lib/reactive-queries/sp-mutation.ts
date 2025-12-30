import { computed, DestroyRef, inject, signal, untracked } from '@angular/core';
import { MutationResult } from './interfaces';
import { MutationOptions, MutationState } from './query-types';

/**
 * Creates a mutation for server-side data updates.
 *
 * @template TData - The type of data returned by the mutation
 * @template TVariables - The type of variables passed to the mutation
 * @param options - Mutation configuration options
 * @returns MutationResult with reactive signals (data, isLoading, error, etc.)
 *
 * @example
 * ```typescript
 * const updateUser = spMutation({
 *   mutationFn: async (data: UpdateUserData) => updateUserAPI(data),
 *   onSuccess: () => queryClient.invalidateQueries(['users'])
 * });
 *
 * await updateUser.mutate({ name: 'Jane' });
 * updateUser.isLoading(); // Signal<boolean>
 * ```
 */
export function spMutation<TData = unknown, TVariables = unknown>(
  options: MutationOptions<TData, TVariables>,
): MutationResult<TData, TVariables> {
  let destroyRef: DestroyRef | null = null;
  try {
    destroyRef = inject(DestroyRef, { optional: true });
  } catch {
    // Not in injection context - cleanup will be manual via reset()
  }

  const dataSignal = signal<TData | undefined>(undefined);
  const errorSignal = signal<Error | null>(null);
  const isLoadingSignal = signal(false);
  const isSuccessSignal = signal(false);
  const isErrorSignal = signal(false);
  const isIdleSignal = signal(true);
  const variablesSignal = signal<TVariables | undefined>(undefined);
  let isDestroyed = false;

  let currentMutation: Promise<TData> | null = null;

  const updateState = (state: Partial<MutationState<TData>>): void => {
    untracked(() => {
      if (state.data !== undefined) dataSignal.set(state.data);
      if (state.error !== undefined) errorSignal.set(state.error);
      if (state.isLoading !== undefined) isLoadingSignal.set(state.isLoading);
      if (state.isSuccess !== undefined) isSuccessSignal.set(state.isSuccess);
      if (state.isError !== undefined) isErrorSignal.set(state.isError);
      if (state.isIdle !== undefined) isIdleSignal.set(state.isIdle);
      if (state.variables !== undefined && state.variables !== null) {
        variablesSignal.set(state.variables as TVariables);
      }
    });
  };

  const executeMutation = async (variables: TVariables): Promise<TData> => {
    if (isDestroyed) {
      throw new Error('Mutation was destroyed');
    }

    updateState({
      isLoading: true,
      isSuccess: false,
      isError: false,
      isIdle: false,
      variables,
      error: null,
    });

    const { retry = 0, retryDelay = 10 } = options;
    let attempt = 0;
    let lastError: Error | null = null;

    if (options.onMutate) {
      await options.onMutate(variables);
    }

    while (attempt <= (typeof retry === 'number' ? retry : Infinity)) {
      try {
        const result = await options.mutationFn(variables);

        updateState({
          data: result,
          isLoading: false,
          isSuccess: true,
          isError: false,
          isIdle: false,
        });

        if (options.onSuccess) {
          options.onSuccess(result, variables);
        }

        if (options.onSettled) {
          options.onSettled(result, null, variables);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const shouldRetry =
          typeof retry === 'function'
            ? retry(attempt, lastError)
            : attempt <= retry;

        if (!shouldRetry) {
          updateState({
            error: lastError,
            isLoading: false,
            isSuccess: false,
            isError: true,
            isIdle: false,
          });

          if (options.onError) {
            options.onError(lastError, variables);
          }

          if (options.onSettled) {
            options.onSettled(undefined, lastError, variables);
          }

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
  };

  const mutate = (variables: TVariables): Promise<TData> => {
    if (currentMutation) {
      return currentMutation;
    }
    const promise = executeMutation(variables).finally(() => {
      currentMutation = null;
    });
    currentMutation = promise;
    return promise;
  };

  const reset = (): void => {
    currentMutation = null;
    untracked(() => {
      dataSignal.set(undefined as unknown as TData);
      errorSignal.set(null);
      isLoadingSignal.set(false);
      isSuccessSignal.set(false);
      isErrorSignal.set(false);
      isIdleSignal.set(true);
      variablesSignal.set(undefined as unknown as TVariables);
    });
  };

  if (destroyRef) {
    destroyRef.onDestroy(() => {
      isDestroyed = true;
      currentMutation = null;
    });
  }

  return {
    data: computed(() => dataSignal()),
    error: computed(() => errorSignal()),
    isLoading: computed(() => isLoadingSignal()),
    isSuccess: computed(() => isSuccessSignal()),
    isError: computed(() => isErrorSignal()),
    isIdle: computed(() => isIdleSignal()),
    variables: computed(() => variablesSignal()),
    mutate,
    mutateAsync: mutate,
    reset,
  };
}

/**
 * Helper to create a mutation with simpler syntax.
 *
 * @template TData - The type of data returned
 * @template TVariables - The type of variables passed
 * @param mutationFn - Function that performs the mutation
 * @param options - Additional configuration (optional)
 * @returns MutationResult with reactive signals
 *
 * @example
 * ```typescript
 * const updateUser = createMutation(
 *   (data: UpdateUserData) => updateUserAPI(data),
 *   { onSuccess: () => console.log('Updated!') }
 * );
 * ```
 */
export function createMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<MutationOptions<TData, TVariables>, 'mutationFn'>,
): MutationResult<TData, TVariables> {
  return spMutation({
    mutationFn,
    ...options,
  });
}
