import {
    computed,
    effect,
    Signal,
    signal,
    untracked,
    WritableSignal,
} from '@angular/core';
import { ReadonlySignalPlus } from '../models/signal-plus.model';
import {
    isBrowser,
    safeLocalStorageGet,
    safeLocalStorageSet,
} from './platform';

/**
 * Options for configuring a computed signal.
 */
export interface SpComputedOptions<T> {
    persist?: string;
    historySize?: number;
    validate?: (value: T) => boolean | string;
    transform?: (value: T) => T;
}

/**
 * Creates an enhanced computed signal that supports persistence, history, and validation.
 *
 * Unlike Angular's built-in `computed()`, `spComputed` returns a read-only SignalPlus shape
 * that allows persistence, history tracking, and validation for derived values.
 *
 * @template T - The type of the computed value
 * @param fn - A function that computes the value from source signals
 * @param options - Configuration options for persistence, history, and validation
 * @returns An enhanced signal with reactive updates from the computation
 *
 * @example
 * ```typescript
 * const firstName = signal('John');
 * const lastName = signal('Doe');
 *
 * const fullName = spComputed(
 *   () => `${firstName()} ${lastName()}`,
 *   { persist: 'user-fullname', historySize: 5 }
 * );
 *
 * fullName.value; // 'John Doe'
 * firstName.set('Jane');
 * fullName.value; // 'Jane Doe'
 * fullName.undo(); // 'John Doe'
 * ```
 */
export function spComputed<T>(
    fn: () => T,
    options: SpComputedOptions<T> = {},
): ReadonlySignalPlus<T> {
    const { persist, historySize = 10, validate, transform } = options;

    const applyTransform = (value: T): T =>
        transform ? transform(value) : value;

    const initialValue = applyTransform(fn());
    const internalSignal: WritableSignal<T> = signal<T>(initialValue);
    const historySignal: WritableSignal<T[]> = signal<T[]>([initialValue]);
    const redoStackSignal: WritableSignal<T[]> = signal<T[]>([]);

    let previousValue: T = initialValue;
    const storedInitialValue: T = initialValue;

    if (persist && isBrowser()) {
        const stored = safeLocalStorageGet(persist);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                internalSignal.set(parsed);
                previousValue = parsed;
            } catch {
                // Ignore parsing errors
            }
        }
    }

    effect(() => {
        const newValue = applyTransform(fn());

        untracked(() => {
            const currentValue = internalSignal();

            if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
                previousValue = currentValue;
                internalSignal.set(newValue);

                const currentHistory = historySignal();
                const newHistory = [...currentHistory, newValue].slice(-historySize);
                historySignal.set(newHistory);
                redoStackSignal.set([]);

                if (persist && isBrowser()) {
                    safeLocalStorageSet(persist, JSON.stringify(newValue));
                }
            }
        });
    });

    const undo = (): void => {
        const currentHistory = historySignal();
        if (currentHistory.length <= 1) return;

        const newHistory = currentHistory.slice(0, -1);
        const previousVal = newHistory[newHistory.length - 1];
        const currentVal = internalSignal();

        redoStackSignal.update((stack) => [...stack, currentVal]);
        historySignal.set(newHistory);
        previousValue = internalSignal();
        internalSignal.set(previousVal);

        if (persist && isBrowser()) {
            safeLocalStorageSet(persist, JSON.stringify(previousVal));
        }
    };

    const redo = (): void => {
        const redoStack = redoStackSignal();
        if (redoStack.length === 0) return;

        const valueToRedo = redoStack[redoStack.length - 1];
        redoStackSignal.update((stack) => stack.slice(0, -1));

        previousValue = internalSignal();
        internalSignal.set(valueToRedo);
        historySignal.update((h) => [...h, valueToRedo]);

        if (persist && isBrowser()) {
            safeLocalStorageSet(persist, JSON.stringify(valueToRedo));
        }
    };

    const getValidationErrors = (value: T): string[] => {
        if (!validate) {
            return [];
        }

        const result = validate(value);
        if (result === true) {
            return [];
        }

        return typeof result === 'string' ? [result] : ['Validation failed'];
    };

    const isValidSignal: Signal<boolean> = computed(() => {
        return getValidationErrors(internalSignal()).length === 0;
    });

    const isDirtySignal: Signal<boolean> = computed(() => {
        return (
            JSON.stringify(internalSignal()) !== JSON.stringify(storedInitialValue)
        );
    });

    const hasChangedSignal: Signal<boolean> = computed(() => {
        return JSON.stringify(internalSignal()) !== JSON.stringify(previousValue);
    });

    return {
        get value() {
            return internalSignal();
        },
        get previousValue() {
            return previousValue;
        },
        get initialValue() {
            return storedInitialValue;
        },
        signal: computed(() => internalSignal()),
        writable: internalSignal,
        validate: () => {
            return getValidationErrors(internalSignal()).length === 0;
        },
        isValid: isValidSignal,
        errors: computed(() => getValidationErrors(internalSignal())),
        isValidating: computed(() => false),
        asyncErrors: computed(() => []),
        isDirty: isDirtySignal,
        hasChanged: hasChangedSignal,
        history: computed(() => historySignal()),
        undo,
        redo,
        subscribe: (callback: (value: T) => void) => {
            const effectRef = effect(() => {
                callback(internalSignal());
            });
            return () => effectRef.destroy();
        },
        destroy: () => {
            historySignal.set([]);
            redoStackSignal.set([]);
        },
    };
}
