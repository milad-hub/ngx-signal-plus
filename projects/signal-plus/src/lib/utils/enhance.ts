/**
 * @fileoverview Utility for enhancing Angular signals with additional features
 * @description
 * Provides a way to add advanced functionality to existing Angular signals
 * through a fluent builder API. This module bridges the gap between basic
 * Angular signals and the enhanced features of SignalPlus.
 *
 * Features that can be added:
 * - Persistent storage with automatic sync
 * - Validation rules and error handling
 * - Value transformation pipeline
 * - History tracking with undo/redo
 * - Time-based operations (debounce, throttle)
 * - Change detection optimization
 *
 * @example Basic Enhancement
 * ```typescript
 * // Add persistence to a signal
 * const name = signal('John');
 * const persistent = enhance(name)
 *   .persist('user-name')
 *   .build();
 *
 * // Add validation to a signal
 * const age = signal(25);
 * const validated = enhance(age)
 *   .validate(n => n >= 0)
 *   .build();
 * ```
 *
 * @example Advanced Usage
 * ```typescript
 * // Combine multiple features
 * const formInput = enhance(signal(''))
 *   .persist('form-field')
 *   .validate(value => value.length >= 3)
 *   .transform(value => value.trim())
 *   .debounce(300)
 *   .withHistory()
 *   .build();
 *
 * // Handle errors
 * const validated = enhance(signal(0))
 *   .validate(n => {
 *     if (n < 0) throw new Error('Must be positive');
 *     return true;
 *   })
 *   .onError(console.error)
 *   .build();
 * ```
 */

import { Signal } from '@angular/core';
import { SignalBuilder } from '../core/signal-builder';

/**
 * Enhances an Angular signal with additional features
 *
 * @template T The type of value managed by the signal
 * @param signal The Angular signal to enhance
 * @returns A SignalBuilder instance for configuring enhancements
 *
 * @remarks
 * The enhance function is the entry point for adding SignalPlus features
 * to existing Angular signals. It creates a builder instance that allows
 * configuring various enhancements through a fluent API.
 *
 * Key Features:
 * - Persistence: Automatic localStorage integration
 * - Validation: Type-safe validation rules
 * - Transformation: Value processing pipeline
 * - History: Undo/redo capability
 * - Timing: Debounce and throttle
 * - Error Handling: Centralized error management
 *
 * The builder pattern ensures type safety and provides a clear API
 * for configuring exactly which features are needed.
 *
 * @example Persistence and Validation
 * ```typescript
 * const counter = enhance(signal(0))
 *   .persist('counter')
 *   .validate(n => n >= 0)
 *   .build();
 *
 * counter.value++; // Persisted and validated
 * ```
 *
 * @example Form Input Enhancement
 * ```typescript
 * const input = enhance(signal(''))
 *   .persist('user-input')
 *   .validate(value => value.length > 0)
 *   .transform(value => value.trim())
 *   .debounce(300)
 *   .withHistory()
 *   .onError(error => {
 *     console.error('Input error:', error);
 *     showErrorUI(error.message);
 *   })
 *   .build();
 * ```
 */
export function enhance<T>(signal: Signal<T>): SignalBuilder<T> {
  return new SignalBuilder<T>(signal());
}
