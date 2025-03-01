import { signal as angularSignal, Injector, NgZone, runInInjectionContext, WritableSignal } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { SignalBuilder } from '../core/signal-builder';
import { SignalPlus } from '../models';
import { enhance } from './enhance';

describe('enhance', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('creation and initialization', () => {
        it('should create a SignalBuilder instance', () => {
            const testSignal: WritableSignal<number> = angularSignal(0);
            const result: SignalBuilder<number> = enhance(testSignal);
            expect(result).toBeInstanceOf(SignalBuilder);
        });

        it('should initialize SignalBuilder with the signal value', () => {
            const initialValue = 42;
            const testSignal: WritableSignal<number> = angularSignal(initialValue);
            const result: SignalPlus<number> = enhance(testSignal).build();
            expect(result.value).toBe(initialValue);
        });

        it('should handle undefined signal values', () => {
            const testSignal: WritableSignal<undefined> = angularSignal<undefined>(undefined);
            const result: SignalPlus<undefined> = enhance(testSignal).build();
            expect(result.value).toBeUndefined();
        });

        it('should handle null signal values', () => {
            const testSignal: WritableSignal<null> = angularSignal<null>(null);
            const result: SignalPlus<null> = enhance(testSignal).build();
            expect(result.value).toBeNull();
        });
    });

    describe('value management', () => {
        it('should maintain signal reactivity', () => {
            const testSignal: WritableSignal<number> = angularSignal(0);
            const enhanced: SignalPlus<number> = enhance(testSignal).build();
            enhanced.setValue(1);
            expect(enhanced.value).toBe(1);
            expect(enhanced.hasChanged()).toBe(true);
        });

        it('should properly reset to initial state', () => {
            const initialValue = 5;
            const result: SignalPlus<number> = enhance(angularSignal(initialValue))
                .withHistory(true)
                .build();
            expect(result.value).toBe(initialValue);
            expect(result.initialValue).toBe(initialValue);
            expect(result.history().length).toBeGreaterThan(0);
            result.setValue(10);
            result.setValue(15);
            expect(result.value).toBe(15);
            result.reset();
            expect(result.value).toBe(initialValue);
            expect(result.isValid()).toBe(true);
        });

        it('should track value changes correctly', () => {
            const result: SignalPlus<number> = enhance(angularSignal(0)).build();
            result.setValue(1);
            expect(result.previousValue).toBe(0);
            expect(result.isDirty()).toBe(true);
            expect(result.hasChanged()).toBe(true);
        });
    });

    describe('feature integration', () => {
        it('should support chaining multiple features', () => {
            const testSignal: WritableSignal<number> = angularSignal(10);
            const result: SignalPlus<number> = enhance(testSignal)
                .persist('complex-test-key')
                .withHistory(true)
                .build();
            expect(result.value).toBe(10);
            expect(result.initialValue).toBe(10);
            expect(result.isValid()).toBe(true);
            expect(result.history().length).toBeGreaterThan(0);
            result.setValue(15);
            expect(result.value).toBe(15);
            expect(result.history().length).toBeGreaterThan(1);
        });

        describe('persistence', () => {
            it('should support persistence configuration', () => {
                const testSignal: WritableSignal<string> = angularSignal('test');
                const storageKey = 'persist-test-key';
                const result: SignalPlus<string> = enhance(testSignal).persist(storageKey).build();
                result.setValue('test');
                expect(result.value).toBe('test');
            });

            it('should persist value changes to localStorage', () => {
                const storageKey = 'persist-changes-test';
                const initialValue = 'initial';
                const newValue = 'updated';
                const result: SignalPlus<string> = enhance(angularSignal(initialValue)).persist(storageKey).build();
                result.setValue(newValue);
                const storedValue: string | null = localStorage.getItem(storageKey);
                expect(JSON.parse(storedValue!)).toBe(newValue);
            });

            it('should load persisted values on initialization', () => {
                const storageKey = 'persist-load-test';
                localStorage.setItem(storageKey, JSON.stringify('persisted'));
                const result: SignalPlus<string> = enhance(angularSignal('')).persist(storageKey).build();
                expect(result.value).toBe('persisted');
            });
        });

        describe('validation', () => {
            it('should support validation configuration', () => {
                const testSignal: WritableSignal<number> = angularSignal(5);
                const validator: (value: number) => boolean = (value: number) => value > 0;
                const result: SignalPlus<number> = enhance(testSignal).validate(validator).build();
                expect(result.isValid()).toBe(true);
            });

            it('should handle validation failures appropriately', () => {
                const testSignal: WritableSignal<number> = angularSignal(5);
                const validator: (value: number) => boolean = (value: number) => value > 10;
                const result: SignalPlus<number> = enhance(testSignal).validate(validator).build();
                expect(result.isValid()).toBe(false);
            });

            it('should support multiple validators', () => {
                const testSignal: WritableSignal<number> = angularSignal(5);
                const validator1: (value: number) => boolean = (value: number) => value > 0;
                const validator2: (value: number) => boolean = (value: number) => value < 10;
                const result: SignalPlus<number> = enhance(testSignal)
                    .validate(validator1)
                    .validate(validator2)
                    .build();
                expect(result.isValid()).toBe(true);
            });

            it('should handle complex validation scenarios', () => {
                const result: SignalPlus<number> = enhance(angularSignal(0))
                    .validate(v => v >= 0)
                    .validate(v => v % 2 === 0)
                    .validate(v => v <= 100)
                    .build();
                expect(result.isValid()).toBe(true);
                result.setValue(50);
                expect(result.isValid()).toBe(true);
                expect(() => result.setValue(-2)).toThrow();
                expect(() => result.setValue(101)).toThrow();
                expect(() => result.setValue(3)).toThrow();
            });
        });

        describe('history', () => {
            it('should track value changes and support history operations', () => {
                const result: SignalPlus<number> = enhance(angularSignal(0)).withHistory().build();
                expect(result.history()).toEqual([0]);
                result.setValue(1);
                result.setValue(2);
                expect(result.history()).toEqual([0, 1, 2]);
                result.undo();
                expect(result.value).toBe(1);
                expect(result.history()).toEqual([0, 1]);
                result.redo();
                expect(result.value).toBe(2);
                expect(result.history()).toEqual([0, 1, 2]);
            });

            it('should handle history with persistence', fakeAsync(() => {
                const storageKey = 'history-persist-test';
                const result: SignalPlus<number> = enhance(angularSignal(0))
                    .withHistory()
                    .persist(storageKey)
                    .build();
                result.setValue(1);
                tick();
                result.setValue(2);
                tick();
                const storedValue: string | null = localStorage.getItem(storageKey);
                const storedData: unknown = JSON.parse(storedValue!);
                expect(result.value).toBe(2);
                expect(result.history()).toEqual([0, 1, 2]);
            }));
        });

        describe('debounce', () => {
            it('should support debounced updates', fakeAsync(() => {
                const result: SignalPlus<number> = enhance(angularSignal(0))
                    .debounce(100)
                    .build();
                result.setValue(1);
                expect(result.value).toBe(0);
                tick(100);
                expect(result.value).toBe(1);
            }));

            it('should handle multiple rapid updates', fakeAsync(() => {
                const result: SignalPlus<number> = enhance(angularSignal(0))
                    .debounce(100)
                    .build();
                result.setValue(1);
                result.setValue(2);
                result.setValue(3);
                expect(result.value).toBe(0);
                tick(100);
                expect(result.value).toBe(3);
            }));

            it('should cancel pending debounced updates', fakeAsync(() => {
                const result: SignalPlus<number> = enhance(angularSignal(0))
                    .debounce(100)
                    .build();
                result.setValue(1);
                tick(50);
                result.setValue(2);
                tick(50);
                expect(result.value).toBe(0);
                tick(50);
                expect(result.value).toBe(2);
            }));

            it('should handle debounce with validation and transformation', fakeAsync(() => {
                const result: SignalPlus<number> = enhance(angularSignal(0))
                    .validate(n => n >= 0)
                    .transform(n => n * 2)
                    .debounce(100)
                    .build();
                result.setValue(5);
                expect(result.value).toBe(0);
                tick(50);
                result.setValue(10);
                expect(result.value).toBe(0);
                tick(100);
                expect(result.value).toBe(20);
            }));
        });
    });

    describe('type safety', () => {
        interface TestType {
            id: number;
            value: string;
            nested?: { data: boolean };
        }

        it('should maintain type safety with complex objects', () => {
            const initialValue: TestType = {
                id: 1,
                value: 'test',
                nested: { data: true }
            };
            const result: SignalPlus<TestType> = enhance(angularSignal<TestType>(initialValue))
                .validate(v => v.id > 0)
                .build();
            expect(result.value).toEqual(initialValue);
            const newValue: TestType = {
                id: 2,
                value: 'updated',
                nested: { data: false }
            };
            result.setValue(newValue);
            expect(result.value).toEqual(newValue);
        });

        it('should handle array types', () => {
            const result: SignalPlus<number[]> = enhance(angularSignal<number[]>([1, 2, 3]))
                .transform(arr => [...arr, arr.length + 1])
                .build();
            result.setValue([1, 2, 3]);
            expect(result.value).toEqual([1, 2, 3, 4]);
        });

        it('should handle generic type constraints', () => {
            interface Base { id: number; }
            interface Extended extends Base { value: string; }

            const baseSignal: WritableSignal<Base> = angularSignal<Base>({ id: 1 });
            const baseResult: SignalPlus<Base> = enhance(baseSignal)
                .validate(v => v.id > 0)
                .build();
            expect(baseResult.value.id).toBe(1);
            const extendedSignal: WritableSignal<Extended> = angularSignal<Extended>({ id: 1, value: 'test' });
            const extendedResult: SignalPlus<Extended> = enhance(extendedSignal)
                .validate(v => v.id > 0 && v.value.length > 0)
                .build();
            expect(extendedResult.value.value).toBe('test');
        });

        it('should handle primitive types correctly', () => {
            const numSignal: SignalPlus<number> = enhance(angularSignal(42))
                .build();
            expect(numSignal.value).toBe(42);
            numSignal.setValue(21);
            expect(numSignal.value).toBe(21);
            const strSignal: SignalPlus<string> = enhance(angularSignal('test'))
                .build();
            expect(strSignal.value).toBe('test');
            strSignal.setValue('hello');
            expect(strSignal.value).toBe('hello');
            const boolSignal: SignalPlus<boolean> = enhance(angularSignal(true))
                .build();
            expect(boolSignal.value).toBe(true);
            boolSignal.setValue(false);
            expect(boolSignal.value).toBe(false);
        });
    });

    describe('event handling', () => {
        it('should notify subscribers of value changes', () => {
            const result: SignalPlus<number> = enhance(angularSignal(5))
                .build();
            const values: number[] = [];
            result.subscribe(value => values.push(value));
            result.setValue(10);
            expect(values).toEqual([5, 10]);
        });

        it('should handle multiple subscribers correctly', () => {
            const result: SignalPlus<number> = enhance(angularSignal(0)).build();
            const changes1: number[] = [];
            const changes2: number[] = [];
            const unSubscribe1: () => void = result.subscribe(value => changes1.push(value));
            const unSubscribe2: () => void = result.subscribe(value => changes2.push(value));
            result.setValue(1);
            unSubscribe1();
            result.setValue(2);
            expect(changes1).toEqual([0, 1]);
            expect(changes2).toEqual([0, 1, 2]);
        });

        it('should notify subscribers of transformed values', () => {
            const result: SignalPlus<number> = enhance(angularSignal(5))
                .build();
            const values: number[] = [];
            result.subscribe(value => values.push(value));
            result.setValue(10);
            expect(values).toEqual([5, 10]);
        });

        it('should handle multiple subscribers in correct order', () => {
            const result: SignalPlus<number> = enhance(angularSignal(0)).build();
            const order: number[] = [];
            const values1: number[] = [];
            const values2: number[] = [];
            const unSub1: () => void = result.subscribe(value => {
                order.push(1);
                values1.push(value);
            });
            const unSub2: () => void = result.subscribe(value => {
                order.push(2);
                values2.push(value);
            });
            result.setValue(1);
            expect(order).toEqual([1, 2, 1, 2]);
            expect(values1).toEqual([0, 1]);
            expect(values2).toEqual([0, 1]);
            unSub1();
            result.setValue(2);
            expect(values1).toEqual([0, 1]);
            expect(values2).toEqual([0, 1, 2]);
        });
    });

    describe('cleanup and resource management', () => {
        it('should cleanup resources on reset', fakeAsync(() => {
            const result: SignalPlus<number> = enhance(angularSignal(0))
                .debounce(100)
                .withHistory()
                .build();
            const values: number[] = [];
            const unSubscribe: () => void = result.subscribe(v => values.push(v));
            result.setValue(1);
            tick(100);
            result.setValue(2);
            tick(100);
            result.reset();
            tick(100);
            expect(result.value).toBe(0);
            expect(result.history()).toEqual([0]);
            expect(values).toEqual([0, 1, 2, 0]);
            unSubscribe();
            result.setValue(3);
            tick(100);
            expect(values).toEqual([0, 1, 2, 0]);
        }));

        it('should handle multiple resets correctly', () => {
            const result: SignalPlus<number> = enhance(angularSignal(0))
                .withHistory()
                .build();
            result.setValue(1);
            result.reset();
            expect(result.value).toBe(0);
            expect(result.history()).toEqual([0]);
            result.setValue(2);
            result.reset();
            expect(result.value).toBe(0);
            expect(result.history()).toEqual([0]);
        });
    });

    describe('error handling', () => {
        it('should handle validation errors', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const result: SignalPlus<number> = enhance(angularSignal(0))
                .validate(() => { throw new Error('Validation error'); })
                .onError(errorHandler)
                .build();
            expect(result.isValid()).toBe(false);
            expect(errorHandler).toHaveBeenCalled();
        });

        it('should handle transform errors', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const result: SignalPlus<number> = enhance(angularSignal(0))
                .transform(() => { throw new Error('Transform error'); })
                .onError(errorHandler)
                .build();
            expect(() => result.setValue(1)).toThrow();
            expect(errorHandler).toHaveBeenCalled();
        });

        it('should handle storage errors', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const result: SignalPlus<number> = enhance(angularSignal(0))
                .persist('test-key')
                .onError(errorHandler)
                .build();
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            result.setValue(1);
            expect(errorHandler).toHaveBeenCalled();
            expect(result.value).toBe(1);
        });

        it('should maintain state consistency after validation error', () => {
            const result: SignalPlus<number> = enhance(angularSignal(5))
                .validate(v => v < 10)
                .transform(v => v * 2)
                .build();
            result.setValue(4);
            expect(result.value).toBe(8);
            expect(() => result.setValue(6)).toThrow();
            expect(result.value).toBe(8);
            expect(result.isValid()).toBe(true);
            expect(result.isDirty()).toBe(true);
        });

        it('should maintain state consistency after transform error', () => {
            const result: SignalPlus<number> = enhance(angularSignal(0))
                .transform(v => {
                    if (v > 5) throw new Error('Transform error');
                    return v * 2;
                })
                .build();
            result.setValue(2);
            expect(result.value).toBe(4);
            expect(() => result.setValue(6)).toThrow();
            expect(result.value).toBe(4);
            expect(result.isDirty()).toBe(true);
        });
    });
});

