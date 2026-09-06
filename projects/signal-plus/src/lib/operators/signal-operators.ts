/**
 * @fileoverview Collection of operators for transforming and manipulating Angular signals
 * @module ngx-signal-plus
 *
 * @description
 * This module provides a comprehensive set of operators for Angular signals, including:
 * - Value transformation (map, filter)
 * - Time-based operations (debounce, throttle, delay)
 * - State management (skip, take)
 * - Signal combination (merge, combineLatest)
 *
 * All operators are designed to be:
 * - Type-safe with full generic support
 * - Memory-efficient with proper cleanup
 * - Compatible with Angular's change detection
 * - Safe for server-side rendering
 *
 * An operator is a function from a signal to a signal, so it is applied by
 * calling it with the source signal. Raw Angular signals have no `pipe` method;
 * compose operators by nesting the calls.
 *
 * @example Basic Usage
 * ```typescript
 * import { signal } from '@angular/core';
 * import { spMap, spFilter, spDebounceTime } from 'ngx-signal-plus';
 *
 * const source = signal(0);
 * const result = spDebounceTime<number>(300)(
 *   spMap((x: number) => x * 2)(spFilter((x: number) => x > 0)(source))
 * );
 * ```
 *
 * @example Advanced Usage
 * ```typescript
 * import { signal } from '@angular/core';
 * import {
 *   spCombineLatest,
 *   spDistinctUntilChanged,
 *   spFilter,
 *   spMap,
 * } from 'ngx-signal-plus';
 *
 * // Combine multiple signals
 * const name = signal('John');
 * const age = signal(25);
 * const combined = spCombineLatest<string | number>([name, age]);
 * const user = spFilter((u: { name: string; age: number }) => u.age >= 18)(
 *   spMap(([n, a]: (string | number)[]) => ({
 *     name: n as string,
 *     age: a as number,
 *   }))(combined)
 * );
 *
 * // Distinct search terms, no injection context required
 * const search = signal('');
 * const terms = spFilter((term: string) => term.length >= 2)(
 *   spDistinctUntilChanged<string>()(search)
 * );
 * ```
 *
 * @remarks
 * `spDebounceTime`, `spDelay`, `spThrottleTime`, `spSkip`, `spTake` and
 * `spMerge` create effects, so they must be called from an injection context.
 * `spMap`, `spFilter`, `spDistinctUntilChanged` and `spCombineLatest` are
 * computed-based and may be called anywhere.
 */

import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  runInInjectionContext,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';

/**
 * Type definition for signal operators that can transform signal types
 * @template TInput The input signal type
 * @template TOutput The output signal type (defaults to TInput)
 *
 * @remarks
 * Operators are functions that take a signal and return a new signal.
 * They can transform both the value type and timing of updates.
 */
export type SignalOperator<T, R = T> = (signal: Signal<T>) => Signal<R>;

/**
 * Combines multiple signals into a single signal of array values
 * @param signals Array of signals to combine
 * @returns Signal emitting array of latest values
 *
 * @remarks
 * - Updates when any input signal changes
 * - Output array maintains input signal order
 * - All signals must emit at least once
 *
 * @example
 * ```typescript
 * const first = signal('John');
 * const last = signal('Doe');
 * const fullName = spMap(([f, l]: string[]) => `${f} ${l}`)(
 *   spCombineLatest([first, last])
 * );
 * ```
 */
export function combineLatest<T>(signals: Signal<T>[]): Signal<T[]> {
  return computed(() => signals.map((s) => s()));
}

/**
 * Merges multiple signals into a single signal
 * @param signals Signals to merge
 * @returns Signal emitting values from all inputs
 *
 * @remarks
 * - Updates when any input signal changes
 * - Maintains value type consistency
 * - Order of emissions is preserved
 * - Requires an injection context, and tracks on the server as well as the browser
 *
 * @example
 * ```typescript
 * const clicks = signal(0);
 * const updates = signal(0);
 * const all = spDistinctUntilChanged<number>()(spMerge(clicks, updates));
 * ```
 */
