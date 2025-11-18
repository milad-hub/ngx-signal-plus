import {
  Signal,
  WritableSignal,
  computed,
  isDevMode,
  signal,
} from '@angular/core';
import {
  AsyncValidator,
  BuilderOptions,
  ErrorHandler,
  SignalPlus,
  Transform,
  Validator,
} from '../models/signal-plus.model';
import {
  isBrowser,
  safeAddEventListener,
  safeClearTimeout,
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeSetTimeout,
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
      errorHandlers: [],
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
   * Adds an async validator function to the signal
   * @param fn Async function that validates the signal value with debouncing
   * @returns Builder instance for chaining
   */
  validateAsync(fn: AsyncValidator<T>): SignalBuilder<T> {
    if (!this.options.asyncValidators) {
      this.options.asyncValidators = [];
    }
    this.options.asyncValidators.push(fn);
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
   *
   * @remarks
   * This method creates a new builder with the transformed type.
   * Only type-agnostic options are copied (distinctUntilChanged, enableHistory,
   * storageKey, debounceTime, etc.). Type-specific options like validators
   * and transforms are NOT copied since they are incompatible with type R.
   *
   * @example
   * ```typescript
   * const numberSignal = new SignalBuilder(42)
   *   .debounce(300)
   *   .distinct();
   *
   * const stringSignal = numberSignal.map(n => n.toString());
   * // stringSignal is SignalBuilder<string> with debounce and distinct preserved
   * ```
   */
  map<R>(fn: (value: T) => R): SignalBuilder<R> {
    const mappedValue = fn(this.options.initialValue);
    const newBuilder = new SignalBuilder<R>(mappedValue);
    newBuilder.options.distinctUntilChanged = this.options.distinctUntilChanged;
    newBuilder.options.enableHistory = this.options.enableHistory;
    newBuilder.options.historySize = this.options.historySize;
    newBuilder.options.persistHistory = this.options.persistHistory;
    newBuilder.options.storageKey = this.options.storageKey;
    newBuilder.options.debounceTime = this.options.debounceTime;
    newBuilder.options.autoCleanup = this.options.autoCleanup;

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
      return this.options.transforms!.reduce(
        (result: T, transform: Transform<T>) => {
          return transform(result);
        },
        value,
      );
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
    const transform: Transform<T> =
      this.options.transform || ((value: T) => value);

    // Helper to conditionally clone only complex objects
    const conditionalClone = (value: T): T => {
      const type = typeof value;
      if (
        type === 'string' ||
        type === 'number' ||
        type === 'boolean' ||
        value === null ||
        value === undefined
      ) {
        return value;
      }
      return structuredClone(value);
    };

    // Create signal with initial value (untransformed)
    const writable: WritableSignal<T> = signal<T>(
      structuredClone(this.options.initialValue),
    );
    let previousValue: T = structuredClone(this.options.initialValue);
    let initialValue: T = structuredClone(this.options.initialValue);
    const history: WritableSignal<T[]> = signal([]);
    let debounceTimeout: number | undefined | null = null;
    let redoStack: T[] = [];
    let pendingValue: T | null = null;
    let isProcessingDebounce = false;
    let debounceCancelled = false;
    let isProcessingStorage = false;

    // Async validation state
    let asyncValidationTimeout: number | undefined | null = null;
    let currentValidationAbortController: AbortController | null = null;
    const isValidatingSignal: WritableSignal<boolean> = signal<boolean>(false);
    const asyncErrorsSignal: WritableSignal<string[]> = signal<string[]>([]);

    /**
     * Helper function to enforce history size limit
     * @param histArray The history array to enforce size on
     * @returns The history array with size limit applied
     */
    const enforceHistorySize = (histArray: T[]): T[] => {
      if (
        this.options.historySize &&
        histArray.length > this.options.historySize
      ) {
        return histArray.slice(-this.options.historySize);
      }
      return histArray;
    };

    /**
     * Helper function to enforce redo stack size limit
     * @param redoArray The redo stack array to enforce size on
     * @returns The redo stack array with size limit applied
     */
    const enforceRedoStackSize = (redoArray: T[]): T[] => {
      // Use the same size limit as history for consistency
      if (
        this.options.historySize &&
        redoArray.length > this.options.historySize
      ) {
        return redoArray.slice(-this.options.historySize);
      }
      return redoArray;
    };

    /**
     * Helper function to run async validation with debouncing and cancellation
     * @param value The value to validate
     */
    const runAsyncValidation = async (value: T): Promise<void> => {
      // Cancel any existing async validation
      if (currentValidationAbortController) {
        currentValidationAbortController.abort();
      }

      // Clear any existing timeout
      if (asyncValidationTimeout !== null) {
        safeClearTimeout(asyncValidationTimeout);
        asyncValidationTimeout = null;
      }

      // If no async validators, nothing to do
      if (
        !this.options.asyncValidators ||
        this.options.asyncValidators.length === 0
      ) {
        asyncErrorsSignal.set([]);
        isValidatingSignal.set(false);
        return;
      }

      // Create new abort controller for this validation run
      currentValidationAbortController = new AbortController();

      // Set validating state
      isValidatingSignal.set(true);
      asyncErrorsSignal.set([]);

      // Use a small debounce for async validation to avoid excessive API calls
      const debounceMs = 50;

      asyncValidationTimeout = safeSetTimeout(async () => {
        try {
          // Check if this validation was cancelled
          if (currentValidationAbortController?.signal.aborted) {
            return;
          }

          const errors: string[] = [];
          const asyncValidators = this.options.asyncValidators || [];

          // Run all async validators
          for (const validator of asyncValidators) {
            try {
              // Check if cancelled during validation
              if (currentValidationAbortController?.signal.aborted) {
                return;
              }

              const isValid = await validator(value);
              if (!isValid) {
                errors.push('Async validation failed');
              }
            } catch (error) {
              // Validator threw an error, consider it a failure
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'Async validation error';
              errors.push(errorMessage);
            }
          }

          // Only update if not cancelled
          if (!currentValidationAbortController?.signal.aborted) {
            asyncErrorsSignal.set(errors);
            isValidatingSignal.set(false);
          }
        } catch (error) {
          // Only update if not cancelled
          if (!currentValidationAbortController?.signal.aborted) {
            const errorMessage =
              error instanceof Error ? error.message : 'Async validation error';
            asyncErrorsSignal.set([errorMessage]);
            isValidatingSignal.set(false);
          }
        } finally {
          asyncValidationTimeout = null;
        }
      }, debounceMs);

      // If safeSetTimeout returned undefined (not in browser), run synchronously for testing
      if (asyncValidationTimeout === undefined) {
        // Run the validation synchronously for test environments
        (async () => {
          try {
            // Check if this validation was cancelled
            if (currentValidationAbortController?.signal.aborted) {
              return;
            }

            const errors: string[] = [];
            const asyncValidators = this.options.asyncValidators || [];

            // Run all async validators
            for (const validator of asyncValidators) {
              try {
                // Check if cancelled during validation
                if (currentValidationAbortController?.signal.aborted) {
                  return;
                }

                const isValid = await validator(value);
                if (!isValid) {
                  errors.push('Async validation failed');
                }
              } catch (error) {
                // Validator threw an error, consider it a failure
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : 'Async validation error';
                errors.push(errorMessage);
              }
            }

            // Only update if not cancelled
            if (!currentValidationAbortController?.signal.aborted) {
              asyncErrorsSignal.set(errors);
              isValidatingSignal.set(false);
            }
          } catch (error) {
            // Only update if not cancelled
            if (!currentValidationAbortController?.signal.aborted) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'Async validation error';
              asyncErrorsSignal.set([errorMessage]);
              isValidatingSignal.set(false);
            }
          } finally {
            asyncValidationTimeout = null;
          }
        })();
      }
    };

    const serializeWithCircularCheck = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fallbackData?: any,
    ): string => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeStringify = (obj: any): string => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          if (value !== null && typeof value === 'object') {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          return value;
        });
      };

      try {
        return JSON.stringify(data);
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
          return safeStringify(data);
        }

        if (fallbackData !== undefined) {
          try {
            return JSON.stringify(fallbackData);
          } catch (fallbackError) {
            if (
              fallbackError instanceof TypeError &&
              fallbackError.message.includes('circular')
            ) {
              return safeStringify(fallbackData);
            }
            throw fallbackError;
          }
        }

        throw error;
      }
    };

    // Initialize history with initial value
    if (this.options.enableHistory) {
      history.set([conditionalClone(initialValue)]);
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
            if (
              parsedData &&
              typeof parsedData === 'object' &&
              'value' in parsedData
            ) {
              parsedValue = parsedData.value;
              parsedHistory = parsedData.history;
            } else {
              parsedValue = parsedData;
            }

            writable.set(parsedValue);
            previousValue = parsedValue;
            initialValue = parsedValue;

            if (this.options.enableHistory && parsedHistory) {
              history.set(
                enforceHistorySize(
                  parsedHistory.map((v) => conditionalClone(v)),
                ),
              );
            } else if (this.options.enableHistory) {
              history.set([conditionalClone(parsedValue)]);
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
      if (
        !isProcessingStorage &&
        event.key === this.options.storageKey &&
        event.newValue !== null
      ) {
        try {
          let parsedValue: T;
          let parsedHistory: T[] | undefined;

          const parsedData = JSON.parse(event.newValue);
          if (
            parsedData &&
            typeof parsedData === 'object' &&
            'value' in parsedData
          ) {
            parsedValue = parsedData.value;
            parsedHistory = parsedData.history;
          } else {
            parsedValue = parsedData;
          }

          if (isProcessingDebounce && debounceTimeout !== null) {
            debounceCancelled = true;
            safeClearTimeout(debounceTimeout);
            debounceTimeout = null;
            pendingValue = null;
            isProcessingDebounce = false;
          }

          writable.set(parsedValue);
          previousValue = parsedValue;

          if (this.options.enableHistory && parsedHistory) {
            history.set(
              enforceHistorySize(parsedHistory.map((v) => conditionalClone(v))),
            );
          }

          notifySubscribers(parsedValue);
        } catch (error) {
          this.handleError(error as Error);
        }
      }
    };

    // Store cleanup callback for storage listener
    let storageListenerCleanup: (() => void) | undefined;

    if (this.options.storageKey && isBrowser()) {
      storageListenerCleanup = safeAddEventListener(
        'storage',
        handleStorageEvent,
      );
    }

    let nextSubId = 0;
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

      // Trigger async validation after subscribers are notified
      runAsyncValidation(value).catch((error) => {
        this.handleError(error as Error);
      });
    };

    const subscribe: (callback: (value: T) => void) => () => void = (
      callback: (value: T) => void,
    ): (() => void) => {
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
            debounceCancelled = true; // Mark as cancelled during cleanup
          }

          // Clear pending value
          pendingValue = null;
        }
      };
    };

    const updateValue: (val: T, skipValidation?: boolean) => void = (
      val: T,
      skipValidation = false,
    ) => {
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
        let hasChanged = true;
        if (this.options.distinctUntilChanged) {
          try {
            const currentValueStr: string = JSON.stringify(writable());
            const newValueStr: string = JSON.stringify(transformedValue);
            hasChanged = currentValueStr !== newValueStr;

            if (!hasChanged) {
              return;
            }
          } catch {
            hasChanged = true;
          }
        }

        // Only update if value has changed
        if (hasChanged) {
          previousValue = conditionalClone(writable());
          writable.set(transformedValue);

          // Update history if enabled and value has changed
          if (this.options.enableHistory && !isProcessingDebounce) {
            // Clear redo stack when new value is set
            redoStack = [];
            const currentHistory: T[] = history();
            const newHistory = [
              ...currentHistory,
              conditionalClone(transformedValue),
            ];

            // Enforce history size limit using helper function
            history.set(enforceHistorySize(newHistory));
          }

          // Handle storage
          if (this.options.storageKey && isBrowser()) {
            try {
              isProcessingStorage = true;
              const shouldStoreHistory = Boolean(
                this.options.enableHistory && this.options.persistHistory,
              );
              const dataToStore: T | { value: T; history: T[] } =
                shouldStoreHistory
                  ? { value: transformedValue, history: history() }
                  : transformedValue;

              const serialized = serializeWithCircularCheck(
                dataToStore,
                transformedValue,
              );
              safeLocalStorageSet(this.options.storageKey, serialized);
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
        debounceCancelled = true;
        safeClearTimeout(debounceTimeout);
        debounceTimeout = null;
      }

      try {
        // Handle debounce
        if (this.options.debounceTime && this.options.debounceTime > 0) {
          isProcessingDebounce = true;
          debounceCancelled = false;
          pendingValue = value;
          debounceTimeout = safeSetTimeout(() => {
            try {
              if (debounceCancelled) {
                pendingValue = null;
                return;
              }

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
      get value() {
        return writable();
      },
      get previousValue() {
        return previousValue;
      },
      get initialValue() {
        return initialValue;
      },
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
          const resetValue: T =
            this.options.defaultValue ?? this.options.initialValue;

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
            previousValue = conditionalClone(writable());
            writable.set(transformedValue);

            // Update history
            if (this.options.enableHistory) {
              history.set([conditionalClone(transformedValue)]);
            }

            // Handle storage
            if (this.options.storageKey && isBrowser()) {
              try {
                isProcessingStorage = true;
                const shouldStoreHistory = Boolean(
                  this.options.enableHistory && this.options.persistHistory,
                );
                const dataToStore: T | { value: T; history: T[] } =
                  shouldStoreHistory
                    ? { value: transformedValue, history: [transformedValue] }
                    : transformedValue;

                const serialized = serializeWithCircularCheck(
                  dataToStore,
                  transformedValue,
                );
                safeLocalStorageSet(this.options.storageKey, serialized);
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
          const validators: Validator<T>[] = this.options
            .validators as Validator<T>[];
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
          const validators: Validator<T>[] = this.options
            .validators as Validator<T>[];
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
      isValidating: computed(() => isValidatingSignal()),
      asyncErrors: computed(() => asyncErrorsSignal()),
      isDirty: computed(() => {
        try {
          return JSON.stringify(writable()) !== JSON.stringify(initialValue);
        } catch {
          return writable() !== initialValue;
        }
      }),
      hasChanged: computed(() => {
        try {
          const currentValue: string = JSON.stringify(writable());
          const prevValue: string = JSON.stringify(previousValue);
          return this.options.distinctUntilChanged
            ? currentValue !== prevValue &&
                currentValue !== JSON.stringify(writable())
            : currentValue !== prevValue;
        } catch {
          return writable() !== previousValue;
        }
      }),
      history: computed(() => (this.options.enableHistory ? history() : [])),
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
        redoStack.push(conditionalClone(currentValue));
        // Enforce redo stack size limit
        redoStack = enforceRedoStackSize(redoStack);

        // Get the previous value from history
        const currentHistory: T[] = history();
        const previousValue: T = currentHistory[currentHistory.length - 2];

        // Update history and current value
        history.set(currentHistory.slice(0, -1));
        writable.set(conditionalClone(previousValue));

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
        const valueToRedo: T = redoStack.pop() as T;

        // Add it to history
        const currentHistory: T[] = history();
        history.set([...currentHistory, conditionalClone(valueToRedo)]);

        // Set the value
        writable.set(conditionalClone(valueToRedo));

        // Notify subscribers
        notifySubscribers(valueToRedo);
      },
      subscribe,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipe: <R>(...operators: any[]): SignalPlus<R> => {
        // Create a computed signal that applies operators to the source signal
        const computedSignal: Signal<R> = computed(() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let value: any = writable();
            for (const op of operators) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        signalInstance.subscribe(() => {
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
        // Prevent multiple destroy calls
        if (isCleanedUp) {
          return;
        }

        const errors: Error[] = [];
        const cleanupSteps: string[] = [];

        // Helper function to safely execute cleanup steps
        const safeCleanup = (stepName: string, cleanupFn: () => void): void => {
          try {
            cleanupFn();
            cleanupSteps.push(`${stepName}: SUCCESS`);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const cleanupError = new Error(
              `Failed to ${stepName.toLowerCase()}: ${errorMessage}`,
            );
            errors.push(cleanupError);
            cleanupSteps.push(`${stepName}: FAILED - ${errorMessage}`);
          }
        };

        // Step 1: Mark as cleaned up (must be first to prevent operations during cleanup)
        safeCleanup('Set cleanup flag', () => {
          isCleanedUp = true;
        });

        // Step 2: Clear all subscribers
        safeCleanup('Clear subscribers', () => {
          subscribers.clear();
        });

        // Step 3: Cleanup storage event listener
        safeCleanup('Cleanup storage listener', () => {
          if (storageListenerCleanup) {
            storageListenerCleanup();
            storageListenerCleanup = undefined;
          }
        });

        // Step 4: Clear any pending debounce timeout
        safeCleanup('Clear debounce timeout', () => {
          if (debounceTimeout !== null) {
            safeClearTimeout(debounceTimeout);
            debounceTimeout = null;
            pendingValue = null;
            isProcessingDebounce = false;
            debounceCancelled = false;
          }
        });

        // Step 4.5: Clear async validation timeout and abort controller
        safeCleanup('Clear async validation', () => {
          if (asyncValidationTimeout !== null) {
            safeClearTimeout(asyncValidationTimeout);
            asyncValidationTimeout = null;
          }
          if (currentValidationAbortController) {
            currentValidationAbortController.abort();
            currentValidationAbortController = null;
          }
          isValidatingSignal.set(false);
          asyncErrorsSignal.set([]);
        });

        // Step 5: Clear pending value
        safeCleanup('Clear pending value', () => {
          pendingValue = null;
        });

        // Step 6: Clear history and redo stack (if enabled)
        safeCleanup('Clear history and redo stack', () => {
          if (this.options.enableHistory) {
            try {
              history.set([]);
            } catch (error) {
              // If history.set fails, try to clear redoStack anyway
              redoStack = [];
              throw error;
            }
          }
          redoStack = [];
        });

        // Step 7: Reset processing flags
        safeCleanup('Reset processing flags', () => {
          isProcessingStorage = false;
        });

        // Handle errors: log and notify error handlers
        if (errors.length > 0) {
          const errorDetails = {
            totalErrors: errors.length,
            errors: errors.map((e) => ({
              message: e.message,
              stack: e.stack,
            })),
            cleanupSteps: cleanupSteps,
            signalInfo: {
              hasStorage: !!this.options.storageKey,
              hasHistory: !!this.options.enableHistory,
              hasDebounce: !!this.options.debounceTime,
              subscriberCount: subscribers.size,
            },
          };

          // Log detailed error information
          console.error(
            `Signal cleanup encountered ${errors.length} error(s) during destroy:`,
            errorDetails,
          );

          // Call custom error handlers if available
          if (
            this.options.errorHandlers &&
            this.options.errorHandlers.length > 0
          ) {
            const cleanupError = new Error(
              `Cleanup failed with ${errors.length} error(s): ${errors.map((e) => e.message).join('; ')}`,
            );
            // Attach additional context to error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cleanupError as any).cleanupDetails = errorDetails;

            this.options.errorHandlers.forEach((handler, index) => {
              try {
                handler(cleanupError);
              } catch (handlerError) {
                const handlerErrorMessage =
                  handlerError instanceof Error
                    ? handlerError.message
                    : String(handlerError);
                console.error(
                  `Error handler #${index + 1} failed during cleanup: ${handlerErrorMessage}`,
                  handlerError,
                );
              }
            });
          }
        }
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
          const newHistory: T[] = [
            ...currentHistory,
            conditionalClone(transformedValue),
          ];
          history.set(enforceHistorySize(newHistory));
          redoStack.length = 0; // Clear redo stack
        }

        // Update persistence if enabled
        if (this.options.storageKey) {
          const storageValue: string = JSON.stringify(transformedValue);
          safeLocalStorageSet(this.options.storageKey, storageValue);
        }

        // Notify subscribers immediately
        subscribers.forEach((callback) => callback(transformedValue));
      },
      _setHistoryImmediate: (historyArray: T[]) => {
        // Directly set the history without any side effects
        // This is used primarily for transaction rollback
        if (this.options.enableHistory) {
          history.set(enforceHistorySize([...historyArray]));
        }
      },
    };

    return signalInstance;
  }

  /**
   * Internal method to handle errors through registered error handlers.
   * @param error The error to handle
   */
  private handleError(error: Error): void {
    if (this.options.errorHandlers && this.options.errorHandlers.length > 0) {
      const handlerFailures: Error[] = [];

      this.options.errorHandlers.forEach((handler, index) => {
        try {
          handler(error);
        } catch (handlerError) {
          // Collect handler failures for comprehensive reporting
          const handlerFailure = new Error(
            `Error handler #${index + 1} failed: ${handlerError instanceof Error ? handlerError.message : String(handlerError)}`,
          );
          handlerFailure.cause = handlerError;
          handlerFailures.push(handlerFailure);

          // Log individual handler failure with context
          console.error(
            `Error handler #${index + 1} failed while processing error "${error.message}":`,
            handlerError,
          );
        }
      });

      // If any handlers failed, provide comprehensive summary
      if (handlerFailures.length > 0) {
        console.error(
          `⚠️ ${handlerFailures.length} of ${this.options.errorHandlers.length} error handler(s) failed. Original error: "${error.message}"`,
        );

        // In development, re-throw the first handler failure to make it more visible
        if (isDevMode()) {
          throw handlerFailures[0];
        }
      }
    }
  }
}
