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
import { SpErrorCode } from '../models/errors.model';
import { spCreateError } from './errors';
import { SignalPlusScope, _resolveScope, _scopeForSignal } from '../core/scope';

const transactionIsActive = (scope: SignalPlusScope): boolean =>
  scope.transaction.active;

const batchIsActive = (scope: SignalPlusScope): boolean => scope.batch.active;

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

/**
 * Records a signal write against the active transaction so it can be rolled back
 * @param signal The signal being written
 * @param value The value the caller is attempting to write
 * @internal Called by the signal write paths; not part of the public API
 */
export function _trackTransactionWrite<T>(
  signal: SignalPlus<T>,
  value: T,
): void {
  const txState = _scopeForSignal(signal, transactionIsActive).transaction;

  if (!txState.active) {
    return;
  }

  if (!txState.modifiedSet.has(signal)) {
    txState.modifiedSet.add(signal);
    txState.modifiedSignals.push(signal);
    txState.originalValues.set(signal, signal.value);

    if (signal._getTransactionSnapshot) {
      txState.snapshots.set(signal, signal._getTransactionSnapshot());
    }
  }

  txState.attemptedValues.set(signal, value);
}

/**
 * Holds a signal's notification until the batch exits, keeping only the latest value
 * @param signal The signal being notified
 * @param value The value that would be delivered now
 * @param deliver The delivery callback to run when the batch exits
 * @returns True if delivery was deferred, false if the caller should deliver now
 * @internal Called by the signal notification path; not part of the public API
 */
export function _deferBatchNotification<T>(
  signal: SignalPlus<T>,
  value: T,
  deliver: (value: T) => void,
): boolean {
  const batchState = _scopeForSignal(signal, batchIsActive).batch;

  if (!batchState.active) {
    // A write delivered outside the batch supersedes anything still queued for
    // this signal, so the flush cannot follow it with an older value
    batchState.pending.delete(signal);
    return false;
  }

  batchState.signals.add(signal);
  batchState.pending.set(signal, { value, deliver });
  return true;
}

/**
 * Patches a signal to intercept setValue calls during a transaction
 * @param signal The signal to patch
 */
function patchSignal<T>(signal: SignalPlus<T>, scope: SignalPlusScope): void {
  const txState = scope.transaction;

  // Skip if already patched
  if (txState.patchedSignals.has(signal)) {
    return;
  }

  // Store original setValue method
  const originalSetValue = signal.setValue;
  txState.patchedSignals.set(signal, originalSetValue);

  // Replace with transaction-aware version
  signal.setValue = function (value: T): void {
    _trackTransactionWrite(signal, value);

    // Delegate to the original implementation
    return originalSetValue.call(this, value);
  };
}

/**
 * Restores the original setValue method for all patched signals
 */
