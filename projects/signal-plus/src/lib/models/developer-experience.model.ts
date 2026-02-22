import { Signal } from '@angular/core';

export interface SpEffectOptions {
  condition?: () => boolean;
  debounce?: number;
}

export interface SpEffectController {
  pause(): void;
  resume(): void;
  destroy(): void;
  isPaused: Signal<boolean>;
}

export interface DebugSignalState<T = unknown> {
  name: string;
  updates: number;
  enabled: boolean;
  lastValue: T | undefined;
  lastUpdated: number | null;
}

export interface SpMonitorOptions {
  label?: string;
  trackUpdates?: boolean;
  trackPerformance?: boolean;
  slowThresholdMs?: number;
}

export interface SignalPerformanceState {
  name: string;
  updates: number;
  enabled: boolean;
  totalDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
  lastDurationMs: number;
  lastUpdated: number | null;
}
