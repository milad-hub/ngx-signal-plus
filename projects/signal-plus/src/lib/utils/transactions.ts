/**
 * @fileoverview Transaction and batching utilities for ngx-signal-plus
 * @description Provides functionality for atomic operations and batched updates
 *
 * Transactions: Allow multiple signal updates to be treated as a single atomic operation,
 * with automatic rollback on error.
 *
 * Batching: Allow multiple signal updates to be batched together without triggering
 * intermediate reactions or validations.
 *
 * @example
 * ```typescript
 * // Atomic transaction with rollback
 * spTransaction(() => {
 *   userProfile.setValue({...});
 *   userPreferences.setValue({...});
 * });
 *
 * // Simple batching without rollback
 * spBatch(() => {
 *   counter1.setValue(counter1.value() + 1);
 *   counter2.setValue(counter2.value() + 1);
 * });
 * ```
 */

import { SignalPlus } from '../models/signal-plus.model';
import {
  BatchContext,
  TransactionContext,
} from '../models/transactions.models';

/**
 * Enhanced error class for transaction failures with detailed metadata
 */
export class TransactionError extends Error {
  public readonly originalError: Error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly modifiedSignals: SignalPlus<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly originalValues: Map<SignalPlus<any>, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly attemptedValues: Map<SignalPlus<any>, any>;
  public readonly transactionStartTime: Date;
  public readonly transactionEndTime: Date;
  public readonly rollbackSuccessful: boolean;