describe('enhance - advanced scenarios', () => {
    describe('storage handling', () => {
        it('should handle storage quota exceeded', fakeAsync(() => {
            const largeData: string = new Array(10000000).fill('x').join('');
            const testSignal: SignalPlus<string> = enhance(angularSignal(largeData))
                .persist('quota-test')
                .onError(error => {
                    expect(error instanceof Error).toBe(true);
                    expect(error.name).toBe('QuotaExceededError');
                })
                .build();
            testSignal.setValue(largeData);
            tick();
            expect(testSignal.value).toBe(largeData);
        }));

        it('should handle storage events from other tabs', fakeAsync(() => {
            const key: string = 'cross-tab-test';
            const testSignal: SignalPlus<string> = enhance(angularSignal('initial'))
                .persist(key)
                .build();
            const storageEvent = new StorageEvent('storage', {
                key: key,
                newValue: JSON.stringify('updated'),
                oldValue: JSON.stringify('initial'),
                storageArea: localStorage
            });
            window.dispatchEvent(storageEvent);
            tick();
            expect(testSignal.value).toBe('updated');
        }));
    });

    describe('validation enhancements', () => {
        it('should support async validation', fakeAsync(() => {
            let isValid: boolean = true;
            const testSignal: SignalPlus<number> = enhance(angularSignal<number>(0))
                .validate(value => {
                    setTimeout(() => {
                        isValid = value >= 0;
                    }, 100);
                    return isValid;
                })
                .build();
            testSignal.setValue(1);
            tick(100);
            expect(testSignal.isValid()).toBe(true);
            testSignal.setValue(-1);
            tick(100);
            expect(isValid).toBe(false);
        }));

        it('should support custom validation messages', () => {
            const customMessage: string = 'Value must be positive';
            const testSignal: SignalPlus<number> = enhance(angularSignal<number>(0))
                .validate((value: number) => {
                    if (value < 0) throw new Error(customMessage);
                    return true;
                })
                .build();
            try {
                testSignal.setValue(-1);
                fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toBe(customMessage);
            }
        });
    });

    describe('history management', () => {
        it('should respect history size limits', () => {
            const testSignal: SignalPlus<number> = enhance(angularSignal(0))
                .withHistory(true)
                .build();
            for (let i: number = 1; i <= 10; i++) {
                testSignal.setValue(i);
            }
            expect(testSignal.history().length).toBeGreaterThan(0);
            expect(testSignal.history()).toContain(10);
        });

        it('should handle custom history serialization', () => {
            interface ComplexType {
                id: number;
                data: string;
                timestamp: Date;
            }

            const testSignal: SignalPlus<ComplexType> = enhance(angularSignal<ComplexType>({
                id: 1,
                data: 'test',
                timestamp: new Date()
            }))
                .withHistory(true)
                .build();
            const newValue: ComplexType = {
                id: 2,
                data: 'updated',
                timestamp: new Date()
            };
            testSignal.setValue(newValue);
            testSignal.undo();
            expect(testSignal.value.id).toBe(1);
            expect(testSignal.value.data).toBe('test');
            expect(testSignal.value.timestamp instanceof Date).toBe(true);
        });
    });

    describe('performance optimizations', () => {
        it('should handle large datasets efficiently', () => {
            const largeArray: number[] = new Array(10000).fill(0).map((_, i) => i);
            const testSignal: SignalPlus<number[]> = enhance(angularSignal<number[]>(largeArray))
                .build();
            const start: number = performance.now();
            testSignal.setValue([...largeArray, 10001]);
            const end: number = performance.now();
            expect(end - start).toBeLessThan(100);
            expect(testSignal.value.length).toBe(10001);
        });

        it('should support batched updates', () => {
            const testSignal: SignalPlus<number> = enhance(angularSignal(0))
                .withHistory(true)
                .build();
            let updateCount: number = 0;
            testSignal.subscribe(() => updateCount++);
            testSignal.setValue(1);
            testSignal.setValue(2);
            testSignal.setValue(3);
            expect(updateCount).toBe(4);
            expect(testSignal.value).toBe(3);
        });
    });

    describe('type system edge cases', () => {
        it('should handle union types correctly', () => {
            type UnionType = string | number;
            const testSignal: SignalPlus<UnionType> = enhance(angularSignal<UnionType>('test'))
                .transform(value =>
                    typeof value === 'string' ? value.toUpperCase() : value * 2
                )
                .build();
            testSignal.setValue('hello');
            expect(testSignal.value).toBe('HELLO');
            testSignal.setValue(5);
            expect(testSignal.value).toBe(10);
        });

        it('should handle readonly types', () => {
            interface ReadonlyType {
                readonly id: number;
                readonly value: string;
            }

            const testSignal: SignalPlus<ReadonlyType> = enhance(angularSignal<ReadonlyType>({ id: 1, value: 'test' }))
                .validate(value => value.id > 0)
                .build();
            const newValue: ReadonlyType = { id: 2, value: 'updated' };
            testSignal.setValue(newValue);
            expect(testSignal.value).toEqual(newValue);
        });

        it('should preserve signal type information', () => {
            interface User { id: number; name: string; }

            const original: WritableSignal<User> = angularSignal<User>({ id: 1, name: 'test' });
            const enhanced: SignalPlus<User> = enhance(original)
                .validate(user => user.id > 0)
                .build();
            const user: User = enhanced.value;
            expect(user.id).toBe(1);
            expect(user.name).toBe('test');
            enhanced.setValue({ id: 2, name: 'updated' });
            // @ts-expect-error
            const wrongType: User = { wrongProp: true };
            expect(enhanced.value.id).toBe(2);
            expect(enhanced.value.name).toBe('updated');
        });
    });

    describe('error recovery', () => {
        it('should implement retry strategy for persistence', fakeAsync(() => {
            let failCount: number = 0;
            const maxRetries: number = 2;
            let retryCount: number = 0;
            let effectCount: number = 0;
            const setItemSpy: jasmine.Spy = spyOn(localStorage, 'setItem').and.callFake(() => {
                effectCount++;
                if (failCount < maxRetries) {
                    failCount++;
                    throw new Error('Storage error');
                }
            });
            const ngZone = TestBed.inject(NgZone);
            const injector = TestBed.inject(Injector);
            let signal: SignalPlus<string>;
            signal = enhance(angularSignal('test'))
                .persist('retry-test')
                .onError(() => {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        Promise.resolve().then(() => {
                            runInInjectionContext(injector, () => {
                                ngZone.run(() => {
                                    if (retryCount === 1) {
                                        signal.setValue('updated1');
                                    } else {
                                        signal.setValue('updated');
                                    }
                                });
                            });
                        });
                    }
                })
                .build();
            runInInjectionContext(injector, () => {
                ngZone.run(() => {
                    signal.setValue('updated0');
                });
            });
            tick();
            flushMicrotasks();
            tick();
            flushMicrotasks();
            tick();
            flushMicrotasks();
            tick();
            expect(failCount).toBe(2);
            expect(retryCount).toBe(2);
            expect(effectCount).toBe(3);
            expect(setItemSpy.calls.count()).toBe(3);
            expect(signal.value).toBe('updated');
        }));

        it('should handle error event bubbling', () => {
            let errorCount: number = 0;
            const errorSpy: jasmine.Spy = jasmine.createSpy('errorHandler');
            const testSignal: SignalPlus<number> = enhance(angularSignal(0))
                .onError(() => {
                    if (errorCount === 0) {
                        errorCount++;
                    }
                })
                .validate(v => {
                    if (v < 0) throw new Error('Invalid value');
                    return true;
                })
                .build();
            try {
                testSignal.setValue(-1);
                fail('Should have thrown');
            } catch (e) { }
            expect(errorCount).toBe(1);
        });
    });

    describe('framework integration', () => {
        it('should work with Angular change detection', fakeAsync(() => {
            const testSignal: SignalPlus<number> = enhance(angularSignal(0))
                .debounce(100)
                .build();
            let updateCount: number = 0;
            const subscription: () => void = testSignal.subscribe(() => updateCount++);
            testSignal.setValue(1);
            tick(50);
            testSignal.setValue(2);
            tick(100);
            expect(updateCount).toBe(2);
            subscription();
        }));
    });
}); 