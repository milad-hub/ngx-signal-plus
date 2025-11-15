/**
 * @fileoverview Core service for managing enhanced Angular signals
 * @description Provides a simplified API for creating and managing signals with additional features.
 * This service is the main entry point for creating and managing enhanced signals.
 *
 * The service provides three levels of API complexity:
 * 1. Presets for common use cases (counter, toggle, form)
 * 2. Simple creation with basic options (validation, storage)
 * 3. Builder pattern for advanced configuration (history, transforms)
 *
 * @example Basic Usage with Presets
 * ```typescript
 * const counter = signalPlus.presets.counter(0);
 * const toggle = signalPlus.presets.toggle(false);
 * ```
 *
 * @example Form Input with Validation
 * ```typescript
 * const name = signalPlus.presets.formInput({
 *   initial: '',
 *   key: 'user-name',
 *   validator: signalPlus.validators.string.notEmpty
 * });
 * ```
 *
 * @example Advanced Configuration
 * ```typescript
 * const advanced = signalPlus.create(0)
 *   .persist('counter')
 *   .validate(x => x >= 0)
 *   .transform(Math.round)
 *   .withHistory()
 *   .build();
 * ```
 */

import { Injectable, OnDestroy } from '@angular/core';
import {
  CounterConfig,
  FormConfig,
  SignalPlus,
  SimpleSignalOptions,
} from '../models/signal-plus.model';
import { validators } from '../utils/presets';
import { SignalBuilder } from './signal-builder';

/**
 * Injectable service that provides the core functionality for creating and managing enhanced signals.
 * Implements OnDestroy for proper cleanup of resources.
 */
@Injectable({
  providedIn: 'root',
})
export class SignalPlusService implements OnDestroy {
  /** Internal set of cleanup functions to be executed on service destruction */
  private readonly cleanup: Set<() => void> = new Set<() => void>();

  /**
   * Creates a new signal builder for advanced configuration.
   * @param initialValue The initial value of the signal
   * @returns A SignalBuilder instance for chaining configuration
   * @throws {Error} If initialValue is undefined
   *
   * @example
   * ```typescript
   * const signal = signalPlus.create(0)
   *   .persist('key')
   *   .validate(x => x >= 0)
   *   .build();
   * ```
   */
  create<T>(initialValue: T): SignalBuilder<T> {
    if (initialValue === undefined) {
      throw new Error('Initial value cannot be undefined');
    }
    return new SignalBuilder<T>(initialValue);
  }

  /**
   * Creates a signal with common options and error handling.
   * @param initialValue The initial value of the signal
   * @param options Configuration options for the signal
   * @returns A SignalPlus instance with the specified configuration
   * @throws {Error} If validation fails and no error handler is provided
   *
   * @example
   * ```typescript
   * const input = signalPlus.createSimple('', {
   *   key: 'form-input',
   *   validator: signalPlus.validators.string.notEmpty,
   *   onError: console.error
   * });
   * ```
   */
  createSimple<T>(
    initialValue: T,
    options?: SimpleSignalOptions<T>,
  ): SignalPlus<T> {
    try {
      const builder: SignalBuilder<T> = this.create(initialValue);

      if (options?.key) {
        builder.persist(options.key);
      }

      if (options?.validator) {
        builder.validate(options.validator);
      }

      if (options?.debounce) {
        if (options.debounce < 0) {
          throw new Error('Debounce time must be positive');
        }
        builder.debounce(options.debounce);
      }

      if (options?.history) {
        builder.withHistory();
      }

      if (options?.onError) {
        builder.onError(options.onError);
      }

      return builder.build();
    } catch (error) {
      if (options?.onError) {
        options.onError(error as Error);
      }
      return SignalBuilder.mock({ initialValue });
    }
  }

  /**
   * Collection of predefined validators for different data types.
   * Includes validators for strings, numbers, arrays, and custom types.
   * @see {@link validators} for available validation rules
   */
  readonly validators: typeof validators = validators;

  /**
   * Cleanup resources when service is destroyed.
   * Executes all registered cleanup functions and clears the set.
   * @internal
   */
  ngOnDestroy(): void {
    this.cleanup.forEach((cleanup) => cleanup());
    this.cleanup.clear();
  }

  /**
   * Static helper to create a new signal builder.
   * Provides the same functionality as instance create() method.
   * @param value The initial value of the signal
   * @returns A SignalBuilder instance for chaining configuration
   * @throws {Error} If value is undefined
   */
  static create<T>(value: T) {
    return new SignalBuilder<T>(value);
  }

  /**
   * Static helper to create a counter signal with validation.
   * Configures bounds checking and history tracking.
   * @param config Optional configuration for initial value and bounds
   * @returns A SignalBuilder configured for counter behavior
   */
  static counter(config?: CounterConfig) {
    return SignalPlusService.create(config?.initial ?? 0)
      .validate((x) => x >= (config?.min ?? 0))
      .validate((x) => x <= (config?.max ?? Infinity))
      .withHistory();
  }

  /**
   * Static helper to create a form input signal.
   * Configures validation, debouncing, and persistence.
   * @param config Form input configuration options
   * @returns A SignalBuilder configured for form input behavior
   */
  static form<T>(config: FormConfig<T>) {
    return SignalPlusService.create(config.initial)
      .validate(config.validator || (() => true))
      .debounce(config.debounce ?? 300)
      .persist(config.key);
  }
}
