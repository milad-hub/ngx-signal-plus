import { signal } from '@angular/core';
import {
  TestBed,
  discardPeriodicTasks,
  fakeAsync,
  flushMicrotasks,
  tick,
} from '@angular/core/testing';
import { spQuery } from './sp-query';

describe('spQuery enabled-signal behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should subscribe and unsubscribe as the enabled signal toggles', fakeAsync(() => {
    let calls = 0;
    const enabled = signal(true);

    TestBed.runInInjectionContext(() => {
      const result = spQuery({
        queryKey: ['sq-effect'],
        queryFn: () => Promise.resolve(++calls),
        enabled,
      });

      TestBed.flushEffects();
      flushMicrotasks();
      expect(result.data()).toBe(1);

      enabled.set(false);
      TestBed.flushEffects();

      enabled.set(true);
      TestBed.flushEffects();
      flushMicrotasks();

      expect(result.data()).toBeDefined();
      expect(calls).toBeGreaterThanOrEqual(1);
    });
  }));

  it('should fall back to interval watching outside an injection context', fakeAsync(() => {
    let calls = 0;
    const enabled = signal(false);

    const result = spQuery({
      queryKey: ['sq-interval'],
      queryFn: () => Promise.resolve(++calls),
      enabled,
    });

    tick(100);
    expect(calls).toBe(0);

    enabled.set(true);
    tick(100);
    flushMicrotasks();
    expect(calls).toBe(1);
    expect(result.data()).toBe(1);

    enabled.set(false);
    tick(100);
    expect(result.data()).toBe(1);

    discardPeriodicTasks();
  }));

  it('should accept object query keys', fakeAsync(() => {
    const result = spQuery({
      queryKey: { key: ['sq-object'] },
      queryFn: () => Promise.resolve(3),
    });

    flushMicrotasks();
    expect(result.data()).toBe(3);
  }));
});
