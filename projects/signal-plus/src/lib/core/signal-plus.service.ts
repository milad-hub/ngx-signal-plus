/**
 * @fileoverview Signal Plus Service
 * @description Provides core functionality for signal operations and management
 * 
 * @package ngx-signal-plus
 * @version 1.0.1
 */

import { computed, DestroyRef, effect, EffectRef, inject, Injectable, Injector, OnDestroy, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';
import { HistoryManager } from '../managers/history-manager';
import { SignalOptions, SignalPlus } from '../models/signal-plus.model';
import { debounceTime as debounceFn, distinctUntilChanged as distinctFn, SignalOperator } from '../operators/signal-operators';

/**
 * Service that provides signal plus functionality with enhanced features.
 * Handles signal creation, persistence, validation, and transformation.
 * 
 * @example
 * ```typescript
 * const counter = signalPlus.create({
 *   initialValue: 0,
 *   persist: true,
 *   storageKey: 'counter',
 *   validators: [value => value >= 0]
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class SignalPlusService implements OnDestroy {
  private readonly signals: WritableSignal<Map<string, WritableSignal<any>>> = signal(new Map<string, WritableSignal<any>>());
  private readonly injector: Injector = inject(Injector);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private cleanup: (() => void)[] = [];

  /**
   * Creates an instance of SignalPlusService
   */
  constructor() {
    // Store cleanup function instead of executing immediately
    this.destroyRef.onDestroy(() => {
      this.cleanup.forEach(fn => fn());
    });
  }

  ngOnDestroy(): void {
    // Run cleanup functions
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
  }

  /**
   * Creates a new signal plus with the provided configuration
   */
  create<T>(options: SignalOptions<T>): SignalPlus<T> {
    this.validateOptions(options);

    const {
      initialValue,
      storageKey,
      persist = false,
      validators = [],
      transform = (value: T) => value,
      debounceTime: debounceMs,
      distinctUntilChanged: distinct
    } = options;

    // Create core signals
    const value: WritableSignal<T> = signal<T>(this.getInitialValue(initialValue, storageKey, persist));
    const previousValue: WritableSignal<T | undefined> = signal<T | undefined>(undefined);
    const history: HistoryManager<T> = new HistoryManager<T>(initialValue);

    // Create computed states
    const isValid: Signal<boolean> = computed(() => validators.every(v => v(value())));
    const isDirty: Signal<boolean> = computed(() => previousValue() !== undefined);
    const hasChanged: Signal<boolean> = computed(() => value() !== initialValue);

    // Setup persistence if needed
    if (persist && storageKey) {
      const cleanup: EffectRef = effect(() => {
        const currentValue: T = value();
        this.saveToStorage(storageKey, currentValue);
      }, { injector: this.injector });

      this.cleanup.push(() => cleanup.destroy());
    }

    // Create the plus
    const plus: SignalPlus<T> = this.createPlus(value, previousValue, history, {
      initialValue,
      transform,
      validators,
      isValid,
      isDirty,
      hasChanged
    });

    // Apply optional operators
    let processedSignal: Signal<T> = plus.signal;
    if (debounceMs) {
      processedSignal = debounceFn<T>(debounceMs)(processedSignal) as Signal<T>;
    }
    if (distinct) {
      processedSignal = distinctFn<T>()(processedSignal) as Signal<T>;
    }

    // Store signal reference
    this.signals.update(map => {
      map.set(storageKey ?? crypto.randomUUID(), value);
      return map;
    });

    return plus;
  }

  /**
   * Validates the provided options for signal plus creation
   * @throws Error if options are invalid
   */
  private validateOptions<T>(options: SignalOptions<T>): void {
    if (options.persist && !options.storageKey) {
      throw new Error('Storage key is required when persistence is enabled');
    }

    if (options.debounceTime !== undefined && options.debounceTime < 0) {
      throw new Error('debounceTime must be a positive number');
    }

    if (options.validators?.length && !options.validators.every(v => typeof v === 'function')) {
      throw new Error('All validators must be functions');
    }
  }

  private getInitialValue<T>(
    initialValue: T,
    storageKey?: string,
    persist?: boolean
  ): T {
    if (persist && storageKey) {
      const stored: T | undefined = this.getFromStorage<T>(storageKey);
      return stored ?? initialValue;
    }
    return initialValue;
  }

  private setupPersistence<T>(key: string, signal: WritableSignal<T>): void {
    effect(() => {
      const value: T = signal();
      this.saveToStorage(key, value);
    });
  }

  private createDerivedPlus<T>(derivedSignal: Signal<T>): SignalPlus<T> {
    return createDerivedPlus(derivedSignal);
  }

  private getFromStorage<T>(key: string): T | undefined {
    try {
      const item: string | null = localStorage.getItem(key);
      if (!item) return undefined;

      const parsed: T | null = JSON.parse(item);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as T;
      }
      return parsed as T;
    } catch {
      return undefined;
    }
  }

  private saveToStorage<T>(key: string, value: T): void {
    try {
      if (value === undefined) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silent fail for storage errors
    }
  }

  private createPlus<T>(
    value: WritableSignal<T>,
    previousValue: WritableSignal<T | undefined>,
    history: HistoryManager<T>,
    options: {
      initialValue: T;
      transform: (value: T) => T;
      validators: ((value: T) => boolean)[];
      isValid: Signal<boolean>;
      isDirty: Signal<boolean>;
      hasChanged: Signal<boolean>;
    }
  ): SignalPlus<T> {
    const { initialValue, transform, validators } = options;

    return {
      get value(): T {
        try {
          return transform(value());
        } catch {
          return value();
        }
      },
      get previousValue(): T | undefined {
        return previousValue();
      },
      signal: computed(() => transform(value())),
      writable: value,

      setValue(newValue: T) {
        previousValue.set(value());
        history.push(newValue);
        value.set(newValue);
      },

      update(fn: (current: T) => T) {
        this.setValue(fn(this.value));
      },

      reset() {
        previousValue.set(value());
        value.set(initialValue);
        history.push(initialValue);
      },

      validate: () => validators.every(v => v(value())),
      isValid: options.isValid,
      isDirty: options.isDirty,
      hasChanged: options.hasChanged,
      history: computed(() => [history.current]),

      undo() {
        const previous: T | undefined = history.undo();
        if (previous !== undefined) {
          previousValue.set(value());
          value.set(previous);
        }
      },

      redo() {
        const next: T | undefined = history.redo();
        if (next !== undefined) {
          previousValue.set(value());
          value.set(next);
        }
      },

      subscribe(callback: (value: T) => void) {
        const dispose: EffectRef = effect(() => callback(transform(value())));
        return () => dispose.destroy();
      },

      pipe<R>(...operators: SignalOperator<T, R>[]): SignalPlus<R> {
        let result: Signal<any> = this.signal;
        operators.forEach(operator => {
          result = operator(result);
        });
        return createDerivedPlus(result);
      }
    };
  }

  pipe<T>(source: Signal<T>, operators: SignalOperator<any, any>[]): Signal<T> {
    const result: WritableSignal<T> = signal<T>(source());

    const injector = inject(Injector);
    const cleanup: (() => void)[] = [];

    runInInjectionContext(injector, () => {
      let current: Signal<T> = source;
      operators.forEach(op => {
        current = op(current);
        const dispose: EffectRef = effect(() => {
          result.set(current());
        });
        cleanup.push(() => dispose.destroy());
      });
    });

    // Clean up effects when signal is destroyed
    inject(DestroyRef).onDestroy(() => {
      cleanup.forEach(fn => fn());
    });

    return result.asReadonly();
  }
}

function createDerivedPlus<T>(derivedSignal: Signal<T>): SignalPlus<T> {
  return {
    get value(): T {
      return derivedSignal();
    },
    previousValue: undefined,
    signal: derivedSignal,
    writable: signal(derivedSignal()),
    setValue: () => {
      throw new Error('Derived signal cannot be modified directly');
    },
    update: () => {
      throw new Error('Derived signal cannot be modified directly');
    },
    reset: () => {
      throw new Error('Derived signal cannot be modified directly');
    },
    validate: () => true,
    isValid: computed(() => true),
    isDirty: computed(() => false),
    hasChanged: computed(() => false),
    history: computed(() => []),
    undo: () => { },
    redo: () => { },
    subscribe: (callback: (value: T) => void) => {
      const dispose: EffectRef = effect(() => callback(derivedSignal()));
      return () => dispose.destroy();
    },
    pipe<R>(...operators: SignalOperator<T, R>[]): SignalPlus<R> {
      let result: Signal<any> = derivedSignal;
      operators.forEach(operator => {
        result = operator(result);
      });
      return createDerivedPlus(result);
    }
  };
}