function restoreOriginalMethods(scope: SignalPlusScope): void {
  const txState = scope.transaction;

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
function rollbackChanges(scope: SignalPlusScope): boolean {
  const txState = scope.transaction;

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
        const snapshot = txState.snapshots.get(signal);
        if (snapshot && signal._restoreTransactionSnapshot) {
          signal._restoreTransactionSnapshot(snapshot);
        } else {
          // Transaction mode is disabled during rollback, so the patched
          // setValue delegates straight to the original implementation.
          signal.setValue(originalValue);
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
    txState.snapshots.clear();
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
  const scope = _resolveScope();
  const txState = scope.transaction;

  // Prevent nested transactions
  if (txState.active) {
    throw spCreateError(SpErrorCode.TRX_001);
  }

  // Initialize transaction state
  const transactionStartTime = new Date();
  txState.active = true;
  txState.startTime = transactionStartTime;
  txState.originalValues.clear();
  txState.snapshots.clear();
  txState.attemptedValues.clear();
  txState.modifiedSignals = [];
  txState.modifiedSet.clear();

  try {
    // Execute the transaction
    const result = fn();

    // Transaction completed successfully
    txState.active = false;
    txState.startTime = null;
    txState.originalValues.clear();
    txState.snapshots.clear();
    txState.attemptedValues.clear();

    return result;
  } catch (error) {
    // Error occurred, capture transaction state before rollback
    const modifiedSignals = [...txState.modifiedSignals];
    const originalValues = new Map(txState.originalValues);
    const attemptedValues = new Map(txState.attemptedValues);

    // Perform rollback (this clears the maps)
    const rollbackSuccessful = rollbackChanges(scope);
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
    restoreOriginalMethods(scope);
    txState.modifiedSignals = [];
    txState.modifiedSet.clear();
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
  const batchState = _resolveScope().batch;

  // A nested batch joins the outermost one, which owns the flush. A batch
  // opened by a subscriber during a flush joins that flush the same way.
  const isOutermost = !batchState.active;

  // Mark batch as active
  batchState.active = true;
  if (isOutermost && !batchState.flushing) {
    batchState.signals.clear();
    batchState.pending.clear();
  }

  try {
    // Execute batch operations
    return fn();
  } finally {
    if (isOutermost) {
      // Clean up batch state before delivering, so a subscriber that writes
      // during the flush notifies immediately instead of being swallowed
      batchState.active = false;
      batchState.signals.clear();

      if (!batchState.flushing) {
        batchState.flushing = true;
        try {
          // Drain the live queue rather than a snapshot: a write made during
          // the flush removes its own stale entry, and one made inside a
          // nested batch is appended and delivered by this same loop
          for (
            let next = batchState.pending.entries().next();
            !next.done;
            next = batchState.pending.entries().next()
          ) {
            const [signal, notification] = next.value;
            batchState.pending.delete(signal);
            notification.deliver(notification.value);
          }
        } finally {
          batchState.flushing = false;
          batchState.pending.clear();
        }
      }
    }
  }
}

/**
 * Check if a transaction is currently active
 * @returns True if a transaction is active
 */
export function spIsTransactionActive(): boolean {
  return _resolveScope().transaction.active;
}

/**
 * Check if the signal has been written during the active transaction
 * @param signal Signal to check
 * @returns True if a transaction is active and this signal was written in it
 */
export function spIsInTransaction<T>(signal: SignalPlus<T>): boolean {
  const txState = _scopeForSignal(signal, transactionIsActive).transaction;
  return txState.active && txState.modifiedSet.has(signal);
}

/**
 * Check if the signal is part of an active batch
 * @param signal Signal to check
 * @returns True if the signal is in an active batch
 */
export function spIsInBatch<T>(signal?: SignalPlus<T>): boolean {
  const batchState = signal
    ? _scopeForSignal(signal, batchIsActive).batch
    : _resolveScope().batch;

  if (batchState.active) {
    if (signal) {
      batchState.signals.add(signal);
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
  const txState = _resolveScope().transaction;

  if (!txState.active) {
    return [];
  }

  return [...txState.modifiedSignals];
}

/**
 * Clear transaction state (for testing purposes)
 */
export function _resetTransactionState(scope?: SignalPlusScope): void {
  const target = scope ?? _resolveScope();
  const txState = target.transaction;
  const batchState = target.batch;

  // Reset transaction state
  txState.active = false;
  txState.startTime = null;
  txState.originalValues.clear();
  txState.snapshots.clear();
  txState.attemptedValues.clear();
  txState.modifiedSignals = [];
  txState.modifiedSet.clear();
  restoreOriginalMethods(target);

  // Reset batch state
  batchState.active = false;
  batchState.flushing = false;
  batchState.signals.clear();
  batchState.pending.clear();
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
  // Resolved the same way spTransaction resolves it, so the scope that stores
  // the patch is always the scope restoreOriginalMethods will restore from
  patchSignal(signal, _resolveScope());

  // Explicitly add this signal to the tracked list
  if (_scopeForSignal(signal, batchIsActive).batch.active) {
    spIsInBatch(signal);
  }
}
