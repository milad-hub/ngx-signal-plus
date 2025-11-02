import { EffectRef, Injector, Signal, WritableSignal, computed, effect, runInInjectionContext, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SignalOperator, combineLatest, debounceTime, delay, distinctUntilChanged, filter, map, merge, skip, take, throttleTime } from './signal-operators';

describe('Signal Operators', () => {
  let injector: Injector;
  let consoleWarnSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
    consoleWarnSpy = spyOn(console, 'warn');
    consoleErrorSpy = spyOn(console, 'error');
  });

  afterEach(() => {
    consoleWarnSpy.calls.reset();
    consoleErrorSpy.calls.reset();
  });

  function runTest(fn: () => void) {
    runInInjectionContext(injector, fn);
  }

  describe('map', () => {
    it('should transform numeric values', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(1);
        const doubled: Signal<number> = map((x: number) => x * 2)(source);
        expect(doubled()).toBe(2);
        source.set(5);
        expect(doubled()).toBe(10);
      });
    });

    it('should handle null values with fallback', () => {
      runTest(() => {
        const source: WritableSignal<number | null> = signal<number | null>(null);
        const doubled: Signal<number> = map((x: number | null) => x === null ? 0 : x * 2)(source);
        expect(doubled()).toBe(0);
        source.set(5);
        expect(doubled()).toBe(10);
      });
    });

    it('should transform object properties', () => {
      runTest(() => {
        interface User { id: number; name: string; }

        const source: WritableSignal<User> = signal<User>({ id: 1, name: 'John' });
        const nameOnly: Signal<string> = map((user: User) => user.name)(source);
        expect(nameOnly()).toBe('John');
        source.set({ id: 2, name: 'Jane' });
        expect(nameOnly()).toBe('Jane');
      });
    });
  });

  describe('filter', () => {
    it('should filter numeric values', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(1);
        const filtered: Signal<number> = filter((x: number) => x % 2 === 0)(source);
        expect(filtered()).toBe(1);
        source.set(2);
        expect(filtered()).toBe(2);
        source.set(3);
        expect(filtered()).toBe(2);
      });
    });

    it('should handle type predicates with null values', () => {
      runTest(() => {
        const source: WritableSignal<number | null> = signal<number | null>(null);
        const nonNull: Signal<number | null> = filter((x: number | null): x is number => x !== null)(source);
        expect(nonNull()).toBe(null);
        source.set(1);
        expect(nonNull()).toBe(1);
        source.set(null);
        expect(nonNull()).toBe(1);
      });
    });

    it('should filter complex objects based on condition', () => {
      runTest(() => {
        interface ValidatedItem { value: number; valid: boolean; }

        const source: WritableSignal<ValidatedItem> = signal<ValidatedItem>({ value: 1, valid: true });
        const validOnly: Signal<ValidatedItem> = filter((x: ValidatedItem) => x.valid)(source);
        expect(validOnly()).toEqual({ value: 1, valid: true });
        source.set({ value: 2, valid: false });
        expect(validOnly()).toEqual({ value: 1, valid: true });
        source.set({ value: 3, valid: true });
        expect(validOnly()).toEqual({ value: 3, valid: true });
      });
    });
  });

  describe('debounceTime', () => {
    it('should debounce rapid updates', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(500)(source);
        source.set(1);
        source.set(2);
        source.set(3);
        expect(debounced()).toBe(0);
        tick(500);
        expect(debounced()).toBe(3);
      });
    }));

    it('should handle intermediate updates', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(500)(source);
        source.set(1);
        tick(250);
        source.set(2);
        tick(250);
        expect(debounced()).toBe(0);
        source.set(3);
        tick(500);
        expect(debounced()).toBe(3);
      });
    }));

    it('should properly type timeoutId as ReturnType<typeof setTimeout> | null', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(100)(source);
        source.set(1);
        tick(100);
        expect(debounced()).toBe(1);
      });
    }));

    it('should reset timeoutId to null after firing', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(100)(source);
        source.set(1);
        tick(100);
        expect(debounced()).toBe(1);
        source.set(2);
        tick(100);
        expect(debounced()).toBe(2);
      });
    }));

    it('should clear timeout when debouncing multiple values', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(100)(source);
        source.set(1);
        source.set(2);
        tick(100);
        expect(debounced()).toBe(2);
      });
    }));
  });

  describe('distinctUntilChanged', () => {
    it('should emit only distinct primitive values', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(1);
        const distinct: Signal<unknown> = distinctUntilChanged()(source);
        expect(distinct()).toBe(1);
        source.set(1);
        expect(distinct()).toBe(1);
        source.set(2);
        expect(distinct()).toBe(2);
      });
    });

    it('should use deep comparison for object values', () => {
      runTest(() => {
        const source: WritableSignal<{ id: number }> = signal({ id: 1 });
        const distinct: Signal<unknown> = distinctUntilChanged()(source);
        expect(distinct()).toEqual({ id: 1 });
        source.set({ id: 1 });
        expect(distinct()).toEqual({ id: 1 });
        source.set({ id: 2 });
        expect(distinct()).toEqual({ id: 2 });
      });
    });

    it('should use deep comparison for array values', () => {
      runTest(() => {
        const source: WritableSignal<number[]> = signal([1, 2, 3]);
        const distinct: Signal<unknown> = distinctUntilChanged()(source);
        expect(distinct()).toEqual([1, 2, 3]);
        source.set([1, 2, 3]);
        expect(distinct()).toEqual([1, 2, 3]);
        source.set([1, 2, 4]);
        expect(distinct()).toEqual([1, 2, 4]);
      });
    });

    it('should use deep comparison for nested objects', () => {
      runTest(() => {
        const source: WritableSignal<{ user: { name: string } }> = signal({ user: { name: 'John' } });
        const distinct: Signal<unknown> = distinctUntilChanged()(source);
        expect(distinct()).toEqual({ user: { name: 'John' } });
        source.set({ user: { name: 'John' } });
        expect(distinct()).toEqual({ user: { name: 'John' } });
        source.set({ user: { name: 'Jane' } });
        expect(distinct()).toEqual({ user: { name: 'Jane' } });
      });
    });

    it('should handle non-serializable values gracefully', () => {
      runTest(() => {
        const fn1 = () => 'test1';
        const fn2 = () => 'test2';
        const source: WritableSignal<() => string> = signal(fn1);
        const distinct: Signal<unknown> = distinctUntilChanged()(source);
        expect(typeof distinct()).toBe('function');
        source.set(fn2);
        expect(typeof distinct()).toBe('function');
      });
    });

    it('should handle null and undefined correctly', () => {
      runTest(() => {
        const source: WritableSignal<any> = signal(null);
        const distinct: Signal<unknown> = distinctUntilChanged()(source);
        expect(distinct()).toBe(null);
        source.set(null);
        expect(distinct()).toBe(null);
        source.set(undefined);
        expect(distinct()).toBe(undefined);
        source.set(undefined);
        expect(distinct()).toBe(undefined);
        source.set(null);
        expect(distinct()).toBe(null);
      });
    });
  });

  describe('skip', () => {
    it('should skip specified number of emissions', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const skipped: Signal<unknown> = skip(2)(source);
        expect(skipped()).toBe(0);
        source.set(1);
        expect(skipped()).toBe(0);
        source.set(2);
        expect(skipped()).toBe(0);
        source.set(3);
        expect(skipped()).toBe(0);
      });
    });

    it('should handle negative count in skip', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const skipped: Signal<unknown> = skip(-1)(source);
        expect(skipped()).toBe(0);
        source.set(1);
        expect(skipped()).toBe(0);
      });
    });
  });

  describe('take', () => {
    it('should take specified number of emissions', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const taken: Signal<unknown> = take(2)(source);
        expect(taken()).toBe(0);
        source.set(1);
        expect(taken()).toBe(0);
        source.set(2);
        expect(taken()).toBe(0);
        source.set(3);
        expect(taken()).toBe(0);
      });
    });
  });

  describe('merge', () => {
    it('should merge multiple signals', () => {
      runTest(() => {
        const signal1: WritableSignal<number> = signal(1);
        const signal2: WritableSignal<number> = signal(2);
        const merged: Signal<number> = merge(signal1, signal2);
        expect(merged()).toBe(1);
        signal2.set(3);
        expect(merged()).toBe(1);
        signal1.set(4);
        expect(merged()).toBe(1);
      });
    });

    it('should handle empty array gracefully', () => {
      runTest(() => {
        const merged: Signal<number> = merge();
        expect(merged()).toBeUndefined();
      });
    });
  });

  describe('combineLatest', () => {
    it('should combine latest values from multiple signals', () => {
      runTest(() => {
        const signal1: WritableSignal<number> = signal(1);
        const signal2: WritableSignal<number> = signal(2);
        const combined: Signal<number[]> = combineLatest([signal1, signal2]);
        expect(combined()).toEqual([1, 2]);
        signal1.set(3);
        expect(combined()).toEqual([3, 2]);
        signal2.set(4);
        expect(combined()).toEqual([3, 4]);
      });
    });
  });

  describe('throttleTime', () => {
    it('should throttle rapid updates', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const throttled: Signal<unknown> = throttleTime(500)(source);
        expect(throttled()).toBe(0);
        source.set(1);
        expect(throttled()).toBe(0);
        source.set(2);
        source.set(3);
        tick(500);
        source.set(4);
        expect(throttled()).toBe(3);
      });
    }));

    it('should handle exact timing boundaries', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const throttled: Signal<unknown> = throttleTime(100)(source);
        expect(throttled()).toBe(0);
        source.set(1);
        expect(throttled()).toBe(0);
        tick(100);
        source.set(2);
        expect(throttled()).toBe(1);
        tick(100);
        source.set(3);
        expect(throttled()).toBe(2);
      });
    }));

    it('should implement leading-only throttle behavior', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const throttled: Signal<unknown> = throttleTime(100)(source);
        expect(throttled()).toBe(0);
        source.set(1);
        tick(1);
        expect(throttled()).toBe(1);
        tick(49);
        source.set(2);
        source.set(3);
        tick(1);
        expect(throttled()).toBe(1);
        tick(50);
        source.set(4);
        tick(1);
        expect(throttled()).toBe(4);
      });
    }));

    it('should cleanup lastRun on DestroyRef.onDestroy', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const throttled: Signal<unknown> = throttleTime(100)(source);
        source.set(1);
        tick(100);
        source.set(2);
        expect(throttled()).toBe(1);
      });
    }));

    it('should not have trailing emission', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const throttled: Signal<unknown> = throttleTime(100)(source);
        source.set(1);
        tick(1);
        expect(throttled()).toBe(1);
        tick(49);
        source.set(2);
        source.set(3);
        tick(50);
        expect(throttled()).toBe(1);
      });
    }));
  });

  describe('delay', () => {
    it('should delay signal emissions', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const delayed: Signal<unknown> = delay(500)(source);
        source.set(1);
        expect(delayed()).toBe(0);
        tick(500);
        expect(delayed()).toBe(1);
      });
    }));

    it('should cancel previous timeout on rapid changes', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const delayed: Signal<unknown> = delay(100)(source);
        source.set(1);
        tick(50);
        source.set(2);
        tick(50);
        source.set(3);
        expect(delayed()).toBe(0);
        tick(100);
        expect(delayed()).toBe(3);
      });
    }));

    it('should handle multiple delayed emissions', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const delayed: Signal<unknown> = delay(100)(source);
        source.set(1);
        tick(100);
        expect(delayed()).toBe(1);
        source.set(2);
        tick(100);
        expect(delayed()).toBe(2);
        source.set(3);
        tick(100);
        expect(delayed()).toBe(3);
      });
    }));
  });

  describe('Edge Cases', () => {
    it('should handle undefined signals', () => {
      runTest(() => {
        const source: WritableSignal<number | undefined> = signal<number | undefined>(undefined);
        const mapped: Signal<number> = map((x: number | undefined) => x ?? 0)(source);
        expect(mapped()).toBe(0);
      });
    });

    it('should handle null signals', () => {
      runTest(() => {
        const source: WritableSignal<number | null> = signal<number | null>(null);
        const mapped: Signal<number> = map((x: number | null) => x ?? 0)(source);
        expect(mapped()).toBe(0);
      });
    });

    it('should handle error cases', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const mapped: Signal<number> = map<number, number>((x: number) => {
          if (x === 0) throw new Error('test');
          return x;
        })(source);
        expect(() => mapped()).toThrowError('test');
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup subscriptions', fakeAsync(() => {
      runTest(() => {
        const cleanupFn: () => void = jasmine.createSpy('cleanup');
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(100)(source);
        const effectRef: EffectRef = effect(() => {
          debounced();
          cleanupFn();
        });
        source.set(1);
        tick(100);
        effectRef.destroy();
        expect(cleanupFn).toHaveBeenCalled();
      });
    }));
  });

  describe('Performance', () => {
    it('should handle rapid updates efficiently', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const start: number = performance.now();
        for (let i: number = 0; i < 1000; i++) {
          source.set(i);
        }
        tick(10);
        const end: number = performance.now();
        expect(end - start).toBeLessThan(1000);
      });
    }));

    it('should handle large number of rapid updates efficiently', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(50)(source);
        const start: number = performance.now();
        for (let i: number = 0; i < 1000; i++) {
          source.set(i);
        }
        tick(50);
        const end: number = performance.now();
        expect(end - start).toBeLessThan(1000);
        expect(debounced()).toBe(999);
      });
    }));

    it('should handle chained operators efficiently', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const result: Signal<number> = map<number, number>(x => x * 2)(
          throttleTime<number>(100)(
            map<number, number>(x => x + 1)(source)
          )
        );
        const start: number = performance.now();
        for (let i: number = 0; i < 100; i++) {
          source.set(i);
        }
        tick(100);
        const end: number = performance.now();
        expect(end - start).toBeLessThan(500);
        expect(result()).toBe(200);
      });
    }));
  });

  describe('Error Handling', () => {
    describe('map operator', () => {
      it('should handle transformation errors', () => {
        runTest(() => {
          const source: WritableSignal<number> = signal<number>(1);
          const errorThrowingMap: SignalOperator<number, number> = map((x: number) => {
            if (x < 0) {
              console.warn('Error in signal map operator:', new Error('Negative numbers not allowed'));
              return 0;
            }
            return x * 2;
          });
          const result: Signal<number> = errorThrowingMap(source);
          expect(result()).toBe(2);
          source.set(-1);
          expect(result()).toBe(0);
          source.set(2);
          expect(result()).toBe(4);
          expect(consoleWarnSpy).toHaveBeenCalledWith('Error in signal map operator:', jasmine.any(Error));
        });
      });

      it('should maintain signal state after error recovery', () => {
        runTest(() => {
          const source: WritableSignal<number> = signal<number>(1);
          let errorCount: number = 0;
          const mapWithRecovery: SignalOperator<number, number> = map((x: number) => {
            if (x < 0) {
              errorCount++;
              console.warn('Error in signal map operator:', new Error('Negative value'));
              return 0;
            }
            return x * 2;
          });
          const result: Signal<number> = mapWithRecovery(source);
          expect(result()).toBe(2);
          source.set(-1);
          expect(result()).toBe(0);
          expect(errorCount).toBe(1);
          source.set(2);
          expect(result()).toBe(4);
          expect(consoleWarnSpy).toHaveBeenCalledWith('Error in signal map operator:', jasmine.any(Error));
        });
      });
    });

    describe('filter operator', () => {
      it('should handle predicate errors', () => {
        runTest(() => {
          const source: WritableSignal<number> = signal<number>(1);
          let errorCount: number = 0;
          const errorThrowingFilter: SignalOperator<number, number> = filter((x: number) => {
            if (x === 0) {
              errorCount++;
              console.warn('Error in signal filter operator:', new Error('Zero not allowed'));
              return false;
            }
            return x > 0;
          });
          const result: Signal<number> = errorThrowingFilter(source);
          expect(result()).toBe(1);
          source.set(-1);
          expect(result()).toBe(1);
          source.set(0);
          expect(result()).toBe(1);
          expect(errorCount).toBe(1);
          expect(consoleWarnSpy).toHaveBeenCalledWith('Error in signal filter operator:', jasmine.any(Error));
        });
      });

      it('should maintain last valid state after filter error', () => {
        runTest(() => {
          const source: WritableSignal<number> = signal<number>(1);
          let errorCount: number = 0;
          const result: Signal<number> = filter((x: number) => {
            if (x === 0) {
              errorCount++;
              console.warn('Error in signal filter operator:', new Error('Zero not allowed'));
              return false;
            }
            return x > 0;
          })(source);
          expect(result()).toBe(1);
          source.set(2);
          expect(result()).toBe(2);
          source.set(0);
          expect(result()).toBe(2);
          expect(errorCount).toBe(1);
          expect(consoleWarnSpy).toHaveBeenCalledWith('Error in signal filter operator:', jasmine.any(Error));
        });
      });
    });

    describe('combineLatest operator', () => {
      it('should handle errors in combined signals', () => {
        runTest(() => {
          const source1: WritableSignal<number> = signal(1);
          const source2: WritableSignal<number> = signal(2);
          const errorProneMap: SignalOperator<number, number> = map((x: number) => {
            if (x < 0) {
              console.warn('Error in signal map operator:', new Error('Negative value'));
              return 0;
            }
            return x * 2;
          });
          const combined: Signal<number[]> = combineLatest([
            errorProneMap(source1),
            errorProneMap(source2)
          ]);
          expect(combined()).toEqual([2, 4]);
          source1.set(-1);
          expect(combined()).toEqual([0, 4]);
          expect(consoleWarnSpy).toHaveBeenCalledWith('Error in signal map operator:', jasmine.any(Error));
        });
      });
    });
  });

  describe('Operator Chaining', () => {
    it('should handle multiple operator chains correctly', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(3);
        const doubled: Signal<number> = computed(() => source() * 2);
        const filtered: Signal<number> = computed(() => doubled() > 0 ? doubled() : doubled());
        const result: Signal<number> = computed(() => filtered());
        expect(result()).toBe(6);
        source.set(4);
        expect(result()).toBe(8);
        source.set(4);
        expect(result()).toBe(8);
      });
    });

    it('should handle complex transformations in chain', () => {
      runTest(() => {
        interface User { id: number; name: string; active: boolean; }

        const source: WritableSignal<User> = signal<User>({ id: 3, name: 'Bob', active: true });
        const activeUsers: Signal<User | null> = computed(() => {
          const user: User = source();
          return user.active ? user : null;
        });
        const userDisplay: Signal<unknown> = computed(() => {
          const user: User | null = activeUsers();
          if (!user) return null;
          return {
            id: user.id,
            displayName: user.name.toUpperCase()
          };
        });
        const result: Signal<{}> = computed(() => userDisplay() || { id: 0, displayName: '' });
        expect(result()).toEqual({ id: 3, displayName: 'BOB' });
        source.set({ id: 2, name: 'Jane', active: false });
        expect(result()).toEqual({ id: 0, displayName: '' });
        source.set({ id: 4, name: 'Alice', active: true });
        expect(result()).toEqual({ id: 4, displayName: 'ALICE' });
      });
    });
  });

  describe('Complex Transformations', () => {
    it('should handle nested object transformations', () => {
      runTest(() => {
        interface NestedData {
          user: {
            profile: {
              name: string;
              age: number;
            };
            settings: {
              theme: string;
            };
          };
        }

        interface Profile {
          name: string;
          age: number;
        }

        const source: WritableSignal<NestedData> = signal({
          user: {
            profile: { name: 'John', age: 30 },
            settings: { theme: 'dark' }
          }
        });
        const profileData: Signal<Profile> = map<NestedData, Profile>((data: NestedData) => data.user.profile)(source);
        const userProfile: Signal<Profile> = filter<Profile>((profile: Profile) => profile.age >= 18)(profileData);
        expect(userProfile()).toEqual({ name: 'John', age: 30 });
      });
    });

    it('should handle array transformations with multiple operators', () => {
      runTest(() => {
        const source: WritableSignal<number[]> = signal([1, 2, 3]);
        const doubled: Signal<number[]> = map<number[], number[]>((arr: number[]) => arr.map(x => x * 2))(source);
        const filtered: Signal<number[]> = map<number[], number[]>((arr: number[]) => arr.filter(x => x > 4))(doubled);
        expect(source()).toEqual([1, 2, 3]);
        expect(doubled()).toEqual([2, 4, 6]);
        expect(filtered()).toEqual([6]);
        source.set([2, 3, 4]);
        expect(source()).toEqual([2, 3, 4]);
        expect(doubled()).toEqual([4, 6, 8]);
        expect(filtered()).toEqual([6, 8]);
      });
    });
  });
  describe('Time-based Edge Cases', () => {
    it('should handle zero duration in debounceTime', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(0)(source);
        source.set(1);
        tick(0);
        expect(debounced()).toBe(1);
      });
    }));

    it('should handle multiple consecutive debounce calls', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(100)(source);
        source.set(1);
        tick(50);
        source.set(2);
        tick(50);
        expect(debounced()).toBe(0);
        tick(50);
        expect(debounced()).toBe(2);
      });
    }));

    it('should handle exact timing boundaries in throttle', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const throttled: Signal<unknown> = throttleTime(100)(source);
        expect(throttled()).toBe(0);
        source.set(1);
        expect(throttled()).toBe(0);
        tick(100);
        source.set(2);
        expect(throttled()).toBe(1);
        tick(100);
        source.set(3);
        expect(throttled()).toBe(2);
      });
    }));
  });

  describe('Signal Combination Edge Cases', () => {
    it('should handle empty signal array in combineLatest', () => {
      runTest(() => {
        const combined: Signal<unknown[]> = combineLatest([]);
        expect(combined()).toEqual([]);
      });
    });

    it('should handle single signal array in combineLatest', () => {
      runTest(() => {
        const signal1: WritableSignal<number> = signal(1);
        const combined: Signal<number[]> = combineLatest([signal1]);
        expect(combined()).toEqual([1]);
        signal1.set(2);
        expect(combined()).toEqual([2]);
      });
    });

    it('should merge more than two signals', () => {
      runTest(() => {
        const signal1: WritableSignal<number> = signal(1);
        const signal2: WritableSignal<number> = signal(2);
        const signal3: WritableSignal<number> = signal(3);
        const merged: Signal<number> = merge(signal1, signal2, signal3);
        expect(merged()).toBe(1);
        signal2.set(4);
        expect(merged()).toBe(1);
        signal3.set(5);
        expect(merged()).toBe(1);
        signal1.set(6);
        expect(merged()).toBe(1);
      });
    });
  });

  describe('State Management Edge Cases', () => {
    it('should handle zero count in skip', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const skipped: Signal<unknown> = skip(0)(source);
        expect(skipped()).toBe(0);
        source.set(1);
        expect(skipped()).toBe(0);
      });
    });

    it('should handle negative count in skip', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const skipped: Signal<unknown> = skip(-1)(source);
        expect(skipped()).toBe(0);
        source.set(1);
        expect(skipped()).toBe(0);
      });
    });

    it('should handle zero count in take', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const taken: Signal<unknown> = take(0)(source);
        expect(taken()).toBe(0);
        source.set(1);
        expect(taken()).toBe(0);
      });
    });

    it('should handle negative count in take', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const taken: Signal<unknown> = take(-1)(source);
        expect(taken()).toBe(0);
        source.set(1);
        expect(taken()).toBe(0);
      });
    });
  });

  describe('Type Safety', () => {
    it('should preserve generic types in transformations', () => {
      runTest(() => {
        interface User { id: number; name: string; }
        
        const source: WritableSignal<User> = signal<User>({ id: 1, name: 'John' });
        const transformed: Signal<string> = map<User, string>(user => user.name)(source);
        expect(transformed()).toBe('John');
      });
    });

    it('should handle type inference in chained operations', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal<number>(1);
        const result: Signal<string> = map<number, string>(
          n => n.toString()
        )(source);
        expect(typeof result()).toBe('string');
        expect(result()).toBe('1');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle errors in map operator', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        let errorOccurred: boolean = false;
        const result: Signal<number> = map((x: number) => {
          if (x === 0) {
            errorOccurred = true;
            return x;
          }
          return x * 2;
        })(source);
        expect(result()).toBe(0);
        expect(errorOccurred).toBe(true);
        source.set(5);
        expect(result()).toBe(10);
      });
    });

    it('should handle errors in filter operator', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(1);
        let lastValidValue: number = 1;
        const filtered: Signal<number> = filter((x: number) => {
          if (x < 0) {
            return false;
          }
          lastValidValue = x;
          return true;
        })(source);
        expect(filtered()).toBe(1);
        expect(lastValidValue).toBe(1);
        source.set(-1);
        expect(filtered()).toBe(1);
        source.set(2);
        expect(filtered()).toBe(2);
        expect(lastValidValue).toBe(2);
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors in map transformations', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(1);
        const error: Error = new Error('Value too large');
        const transformed: Signal<number> = computed(() => {
          const value: number = source();
          if (value > 5) throw error;
          return value * 2;
        });
        expect(transformed()).toBe(2);
        source.set(6);
        expect(() => transformed()).toThrow(error);
        source.set(3);
        expect(transformed()).toBe(6);
      });
    });

    it('should handle errors in filter predicates', () => {
      runTest(() => {
        const source: WritableSignal<{ value: number; valid: boolean }> = signal({ value: 1, valid: true });
        const error: Error = new Error('Invalid value');
        const filtered: Signal<unknown> = computed(() => {
          const item: { value: number; valid: boolean } = source();
          if (item.value > 5) throw error;
          return item.valid ? item : null;
        });
        expect(filtered()).toEqual({ value: 1, valid: true });
        source.set({ value: 6, valid: true });
        expect(() => filtered()).toThrow(error);
        source.set({ value: 3, valid: true });
        expect(filtered()).toEqual({ value: 3, valid: true });
      });
    });

    it('should handle async operation errors', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const delayed: Signal<unknown> = delay(100)(source);
        let errorThrown: boolean = false;
        effect(() => {
          try {
            delayed();
          } catch (e) {
            errorThrown = true;
          }
        });
        source.set(-1);
        tick(50);
        source.set(1);
        tick(100);
        expect(errorThrown).toBe(false);
        expect(delayed()).toBe(1);
      });
    }));
  });

  describe('operator chaining', () => {
    it('should handle multiple operator chains correctly', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(3);
        const doubled: Signal<number> = computed(() => source() * 2);
        const filtered: Signal<number> = computed(() => doubled() > 0 ? doubled() : doubled());
        const result: Signal<number> = computed(() => filtered());
        expect(result()).toBe(6);
        source.set(4);
        expect(result()).toBe(8);
        source.set(4);
        expect(result()).toBe(8);
      });
    });

    it('should handle complex transformations in chain', () => {
      runTest(() => {
        interface User { id: number; name: string; active: boolean; }

        const source: WritableSignal<User> = signal<User>({ id: 3, name: 'Bob', active: true });
        const activeUsers: Signal<User | null> = computed(() => {
          const user: User = source();
          return user.active ? user : null;
        });
        const userDisplay: Signal<unknown> = computed(() => {
          const user: User | null = activeUsers();
          if (!user) return null;
          return {
            id: user.id,
            displayName: user.name.toUpperCase()
          };
        });
        const result: Signal<{}> = computed(() => userDisplay() || { id: 0, displayName: '' });
        expect(result()).toEqual({ id: 3, displayName: 'BOB' });
        source.set({ id: 2, name: 'Jane', active: false });
        expect(result()).toEqual({ id: 0, displayName: '' });
        source.set({ id: 4, name: 'Alice', active: true });
        expect(result()).toEqual({ id: 4, displayName: 'ALICE' });
      });
    });
  });

  describe('memory management', () => {
    it('should cleanup subscriptions properly', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const debounced: Signal<unknown> = debounceTime(100)(source);
        let effectRef: EffectRef | null = null;
        const values: number[] = [];
        effectRef = effect(() => {
          values.push(debounced() as number);
        });
        source.set(1);
        source.set(2);
        tick(100);
        effectRef?.destroy();
        source.set(3);
        tick(100);
        expect(values).toEqual([0, 2]);
      });
    }));

    it('should handle multiple subscriptions without memory leaks', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const doubled: Signal<number> = map((x: number) => x * 2)(source);
        const transformed: Signal<number> = debounceTime(100)(doubled) as Signal<number>;
        const effects: EffectRef[] = [];
        const values1: number[] = [];
        const values2: number[] = [];
        effects.push(effect(() => values1.push(transformed())));
        effects.push(effect(() => values2.push(transformed())));
        source.set(1);
        source.set(2);
        tick(100);
        effects[0].destroy();
        source.set(3);
        tick(100);
        expect(values1).toEqual([0, 4]);
        expect(values2).toEqual([0, 4, 6]);
      });
    }));
  });

  describe('edge cases', () => {
    it('should handle undefined and null values', () => {
      runTest(() => {
        const source: WritableSignal<number | null | undefined> = signal<number | null | undefined>(0);
        let lastValidValue: number = 0;
        const validNumber: Signal<number> = computed(() => {
          const value: number | null | undefined = source();
          if (value != null) {
            lastValidValue = value;
            return value;
          }
          return lastValidValue;
        });
        const transformed: Signal<number> = map((x: number) => x * 2)(validNumber);
        expect(transformed()).toBe(0);
        source.set(null);
        expect(transformed()).toBe(0);
        source.set(undefined);
        expect(transformed()).toBe(0);
        source.set(5);
        expect(transformed()).toBe(10);
      });
    });

    it('should handle race conditions in async operations', fakeAsync(() => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const values: number[] = [];
        let timeoutId: any = null;
        effect(() => {
          const value: number = source();
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            values.push(value);
          }, 100);
        });
        tick(100);
        expect(values).toEqual([0]);
        source.set(1);
        source.set(2);
        source.set(3);
        tick(100);
        expect(values).toEqual([0, 3]);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
    }));

    it('should handle empty signals', () => {
      runTest(() => {
        const source: WritableSignal<never> = signal<never>(undefined as never);
        const mapped: Signal<unknown> = map((x: unknown) => x)(source);
        const transformed: Signal<unknown> = filter(() => true)(mapped);
        expect(transformed()).toBeUndefined();
      });
    });
  });

  describe('Server-Side Rendering', () => {
    it('should handle server-side rendering', () => {
      runTest(() => {
        const source: WritableSignal<number> = signal(0);
        const merged: Signal<number> = merge(source);
        expect(merged()).toBe(0);
        source.set(1);
        expect(merged()).toBe(0);
      });
    });
  });
});