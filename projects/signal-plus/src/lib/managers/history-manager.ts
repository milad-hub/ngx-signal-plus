/**
 * @fileoverview History management system for signal values
 * Provides undo/redo functionality with a fixed-size circular buffer.
 * 
 * Features:
 * - Type-safe history tracking with generics
 * - Fixed-size buffer to prevent memory leaks
 * - Undo/redo operations with state tracking
 * - Current state access and validation
 * 
 * @example Basic Usage
 * ```typescript
 * const history = new HistoryManager(0);
 * history.push(1);
 * history.push(2);
 * history.undo(); // Returns to 1
 * history.redo(); // Returns to 2
 * ```
 */

import { SignalHistory } from '../models/signal-plus.model';

/**
 * Manages undo/redo history for signal values with a fixed-size buffer.
 * 
 * @remarks
 * This class provides a robust history management system with:
 * - Fixed-size circular buffer to prevent memory leaks
 * - Type-safe operations with generics
 * - Undo/redo functionality with state validation
 * - Automatic cleanup of old entries
 * 
 * @typeParam T - The type of value being tracked in history
 */
export class HistoryManager<T> {
  /** Maximum number of history entries to maintain. Prevents unbounded memory growth */
  private readonly maxHistory = 50;
  
  /** 
   * Internal history state tracking past, present, and future values.
   * Past: Array of previous values for undo operations
   * Present: Current active value
   * Future: Array of undone values for redo operations
   */
  private history: SignalHistory<T>;

  /**
   * Creates a new history manager instance
   * 
   * @param initialValue - The initial value to track
   * 
   * @example
   * ```typescript
   * const manager = new HistoryManager(0);
   * manager.push(1);  // History: [0] -> 1
   * manager.push(2);  // History: [0, 1] -> 2
   * manager.undo();   // History: [0] -> 1 [2]
   * ```
   */
  constructor(initialValue: T) {
    this.history = {
      past: [],
      present: initialValue,
      future: []
    };
  }

  /**
   * Pushes a new value onto the history stack
   * 
   * @param value - The new value to add to history
   * @remarks
   * - Clears the redo stack (future values)
   * - Maintains the maximum history size by removing oldest entries
   * - Updates the present value and moves current to past
   * 
   * @example
   * ```typescript
   * manager.push(5);  // Adds 5 to history
   * manager.push(10); // Adds 10 and moves 5 to past
   * ```
   */
  push(value: T): void {
    this.history.past.push(this.history.present);
    this.history.present = value;
    this.history.future = [];

    if (this.history.past.length > this.maxHistory) {
      this.history.past.shift();
    }
  }

  /**
   * Reverts to the previous value in history
   * 
   * @returns The previous value, or undefined if no history exists
   * @remarks
   * - Moves present value to future for redo
   * - Updates present value to last past entry
   * - Removes used past entry
   * 
   * @example
   * ```typescript
   * manager.push(1);
   * manager.push(2);
   * const prev = manager.undo(); // prev = 1
   * ```
   */
  undo(): T | undefined {
    if (this.history.past.length === 0) return undefined;

    const previous: T | undefined = this.history.past.pop();
    this.history.future.unshift(this.history.present);
    this.history.present = previous as T;
    return previous;
  }

  /**
   * Restores a previously undone value
   * 
   * @returns The next value in the redo stack, or undefined if no redo history
   * @remarks
   * - Moves present value to past for undo
   * - Updates present value to first future entry
   * - Removes used future entry
   * 
   * @example
   * ```typescript
   * manager.push(1);
   * manager.undo();
   * const next = manager.redo(); // next = 1
   * ```
   */
  redo(): T | undefined {
    if (this.history.future.length === 0) return undefined;

    const next: T | undefined = this.history.future.shift();
    this.history.past.push(this.history.present);
    this.history.present = next as T;
    return next;
  }

  /**
   * Gets the current value in history
   * 
   * @returns The present value
   * @remarks
   * Always returns the current value regardless of undo/redo state
   */
  get current(): T {
    return this.history.present;
  }

  /**
   * Checks if undo operation is available
   * 
   * @returns True if there are past values to undo to
   * @remarks
   * Use this to validate before calling undo()
   */
  get canUndo(): boolean {
    return this.history.past.length > 0;
  }

  /**
   * Checks if redo operation is available
   * 
   * @returns True if there are future values to redo to
   * @remarks
   * Use this to validate before calling redo()
   */
  get canRedo(): boolean {
    return this.history.future.length > 0;
  }
} 