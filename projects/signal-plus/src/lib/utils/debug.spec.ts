import { TestBed } from '@angular/core/testing';
import { sp } from './create';
import { spDebug } from './debug';

describe('spDebug', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    spDebug.clear();
  });

  it('should track debug-enabled builder updates', () => {
    TestBed.runInInjectionContext(() => {
      const counter = sp(0).debug('counter-signal').build();
      counter.setValue(1);
      counter.setValue(2);

      const state = spDebug
        .exportState()
        .find((entry) => entry.name === 'counter-signal');

      expect(state).toBeTruthy();
      expect(state?.updates).toBe(2);
      expect(state?.lastValue).toBe(2);
      expect(spDebug.getActiveSignals()).toContain('counter-signal');
    });
  });

  it('should support disable and enable controls', () => {
    TestBed.runInInjectionContext(() => {
      const value = sp(10).debug('debug-target').build();

      spDebug.disable('debug-target');
      value.setValue(11);

      let state = spDebug
        .exportState()
        .find((entry) => entry.name === 'debug-target');
      expect(state?.updates).toBe(0);

      spDebug.enable('debug-target');
      value.setValue(12);

      state = spDebug
        .exportState()
        .find((entry) => entry.name === 'debug-target');
      expect(state?.updates).toBe(1);
      expect(state?.lastValue).toBe(12);
    });
  });

  it('should support global disable and enable', () => {
    TestBed.runInInjectionContext(() => {
      const signal = sp('a').debug('global-target').build();

      spDebug.disableAll();
      signal.setValue('b');

      let state = spDebug
        .exportState()
        .find((entry) => entry.name === 'global-target');
      expect(state?.updates).toBe(0);

      spDebug.enableAll();
      signal.setValue('c');

      state = spDebug
        .exportState()
        .find((entry) => entry.name === 'global-target');
      expect(state?.updates).toBe(1);
      expect(state?.lastValue).toBe('c');
    });
  });
});
