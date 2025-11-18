import { Signal, WritableSignal } from '@angular/core';

/**
 * Function signature for async validators
 * @template T - The type of value being validated
 * @param value - The value to validate
 * @returns Promise resolving to true if valid, false if invalid
 */
export type AsyncValidator<T = unknown> = (value: T) => Promise<boolean>;

/**
 * @fileoverview Core type definitions for ngx-signal-plus library
 * This file contains all the core interfaces and types used throughout the library.
 * It defines the shape of signals, their configuration options, and utility types.
 *
 * Core Concepts:
 * - Signal Types: Enhanced Angular signals with additional features
 * - Validators: Type-safe validation functions
 * - Transformers: Value transformation pipelines
 * - Error Handlers: Centralized error management
 * - Configuration: Builder and simple option interfaces
 *
 * @example Core Types Usage
 * ```typescript
 * // Signal creation with validation and transformation
 * const signal = createSignal<number>(0, {
 *   validator: (n) => n >= 0,
 *   transform: Math.round,
 *   onError: console.error
 * });
 * ```
 */

/**
 * Function type for validating signal values
 * @typeParam T - The type of value being validated
 * @param value - The value to validate
 * @returns boolean - True if valid, false otherwise
 *
 * @remarks
 * Validators are pure functions that check value constraints.
 * Multiple validators can be chained, all must pass for validity.
 *
 * @example
 * ```typescript
 * // Simple number range validator
 * const numberValidator: Validator<number> = (value) => value >= 0;
 *
 * // Complex object validator
 * const userValidator: Validator<User> = (user) =>
 *   user.name.length > 0 && user.age >= 18;
 * ```
 */
export type Validator<T> = (value: T) => boolean;

/**
 * Function type for transforming signal values
 * @typeParam T - The type of value being transformed
 * @param value - The value to transform
 * @returns T - The transformed value
 *
 * @remarks
 * Transformers modify values before storage.
 * They run before validation and must maintain type consistency.
 * Multiple transforms can be chained in sequence.
 *
 * @example
 * ```typescript
 * // Basic value transformation
 * const roundNumber: Transform<number> = (value) => Math.round(value);
 *
 * // Complex object transformation
 * const normalizeUser: Transform<User> = (user) => ({
 *   ...user,
 *   name: user.name.trim().toLowerCase(),
 *   age: Math.floor(user.age)
 * });
 * ```
 */
export type Transform<T> = (value: T) => T;

/**
 * Function type for handling signal errors
 * @param error - The error to handle
 *
 * @remarks
 * Error handlers centralize error management.
 * They can be used for logging, user notification, or recovery.
 * Multiple handlers can be registered for different purposes.
 *
 * @example
 * ```typescript
 * // Basic error logging
 * const logError: ErrorHandler = (error) =>
 *   console.error('Signal error:', error);
 *
 * // User notification with recovery
 * const handleError: ErrorHandler = (error) => {
 *   alert(error.message);
 *   signal.reset();
 * };
 * ```
 */
export type ErrorHandler = (error: Error) => void;

/**
 * Configuration options for building enhanced signals
 * @typeParam T - The type of value stored in the signal
 *
 * @remarks
 * Core configuration interface for signal creation.
 * Provides comprehensive options for:
 * - Initial and default values
 * - Validation and transformation
 * - Persistence and history
 * - Error handling and cleanup
 *
 * All validation functions must pass for validity.
 * Transform functions are applied in sequence.
 * Error handlers are called in registration order.
 *
 * @example
 * ```typescript
 * // Basic configuration
 * const options: BuilderOptions<number> = {
 *   initialValue: 0,
 *   validators: [(n) => n >= 0],
 *   transform: Math.round
 * };
 *
 * // Advanced configuration
 * const options: BuilderOptions<User> = {
 *   initialValue: defaultUser,
 *   validators: [validateAge, validateEmail],
 *   transform: normalizeUser,
 *   persist: true,
 *   storageKey: 'current-user',
 *   enableHistory: true,
 *   onError: handleUserError
 * };
 * ```
 */
