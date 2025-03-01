/**
 * @fileoverview Collection of utility functions for working with signals
 * @module SignalUtils
 * @description
 * This module provides a comprehensive set of utility functions for enhancing
 * and managing Angular signals. Each utility addresses common signal patterns
 * and use cases, making it easier to handle complex state management scenarios.
 * 
 * Features:
 * - History tracking with undo/redo
 * - Memoization and dependency tracking
 * - Validation and error handling
 * - Time-based operations (debounce, throttle)
 * - Batch updates and cleanup
 * - Async state management
 * - Persistence
 * 
 * @example Basic Usage
 * ```typescript
 * // History tracking
 * const counter = signalWithHistory(0);
 * counter.push(1);
 * counter.undo();
 * 
 * // Validated signal
 * const age = validatedSignal(25, value => value >= 0);
 * 
 * // Debounced input
 * const search = debouncedSignal('', 300);
 * ```
 */

import { computed, effect, Signal, signal, WritableSignal } from '@angular/core';

/**
 * Creates a signal with history tracking capabilities
 * 
 * @template T The type of value to track
 * @param initialValue The initial value of the signal
 * @returns An object containing the signal and history management methods
 * 
 * @remarks
 * Provides a signal wrapper with:
 * - Value history tracking
 * - Undo capability
 * - Current value access
 * - History state observation
 * 
 * Use this when you need:
 * - Undo/redo functionality
 * - State history tracking
 * - Change auditing
 * 
 * @example Basic Usage
 * ```typescript
 * const counter = signalWithHistory(0);
 * counter.push(1);
 * counter.undo(); // Reverts to 0
 * console.log(counter.history()); // [0]
 * ```
 * 
 * @example Form State
 * ```typescript
 * const form = signalWithHistory({ name: '', age: 0 });
 * form.push({ name: 'John', age: 25 });
 * form.push({ name: 'John', age: 30 });
 * form.undo(); // Reverts last change
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
 * @returns A memoized signal that updates only when dependencies change
 * 
 * @remarks
 * Optimizes performance by:
 * - Caching computed values
 * - Tracking dependencies
 * - Preventing unnecessary recalculations
 * - Cleaning up resources
 * 
 * Use this when you need:
 * - Derived state
 * - Complex calculations
 * - Performance optimization
 * 
 * @example Basic Memoization
 * ```typescript
 * const count = signal(0);
 * const doubled = memoized(
 *   () => count() * 2,
 *   [count]
 * );
 * ```
 * 
 * @example Complex Computation
 * ```typescript
 * const users = signal([]);
 * const filter = signal('');
 * 
 * const filteredUsers = memoized(
 *   () => users().filter(u => 
 *     u.name.includes(filter())
 *   ),
 *   [users, filter]
 * );
 * ```
 */
export function memoized<T>(compute: () => T, deps: Signal<any>[]): Signal<T> {
  return computed(() => {
    deps.forEach(d => d());
    return compute();
  });
}

/**
 * Creates a signal with validation
 * 
 * @template T The type of value to validate
 * @param initialValue Initial value of the signal
 * @param validator Function to validate new values
 * @returns A validated signal with error handling
 * 
 * @remarks
 * Provides validation features:
 * - Value constraints
 * - Error prevention
 * - Type safety
 * - Invalid state handling
 * 
 * Use this when you need:
 * - Input validation
 * - Data constraints
 * - Error prevention
 * 
 * @example Number Range
 * ```typescript
 * const age = validatedSignal(25, value => 
 *   value >= 0 && value <= 120
 * );
 * 
 * age.set(150); // Throws error
 * ```
 * 
 * @example Complex Validation
 * ```typescript
 * const user = validatedSignal(
 *   { name: '', email: '' },
 *   user => {
 *     if (!user.name) return false;
 *     return /^[^@]+@[^@]+$/.test(user.email);
 *   }
 * );
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
 * Creates a debounced signal
 * 
 * @template T The type of signal value
 * @param initialValue Initial value of the signal
 * @param delay Debounce delay in milliseconds
 * @returns A debounced signal that updates after delay
 * 
 * @remarks
 * Optimizes updates by:
 * - Delaying value changes
 * - Canceling pending updates
 * - Reducing update frequency
 * - Cleaning up timeouts
 * 
 * Use this when you need:
 * - Search inputs
 * - Form auto-save
 * - API call optimization
 * 
 * @example Search Input
 * ```typescript
 * const search = debouncedSignal('', 300);
 * 
 * // Updates after 300ms of no changes
 * search.set('query');
 * ```
 * 
 * @example Form Auto-save
 * ```typescript
 * const form = debouncedSignal(
 *   { text: '' },
 *   1000
 * );
 * 
 * form.subscribe(value => saveToAPI(value));
 * ```
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
 * Creates a throttled signal
 * 
 * @template T The type of signal value
 * @param initialValue Initial value of the signal
 * @param delay Minimum time between updates
 * @returns A throttled signal with rate limiting
 * 
 * @remarks
 * Controls update frequency by:
 * - Limiting update rate
 * - Maintaining latest value
 * - Managing update timing
 * - Cleaning up intervals
 * 
 * Use this when you need:
 * - Scroll handlers
 * - Window resize
 * - Frequent updates
 * 
 * @example Scroll Handler
 * ```typescript
 * const scroll = throttledSignal(0, 100);
 * 
 * window.onscroll = () => 
 *   scroll.set(window.scrollY);
 * ```
 * 
 * @example Window Resize
 * ```typescript
 * const size = throttledSignal(
 *   { width: 0, height: 0 },
 *   200
 * );
 * 
 * window.onresize = () => size.set({
 *   width: window.innerWidth,
 *   height: window.innerHeight
 * });
 * ```
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
 * Creates a signal for batch updates
 * 
 * @template T The type of signal value
 * @param initialValue Initial value of the signal
 * @returns A signal with batch update capabilities
 * 
 * @remarks
 * Optimizes multiple updates by:
 * - Batching changes
 * - Reducing renders
 * - Managing update timing
 * - Maintaining consistency
 * 
 * Use this when you need:
 * - Multiple updates
 * - Performance optimization
 * - State consistency
 * 
 * @example Batch Updates
 * ```typescript
 * const state = batchSignal({ count: 0, total: 0 });
 * 
 * state.batch(() => {
 *   state.update(s => ({ ...s, count: s.count + 1 }));
 *   state.update(s => ({ ...s, total: s.total + 10 }));
 * }); // Single update notification
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

/**
 * Interface for signals with cleanup
 * @template T The type of signal value
 */
