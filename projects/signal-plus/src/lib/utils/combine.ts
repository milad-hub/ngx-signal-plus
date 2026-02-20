import { Signal, computed } from '@angular/core';

export function spCombine<TSignals extends readonly Signal<unknown>[], TResult>(
  signals: [...TSignals],
  combiner: (...values: { [K in keyof TSignals]: ReturnType<TSignals[K]> }) => TResult,
): Signal<TResult> {
  return computed(() => {
    const values = signals.map((source) => source()) as {
      [K in keyof TSignals]: ReturnType<TSignals[K]>;
    };
    return combiner(...values);
  });
}

export function spAll(signals: readonly Signal<boolean>[]): Signal<boolean> {
  return computed(() => signals.every((source) => source()));
}

export function spAny(signals: readonly Signal<boolean>[]): Signal<boolean> {
  return computed(() => signals.some((source) => source()));
}