export interface BuilderOptions<T> {
  /** Initial value for the signal. Required and must be of type T */
  initialValue: T;
  /** Default value to reset to. If not provided, initialValue is used */
  defaultValue?: T;
  /** Key for persistent storage. Required if persist is true */
  storageKey?: string;
  /** Enable persistent storage. Requires storageKey if true */
  persist?: boolean;
  /** Array of validation functions. All must return true for valid state */
  validators?: Validator<T>[];
  /** Array of async validation functions with debouncing and cancellation */
  asyncValidators?: AsyncValidator<T>[];
  /** Transform function for processing values. Applied before validation */
  transform?: Transform<T>;
  /** Array of transform functions. Applied in sequence before validation */
  transforms?: Transform<T>[];
  /** Debounce time in milliseconds. Must be >= 0 if provided */
  debounceTime?: number;
  /** Skip duplicate values. Uses strict equality comparison */
  distinctUntilChanged?: boolean;
  /** Enable undo/redo history. Requires more memory when true */
  enableHistory?: boolean;
  /** Maximum size of history stack. Defaults to unlimited if not specified */
  historySize?: number;
  /** Enable automatic resource cleanup on destroy */
  autoCleanup?: boolean;
  /** Primary error handler function. Called first on errors */
  onError?: ErrorHandler;
  /** Additional error handlers. Called after primary handler */
  errorHandlers?: ErrorHandler[];
  /** Enable history persistence. Requires enableHistory to be true */
  persistHistory?: boolean;
}

/**
 * Configuration options for creating signals
 * @typeParam T - The type of value stored in the signal
 */
export interface SignalOptions<T> {
  /** Initial value for the signal */
  initialValue: T;
  /** Key for persistent storage */
  storageKey?: string;
  /** Enable persistent storage */
  persist?: boolean;
  /** Array of validation functions */
  validators?: ((value: T) => boolean)[];
  /** Transform function for processing values */
  transform?: (value: T) => T;
  /** Debounce time in milliseconds */
  debounceTime?: number;
  /** Skip duplicate values */
  distinctUntilChanged?: boolean;
}

/**
 * Core interface representing an enhanced signal
 * @typeParam T - The type of value managed by the signal
 *
 * @remarks
 * Extends Angular's signal functionality with:
 * - Value tracking and validation
 * - History management (undo/redo)
 * - Transformation pipeline
 * - Subscription system
 * - Error handling
 *
 * @example
 * ```typescript
 * // Basic signal usage
 * const counter = createSignal<number>(0);
 * counter.set(5);
 * counter.update(n => n + 1);
 *
 * // Advanced features
 * counter.subscribe(value => console.log(value));
 * counter.pipe(
 *   map(n => n * 2),
 *   filter(n => n > 0)
 * );
 * if (!counter.isValid()) counter.reset();
 * ```
 */
export interface SignalPlus<T> {
  /** Current value of the signal. Updates trigger reactivity */
  value: T;

  /** Previous value of the signal. Useful for change detection */
  previousValue: T;

  /** Initial value of the signal. Used for reset operations */
  initialValue: T;

  /** Read-only signal for reactive computations */
  signal: Signal<T>;

  /** Writable signal for direct value manipulation */
  writable: WritableSignal<T>;

  /**
   * Sets a new value directly
   * @param value - The new value to set
   * @throws {Error} If validation fails
   * @remarks Value is transformed before validation
   */
  set(value: T): void;

  /**
   * Sets a new value directly (alias for set)
   * @param value - The new value to set
   * @throws {Error} If validation fails
   * @remarks Value is transformed before validation
   */
  setValue(value: T): void;

  /**
   * Updates value using a transform function
   * @param fn - Function that receives current value and returns new value
   * @throws {Error} If validation fails
   * @remarks Transform is applied before validation
   */
  update(fn: (current: T) => T): void;

