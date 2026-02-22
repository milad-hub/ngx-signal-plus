import { spMonitor } from './monitor';

describe('spMonitor', () => {
  beforeEach(() => {
    spMonitor.clear();
  });

  it('should collect hot and slow metrics', () => {
    spMonitor.trackSignal('signal-a');
    spMonitor.recordUpdate('signal-a', 20);
    spMonitor.recordUpdate('signal-a', 10);

    const hot = spMonitor.getHotSignals();
    const slow = spMonitor.getSlowSignals(12);

    expect(hot.length).toBe(1);
    expect(hot[0].name).toBe('signal-a');
    expect(hot[0].updates).toBe(2);
    expect(hot[0].averageDurationMs).toBe(15);
    expect(slow.length).toBe(1);
    expect(slow[0].name).toBe('signal-a');
  });

  it('should respect per-signal enable and disable', () => {
    spMonitor.trackSignal('a');
    spMonitor.disable('a');
    spMonitor.recordUpdate('a', 20);

    expect((spMonitor.exportMetrics('object') as Array<{ updates: number }>)[0].updates).toBe(0);

    spMonitor.enable('a');
    spMonitor.recordUpdate('a', 15);

    expect((spMonitor.exportMetrics('object') as Array<{ updates: number }>)[0].updates).toBe(1);
  });

  it('should respect global disable and enable', () => {
    spMonitor.trackSignal('a');

    spMonitor.disableAll();
    spMonitor.recordUpdate('a', 20);
    expect((spMonitor.exportMetrics('object') as Array<{ updates: number }>)[0].updates).toBe(0);

    spMonitor.enableAll();
    spMonitor.recordUpdate('a', 20);
    expect((spMonitor.exportMetrics('object') as Array<{ updates: number }>)[0].updates).toBe(1);
  });

  it('should sort and limit hot signals', () => {
    spMonitor.recordUpdate('a', 1);
    spMonitor.recordUpdate('a', 1);
    spMonitor.recordUpdate('b', 1);
    spMonitor.recordUpdate('c', 1);
    spMonitor.recordUpdate('c', 1);
    spMonitor.recordUpdate('c', 1);

    const hot = spMonitor.getHotSignals(2);

    expect(hot.length).toBe(2);
    expect(hot[0].name).toBe('c');
    expect(hot[1].name).toBe('a');
  });

  it('should filter slow signals and ignore disabled ones', () => {
    spMonitor.recordUpdate('fast', 2);
    spMonitor.recordUpdate('slow', 20);
    spMonitor.disable('slow');

    expect(spMonitor.getSlowSignals(10).length).toBe(0);

    spMonitor.enable('slow');
    const slow = spMonitor.getSlowSignals(10);

    expect(slow.length).toBe(1);
    expect(slow[0].name).toBe('slow');
  });

  it('should export metrics as object and json', () => {
    spMonitor.recordUpdate('a', 5);

    const obj = spMonitor.exportMetrics('object');
    const json = spMonitor.exportMetrics('json');

    expect(Array.isArray(obj)).toBe(true);
    expect(typeof json).toBe('string');
    expect(JSON.parse(json as string)[0].name).toBe('a');

    (obj as Array<{ name: string }>)[0].name = 'changed';
    expect((spMonitor.exportMetrics('object') as Array<{ name: string }>)[0].name).toBe('a');
  });

  it('should clear metrics and reset global state', () => {
    spMonitor.recordUpdate('a', 5);
    spMonitor.disableAll();
    spMonitor.clear();
    spMonitor.recordUpdate('a', 5);

    const hot = spMonitor.getHotSignals();

    expect(hot.length).toBe(1);
    expect(hot[0].updates).toBe(1);
  });
});

