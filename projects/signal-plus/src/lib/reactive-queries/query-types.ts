import { Signal } from '@angular/core';

export interface QueryKey {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: any[];
  equals?: (a: unknown, b: unknown) => boolean;
}

export interface QueryOptions<T = unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryKey: QueryKey | any[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  retry?: number | ((failureCount: number, error: Error) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
  enabled?: boolean | Signal<boolean>;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
  initialData?: T;
  placeholderData?: T | (() => T);
  structuralSharing?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
}

export interface MutationOptions<TData = unknown, TVariables = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => void | Promise<void>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
  ) => void;
  retry?: number | ((failureCount: number, error: Error) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
}

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

export interface QueryObserver<T = unknown> {
  onStateUpdate: (state: QueryState<T>) => void;
  options: QueryOptions<T>;
}

export interface MutationObserver<TData = unknown, TVariables = unknown> {
  onStateUpdate: (state: MutationState<TData>) => void;
  options: MutationOptions<TData, TVariables>;
}

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';
export type MutationStatus = 'idle' | 'loading' | 'success' | 'error';
