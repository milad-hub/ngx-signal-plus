import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { spEffect } from './effect';

describe('spEffect', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should run callback reactively', () => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      let runs = 0;

      const controller = spEffect(() => {
        count();
        runs += 1;
      });

      TestBed.flushEffects();
      expect(runs).toBe(1);

      count.set(1);
      TestBed.flushEffects();
      expect(runs).toBe(2);

      controller.destroy();
    });
  });

  it('should honor pause and resume', () => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      let runs = 0;

      const controller = spEffect(() => {
        count();
        runs += 1;
      });

      TestBed.flushEffects();
      controller.pause();
      count.set(1);
      TestBed.flushEffects();
      expect(runs).toBe(1);
      expect(controller.isPaused()).toBe(true);

      controller.resume();
      TestBed.flushEffects();
      expect(controller.isPaused()).toBe(false);
      expect(runs).toBe(2);

      controller.destroy();
    });
  });

  it('should support condition and debounce', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const count = signal(0);
      let runs = 0;

      const controller = spEffect(
        () => {
          count();
          runs += 1;
        },
        {
          condition: () => count() > 0,
          debounce: 30,
        },
      );

      tick(40);
      expect(runs).toBe(0);

      count.set(1);
      tick(10);
      expect(runs).toBe(0);
      tick(25);
      expect(runs).toBe(1);

      controller.destroy();
    });
  }));
});