  /**
   * Resets to initial or default value
   * @remarks Clears history if history tracking is enabled
   */
  reset(): void;

  /**
   * Runs all validators and returns result
   * @returns boolean indicating if all validators passed
   */
  validate(): boolean;

  /** Signal indicating if all validators are passing */
  isValid: Signal<boolean>;

  /** Signal indicating if async validation is in progress */
  isValidating: Signal<boolean>;

  /** Signal containing async validation errors */
  asyncErrors: Signal<string[]>;

  /** Signal indicating if current value differs from initial value */
  isDirty: Signal<boolean>;

  /** Signal indicating if value has changed since last update */
  hasChanged: Signal<boolean>;

  /** Signal containing value history if history is enabled */
  history: Signal<T[]>;

  /**
   * Reverts to previous value
   * @throws {Error} If no history or at start of history
   */
  undo(): void;

  /**
   * Restores previously undone value
   * @throws {Error} If no future values available
   */
  redo(): void;

  /**
   * Subscribes to value changes
   *
   * @param callback - Function called with new value on changes
   * @returns Cleanup function to unsubscribe
   *
   * @remarks
   * **Automatic Cleanup:** When the last subscriber unsubscribes, the signal automatically:
   * - Removes storage event listeners (for `localStorage` synchronization)
   * - Clears debounce/throttle timers
   * - Cleans up pending operations
   *
   * **Re-subscription:** After automatic cleanup, you can subscribe again and the signal
   * will reinitialize its resources as needed.
   *
   * **Manual Cleanup:** For explicit cleanup regardless of subscriber count, use `destroy()`.
   *
   * @example
   * ```typescript
   * // Basic subscription
   * const signal = sp(0).persist('counter').build();
   * const unsubscribe = signal.subscribe(value => console.log(value));
   *
   * // Clean up when done
   * unsubscribe(); // Automatically cleans up if this was the last subscriber
   *
   * // Can re-subscribe later
   * signal.subscribe(value => console.log('New:', value));
   * ```
   */
  subscribe(callback: (value: T) => void): () => void;

  /**
   * Applies transformation operators
   * @param operators - Signal operators to apply
   * @returns New SignalPlus instance with transformed value
   * @example
   * ```typescript
   * signal.pipe(
   *   map(x => x * 2),
   *   filter(x => x > 0)
   * )
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe<R>(...operators: any[]): SignalPlus<R>;

  /**
   * Explicitly destroys the signal and cleans up all resources
   *
   * @remarks
   * This method should be called when you're done with a signal to ensure:
   * - Storage event listeners are removed
   * - Pending debounce timers are cleared
   * - Subscribers are notified (optional)
   * - Memory is freed
   *
   * Note: After calling destroy(), the signal should not be used anymore.
   *
   * @example
   * ```typescript
   * const signal = new SignalBuilder(0)
   *   .persist('key')
   *   .debounce(300)
   *   .build();
   *
   * // Use the signal...
   * signal.setValue(42);
   *
   * // When done, clean up
   * signal.destroy();
   * ```
   */
  destroy(): void;

  /**
   * @internal
   * Clears any pending debounce operations without destroying the signal
   * Used internally by transaction rollback mechanism
   */
  _clearPendingOperations?(): void;

  /**
   * @internal
   * Sets value immediately bypassing debounce, validation, and normal flow
   * Used internally by transaction rollback to restore state quickly
   * @param value - The value to set
   */
  _setValueImmediate?(value: T): void;

  /**
   * @internal
   * Directly sets the history array without side effects
   * Used internally by transaction rollback to restore history state
   * @param historyArray - The history array to set
   */
  _setHistoryImmediate?(historyArray: T[]): void;
}

