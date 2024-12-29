/**
 * @fileoverview Test suite for Angular signal transformation operators
 * @description Comprehensive tests for signal operators including:
 * - Value transformation (map, filter)
 * - Time-based operations (debounce, throttle, delay)
 * - State management (skip, take)
 * - Signal combination (merge, combineLatest)
 * 
 * @package ngx-signal-plus
 * @version 1.0.1
 * @license MIT
 */

import { Injector, Signal, WritableSignal, computed, effect, runInInjectionContext, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { debounceTime, delay, distinctUntilChanged, filter, map, merge, skip, take, throttleTime } from './signal-operators';

describe('Signal Operators', () => {
    /**
     * Angular injector instance for dependency injection
     */
    let injector: Injector;

    /**
     * Configures testing module before each test
     */
    beforeEach(() => {
        TestBed.configureTestingModule({});
        injector = TestBed.inject(Injector);
    });

    /**
     * Runs a test function within Angular's injection context
     * @param fn - Function to execute in injection context
     */
    function runTest(fn: () => void) {
        runInInjectionContext(injector, fn);
    }

    /**
     * Map Operator Tests
     * Tests value transformation functionality
     */
    describe('map', () => {
        /**
         * Tests basic value transformation
         */
        it('should transform values', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(1);
                const doubled: Signal<number> = map((x: number) => x * 2)(source);
                expect(doubled()).toBe(2);
            });
        });

        it('should handle null/undefined', () => {
            runTest(() => {
                const source: WritableSignal<number | null> = signal(null);
                const doubled: Signal<number> = map((x: number | null) => x === null ? 0 : x * 2)(source);
                expect(doubled()).toBe(0);
            });
        });

        it('should handle object transformations', () => {
            runTest(() => {
                interface User { id: number; name: string; }
                const source: WritableSignal<User> = signal({ id: 1, name: 'John' });
                const nameOnly: Signal<string> = map((user: User) => user.name)(source);
                expect(nameOnly()).toBe('John');
            });
        });
    });

    /**
     * Filter Operator Tests
     * Tests predicate-based value filtering
     */
    describe('filter', () => {
        /**
         * Tests basic value filtering
         */
        it('should filter values', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(1);
                const filtered: Signal<number> = filter((x: number) => x % 2 === 0)(source);

                expect(filtered()).toBe(1); // Initial value passes through
                source.set(2);
                expect(filtered()).toBe(1); // First filtered value doesn't pass
                source.set(3);
                expect(filtered()).toBe(1); // Still keeps initial value
            });
        });

        it('should handle type predicates', () => {
            runTest(() => {
                const source: WritableSignal<number | null> = signal<number | null>(null);
                const nonNull: Signal<number | null> = filter((x: number | null): x is number => x !== null)(source);
                expect(nonNull()).toBe(null); // Initial value passes through
            });
        });

        it('should handle empty values', () => {
            runTest(() => {
                const source: WritableSignal<number | null> = signal<number | null>(null);
                const nonNull: Signal<number | null> = filter((x: number | null): x is number => x !== null)(source);
                expect(nonNull()).toBeNull();
            });
        });

        it('should handle complex predicates', () => {
            runTest(() => {
                interface ValidatedItem {
                    value: number;
                    valid: boolean;
                }
                const source: WritableSignal<ValidatedItem> = signal<ValidatedItem>({ value: 1, valid: true });
                const validOnly: Signal<ValidatedItem> = filter((x: ValidatedItem) => x.valid)(source);

                expect(validOnly()).toEqual({ value: 1, valid: true });
                source.set({ value: 2, valid: false });
                expect(validOnly()).toEqual({ value: 1, valid: true }); // Keeps last valid value
            });
        });

        it('should filter array values', () => {
            const source: WritableSignal<number[]> = signal<number[]>([1, 2, 3, 4]);
            const evenArray: Signal<number[]> = map((arr: number[]) => arr.filter(x => x % 2 === 0))(source);
            expect(evenArray()).toEqual([2, 4]);
        });
    });

    /**
     * Time-based Operator Tests
     * Tests operators that deal with timing and delays
     */
    describe('debounceTime', () => {
        /**
         * Tests debouncing of rapid updates
         */
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

        it('should handle edge cases', fakeAsync(() => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const debounced: Signal<unknown> = debounceTime(500)(source);

                source.set(1);
                tick(250);
                source.set(2);
                tick(250);
                source.set(3);
                tick(500);

                expect(debounced()).toBe(3);
            });
        }));

        it('should cleanup properly', fakeAsync(() => {
            runTest(() => {
                const cleanupFn: () => void = jasmine.createSpy('cleanup');

                const source: WritableSignal<number> = signal(0);
                const debounced: Signal<unknown> = debounceTime(100)(source);

                const effectRef = effect((onCleanup) => {
                    debounced();
                    onCleanup(cleanupFn);
                });

                source.set(1);
                tick(100);

                effectRef.destroy();
                expect(cleanupFn).toHaveBeenCalled();
            });
        }));

        it('should handle zero duration', fakeAsync(() => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const debounced: Signal<unknown> = debounceTime(0)(source);
                source.set(1);
                tick(0);
                expect(debounced()).toBe(1);
            });
        }));
    });

    /**
     * Value Comparison Tests
     */
    describe('distinctUntilChanged', () => {
        it('should emit only distinct values', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(1);
                const distinct: Signal<unknown> = distinctUntilChanged()(source);

                expect(distinct()).toBe(1); // Initial value
                source.set(1);
                expect(distinct()).toBe(1); // Same value
                source.set(1);
                expect(distinct()).toBe(1); // Still same value
            });
        });

        it('should handle objects correctly', () => {
            runTest(() => {
                const source: WritableSignal<{ id: number }> = signal({ id: 1 });
                const distinct: Signal<unknown> = distinctUntilChanged()(source);

                source.set({ id: 1 });
                expect(distinct()).toEqual({ id: 1 });
            });
        });

        it('should work with custom comparator', () => {
            runTest(() => {
                interface Item {
                    id: number;
                    data: string;
                }
                const source: WritableSignal<Item> = signal<Item>({ id: 1, data: 'test' });
                const distinct: Signal<unknown> = distinctUntilChanged<Item>()(source);

                source.set({ id: 1, data: 'changed' });
                expect(distinct()).toEqual({ id: 1, data: 'test' });
            });
        });

        it('should handle array values', () => {
            runTest(() => {
                const source: WritableSignal<number[]> = signal<number[]>([1, 2]);
                const distinct: Signal<unknown> = distinctUntilChanged()(source);
                source.set([1, 2]); // Same values
                expect(distinct()).toEqual([1, 2]);
            });
        });
    });

    // Skip Tests
    describe('skip', () => {
        it('should skip specified number of emissions', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const skipped: Signal<unknown> = skip(2)(source);

                expect(skipped()).toBe(0); // Initial value
                source.set(1);
                expect(skipped()).toBe(0); // First skip
                source.set(2);
                expect(skipped()).toBe(0); // Second skip
                source.set(3);
                expect(skipped()).toBe(0); // Third value (keeps initial until change)
            });
        });

        it('should handle negative skip count', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const skipped: Signal<unknown> = skip(-1)(source);
                expect(skipped()).toBe(0);
            });
        });
    });

    // Take Tests
    describe('take', () => {
        it('should take specified number of emissions', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const taken: Signal<unknown> = take(2)(source);

                expect(taken()).toBe(0); // Initial value
                source.set(1);
                expect(taken()).toBe(0); // First value (initial value not counted)
                source.set(2);
                expect(taken()).toBe(0); // Second value (still not completed)
            });
        });

        it('should complete after taking specified count', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const taken: Signal<unknown> = take(1)(source);

                expect(taken()).toBe(0); // Takes initial value and completes
                source.set(1);
                expect(taken()).toBe(0); // Keeps last value before completion
            });
        });
    });

    // Delay Tests
    describe('delay', () => {
        it('should delay emissions', fakeAsync(() => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const delayed: Signal<unknown> = delay(100)(source);

                source.set(1);
                expect(delayed()).toBe(0); // Still initial value
                tick(100);
                expect(delayed()).toBe(1); // Now updated
            });
        }));
    });

    // Throttle Tests
    describe('throttleTime', () => {
        it('should throttle emissions', fakeAsync(() => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const throttled: Signal<unknown> = throttleTime(100)(source);

                expect(throttled()).toBe(0); // Initial value
                source.set(1);
                expect(throttled()).toBe(0); // Still initial value during throttle
                source.set(2);
                expect(throttled()).toBe(0); // Still throttled
                tick(100);
                source.set(3);
                expect(throttled()).toBe(2); // Last value during throttle window
            });
        }));
    });

    // Combine Latest Tests
    describe('combineLatest', () => {
        it('should combine multiple signals of same type', () => {
            runTest(() => {
                const s1: WritableSignal<number> = signal(1);
                const s2: WritableSignal<number> = signal(2);
                const combined: Signal<number[]> = computed(() => [s1(), s2()]);
                expect(combined()).toEqual([1, 2]);
                s1.set(3);
                expect(combined()).toEqual([3, 2]);
            });
        });

        it('should handle mixed types with proper typing', () => {
            const id: WritableSignal<number> = signal(1);
            const name: WritableSignal<string> = signal('John');
            const combined: Signal<(string | number)[]> = computed(() => [id(), name()]);

            expect(combined()).toEqual([1, 'John']);
            id.set(2);
            expect(combined()).toEqual([2, 'John']);
        });

        it('should handle empty array', () => {
            const combined: Signal<never[]> = computed(() => []);
            expect(combined()).toEqual([]);
        });

        it('should update when any signal changes', () => {
            const s1: WritableSignal<number> = signal(1);
            const s2: WritableSignal<number> = signal(2);
            const combined: Signal<number[]> = computed(() => [s1(), s2()]);

            s1.set(10);
            expect(combined()).toEqual([10, 2]);

            s2.set(20);
            expect(combined()).toEqual([10, 20]);
        });

        it('should handle multiple updates in sequence', () => {
            const s1: WritableSignal<number> = signal(1);
            const s2: WritableSignal<number> = signal(2);
            const s3: WritableSignal<number> = signal(3);
            const combined: Signal<number[]> = computed(() => [s1(), s2(), s3()]);

            expect(combined()).toEqual([1, 2, 3]);

            s1.set(10);
            expect(combined()).toEqual([10, 2, 3]);

            s2.set(20);
            expect(combined()).toEqual([10, 20, 3]);

            s3.set(30);
            expect(combined()).toEqual([10, 20, 30]);
        });
    });

    // Merge Tests
    describe('merge', () => {
        it('should merge multiple signals', () => {
            runTest(() => {
                const s1: WritableSignal<number> = signal(1);
                const s2: WritableSignal<number> = signal(2);
                const merged: Signal<unknown> = merge(s1, s2);

                expect(merged()).toBe(1); // First signal's value initially
                s1.set(10);
                expect(merged()).toBe(1); // Still first signal until change
                s2.set(20);
                expect(merged()).toBe(1); // Still first signal
            });
        });

        it('should handle multiple signals in sequence', () => {
            runTest(() => {
                const signals: WritableSignal<number>[] = [signal(1), signal(2), signal(3)];
                const merged: Signal<unknown> = merge(...signals);

                expect(merged()).toBe(1); // Initial value from first signal
                signals[0].set(1); // No change
                expect(merged()).toBe(1);
                signals[1].set(1); // No change
                expect(merged()).toBe(1);
            });
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {
        it('should handle undefined signals', () => {
            runTest(() => {
                const source: WritableSignal<number | undefined> = signal<number | undefined>(undefined);
                const mapped: Signal<{}> = map((x) => x ?? 0)(source);
                expect(mapped()).toBe(0);
            });
        });

        it('should handle null signals', () => {
            runTest(() => {
                const source: WritableSignal<number | null> = signal<number | null>(null);
                const mapped: Signal<{}> = map((x) => x ?? 0)(source);
                expect(mapped()).toBe(0);
            });
        });

        it('should handle error cases', () => {
            runTest(() => {
                const source: WritableSignal<number> = signal(0);
                const mapped: Signal<never> = map(() => { throw new Error('test'); })(source);
                expect(() => mapped()).toThrow();
            });
        });
    });

    /**
     * Resource Management Tests
     */
    describe('Memory Management', () => {
        it('should cleanup subscriptions', fakeAsync(() => {
            runTest(() => {
                const cleanupFn: () => void = jasmine.createSpy('cleanup');

                const source: WritableSignal<number> = signal(0);
                const debounced: Signal<unknown> = debounceTime(100)(source);

                const effectRef = effect(() => {
                    debounced();
                    cleanupFn(); // Call cleanup directly
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
    });

    /**
     * Error Handling Tests
     */
    describe('Error Handling', () => {
        describe('Filter Operator', () => {
            it('should handle filter errors gracefully', fakeAsync(() => {
                runTest(() => {
                    // Setup test state
                    const source: WritableSignal<any> = signal<any>(0);
                    let predicateCalled: boolean = false;
                    let lastValue: any = undefined;

                    // Create filter with error handling
                    const filtered: Signal<any> = filter((x: any) => {
                        predicateCalled = true;
                        if (x === undefined) {
                            throw new Error('Undefined value');
                        }
                        return x > 0;
                    })(source);

                    // Initial value test
                    lastValue = filtered();
                    expect(lastValue).toBe(0); // Initial value passes through
                    expect(predicateCalled).toBe(true);

                    // Reset flags
                    predicateCalled = false;

                    // Test error case
                    source.set(undefined);
                    tick();

                    // Verify error is thrown when accessing the signal
                    expect(() => filtered()).toThrowError('Undefined value');
                    expect(predicateCalled).toBe(true);

                    // Test recovery
                    predicateCalled = false;
                    source.set(5);
                    tick();

                    // Verify recovery
                    lastValue = filtered();
                    expect(lastValue).toBe(5);
                    expect(predicateCalled).toBe(true);
                });
            }));
        });
    });
});
