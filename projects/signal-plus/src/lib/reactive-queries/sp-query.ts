import {
  computed,
  effect,
  EffectRef,
  signal,
  Signal,
  untracked,
} from '@angular/core';
import { Query } from './query-cache';
import { getGlobalQueryClient } from './query-client';
import { QueryObserver, QueryOptions, QueryState } from './query-types';

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

export function spQuery<T>(options: QueryOptions<T>): QueryResult<T> {
  const queryClient = getGlobalQueryClient();
  const queryKey = Array.isArray(options.queryKey)
    ? options.queryKey
    : options.queryKey.key;

  const dataSignal = signal<T | undefined>(options.initialData);
  const errorSignal = signal<Error | null>(null);
  const isLoadingSignal = signal(false);
  const isFetchingSignal = signal(false);
  const isStaleSignal = signal(true);
  const isSuccessSignal = signal(false);
  const isErrorSignal = signal(false);
  const isIdleSignal = signal(true);

  const observer: QueryObserver<T> = {
    options,
    onStateUpdate: (state: QueryState<T>) => {
      untracked(() => {
        dataSignal.set(state.data);
        errorSignal.set(state.error);
        isLoadingSignal.set(state.isLoading);
        isFetchingSignal.set(state.isFetching);
        isStaleSignal.set(state.isStale);
        isSuccessSignal.set(state.isSuccess);
        isErrorSignal.set(state.isError);
        isIdleSignal.set(state.isIdle);
      });
    },
  };

  let query = queryClient.getQueryCache().get<T>(queryKey);

  if (!query) {
    const mergedOptions: QueryOptions<T> = {
      ...(queryClient.getDefaultOptions() as Partial<QueryOptions<T>>),
      ...options,
    };
    query = new Query<T>(queryKey, mergedOptions);
    queryClient.getQueryCache().set(queryKey, query);
  }

  let unsubscribe: (() => void) | undefined;
  let enabledInterval: ReturnType<typeof setInterval> | null = null;

  const initialEnabled =
    typeof options.enabled === 'boolean'
      ? options.enabled
      : (options.enabled as Signal<boolean> | undefined)?.();
  const shouldSubscribeInitially = initialEnabled !== false;

  if (shouldSubscribeInitially) {
    unsubscribe = query.subscribe(observer);
  }

  let enabledEffect: EffectRef | null = null;

  if (options.enabled !== undefined) {
    if (typeof options.enabled === 'boolean') {
      if (!options.enabled) {
        unsubscribe?.();
        unsubscribe = undefined;
      }
    } else {
      let isCurrentlySubscribed = shouldSubscribeInitially;

      try {
        enabledEffect = effect(() => {
          const enabled = (options.enabled as Signal<boolean>)();
          if (!enabled && isCurrentlySubscribed) {
            unsubscribe?.();
            unsubscribe = undefined;
            isCurrentlySubscribed = false;
          } else if (enabled && !isCurrentlySubscribed) {
            unsubscribe = query.subscribe(observer);
            isCurrentlySubscribed = true;
          }
        });
      } catch {
        enabledInterval = setInterval(() => {
          const enabled = (options.enabled as Signal<boolean>)();
          if (!enabled && isCurrentlySubscribed) {
            unsubscribe?.();
            unsubscribe = undefined;
            isCurrentlySubscribed = false;
          } else if (enabled && !isCurrentlySubscribed) {
            unsubscribe = query.subscribe(observer);
            isCurrentlySubscribed = true;
          }
        }, 10);
      }
    }
  }

  const cleanup = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', cleanup);
    }
    if (enabledEffect) {
      enabledEffect.destroy();
    }
    if (enabledInterval) {
      clearInterval(enabledInterval);
      enabledInterval = null;
    }
    unsubscribe?.();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    data: computed(() => dataSignal()),
    error: computed(() => errorSignal()),
    isLoading: computed(() => isLoadingSignal()),
    isFetching: computed(() => isFetchingSignal()),
    isStale: computed(() => isStaleSignal()),
    isSuccess: computed(() => isSuccessSignal()),
    isError: computed(() => isErrorSignal()),
    isIdle: computed(() => isIdleSignal()),
    refetch: () => query!.refetch(),
    invalidate: () => {
      untracked(() => {
        isStaleSignal.set(true);
      });
    },
  };
}

export function createQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Omit<QueryOptions<T>, 'queryKey' | 'queryFn'>,
): QueryResult<T> {
  return spQuery({
    queryKey,
    queryFn,
    ...options,
  });
}