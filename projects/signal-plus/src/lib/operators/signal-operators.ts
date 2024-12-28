/**
 * @fileoverview Collection of operators for ngx-signal-plus
 * @module ngx-signal-plus/operators
 */

import { computed, DestroyRef, effect, inject, Injector, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';

/**
 * Type definition for signal operators that can transform signal types
 * @template TInput The input signal type
 * @template TOutput The output signal type (defaults to TInput)
 */
export type SignalOperator<TInput, TOutput = TInput> =
  (signal: Signal<TInput>) => Signal<TOutput>;

/**
 * Combines multiple signals into a single signal array
 * 
 * @template T The type of values in the signals
 * @param signals Array of signals to combine
 * @returns A signal that emits an array of the latest values
 * 
 * @example
 * ```typescript
 * const name = signal('John');
 * const age = signal(25);
 * const combined = combineLatest([name, age]);
 * // combined() -> ['John', 25]
 * ```
 */
export function combineLatest<T>(signals: Signal<T>[]): Signal<T[]> {
  return computed(() => signals.map(s => s()));
}

/**
 * Merges multiple signals into a single signal
 * 
 * @template T The type of values in the signals
 * @param signals Array of signals to merge
 * @returns A signal that emits the latest value from any input signal
 * 
 * @example
 * ```typescript
 * const signal1 = signal(1);
 * const signal2 = signal(2);
 * const merged = merge(signal1, signal2);
 * signal1.set(3); // merged() -> 3
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
 * 
 * @template T The type of values in the signal
 * @param time Time in milliseconds to delay emissions
 * @returns A signal operator that delays emissions
 * 
 * @example
 * ```typescript
 * const delayed = signal.pipe(delay(1000));
 * ```
 */
export function delay<T>(time: number): SignalOperator<T> {
  return (input: Signal<T>) => {
    const output: WritableSignal<T> = signal<T>(input());

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        const value = input();
        setTimeout(() => output.set(value), time);
      });
    });

    return output;
  };
}

/**
 * Throttles signal emissions to occur at most once in the specified time period
 * 
 * @template T The type of values in the signal
 * @param time Time in milliseconds to throttle emissions
 * @returns A signal operator that throttles emissions
 * 
 * @example
 * ```typescript
 * const throttled = signal.pipe(throttleTime(1000));
 * ```
 */
export function throttleTime<T>(time: number): SignalOperator<T> {
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
 * Skips specified number of emissions
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
 * Takes specified number of emissions
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
 * @param time Time in milliseconds to debounce
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
 * Emits value only when it's different from previous
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
 * Transforms signal values using provided projection function
 * @param projectionFn Function to transform values
 */
export function map<TInput, TOutput>(
  projectionFn: (value: TInput) => TOutput
): SignalOperator<TInput, TOutput> {
  return (input: Signal<TInput>) => computed(() => projectionFn(input()));
}

/**
 * Filters signal values based on predicate function
 * @param predicateFn Function to test each value
 */
export function filter<T>(predicate: (value: T) => boolean): SignalOperator<T> {
  return (source: Signal<T>) => {
    const filtered: WritableSignal<T> = signal<T>(source());
    let lastValidValue: T = source();

    runInInjectionContext(inject(Injector), () => {
      effect(() => {
        try {
          const value: T = source();
          const result: boolean = predicate(value);
          if (result) {
            filtered.set(value);
            lastValidValue = value;
          } else {
            filtered.set(lastValidValue);
          }
        } catch (err) {
          // Don't update the signal if predicate throws
          // Let the error propagate when reading the signal
          filtered.set(lastValidValue);
        }
      });
    });

    // Wrap the signal read to propagate errors
    return computed(() => {
      const value: T = source();
      // Re-run predicate to propagate any errors
      predicate(value);
      return filtered();
    });
  };
} 