/**
 * Interface representing signal history state
 * @typeParam T - The type of value stored in history
 *
 * @remarks
 * Manages undo/redo state with three arrays:
 * - past: Previous values in chronological order
 * - present: Current active value
 * - future: Values available for redo
 *
 * History operations maintain value integrity
 * and handle type safety automatically.
 *
 * @example
 * ```typescript
 * const history: SignalHistory<number> = {
 *   past: [1, 2, 3],    // Previous values
 *   present: 4,         // Current value
 *   future: [5, 6]      // Redoable values
 * };
 * ```
 */
export interface SignalHistory<T> {
  /** Previous values in chronological order */
  past: T[];
  /** Current value being displayed/used */
  present: T;
  /** Values that were undone and can be redone */
  future: T[];
}

/**
 * Interface representing signal's internal state
 *
 * @remarks
 * Tracks operational status and error conditions:
 * - loading: Async operation in progress
 * - error: Current error state if any
 * - timestamp: Last update time
 *
 * Used for UI feedback and error handling.
 *
 * @example
 * ```typescript
 * const state: SignalState = {
 *   loading: false,
 *   error: null,
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface SignalState {
  /** Indicates if signal is processing an async operation */
  loading: boolean;
  /** Current error state, null if no error */
  error: Error | null;
  /** Timestamp of last update in milliseconds */
  timestamp: number;
}

/**
 * Simplified configuration options for basic signal creation
 * @typeParam T - The type of value stored in the signal
 * @remarks
 * Provides a simpler interface compared to BuilderOptions
 * for common use cases that don't need advanced features
 *
 * @example
 * ```typescript
 * const options: SimpleSignalOptions<string> = {
 *   key: 'username',
 *   validator: (value) => value.length >= 3,
 *   debounce: 300,
 *   history: true
 * };
 * ```
 */
export interface SimpleSignalOptions<T> {
  /** Storage key for persistence. Required for persistent signals */
  key?: string;
  /** Single validation function. For multiple validators, use BuilderOptions */
  validator?: (value: T) => boolean;
  /** Debounce time in milliseconds. Must be >= 0 if provided */
  debounce?: number;
  /** Error handler function. Called when validation or updates fail */
  onError?: (error: Error) => void;
  /** Enable history tracking for undo/redo operations */
  history?: boolean;
}

/**
 * Configuration for error handling with fallback value
 * @typeParam T - The type of value for the fallback
 * @remarks
 * Used to define how errors should be handled and what value
 * should be used when an error occurs
 *
 * @example
 * ```typescript
 * const errorBoundary: ErrorBoundary<number> = {
 *   fallback: 0,
 *   onError: (error) => console.error('Signal error:', error)
 * };
 * ```
 */
export interface ErrorBoundary<T> {
  /** Fallback value to use when an error occurs */
  fallback: T;
  /** Optional error handler for custom error handling */
  onError?: (error: Error) => void;
}

/**
 * Configuration options for counter preset
 * @remarks
 * Used to create a number signal with increment/decrement operations
 * and optional bounds checking
 *
 * @example
 * ```typescript
 * const config: CounterConfig = {
 *   initial: 0,
 *   min: 0,
 *   max: 100
 * };
 * ```
 */
export interface CounterConfig {
  /** Initial counter value. Defaults to 0 */
  initial?: number;
  /** Minimum allowed value. No minimum if undefined */
  min?: number;
  /** Maximum allowed value. No maximum if undefined */
  max?: number;
}

/**
 * Configuration options for form input preset
 * @typeParam T - The type of form value
 *
 * @remarks
 * Specialized configuration for form inputs:
 * - Initial value setup
 * - Input validation
 * - Debounce control
 * - Persistence options
 *
 * @example
 * ```typescript
 * const config: FormConfig<string> = {
 *   initial: '',
 *   validator: (value) => value.length >= 3,
 *   debounce: 300,
 *   key: 'username'
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FormConfig<T = any> {
  /** Initial form value */
  initial: T;
  /** Validation function for form value */
  validator?: (value: T) => boolean;
  /** Debounce time in milliseconds */
  debounce?: number;
  /** Storage key for persistence */
  key?: string;
}
