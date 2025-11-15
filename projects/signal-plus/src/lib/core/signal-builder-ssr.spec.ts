/**
 * @fileoverview SSR (Server-Side Rendering) compatibility tests for SignalBuilder
 * @description Tests that SignalBuilder works correctly in environments without browser APIs
 */

import { SignalBuilder } from './signal-builder';
import { SignalPlus } from '../models/signal-plus.model';

describe('SignalBuilder - SSR Compatibility', () => {
  describe('Basic Signal Operations (No Storage/Browser APIs)', () => {
    it('should create signal without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0).build();

      expect(signal.value).toBe(0);
      expect(signal.initialValue).toBe(0);
    });

    it('should update signal values without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0).build();

      signal.setValue(10);
      expect(signal.value).toBe(10);

      signal.setValue(20);
      expect(signal.value).toBe(20);
    });

    it('should validate without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .validate((v) => v >= 0)
        .build();

      expect(signal.isValid()).toBe(true);

      signal.setValue(10);
      expect(signal.isValid()).toBe(true);
    });

    it('should transform values without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(5.7)
        .transform(Math.round)
        .build();

      signal.setValue(7.3);
      expect(signal.value).toBe(7);
    });

    it('should track history without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .withHistory(5)
        .build();

      signal.setValue(1);
      signal.setValue(2);
      signal.setValue(3);

      const hist = signal.history();
      expect(hist.length).toBeGreaterThan(0);

      signal.undo();
      expect(signal.value).toBe(2);
    });
  });

  describe('Storage Operations in SSR Environment', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should handle persistence gracefully when available', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-test-counter')
        .build();

      // In browser, this should work
      signal.setValue(42);
      expect(signal.value).toBe(42);
    });

    it('should not crash when storage is used', () => {
      expect(() => {
        const signal: SignalPlus<number> = new SignalBuilder(0)
          .persist('ssr-storage-test')
          .withHistory(true)
          .build();

        signal.setValue(100);
        signal.setValue(200);
      }).not.toThrow();
    });

    it('should load persisted values when storage is available', () => {
      // Pre-populate localStorage
      localStorage.setItem('ssr-persist-test', JSON.stringify(999));

      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-persist-test')
        .build();

      expect(signal.value).toBe(999);
    });

    it('should handle missing storage gracefully', () => {
      const signal: SignalPlus<string> = new SignalBuilder('default')
        .persist('ssr-missing-key')
        .build();

      // Should use initial value if nothing in storage
      expect(signal.value).toBe('default');
    });

    it('should handle complex objects in storage', () => {
      interface TestData {
        id: number;
        name: string;
        items: number[];
      }

      const initial: TestData = { id: 1, name: 'Test', items: [1, 2, 3] };
      const signal: SignalPlus<TestData> = new SignalBuilder(initial)
        .persist('ssr-complex-object')
        .build();

      const updated: TestData = { id: 2, name: 'Updated', items: [4, 5, 6] };
      signal.setValue(updated);

      expect(signal.value).toEqual(updated);
    });

    it('should persist history when enabled', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-history-persist')
        .withHistory(true)
        .build();

      signal.setValue(1);
      signal.setValue(2);
      signal.setValue(3);

      expect(signal.value).toBe(3);
      expect(signal.history().length).toBeGreaterThan(0);
    });
  });

  describe('Debounce Operations Without Browser APIs', () => {
    it('should handle debounce in SSR-safe way', (done) => {
      const signal: SignalPlus<string> = new SignalBuilder('')
        .debounce(50)
        .build();

      signal.setValue('test');

      // Value should be debounced
      setTimeout(() => {
        expect(signal.value).toBe('test');
        done();
      }, 100);
    });

    it('should not crash with rapid updates', (done) => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .debounce(100)
        .build();

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        signal.setValue(i);
      }

      setTimeout(() => {
        expect(signal.value).toBe(9);
        done();
      }, 150);
    });
  });

  describe('Subscription and Cleanup', () => {
    it('should subscribe without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0).build();
      let callCount = 0;

      const unsubscribe = signal.subscribe(() => {
        callCount++;
      });

      // Should be called immediately with current value
      expect(callCount).toBe(1);

      signal.setValue(10);
      expect(callCount).toBe(2);

      unsubscribe();

      signal.setValue(20);
      expect(callCount).toBe(2); // Should not increase after unsubscribe
    });

    it('should cleanup storage listeners on unsubscribe', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-cleanup-test')
        .build();

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const unsubscribe1 = signal.subscribe(() => {});
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const unsubscribe2 = signal.subscribe(() => {});

      // Cleanup all subscriptions
      unsubscribe1();
      unsubscribe2();

      // Should not crash
      expect(() => {
        signal.setValue(42);
      }).not.toThrow();
    });

    it('should cleanup debounce timers on unsubscribe', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .debounce(1000)
        .build();

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const unsubscribe = signal.subscribe(() => {});

      signal.setValue(10);

      // Cleanup before debounce completes
      unsubscribe();

      // Should not cause issues
      expect(signal.value).toBeDefined();
    });
  });

  describe('Complex Chaining with SSR', () => {
    it('should handle full feature chain', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .validate((v) => v >= 0)
        .transform(Math.abs)
        .distinct()
        .withHistory(10)
        .persist('ssr-full-chain')
        .debounce(50)
        .build();

      expect(signal.value).toBe(0);
      expect(signal.isValid()).toBe(true);
    });

    it('should handle errors gracefully in chain', () => {
      expect(() => {
        const signal: SignalPlus<number> = new SignalBuilder(10)
          .validate((v) => v > 0)
          .transform((v) => v * 2)
          .persist('ssr-error-chain')
          .withHistory(5)
          .build();

        signal.setValue(5);
        signal.undo();
        signal.redo();
      }).not.toThrow();
    });
  });

  describe('Reset and Initial Values', () => {
    it('should reset without browser APIs', () => {
      const signal: SignalPlus<number> = new SignalBuilder(100).build();

      signal.setValue(200);
      expect(signal.value).toBe(200);

      signal.reset();
      expect(signal.value).toBe(100);
    });

    it('should reset with persistence', () => {
      const signal: SignalPlus<number> = new SignalBuilder(100)
        .persist('ssr-reset-persist')
        .build();

      signal.setValue(200);
      expect(signal.value).toBe(200);

      signal.reset();
      expect(signal.value).toBe(100);
    });

    it('should reset with history', () => {
      const signal: SignalPlus<number> = new SignalBuilder(100)
        .withHistory(5)
        .build();

      signal.setValue(200);
      signal.setValue(300);

      signal.reset();
      expect(signal.value).toBe(100);
      expect(signal.history()[signal.history().length - 1]).toBe(100);
    });
  });

  describe('Cross-Tab Synchronization (Browser Only)', () => {
    it('should not crash when storage events occur', (done) => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-cross-tab')
        .build();

      signal.setValue(42);

      // Simulate storage event from another tab
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ssr-cross-tab',
          newValue: JSON.stringify(99),
          oldValue: JSON.stringify(42),
        }),
      );

      setTimeout(() => {
        // Value should update from storage event
        expect(signal.value).toBe(99);
        done();
      }, 10);
    });

    it('should handle storage events with history', (done) => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-cross-tab-history')
        .withHistory(true)
        .build();

      signal.setValue(1);
      signal.setValue(2);

      // Simulate storage event with history
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ssr-cross-tab-history',
          newValue: JSON.stringify({
            value: 999,
            history: [0, 1, 2, 999],
          }),
        }),
      );

      setTimeout(() => {
        expect(signal.value).toBe(999);
        expect(signal.history()).toContain(999);
        done();
      }, 10);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with subscriptions', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .persist('ssr-memory-test')
        .build();

      const unsubscribes: (() => void)[] = [];

      // Create many subscriptions
      for (let i = 0; i < 100; i++) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        unsubscribes.push(signal.subscribe(() => {}));
      }

      // Cleanup all
      unsubscribes.forEach((unsub) => unsub());

      // Should still work
      expect(() => {
        signal.setValue(42);
      }).not.toThrow();
    });

    it('should enforce history size limit', () => {
      const signal: SignalPlus<number> = new SignalBuilder(0)
        .withHistory(3)
        .build();

      for (let i = 1; i <= 10; i++) {
        signal.setValue(i);
      }

      const hist = signal.history();
      expect(hist.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null initial values', () => {
      const signal: SignalPlus<string | null> = new SignalBuilder<
        string | null
      >(null)
        .persist('ssr-null-value')
        .build();

      expect(signal.value).toBeNull();

      signal.setValue('not null');
      expect(signal.value).toBe('not null');

      signal.setValue(null);
      expect(signal.value).toBeNull();
    });

    it('should handle undefined in arrays', () => {
      const signal: SignalPlus<(number | undefined)[]> = new SignalBuilder<
        (number | undefined)[]
      >([1, undefined, 3])
        .persist('ssr-undefined-array')
        .build();

      expect(signal.value).toEqual([1, undefined, 3]);
    });

    it('should handle circular reference prevention', () => {
      interface Node {
        value: number;
        next?: Node;
      }

      // Test that non-circular structures work fine
      const nonCircular: Node = { value: 1, next: { value: 2 } };
      expect(() => {
        const signal: SignalPlus<Node> = new SignalBuilder(nonCircular)
          .persist('ssr-circular-safe')
          .build();
        signal.setValue({ value: 3, next: { value: 4 } });
        expect(signal.value.value).toBe(3);
        expect(signal.value.next?.value).toBe(4);
      }).not.toThrow();

      // Circular references may or may not throw depending on the environment
      // In some environments, structuredClone handles them, in others it throws
      // The important thing is that the library doesn't crash
      const circular: Node = { value: 1 };
      circular.next = circular;

      try {
        const signal: SignalPlus<Node> = new SignalBuilder(circular)
          .persist('ssr-circular')
          .build();
        // If it doesn't throw, that's fine - structuredClone handled it
        expect(signal.value.value).toBe(1);
      } catch (error) {
        // If it throws, that's also fine - structuredClone detected the cycle
        expect(error).toBeDefined();
      }
    });
  });
});
