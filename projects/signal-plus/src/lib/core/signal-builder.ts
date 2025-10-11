import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { BuilderOptions, ErrorHandler, SignalPlus, Transform, Validator } from '../models/signal-plus.model';
import {
    isBrowser,
    safeAddEventListener,
    safeClearTimeout,
    safeLocalStorageGet,
    safeLocalStorageSet,
    safeSetTimeout
} from '../utils/platform';

/**
 * @fileoverview Builder class for creating enhanced Angular signals
 * Provides a fluent API for configuring signals with features like:
 * - Validation and transformation
 * - History tracking and persistence
 * - Error handling and cleanup
 * 
 * @example
 * ```typescript
 * const signal = new SignalBuilder(0)
 *   .validate(x => x >= 0)
 *   .transform(Math.round)
 *   .build();
 * ```
 */

/**
 * Builder class for creating enhanced Angular signals.
 * Uses a fluent API pattern for configuring signal features.
 * @template T The type of value managed by the signal
 */
export class SignalBuilder<T> {
    private readonly options: BuilderOptions<T>;

    /**
     * Creates a new SignalBuilder instance
     * @param initialValue Initial value for the signal
     */
    constructor(initialValue: T) {
        this.options = {
            initialValue,
            defaultValue: initialValue,
            validators: [],
            transform: (value: T) => value,
            distinctUntilChanged: false,
            enableHistory: false,
            persistHistory: false,
            autoCleanup: true,
            errorHandlers: []
        };
    }

    /**
     * Adds a validator function to the signal
     * @param fn Function that validates the signal value
     * @returns Builder instance for chaining
     */
    validate(fn: Validator<T>): SignalBuilder<T> {
        if (!this.options.validators) {
            this.options.validators = [];
        }
        this.options.validators.push(fn);
        return this;
    }

    /**
     * Enables skipping duplicate values
     * @returns Builder instance for chaining
     */
    distinct(): SignalBuilder<T> {
        this.options.distinctUntilChanged = true;
        return this;
    }

    /**
     * Enables history tracking for undo/redo operations
     * @param sizeOrPersist Optional history size (number) or persist flag (boolean)
     * @returns Builder instance for chaining
     */
    withHistory(sizeOrPersist?: number | boolean): SignalBuilder<T> {
        this.options.enableHistory = true;

        if (typeof sizeOrPersist === 'number') {
            this.options.historySize = sizeOrPersist;
        } else if (typeof sizeOrPersist === 'boolean') {
            this.options.persistHistory = sizeOrPersist;
        }

        return this;
    }

    /**
     * Enables value persistence with optional storage key
     * @param key Optional storage key for persistence
     * @returns Builder instance for chaining
     */
    persist(key?: string): SignalBuilder<T> {
        this.options.storageKey = key;
        return this;
    }

    /**
     * Adds debounce time to value updates
     * @param ms Debounce time in milliseconds
     * @returns Builder instance for chaining
     */
    debounce(ms: number): SignalBuilder<T> {
        this.options.debounceTime = ms;
        return this;
    }

    /**
     * Adds an error handler for signal operations
     * @param handler Function to handle errors
     * @returns Builder instance for chaining
     */
    onError(handler: ErrorHandler): SignalBuilder<T> {
        if (!this.options.errorHandlers) {
            this.options.errorHandlers = [];
        }
        this.options.errorHandlers.push(handler);
        return this;
    }

    /**
     * Transforms signal value to a different type
     * @param fn Transform function from T to R
     * @returns New builder instance with type R
     */
    map<R>(fn: (value: T) => R): SignalBuilder<R> {
        const newBuilder = new SignalBuilder<R>(fn(this.options.initialValue));
        Object.assign(newBuilder.options, this.options);
        return newBuilder;
    }

    /**
     * Filters signal updates using a predicate
     * @param predicate Function that returns true to allow updates
     * @returns Builder instance for chaining
     */
    filter(predicate: (value: T) => boolean): SignalBuilder<T> {
        return this.transform((value: T) => {
            if (predicate(value)) {
                return value;
            }
            throw new Error('Filter failed');
        });
    }

    /**
     * Adds a transform function to the signal.
     * Transform functions are applied in the order they are added.
     * @param fn The transform function to add
     */
    transform(fn: Transform<T>): SignalBuilder<T> {
        // Initialize transforms array if needed
        if (!this.options.transforms) {
            this.options.transforms = [];
        }

        // Store the transform function
        this.options.transforms.push(fn);

        // Update the main transform function to apply all transforms in sequence
        this.options.transform = (value: T) => {
            // Apply each transform in sequence
            return this.options.transforms!.reduce((result: T, transform: Transform<T>) => {
                return transform(result);
            }, value);
        };

        return this;
    }

