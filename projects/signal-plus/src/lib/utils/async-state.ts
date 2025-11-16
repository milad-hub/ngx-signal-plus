import { computed, signal } from '@angular/core';
import { AsyncStateOptions, SignalAsync } from '../models/async-state.model';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function spAsync<T>(options: AsyncStateOptions<T>): SignalAsync<T> {
  const dataSignal = signal<T | null>(options.initialValue);
  const loadingSignal = signal<boolean>(false);
  const errorSignal = signal<Error | null>(null);

  let cachedData: T | null = null;
  let cacheExpiry: number | null = null;
  let isStale = false;
  let currentFetch: Promise<T> | null = null;

  const isSuccess = computed(() => errorSignal() === null);
  const isError = computed(() => errorSignal() !== null);

  async function executeFetch(retries = 0): Promise<T> {
    if (
      !isStale &&
      cachedData !== null &&
      cacheExpiry !== null &&
      Date.now() < cacheExpiry
    ) {
      dataSignal.set(cachedData);
      errorSignal.set(null);
      return cachedData;
    }

    try {
      loadingSignal.set(true);
      errorSignal.set(null);
      const result = await options.fetcher();

      if (options.cacheTime && options.cacheTime > 0) {
        cachedData = result;
        cacheExpiry = Date.now() + options.cacheTime;
        isStale = false;
      }

      dataSignal.set(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const retryCount = options.retryCount ?? 0;

      if (retries < retryCount) {
        await delay(options.retryDelay ?? 1000);
        return executeFetch(retries + 1);
      }

      errorSignal.set(error);
      options.onError?.(error);
      throw error;
    } finally {
      loadingSignal.set(false);
    }
  }

  async function refetch(): Promise<T> {
    if (currentFetch) {
      return currentFetch;
    }

    currentFetch = executeFetch();
    try {
      return await currentFetch;
    } finally {
      currentFetch = null;
    }
  }

  function invalidate(): void {
    isStale = true;
    cacheExpiry = null;
  }

  function reset(): void {
    dataSignal.set(options.initialValue);
    errorSignal.set(null);
    loadingSignal.set(false);
    cachedData = null;
    cacheExpiry = null;
    isStale = false;
    currentFetch = null;
  }

  function mutate(newData: T): void {
    dataSignal.set(newData);
    errorSignal.set(null);
    if (cachedData !== null) {
      cachedData = newData;
    }
  }

  if (options.autoFetch) {
    setTimeout(() => {
      refetch().catch(() => {
        // Error handled in executeFetch
      });
    }, 0);
  }

  return {
    data: computed(() => dataSignal()),
    loading: computed(() => loadingSignal()),
    error: computed(() => errorSignal()),
    isSuccess,
    isError,
    refetch,
    invalidate,
    reset,
    mutate,
  };
}