  constructor(
    message: string,
    originalError: Error,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modifiedSignals: SignalPlus<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalValues: Map<SignalPlus<any>, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attemptedValues: Map<SignalPlus<any>, any>,
    transactionStartTime: Date,
    rollbackSuccessful: boolean,
  ) {
    super(message);
    this.name = 'TransactionError';
    this.originalError = originalError;
    this.modifiedSignals = [...modifiedSignals];
    this.originalValues = new Map(originalValues);
    this.attemptedValues = new Map(attemptedValues);
    this.transactionStartTime = transactionStartTime;
    this.transactionEndTime = new Date();
    this.rollbackSuccessful = rollbackSuccessful;

    // Maintain proper stack trace
    if (originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  /**
   * Get a summary of the transaction failure
   */
  getSummary(): string {
    const duration =
      this.transactionEndTime.getTime() - this.transactionStartTime.getTime();
    return `Transaction failed after ${duration}ms with ${this.modifiedSignals.length} signal modifications. Rollback ${this.rollbackSuccessful ? 'successful' : 'failed'}.`;
  }

  /**
   * Get detailed information about signal changes
   */

  getSignalChanges(): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signal: SignalPlus<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalValue: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attemptedValue: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentValue: any;
  }[] {
    return this.modifiedSignals.map((signal) => ({
      signal,
      originalValue: this.originalValues.get(signal),
      attemptedValue: this.attemptedValues.get(signal),
      currentValue: signal.value,
    }));
  }

  /**
   * Get the names/identifiers of modified signals (if available)
   */
  getModifiedSignalNames(): string[] {
    return this.modifiedSignals.map((signal, index) => {
      // Try to get a meaningful name from the signal if possible
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((signal as any).name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (signal as any).name;
      }
      return `Signal #${index + 1}`;
    });
  }
}

// Global state management for transactions and batching
const state = {
  transaction: {
    active: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalValues: new Map<SignalPlus<any>, any>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalHistories: new Map<SignalPlus<any>, any[]>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patchedSignals: new Map<SignalPlus<any>, (value: any) => void>(),
    modifiedSignals: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attemptedValues: new Map<SignalPlus<any>, any>(),
    startTime: null as Date | null,
  } as TransactionContext & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalHistories: Map<SignalPlus<any>, any[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attemptedValues: Map<SignalPlus<any>, any>;
    startTime: Date | null;
  },

  batch: {
    active: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signals: new Set<SignalPlus<any>>(),
  } as BatchContext,
};

/**
 * Patches a signal to intercept setValue calls during a transaction
 * @param signal The signal to patch
 */
function patchSignal<T>(signal: SignalPlus<T>): void {
  const txState = state.transaction;

  // Skip if already patched
  if (txState.patchedSignals.has(signal)) {
    return;
  }

  // Store original setValue method
  const originalSetValue = signal.setValue;
  txState.patchedSignals.set(signal, originalSetValue);

  // Replace with transaction-aware version
  signal.setValue = function (value: T): void {
    // If in a transaction
    if (txState.active) {
      // Store original value if first time seeing this signal
      if (!txState.originalValues.has(signal)) {
        txState.originalValues.set(signal, signal.value);

        // Also store history state if signal has history
        if (signal.history && typeof signal.history === 'function') {
          const currentHistory = signal.history();
          if (currentHistory && Array.isArray(currentHistory)) {
            txState.originalHistories.set(signal, [...currentHistory]);
          }
        }

        // Add to the modified signals list to maintain order of modification
        if (!txState.modifiedSignals.includes(signal)) {
          txState.modifiedSignals.push(signal);
        }
      }

      // Always track the latest attempted value
      txState.attemptedValues.set(signal, value);
    }

    // Delegate to the original implementation
    return originalSetValue.call(this, value);
  };
}

/**
 * Restores the original setValue method for all patched signals
 */
function restoreOriginalMethods(): void {
  const txState = state.transaction;

  for (const [signal, originalSetValue] of txState.patchedSignals.entries()) {
    // Properly restore the original method
    signal.setValue = originalSetValue;
  }

  txState.patchedSignals.clear();
}

/**
 * Rolls back all changes made during a transaction
 * @returns true if rollback was successful, false if errors occurred
 */
function rollbackChanges(): boolean {
  const txState = state.transaction;

  // To avoid capturing rollback operations, temporarily disable transaction mode
  const wasActive = txState.active;
  txState.active = false;

  let rollbackSuccessful = true;

  try {
    // First, clear any pending debounced operations on all modified signals
    for (const [signal] of txState.originalValues.entries()) {
      try {
        // Clear pending debounce operations if the method exists
        if (signal._clearPendingOperations) {
          signal._clearPendingOperations();
        }
      } catch (error) {
        console.error(
          'Error clearing pending operations during rollback:',
          error,
        );
        rollbackSuccessful = false;
        // Continue with other signals even if one fails
      }
    }

    // Restore original values using internal methods for fast rollback
    for (const [signal, originalValue] of txState.originalValues.entries()) {
      try {
        // Use _setValueImmediate if available for fast rollback without debounce/validation
        if (signal._setValueImmediate) {
          signal._setValueImmediate(originalValue);
        } else {
          // Fallback to original setValue method
          const originalSetValue = txState.patchedSignals.get(signal);

          if (originalSetValue) {
            // Apply the original value using the original method
            originalSetValue.call(signal, originalValue);
          } else {
            // Last resort fallback (shouldn't happen)
            signal.setValue(originalValue);
          }
        }

        // Restore history state if it was captured
        const originalHistory = txState.originalHistories.get(signal);
        if (originalHistory && signal._setHistoryImmediate) {
          signal._setHistoryImmediate(originalHistory);
        }
      } catch (error) {
        console.error('Error during transaction rollback:', error);
        rollbackSuccessful = false;
        // Continue with other rollbacks even if one fails
      }
    }
  } finally {
    // Restore transaction mode
    txState.active = wasActive;
    // Clear captured original values and histories
    txState.originalValues.clear();
    txState.originalHistories.clear();
    txState.attemptedValues.clear();
  }

  return rollbackSuccessful;
}

/**
 * Execute a function as an atomic transaction with automatic rollback on error
 * @param fn Function containing signal operations
 * @returns Result of the function execution
 * @throws Will throw any error from the function and perform rollback
 *
 * @example
 * ```typescript
 * spTransaction(() => {
 *   userProfile.setValue({...});
 *   userPreferences.setValue({...});
 * });
 * ```
 */
export function spTransaction<T>(fn: () => T): T {
  const txState = state.transaction;

  // Prevent nested transactions
  if (txState.active) {
    throw new Error('Nested transactions are not allowed');
  }

  // Initialize transaction state
  const transactionStartTime = new Date();
  txState.active = true;
  txState.startTime = transactionStartTime;
  txState.originalValues.clear();
  txState.attemptedValues.clear();
  txState.modifiedSignals = [];

  try {
    // Execute the transaction
    const result = fn();

    // Transaction completed successfully
    txState.active = false;
    txState.startTime = null;
    txState.originalValues.clear();
    txState.attemptedValues.clear();

    return result;
  } catch (error) {
    // Error occurred, capture transaction state before rollback
    const modifiedSignals = [...txState.modifiedSignals];
    const originalValues = new Map(txState.originalValues);
    const attemptedValues = new Map(txState.attemptedValues);

    // Perform rollback (this clears the maps)
    const rollbackSuccessful = rollbackChanges();
    txState.active = false;
    txState.startTime = null;

    // Create enhanced error with captured transaction metadata
    const originalError =
      error instanceof Error ? error : new Error(String(error));
    const transactionError = new TransactionError(
      `Transaction failed: ${originalError.message}`,
      originalError,
      modifiedSignals,
      originalValues,
      attemptedValues,
      transactionStartTime,
      rollbackSuccessful,
    );

    // Re-throw the enhanced error
    throw transactionError;
  } finally {
    // Clean up patched signals
    restoreOriginalMethods();
    txState.modifiedSignals = [];
    txState.startTime = null;
  }
}

/**
 * Execute multiple signal updates as a single batch
 * @param fn Function containing signal operations
 * @returns Result of the function execution
 *
 * @example
 * ```typescript
 * spBatch(() => {
 *   counter1.setValue(counter1.value + 1);
 *   counter2.setValue(counter2.value + 1);
 * });
 * ```
 */
export function spBatch<T>(fn: () => T): T {
  const batchState = state.batch;

  // Mark batch as active
  batchState.active = true;
  batchState.signals.clear();

  try {
    // Execute batch operations
    return fn();
  } finally {
    // Clean up batch state
    batchState.active = false;
    batchState.signals.clear();
  }
}

/**
 * Check if a transaction is currently active
 * @returns True if a transaction is active
 */
export function spIsTransactionActive(): boolean {
  return state.transaction.active;
}

/**
 * Check if the signal is part of an active transaction
 * @param signal Signal to check
 * @returns True if a transaction is active
 */
export function spIsInTransaction<T>(signal: SignalPlus<T>): boolean {
  if (state.transaction.active) {
    // Ensure the signal is patched for transaction tracking
    patchSignal(signal);
    return true;
  }
  return false;
}

/**
 * Check if the signal is part of an active batch
 * @param signal Signal to check
 * @returns True if the signal is in an active batch
 */
export function spIsInBatch<T>(signal?: SignalPlus<T>): boolean {
  if (state.batch.active) {
    if (signal) {
      state.batch.signals.add(signal);
    }
    return true;
  }
  return false;
}

/**
 * Get a list of signals that have been modified in the current transaction
 * @returns Array of modified signals, or empty array if no transaction is active
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function spGetModifiedSignals(): SignalPlus<any>[] {
  if (!state.transaction.active) {
    return [];
  }

  return [...state.transaction.modifiedSignals];
}

/**
 * Clear transaction state (for testing purposes)
 */
export function _resetTransactionState(): void {
  const txState = state.transaction;
  const batchState = state.batch;

  // Reset transaction state
  txState.active = false;
  txState.startTime = null;
  txState.originalValues.clear();
  txState.originalHistories.clear();
  txState.attemptedValues.clear();
  txState.modifiedSignals = [];
  restoreOriginalMethods();

  // Reset batch state
  batchState.active = false;
  batchState.signals.clear();
}

/**
 * Patches all signals that haven't been patched yet
 * This ensures that all signals that are modified during a transaction are properly tracked
 * @internal Used for testing purposes only
 */
export function _patchAllSignalsInTest<T>(signal: SignalPlus<T>): void {
  // This is a special helper for testing scenarios to make signals
  // interact correctly with our transaction mechanism in test environments

  // For testing purposes, we need to make sure that setValue will work
  // with our transaction tracking mechanism
  patchSignal(signal);

  // Explicitly add this signal to the tracked list
  if (state.transaction.active) {
    spIsInTransaction(signal);
  } else if (state.batch.active) {
    spIsInBatch(signal);
  }
}
