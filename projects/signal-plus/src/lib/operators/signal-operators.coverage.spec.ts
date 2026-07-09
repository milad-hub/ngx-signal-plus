import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  merge,
  skip,
  take,
} from './signal-operators';

describe('signal operator gap behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should propagate source updates through merge', () => {
    TestBed.runInInjectionContext(() => {
      const a = signal(1);
      const b = signal(10);
      const merged = merge(a, b);

      TestBed.flushEffects();
      b.set(20);
      TestBed.flushEffects();
      expect(merged()).toBe(20);

      a.set(2);
      TestBed.flushEffects();
      expect(merged()).toBe(2);
    });
  });

  it('should skip the configured number of emissions', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(1);
      const skipped = skip<number>(1)(source);

      TestBed.flushEffects();
      expect(skipped()).toBe(1);

      source.set(2);
      TestBed.flushEffects();
      expect(skipped()).toBe(2);
    });
  });

  it('should take only the configured number of emissions', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(1);
      const taken = take<number>(1)(source);

      TestBed.flushEffects();
      expect(taken()).toBe(1);

      source.set(2);
      TestBed.flushEffects();
      expect(taken()).toBe(1);
    });
  });

  it('should reschedule pending debounced emissions on rapid updates', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const source = signal(0);
      const debounced = debounceTime<number>(100)(source);

      TestBed.flushEffects();
      source.set(1);
      TestBed.flushEffects();
      tick(50);
      source.set(2);
      TestBed.flushEffects();
      tick(100);

      expect(debounced()).toBe(2);
    });
  }));

  it('should clear pending debounced emissions when the context is destroyed', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const source = signal(0);
      const debounced = debounceTime<number>(100)(source);

      TestBed.flushEffects();
      source.set(1);
      TestBed.flushEffects();
      expect(debounced()).toBe(0);
    });

    TestBed.resetTestingModule();
    tick(100);
  }));

  it('should serialize non-serializable values with a string fallback', () => {
    interface Circular {
      self?: Circular;
    }
    const circular: Circular = {};
    circular.self = circular;

    const source = signal<Circular>(circular);
    const distinct = distinctUntilChanged<Circular>()(source);
    expect(distinct()).toBe(circular);
  });

  it('should keep the last valid value when the predicate throws', () => {
    const source = signal(1);
    const filtered = filter<number>((value) => {
      if (value === 2) {
        throw new Error('boom');
      }
      return true;
    })(source);

    expect(filtered()).toBe(1);
    source.set(2);
    expect(filtered()).toBe(1);
  });
});
