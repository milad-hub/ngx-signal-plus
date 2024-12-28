/**
 * @fileoverview Collection of utility functions for working with signals
 * @module SignalUtils
 */

import { computed, effect, Signal, signal, WritableSignal } from '@angular/core';

/**
 * Creates a signal with history tracking capabilities
 * 
 * @template T The type of value to track
 * @param initialValue The initial value of the signal
 * @returns An object containing the signal and history management methods
 * 
 * @example
 * ```typescript
 * const counter = signalWithHistory(0);
 * counter.push(1);
 * counter.undo(); // Reverts to 0
 * ```
 */
export function signalWithHistory<T>(initialValue: T) {
  const history: WritableSignal<T[]> = signal<T[]>([initialValue]);
  const current: WritableSignal<T> = signal<T>(initialValue);

  return {
    value: current,
    history: computed(() => history()),
    push: (value: T) => {
      history.update(h => [...h, value]);
      current.set(value);
    },
    undo: () => {
      const h: T[] = history();
      if (h.length > 1) {
        history.update(h => h.slice(0, -1));
        current.set(h[h.length - 2]);
      }
    }
  };
}

/**
 * Creates a computed signal that updates only when dependencies change
 * 
 * @template T The type of computed value
 * @param compute Function that computes the value
 * @param deps Array of signals this computation depends on
 * @returns A memoized signal
 * 
 * @example
 * ```typescript
 * const name = signal('John');
 * const age = signal(25);
 * const info = memoized(
 *   () => `${name()} is ${age()} years old`,
 *   [name, age]
 * );
 * ```
 */
export function memoized<T>(compute: () => T, deps: Signal<any>[]): Signal<T> {
  return computed(() => {
    deps.forEach(d => d()); // Track dependencies
    return compute();
  });
}

/**
 * Creates a signal with validation support
 * 
 * @template T The type of value to validate
 * @param initialValue Initial value of the signal
 * @param validator Function to validate values
 * @returns An object containing the signal and validation state
 * 
 * @example
 * ```typescript
 * const email = validatedSignal('', 
 *   value => /^[^@]+@[^@]+\.[^@]+$/.test(value)
 * );
 * email.set('invalid'); // returns false
 * email.set('valid@email.com'); // returns true
 * ```
 */
export function validatedSignal<T>(
  initialValue: T,
  validator: (value: T) => boolean
) {
  const value: WritableSignal<T> = signal<T>(initialValue);
  const isValid: Signal<boolean> = computed(() => validator(value()));

  return {
    value,
    isValid,
    set: (newValue: T) => {
      if (validator(newValue)) {
        value.set(newValue);
        return true;
      }
      return false;
    }
  };
}

/**
 * Creates a signal with debounced updates
 */
export function debouncedSignal<T>(initialValue: T, delay: number) {
  const value: WritableSignal<T> = signal<T>(initialValue);
  let timeout: ReturnType<typeof setTimeout>;

  return {
    value: computed(() => value()),
    set: (newValue: T) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        value.set(newValue);
      }, delay);
    }
  };
}

/**
 * Creates a signal with throttled updates
 */
export function throttledSignal<T>(initialValue: T, delay: number) {
  const value: WritableSignal<T> = signal<T>(initialValue);
  let lastRun: number = 0;

  return {
    value: computed(() => value()),
    set: (newValue: T) => {
      const now: number = Date.now();
      if (now - lastRun >= delay) {
        value.set(newValue);
        lastRun = now;
      }
    }
  };
}

/**
 * Creates a signal that batches multiple updates into a single emission
 * 
 * @template T The type of value to batch
 * @param initialValue Initial value of the signal
 * @returns An object containing the signal and batch update method
 * 
 * @example
 * ```typescript
 * const counter = batchSignal(0);
 * counter.update(v => v + 1);
 * counter.update(v => v * 2);
 * // Updates are batched and applied in order
 * ```
 */
export function batchSignal<T>(initialValue: T) {
  const value: WritableSignal<T> = signal<T>(initialValue);
  const updates: WritableSignal<((current: T) => T)[]> = signal<((current: T) => T)[]>([]);

  effect(() => {
    const pendingUpdates: ((current: T) => T)[] = updates();
    if (pendingUpdates.length > 0) {
      value.update(current =>
        pendingUpdates.reduce((acc, update) => update(acc), current)
      );
      updates.set([]);
    }
  });

  return {
    value: computed(() => value()),
    update: (updateFn: (current: T) => T) => {
      updates.update(u => [...u, updateFn]);
    }
  };
}

export interface CleanupSignal<T> {
  value: Signal<T>;
  set: (newValue: T, cleanup?: () => void) => void;
  update: (updateFn: (current: T) => T, cleanup?: () => void) => void;
  destroy: () => void;
}

export function cleanupSignal<T>(initialValue: T): CleanupSignal<T> {
  const value: WritableSignal<T> = signal<T>(initialValue);
  const cleanupFns: (() => void)[] = [];

  return {
    value: value.asReadonly(),
    set(newValue: T, cleanup?: () => void) {
      if (cleanup) cleanupFns.push(cleanup);
      value.set(newValue);
    },
    update(updateFn: (current: T) => T, cleanup?: () => void) {
      if (cleanup) cleanupFns.push(cleanup);
      value.update(updateFn);
    },
    destroy() {
      cleanupFns.forEach(fn => fn());
      cleanupFns.length = 0;
    }
  };
}

/**
 * Creates a signal with async state handling
 * 
 * @template T The type of async value
 * @returns An object containing the signal, loading state, and error handling
 * 
 * @example
 * ```typescript
 * const users = asyncSignal<User[]>();
 * await users.execute(fetchUsers());
 * if (users.error()) {
 *   handleError(users.error());
 * } else {
 *   displayUsers(users.value());
 * }
 * ```
 */
export function asyncSignal<T>() {
  const value: WritableSignal<T | undefined> = signal<T | undefined>(undefined);
  const error: WritableSignal<Error | null> = signal<Error | null>(null);
  const loading: WritableSignal<boolean> = signal(false);

  return {
    value: computed(() => value()),
    error: computed(() => error()),
    loading: computed(() => loading()),

    async execute(promise: Promise<T>) {
      try {
        loading.set(true);
        error.set(null);
        const result: Awaited<T> = await promise;
        value.set(result);
      } catch (e) {
        error.set(e as Error);
      } finally {
        loading.set(false);
      }
    }
  };
}

/**
 * Creates a signal with local storage persistence
 */
export function persistentSignal<T>(key: string, initialValue: T) {
  const stored: string | null = localStorage.getItem(key);
  const value: WritableSignal<T> = signal<T>(stored ? JSON.parse(stored) : initialValue);

  effect(() => {
    const current: T = value();
    localStorage.setItem(key, JSON.stringify(current));
  });

  return {
    value: computed(() => value()),
    set: (newValue: T) => value.set(newValue),
    update: (updateFn: (current: T) => T) => value.update(updateFn)
  };
} 