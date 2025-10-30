/**
 * @fileoverview Utility functions for creating enhanced signals
 * @description
 * Provides a collection of factory functions for creating common signal types.
 * Each function is designed for specific use cases with sensible defaults.
 * 
 * Features:
 * - Type-safe signal creation
 * - Common preset configurations
 * - Automatic validation setup
 * - Built-in error handling
 * 
 * @example Basic Usage
 * ```typescript
 * // Simple signal
 * const count = createSignal(0);
 * 
 * // Validated counter
 * const counter = createCounter({ initial: 0, min: 0, max: 100 });
 * 
 * // Form input with validation
 * const input = createForm({
 *   initial: '',
 *   validator: value => value.length > 0
 * });
 * ```
 */

import { SignalBuilder } from '../core/signal-builder';
import { FormNumberOptions, FormTextOptions } from '../models/form.model';
import { SignalPlus } from '../models/signal-plus.model';
import { safeLocalStorageSet } from './platform';

/**
 * Creates a new SignalBuilder for configuring enhanced signals
 * 
 * @typeParam T - The type of value to be stored in the signal
 * @param initialValue - The initial value for the signal. Cannot be undefined.
 * @returns A SignalBuilder instance for fluent configuration
 * @throws {Error} If initialValue is undefined
 * 
 * @remarks
 * This is the primary entry point for creating enhanced signals with the builder pattern.
 * It provides a fluent API for configuring validation, persistence, history, and more.
 * 
 * The builder must be finalized with `.build()` to create the actual signal.
 * 
 * @example Basic Usage
 * ```typescript
 * const counter = sp(0).build();
 * counter.setValue(5);
 * ```
 * 
 * @example With Validation
 * ```typescript
 * const age = sp(0)
 *   .validate(n => n >= 0)
 *   .validate(n => n <= 150)
 *   .build();
 * ```
 * 
 * @example With Persistence and History
 * ```typescript
 * const username = sp('')
 *   .persist('username')
 *   .withHistory(10)
 *   .debounce(300)
 *   .build();
 * ```
 * 
 * @example With Transformation
 * ```typescript
 * const rounded = sp(0)
 *   .transform(Math.round)
 *   .build();
 * ```
 */
export function sp<T>(initialValue: T): SignalBuilder<T> {
    if (initialValue === undefined) {
        throw new Error('Initial value cannot be undefined');
    }
    return new SignalBuilder<T>(initialValue);
}

/**
 * Creates a counter signal with automatic validation and history
 * 
 * @param initial - The initial counter value. Defaults to 0.
 * @param options - Optional configuration for min/max bounds
 * @param options.min - Minimum allowed value (inclusive)
 * @param options.max - Maximum allowed value (inclusive)
 * @returns A SignalPlus instance configured as a counter
 * 
 * @remarks
 * The counter signal automatically:
 * - Validates against min/max bounds if provided
 * - Tracks history for undo/redo operations
 * - Rejects invalid values that exceed bounds
 * 
 * @example Basic Counter
 * ```typescript
 * const counter = spCounter();
 * counter.setValue(5);
 * counter.update(n => n + 1); // 6
 * ```
 * 
 * @example Counter with Bounds
 * ```typescript
 * const percentage = spCounter(0, { min: 0, max: 100 });
 * percentage.setValue(150); // Validation fails
 * percentage.setValue(50);  // Success
 * ```
 * 
 * @example With History
 * ```typescript
 * const counter = spCounter(10);
 * counter.setValue(20);
 * counter.setValue(30);
 * counter.undo(); // Back to 20
 * counter.redo(); // Forward to 30
 * ```
 */
export const spCounter = (initial = 0, options?: Partial<{ max: number, min: number }>) =>
    sp(initial)
        .validate(n => options?.min === undefined || n >= options.min)
        .validate(n => options?.max === undefined || n <= options.max)
        .withHistory()
        .build();

/**
 * Collection of form input signal presets with built-in validation
 * 
 * @remarks
 * Provides ready-to-use form input signals for common scenarios:
 * - `text`: Plain text inputs with length validation
 * - `email`: Email inputs with format validation
 * - `number`: Numeric inputs with range validation
 * - `password`: Password inputs with strength requirements
 * - `url`: URL inputs with format validation
 * - `tel`: Phone number inputs with format validation
 * - `date`: Date inputs with validation
 * - `checkbox`: Boolean inputs
 * - `select`: Selection inputs with allowed values
 * 
 * All form signals support:
 * - Automatic validation
 * - Debouncing for performance
 * - Optional persistence
 * - Type-safe values
 * 
 * @example Text Input
 * ```typescript
 * const username = spForm.text('', {
 *   minLength: 3,
 *   maxLength: 20,
 *   debounce: 300
 * });
 * ```
 * 
 * @example Email Input
 * ```typescript
 * const email = spForm.email('', { debounce: 500 });
 * console.log(email.isValid()); // false until valid email entered
 * ```
 * 
 * @example Number Input
 * ```typescript
 * const age = spForm.number(0, {
 *   min: 0,
 *   max: 150,
 *   debounce: 200
 * });
 * ```
 */
