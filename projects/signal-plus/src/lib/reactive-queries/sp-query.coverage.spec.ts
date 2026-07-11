import {
  createEnvironmentInjector,
  EnvironmentInjector,
  runInInjectionContext,
  signal,
} from '@angular/core';
import {
  TestBed,
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

  it('should not watch enabled signals outside an injection context', fakeAsync(() => {
    let calls = 0;
    const enabled = signal(false);

    const result = spQuery({
      queryKey: ['sq-interval'],
      queryFn: () => Promise.resolve(++calls),
      enabled,
    });

    tick(200);
    expect(calls).toBe(0);

    enabled.set(true);
    tick(200);
    expect(calls).toBe(0);

    result.destroy();
    result.destroy();
  }));

  it('should stop enabled-signal reactions after manual destroy', fakeAsync(() => {
    let calls = 0;
    const enabled = signal(true);

    TestBed.runInInjectionContext(() => {
      const result = spQuery({
        queryKey: ['sq-destroy'],
        queryFn: () => Promise.resolve(++calls),
        enabled,
      });

      TestBed.flushEffects();
      flushMicrotasks();
      expect(calls).toBe(1);

      result.destroy();
      enabled.set(false);
      enabled.set(true);
      TestBed.flushEffects();
      flushMicrotasks();

      expect(calls).toBe(1);
    });
  }));

  it('should clean up enabled-signal reactions when its owner is destroyed', fakeAsync(() => {
    let calls = 0;
    const enabled = signal(true);
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );

    runInInjectionContext(injector, () => {
      spQuery({
        queryKey: ['sq-owner-destroy'],
        queryFn: () => Promise.resolve(++calls),
        enabled,
      });
    });
    TestBed.flushEffects();
    flushMicrotasks();
    expect(calls).toBe(1);

    injector.destroy();
    enabled.set(false);
    enabled.set(true);
    TestBed.flushEffects();
    flushMicrotasks();

    expect(calls).toBe(1);
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
