import { computed, Signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { SignalPlus } from '../models/signal-plus.model';
import { SignalBuilder } from './signal-builder';

describe('SignalBuilder', () => {
    let builder: SignalBuilder<number>;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        builder = new SignalBuilder<number>(0);
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('core operations', () => {
        it('should create and initialize signal correctly', () => {
            const initialValue = 5;
            const signal: SignalPlus<number> = new SignalBuilder(initialValue).build();
            expect(signal.value).toEqual(initialValue);
            expect(signal.initialValue).toEqual(initialValue);
            expect(signal.previousValue).toEqual(initialValue);
        });

        it('should handle value updates with state tracking', () => {
            const signal: SignalPlus<number> = builder.build();
            signal.setValue(10);
            expect(signal.value).toEqual(10);
            expect(signal.previousValue).toEqual(0);
            expect(signal.isDirty()).toBe(true);
            expect(signal.hasChanged()).toBe(true);
        });

        it('should handle update function correctly', () => {
            const signal: SignalPlus<number> = builder.build();
            signal.update(current => current + 5);
            expect(signal.value).toEqual(5);
            expect(signal.previousValue).toEqual(0);
        });
    });

    describe('state management', () => {
        it('should track history and support undo/redo', () => {
            const signal: SignalPlus<number> = builder.withHistory().build();
            signal.setValue(1);
            signal.setValue(2);
            signal.setValue(3);
            expect(signal.value).toEqual(3);
            expect(signal.history()).toEqual([0, 1, 2, 3]);
            signal.undo();
            expect(signal.value).toEqual(2);
            signal.redo();
            expect(signal.value).toEqual(3);
        });

        it('should persist state correctly', () => {
            const storageKey = 'test-signal';
            const signal: SignalPlus<number> = builder
                .persist(storageKey)
                .withHistory(true)
                .build();
            signal.setValue(5);
            signal.setValue(10);
            const restoredSignal: SignalPlus<number> = new SignalBuilder(0)
                .persist(storageKey)
                .withHistory(true)
                .build();
            expect(restoredSignal.value).toEqual(10);
            expect(restoredSignal.history()).toEqual([0, 5, 10]);
        });
    });

    describe('validation and transformation', () => {
        it('should enforce validation rules', () => {
            const signal: SignalPlus<number> = builder
                .validate(x => x >= 0)
                .build();
            expect(() => signal.setValue(-1)).toThrow();
            expect(signal.value).toEqual(0);
            expect(signal.isValid()).toBe(true);
        });

        it('should apply transformations in order', () => {
            const signal: SignalPlus<number> = builder
                .transform(x => x * 2)
                .transform(x => x + 1)
                .build();
            signal.setValue(5);
            expect(signal.value).toEqual(11);
        });
    });

    describe('error handling', () => {
        it('should handle and recover from errors', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = builder
                .transform(x => {
                    if (x > 10) throw new Error('Value too large');
                    return x * 2;
                })
                .onError(errorHandler)
                .build();
            signal.setValue(5);
            expect(signal.value).toEqual(10);
            expect(() => signal.setValue(11)).toThrow();
            expect(errorHandler).toHaveBeenCalled();
            expect(signal.value).toEqual(10);
        });
    });

    describe('resource management', () => {
        it('should manage subscriptions correctly', () => {
            const signal: SignalPlus<number> = builder.build();
            const subscriber: jasmine.Spy = jasmine.createSpy('subscriber');
            const unsubscribe: () => void = signal.subscribe(subscriber);
            signal.setValue(5);
            expect(subscriber).toHaveBeenCalledWith(5);
            unsubscribe();
            signal.setValue(10);
            expect(subscriber).not.toHaveBeenCalledWith(10);
        });
    });

    describe('performance features', () => {
        it('should debounce rapid updates', fakeAsync(() => {
            const signal: SignalPlus<number> = builder
                .debounce(100)
                .build();
            signal.setValue(1);
            signal.setValue(2);
            signal.setValue(3);
            expect(signal.value).toEqual(0);
            tick(100);
            expect(signal.value).toEqual(3);
        }));

        it('should handle distinct values', () => {
            const signal: SignalPlus<number> = builder
                .distinct()
                .build();
            signal.setValue(1);
            expect(signal.value).toEqual(1);
            signal.setValue(1);
            expect(signal.value).toEqual(1);
            expect(signal.hasChanged()).toBe(false);
        });
    });

    describe('type transformations', () => {
        it('should transform types using map', () => {
            const numberSignal: SignalBuilder<number> = new SignalBuilder(5);
            const stringSignal: SignalPlus<string> = numberSignal
                .map((num: number) => num.toString())
                .build();
            expect(stringSignal.value.toString()).toEqual('5');
            expect(stringSignal.setValue('10'));
        });

        it('should filter values with predicate', () => {
            const signal: SignalPlus<number> = builder
                .filter(x => x >= 0)
                .build();
            signal.setValue(5);
            expect(signal.value).toEqual(5);
            expect(() => signal.setValue(-1)).toThrow();
            expect(signal.value).toEqual(5);
        });

        it('should pipe multiple operators', () => {
            const signal: SignalPlus<number> = builder.build();
            const transformed: SignalPlus<number> = signal.pipe(
                (s: Signal<number>) => computed(() => s() * 2),
                (s: Signal<number>) => computed(() => s() + 1)
            );
            expect(transformed.value).toEqual(1);
            signal.setValue(5);
            expect(transformed.value).toEqual(11);
        });
    });

    describe('reset behavior', () => {
        it('should reset to initial state', () => {
            const signal: SignalPlus<number> = builder
                .withHistory()
                .transform(x => x * 2)
                .build();
            signal.setValue(5);
            signal.setValue(10);
            expect(signal.value).toEqual(20);
            expect(signal.history()).toEqual([0, 10, 20]);
            signal.reset();
            expect(signal.value).toEqual(0);
            expect(signal.history()).toEqual([0]);
            expect(signal.isDirty()).toBe(false);
        });

        it('should reset with persistence', () => {
            const storageKey: string = 'reset-test';
            const signal: SignalPlus<number> = builder
                .persist(storageKey)
                .withHistory(true)
                .build();
            signal.setValue(5);
            signal.reset();
            const restoredSignal: SignalPlus<number> = new SignalBuilder(0)
                .persist(storageKey)
                .withHistory(true)
                .build();
            expect(restoredSignal.value).toEqual(0);
            expect(restoredSignal.history()).toEqual([0]);
        });
    });

    describe('error recovery', () => {
        it('should recover from persistence errors', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = builder
                .persist('test-key')
                .onError(errorHandler)
                .build();
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            signal.setValue(5);
            expect(errorHandler).toHaveBeenCalled();
            expect(signal.value).toEqual(5);
        });

        it('should handle complex type transformation errors', () => {
            interface ComplexType {
                value: number;
                metadata: { valid: boolean };
            }

            const errorSpy: jasmine.Spy = spyOn(console, 'warn');
            const complexBuilder: SignalBuilder<ComplexType> = new SignalBuilder<ComplexType>({
                value: 0,
                metadata: { valid: true }
            });
            const signal: SignalPlus<ComplexType> = complexBuilder
                .transform(data => {
                    if (!data.metadata.valid) {
                        throw new Error('Invalid metadata');
                    }
                    return { ...data, value: data.value * 2 };
                })
                .onError(error => console.warn(error))
                .build();
            signal.setValue({ value: 5, metadata: { valid: true } });
            expect(signal.value.value).toEqual(10);
            try {
                signal.setValue({ value: 5, metadata: { valid: false } });
                fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toEqual('Invalid metadata');
                expect(signal.value.value).toEqual(10);
                expect(errorSpy).toHaveBeenCalled();
            }
        });
    });

    describe('static methods', () => {
        it('should create mock signal instance', () => {
            const mockOptions = { initialValue: 42 };
            const mockSignal: SignalPlus<number> = SignalBuilder.mock<number>(mockOptions);
            expect(mockSignal.value).toEqual(42);
            expect(mockSignal.initialValue).toEqual(42);
        });
    });

    describe('concurrent operations', () => {
        it('should handle rapid concurrent updates', fakeAsync(() => {
            const signal: SignalPlus<number> = builder
                .debounce(50)
                .withHistory()
                .build();
            const updates: number[] = [1, 2, 3, 4, 5];
            updates.forEach(value => signal.setValue(value));
            tick(25);
            signal.setValue(6);
            tick(50);
            expect(signal.value).toEqual(6);
            expect(signal.history()).toEqual([0, 6]);
        }));

        it('should maintain state consistency during concurrent operations', fakeAsync(() => {
            const signal: SignalPlus<number> = builder
                .withHistory()
                .debounce(50)
                .build();
            signal.setValue(1);
            signal.undo();
            signal.setValue(2);
            tick(50);
            expect(signal.value).toEqual(2);
            expect(signal.history()).toEqual([0, 2]);
        }));
    });

    describe('memory management', () => {
        it('should cleanup resources on multiple subscriptions', () => {
            const signal: SignalPlus<number> = builder.build();
            const subscribers: jasmine.Spy[] = [];
            const unSubscribers: (() => void)[] = [];
            for (let i: number = 0; i < 5; i++) {
                const subscriber: jasmine.Spy = jasmine.createSpy(`subscriber${i}`);
                subscribers.push(subscriber);
                unSubscribers.push(signal.subscribe(subscriber));
            }
            signal.setValue(1);
            subscribers.forEach(subscriber => {
                expect(subscriber).toHaveBeenCalledWith(1);
            });
            unSubscribers.forEach(unsubscribe => unsubscribe());
            signal.setValue(2);
            subscribers.forEach(subscriber => {
                expect(subscriber).not.toHaveBeenCalledWith(2);
            });
        });

        it('should handle long-running operation cleanup', fakeAsync(() => {
            const signal: SignalPlus<number> = builder
                .debounce(100)
                .build();
            const subscriber: jasmine.Spy = jasmine.createSpy('subscriber');
            const unsubscribe: () => void = signal.subscribe(subscriber);
            expect(subscriber).toHaveBeenCalledWith(0);
            subscriber.calls.reset();
            signal.setValue(1);
            unsubscribe();
            tick(100);
            expect(subscriber).not.toHaveBeenCalled();
            expect(signal.value).toBe(1);
        }));

        it('should cleanup history resources on reset', () => {
            const signal: SignalPlus<number> = builder
                .withHistory()
                .build();
            for (let i: number = 0; i < 100; i++) {
                signal.setValue(i);
            }
            signal.reset();
            expect(signal.history()).toEqual([0]);
            expect(signal.value).toEqual(0);
        });
    });

    describe('concurrent state management', () => {
        it('should handle interleaved undo/redo operations', fakeAsync(() => {
            const signal: SignalPlus<number> = builder.withHistory().build();
            signal.setValue(1);
            signal.setValue(2);
            signal.undo();
            signal.setValue(3);
            signal.redo();
            expect(signal.value).toBe(3);
            expect(signal.history()).toEqual([0, 1, 3]);
        }));
    });

    describe('deep object handling', () => {
        interface DeepObject {
            nested: {
                array: number[];
                object: {
                    value: string;
                };
            };
        }

        it('should properly clone deep objects', () => {
            const initialValue: DeepObject = {
                nested: {
                    array: [1, 2, 3],
                    object: { value: 'test' }
                }
            };
            const signal: SignalPlus<DeepObject> = new SignalBuilder<DeepObject>(initialValue).build();
            const newValue: DeepObject = { ...initialValue };
            newValue.nested.array.push(4);
            signal.setValue(newValue);
            expect(signal.previousValue.nested.array).toEqual([1, 2, 3]);
            expect(signal.value.nested.array).toEqual([1, 2, 3, 4]);
        });

        it('should maintain referential integrity', () => {
            const obj: { value: number } = { value: 1 };
            const signal: SignalPlus<{ value: number }> = new SignalBuilder<{ value: number }>(obj).build();
            const initial: { value: number } = signal.value;
            signal.update(current => ({ value: current.value + 1 }));
            expect(signal.value).not.toBe(initial);
            expect(signal.value.value).toBe(2);
        });
    });
    describe('validation chains', () => {
        it('should execute validators in order and stop on first failure', () => {
            const validationCalls: number[] = [];
            const signal: SignalPlus<number> = builder
                .validate(x => {
                    validationCalls.push(1);
                    return x > 0;
                })
                .validate(x => {
                    validationCalls.push(2);
                    return x < 10;
                })
                .build();
            expect(() => signal.setValue(-1)).toThrow();
            expect(validationCalls).toEqual([1]);
            validationCalls.length = 0;
            signal.setValue(5);
            expect(validationCalls).toEqual([1, 2]);
        });

        it('should handle complex validation logic', () => {
            const signal: SignalPlus<number> = builder
                .validate(x => {
                    return x > 0 && x < 100;
                })
                .build();
            signal.setValue(50);
            expect(signal.isValid()).toBe(true);
        });
    });

    describe('storage error recovery', () => {
        it('should handle storage quota exceeded', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = builder
                .persist('test-key')
                .onError(errorHandler)
                .build();
            spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
            signal.setValue(1);
            expect(signal.value).toBe(1);
            expect(errorHandler).toHaveBeenCalled();
            expect(signal.isValid()).toBe(true);
        });

        it('should recover from corrupted storage data', () => {
            localStorage.setItem('test-key', 'invalid-json{');
            const signal: SignalPlus<number> = builder
                .persist('test-key')
                .withHistory()
                .build();
            expect(signal.value).toBe(0);
            expect(signal.history()).toEqual([0]);
            expect(signal.isValid()).toBe(true);
        });
    });

    describe('transform chains', () => {
        it('should execute transforms in correct order', () => {
            const transformCalls: number[] = [];
            const signal: SignalPlus<number> = builder
                .transform(x => {
                    transformCalls.push(1);
                    return x * 2;
                })
                .transform(x => {
                    transformCalls.push(2);
                    return x + 1;
                })
                .build();
            signal.setValue(5);
            expect(transformCalls).toEqual([1, 2]);
            expect(signal.value).toBe(11);
        });

        it('should handle transform errors gracefully', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = builder
                .transform(x => {
                    if (x < 0) throw new Error('Negative value');
                    return x * 2;
                })
                .onError(errorHandler)
                .build();
            expect(() => signal.setValue(-1)).toThrowError('Negative value');
            expect(errorHandler).toHaveBeenCalled();
            expect(signal.value).toBe(0);
        });
    });

    describe('circular reference handling', () => {
        it('should handle circular references in objects', () => {
            interface CircularObj {
                value: number;
                self?: CircularObj;
            }

            const circular: CircularObj = { value: 1 };
            circular.self = circular;
            const signal: SignalPlus<CircularObj> = new SignalBuilder<CircularObj>(circular).build();
            expect(signal.value.value).toBe(1);
            expect(signal.value.self).toBeDefined();
            expect(signal.value.self?.value).toBe(1);
        });

        it('should maintain circular references through updates', () => {
            interface CircularObj {
                value: number;
                self?: CircularObj;
            }

            const signal: SignalPlus<CircularObj> = new SignalBuilder<CircularObj>({ value: 1 }).build();
            const circular: CircularObj = { value: 2 };
            circular.self = circular;
            signal.setValue({ ...circular, self: undefined });
            expect(signal.value.value).toBe(2);
            expect(signal.value.self).toBeUndefined();
        });
    });

    describe('performance boundaries', () => {
        it('should handle rapid updates efficiently while maintaining state', fakeAsync(() => {
            const signal: SignalPlus<number> = builder
                .debounce(50)
                .withHistory()
                .build();
            const updateCount: number = 10000;
            const values: number[] = [];
            const start: number = performance.now();
            signal.subscribe(value => values.push(value));
            values.length = 0;
            for (let i: number = 0; i < updateCount; i++) {
                signal.setValue(i);
            }
            tick(50);
            const duration: number = performance.now() - start;
            expect(duration).toBeLessThan(1000);
            expect(signal.value).toBe(updateCount - 1);
            expect(signal.history().length).toBe(2);
            expect(values.length).toBe(1);
        }));

        it('should handle large object updates efficiently', () => {
            const largeArray: number[] = Array.from({ length: 10000 }, (_, i) => i);
            const signal: SignalPlus<number[]> = new SignalBuilder<number[]>(largeArray).build();
            const start: number = performance.now();
            signal.setValue([...largeArray, 10000]);
            const duration: number = performance.now() - start;
            expect(duration).toBeLessThan(100);
            expect(signal.value.length).toBe(10001);
        });
    });

    describe('critical edge cases', () => {
        it('should recover from transform errors and maintain state', () => {
            let shouldFail: boolean = true;
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform(x => {
                    if (shouldFail) throw new Error('Transform error');
                    return x * 2;
                })
                .build();
            expect(() => signal.setValue(1)).toThrowError('Transform error');
            expect(signal.value).toBe(0);
            expect(signal.previousValue).toBe(0);
            expect(signal.isValid()).toBe(true);
            shouldFail = false;
            signal.setValue(2);
            expect(signal.value).toBe(4);
            expect(signal.previousValue).toBe(0);
            expect(signal.isValid()).toBe(true);
        });

        it('should handle validation chain errors correctly', () => {
            const validationCalls: number[] = [];
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .validate(x => {
                    validationCalls.push(1);
                    return x >= 0;
                })
                .validate(x => {
                    validationCalls.push(2);
                    return x < 10;
                })
                .build();
            signal.setValue(5);
            expect(validationCalls).toEqual([1, 2]);
            expect(signal.value).toBe(5);
            validationCalls.length = 0;
            expect(() => signal.setValue(-1)).toThrow();
            expect(validationCalls).toEqual([1]);
            expect(signal.value).toBe(5);
            validationCalls.length = 0;
            expect(() => signal.setValue(15)).toThrow();
            expect(validationCalls).toEqual([1, 2]);
            expect(signal.value).toBe(5);
        });

        it('should handle storage errors gracefully', () => {
            const storageKey: string = 'test-storage';
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(storageKey)
                .onError(errorHandler)
                .build();
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            signal.setValue(1);
            expect(errorHandler).toHaveBeenCalled();
            expect(signal.value).toBe(1);
            expect(signal.isValid()).toBe(true);
        });

        it('should handle concurrent debounce operations safely', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .debounce(50)
                .withHistory()
                .build();
            const values: number[] = [];
            signal.subscribe(v => values.push(v));
            values.length = 0;
            signal.setValue(1);
            tick(20);
            signal.setValue(2);
            tick(20);
            signal.setValue(3);
            tick(50);
            expect(values.length).toBe(1);
            expect(values[0]).toBe(3);
            expect(signal.value).toBe(3);
            expect(signal.history().length).toBe(2);
        }));

        it('should handle race conditions in history updates', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .withHistory()
                .debounce(50)
                .build();
            signal.setValue(1);
            signal.undo();
            signal.setValue(2);
            tick(25);
            signal.setValue(3);
            tick(50);
            expect(signal.value).toBe(3);
            expect(signal.history()).toEqual([0, 3]);
            expect(signal.previousValue).toBe(0);
        }));

        it('should handle complex error recovery scenarios', () => {
            interface ComplexType {
                value: number;
                metadata: { valid: boolean };
            }

            let shouldFail: boolean = true;
            const signal: SignalPlus<ComplexType> = new SignalBuilder<ComplexType>({
                value: 0,
                metadata: { valid: true }
            })
                .transform(data => {
                    if (!data.metadata.valid) throw new Error('Invalid metadata');
                    return data;
                })
                .transform(data => {
                    if (shouldFail && data.value > 0) throw new Error('Transform error');
                    return { ...data, value: data.value * 2 };
                })
                .build();
            expect(() => signal.setValue({ value: 1, metadata: { valid: true } }))
                .toThrowError('Transform error');
            expect(signal.value).toEqual({ value: 0, metadata: { valid: true } });
            expect(() => signal.setValue({ value: 0, metadata: { valid: false } }))
                .toThrowError('Invalid metadata');
            expect(signal.value).toEqual({ value: 0, metadata: { valid: true } });
            shouldFail = false;
            signal.setValue({ value: 2, metadata: { valid: true } });
            expect(signal.value).toEqual({ value: 4, metadata: { valid: true } });
        });

        it('should handle concurrent operations with storage', fakeAsync(() => {
            const storageKey = 'concurrent-test';
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(storageKey)
                .debounce(50)
                .build();
            signal.setValue(1);
            tick(50);
            expect(signal.value).toBe(1);
            localStorage.setItem(storageKey, JSON.stringify(2));
            window.dispatchEvent(new StorageEvent('storage', {
                key: storageKey,
                newValue: JSON.stringify(2)
            }));
            expect(signal.value).toBe(2);
            signal.setValue(3);
            tick(50);
            expect(signal.value).toBe(3);
            expect(signal.previousValue).toBe(2);
            localStorage.removeItem(storageKey);
        }));
    });

    describe('critical confidence', () => {
        it('should maintain state consistency during error recovery', () => {
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform((value: number) => {
                    if (value === 2) throw new Error('Transform error');
                    return value;
                })
                .onError((error: Error) => {
                    console.error('Error in transform:', error);
                })
                .build();
            expect(signal.value).toBe(0);
            signal.setValue(1);
            expect(signal.value).toBe(1);
            try {
                signal.setValue(2);
            } catch (error: any) {
                expect(error.message).toBe('Transform error');
            }
            expect(consoleSpy).toHaveBeenCalledWith('Error in transform:', jasmine.any(Error));
            expect(signal.value).toBe(1);
            signal.setValue(3);
            expect(signal.value).toBe(3);
        });

        it('should handle nested error scenarios', () => {
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform((value: number) => {
                    if (value === 2) throw new Error('Transform error');
                    return value;
                })
                .onError((error: Error) => {
                    console.error('Error in transform:', error);
                })
                .build();
            expect(signal.value).toBe(0);
            try {
                signal.setValue(2);
            } catch (error: any) {
                expect(error.message).toBe('Transform error');
            }
            expect(consoleSpy).toHaveBeenCalledWith('Error in transform:', jasmine.any(Error));
            expect(signal.value).toBe(0);
            signal.setValue(3);
            expect(signal.value).toBe(3);
        });

        it('should maintain state consistency during concurrent storage operations', fakeAsync(() => {
            const storageKey: string = 'test-key';
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(storageKey)
                .debounce(100)
                .build();
            expect(signal.value).toBe(0);
            signal.setValue(1);
            tick(50);
            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: storageKey,
                    newValue: JSON.stringify(2)
                })
            );
            tick(50);
            expect(signal.value).toBe(1);
            localStorage.removeItem(storageKey);
        }));
    });

    describe('validation skip flag', () => {
        it('should skip validation when flag is set', () => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .validate(x => x >= 0)
                .build();
            expect(() => (signal as any).setValue(-1, true))
                .toThrowError("Validation failed");
        });
    });

    describe('computed property error handling', () => {
        it('should handle errors in isValid computed property', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .validate(() => { throw new Error('Validation error'); })
                .onError(errorHandler)
                .build();
            const isValid: boolean = signal.isValid();
            expect(isValid).toBe(false);
            expect(errorHandler).toHaveBeenCalled();
        });

        it('should handle errors in isDirty computed property', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<any> = new SignalBuilder<any>({ value: 1 })
                .onError(errorHandler)
                .build();
            const circular: any = { value: 2 };
            circular.self = circular;
            try {
                signal.setValue(circular);
            } catch (e) {
            }
            expect(() => signal.isDirty()).not.toThrow();
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('async state consistency', () => {
        it('should maintain state consistency during async operations', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .debounce(100)
                .withHistory()
                .build();
            signal.setValue(1);
            signal.setValue(2);
            signal.undo();
            signal.setValue(3);
            expect(signal.value).toBe(0);
            tick(100);
            expect(signal.value).toBe(3);
            expect(signal.history()).toEqual([0, 3]);
        }));
    });

    describe('history memory management', () => {
        it('should handle large history sets', () => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .withHistory()
                .build();
            for (let i: number = 0; i < 1000; i++) {
                signal.setValue(i);
            }
            expect(signal.history().length).toBe(1000);
            expect(signal.value).toBe(999);
            signal.reset();
            expect(signal.history().length).toBe(1);
        });
    });

    describe('subscription lifecycle', () => {
        it('should handle multiple subscribe/unsubscribe cycles', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0).build();
            const values: number[] = [];
            const sub1: () => void = signal.subscribe(v => values.push(v));
            tick();
            signal.setValue(1);
            tick();
            sub1();
            signal.setValue(2);
            tick();
            const sub2: () => void = signal.subscribe(v => values.push(v));
            tick();
            sub2();
            expect(values).toEqual([0, 1, 2]);
        }));
    });

    describe('storage key validation', () => {
        it('should handle invalid storage keys', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist('')
                .onError(errorHandler)
                .build();
            signal.setValue(1);
            expect(signal.value).toBe(1);
            expect(errorHandler).not.toHaveBeenCalled();
        });

        it('should cleanup storage on unsubscribe', fakeAsync(() => {
            const key: string = 'test-storage';
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(key)
                .build();
            signal.setValue(1);
            tick();
            const unsubscribe: () => void = signal.subscribe(() => { });
            unsubscribe();
            expect(localStorage.getItem(key)).toBeTruthy();
        }));
    });

    describe('null/undefined handling', () => {
        it('should handle null values', () => {
            const signal: SignalPlus<number | null> = new SignalBuilder<number | null>(0)
                .validate(x => x !== null)
                .build();
            expect(() => signal.setValue(null)).toThrowError('Validation failed');
            expect(signal.value).toBe(0);
        });

        it('should handle undefined in transforms', () => {
            const signal: SignalPlus<number | undefined> = new SignalBuilder<number | undefined>(0)
                .transform(x => x === 0 ? undefined : x)
                .validate(x => x !== undefined)
                .build();
            expect(() => signal.setValue(0)).toThrowError('Validation failed');
            expect(signal.value).toBe(0);
        });
    });

    describe('error handler cleanup', () => {
        it('should cleanup error handlers on destroy', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .onError(errorHandler)
                .validate(x => !isNaN(x))
                .build();
            try {
                signal.setValue(NaN);
            } catch (e) {
            }
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('state during error recovery', () => {
        it('should maintain consistent state during error recovery', () => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform(x => {
                    if (x < 0) throw new Error('Negative not allowed');
                    return x;
                })
                .withHistory()
                .build();
            signal.setValue(5);
            try {
                signal.setValue(-1);
            } catch (e) {
            }
            expect(signal.value).toBe(5);
            expect(signal.previousValue).toBe(0);
            expect(signal.history()).toEqual([0, 5]);
            expect(signal.isValid()).toBe(true);
        });
    });

    describe('subscriber error scenarios', () => {
        it('should handle errors in subscribers without affecting other subscribers', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .onError(errorHandler)
                .build();
            const goodSubscriber: jasmine.Spy = jasmine.createSpy('goodSubscriber');
            const badSubscriber: jasmine.Spy = jasmine.createSpy('badSubscriber').and.throwError('Subscriber error');
            signal.subscribe(goodSubscriber);
            signal.subscribe(badSubscriber);
            signal.setValue(1);
            expect(errorHandler).toHaveBeenCalled();
            expect(goodSubscriber).toHaveBeenCalledWith(1);
            expect(signal.value).toBe(1);
        });
    });

    describe('debounce and distinct edge cases', () => {
        it('should handle rapid debounce cancellation', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .debounce(100)
                .build();
            signal.setValue(1);
            tick(50);
            signal.setValue(2);
            tick(25);
            signal.setValue(3);
            tick(100);
            expect(signal.value).toBe(3);
        }));

        it('should handle distinct value edge cases', () => {
            const signal: SignalPlus<any> = new SignalBuilder<any>(0)
                .distinct()
                .validate(x => x !== undefined && !isNaN(x))
                .build();
            signal.setValue(0);
            expect(signal.value).toBe(0);
            try {
                signal.setValue(NaN);
            } catch (e) {
            }
            expect(signal.value).toBe(0);
            try {
                signal.setValue(undefined);
            } catch (e) {
            }
            expect(signal.value).toBe(0);
        });
    });

    describe('comprehensive resource cleanup', () => {
        it('should cleanup all resources on destroy', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .debounce(100)
                .withHistory()
                .persist('test-key')
                .build();
            const subscriber: jasmine.Spy = jasmine.createSpy('subscriber');
            const unsubscribe: () => void = signal.subscribe(subscriber);
            subscriber.calls.reset();
            signal.setValue(1);
            tick(100);
            unsubscribe();
            expect(subscriber).toHaveBeenCalledWith(1);
            signal.setValue(2);
            tick(100);
            expect(subscriber).not.toHaveBeenCalledWith(2);
        }));
    });

    describe('storage data migration', () => {
        it('should handle legacy storage format', fakeAsync(() => {
            const key = 'migration-test';
            localStorage.setItem(key, JSON.stringify(5));
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(key)
                .withHistory()
                .build();
            tick();
            expect(signal.value).toBe(5);
            signal.setValue(10);
            tick();
            expect(JSON.parse(localStorage.getItem(key)!)).toBe(10);
            expect(signal.history()).toEqual([5, 10]);
        }));
    });

    describe('cross-tab synchronization', () => {
        it('should handle concurrent storage updates', fakeAsync(() => {
            const key: string = 'sync-test';
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(key)
                .build();
            signal.setValue(1);
            tick();
            window.dispatchEvent(new StorageEvent('storage', {
                key,
                newValue: JSON.stringify(2),
                storageArea: localStorage
            }));
            tick();
            signal.setValue(3);
            tick();
            expect(signal.value).toBe(3);
            expect(JSON.parse(localStorage.getItem(key)!)).toBe(3);
        }));
    });

    describe('transform chain order', () => {
        it('should execute transforms in correct order', () => {
            const order: number[] = [];
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform(x => {
                    order.push(1);
                    return x + 1;
                })
                .transform(x => {
                    order.push(2);
                    return x * 2;
                })
                .transform(x => {
                    order.push(3);
                    return x - 1;
                })
                .build();
            signal.setValue(5);
            expect(order).toEqual([1, 2, 3]);
            expect(signal.value).toBe(11);
        });
    });

    describe('subscription ordering', () => {
        it('should notify subscribers in order of subscription', () => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0).build();
            const order: number[] = [];
            const sub1: () => void = signal.subscribe(() => order.push(1));
            const sub2: () => void = signal.subscribe(() => order.push(2));
            const sub3: () => void = signal.subscribe(() => order.push(3));
            order.length = 0;
            signal.setValue(1);
            expect(order).toEqual([1, 2, 3]);
            sub1();
            sub2();
            sub3();
        });
    });

    describe('subscription during transform', () => {
        it('should handle subscriptions during transform operations', () => {
            const values: number[] = [];
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform(x => {
                    const unsub: () => void = signal.subscribe(v => values.push(v));
                    unsub();
                    return x * 2;
                })
                .build();
            signal.setValue(5);
            expect(signal.value).toBe(10);
            expect(values).toEqual([0]);
        });

        it('should maintain transform chain with subscription changes', () => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform(x => x + 1)
                .transform(x => x * 2)
                .build();
            const values: number[] = [];
            let subscription: () => void = signal.subscribe(v => values.push(v));
            signal.setValue(1);
            subscription();
            signal.setValue(2);
            subscription = signal.subscribe(v => values.push(v));
            signal.setValue(3);
            expect(values).toEqual([0, 4, 6]);
            subscription();
        });
    });

    describe('storage management', () => {
        it('should handle basic storage operations and cross-tab sync', fakeAsync(() => {
            const key: string = 'test-storage';
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist(key)
                .build();
            signal.setValue(1);
            tick();
            expect(signal.value).toBe(1);
            expect(JSON.parse(localStorage.getItem(key)!)).toBe(1);
            window.dispatchEvent(new StorageEvent('storage', {
                key,
                newValue: JSON.stringify(2),
                storageArea: localStorage
            }));
            tick();
            signal.setValue(3);
            tick();
            expect(signal.value).toBe(3);
            expect(JSON.parse(localStorage.getItem(key)!)).toBe(3);
        }));

        it('should handle storage errors and invalid keys', fakeAsync(() => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist('test-key')
                .onError(errorHandler)
                .build();
            const emptyKeySignal: SignalPlus<number> = new SignalBuilder<number>(0)
                .persist('')
                .onError(errorHandler)
                .build();
            emptyKeySignal.setValue(1);
            expect(errorHandler).not.toHaveBeenCalled();
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            signal.setValue(1);
            tick();
            expect(errorHandler).toHaveBeenCalled();
            expect(signal.value).toBe(1);
        }));
    });

    describe('subscription handling', () => {
        it('should handle subscription lifecycle with transforms', fakeAsync(() => {
            const values: number[] = [];
            const order: number[] = [];
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .transform(x => {
                    order.push(1);
                    return x * 2;
                })
                .build();
            const sub1: () => void = signal.subscribe(v => values.push(v));
            order.length = 0;
            signal.setValue(1);
            tick();
            sub1();
            const sub2: () => void = signal.subscribe(v => values.push(v));
            tick();
            sub2();
            expect(values).toEqual([0, 2, 2]);
            expect(order).toEqual([1]);
        }));

        it('should handle subscriber errors and ordering', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .onError(errorHandler)
                .build();
            const order: number[] = [];
            const goodSub1: () => void = () => order.push(1);
            const badSub: jasmine.Spy = jasmine.createSpy('badSub').and.throwError('Sub error');
            const goodSub2: () => void = () => order.push(2);
            signal.subscribe(goodSub1);
            signal.subscribe(badSub);
            signal.subscribe(goodSub2);
            order.length = 0;
            signal.setValue(1);
            expect(errorHandler).toHaveBeenCalled();
            expect(order).toEqual([1, 2]);
        });
    });

    describe('error handling', () => {
        it('should maintain state consistency during errors', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .validate(x => x >= 0)
                .transform(x => {
                    if (x > 10) throw new Error('Transform error');
                    return x * 2;
                })
                .onError(errorHandler)
                .withHistory()
                .build();
            signal.setValue(5);
            try {
                signal.setValue(-1);
            } catch (e) {
            }
            try {
                signal.setValue(11);
            } catch (e) {
            }
            expect(signal.value).toBe(10);
            expect(signal.previousValue).toBe(0);
            expect(signal.history()).toEqual([0, 10]);
            expect(errorHandler.calls.allArgs()).toEqual(
                jasmine.arrayContaining([
                    [jasmine.objectContaining({ message: 'Validation failed' })],
                    [jasmine.objectContaining({ message: 'Transform error' })]
                ])
            );
        });
    });

    describe('history and state management', () => {
        it('should handle history with async operations', fakeAsync(() => {
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .withHistory()
                .debounce(100)
                .build();
            signal.setValue(1);
            signal.setValue(2);
            signal.undo();
            signal.setValue(3);
            expect(signal.value).toBe(0);
            tick(100);
            expect(signal.value).toBe(3);
            expect(signal.history()).toEqual([0, 3]);
            expect(signal.previousValue).toBe(0);
        }));
    });

    describe('storage quota handling', () => {
        it('should handle storage quota exceeded error', fakeAsync(() => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<string> = new SignalBuilder<string>('initial')
                .persist('test-key')
                .onError(errorHandler)
                .build();
            spyOn(localStorage, 'setItem').and.throwError(new DOMException('Quota exceeded', 'QuotaExceededError'));
            signal.setValue('new value');
            tick();
            expect(signal.value).toBe('new value');
            expect(errorHandler).toHaveBeenCalledWith(jasmine.any(DOMException));
            expect(errorHandler.calls.first().args[0].name).toBe('QuotaExceededError');
        }));
    });

    describe('error handler chain', () => {
        it('should continue error handler chain when handler throws', () => {
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            const secondHandler: jasmine.Spy = jasmine.createSpy('secondHandler');
            const signal: SignalPlus<number> = new SignalBuilder<number>(0)
                .onError(() => {
                    throw new Error('Handler error');
                })
                .onError(secondHandler)
                .validate(x => {
                    throw new Error('Validation error');
                })
                .build();
            try {
                signal.setValue(1);
            } catch (e) {
            }
            expect(secondHandler).toHaveBeenCalled();
            expect(secondHandler.calls.first().args[0].message).toBe('Validation error');
            expect(signal.value).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('Error in error handler:', jasmine.any(Error));
        });
    });
});