export function merge<T>(...signals: Signal<T>[]): Signal<T> {
  if (signals.length === 0) {
    return signal<T>(undefined as T);
  }

  const output = signal<T>(signals[0]());
  const injector = inject(Injector);

  runInInjectionContext(injector, () => {
    signals.forEach((s) => {
      effect(() => {
        const value: T = s();
        untracked(() => output.set(value));
      });
    });
  });

  return output;
}

/**
 * Delays signal emissions by specified time
 * @param time Delay duration in milliseconds
 * @returns Operator that delays emissions
 *
 * @remarks
 * - Uses setTimeout internally
 * - Maintains value order
 * - Cleans up pending timeouts
 *
 * @example
 * ```typescript
 * const delayed = spDistinctUntilChanged<number>()(spDelay<number>(1000)(source));
 * ```
 */
export function delay<T>(time: number): SignalOperator<T, T> {
  return (input: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(input());
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const destroyRef: DestroyRef = inject(DestroyRef);

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = input();

        // Clear previous timeout to prevent memory leak
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          output.set(value);
          timeoutId = null;
        }, time);
      });

      destroyRef.onDestroy(() => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    });

    return output;
  };
}

/**
 * Limits signal emissions to specified time interval
 * @param time Minimum time between emissions
 * @returns Operator that throttles emissions
 *
 * @remarks
 * - Emits first value immediately (leading-only throttle)
 * - Ignores values during throttle period (no trailing emission)
 * - Schedules no timer, so a destroyed context leaves no pending work
 *
 * @example
 * ```typescript
 * const throttled = spMap((e: ScrollEvent) => e.scrollY)(
 *   spThrottleTime<ScrollEvent>(100)(scroll)
 * );
 * ```
 */
export function throttleTime<T>(time: number): SignalOperator<T, T> {
  return (input: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(input());
    let lastRun = 0;

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const now: number = Date.now();
        const value: T = input();

        untracked(() => {
          if (now - lastRun >= time) {
            output.set(value);
            lastRun = now;
          }
        });
      });
    });

    return output;
  };
}

/**
 * Skips specified number of signal emissions
 * @param count Number of emissions to skip
 * @returns Operator that skips initial values
 *
 * @remarks
 * - Maintains internal counter
 * - Resets on signal completion
 * - Zero count skips nothing
 *
 * @example
 * ```typescript
 * const skipFirst = spFilter(Boolean)(spSkip<number>(1)(source));
 * ```
 */
export function skip<T>(count: number): SignalOperator<T> {
  return (source: Signal<T>) => {
    const skipped: WritableSignal<T> = signal<T>(source());
    let skipCount = -1; // Start at -1 to handle initial value

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = source();

        untracked(() => {
          skipCount++;
          // Only emit after we've skipped enough values
          if (skipCount >= count) {
            skipped.set(value);
          }
        });
      });
    });

    return skipped.asReadonly();
  };
}

/**
 * Takes specified number of signal emissions
 * @param count Number of emissions to take
 * @returns Operator that limits emissions
 *
 * @remarks
 * - Maintains internal counter
 * - Completes after count reached
 * - Zero count takes nothing
 *
 * @example
 * ```typescript
 * const first3 = spMap(String)(spTake<number>(3)(source));
 * ```
 */
export function take<T>(count: number): SignalOperator<T> {
  return (source: Signal<T>) => {
    const taken: WritableSignal<T> = signal<T>(source());
    let emitCount = 0;

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = source();

        untracked(() => {
          // Always emit until count is reached
          if (emitCount < count) {
            taken.set(value);
            emitCount++;
          }
        });
      });
    });

    return taken.asReadonly();
  };
}

/**
 * Debounces signal emissions by specified time
 * @param duration Debounce duration in milliseconds
 * @returns Operator that debounces emissions
 *
 * @remarks
 * - Waits for quiet period
 * - Cancels pending timeouts
 * - Ideal for input handling
 *
 * @example
 * ```typescript
 * // Wait for typing to stop, then keep terms worth searching
 * const search = spFilter((term: string) => term.length > 2)(
 *   spDebounceTime<string>(300)(input)
 * );
 * ```
 */
