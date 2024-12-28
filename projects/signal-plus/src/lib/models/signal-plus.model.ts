import { Signal, WritableSignal } from '@angular/core';
import { SignalOperator } from '../operators/signal-operators';

export interface SignalOptions<T> {
  initialValue: T;
  storageKey?: string;
  persist?: boolean;
  validators?: ((value: T) => boolean)[];
  transform?: (value: T) => T;
  debounceTime?: number;
  distinctUntilChanged?: boolean;
}

export interface SignalPlus<T> {
  // Core functionality
  value: T;
  previousValue: T | undefined;
  signal: Signal<T>;
  writable: WritableSignal<T>;

  // Methods
  setValue(newValue: T): void;
  update(fn: (current: T) => T): void;
  reset(): void;
  validate(): boolean;

  // State tracking
  isValid: Signal<boolean>;
  isDirty: Signal<boolean>;
  hasChanged: Signal<boolean>;

  // History management
  history: Signal<T[]>;
  undo(): void;
  redo(): void;

  // Subscriptions
  subscribe(callback: (value: T) => void): () => void;
  pipe<R>(...operators: SignalOperator<T, R>[]): SignalPlus<R>;
}

export interface SignalHistory<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface SignalState {
  loading: boolean;
  error: Error | null;
  timestamp: number;
} 