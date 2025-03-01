/**
 * @fileoverview Predefined signal configurations for common use cases
 * @description
 * This module provides a collection of ready-to-use signal patterns with
 * appropriate defaults and configurations. Each preset is optimized for
 * specific use cases and follows best practices for state management.
 * 
 * Available Presets:
 * - counter: Numeric counter with validation and history
 * - toggle: Boolean state with history tracking
 * - formInput: Form field with validation and persistence
 * 
 * Features included in presets:
 * - Type-safe configurations
 * - Validation rules
 * - History tracking
 * - Persistence options
 * - Performance optimizations
 * 
 * @example Counter Usage
 * ```typescript
 * const counter = signalPlus.presets.counter({ 
 *   initial: 0,
 *   min: 0,
 *   max: 100
 * });
 * counter.value++; // Validates and tracks history
 * counter.undo();  // Reverts to previous value
 * ```
 * 
 * @example Form Input Usage
 * ```typescript
 * const username = signalPlus.presets.formInput({
 *   initial: '',
 *   key: 'username',
 *   validator: value => value.length >= 3,
 *   debounce: 300
 * });
 * 
 * username.subscribe(value => {
 *   validateForm();
 *   saveProgress();
 * });
 * ```
 */

import { SignalBuilder } from '../core/signal-builder';
import { CounterConfig, FormConfig } from '../models/signal-plus.model';

/**
 * Collection of predefined signal configurations
 * 
 * @remarks
 * Each preset is carefully designed to handle specific use cases
 * with appropriate defaults and configurations. They encapsulate
 * common patterns and best practices for state management.
 * 
 * Common features across presets:
 * - Type safety with generics
 * - Automatic cleanup
 * - Error handling
 * - Change detection optimization
 */