export function debounceTime<T>(duration: number): SignalOperator<T> {
  return (source: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(source());
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const injector: Injector = inject(Injector);
    const destroyRef: DestroyRef = inject(DestroyRef);

    runInInjectionContext(injector, () => {
      let lastValue: T = source();
      output.set(lastValue);

      effect(() => {
        const value: T = source();

        // Skip if value hasn't changed
        if (Object.is(value, lastValue)) {
          return;
        }

        // Clear existing timeout
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        // Schedule new update
        timeoutId = setTimeout(() => {
          runInInjectionContext(injector, () => {
            output.set(value);
            lastValue = value;
          });
          timeoutId = null; // Reset after firing
        }, duration);
      });

      destroyRef.onDestroy(() => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    });

    return output.asReadonly();
  };
}

/**
 * Filters out consecutive duplicate values using deep comparison
 * @returns Operator that removes duplicates
 *
 * @remarks
 * - Uses deep value comparison (JSON serialization)
 * - Compares object/array contents, not just references
 * - Falls back to string comparison for non-serializable values
 * - Maintains previous value
 * - Memory efficient
 *
 * @example
 * ```typescript
 * const unique = spFilter(Boolean)(spDistinctUntilChanged<number>()(source));
 *
 * // Deep comparison for objects
 * signal.set({ a: 1 }); // Emits
 * signal.set({ a: 1 }); // Skipped (same value)
 * signal.set({ a: 2 }); // Emits (different value)
 * ```
 */
export function distinctUntilChanged<T>(): SignalOperator<T> {
  return (source: Signal<T>) => {
    // Helper function for deep value comparison
    const serializeValue = (value: T): string => {
      try {
        return JSON.stringify(value);
      } catch {
        // Fallback for non-serializable values (functions, circular refs, etc.)
        return String(value);
      }
    };

    let lastValue: T = source();
    let lastSerialized: string = serializeValue(lastValue);

    // Use computed for synchronous updates
    return computed(() => {
      const value: T = source();
      const serialized: string = serializeValue(value);

      // Compare serialized values for deep equality
      if (serialized !== lastSerialized) {
        lastValue = value;
        lastSerialized = serialized;
      }

      return lastValue;
    });
  };
}

/**
 * Maps signal values through transform function
 * @param fn Transform function
 * @returns Operator that transforms values
 *
 * @remarks
 * - Type-safe transformation
 * - Synchronous operation
 * - No value caching
 *
 * @example
 * ```typescript
 * const doubled = spFilter((n: number) => n > 0)(
 *   spMap((n: number) => n * 2)(numbers)
 * );
 * ```
 */
export function map<T, R>(fn: (value: T) => R): SignalOperator<T, R> {
  return (signal: Signal<T>) =>
    computed(() => {
      try {
        return fn(signal());
      } catch (error) {
        console.error('Error in signal map operator:', error);
        throw error;
      }
    });
}

/**
 * Filters signal values based on predicate
 * @param predicateFn Filter predicate function
 * @returns Operator that filters values
 *
 * @remarks
 * - Type-safe predicate
 * - Synchronous operation
 * - False values dropped
 *
 * @example
 * ```typescript
 * const positive = spMap(String)(spFilter((n: number) => n > 0)(numbers));
 * ```
 */
export function filter<T>(
  predicateFn: (value: T) => boolean,
): SignalOperator<T> {
  return (input: Signal<T>) => {
    const initialValue: T = input();
    let lastValidValue: T = initialValue;

    // Check if initial value passes predicate
    try {
      if (predicateFn(initialValue)) {
        lastValidValue = initialValue;
      }
    } catch {
      // Keep initial value on error
    }

    return computed(() => {
      try {
        const value: T = input();
        if (value === null || value === undefined) {
          return value;
        }
        if (predicateFn(value)) {
          lastValidValue = value;
          return value;
        }
        return lastValidValue;
      } catch {
        return lastValidValue;
      }
    });
  };
}
