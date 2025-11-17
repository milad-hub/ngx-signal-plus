import { Signal } from '@angular/core';

export interface CollectionOptions<T> {
  idField: keyof T;
  initialValue?: T[];
  persist?: string;
  withHistory?: boolean;
  maxHistory?: number;
}

export interface SignalCollection<T> {
  value: Signal<T[]>;
  count: Signal<number>;
  isEmpty: Signal<boolean>;

  add(item: T): void;
  addMany(items: T[]): void;
  update(id: T[keyof T], changes: Partial<T>): boolean;
  updateMany(updates: { id: T[keyof T]; changes: Partial<T> }[]): number;
  remove(id: T[keyof T]): boolean;
  removeMany(ids: T[keyof T][]): number;
  clear(): void;

  findById(id: T[keyof T]): T | undefined;
  filter(predicate: (item: T) => boolean): T[];
  find(predicate: (item: T) => boolean): T | undefined;
  some(predicate: (item: T) => boolean): boolean;
  every(predicate: (item: T) => boolean): boolean;

  sort(compareFn?: (a: T, b: T) => number): T[];
  map<U>(fn: (item: T, index: number) => U): U[];
  reduce<U>(fn: (acc: U, item: T, index: number) => U, initialValue: U): U;

  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