    /**
     * Creates a signal instance for testing
     * @param options Configuration with initial value
     * @returns SignalPlus instance for testing
     */
    static mock<T>(options: { initialValue: T }): SignalPlus<T> {
        return new SignalBuilder<T>(options.initialValue).build();
    }

    /**
     * Builds and returns the configured signal
     * @returns Enhanced signal instance
     */
    build(): SignalPlus<T> {
        // Get transform function
        const transform: Transform<T> = this.options.transform || ((value: T) => value);

        // Create signal with initial value (untransformed)
        const writable: WritableSignal<T> = signal<T>(structuredClone(this.options.initialValue));
        let previousValue: T = structuredClone(this.options.initialValue);
        let initialValue: T = structuredClone(this.options.initialValue);
        const history: WritableSignal<T[]> = signal([]);
        let debounceTimeout: number | undefined | null = null;
        let redoStack: T[] = [];
        let pendingValue: T | null = null;
        let isProcessingDebounce = false;
        let isProcessingStorage = false;

        /**
         * Helper function to enforce history size limit
         * @param histArray The history array to enforce size on
         * @returns The history array with size limit applied
         */
        const enforceHistorySize = (histArray: T[]): T[] => {
            if (this.options.historySize && histArray.length > this.options.historySize) {
                return histArray.slice(-this.options.historySize);
            }
            return histArray;
        };

        // Initialize history with initial value
        if (this.options.enableHistory) {
            history.set([structuredClone(initialValue)]);
        }

        // Load initial value from storage if available
        if (this.options.storageKey && isBrowser()) {
            try {
                const stored = safeLocalStorageGet(this.options.storageKey);
                if (stored) {
                    try {
                        let parsedValue: T;
                        let parsedHistory: T[] | undefined;

                        const parsedData = JSON.parse(stored);
                        if (parsedData && typeof parsedData === 'object' && 'value' in parsedData) {
                            parsedValue = parsedData.value;
                            parsedHistory = parsedData.history;
                        } else {
                            parsedValue = parsedData;
                        }

                        writable.set(parsedValue);
                        previousValue = parsedValue;
                        initialValue = parsedValue;

                        if (this.options.enableHistory && parsedHistory) {
                            history.set(enforceHistorySize(parsedHistory.map(v => structuredClone(v))));
                        } else if (this.options.enableHistory) {
                            history.set([structuredClone(parsedValue)]);
                        }
                    } catch (error) {
                        this.handleError(error as Error);
                    }
                }
            } catch (error) {
                this.handleError(error as Error);
            }
        }

        // Add storage event listener
        const handleStorageEvent = (event: StorageEvent) => {
            if (!isProcessingStorage && event.key === this.options.storageKey && event.newValue !== null) {
                try {
                    let parsedValue: T;
                    let parsedHistory: T[] | undefined;

                    const parsedData = JSON.parse(event.newValue);
                    if (parsedData && typeof parsedData === 'object' && 'value' in parsedData) {
                        parsedValue = parsedData.value;
                        parsedHistory = parsedData.history;
                    } else {
                        parsedValue = parsedData;
                    }

                    if (!isProcessingDebounce) {
                        writable.set(parsedValue);
                        previousValue = parsedValue;

                        if (this.options.enableHistory && parsedHistory) {
                            history.set(enforceHistorySize(parsedHistory.map(v => structuredClone(v))));
                        }

                        notifySubscribers(parsedValue);
                    }
                } catch (error) {
                    this.handleError(error as Error);
                }
            }
        };

        // Store cleanup callback for storage listener
        let storageListenerCleanup: (() => void) | undefined;

        if (this.options.storageKey && isBrowser()) {
            storageListenerCleanup = safeAddEventListener('storage', handleStorageEvent);
        }

        let nextSubId: number = 0;
        const subscribers = new Map<number, (value: T) => void>();
        let isCleanedUp = false;

        const notifySubscribers: (value: T) => void = (value: T) => {
            if (isCleanedUp) return;
            subscribers.forEach((callback: (value: T) => void) => {
                try {
                    callback(value);
                } catch (error) {
                    this.handleError(error as Error);
                }
            });
        };

        const subscribe: (callback: (value: T) => void) => () => void = (callback: (value: T) => void): () => void => {
            const subId: number = nextSubId++;
            subscribers.set(subId, callback);

            // Always notify with current value immediately
            try {
                callback(writable());
            } catch (error) {
                this.handleError(error as Error);
            }

            // Return cleanup function
            return () => {
                subscribers.delete(subId);
                if (subscribers.size === 0) {
                    // Cleanup storage event listener
                    if (storageListenerCleanup) {
                        storageListenerCleanup();
                        storageListenerCleanup = undefined;
                    }

                    // Clear any pending debounce timeout
                    if (debounceTimeout !== null) {
                        safeClearTimeout(debounceTimeout);
                        debounceTimeout = null;
                    }
                }
            };
        };

        const updateValue: (val: T, skipValidation?: boolean) => void = (val: T, skipValidation = false) => {
            try {
                // Apply transform first
                let transformedValue: T = val;
                if (transform) {
                    try {
                        transformedValue = transform(val);
                    } catch (error) {
                        this.handleError(error as Error);
                        throw error;
                    }
                }

                // Then validate the transformed value
                if (!skipValidation) {
                    const validators = this.options.validators as Validator<T>[];
                    if (validators.length > 0) {
                        // Check validators in sequence and stop on first failure
                        for (const validator of validators) {
                            try {
                                const result = validator(transformedValue);
                                if (!result) {
                                    const error = new Error('Validation failed');
                                    this.handleError(error);
                                    throw error;
                                }
                            } catch (error) {
                                this.handleError(error as Error);
                                throw error;
                            }
                        }
                    }
                }

                // Check if value is distinct
                const currentValueStr: string = JSON.stringify(writable());
                const newValueStr: string = JSON.stringify(transformedValue);
                const hasChanged: boolean = currentValueStr !== newValueStr;

                if (this.options.distinctUntilChanged && !hasChanged) {
                    return;
                }

                // Only update if value has changed
                if (hasChanged) {
                    previousValue = structuredClone(writable());
                    writable.set(transformedValue);

                    // Update history if enabled and value has changed
                    if (this.options.enableHistory && !isProcessingDebounce) {
                        // Clear redo stack when new value is set
                        redoStack = [];
                        const currentHistory: T[] = history();
                        const newHistory = [...currentHistory, structuredClone(transformedValue)];

                        // Enforce history size limit using helper function
                        history.set(enforceHistorySize(newHistory));
                    }

                    // Handle storage
                    if (this.options.storageKey && isBrowser()) {
                        try {
                            isProcessingStorage = true;
                            const shouldStoreHistory: boolean = Boolean(this.options.enableHistory && this.options.persistHistory);
                            const dataToStore: T | { value: T; history: T[] } = shouldStoreHistory
                                ? { value: transformedValue, history: history() }
                                : transformedValue;
                            try {
                                safeLocalStorageSet(this.options.storageKey, JSON.stringify(dataToStore));
                            } catch (error) {
                                if (error instanceof TypeError && error.message.includes('circular')) {
                                    // Handle circular references by storing only the value
                                    safeLocalStorageSet(this.options.storageKey, JSON.stringify(transformedValue));
                                } else {
                                    throw error;
                                }
                            }
                        } catch (error) {
                            this.handleError(error as Error);
                        } finally {
                            isProcessingStorage = false;
                        }
                    }

                    // Only notify subscribers if not cleaned up
                    if (!isCleanedUp) {
                        notifySubscribers(transformedValue);
                    }
                }
            } catch (error) {
                this.handleError(error as Error);
                throw error;
            }
        };

        // Set initial value without applying transforms
        writable.set(initialValue);

        const processValue: (value: T) => void = (value: T) => {
            // Prevent setValue after destroy
            if (isCleanedUp) {
                return;
            }

            // Clear existing debounce timeout
            if (debounceTimeout !== null) {
                safeClearTimeout(debounceTimeout);
                debounceTimeout = null;
            }

            try {
                // Handle debounce
                if (this.options.debounceTime && this.options.debounceTime > 0) {
                    isProcessingDebounce = true;
                    pendingValue = value;
                    debounceTimeout = safeSetTimeout(() => {
                        try {
                            const finalValue = pendingValue;
                            pendingValue = null;
                            isProcessingDebounce = false;

                            if (finalValue !== null) {
                                updateValue(finalValue);
                            }
                        } catch (error) {
                            this.handleError(error as Error);
                            throw error;
                        } finally {
                            debounceTimeout = null;
                            isProcessingDebounce = false;
                        }
                    }, this.options.debounceTime);
                } else {
                    updateValue(value);
                }
            } catch (error) {
                this.handleError(error as Error);
                throw error;
            }
        };

        const signalInstance: SignalPlus<T> = {
            get value() { return writable(); },
            get previousValue() { return previousValue; },
            get initialValue() { return initialValue; },
            signal: computed(() => writable()),
            writable,
            set: processValue,
            setValue: processValue,
            update: (fn: (current: T) => T) => {
                try {
                    const newValue: T = fn(writable());
                    processValue(newValue);
                } catch (error) {
                    this.handleError(error as Error);
                    throw error;
                }
            },
            reset: () => {
                try {
                    // Clear any pending debounce timeout to prevent race conditions
                    if (debounceTimeout !== null) {
                        safeClearTimeout(debounceTimeout);
                        debounceTimeout = null;
                        pendingValue = null;
                    }

                    // Reset to initial untransformed value and apply transform
                    const resetValue: T = this.options.defaultValue ?? this.options.initialValue;

                    // Clear history and redo stack
                    redoStack = [];
                    if (this.options.enableHistory) {
                        history.set([]);
                    }

                    // Process the reset value through normal update flow, but skip validation
                    try {
                        // Apply transform first
                        let transformedValue: T = resetValue;
                        if (transform) {
                            transformedValue = transform(resetValue);
                        }

                        // Update signal state
                        previousValue = structuredClone(writable());
                        writable.set(transformedValue);

                        // Update history
                        if (this.options.enableHistory) {
                            history.set([structuredClone(transformedValue)]);
                        }

                        // Handle storage
                        if (this.options.storageKey && isBrowser()) {
                            try {
                                isProcessingStorage = true;
                                const shouldStoreHistory: boolean = Boolean(this.options.enableHistory && this.options.persistHistory);
                                const dataToStore: T | { value: T; history: T[] } = shouldStoreHistory
                                    ? { value: transformedValue, history: [transformedValue] }
                                    : transformedValue;
                                try {
                                    safeLocalStorageSet(this.options.storageKey, JSON.stringify(dataToStore));
                                } catch (error) {
                                    if (error instanceof TypeError && error.message.includes('circular')) {
                                        // Handle circular references by storing only the value
                                        safeLocalStorageSet(this.options.storageKey, JSON.stringify(transformedValue));
                                    } else {
                                        throw error;
                                    }
                                }
                            } catch (error) {
                                this.handleError(error as Error);
                            } finally {
                                isProcessingStorage = false;
                            }
                        }

                        // Notify subscribers
                        notifySubscribers(transformedValue);
                    } catch (error) {
                        this.handleError(error as Error);
                        throw error;
                    }
                } catch (error) {
                    this.handleError(error as Error);
                    throw error;
                }
            },
            validate: () => {
                try {
                    const validators: Validator<T>[] = this.options.validators as Validator<T>[];
                    return validators.every((validator: Validator<T>) => {
                        try {
                            return validator(writable());
                        } catch (error) {
                            this.handleError(error as Error);
                            return false;
                        }
                    });
                } catch (error) {
                    this.handleError(error as Error);
                    return false;
                }
            },
            isValid: computed(() => {
                try {
                    const validators: Validator<T>[] = this.options.validators as Validator<T>[];
                    return validators.every((validator: Validator<T>) => {
                        try {
                            return validator(writable());
                        } catch (error) {
                            this.handleError(error as Error);
                            return false;
                        }
                    });
                } catch (error) {
                    this.handleError(error as Error);
                    return false;
                }
            }),
            isDirty: computed(() => JSON.stringify(writable()) !== JSON.stringify(initialValue)),
            hasChanged: computed(() => {
                const currentValue: string = JSON.stringify(writable());
                const prevValue: string = JSON.stringify(previousValue);
                return this.options.distinctUntilChanged ?
                    currentValue !== prevValue && currentValue !== JSON.stringify(writable()) :
                    currentValue !== prevValue;
            }),
            history: computed(() => this.options.enableHistory ? history() : []),
            undo: () => {
                if (!this.options.enableHistory || history().length <= 1) return;

                // Clear any pending debounce timeout to prevent race conditions
                if (debounceTimeout !== null) {
                    safeClearTimeout(debounceTimeout);
                    debounceTimeout = null;
                    pendingValue = null;
                }

                // Get current value
                const currentValue: T = writable();

                // Move current value to redo stack
                redoStack.push(structuredClone(currentValue));

                // Get the previous value from history
                const currentHistory: T[] = history();
                const previousValue: T = currentHistory[currentHistory.length - 2];

                // Update history and current value
                history.set(currentHistory.slice(0, -1));
                writable.set(structuredClone(previousValue));

                // Notify subscribers
                notifySubscribers(previousValue);
            },
            redo: () => {
                if (!this.options.enableHistory || redoStack.length === 0) return;

                // Clear any pending debounce timeout to prevent race conditions
                if (debounceTimeout !== null) {
                    safeClearTimeout(debounceTimeout);
                    debounceTimeout = null;
                    pendingValue = null;
                }

                // Get the value to redo
                const valueToRedo: NonNullable<T> = redoStack.pop()!;

                // Add it to history
                const currentHistory: T[] = history();
                history.set([...currentHistory, structuredClone(valueToRedo)]);

                // Set the value
                writable.set(structuredClone(valueToRedo));

                // Notify subscribers
                notifySubscribers(valueToRedo);
            },
            subscribe,
            pipe: <R>(...operators: any[]): SignalPlus<R> => {
                // Create a computed signal that applies operators to the source signal
                const computedSignal: Signal<R> = computed(() => {
                    try {
                        let value: any = writable();
                        for (const op of operators) {
                            const intermediateSignal: WritableSignal<any> = signal(value);
                            value = op(intermediateSignal)();
                        }
                        return value as R;
                    } catch (error) {
                        this.handleError(error as Error);
                        throw error;
                    }
                });

                // Get transformed initial value
                let transformedInitialValue: R;
                try {
                    transformedInitialValue = computedSignal();
                } catch (error) {
                    this.handleError(error as Error);
                    throw error;
                }

                // Create a new builder with the transformed initial value
                const resultBuilder = new SignalBuilder<R>(transformedInitialValue);

                // Build the new signal
                const result: SignalPlus<R> = resultBuilder.build();

                // Subscribe to source changes
                signalInstance.subscribe((value: T) => {
                    try {
                        result.setValue(computedSignal());
                    } catch (error) {
                        this.handleError(error as Error);
                        throw error;
                    }
                });

                return result;
            },
            destroy: () => {
                // Mark as cleaned up
                isCleanedUp = true;

                // Clear all subscribers
                subscribers.clear();

                // Cleanup storage event listener
                if (storageListenerCleanup) {
                    storageListenerCleanup();
                    storageListenerCleanup = undefined;
                }

                // Clear any pending debounce timeout
                if (debounceTimeout !== null) {
                    safeClearTimeout(debounceTimeout);
                    debounceTimeout = null;
                }

                // Clear pending value
                pendingValue = null;
            },
            _clearPendingOperations: () => {
                // Clear any pending debounce timeout without destroying the signal
                if (debounceTimeout !== null) {
                    safeClearTimeout(debounceTimeout);
                    debounceTimeout = null;
                }

                // Clear pending value
                pendingValue = null;
            },
            _setValueImmediate: (value: T) => {
                // First clear any pending operations
                if (debounceTimeout !== null) {
                    safeClearTimeout(debounceTimeout);
                    debounceTimeout = null;
                }
                pendingValue = null;

                // Apply transformations
                let transformedValue: T = value;
                if (this.options.transform) {
                    transformedValue = this.options.transform(value);
                }

                // Set the value immediately without going through processValue
                // This bypasses debounce, validation, and subscribers
                writable.set(transformedValue);

                // Update history manually if enabled
                if (this.options.enableHistory) {
                    const currentHistory: readonly T[] = history();
                    const newHistory: T[] = [...currentHistory, structuredClone(transformedValue)];
                    history.set(enforceHistorySize(newHistory));
                    redoStack.length = 0; // Clear redo stack
                }

                // Update persistence if enabled
                if (this.options.storageKey) {
                    const storageValue: string = JSON.stringify(transformedValue);
                    safeLocalStorageSet(this.options.storageKey, storageValue);
                }

                // Notify subscribers immediately
                subscribers.forEach(callback => callback(transformedValue));
            },
            _setHistoryImmediate: (historyArray: T[]) => {
                // Directly set the history without any side effects
                // This is used primarily for transaction rollback
                if (this.options.enableHistory) {
                    history.set(enforceHistorySize([...historyArray]));
                }
            }
        };

        return signalInstance;
    }

    /**
     * Internal method to handle errors through registered error handlers.
     * @param error The error to handle
     */
    private handleError(error: Error): void {
        if (this.options.errorHandlers) {
            this.options.errorHandlers.forEach(handler => {
                try {
                    handler(error);
                } catch (e) {
                    console.error('Error in error handler:', e);
                }
            });
        }
    }
} 