import {
  computed,
  DestroyRef,
  effect,
  EffectRef,
  inject,
  signal,
  Signal,
  untracked,
} from '@angular/core';
import { InfiniteQueryResult } from './interfaces';
import { getGlobalQueryClient } from './query-client';
import { InfiniteQueryOptions } from './query-types';

export function spInfiniteQuery<TData, TPageParam>(
  options: InfiniteQueryOptions<TData, TPageParam>,
): InfiniteQueryResult<TData> {
  const queryClient = getGlobalQueryClient();

  let destroyRef: DestroyRef | null = null;
  try {
    destroyRef = inject(DestroyRef, { optional: true });
  } catch {
    // Not in injection context
  }

  const queryKey = Array.isArray(options.queryKey)
    ? options.queryKey
    : options.queryKey.key;

  const pagesSignal = signal<TData[]>([]);
  const errorSignal = signal<Error | null>(null);
  const isLoadingSignal = signal(false);
  const isFetchingSignal = signal(false);
  const isFetchingNextPageSignal = signal(false);
  const hasNextPageSignal = signal(true);

  const setPages = (pages: TData[]) => {
    untracked(() => {
      pagesSignal.set(pages);
      const lastPage = pages[pages.length - 1];
      hasNextPageSignal.set(
        lastPage === undefined ||
          options.getNextPageParam(lastPage, pages) !== undefined,
      );
    });
  };

  const runPageFetch = async (pageParam: TPageParam): Promise<TData> => {
    isFetchingSignal.set(true);
    errorSignal.set(null);
    try {
      return await options.queryFn(pageParam);
    } catch (error) {
      errorSignal.set(error as Error);
      throw error;
    } finally {
      isFetchingSignal.set(false);
    }
  };

  const refetch = async (): Promise<void> => {
    isLoadingSignal.set(true);
    try {
      const firstPage = await runPageFetch(options.initialPageParam);
      setPages([firstPage]);
      queryClient.setQueryData(queryKey, [firstPage]);
    } finally {
      isLoadingSignal.set(false);
    }
  };

  const fetchNextPage = async (): Promise<void> => {
    const pages = pagesSignal();
    const lastPage = pages[pages.length - 1];
    const nextPageParam =
      pages.length === 0
        ? options.initialPageParam
        : options.getNextPageParam(lastPage, pages);

    if (nextPageParam === undefined) {
      hasNextPageSignal.set(false);
      return;
    }

    isFetchingNextPageSignal.set(true);
    try {
      const page = await runPageFetch(nextPageParam);
      const nextPages = [...pagesSignal(), page];
      setPages(nextPages);
      queryClient.setQueryData(queryKey, nextPages);
    } finally {
      isFetchingNextPageSignal.set(false);
    }
  };

  let enabledEffect: EffectRef | null = null;
  let previousEnabledState = false;

  const getEnabled = (): boolean => {
    if (typeof options.enabled === 'boolean') {
      return options.enabled;
    }
    if (options.enabled) {
      return (options.enabled as Signal<boolean>)();
    }
    return true;
  };

  const runIfEnabled = (): void => {
    const enabled = getEnabled();
    if (!enabled) {
      previousEnabledState = false;
      return;
    }

    if (previousEnabledState) {
      return;
    }

    previousEnabledState = true;
    const cached = queryClient.getQueryData<TData[]>(queryKey);
    if (cached && cached.length > 0) {
      setPages(cached);
      return;
    }

    refetch().catch(() => undefined);
  };

  runIfEnabled();

  if (destroyRef && typeof options.enabled !== 'boolean' && options.enabled) {
    enabledEffect = effect(runIfEnabled);
  }

  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    enabledEffect?.destroy();
    enabledEffect = null;
  };

  if (destroyRef) {
    destroyRef.onDestroy(destroy);
  }

  return {
    pages: computed(() => pagesSignal()),
    error: computed(() => errorSignal()),
    isLoading: computed(() => isLoadingSignal()),
    isFetching: computed(() => isFetchingSignal()),
    isFetchingNextPage: computed(() => isFetchingNextPageSignal()),
    hasNextPage: computed(() => hasNextPageSignal()),
    refetch,
    fetchNextPage,
    destroy,
  };
}

export function createInfiniteQuery<TData, TPageParam>(
  queryKey: string[],
  queryFn: (pageParam: TPageParam) => Promise<TData>,
  options: Omit<
    InfiniteQueryOptions<TData, TPageParam>,
    'queryKey' | 'queryFn'
  >,
): InfiniteQueryResult<TData> {
  return spInfiniteQuery({
    ...options,
    queryKey,
    queryFn,
  });
}