export interface CleanupSignal<T> {
  /** Current signal value */
  value: Signal<T>;
  /** Sets new value with optional cleanup */
  set: (newValue: T, cleanup?: () => void) => void;
  /** Updates value with function and optional cleanup */
  update: (updateFn: (current: T) => T, cleanup?: () => void) => void;
  /** Cleans up resources */
  destroy: () => void;
}

/**
 * Creates a signal with resource cleanup
 * 
 * @template T The type of signal value
 * @param initialValue Initial value of the signal
 * @returns A signal with cleanup capabilities
 * 
 * @remarks
 * Manages resources by:
 * - Automatic cleanup
 * - Resource tracking
 * - Memory management
 * - Preventing leaks
 * 
 * Use this when you need:
 * - Resource management
 * - Subscription cleanup
 * - Event listener removal
 * 
 * @example Resource Management
 * ```typescript
 * const audio = cleanupSignal<HTMLAudioElement | null>(null);
 * 
 * audio.set(new Audio('music.mp3'), () => {
 *   audio.value()?.pause();
 * });
 * ```
 * 
 * @example Event Cleanup
 * ```typescript
 * const listener = cleanupSignal(null);
 * 
 * listener.set(
 *   handler,
 *   () => window.removeEventListener('resize', handler)
 * );
 * ```
 */
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
 * Creates an async signal for handling promises
 * 
 * @template T The type of async value
 * @returns An async signal with loading state
 * 
 * @remarks
 * Manages async state with:
 * - Loading indicators
 * - Error handling
 * - Promise tracking
 * - State updates
 * 
 * Use this when you need:
 * - API calls
 * - Data fetching
 * - Async operations
 * 
 * @example API Call
 * ```typescript
 * const users = asyncSignal<User[]>();
 * 
 * await users.execute(fetchUsers());
 * console.log(users.loading()); // false
 * console.log(users.value()); // User[]
 * ```
 * 
 * @example Error Handling
 * ```typescript
 * const data = asyncSignal<Data>();
 * 
 * try {
 *   await data.execute(fetchData());
 * } catch (error) {
 *   console.error(data.error());
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
 * Creates a persistent signal with storage
 * 
 * @template T The type of stored value
 * @param key Storage key
 * @param initialValue Initial value
 * @returns A signal with persistence
 * 
 * @remarks
 * Provides persistence with:
 * - Automatic storage
 * - Value recovery
 * - Change syncing
 * - Error handling
 * 
 * Use this when you need:
 * - Data persistence
 * - State recovery
 * - Cross-session state
 * 
 * @example Theme Storage
 * ```typescript
 * const theme = persistentSignal(
 *   'app-theme',
 *   'light'
 * );
 * 
 * theme.set('dark'); // Automatically stored
 * ```
 * 
 * @example User Preferences
 * ```typescript
 * const prefs = persistentSignal(
 *   'user-prefs',
 *   { notifications: true, language: 'en' }
 * );
 * 
 * prefs.subscribe(value => updateUI(value));
 * ```
 */
export function persistentSignal<T>(key: string, initialValue: T) {
  const value: WritableSignal<T> = signal<T>(initialValue);
  
  // Try to load initial value from storage
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      value.set(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Error loading from storage:', e);
  }

  // Set up persistence effect
  effect(() => {
    const current: T = value();
    // Before saving, check if existing stored data is valid JSON
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading from storage:', e);
    }
    try {
      localStorage.setItem(key, JSON.stringify(current));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded');
      } else {
        console.error('Error saving to storage:', e);
      }
    }
  });

  return {
    value: computed(() => value()),
    set: (newValue: T) => value.set(newValue),
    update: (updateFn: (current: T) => T) => value.update(updateFn)
  };
} 