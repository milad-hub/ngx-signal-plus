import { SignalPerformanceState } from '../models/developer-experience.model';

type InternalPerformanceState = SignalPerformanceState;

const metrics = new Map<string, InternalPerformanceState>();
let globalEnabled = true;

const ensureMetric = (name: string): InternalPerformanceState => {
  const existing = metrics.get(name);
  if (existing) {
    return existing;
  }

  const created: InternalPerformanceState = {
    name,
    updates: 0,
    enabled: true,
    totalDurationMs: 0,
    averageDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: 0,
    lastUpdated: null,
  };
  metrics.set(name, created);
  return created;
};

export const spMonitor = {
  trackSignal(name: string): void {
    ensureMetric(name);
  },

  recordUpdate(name: string, durationMs = 0): void {
    const metric = ensureMetric(name);

    if (!globalEnabled || !metric.enabled) {
      return;
    }

    metric.updates += 1;
    metric.lastDurationMs = durationMs;
    metric.totalDurationMs += durationMs;
    metric.averageDurationMs = metric.totalDurationMs / metric.updates;
    metric.maxDurationMs = Math.max(metric.maxDurationMs, durationMs);
    metric.lastUpdated = Date.now();
  },

  enable(name: string): void {
    ensureMetric(name).enabled = true;
  },

  disable(name: string): void {
    ensureMetric(name).enabled = false;
  },

  enableAll(): void {
    globalEnabled = true;
  },

  disableAll(): void {
    globalEnabled = false;
  },

  getHotSignals(limit = 10): SignalPerformanceState[] {
    return Array.from(metrics.values())
      .filter((metric) => metric.enabled)
      .sort((a, b) => b.updates - a.updates)
      .slice(0, limit)
      .map((metric) => ({ ...metric }));
  },

  getSlowSignals(thresholdMs = 16): SignalPerformanceState[] {
    return Array.from(metrics.values())
      .filter((metric) => metric.enabled && metric.averageDurationMs >= thresholdMs)
      .sort((a, b) => b.averageDurationMs - a.averageDurationMs)
      .map((metric) => ({ ...metric }));
  },

  exportMetrics(format: 'json' | 'object' = 'object'): SignalPerformanceState[] | string {
    const exported = Array.from(metrics.values()).map((metric) => ({ ...metric }));
    return format === 'json' ? JSON.stringify(exported) : exported;
  },

  clear(): void {
    metrics.clear();
    globalEnabled = true;
  },
};
