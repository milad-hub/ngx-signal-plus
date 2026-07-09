import { spMonitor } from './monitor';

describe('spMonitor gap behavior', () => {
  beforeEach(() => {
    spMonitor.clear();
  });

  afterEach(() => {
    spMonitor.clear();
  });

  it('should skip recording for a disabled metric and resume after enable', () => {
    spMonitor.trackSignal('a');
    spMonitor.disable('a');
    spMonitor.recordUpdate('a', 5);
    expect(spMonitor.getHotSignals().length).toBe(0);

    spMonitor.enable('a');
    spMonitor.recordUpdate('a');
    expect(spMonitor.getHotSignals()[0].updates).toBe(1);
  });

  it('should skip recording while globally disabled', () => {
    spMonitor.disableAll();
    spMonitor.recordUpdate('b', 5);
    spMonitor.enableAll();

    const metric = (
      spMonitor.exportMetrics() as { name: string; updates: number }[]
    ).find((m) => m.name === 'b');
    expect(metric?.updates).toBe(0);
  });

  it('should sort slow signals by average duration using the default threshold', () => {
    spMonitor.recordUpdate('slow-1', 20);
    spMonitor.recordUpdate('slow-2', 40);
    spMonitor.recordUpdate('fast', 1);

    const slow = spMonitor.getSlowSignals();
    expect(slow.map((m) => m.name)).toEqual(['slow-2', 'slow-1']);
  });

  it('should export metrics as objects by default and as JSON on request', () => {
    spMonitor.recordUpdate('c', 2);

    const asObject = spMonitor.exportMetrics();
    expect(Array.isArray(asObject)).toBe(true);

    const asJson = spMonitor.exportMetrics('json');
    expect(typeof asJson).toBe('string');
    expect(asJson as string).toContain('"c"');
  });
});