export const presets = {
    /**
     * Creates a number counter with validation and history
     * 
     * @param config Configuration options for the counter
     * @returns SignalBuilder configured for counter operations
     * 
     * @remarks
     * The counter preset provides:
     * - Integer validation
     * - Optional min/max bounds
     * - History tracking
     * - Type coercion
     * 
     * Use this preset when you need:
     * - Numeric value tracking
     * - Increment/decrement operations
     * - Range validation
     * - Undo/redo support
     * 
     * @example Basic Counter
     * ```typescript
     * const counter = signalPlus.presets.counter();
     * counter.value++; // Validates and tracks
     * counter.undo();  // Reverts increment
     * ```
     * 
     * @example Bounded Counter
     * ```typescript
     * const score = signalPlus.presets.counter({
     *   initial: 0,
     *   min: 0,
     *   max: 100
     * });
     * 
     * score.update(v => v + 10); // Validates range
     * ```
     */
    counter: (config?: CounterConfig): SignalBuilder<number> => {
        const builder = new SignalBuilder(config?.initial ?? 0);
        builder.validate(x => Number.isInteger(x));
        if (typeof config?.min === 'number') {
            builder.validate(x => x >= config.min!);
        }
        if (typeof config?.max === 'number') {
            builder.validate(x => x <= config.max!);
        }
        return builder.withHistory();
    },

    /**
     * Creates a boolean toggle with history tracking
     * 
     * @param initial Initial toggle state
     * @returns SignalBuilder configured for toggle operations
     * 
     * @remarks
     * The toggle preset provides:
     * - Boolean state management
     * - History tracking
     * - Type safety
     * - Easy toggling
     * 
     * Use this preset when you need:
     * - On/off states
     * - Feature flags
     * - UI toggles
     * - Undo/redo support
     * 
     * @example Basic Toggle
     * ```typescript
     * const darkMode = signalPlus.presets.toggle(false);
     * darkMode.update(v => !v); // Toggles and tracks
     * ```
     * 
     * @example Persistent Toggle
     * ```typescript
     * const theme = signalPlus.presets.toggle(false)
     *   .persist('theme-mode')
     *   .build();
     * 
     * theme.subscribe(dark => {
     *   document.body.classList.toggle('dark', dark);
     * });
     * ```
     */
    toggle: (initial = false): SignalBuilder<boolean> => {
        return new SignalBuilder(initial)
            .withHistory();
    },

    /**
     * Creates a form input with validation and features
     * 
     * @template T Type of form value
     * @param options Form input configuration
     * @returns SignalBuilder configured for form handling
     * 
     * @remarks
     * The form input preset provides:
     * - Value validation
     * - Persistence
     * - Debounced updates
     * - History tracking
     * - Error handling
     * 
     * Use this preset when you need:
     * - Form field state
     * - Input validation
     * - Auto-save
     * - Undo/redo
     * 
     * @example Text Input
     * ```typescript
     * const username = signalPlus.presets.formInput({
     *   initial: '',
     *   key: 'username',
     *   validator: value => value.length >= 3,
     *   debounce: 300
     * });
     * ```
     * 
     * @example Number Input
     * ```typescript
     * const age = signalPlus.presets.formInput({
     *   initial: 0,
     *   validator: value => value >= 0 && value <= 120,
     *   debounce: 500
     * });
     * 
     * age.subscribe(value => {
     *   if (age.isValid()) {
     *     updateProfile({ age: value });
     *   }
     * });
     * ```
     */
    formInput: <T>(options: FormConfig<T>): SignalBuilder<T> => {
        const builder = new SignalBuilder(options.initial);
        if (options.validator) {
            builder.validate(options.validator);
        }
        if (options.debounce) {
            builder.debounce(options.debounce);
        }
        if (options.key) {
            builder.persist(options.key);
        }
        return builder.withHistory();
    },

    /**
     * Creates a search input with built-in debounce and duplicate filtering.
     * Optimized for search field behavior with automatic performance tuning.
     * 
     * @param initial - Initial search text (defaults to empty string)
     * @returns SignalPlus<string> configured for search operations
     * 
     * @example
     * ```typescript
     * const search = signalPlus.presets.searchField();
     * search.subscribe(value => performSearch(value));
     * ```
     */
    searchField: (initial = ''): SignalBuilder<string> => {
        return new SignalBuilder(initial)
            .debounce(300)
            .distinct()
            .withHistory();
    },

    /**
     * Creates a persistent toggle with automatic storage and history.
     * Perfect for app-wide settings that need to persist across sessions.
     * 
     * @param initial - Initial toggle state (defaults to false)
     * @param key - Storage key for persistence
     * @returns SignalPlus<boolean> configured for persistent toggle operations
     * 
     * @example
     * ```typescript
     * const theme = signalPlus.presets.persistentToggle(false, 'theme-mode');
     * theme.subscribe(isDark => updateTheme(isDark));
     * ```
     */
    persistentToggle: (initial = false, key: string): SignalBuilder<boolean> => {
        return new SignalBuilder(initial)
            .persist(key)
            .withHistory();
    }
};

/**
 * Collection of commonly used validation functions organized by data type.
 * These validators can be composed and reused across different signals.
 * 
 * @example
 * ```typescript
 * const amount = signalPlus.create(0)
 *   .validate(validators.number.positive)
 *   .validate(validators.number.range(0, 100))
 *   .build();
 * ```
 */
export const validators = {
    number: {
        /** Ensures value is greater than or equal to zero */
        positive: (x: number) => x >= 0,
        /** Ensures value is an integer */
        integer: (x: number) => Number.isInteger(x),
        /** Creates a validator for checking if value is within specified range */
        range: (min: number, max: number) => (x: number) => x >= min && x <= max
    },
    string: {
        /** Ensures string is not empty */
        notEmpty: (x: string) => x.length > 0,
        /** Creates a validator for checking maximum string length */
        maxLength: (max: number) => (x: string) => x.length <= max,
        /** Creates a validator for matching string against a pattern */
        pattern: (regex: RegExp) => (x: string) => regex.test(x)
    },
    array: {
        /** Ensures array is not empty */
        notEmpty: <T>(x: T[]) => x.length > 0,
        /** Creates a validator for checking maximum array length */
        maxLength: (max: number) => <T>(x: T[]) => x.length <= max
    }
};