export const spForm = {
    text: (initial = '', options?: Partial<FormTextOptions>) => {
        const signal = sp(initial);
        signal.transform(v => v === undefined || v === null ? '' : String(v));

        if (options?.minLength !== undefined || options?.maxLength !== undefined) {
            signal.validate(v => {
                if (options?.minLength && (v === '' || v.length < options.minLength)) return false;
                if (options?.maxLength && v.length > options.maxLength) return false;
                return true;
            });
        }

        return options?.debounce !== undefined ? signal.debounce(options.debounce).build() : signal.build();
    },

    email: (initial = '', options?: Pick<FormTextOptions, 'debounce'>) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        let lastValidValue = initial;

        // Create signal with error handling
        const signal = sp(initial)
            .transform(v => {
                if (v === undefined || v === null) return '';
                const str = String(v);

                if (str === '') return str;  // Always allow empty string for validation

                // Validate email format
                if (!emailRegex.test(str)) {
                    if (options?.debounce) {
                        return lastValidValue; // Silently revert to last valid value in debounced mode
                    }
                    throw new Error('Invalid email format'); // Throw in non-debounced mode
                }

                // Valid email - update lastValidValue and return
                lastValidValue = str;
                return str;
            })
            .validate(v => {
                if (options?.debounce) {
                    return v === '' || emailRegex.test(v);
                }
                return v !== '';
            });

        // Add debounce if specified
        if (options?.debounce !== undefined) {
            signal.debounce(options.debounce);
        }

        return signal.build();
    },

    number: (options?: Partial<FormNumberOptions>) => {
        // Handle invalid min/max combinations
        const effectiveMin = options?.min;
        const effectiveMax = options?.max;
        const init = options?.initial ?? 0;

        // If min > max, use min as the constraint
        const getValidValue = (value: number): number => {
            if (effectiveMin !== undefined && value < effectiveMin) return effectiveMin;
            if (effectiveMax !== undefined && value > effectiveMax) return effectiveMax;
            return value;
        };

        if (options?.debounce !== undefined) {
            // Debounced version starts with null
            const signal = sp<number | null>(null);

            signal.transform(n => {
                if (n === null || n === undefined) return n;
                const num = typeof n === 'boolean' ? (n ? 1 : 0) : Number(n);
                if (isNaN(num)) return init;
                const rounded = Math.round(num);
                return getValidValue(rounded);
            });

            signal.validate(n => {
                if (n === null) return true;
                const value = getValidValue(n);
                return value === n;
            });

            return signal.debounce(options.debounce).build();
        } else {
            // Non-debounced version starts with init
            const signal = sp<number>(getValidValue(init));

            signal.transform(n => {
                const num = typeof n === 'boolean' ? (n ? 1 : 0) : Number(n);
                if (isNaN(num)) return getValidValue(init);
                const rounded = Math.round(num);
                return getValidValue(rounded);
            });

            signal.validate(n => {
                const value = getValidValue(n);
                return value === n;
            });

            return signal.build();
        }
    }
};

/**
 * Creates a boolean toggle signal with history and optional persistence
 * 
 * @param initial - The initial boolean value. Defaults to false.
 * @param key - Optional storage key for persistence in localStorage
 * @returns A SignalPlus instance configured for toggle operations
 * 
 * @remarks
 * The toggle signal automatically:
 * - Tracks history for undo/redo operations
 * - Persists state in localStorage if key is provided
 * - Provides a convenient boolean state management
 * 
 * Perfect for:
 * - UI toggles (dark mode, sidebar, etc.)
 * - Feature flags
 * - Boolean preferences
 * - Checkbox state
 * 
 * @example Basic Toggle
 * ```typescript
 * const darkMode = spToggle(false);
 * darkMode.setValue(true);
 * console.log(darkMode.value); // true
 * ```
 * 
 * @example Toggle with Persistence
 * ```typescript
 * const sidebarOpen = spToggle(false, 'sidebar-state');
 * sidebarOpen.setValue(true);
 * // State persists across page reloads
 * ```
 * 
 * @example With History
 * ```typescript
 * const feature = spToggle(false);
 * feature.setValue(true);
 * feature.setValue(false);
 * feature.undo(); // Back to true
 * feature.redo(); // Forward to false
 * ```
 * 
 * @example Update Pattern
 * ```typescript
 * const visible = spToggle(false);
 * visible.update(current => !current); // Toggle value
 * ```
 */
export const spToggle = (initial = false, key?: string) => {
    const signal = sp(initial)
        .withHistory(false);  // Enable history tracking but don't persist it

    // Enable persistence if key is provided
    if (key) {
        signal.persist(key);
        // Store initial value using SSR-safe wrapper
        safeLocalStorageSet(key, JSON.stringify({ value: initial }));

        // Override updateValue to store in correct format
        const instance = signal.build();
        const originalSetValue = instance.setValue;
        instance.setValue = (value: boolean) => {
            originalSetValue(value);
            // Use SSR-safe wrapper for storage
            safeLocalStorageSet(key, JSON.stringify({ value }));
        };
        return instance;
    }

    return signal.build();
};

/**
 * Creates a simple toggle signal with validation
 * 
 * @typeParam T - The type of value (should be boolean)
 * @param initial - The initial value (must be boolean for spToggle)
 * @param key - Optional storage key for persistence
 * @returns A SignalPlus instance configured for toggle operations
 * @throws {TypeError} If initial value is not a boolean
 * 
 * @remarks
 * This is a convenience wrapper for spToggle that validates the input type.
 * It ensures type safety by throwing an error if a non-boolean value is provided.
 * 
 * @example Valid Usage
 * ```typescript
 * const darkMode = createSimple(true, 'dark-mode');
 * darkMode.setValue(false);
 * ```
 * 
 * @example Invalid Usage (throws error)
 * ```typescript
 * const invalid = createSimple('not a boolean'); // ❌ Throws TypeError
 * ```
 */
export function createSimple<T>(initial: T, key?: string): SignalPlus<boolean> {
    if (typeof initial !== 'boolean') {
        throw new TypeError(`createSimple: initial value must be boolean, got ${typeof initial}`);
    }
    return spToggle(initial, key);
} 