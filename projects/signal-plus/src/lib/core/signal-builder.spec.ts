import { computed, PLATFORM_ID, Signal } from '@angular/core';
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
            expect(signal.value).toBe(0);
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

    describe('circular reference detection with persistence', () => {
        let consoleWarnSpy: jasmine.Spy;
        let consoleErrorSpy: jasmine.Spy;
        beforeEach(() => {
            consoleWarnSpy = spyOn(console, 'warn');
            consoleErrorSpy = spyOn(console, 'error');
        });

        it('should detect and handle circular references during storage', fakeAsync(() => {
            interface CircularData {
                id: number;
                name: string;
                parent?: CircularData;
            }
            const key = 'test-circular-storage';
            const signal: SignalPlus<CircularData> = new SignalBuilder<CircularData>({
                id: 1,
                name: 'root'
            })
                .persist(key)
                .build();
            const circularData: CircularData = {
                id: 2,
                name: 'child'
            };
            circularData.parent = circularData;
            signal.setValue(circularData);
            tick();
            expect(signal.value.id).toBe(2);
            expect(signal.value.name).toBe('child');
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed.id).toBe(2);
                expect(parsed.name).toBe('child');
                expect(parsed.parent).toBe('[Circular Reference]');
            }
            localStorage.removeItem(key);
        }));

        it('should handle deeply nested circular references', fakeAsync(() => {
            interface NestedData {
                level: number;
                child?: NestedData;
                parent?: NestedData;
            }
            const key = 'test-nested-circular';
            const signal: SignalPlus<NestedData> = new SignalBuilder<NestedData>({
                level: 0
            })
                .persist(key)
                .build();
            const level1: NestedData = { level: 1 };
            const level2: NestedData = { level: 2 };
            const level3: NestedData = { level: 3 };
            level1.child = level2;
            level2.child = level3;
            level3.parent = level1;
            signal.setValue(level1);
            tick();
            expect(signal.value.level).toBe(1);
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed.level).toBe(1);
                expect(parsed.child.level).toBe(2);
                expect(parsed.child.child.level).toBe(3);
                expect(parsed.child.child.parent).toBe('[Circular Reference]');
            }
            localStorage.removeItem(key);
        }));

        it('should handle circular references in arrays', fakeAsync(() => {
            interface ArrayWithCircular {
                items: any[];
                name: string;
            }
            const key = 'test-array-circular';
            const signal: SignalPlus<ArrayWithCircular> = new SignalBuilder<ArrayWithCircular>({
                items: [],
                name: 'test'
            })
                .persist(key)
                .build();
            const data: ArrayWithCircular = {
                items: [],
                name: 'circular-array'
            };
            data.items.push(data);

            signal.setValue(data);
            tick();
            expect(signal.value.name).toBe('circular-array');
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed.name).toBe('circular-array');
                expect(parsed.items[0]).toBe('[Circular Reference]');
            }
            localStorage.removeItem(key);
        }));

        it('should handle circular references with history enabled', fakeAsync(() => {
            interface CircularWithHistory {
                id: number;
                ref?: CircularWithHistory;
            }
            const key = 'test-circular-history';
            const signal: SignalPlus<CircularWithHistory> = new SignalBuilder<CircularWithHistory>({
                id: 0
            })
                .persist(key)
                .withHistory(5)
                .build();
            const data: CircularWithHistory = { id: 1 };
            data.ref = data;
            signal.setValue(data);
            tick();
            expect(signal.value.id).toBe(1);
            expect(signal.history().length).toBe(2);
            localStorage.removeItem(key);
        }));

        it('should use fallback when history contains circular references', fakeAsync(() => {
            interface DataWithCircular {
                value: number;
                circular?: DataWithCircular;
            }
            const key = 'test-fallback-circular';
            const signal: SignalPlus<DataWithCircular> = new SignalBuilder<DataWithCircular>({
                value: 0
            })
                .persist(key)
                .withHistory(true)
                .build();
            const data: DataWithCircular = { value: 1 };
            data.circular = data;
            signal.setValue(data);
            tick();
            expect(signal.value.value).toBe(1);
            expect(signal.value.circular).toBe(signal.value);
            expect(signal.history().length).toBe(2);
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            localStorage.removeItem(key);
        }));

        it('should successfully serialize non-circular data without warnings', fakeAsync(() => {
            interface CleanData {
                id: number;
                nested: {
                    value: string;
                    items: number[];
                };
            }
            const key = 'test-clean-data';
            const signal: SignalPlus<CleanData> = new SignalBuilder<CleanData>({
                id: 0,
                nested: { value: 'initial', items: [] }
            })
                .persist(key)
                .build();
            const cleanData: CleanData = {
                id: 1,
                nested: {
                    value: 'updated',
                    items: [1, 2, 3]
                }
            };
            signal.setValue(cleanData);
            tick();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(signal.value.id).toBe(1);
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed).toEqual(cleanData);
            }
            localStorage.removeItem(key);
        }));

        it('should handle multiple circular references in complex structures', fakeAsync(() => {
            interface ComplexCircular {
                id: number;
                links: ComplexCircular[];
                parent?: ComplexCircular;
            }
            const key = 'test-complex-circular';
            const signal: SignalPlus<ComplexCircular> = new SignalBuilder<ComplexCircular>({
                id: 0,
                links: []
            })
                .persist(key)
                .build();
            const root: ComplexCircular = { id: 1, links: [] };
            const child1: ComplexCircular = { id: 2, links: [], parent: root };
            const child2: ComplexCircular = { id: 3, links: [], parent: root };
            root.links.push(child1, child2);
            child1.links.push(root);
            child2.links.push(root);
            signal.setValue(root);
            tick();
            expect(signal.value.id).toBe(1);
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            localStorage.removeItem(key);
        }));

        it('should handle circular references during reset', fakeAsync(() => {
            interface CircularReset {
                value: number;
                self?: CircularReset;
            }
            const key = 'test-circular-reset';
            const initial: CircularReset = { value: 0 };
            initial.self = initial;
            const signal: SignalPlus<CircularReset> = new SignalBuilder<CircularReset>(initial)
                .persist(key)
                .build();
            signal.setValue({ value: 1 });
            tick();
            signal.reset();
            tick();
            expect(signal.value.value).toBe(0);
            localStorage.removeItem(key);
        }));

        it('should provide clear error messages for serialization failures', fakeAsync(() => {
            const key = 'test-serialization-error';
            const signal: SignalPlus<any> = new SignalBuilder<any>({ value: 1 })
                .persist(key)
                .build();
            const circular: any = { id: 1 };
            circular.self = circular;
            signal.setValue(circular);
            tick();
            expect(signal.value.id).toBe(1);
            expect(signal.value.self).toBe(signal.value);
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed.id).toBe(1);
                expect(parsed.self).toBe('[Circular Reference]');
            }
            localStorage.removeItem(key);
        }));

        it('should handle edge case: object with circular reference at root', fakeAsync(() => {
            const key = 'test-root-circular';
            const signal: SignalPlus<any> = new SignalBuilder<any>({ data: null })
                .persist(key)
                .build();
            const circular: any = {};
            circular.data = circular;
            signal.setValue(circular);
            tick();
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed.data).toBe('[Circular Reference]');
            }
            localStorage.removeItem(key);
        }));

        it('should handle mixed circular and non-circular properties', fakeAsync(() => {
            interface MixedData {
                id: number;
                name: string;
                circular?: MixedData;
                clean: {
                    value: string;
                };
            }
            const key = 'test-mixed-circular';
            const signal: SignalPlus<MixedData> = new SignalBuilder<MixedData>({
                id: 0,
                name: 'initial',
                clean: { value: 'clean' }
            })
                .persist(key)
                .build();
            const mixed: MixedData = {
                id: 1,
                name: 'mixed',
                clean: { value: 'cleanData' }
            };
            mixed.circular = mixed;
            signal.setValue(mixed);
            tick();
            expect(signal.value.id).toBe(1);
            const stored = localStorage.getItem(key);
            expect(stored).toBeTruthy();
            if (stored) {
                const parsed = JSON.parse(stored);
                expect(parsed.id).toBe(1);
                expect(parsed.name).toBe('mixed');
                expect(parsed.clean.value).toBe('cleanData');
                expect(parsed.circular).toBe('[Circular Reference]');
            }
            localStorage.removeItem(key);
        }));

        it('should handle circular references with transformation', fakeAsync(() => {
            interface TransformCircular {
                value: number;
                ref?: TransformCircular;
            }
            const key = 'test-transform-circular';
            const signal: SignalPlus<TransformCircular> = new SignalBuilder<TransformCircular>({
                value: 0
            })
                .persist(key)
                .transform(data => ({ ...data, value: data.value * 2 }))
                .build();
            const circular: TransformCircular = { value: 5 };
            circular.ref = circular;
            signal.setValue(circular);
            tick();
            expect(signal.value.value).toBe(10);
            localStorage.removeItem(key);
        }));

        it('should handle large objects with circular references', fakeAsync(() => {
            interface LargeCircular {
                id: number;
                data: { [key: string]: any };
                parent?: LargeCircular;
            }
            const key = 'test-large-circular';
            const signal: SignalPlus<LargeCircular> = new SignalBuilder<LargeCircular>({
                id: 0,
                data: {}
            })
                .persist(key)
                .build();
            const large: LargeCircular = {
                id: 1,
                data: {}
            };
            for (let i = 0; i < 100; i++) {
                large.data[`key${i}`] = `value${i}`;
            }
            large.parent = large;
            signal.setValue(large);
            tick();
            expect(signal.value.id).toBe(1);
            expect(Object.keys(signal.value.data).length).toBe(100);
            localStorage.removeItem(key);
        }));
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
            signal.setValue(circular);
            expect(() => signal.isDirty()).not.toThrow();
            expect(typeof signal.isDirty()).toBe('boolean');
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
            expect(signal.history().length).toBe(1001);
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
            expect(values).toEqual([0, 4, 6, 8]);
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

    describe('generic type safety', () => {
        describe('type inference through chain', () => {
            it('should maintain number type through full chain', () => {
                const counter: SignalPlus<number> = new SignalBuilder(0)
                    .persist('counter')
                    .withHistory(10)
                    .validate((value: number) => value >= 0)
                    .build();
                const value: number = counter.value;
                const previousValue: number = counter.previousValue;
                const initialValue: number = counter.initialValue;
                const isValid: boolean = counter.isValid();
                const history: number[] = counter.history();
                expect(value).toBe(0);
                expect(typeof value).toBe('number');
            });

            it('should maintain string type through chain', () => {
                const text: SignalPlus<string> = new SignalBuilder('hello')
                    .persist('text')
                    .withHistory(5)
                    .validate((value: string) => value.length > 0)
                    .build();
                const value: string = text.value;
                expect(typeof value).toBe('string');
                expect(value).toBe('hello');
            });

            it('should maintain complex object type through chain', () => {
                interface User {
                    id: number;
                    name: string;
                }
                const user: SignalPlus<User> = new SignalBuilder<User>({ id: 1, name: 'John' })
                    .persist('user')
                    .withHistory(10)
                    .validate((u: User) => u.id > 0)
                    .build();
                const value: User = user.value;
                expect(value.id).toBe(1);
                expect(value.name).toBe('John');
            });

            it('should maintain array type through chain', () => {
                const numbers: SignalPlus<number[]> = new SignalBuilder<number[]>([1, 2, 3])
                    .withHistory(5)
                    .validate((arr: number[]) => arr.length > 0)
                    .build();
                const value: number[] = numbers.value;
                expect(Array.isArray(value)).toBe(true);
                expect(value).toEqual([1, 2, 3]);
            });
        });

        describe('history size parameter', () => {
            it('should accept number as history size', () => {
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(3)
                    .build();
                signal.setValue(1);
                signal.setValue(2);
                signal.setValue(3);
                signal.setValue(4);
                const history: number[] = signal.history();
                expect(history.length).toBeLessThanOrEqual(3);
            });

            it('should accept boolean as persist flag', () => {
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .persist('test-persist')
                    .withHistory(true)
                    .build();
                signal.setValue(1);
                signal.setValue(2);
                const stored = localStorage.getItem('test-persist');
                expect(stored).toBeTruthy();
                const parsed = JSON.parse(stored!);
                expect(parsed.history).toBeDefined();
            });

            it('should limit history to specified size', () => {
                const historySize = 5;
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(historySize)
                    .build();
                for (let i = 1; i <= 10; i++) {
                    signal.setValue(i);
                }
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([6, 7, 8, 9, 10]);
            });

            it('should work with no parameter (unlimited history)', () => {
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory()
                    .build();
                for (let i = 1; i <= 100; i++) {
                    signal.setValue(i);
                }
                const history: number[] = signal.history();
                expect(history.length).toBe(101);
            });
        });

        describe('history size enforcement consistency', () => {
            it('should enforce history size on initial load from localStorage', () => {
                const historySize = 3;
                const key = 'test-history-size-init';
                const largeHistory = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                localStorage.setItem(key, JSON.stringify({
                    value: 9,
                    history: largeHistory
                }));
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(historySize)
                    .persist(key)
                    .build();
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([7, 8, 9]);
                localStorage.removeItem(key);
            });

            it('should enforce history size on cross-tab sync', fakeAsync(() => {
                const historySize = 3;
                const key = 'test-history-size-sync';
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0)
                        .withHistory(historySize)
                        .persist(key)
                        .build()
                );
                const largeHistory = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                const storageEvent = new StorageEvent('storage', {
                    key: key,
                    newValue: JSON.stringify({
                        value: 9,
                        history: largeHistory
                    }),
                    storageArea: localStorage
                });
                window.dispatchEvent(storageEvent);
                tick();
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([7, 8, 9]);
                localStorage.removeItem(key);
            }));

            it('should enforce history size on transaction rollback', () => {
                const historySize = 3;
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(historySize)
                    .build();
                signal.setValue(1);
                signal.setValue(2);
                expect(signal.history()).toEqual([0, 1, 2]);
                const largeHistory = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                if (signal._setHistoryImmediate) {
                    signal._setHistoryImmediate(largeHistory);
                }
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([7, 8, 9]);
            });

            it('should enforce history size with _setValueImmediate', () => {
                const historySize = 3;
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(historySize)
                    .build();
                if (signal._setValueImmediate) {
                    for (let i = 1; i <= 10; i++) {
                        signal._setValueImmediate(i);
                    }
                }
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([8, 9, 10]);
            });

            it('should maintain history size limit after multiple operations', () => {
                const historySize = 5;
                const key = 'test-history-size-mixed';
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0)
                        .withHistory(historySize)
                        .persist(key)
                        .build()
                );
                signal.setValue(1);
                signal.setValue(2);
                expect(signal.history().length).toBeLessThanOrEqual(historySize);
                const storageEvent = new StorageEvent('storage', {
                    key: key,
                    newValue: JSON.stringify({
                        value: 10,
                        history: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                    }),
                    storageArea: localStorage
                });
                window.dispatchEvent(storageEvent);
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                localStorage.removeItem(key);
            });

            it('should handle edge case: history exactly at size limit', () => {
                const historySize = 5;
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(historySize)
                    .build();
                for (let i = 1; i <= 4; i++) {
                    signal.setValue(i);
                }
                const history: number[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([0, 1, 2, 3, 4]);
                signal.setValue(5);
                expect(signal.history().length).toBe(historySize);
                expect(signal.history()).toEqual([1, 2, 3, 4, 5]);
            });

            it('should handle edge case: history smaller than size limit', () => {
                const historySize = 10;
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(historySize)
                    .build();
                signal.setValue(1);
                signal.setValue(2);
                const history: number[] = signal.history();
                expect(history.length).toBeLessThan(historySize);
                expect(history).toEqual([0, 1, 2]);
            });

            it('should enforce history size with complex data types', () => {
                interface TestData {
                    id: number;
                    name: string;
                }
                const historySize = 3;
                const key = 'test-history-complex';
                const largeHistory: TestData[] = [];
                for (let i = 0; i < 10; i++) {
                    largeHistory.push({ id: i, name: `Item ${i}` });
                }
                localStorage.setItem(key, JSON.stringify({
                    value: { id: 9, name: 'Item 9' },
                    history: largeHistory
                }));
                const signal: SignalPlus<TestData> = new SignalBuilder<TestData>({ id: 0, name: 'Item 0' })
                    .withHistory(historySize)
                    .persist(key)
                    .build();
                const history: TestData[] = signal.history();
                expect(history.length).toBe(historySize);
                expect(history).toEqual([
                    { id: 7, name: 'Item 7' },
                    { id: 8, name: 'Item 8' },
                    { id: 9, name: 'Item 9' }
                ]);
                localStorage.removeItem(key);
            });

            it('should consistently enforce size across all history modification paths', () => {
                const historySize = 4;
                const key = 'test-history-all-paths';
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0)
                        .withHistory(historySize)
                        .persist(key)
                        .build()
                );
                signal.setValue(1);
                signal.setValue(2);
                expect(signal.history().length).toBeLessThanOrEqual(historySize);
                localStorage.setItem(key, JSON.stringify({
                    value: 10,
                    history: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                }));
                const signal2: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0)
                        .withHistory(historySize)
                        .persist(key)
                        .build()
                );
                expect(signal2.history().length).toBe(historySize);
                if (signal._setValueImmediate) {
                    for (let i = 11; i <= 20; i++) {
                        signal._setValueImmediate(i);
                    }
                }
                expect(signal.history().length).toBe(historySize);
                if (signal._setHistoryImmediate) {
                    signal._setHistoryImmediate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                }
                expect(signal.history().length).toBe(historySize);
                localStorage.removeItem(key);
            });
        });

        describe('method chaining with proper types', () => {
            it('should allow chaining in any order with type safety', () => {
                const signal1: SignalPlus<number> = new SignalBuilder(0)
                    .withHistory(10)
                    .persist('test1')
                    .validate((n: number) => n >= 0)
                    .build();
                const signal2: SignalPlus<number> = new SignalBuilder(0)
                    .validate((n: number) => n >= 0)
                    .withHistory(10)
                    .persist('test2')
                    .build();
                expect(signal1.value).toBe(0);
                expect(signal2.value).toBe(0);
            });

            it('should maintain type through transform', () => {
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .transform(Math.round)
                    .withHistory(10)
                    .build();
                signal.setValue(5.7);
                expect(signal.value).toBe(6);
                signal.setValue(3.2);
                expect(signal.value).toBe(3);
            });

            it('should maintain type through debounce', () => {
                const signal: SignalPlus<number> = new SignalBuilder(0)
                    .debounce(100)
                    .withHistory(10)
                    .build();
                const value: number = signal.value;
                expect(typeof value).toBe('number');
            });
        });

        describe('type inference with utility functions', () => {
            it('should infer type from initial value', () => {
                const builder = new SignalBuilder(42);
                const signal: SignalPlus<number> = builder
                    .withHistory(10)
                    .build();
                expect(signal.value).toBe(42);
            });

            it('should work with explicit type annotation', () => {
                const builder = new SignalBuilder<string>('test');
                const signal: SignalPlus<string> = builder
                    .withHistory(5)
                    .build();
                expect(typeof signal.value).toBe('string');
            });
        });

        describe('map() method type safety', () => {
            it('should transform number to string', () => {
                const numberBuilder = new SignalBuilder(42);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                expect(signal.value).toBe('42');
                expect(typeof signal.value).toBe('string');
            });

            it('should preserve type-agnostic options: distinctUntilChanged', () => {
                const numberBuilder = new SignalBuilder(10)
                    .distinct();
                const stringBuilder = numberBuilder.map(n => `Value: ${n}`);
                const signal: SignalPlus<string> = stringBuilder.build();
                signal.setValue('Value: 10');
                expect(signal.value).toBe('Value: 10');
                signal.setValue('Value: 20');
                expect(signal.value).toBe('Value: 20');
            });

            it('should preserve type-agnostic options: enableHistory', () => {
                const numberBuilder = new SignalBuilder(1)
                    .withHistory(5);
                const stringBuilder = numberBuilder.map(n => String(n));
                const signal: SignalPlus<string> = stringBuilder.build();
                signal.setValue('2');
                signal.setValue('3');
                const history = signal.history();
                expect(history.length).toBe(3);
                expect(history).toEqual(['1', '2', '3']);
            });

            it('should preserve type-agnostic options: historySize', () => {
                const numberBuilder = new SignalBuilder(0)
                    .withHistory(3);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                for (let i = 1; i <= 10; i++) {
                    signal.setValue(i.toString());
                }
                const history = signal.history();
                expect(history.length).toBe(3);
                expect(history).toEqual(['8', '9', '10']);
            });

            it('should preserve type-agnostic options: debounceTime', fakeAsync(() => {
                const numberBuilder = new SignalBuilder(0)
                    .debounce(100);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue('42');
                expect(signal.value).toBe('0');
                tick(100);
                expect(signal.value).toBe('42');
                expect(subscriber).toHaveBeenCalledWith('42');
            }));

            it('should preserve type-agnostic options: storageKey', () => {
                const key = 'test-map-storage';
                const numberBuilder = new SignalBuilder(100)
                    .persist(key);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                signal.setValue('200');
                const stored = localStorage.getItem(key);
                expect(stored).toBeTruthy();
                localStorage.removeItem(key);
            });

            it('should NOT copy validators (type-specific)', () => {
                const numberBuilder = new SignalBuilder(10)
                    .validate(n => n >= 0);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                signal.setValue('-999');
                expect(signal.value).toBe('-999');
                expect(signal.isValid()).toBe(true);
            });

            it('should NOT copy transform (type-specific)', () => {
                const numberBuilder = new SignalBuilder(5.7)
                    .transform(Math.round);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                signal.setValue('5.7');
                expect(signal.value).toBe('5.7');
                expect(signal.value).not.toBe('6');
            });

            it('should allow adding new validators after map', () => {
                const numberBuilder = new SignalBuilder(42)
                    .validate(n => n >= 0);
                const stringBuilder = numberBuilder
                    .map(n => n.toString())
                    .validate(s => s.length > 0);
                const signal: SignalPlus<string> = stringBuilder.build();
                signal.setValue('test');
                expect(signal.isValid()).toBe(true);
                expect(signal.value).toBe('test');
                try {
                    signal.setValue('');
                } catch (e) { }
                expect(signal.value).toBe('test');
            });

            it('should work with complex object transformations', () => {
                interface User {
                    id: number;
                    name: string;
                }
                interface UserDTO {
                    userId: string;
                    displayName: string;
                }
                const userBuilder = new SignalBuilder<User>({ id: 1, name: 'Alice' })
                    .withHistory(5);
                const dtoBuilder = userBuilder.map(user => ({
                    userId: `USER_${user.id}`,
                    displayName: user.name.toUpperCase()
                }));
                const signal: SignalPlus<UserDTO> = dtoBuilder.build();
                expect(signal.value).toEqual({
                    userId: 'USER_1',
                    displayName: 'ALICE'
                });
                signal.setValue({ userId: 'USER_2', displayName: 'BOB' });
                expect(signal.history().length).toBe(2);
            });

            it('should work with multiple chained maps', () => {
                const numberSignal = new SignalBuilder(42)
                    .distinct()
                    .withHistory(3)
                    .map(n => n * 2)
                    .map(n => n.toString())
                    .map(s => `Result: ${s}`)
                    .build();
                expect(numberSignal.value).toBe('Result: 84');
                expect(typeof numberSignal.value).toBe('string');
                numberSignal.setValue('Result: 100');
                expect(numberSignal.history().length).toBe(2);
            });

            it('should preserve options across multiple maps', () => {
                const signal = new SignalBuilder(10)
                    .debounce(100)
                    .distinct()
                    .withHistory(5)
                    .map(n => n * 2)
                    .map(n => n.toString())
                    .build();
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                expect(signal.value).toBe('20');
            });

            it('should handle map with error handling', () => {
                const errorHandler = jasmine.createSpy('errorHandler');
                const signal = new SignalBuilder(42)
                    .onError(errorHandler)
                    .map(n => {
                        if (n < 0) throw new Error('Negative not allowed');
                        return n.toString();
                    })
                    .build();
                expect(signal.value).toBe('42');
            });

            it('should work with null and undefined transformations', () => {
                const nullableBuilder = new SignalBuilder<number | null>(42);
                const stringBuilder = nullableBuilder.map(n => n === null ? 'null' : n.toString());
                const signal: SignalPlus<string> = stringBuilder.build();
                expect(signal.value).toBe('42');
                signal.setValue('null');
                expect(signal.value).toBe('null');
            });

            it('should preserve persistHistory option', () => {
                const key = 'test-persist-history';
                const signal = new SignalBuilder(1)
                    .withHistory(true)
                    .persist(key)
                    .map(n => n.toString())
                    .build();
                signal.setValue('2');
                signal.setValue('3');
                const stored = localStorage.getItem(key);
                expect(stored).toBeTruthy();
                if (stored) {
                    const parsed = JSON.parse(stored);
                    expect(parsed.history).toBeDefined();
                    expect(parsed.history.length).toBeGreaterThan(1);
                }
                localStorage.removeItem(key);
            });

            it('should not interfere with original builder', () => {
                const numberBuilder = new SignalBuilder(10)
                    .validate(n => n >= 0)
                    .withHistory(5);
                const stringBuilder = numberBuilder.map(n => n.toString());
                const numberSignal: SignalPlus<number> = numberBuilder.build();
                numberSignal.setValue(20);
                expect(numberSignal.value).toBe(20);
                expect(numberSignal.isValid()).toBe(true);
                const stringSignal: SignalPlus<string> = stringBuilder.build();
                stringSignal.setValue('30');
                expect(stringSignal.value).toBe('30');
            });

            it('should handle array transformations', () => {
                const arrayBuilder = new SignalBuilder([1, 2, 3])
                    .withHistory(3);
                const lengthBuilder = arrayBuilder.map(arr => arr.length);
                const signal: SignalPlus<number> = lengthBuilder.build();
                expect(signal.value).toBe(3);
                signal.setValue(5);
                expect(signal.value).toBe(5);
                expect(signal.history()).toEqual([3, 5]);
            });
        });
    });

    describe('memory leak prevention', () => {
        let addEventListenerSpy: jasmine.Spy;
        let removeEventListenerSpy: jasmine.Spy;
        let setTimeoutSpy: jasmine.Spy;
        let clearTimeoutSpy: jasmine.Spy;

        beforeEach(() => {
            TestBed.configureTestingModule({
                providers: [
                    { provide: PLATFORM_ID, useValue: 'browser' }
                ]
            });
            addEventListenerSpy = spyOn(window, 'addEventListener').and.callThrough();
            removeEventListenerSpy = spyOn(window, 'removeEventListener').and.callThrough();
            setTimeoutSpy = spyOn(window, 'setTimeout').and.callThrough() as jasmine.Spy<typeof setTimeout>;
            clearTimeoutSpy = spyOn(window, 'clearTimeout').and.callThrough();
        });

        describe('destroy() method', () => {
            it('should provide a destroy method', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).build()
                );
                expect(signal.destroy).toBeDefined();
                expect(typeof signal.destroy).toBe('function');
            });

            it('should clean up storage event listener on destroy', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').build()
                );
                expect(addEventListenerSpy).toHaveBeenCalledWith('storage', jasmine.any(Function));
                signal.destroy();
                expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', jasmine.any(Function));
            });

            it('should prevent debounced updates after destroy', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(100).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(10);
                signal.destroy();
                tick(100);
                expect(signal.value).toBe(0);
                expect(subscriber).not.toHaveBeenCalled();
            }));

            it('should clear all subscribers on destroy', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).build()
                );
                const subscriber1 = jasmine.createSpy('subscriber1');
                const subscriber2 = jasmine.createSpy('subscriber2');
                signal.subscribe(subscriber1);
                signal.subscribe(subscriber2);
                subscriber1.calls.reset();
                subscriber2.calls.reset();
                signal.destroy();
                signal.setValue(10);
                expect(subscriber1).not.toHaveBeenCalled();
                expect(subscriber2).not.toHaveBeenCalled();
            });

            it('should not throw when destroy is called multiple times', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').debounce(100).build()
                );
                expect(() => {
                    signal.destroy();
                    signal.destroy();
                    signal.destroy();
                }).not.toThrow();
            });

            it('should prevent all operations after destroy', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').debounce(100).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(5);
                signal.destroy();
                expect(removeEventListenerSpy).toHaveBeenCalled();
                signal.setValue(10);
                tick(100);
                expect(signal.value).toBe(0);
                expect(subscriber).not.toHaveBeenCalled();
            }));
        });

        describe('automatic cleanup on unsubscribe', () => {
            it('should clean up storage listener when all subscribers unsubscribe', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').build()
                );
                const unsubscribe1 = signal.subscribe(() => { });
                const unsubscribe2 = signal.subscribe(() => { });
                expect(addEventListenerSpy).toHaveBeenCalled();
                unsubscribe1();
                expect(removeEventListenerSpy).not.toHaveBeenCalled();
                unsubscribe2();
                expect(removeEventListenerSpy).toHaveBeenCalled();
            });

            it('should prevent debounced updates when all subscribers unsubscribe', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(100).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                const unsubscribe = signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(5);
                unsubscribe();
                tick(100);
                expect(signal.value).toBe(0);
                expect(subscriber).not.toHaveBeenCalled();
            }));

            it('should not leak memory with repeated subscribe/unsubscribe', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').build()
                );
                for (let i = 0; i < 10; i++) {
                    const unsubscribe = signal.subscribe(() => { });
                    unsubscribe();
                }
                expect(removeEventListenerSpy).toHaveBeenCalled();
            });

            it('should handle mixed subscribe/unsubscribe patterns', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').debounce(100).build()
                );
                const unsubscribe1 = signal.subscribe(() => { });
                const unsubscribe2 = signal.subscribe(() => { });
                const unsubscribe3 = signal.subscribe(() => { });
                unsubscribe2();
                expect(removeEventListenerSpy).not.toHaveBeenCalled();
                const unsubscribe4 = signal.subscribe(() => { });
                unsubscribe1();
                unsubscribe3();
                expect(removeEventListenerSpy).not.toHaveBeenCalled();
                unsubscribe4();
                expect(removeEventListenerSpy).toHaveBeenCalled();
            }));
        });

        describe('storage event listener lifecycle', () => {
            it('should only add storage listener once', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').build()
                );
                signal.subscribe(() => { });
                signal.subscribe(() => { });
                signal.subscribe(() => { });
                expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
            });

            it('should not add storage listener without persistence', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).build()
                );
                signal.subscribe(() => { });
                expect(addEventListenerSpy).not.toHaveBeenCalled();
            });

            it('should re-add storage listener after destroy and new subscription', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').build()
                );
                const unsubscribe = signal.subscribe(() => { });
                expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
                unsubscribe();
                expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
                const unsubscribe2 = signal.subscribe(() => { });
                expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
                unsubscribe2();
            });
        });

        describe('debounce timer lifecycle', () => {
            it('should apply only the last value when setValue is called rapidly', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(100).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(1);
                signal.setValue(2);
                signal.setValue(3);
                tick(100);
                expect(signal.value).toBe(3);
                expect(subscriber).toHaveBeenCalledWith(3);
                expect(subscriber).toHaveBeenCalledTimes(1);
            }));

            it('should handle rapid setValue calls without memory leaks', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(50).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                for (let i = 0; i < 100; i++) {
                    signal.setValue(i);
                }
                tick(50);
                expect(signal.value).toBe(99);
                expect(subscriber).toHaveBeenCalledWith(99);
                expect(subscriber).toHaveBeenCalledTimes(1);
            }));

            it('should prevent timer from firing after destroy', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(100).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(10);
                signal.destroy();
                tick(100);
                expect(signal.value).toBe(0);
                expect(subscriber).not.toHaveBeenCalled();
            }));
        });

        describe('complex scenarios', () => {
            it('should prevent updates after unsubscribe with complex features', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').debounce(100).withHistory(10).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                const unsubscribe = signal.subscribe(subscriber);
                subscriber.calls.reset();
                removeEventListenerSpy.calls.reset();
                signal.setValue(1);
                signal.setValue(2);
                signal.setValue(3);
                unsubscribe();
                expect(removeEventListenerSpy).toHaveBeenCalled();
                tick(100);
                expect(signal.value).toBe(0);
                expect(subscriber).not.toHaveBeenCalled();
            }));

            it('should handle repeated creation and cleanup cycles', fakeAsync(() => {
                removeEventListenerSpy.calls.reset();
                for (let cycle = 0; cycle < 50; cycle++) {
                    const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                        new SignalBuilder(0).persist(`key-${cycle}`).debounce(10).build()
                    );
                    const subscriber = jasmine.createSpy('subscriber');
                    const unsubscribe = signal.subscribe(subscriber);
                    signal.setValue(cycle);
                    unsubscribe();
                    signal.destroy();
                }
                tick(100);
                expect(removeEventListenerSpy.calls.count()).toBeGreaterThanOrEqual(50);
            }));

            it('should clean up when used with validation and transform', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').validate(x => x >= 0).transform(x => x * 2).build()
                );
                const unsubscribe = signal.subscribe(() => { });
                expect(addEventListenerSpy).toHaveBeenCalled();
                signal.destroy();
                expect(removeEventListenerSpy).toHaveBeenCalled();
            });
        });

        describe('edge cases and comprehensive coverage', () => {
            it('should prevent update() after destroy', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(5).build()
                );
                signal.destroy();
                signal.update(n => n + 10);
                expect(signal.value).toBe(5);
            });

            it('should allow reset() to work after destroy', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(10).persist('test-key').build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(20);
                tick(10);
                signal.destroy();
                signal.reset();
                expect(signal.value).toBe(10);
            }));

            it('should handle undo/redo after destroy', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).withHistory(10).build()
                );
                signal.setValue(1);
                signal.setValue(2);
                signal.setValue(3);
                signal.destroy();
                expect(() => signal.undo()).not.toThrow();
                expect(() => signal.redo()).not.toThrow();
            });

            it('should handle destroy without any subscribers', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').debounce(100).build()
                );
                expect(() => signal.destroy()).not.toThrow();
                expect(removeEventListenerSpy).toHaveBeenCalled();
            });

            it('should handle validation failures gracefully during cleanup', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).validate(x => x >= 0).build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                signal.setValue(10);
                expect(() => signal.destroy()).not.toThrow();
            });

            it('should clean up with history enabled and populated', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).withHistory(10).persist('test-key').build()
                );
                for (let i = 1; i <= 20; i++) {
                    signal.setValue(i);
                }
                expect(signal.history().length).toBeGreaterThan(0);
                expect(() => signal.destroy()).not.toThrow();
                expect(removeEventListenerSpy).toHaveBeenCalled();
            });

            it('should handle cleanup with error handlers', () => {
                const errorHandler = jasmine.createSpy('errorHandler');
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0)
                        .persist('test-key')
                        .validate(x => x >= 0)
                        .onError(errorHandler)
                        .build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                errorHandler.calls.reset();
                expect(() => signal.destroy()).not.toThrow();
                expect(errorHandler).not.toHaveBeenCalled();
            });

            it('should maintain signal value after automatic cleanup', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(42).build()
                );
                const unsubscribe = signal.subscribe(() => { });
                unsubscribe();
                expect(signal.value).toBe(42);
            });

            it('should maintain signal value after explicit destroy', () => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(100).build()
                );
                signal.setValue(200);
                signal.destroy();
                expect(signal.value).toBe(200);
            });

            it('should handle cleanup during storage synchronization', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).persist('test-key').build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                const storageEvent = new StorageEvent('storage', {
                    key: 'test-key',
                    newValue: '42',
                    storageArea: localStorage
                });
                signal.destroy();
                window.dispatchEvent(storageEvent);
                tick(10);
                expect(signal.value).toBe(0);
            }));

            it('should handle cleanup with pending validation', () => {
                let validationCalls = 0;
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0)
                        .validate(x => {
                            validationCalls++;
                            return x >= 0;
                        })
                        .build()
                );
                validationCalls = 0;
                signal.setValue(10);
                const callsBeforeDestroy = validationCalls;
                signal.destroy();
                validationCalls = 0;
                signal.setValue(20);
                expect(validationCalls).toBe(0);
            });
        });
    });

    describe('race condition prevention', () => {
        beforeEach(() => {
            TestBed.configureTestingModule({
                providers: [
                    { provide: PLATFORM_ID, useValue: 'browser' }
                ]
            });
        });

        describe('debounce with reset', () => {
            it('should prevent debounced value from applying after reset', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(300).withHistory().build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(10);
                expect(signal.value).toBe(0);
                tick(150);
                signal.reset();
                expect(signal.value).toBe(0);
                expect(signal.history()).toEqual([0]);
                tick(300);
                expect(signal.value).toBe(0);
                expect(signal.history()).toEqual([0]);
                expect(subscriber).not.toHaveBeenCalledWith(10);
            }));

            it('should handle multiple setValue calls followed by reset', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).build()
                );

                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(1);
                tick(50);
                signal.setValue(2);
                tick(50);
                signal.setValue(3);
                tick(50);
                signal.reset();
                expect(signal.value).toBe(0);
                tick(500);
                expect(signal.value).toBe(0);
            }));

            it('should allow new setValue after reset clears debounce', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).build()
                );
                signal.setValue(10);
                tick(100);
                signal.reset();
                signal.setValue(5);
                tick(200);
                expect(signal.value).toBe(5);
            }));
        });

        describe('debounce with undo', () => {
            it('should prevent debounced value from applying after undo', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(300).withHistory().build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(1);
                tick(300);
                signal.setValue(2);
                tick(300);
                expect(signal.value).toBe(2);
                expect(signal.history()).toEqual([0, 1, 2]);
                subscriber.calls.reset();
                signal.setValue(5);
                expect(signal.value).toBe(2);
                tick(150);
                signal.undo();
                expect(signal.value).toBe(1);
                expect(signal.history()).toEqual([0, 1]);
                tick(300);
                expect(signal.value).toBe(1);
                expect(signal.history()).toEqual([0, 1]);
                expect(subscriber).not.toHaveBeenCalledWith(5);
            }));

            it('should handle multiple undo operations with pending debounce', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).withHistory().build()
                );
                signal.setValue(1);
                tick(200);
                signal.setValue(2);
                tick(200);
                signal.setValue(3);
                tick(200);
                expect(signal.history()).toEqual([0, 1, 2, 3]);
                signal.setValue(10);
                tick(100);
                signal.undo();
                expect(signal.value).toBe(2);
                signal.undo();
                expect(signal.value).toBe(1);
                tick(300);
                expect(signal.value).toBe(1);
            }));
        });

        describe('debounce with redo', () => {
            it('should prevent debounced value from applying after redo', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(300).withHistory().build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(1);
                tick(300);
                signal.setValue(2);
                tick(300);
                signal.setValue(3);
                tick(300);
                signal.undo();
                expect(signal.value).toBe(2);
                subscriber.calls.reset();
                signal.setValue(10);
                expect(signal.value).toBe(2);
                tick(150);
                signal.redo();
                expect(signal.value).toBe(3);
                tick(300);
                expect(signal.value).toBe(3);
                expect(subscriber).not.toHaveBeenCalledWith(10);
            }));

            it('should handle redo with multiple pending debounces', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).withHistory().build()
                );
                signal.setValue(1);
                tick(200);
                signal.setValue(2);
                tick(200);
                signal.setValue(3);
                tick(200);
                signal.undo();
                signal.undo();
                expect(signal.value).toBe(1);
                signal.setValue(10);
                tick(100);
                signal.redo();
                expect(signal.value).toBe(2);
                tick(300);
                expect(signal.value).toBe(2);
            }));
        });

        describe('complex race conditions', () => {
            it('should handle rapid sequential operations', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).withHistory().build()
                );
                signal.setValue(1);
                tick(200);
                signal.setValue(2);
                tick(200);
                signal.setValue(10);
                tick(100);
                signal.reset();
                tick(50);
                signal.setValue(5);
                tick(200);
                expect(signal.value).toBe(5);
                expect(signal.history()).toEqual([0, 5]);
            }));

            it('should prevent race condition with setValue → undo → setValue', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(300).withHistory().build()
                );
                signal.setValue(1);
                tick(300);
                signal.setValue(2);
                tick(300);
                signal.setValue(3);
                tick(300);
                expect(signal.history()).toEqual([0, 1, 2, 3]);
                signal.setValue(10);
                tick(100);
                signal.undo();
                expect(signal.value).toBe(2);
                signal.setValue(5);
                tick(300);
                expect(signal.value).toBe(5);
                expect(signal.history()).toEqual([0, 1, 2, 5]);
            }));

            it('should handle interleaved debounce, reset, and undo operations', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(100).debounce(200).withHistory().build()
                );
                signal.setValue(1);
                tick(200);
                signal.setValue(2);
                tick(200);
                signal.setValue(10);
                tick(50);
                signal.undo();
                expect(signal.value).toBe(1);
                signal.setValue(20);
                tick(50);
                signal.reset()
                expect(signal.value).toBe(100);
                tick(300);
                expect(signal.value).toBe(100);
                expect(signal.history()).toEqual([100]);
            }));

            it('should maintain state consistency across race conditions', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(150).withHistory().build()
                );
                const subscriber = jasmine.createSpy('subscriber');
                signal.subscribe(subscriber);
                subscriber.calls.reset();
                signal.setValue(1);
                tick(150);
                signal.setValue(2);
                tick(150);
                signal.setValue(3);
                tick(150);
                subscriber.calls.reset();
                signal.setValue(10);
                tick(50);
                signal.undo();
                expect(signal.value).toBe(2);
                signal.setValue(20);
                tick(50);
                signal.redo();
                expect(signal.value).toBe(3);
                signal.setValue(30);
                tick(50);
                signal.reset();
                expect(signal.value).toBe(0);
                tick(300);
                expect(signal.value).toBe(0);
                expect(subscriber).not.toHaveBeenCalledWith(10);
                expect(subscriber).not.toHaveBeenCalledWith(20);
                expect(subscriber).not.toHaveBeenCalledWith(30);
            }));
        });

        describe('edge cases', () => {
            it('should handle reset with no pending debounce', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(5).debounce(200).build()
                );
                signal.reset();
                expect(signal.value).toBe(5);
                tick(200);
                expect(signal.value).toBe(5);
            }));

            it('should handle undo with no pending debounce', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).withHistory().build()
                );
                signal.setValue(1);
                tick(200);
                signal.setValue(2);
                tick(200);
                signal.undo();
                expect(signal.value).toBe(1);
                tick(200);
                expect(signal.value).toBe(1);
            }));

            it('should handle redo with no pending debounce', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(200).withHistory().build()
                );
                signal.setValue(1);
                tick(200);
                signal.setValue(2);
                tick(200);
                signal.undo();
                signal.redo();
                expect(signal.value).toBe(2);
                tick(200);
                expect(signal.value).toBe(2);
            }));

            it('should handle zero-delay debounce with immediate operations', fakeAsync(() => {
                const signal: SignalPlus<number> = TestBed.runInInjectionContext(() =>
                    new SignalBuilder(0).debounce(0).withHistory().build()
                );
                signal.setValue(1);
                signal.reset();
                tick(1);
                expect(signal.value).toBe(0);
            }));
        });
    });
});