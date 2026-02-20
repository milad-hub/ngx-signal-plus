import { DebugSignalState } from '../models/developer-experience.model';

type InternalDebugState = DebugSignalState;

const states = new Map<string, InternalDebugState>();
let globalEnabled = true;

const ensureState = (name: string): InternalDebugState => {
  const existing = states.get(name);
  if (existing) {
    return existing;
  }

  const created: InternalDebugState = {
    name,
    updates: 0,
    enabled: true,
    lastValue: undefined,
    lastUpdated: null,
  };
  states.set(name, created);
  return created;
};

export const spDebug = {
  trackSignal<T>(name: string, initialValue: T): void {
    const state = ensureState(name);
    state.lastValue = initialValue;
    if (state.lastUpdated === null) {
      state.lastUpdated = Date.now();
    }
  },

  recordUpdate<T>(name: string, value: T): void {
    const state = ensureState(name);
    state.lastValue = value;

    if (!globalEnabled || !state.enabled) {
      return;
    }

    state.updates += 1;
    state.lastUpdated = Date.now();
  },

  enable(name: string): void {
    ensureState(name).enabled = true;
  },

  disable(name: string): void {
    ensureState(name).enabled = false;
  },

  enableAll(): void {
    globalEnabled = true;
  },

  disableAll(): void {
    globalEnabled = false;
  },

  getActiveSignals(): string[] {
    return Array.from(states.values())
      .filter((state) => state.enabled)
      .map((state) => state.name);
  },

  exportState(): DebugSignalState[] {
    return Array.from(states.values()).map((state) => ({ ...state }));
  },

  clear(): void {
    states.clear();
    globalEnabled = true;
  },
};
