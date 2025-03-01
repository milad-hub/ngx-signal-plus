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

import { computed } from '@angular/core';
import { SignalBuilder } from '../core/signal-builder';
import { FormNumberOptions, FormTextOptions } from '../models/form.model';

/**
 * Core signal creation functions with simplified presets
 */

// Simple creation function
export function sp<T>(initialValue: T): SignalBuilder<T> {
    if (initialValue === undefined) {
        throw new Error('Initial value cannot be undefined');
    }
    return new SignalBuilder<T>(initialValue);
}

// Simplified counter preset
export const spCounter = (initial = 0, options?: Partial<{ max: number, min: number }>) =>
    sp(initial)
        .validate(n => options?.min === undefined || n >= options.min)
        .validate(n => options?.max === undefined || n <= options.max)
        .withHistory()
        .build();

// Simplified form presets
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

// Simplified toggle preset
export const spToggle = (initial = false, key?: string) => {
    const signal = sp(initial)
        .withHistory(false);  // Enable history tracking but don't persist it

    // Enable persistence if key is provided
    if (key) {
        signal.persist(key);
        // Store initial value
        try {
            localStorage.setItem(key, JSON.stringify({ value: initial }));
        } catch (error) {
            // Ignore storage errors
        }

        // Override updateValue to store in correct format
        const instance = signal.build();
        const originalSetValue = instance.setValue;
        instance.setValue = (value: boolean) => {
            originalSetValue(value);
            try {
                localStorage.setItem(key, JSON.stringify({ value }));
            } catch (error) {
                // Ignore storage errors
            }
        };
        return instance;
    }

    return signal.build();
}; 