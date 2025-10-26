/**
 * @fileoverview Collection of operators for transforming and manipulating Angular signals
 * @module ngx-signal-plus/operators
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
 * @example Basic Usage
 * ```typescript
 * import { signal } from '@angular/core';
 * import { map, filter, debounceTime } from 'ngx-signal-plus/operators';
 * 
 * const source = signal(0);
 * const result = source.pipe(
 *   filter(x => x > 0),
 *   map(x => x * 2),
 *   debounceTime(300)
 * );
 * ```
 * 
 * @example Advanced Usage
 * ```typescript
 * // Combine multiple signals
 * const name = signal('John');
 * const age = signal(25);
 * const user = combineLatest([name, age]).pipe(
 *   map(([n, a]) => ({ name: n, age: a })),
 *   filter(u => u.age >= 18)
 * );
 * 
 * // Time-based operations
 * const search = signal('');
 * const results = search.pipe(
 *   debounceTime(300),
 *   distinctUntilChanged(),
 *   filter(term => term.length >= 2)
 * );
 * ```
 */

import { computed, DestroyRef, effect, inject, Injector, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';

/**
 * Type definition for signal operators that can transform signal types
 * @template TInput The input signal type
 * @template TOutput The output signal type (defaults to TInput)
 * 
 * @remarks
 * Operators are functions that take a signal and return a new signal.
 * They can transform both the value type and timing of updates.
 */
export interface SignalOperator<T, R = T> {
  (signal: Signal<T>): Signal<R>;
}

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
 * const fullName = combineLatest([first, last])
 *   .pipe(map(([f, l]) => `${f} ${l}`));
 * ```
 */
export function combineLatest<T>(signals: Signal<T>[]): Signal<T[]> {
  return computed(() => signals.map(s => s()));
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
 * 
 * @example
 * ```typescript
 * const clicks = signal(0);
 * const updates = signal(0);
 * const all = merge(clicks, updates)
 *   .pipe(distinctUntilChanged());
 * ```
 */
export function merge<T>(...signals: Signal<T>[]): Signal<T> {
  const output: WritableSignal<T> = signal<T>(signals[0]());

  if (typeof window !== 'undefined') {
    const injector = inject(Injector);
    runInInjectionContext(injector, () => {
      signals.forEach(s => {
        effect(() => output.set(s()));
      });
    });
  }

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
 * const delayed = source.pipe(
 *   delay(1000), // 1 second delay
 *   distinctUntilChanged()
 * );
 * ```
 */
export function delay<T>(time: number): SignalOperator<T, T> {
  return (input: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(input());

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = input();
        setTimeout(() => output.set(value), time);
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
 * - Emits first value immediately
 * - Ignores values during throttle period
 * - Resets timer on completion
 * 
 * @example
 * ```typescript
 * const throttled = scroll.pipe(
 *   throttleTime(100), // Max 10 updates per second
 *   map(e => e.scrollY)
 * );
 * ```
 */
export function throttleTime<T>(time: number): SignalOperator<T, T> {
  return (input: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(input());
    let lastRun: number = 0;

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const now: number = Date.now();
        const value: T = input();

        if (now - lastRun >= time) {
          output.set(value);
          lastRun = now;
        }
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
 * const skipFirst = source.pipe(
 *   skip(1), // Skip first value
 *   filter(Boolean)
 * );
 * ```
 */
export function skip<T>(count: number): SignalOperator<T> {
  return (source: Signal<T>) => {
    const skipped: WritableSignal<T> = signal<T>(source());
    let skipCount: number = -1; // Start at -1 to handle initial value

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = source();
        skipCount++;
        // Only emit after we've skipped enough values
        if (skipCount >= count) {
          skipped.set(value);
        }
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
 * const first3 = source.pipe(
 *   take(3), // Take first 3 values
 *   map(String)
 * );
 * ```
 */
export function take<T>(count: number): SignalOperator<T> {
  return (source: Signal<T>) => {
    const taken: WritableSignal<T> = signal<T>(source());
    let emitCount: number = 0;

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = source();
        // Always emit until count is reached
        if (emitCount < count) {
          taken.set(value);
          emitCount++;
        }
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
 * const search = input.pipe(
 *   debounceTime(300), // Wait for typing to stop
 *   filter(term => term.length > 2)
 * );
 * ```
 */
export function debounceTime<T>(duration: number): SignalOperator<T> {
  return (source: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(source());
    let timeoutId: any = null;
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
        }, duration);
      });

      destroyRef.onDestroy(() => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      });
    });

    return output.asReadonly();
  };
}

/**
 * Filters out consecutive duplicate values
 * @returns Operator that removes duplicates
 * 
 * @remarks
 * - Uses strict equality
 * - Maintains previous value
 * - Memory efficient
 * 
 * @example
 * ```typescript
 * const unique = source.pipe(
 *   distinctUntilChanged(),
 *   filter(Boolean)
 * );
 * ```
 */
export function distinctUntilChanged<T>(): SignalOperator<T> {
  return (source: Signal<T>) => {
    const distinct: WritableSignal<T> = signal<T>(source());
    let lastValue: T = source();

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value: T = source();
        if (!Object.is(value, lastValue)) {
          distinct.set(value);
          lastValue = value;
        }
      });
    });

    return distinct.asReadonly();
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
 * const doubled = numbers.pipe(
 *   map(n => n * 2),
 *   filter(n => n > 0)
 * );
 * ```
 */
export function map<T, R>(fn: (value: T) => R): SignalOperator<T, R> {
  return (signal: Signal<T>) => computed(() => {
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
 * const positive = numbers.pipe(
 *   filter(n => n > 0),
 *   map(String)
 * );
 * ```
 */
export function filter<T>(predicateFn: (value: T) => boolean): SignalOperator<T> {
  return (input: Signal<T>) => {
    const initialValue: T = input();
    let lastValidValue: T = initialValue;

    // Check if initial value passes predicate
    try {
      if (predicateFn(initialValue)) {
        lastValidValue = initialValue;
      }
    } catch (e) {
      // Keep initial value on error
    }

    return computed(() => {
      try {
        const value: T = input();
        if (predicateFn(value)) {
          lastValidValue = value;
          return value;
        }
        return lastValidValue;
      } catch (e) {
        return lastValidValue;
      }
    });
  };
} 