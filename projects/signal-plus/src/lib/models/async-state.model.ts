import { Signal } from '@angular/core';

export interface AsyncStateOptions<T> {
  fetcher: () => Promise<T>;
  initialValue: T | null;
  retryCount?: number;
  retryDelay?: number;
  cacheTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  autoFetch?: boolean;
}

export interface SignalAsync<T> {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<Error | null>;
  isSuccess: Signal<boolean>;
  isError: Signal<boolean>;

  refetch(): Promise<T>;
  invalidate(): void;
  reset(): void;
  mutate(newData: T): void;
}
