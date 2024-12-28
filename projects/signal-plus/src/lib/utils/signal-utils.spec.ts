/**
 * @fileoverview Test suite for Signal utility functions
 * @description Tests for utility functions including:
 * - History tracking
 * - Memoization
 * - Validation
 * - Async operations
 * - Time-based utilities
 * - Batching operations
 * 
 * @package ngx-signal-plus
 * @version 1.0.0
 * @license MIT
 */

import { DestroyRef, effect, Injector, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { asyncSignal, batchSignal, CleanupSignal, cleanupSignal, debouncedSignal, memoized, persistentSignal, signalWithHistory, throttledSignal, validatedSignal } from './signal-utils';

describe('Signal Utilities', () => {
  let injector: Injector;

  /**
   * Test setup
   * Configures testing module with necessary providers
   */
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DestroyRef,
          useValue: { onDestroy: (fn: () => void) => fn }
        }
      ]
    });
    injector = TestBed.inject(Injector);
  });

  /**
   * History tracking tests
   * Verifies undo/redo functionality
   */
  describe('signalWithHistory', () => {
    it('should track history', () => {
      const counter = signalWithHistory(0);
      counter.push(1);
      counter.push(2);

      expect(counter.value()).toBe(2);
      counter.undo();
      expect(counter.value()).toBe(1);
    });
  });

  /**
   * Memoization tests
   * Verifies computed value caching
   */
  describe('memoized', () => {
    it('should memoize computed values', () => {
      const name: WritableSignal<string> = signal('John');
      const age: WritableSignal<number> = signal(25);
      let computeCount: number = 0;

      const info: Signal<string> = memoized(() => {
        computeCount++;
        return `${name()} is ${age()} years old`;
      }, [name, age]);

      expect(info()).toBe('John is 25 years old');
      expect(info()).toBe('John is 25 years old');
      expect(computeCount).toBe(1); // Should compute only once
    });
  });

  /**
   * Validation tests
   * Verifies input validation functionality
   */
  describe('validatedSignal', () => {
    it('should validate values', () => {
      const email = validatedSignal('',
        value => /^[^@]+@[^@]+\.[^@]+$/.test(value)
      );

      expect(email.set('invalid')).toBe(false);
      expect(email.set('valid@email.com')).toBe(true);
      expect(email.value()).toBe('valid@email.com');
    });
  });

  /**
   * Async operation tests
   * Verifies async signal behavior and error handling
   */
  describe('asyncSignal', () => {
    it('should handle async operations', async () => {
      const users = asyncSignal<string[]>();
      const mockFetch: Promise<string[]> = Promise.resolve(['user1', 'user2']);

      await users.execute(mockFetch);

      expect(users.loading()).toBe(false);
      expect(users.error()).toBeNull();
      expect(users.value()).toEqual(['user1', 'user2']);
    });

    it('should handle errors', async () => {
      const users = asyncSignal<string[]>();
      const mockError: Promise<never[]> = Promise.reject(new Error('Failed'));

      await users.execute(mockError).catch(() => { });

      expect(users.loading()).toBe(false);
      expect(users.error()).toBeTruthy();
      expect(users.value()).toBeUndefined();
    });
  });

  /**
   * Debounce tests
   * Verifies time-based update throttling
   */
  describe('debouncedSignal', () => {
    it('should debounce updates', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const debounced = debouncedSignal(0, 100);
        const values: number[] = [];

        effect(() => {
          values.push(debounced.value());
        });

        debounced.set(1);
        debounced.set(2);
        debounced.set(3);

        tick(50);
        expect(values).toEqual([0]); // Only initial value

        tick(50);
        expect(values).toEqual([0, 3]); // Last value after debounce
      });
    }));
  });

  /**
   * Throttle tests
   * Verifies rate limiting of updates
   */
  describe('throttledSignal', () => {
    it('should throttle updates', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const throttled = throttledSignal(0, 100);
        const values: number[] = [];

        effect(() => values.push(throttled.value()));
        tick(); // Initial

        throttled.set(1);
        tick(100); // First throttle window
        throttled.set(2);
        tick(100); // Second throttle window

        expect(values).toEqual([0, 1, 2]);
      });
    }));
  });

  /**
   * Batch operation tests
   * Verifies batched update functionality
   */
  describe('batchSignal', () => {
    it('should batch multiple updates', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const batch = batchSignal(0);
        const values: number[] = [];

        effect(() => values.push(batch.value()));
        tick(); // Initial effect

        batch.update(v => v + 1);
        batch.update(v => v * 2);
        batch.update(v => v + 3);
        tick(); // Process updates

        expect(values).toEqual([0, 5]); // Initial and final value
      });
    }));
  });

  /**
   * Cleanup tests
   * Verifies resource cleanup functionality
   */
  describe('cleanupSignal', () => {
    it('should handle cleanup functions', () => {
      runInInjectionContext(injector, () => {
        const cleanup: CleanupSignal<number> = cleanupSignal(0);
        const cleanupFn: () => void = jasmine.createSpy('cleanup');

        cleanup.set(1, cleanupFn);
        cleanup.destroy();

        expect(cleanupFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  /**
   * Persistence tests
   * Verifies localStorage integration
   */
  describe('persistentSignal', () => {
    beforeEach(() => localStorage.clear());

    it('should persist values to localStorage', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const key = 'test-key';
        const persistent = persistentSignal(key, 'initial');

        persistent.set('updated');
        tick(); // Allow effect to run

        expect(localStorage.getItem(key)).toBe('"updated"');
      });
    }));

    it('should load persisted values', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const key = 'test-key';
        localStorage.setItem(key, '"persisted"');

        const persistent = persistentSignal(key, 'initial');
        tick(); // Let effect run

        expect(persistent.value()).toBe('persisted');
        expect(localStorage.getItem(key)).toBe('"persisted"');
      });
    }));
  });
}); 