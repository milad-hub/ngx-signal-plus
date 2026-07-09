import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { spEffect } from './effect';

describe('spEffect debounce gap behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should replace a pending debounced run when retriggered', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      const seen: number[] = [];

      const controller = spEffect(() => seen.push(count()), { debounce: 100 });

      TestBed.flushEffects();
      count.set(1);
      TestBed.flushEffects();
      tick(50);
      count.set(2);
      TestBed.flushEffects();
      tick(100);

      expect(seen).toEqual([2]);
      controller.destroy();
    });
  }));

  it('should drop a pending debounced run when paused', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      const seen: number[] = [];

      const controller = spEffect(() => seen.push(count()), { debounce: 100 });

      TestBed.flushEffects();
      controller.pause();
      tick(200);

      expect(seen).toEqual([]);
      expect(controller.isPaused()).toBe(true);
      controller.destroy();
    });
  }));

  it('should clear a pending debounced run on destroy', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      const seen: number[] = [];

      const controller = spEffect(() => seen.push(count()), { debounce: 100 });

      TestBed.flushEffects();
      controller.destroy();
      tick(200);

      expect(seen).toEqual([]);
    });
  }));

  it('should clear an existing pending timeout when the effect reruns while still debouncing', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      const flag = signal(true);
      const seen: number[] = [];

      const controller = spEffect(() => seen.push(count()), {
        debounce: 100,
        condition: () => flag(),
      });

      TestBed.flushEffects();
      flag.set(false);
      TestBed.flushEffects();
      flag.set(true);
      TestBed.flushEffects();
      tick(100);

      expect(seen.length).toBeGreaterThan(0);
      controller.destroy();
    });
  }));

  it('should skip the debounced run when the condition turns false before firing', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      const seen: number[] = [];
      let allowed = true;

      const controller = spEffect(() => seen.push(count()), {
        debounce: 100,
        condition: () => allowed,
      });

      TestBed.flushEffects();
      allowed = false;
      tick(100);

      expect(seen).toEqual([]);
      controller.destroy();
    });
  }));
});
