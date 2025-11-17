import { computed, signal } from '@angular/core';
import {
  CollectionOptions,
  SignalCollection,
} from '../models/collection.model';
import { HistoryManager } from '../managers/history-manager';
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  hasLocalStorage,
} from './platform';

export function spCollection<T extends Record<keyof T, unknown>>(
  options: CollectionOptions<T>,
): SignalCollection<T> {
  const idField = options.idField;
  const persistKey = options.persist;
  const withHistory = options.withHistory ?? false;

  let itemsMap = new Map<T[keyof T], T>();
  let itemsArray: T[] = [];

  function initializeItems(initialItems: T[] = []) {
    itemsMap = new Map();
    itemsArray = [];
    for (const item of initialItems) {
      const id = item[idField];
      if (!itemsMap.has(id)) {
        const itemCopy = { ...item } as T;
        itemsMap.set(id, itemCopy);
        itemsArray.push(itemCopy);
      }
    }
  }

  if (persistKey && hasLocalStorage()) {
    const stored = safeLocalStorageGet(persistKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as T[];
        if (Array.isArray(parsed)) {
          initializeItems(parsed);
        } else {
          initializeItems(options.initialValue ?? []);
        }
      } catch {
        initializeItems(options.initialValue ?? []);
      }
    } else {
      initializeItems(options.initialValue ?? []);
    }
  } else {
    initializeItems(options.initialValue ?? []);
  }

  const valueSignal = signal<T[]>(itemsArray);
  let historyManager: HistoryManager<T[]> | null = null;

  if (withHistory) {
    historyManager = new HistoryManager([...itemsArray]);
  }

  function saveToStorage() {
    if (persistKey && hasLocalStorage()) {
      safeLocalStorageSet(persistKey, JSON.stringify(itemsArray));
    }
  }

  function updateValue(newArray: T[]) {
    if (historyManager) {
      const newState = newArray.map((item) => ({ ...item }) as T);
      historyManager.push(newState);
      itemsArray = newState;
    } else {
      itemsArray = newArray;
    }
    valueSignal.set([...itemsArray]);
    saveToStorage();
  }

  function addItem(item: T): void {
    const id = item[idField];
    if (itemsMap.has(id)) {
      return;
    }
    const itemCopy = { ...item } as T;
    itemsMap.set(id, itemCopy);
    updateValue([...itemsArray, itemCopy]);
  }

  function addManyItems(newItems: T[]): void {
    const toAdd: T[] = [];
    for (const item of newItems) {
      const id = item[idField];
      if (!itemsMap.has(id)) {
        const itemCopy = { ...item } as T;
        itemsMap.set(id, itemCopy);
        toAdd.push(itemCopy);
      }
    }
    if (toAdd.length > 0) {
      updateValue([...itemsArray, ...toAdd]);
    }
  }

  function updateItem(id: T[keyof T], changes: Partial<T>): boolean {
    const existing = itemsMap.get(id);
    if (!existing) {
      return false;
    }
    const updated = { ...existing, ...changes };
    itemsMap.set(id, updated);
    const index = itemsArray.findIndex((item) => item[idField] === id);
    if (index !== -1) {
      const newArray = [...itemsArray];
      newArray[index] = updated;
      updateValue(newArray);
      return true;
    }
    return false;
  }

  function updateManyItems(
    updates: { id: T[keyof T]; changes: Partial<T> }[],
  ): number {
    let updatedCount = 0;
    const newArray = [...itemsArray];
    const updatedMap = new Map<T[keyof T], T>();

    for (const { id, changes } of updates) {
      const existing = itemsMap.get(id);
      if (existing) {
        const updated = { ...existing, ...changes };
        updatedMap.set(id, updated);
        const index = itemsArray.findIndex((item) => item[idField] === id);
        if (index !== -1) {
          newArray[index] = updated;
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      for (const [id, updated] of updatedMap) {
        itemsMap.set(id, updated);
      }
      updateValue(newArray);
    }

    return updatedCount;
  }

  function removeItem(id: T[keyof T]): boolean {
    if (!itemsMap.has(id)) {
      return false;
    }
    itemsMap.delete(id);
    const newArray = itemsArray.filter((item) => item[idField] !== id);
    updateValue(newArray);
    return true;
  }

  function removeManyItems(ids: T[keyof T][]): number {
    const idsSet = new Set(ids);
    const newArray = itemsArray.filter((item) => {
      const id = item[idField];
      if (idsSet.has(id)) {
        itemsMap.delete(id);
        return false;
      }
      return true;
    });

    const removedCount = itemsArray.length - newArray.length;
    if (removedCount > 0) {
      updateValue(newArray);
    }
    return removedCount;
  }

  function clearItems(): void {
    itemsMap.clear();
    updateValue([]);
  }

  function findItemById(id: T[keyof T]): T | undefined {
    return itemsMap.get(id);
  }

  function filterItems(predicate: (item: T) => boolean): T[] {
    return itemsArray.filter(predicate);
  }

  function findItem(predicate: (item: T) => boolean): T | undefined {
    return itemsArray.find(predicate);
  }

  function someItems(predicate: (item: T) => boolean): boolean {
    return itemsArray.some(predicate);
  }

  function everyItem(predicate: (item: T) => boolean): boolean {
    return itemsArray.every(predicate);
  }

  function sortItems(compareFn?: (a: T, b: T) => number): T[] {
    return [...itemsArray].sort(compareFn);
  }

  function mapItems<U>(fn: (item: T, index: number) => U): U[] {
    return itemsArray.map(fn);
  }

  function reduceItems<U>(
    fn: (acc: U, item: T, index: number) => U,
    initialValue: U,
  ): U {
    return itemsArray.reduce(fn, initialValue);
  }

  function undoOperation(): boolean {
    if (!historyManager || !historyManager.canUndo) {
      return false;
    }
    const previous = historyManager.undo();
    if (previous !== undefined && Array.isArray(previous)) {
      initializeItems(previous);
      valueSignal.set([...itemsArray]);
      saveToStorage();
      return true;
    }
    return false;
  }

  function redoOperation(): boolean {
    if (!historyManager || !historyManager.canRedo) {
      return false;
    }
    const next = historyManager.redo();
    if (next !== undefined && Array.isArray(next)) {
      initializeItems(next);
      valueSignal.set([...itemsArray]);
      saveToStorage();
      return true;
    }
    return false;
  }

  function canUndoOperation(): boolean {
    return historyManager?.canUndo ?? false;
  }

  function canRedoOperation(): boolean {
    return historyManager?.canRedo ?? false;
  }

  return {
    value: computed(() => valueSignal()),
    count: computed(() => valueSignal().length),
    isEmpty: computed(() => valueSignal().length === 0),

    add: addItem,
    addMany: addManyItems,
    update: updateItem,
    updateMany: updateManyItems,
    remove: removeItem,
    removeMany: removeManyItems,
    clear: clearItems,

    findById: findItemById,
    filter: filterItems,
    find: findItem,
    some: someItems,
    every: everyItem,

    sort: sortItems,
    map: mapItems,
    reduce: reduceItems,

    undo: undoOperation,
    redo: redoOperation,
    canUndo: canUndoOperation,
    canRedo: canRedoOperation,
  };
}
