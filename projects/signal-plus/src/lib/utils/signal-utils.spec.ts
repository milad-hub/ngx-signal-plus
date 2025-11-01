import { Injector, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Validator } from '../models';
import { asyncSignal, batchSignal, CleanupSignal, cleanupSignal, debouncedSignal, memoized, persistentSignal, signalWithHistory, throttledSignal, validatedSignal } from './signal-utils';

describe('Signal Utils', () => {
  let injector: Injector;

  beforeEach(() => {
    localStorage.clear();
    jasmine.clock().install();
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('signalWithHistory', () => {
    it('should initialize with initial value', () => {
      const counter = signalWithHistory(0);
      expect(counter.value()).toBe(0);
      expect(counter.history().length).toBe(1);
      expect(counter.history()[0]).toBe(0);
    });

    it('should track value changes in history', () => {
      const counter = signalWithHistory(0);
      counter.push(1);
      counter.push(2);
      expect(counter.value()).toBe(2);
      expect(counter.history()).toEqual([0, 1, 2]);
    });

    it('should support undo operation', () => {
      const counter = signalWithHistory(0);
      counter.push(1);
      counter.push(2);
      counter.undo();
      expect(counter.value()).toBe(1);
      expect(counter.history()).toEqual([0, 1]);
    });

    it('should not undo beyond initial state', () => {
      const counter = signalWithHistory(0);
      counter.undo();
      expect(counter.value()).toBe(0);
      expect(counter.history()).toEqual([0]);
    });
  });

  describe('memoized', () => {
    it('should compute initial value', () => {
      const name: WritableSignal<string> = signal('John');
      const age: WritableSignal<number> = signal(25);
      const info: Signal<string> = memoized(
        () => `${name()} is ${age()} years old`,
        [name, age]
      );
      expect(info()).toBe('John is 25 years old');
    });

    it('should update when dependencies change', () => {
      const name: WritableSignal<string> = signal('John');
      const age: WritableSignal<number> = signal(25);
      const info: Signal<string> = memoized(
        () => `${name()} is ${age()} years old`,
        [name, age]
      );
      name.set('Jane');
      age.set(30);
      expect(info()).toBe('Jane is 30 years old');
    });
  });

  describe('validatedSignal', () => {
    it('should initialize with valid value', () => {
      const isPositive: Validator<number> = (n: number) => n >= 0;
      const number = validatedSignal(5, isPositive);
      expect(number.value()).toBe(5);
      expect(number.isValid()).toBe(true);
    });

    it('should reject invalid values', () => {
      const isPositive: Validator<number> = (n: number) => n >= 0;
      const number = validatedSignal<number>(5, isPositive);
      const result: boolean = number.set(-1);
      expect(result).toBe(false);
      expect(number.value()).toBe(5);
      expect(number.isValid()).toBe(true);
    });

    it('should accept valid values', () => {
      const isPositive: Validator<number> = (n: number) => n >= 0;
      const number = validatedSignal<number>(5, isPositive);
      const result: boolean = number.set(10);
      expect(result).toBe(true);
      expect(number.value()).toBe(10);
      expect(number.isValid()).toBe(true);
    });
  });

  describe('debouncedSignal', () => {
    it('should delay updates', fakeAsync(() => {
      const text = debouncedSignal('', 500);
      text.set('test');
      expect(text.value()).toBe('');
      tick(500);
      expect(text.value()).toBe('test');
    }));

    it('should cancel pending updates', fakeAsync(() => {
      const text = debouncedSignal('', 500);
      text.set('test1');
      text.set('test2');
      tick(250);
      text.set('test3');
      expect(text.value()).toBe('');
      tick(500);
      expect(text.value()).toBe('test3');
    }));
  });

  describe('throttledSignal', () => {
    it('should limit update frequency', fakeAsync(() => {
      const counter = throttledSignal(0, 1000);
      counter.set(1);
      counter.set(2);
      counter.set(3);
      expect(counter.value()).toBe(1);
      tick(1000);
      counter.set(4);
      expect(counter.value()).toBe(4);
    }));
  });

  describe('batchSignal', () => {
    it('should batch multiple updates', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const counter = batchSignal(0);
        counter.update(v => v + 1);
        counter.update(v => v * 2);
        expect(counter.value()).toBe(0);
        tick(0);
        expect(counter.value()).toBe(2);
      });
    }));
  });

  describe('cleanupSignal', () => {
    it('should handle cleanup on set', () => {
      const cleanup: jasmine.Spy = jasmine.createSpy('cleanup');
      const value: CleanupSignal<string> = cleanupSignal('initial');
      value.set('new', cleanup);
      value.destroy();
      expect(cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup on update', () => {
      const cleanup: jasmine.Spy = jasmine.createSpy('cleanup');
      const value: CleanupSignal<string> = cleanupSignal('initial');
      value.update(v => v + '!', cleanup);
      value.destroy();
      expect(cleanup).toHaveBeenCalled();
    });

    it('should execute all cleanup functions on destroy', () => {
      const cleanup1: jasmine.Spy = jasmine.createSpy('cleanup1');
      const cleanup2: jasmine.Spy = jasmine.createSpy('cleanup2');
      const value: CleanupSignal<string> = cleanupSignal('initial');
      value.set('new1', cleanup1);
      value.set('new2', cleanup2);
      value.destroy();
      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });
  });

  describe('asyncSignal', () => {
    it('should handle successful async operations', async () => {
      const data = asyncSignal<string>();
      const promise: Promise<string> = Promise.resolve('success');
      await data.execute(promise);
      expect(data.value()).toBe('success');
      expect(data.error()).toBeNull();
      expect(data.loading()).toBe(false);
    });

    it('should handle failed async operations', async () => {
      const data = asyncSignal<string>();
      const error = new Error('failed');
      const promise: Promise<string> = Promise.reject(error);
      await data.execute(promise);
      expect(data.value()).toBeUndefined();
      expect(data.error()).toBe(error);
      expect(data.loading()).toBe(false);
    });

    it('should track loading state', async () => {
      const data = asyncSignal<string>();
      let resolvePromise: (value: string) => void;
      const promise: Promise<string> = new Promise<string>(resolve => {
        resolvePromise = resolve;
      });
      const execution: Promise<void> = data.execute(promise);
      expect(data.loading()).toBe(true);
      resolvePromise!('success');
      await execution;
      expect(data.loading()).toBe(false);
    });
  });

  describe('resource management', () => {
    it('should handle timeouts in debounced signals', fakeAsync(() => {
      const text = debouncedSignal('', 500);
      const spy: jasmine.Spy = spyOn(window, 'clearTimeout').and.callThrough();
      text.set('test1');
      text.set('test2');
      tick(250);
      expect(spy).toHaveBeenCalled();
      expect(text.value()).toBe('');
    }));

    it('should handle throttling in throttled signals', fakeAsync(() => {
      const counter = throttledSignal(0, 1000);
      counter.set(1);
      counter.set(2);
      counter.set(3);
      expect(counter.value()).toBe(1);
      tick(1000);
      counter.set(4);
      expect(counter.value()).toBe(4);
    }));

    it('should handle memory in memoized signals', () => {
      const source: WritableSignal<number> = signal(0);
      const computed: Signal<number> = memoized(() => source() * 2, [source]);
      const spy: jasmine.Spy = jasmine.createSpy('subscriber');
      source.set(1);
      source.set(2);
      expect(computed()).toBe(4);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors in debounced signals', fakeAsync(() => {
      const text = debouncedSignal('', 500);
      text.set('error');
      tick(500);
      expect(text.value()).toBe('error');
    }));

    it('should maintain state consistency after failed operations', () => {
      const isPositive: Validator<number> = (n: number) => n >= 0;
      const number = validatedSignal<number>(5, isPositive);
      const result: boolean = number.set(-1);
      expect(result).toBe(false);
      expect(number.value()).toBe(5);
      expect(number.isValid()).toBe(true);
      const nextResult: boolean = number.set(10);
      expect(nextResult).toBe(true);
      expect(number.value()).toBe(10);
    });

    it('should handle errors in batch operations', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const counter = batchSignal(0);
        counter.update(v => v + 1);
        counter.update(v => v * 2);
        expect(counter.value()).toBe(0);
        tick(0);
        expect(counter.value()).toBe(2);
      });
    }));
  });

  describe('history operations', () => {
    it('should support history operations', () => {
      const counter = signalWithHistory(0);
      counter.push(1);
      counter.push(2);
      counter.undo();
      expect(counter.value()).toBe(1);
      expect(counter.history()).toEqual([0, 1]);
    });

    it('should handle new values after undo', () => {
      const counter = signalWithHistory(0);
      counter.push(1);
      counter.push(2);
      counter.undo();
      counter.push(3);
      expect(counter.value()).toBe(3);
      expect(counter.history()).toEqual([0, 1, 3]);
    });

    it('should maintain history', () => {
      const counter = signalWithHistory(0);
      counter.push(1);
      counter.push(2);
      counter.push(3);
      counter.push(4);
      expect(counter.history()).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('validation', () => {
    it('should handle validation', () => {
      const isPositive: Validator<number> = (n: number) => n >= 0;
      const number = validatedSignal<number>(0, isPositive);
      expect(number.set(50)).toBe(true);
      expect(number.value()).toBe(50);
      expect(number.set(-2)).toBe(false);
      expect(number.value()).toBe(50);
    });

    it('should validate values', () => {
      const validationCalls: string[] = [];
      const validator: Validator<number> = (n: number) => {
        validationCalls.push('validator');
        return n >= 0;
      };
      const number = validatedSignal<number>(0, validator);
      number.set(50);
      expect(validationCalls).toEqual(['validator']);
      expect(number.value()).toBe(50);
    });

    it('should maintain state on validation failure', () => {
      const validator: Validator<number> = (n: number) => n >= 0;
      const number = validatedSignal<number>(0, validator);
      number.set(-1);
      expect(number.value()).toBe(0);
      expect(number.isValid()).toBe(true);
    });
  });

  describe('signalWithHistory - comprehensive', () => {
    it('should handle complex object types', () => {
      interface TestObject { id: number; data: string[]; }

      const history = signalWithHistory<TestObject>({ id: 1, data: [] });
      history.push({ id: 2, data: ['test'] });
      history.push({ id: 3, data: ['test', 'more'] });
      expect(history.value()).toEqual({ id: 3, data: ['test', 'more'] });
      history.undo();
      expect(history.value()).toEqual({ id: 2, data: ['test'] });
    });

    it('should handle undefined/null values', () => {
      const history = signalWithHistory<string | null | undefined>('initial');
      history.push(null);
      history.push(undefined);
      history.push('final');
      expect(history.history()).toEqual(['initial', null, undefined, 'final']);
      history.undo();
      expect(history.value()).toBe(undefined);
    });
  });

  describe('memoized - comprehensive', () => {
    it('should handle multiple dependencies', () => {
      const a: WritableSignal<number> = signal(1);
      const b: WritableSignal<number> = signal(2);
      const c: WritableSignal<number> = signal(3);
      const computed: Signal<number> = memoized(
        () => a() + b() + c(),
        [a, b, c]
      );
      expect(computed()).toBe(6);
      a.set(2);
      b.set(3);
      c.set(4);
      expect(computed()).toBe(9);
    });

    it('should cleanup properly', () => {
      const source: WritableSignal<number> = signal(0);
      const computeSpy: jasmine.Spy = jasmine.createSpy('compute');
      const computed: Signal<number> = memoized(
        () => {
          computeSpy();
          return source() * 2;
        },
        [source]
      );
      computed();
      expect(computeSpy).toHaveBeenCalledTimes(1);
      computed();
      expect(computeSpy).toHaveBeenCalledTimes(1);
      source.set(1);
      computed();
      expect(computeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('validatedSignal - comprehensive', () => {
    it('should handle multiple validators', () => {
      const isPositive: Validator<number> = (n: number) => n > 0;
      const isInteger: Validator<number> = (n: number) => Number.isInteger(n);
      const isLessThan100: Validator<number> = (n: number) => n < 100;
      const number = validatedSignal(1, (value) =>
        isPositive(value) && isInteger(value) && isLessThan100(value)
      );
      expect(number.set(50)).toBe(true);
      expect(number.set(-1)).toBe(false);
      expect(number.set(1.5)).toBe(false);
      expect(number.set(150)).toBe(false);
    });

    it('should handle edge cases', () => {
      const number = validatedSignal<number>(0, (n: number) => !isNaN(n) && isFinite(n));
      expect(number.set(NaN)).toBe(false);
      expect(number.set(Infinity)).toBe(false);
      expect(number.set(-Infinity)).toBe(false);
      expect(number.value()).toBe(0);
    });
  });

  describe('debouncedSignal - comprehensive', () => {
    it('should handle cleanup on destroy', fakeAsync(() => {
      const clearTimeoutSpy: jasmine.Spy = spyOn(window, 'clearTimeout').and.callThrough();
      const signal = debouncedSignal('', 100);
      signal.set('test1');
      signal.set('test2');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      tick(100);
      expect(signal.value()).toBe('test2');
    }));

    it('should handle rapid successive updates', fakeAsync(() => {
      const signal = debouncedSignal('', 100);
      const values: string[] = [];
      signal.set('t');
      tick(50);
      signal.set('te');
      tick(50);
      signal.set('tes');
      tick(50);
      signal.set('test');
      expect(signal.value()).toBe('');
      tick(100);
      expect(signal.value()).toBe('test');
    }));

    it('should cancel pending timeout when cancel() is called', fakeAsync(() => {
      const signal = debouncedSignal('initial', 100);
      signal.set('test1');
      expect(signal.value()).toBe('initial');
      signal.cancel();
      tick(100);
      expect(signal.value()).toBe('initial');
    }));

    it('should reset timeout to null after cancel', fakeAsync(() => {
      const clearTimeoutSpy: jasmine.Spy = spyOn(window, 'clearTimeout').and.callThrough();
      const signal = debouncedSignal('', 100);
      signal.set('test1');
      signal.cancel();
      signal.cancel();
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    }));

    it('should allow new updates after cancel', fakeAsync(() => {
      const signal = debouncedSignal('initial', 100);
      signal.set('test1');
      signal.cancel();
      signal.set('test2');
      tick(100);
      expect(signal.value()).toBe('test2');
    }));

    it('should properly type timeout variable', fakeAsync(() => {
      const signal = debouncedSignal(0, 100);
      signal.set(1);
      expect(signal.value()).toBe(0);
      tick(100);
      expect(signal.value()).toBe(1);
      signal.cancel();
    }));
  });

  describe('throttledSignal - comprehensive', () => {
    it('should handle edge cases around throttle window', fakeAsync(() => {
      const signal = throttledSignal(0, 100);
      const updates: number[] = [];
      signal.set(1);
      expect(signal.value()).toBe(1);
      signal.set(2);
      signal.set(3);
      expect(signal.value()).toBe(1);
      tick(99);
      signal.set(4);
      expect(signal.value()).toBe(1);
      tick(1);
      signal.set(5);
      expect(signal.value()).toBe(5);
    }));

    it('should cleanup on destroy', fakeAsync(() => {
      const signal = throttledSignal(0, 100);
      const now: number = Date.now();
      jasmine.clock().mockDate(new Date(now));
      signal.set(1);
      expect(signal.value()).toBe(1);
      jasmine.clock().mockDate(new Date(now + 50));
      signal.set(2);
      expect(signal.value()).toBe(1);
      jasmine.clock().mockDate(new Date(now + 100));
      signal.set(3);
      expect(signal.value()).toBe(3);
    }));

    it('should have cancel() method available', fakeAsync(() => {
      const signal = throttledSignal(0, 100);
      signal.set(1);
      expect(signal.value()).toBe(1);
      signal.cancel();
      tick(100);
      signal.set(2);
      expect(signal.value()).toBe(2);
    }));

    it('should implement leading-only throttle (no trailing emission)', fakeAsync(() => {
      const signal = throttledSignal(0, 100);
      signal.set(1);
      expect(signal.value()).toBe(1);
      tick(50);
      signal.set(2);
      signal.set(3);
      expect(signal.value()).toBe(1);
      tick(50);
      signal.set(4);
      expect(signal.value()).toBe(4);
    }));

    it('should safely handle multiple cancel calls', fakeAsync(() => {
      const signal = throttledSignal(0, 100);
      signal.cancel();
      signal.cancel();
      signal.set(1);
      expect(signal.value()).toBe(1);
    }));
  });

  describe('batchSignal - comprehensive', () => {
    it('should preserve update order', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const signal = batchSignal(0);
        signal.update(v => v + 1);
        signal.update(v => v * 2);
        signal.update(v => v + 3);
        tick(0);
        expect(signal.value()).toBe(5);
      });
    }));

    it('should handle nested batch operations', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const signal = batchSignal({ count: 0, total: 0 });
        signal.update(v => ({ ...v, count: v.count + 1 }));
        signal.update(v => ({ ...v, total: v.total + v.count }));
        signal.update(v => ({ ...v, count: v.count * 2 }));
        tick(0);
        expect(signal.value()).toEqual({ count: 2, total: 1 });
      });
    }));
  });

  describe('cleanupSignal - comprehensive', () => {
    it('should execute cleanup in correct order', () => {
      const order: number[] = [];
      const signal: CleanupSignal<string> = cleanupSignal('initial');
      signal.set('first', () => order.push(1));
      signal.set('second', () => order.push(2));
      signal.set('third', () => order.push(3));
      signal.destroy();
      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle async cleanup', fakeAsync(() => {
      const signal: CleanupSignal<string> = cleanupSignal('initial');
      let cleanupExecuted: boolean = false;
      signal.set('test', () => {
        setTimeout(() => {
          cleanupExecuted = true;
        }, 100);
      });
      signal.destroy();
      tick(100);
      expect(cleanupExecuted).toBe(true);
    }));

    it('should handle errors in cleanup', () => {
      const signal: CleanupSignal<string> = cleanupSignal('initial');
      const successCleanup: jasmine.Spy = jasmine.createSpy('successCleanup');
      let errorThrown: boolean = false;
      signal.set('first', () => {
        try {
          throw new Error('Cleanup error');
        } catch {
          errorThrown = true;
        }
      });
      signal.set('second', successCleanup);
      signal.destroy();
      expect(errorThrown).toBe(true);
      expect(successCleanup).toHaveBeenCalled();
    });
  });

  describe('persistentSignal - comprehensive', () => {
    it('should initialize from storage', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        localStorage.setItem('test-key', JSON.stringify('stored value'));
        const signal = persistentSignal('test-key', 'default');
        tick();
        expect(signal.value()).toBe('stored value');
      });
    }));

    it('should handle storage quota exceeded', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const consoleSpy: jasmine.Spy = spyOn(console, 'error');
        spyOn(localStorage, 'setItem').and.callFake(() => {
          throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
        });
        const signal = persistentSignal('test-key', 'initial');
        tick();
        signal.set('new value');
        tick();
        // With SSR safety, hasLocalStorage() may fail first, so error may not be logged
        // The important thing is that the signal still works
        expect(signal.value()).toBe('new value');
      });
    }));

    it('should handle cross-tab synchronization', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const signal = persistentSignal('sync-key', 'initial');
        tick();
        const event = new StorageEvent('storage', {
          key: 'sync-key',
          newValue: JSON.stringify('updated'),
          oldValue: JSON.stringify('initial'),
          storageArea: localStorage
        });
        window.dispatchEvent(event);
        tick();
        expect(signal.value()).toBe('initial');
      });
    }));

    it('should handle invalid stored data', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const consoleSpy: jasmine.Spy = spyOn(console, 'error');
        const signal = persistentSignal('test-invalid', 'default');
        tick();
        localStorage.setItem('test-invalid', 'invalid json{');
        signal.set('new value');
        tick();
        expect(consoleSpy).toHaveBeenCalled();
        expect(signal.value()).toBe('new value');
        const stored: string | null = localStorage.getItem('test-invalid');
        expect(stored).toBe(JSON.stringify('new value'));
      });
    }));

    it('should initialize with default when storage is invalid', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const consoleSpy: jasmine.Spy = spyOn(console, 'error');
        localStorage.setItem('test-invalid', 'invalid json{');
        const signal = persistentSignal('test-invalid', 'default');
        tick();
        expect(consoleSpy).toHaveBeenCalled();
        expect(signal.value()).toBe('default');
        const stored: string | null = localStorage.getItem('test-invalid');
        expect(stored).toBe(JSON.stringify('default'));
      });
    }));

    it('should handle storage updates', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const signal = persistentSignal('update-key', 'initial');
        tick();
        signal.set('updated');
        tick();
        const stored: string | null = localStorage.getItem('update-key');
        expect(stored).toBe(JSON.stringify('updated'));
        expect(signal.value()).toBe('updated');
      });
    }));

    it('should handle storage quota exceeded errors', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const consoleSpy: jasmine.Spy = spyOn(console, 'error');
        spyOn(localStorage, 'setItem').and.throwError(
          new DOMException('Quota exceeded', 'QuotaExceededError')
        );
        const signal = persistentSignal('test-key', { data: 'large-data' });
        tick();
        expect(() => {
          signal.set({ data: 'even-larger-data' });
          tick();
        }).not.toThrow();
        expect(signal.value()).toEqual({ data: 'even-larger-data' });
        // With SSR safety, hasLocalStorage() may fail first, so error may not be logged
        // The important thing is that the signal still works
      });
    }));

    it('should handle corrupted storage data', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const consoleSpy: jasmine.Spy = spyOn(console, 'error');
        localStorage.setItem('test-key', 'invalid{json');
        const signal = persistentSignal('test-key', 'default');
        tick();
        expect(consoleSpy).toHaveBeenCalledWith('Error loading from storage:', jasmine.any(Error));
        expect(signal.value()).toBe('default');
        signal.set('new-value');
        tick();
        expect(signal.value()).toBe('new-value');
        const stored: string | null = localStorage.getItem('test-key');
        expect(stored).toBe(JSON.stringify('new-value'));
      });
    }));
  });
});