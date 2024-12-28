import { SignalHistory } from '../models/signal-plus.model';

export class HistoryManager<T> {
  private maxHistory = 50;
  private history: SignalHistory<T>;

  constructor(initialValue: T) {
    this.history = {
      past: [],
      present: initialValue,
      future: []
    };
  }

  push(value: T): void {
    this.history.past.push(this.history.present);
    this.history.present = value;
    this.history.future = [];

    if (this.history.past.length > this.maxHistory) {
      this.history.past.shift();
    }
  }

  undo(): T | undefined {
    if (this.history.past.length === 0) return undefined;

    const previous: NonNullable<T> = this.history.past.pop()!;
    this.history.future.unshift(this.history.present);
    this.history.present = previous;
    return previous;
  }

  redo(): T | undefined {
    if (this.history.future.length === 0) return undefined;

    const next: NonNullable<T> = this.history.future.shift()!;
    this.history.past.push(this.history.present);
    this.history.present = next;
    return next;
  }

  get current(): T {
    return this.history.present;
  }

  get canUndo(): boolean {
    return this.history.past.length > 0;
  }

  get canRedo(): boolean {
    return this.history.future.length > 0;
  }
} 