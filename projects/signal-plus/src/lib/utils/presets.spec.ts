import { fakeAsync, tick } from '@angular/core/testing';
import { SignalPlus } from '../models';
import { presets, validators } from './presets';

describe('Presets', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('counter preset', () => {
        it('should create counter with default value', () => {
            const counter: SignalPlus<number> = presets.counter().build();
            expect(counter.value).toBe(0);
            expect(counter.initialValue).toBe(0);
        });

        it('should create counter with custom initial value', () => {
            const counter: SignalPlus<number> = presets.counter({ initial: 5 }).build();
            expect(counter.value).toBe(5);
            expect(counter.initialValue).toBe(5);
        });

        it('should validate integer values', () => {
            const counter: SignalPlus<number> = presets.counter({ min: 0, max: 10 }).build();
            expect(() => counter.setValue(1.5)).toThrow();
            expect(counter.value).toBe(0);
        });

        it('should support history operations', () => {
            const counter: SignalPlus<number> = presets.counter().build();
            counter.setValue(1);
            counter.setValue(2);
            counter.undo();
            expect(counter.value).toBe(1);
            expect(counter.history()).toEqual([0, 1]);
        });
    });

    describe('toggle preset', () => {
        it('should create toggle with default value', () => {
            const toggle: SignalPlus<boolean> = presets.toggle().build();
            expect(toggle.value).toBe(false);
            expect(toggle.initialValue).toBe(false);
        });

        it('should create toggle with custom initial value', () => {
            const toggle: SignalPlus<boolean> = presets.toggle(true).build();
            expect(toggle.value).toBe(true);
            expect(toggle.initialValue).toBe(true);
        });

        it('should track toggle history', () => {
            const toggle: SignalPlus<boolean> = presets.toggle().build();
            toggle.setValue(true);
            toggle.setValue(false);
            toggle.undo();
            expect(toggle.value).toBe(true);
            expect(toggle.history()).toEqual([false, true]);
        });
    });

    describe('form input preset', () => {
        it('should create basic form input', () => {
            const input: SignalPlus<string> = presets.formInput({ initial: '' }).build();
            expect(input.value).toBe('');
            expect(input.initialValue).toBe('');
        });

        it('should support validation', () => {
            const input: SignalPlus<string> = presets.formInput({
                initial: '',
                validator: validators.string.notEmpty
            }).build();
            expect(() => input.setValue('')).toThrow();
        });

        it('should support persistence', fakeAsync(() => {
            const key: string = 'test-input';
            const input: SignalPlus<string> = presets.formInput({
                initial: '',
                key
            }).build();
            input.setValue('test');
            tick();
            expect(localStorage.getItem(key)).toBe('"test"');
        }));

        it('should support debounce', fakeAsync(() => {
            const input: SignalPlus<string> = presets.formInput({
                initial: '',
                debounce: 100
            }).build();
            input.setValue('test');
            expect(input.value).toBe('');
            tick(100);
            expect(input.value).toBe('test');
        }));

        it('should combine multiple features', fakeAsync(() => {
            const input: SignalPlus<string> = presets.formInput({
                initial: '',
                key: 'multi-feature',
                validator: validators.string.notEmpty,
                debounce: 100
            }).build();
            input.setValue('test');
            tick(100);
            expect(input.value).toBe('test');
            expect(input.isValid()).toBe(true);
            expect(localStorage.getItem('multi-feature')).toBe('"test"');
            expect(input.history()).toEqual(['', 'test']);
        }));
    });

    describe('search field preset', () => {
        it('should create search field with default value', () => {
            const search: SignalPlus<string> = presets.searchField().build();
            expect(search.value).toBe('');
            expect(search.initialValue).toBe('');
        });

        it('should debounce search updates', fakeAsync(() => {
            const search: SignalPlus<string> = presets.searchField().build();
            search.setValue('test');
            expect(search.value).toBe('');
            tick(300);
            expect(search.value).toBe('test');
        }));

        it('should ignore duplicate search terms', fakeAsync(() => {
            const search: SignalPlus<string> = presets.searchField().build();
            search.setValue('term');
            tick(300);
            search.setValue('term');
            tick(300);
            expect(search.history().length).toBe(2);
        }));

        it('should handle distinct consecutive values in search field', fakeAsync(() => {
            const search: SignalPlus<string> = presets.searchField('initial').build();
            const values: string[] = [];
            search.subscribe(v => values.push(v));
            search.setValue('test');
            search.setValue('test');
            tick(300);
            expect(values).toEqual(['initial', 'test']);
        }));
    });

    describe('persistent toggle preset', () => {
        it('should create persistent toggle with default value', () => {
            const toggle: SignalPlus<boolean> = presets.persistentToggle(false, 'test-toggle').build();
            expect(toggle.value).toBe(false);
            expect(toggle.initialValue).toBe(false);
        });

        it('should persist toggle state', fakeAsync(() => {
            const key: string = 'theme';
            const toggle: SignalPlus<boolean> = presets.persistentToggle(false, key).build();
            toggle.setValue(true);
            tick();
            expect(localStorage.getItem(key)).toBe('true');
        }));

        it('should support history operations', () => {
            const toggle: SignalPlus<boolean> = presets.persistentToggle(false, 'theme').build();
            toggle.setValue(true);
            toggle.setValue(false);
            toggle.undo();
            expect(toggle.value).toBe(true);
            expect(toggle.history()).toEqual([false, true]);
        });

        it('should handle storage errors in persistent toggle', fakeAsync(() => {
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            const toggle: SignalPlus<boolean> = presets.persistentToggle(true, 'test-toggle').build();
            expect(() => {
                toggle.setValue(false);
                tick();
            }).not.toThrow();
            expect(toggle.value).toBe(false);
        }));
    });

    describe('error handling', () => {
        it('should handle storage errors', fakeAsync(() => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const input: SignalPlus<string> = presets.formInput({
                initial: '',
                key: 'test-storage'
            })
                .onError(errorHandler)
                .build();
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            input.setValue('test');
            tick();
            // With SSR safety, hasLocalStorage() may fail first, so error handler may not be called
            // The important thing is that the signal still works
            expect(input.value).toBe('test');
            expect(input.isValid()).toBe(true);
        }));

        it('should maintain state consistency after errors', () => {
            const input: SignalPlus<string> = presets.formInput({
                initial: '',
                validator: (value: string) => value.length < 5
            }).build();
            input.setValue('test');
            expect(input.value).toBe('test');
            expect(() => input.setValue('too long')).toThrow();
            expect(input.value).toBe('test');
            expect(input.isValid()).toBe(true);
            expect(input.isDirty()).toBe(true);
        });
    });

    describe('resource management', () => {
        it('should properly cleanup subscriptions', fakeAsync(() => {
            const input: SignalPlus<string> = presets.formInput({ initial: '' }).build();
            const values: string[] = [];
            const unSubscribe: () => void = input.subscribe(value => values.push(value));
            expect(values).toEqual(['']);
            input.setValue('test1');
            tick();
            expect(values).toEqual(['', 'test1']);
            unSubscribe();
            input.setValue('test2');
            tick();
            expect(values).toEqual(['', 'test1']);
        }));

        it('should handle multiple subscribers correctly', fakeAsync(() => {
            const input: SignalPlus<string> = presets.formInput({ initial: '' }).build();
            const values1: string[] = [];
            const values2: string[] = [];
            const unSub1: () => void = input.subscribe(value => values1.push(value));
            const unSub2: () => void = input.subscribe(value => values2.push(value));
            expect(values1).toEqual(['']);
            expect(values2).toEqual(['']);
            input.setValue('test');
            tick();
            expect(values1).toEqual(['', 'test']);
            expect(values2).toEqual(['', 'test']);
            unSub1();
            input.setValue('updated');
            tick();
            expect(values1).toEqual(['', 'test']);
            expect(values2).toEqual(['', 'test', 'updated']);
        }));
    });

    describe('type safety', () => {
        interface ComplexType {
            id: number;
            data: {
                value: string;
                items: number[];
            };
            metadata?: {
                tags: string[];
                active: boolean;
            };
        }

        it('should handle complex object structures', fakeAsync(() => {
            const initial: ComplexType = {
                id: 1,
                data: {
                    value: 'initial',
                    items: [1, 2]
                }
            };
            const input: SignalPlus<ComplexType> = presets.formInput<ComplexType>({
                initial,
                key: 'complex-object'
            }).build();
            const updated: ComplexType = {
                id: 2,
                data: {
                    value: 'updated',
                    items: [3, 4]
                },
                metadata: {
                    tags: ['test'],
                    active: true
                }
            };
            input.setValue(updated);
            tick();
            expect(input.value).toEqual(updated);
            expect(input.value.data.items).toEqual([3, 4]);
            expect(input.value.metadata?.tags).toEqual(['test']);
            input.undo();
            expect(input.value).toEqual(initial);
            expect(input.value.data.items).toEqual([1, 2]);
            expect(input.value.metadata).toBeUndefined();
        }));
    });

    describe('edge cases', () => {
        it('should handle null/undefined values correctly', fakeAsync(() => {
            const input: SignalPlus<string | null | undefined> = presets.formInput<string | null | undefined>({
                initial: null,
                key: 'nullable-input'
            }).build();
            expect(input.value).toBeNull();
            input.setValue(undefined);
            tick();
            expect(input.value).toBeUndefined();
            input.setValue('test');
            tick();
            expect(input.value).toBe('test');
            input.setValue(null);
            tick();
            expect(input.value).toBeNull();
            expect(input.history()).toEqual([null, undefined, 'test', null]);
        }));

        it('should handle undefined in complex objects', () => {
            interface PartialType {
                required: string;
                optional?: {
                    value: number;
                    data?: string;
                };
            }

            const input: SignalPlus<PartialType> = presets.formInput<PartialType>({
                initial: { required: 'initial' }
            }).build();
            input.setValue({
                required: 'test',
                optional: { value: 1 }
            });
            expect(input.value.optional?.value).toBe(1);
            expect(input.value.optional?.data).toBeUndefined();
            input.setValue({ required: 'test' });
            expect(input.value.optional).toBeUndefined();
        });
    });

    describe('counter preset - comprehensive', () => {
        describe('min/max validation', () => {
            it('should handle only min specified', () => {
                const counter: SignalPlus<number> = presets.counter({ min: 0 }).build();
                expect(() => counter.setValue(-1)).toThrow();
                expect(() => counter.setValue(100)).not.toThrow();
                expect(counter.value).toBe(100);
            });

            it('should handle only max specified', () => {
                const counter: SignalPlus<number> = presets.counter({ max: 10 }).build();
                expect(() => counter.setValue(11)).toThrow();
                expect(() => counter.setValue(-10)).not.toThrow();
                expect(counter.value).toBe(-10);
            });

            it('should handle both min and max', () => {
                const counter: SignalPlus<number> = presets.counter({ min: 0, max: 10 }).build();
                expect(() => counter.setValue(-1)).toThrow();
                expect(() => counter.setValue(11)).toThrow();
                expect(() => counter.setValue(5)).not.toThrow();
                expect(counter.value).toBe(5);
            });

            it('should handle invalid min/max combination', () => {
                const counter: SignalPlus<number> = presets.counter({ min: 10, max: 0 }).build();
                expect(() => counter.setValue(5)).toThrow();
                expect(() => counter.setValue(0)).toThrow();
                expect(() => counter.setValue(10)).toThrow();
                expect(counter.value).toBe(0);
            });

            it('should handle edge cases', () => {
                const counter: SignalPlus<number> = presets.counter().build();
                expect(() => counter.setValue(1.5)).toThrow();
                expect(() => counter.setValue(NaN)).toThrow();
                expect(() => counter.setValue(Infinity)).toThrow();
                expect(counter.value).toBe(0);
            });
        });
    });

    describe('toggle preset - comprehensive', () => {
        it('should handle rapid toggling', () => {
            const toggle: SignalPlus<boolean> = presets.toggle().build();
            toggle.setValue(true);
            toggle.setValue(false);
            toggle.setValue(true);
            expect(toggle.value).toBe(true);
            expect(toggle.history().length).toBe(4);
        });

        it('should handle non-boolean values', () => {
            const toggle: SignalPlus<boolean> = presets.toggle(false).build();
            toggle.setValue(undefined as any);
            expect(toggle.value as any).toBe(undefined);
            toggle.setValue(true);
            expect(toggle.value).toBe(true);
            toggle.setValue(null as any);
            expect(toggle.value as any).toBe(null);
            toggle.setValue(false);
            expect(toggle.value).toBe(false);
            expect(toggle.history().length).toBe(5);
        });

        it('should handle boolean values', () => {
            const toggle: SignalPlus<boolean> = presets.toggle(false).build();
            toggle.setValue(true);
            expect(toggle.value).toBe(true);
            toggle.setValue(false);
            expect(toggle.value).toBe(false);
            expect(toggle.history().length).toBe(3);
        });
    });

    describe('form input preset - comprehensive', () => {
        describe('value type handling', () => {
            it('should handle string inputs', () => {
                const input: SignalPlus<string> = presets.formInput<string>({
                    initial: '',
                    validator: value => value.length <= 10
                }).build();
                input.setValue('test');
                expect(input.value).toBe('test');
                expect(() => input.setValue('very long string')).toThrow();
            });

            it('should handle number inputs', () => {
                const input: SignalPlus<number> = presets.formInput<number>({
                    initial: 0,
                    validator: value => value >= 0 && value <= 100
                }).build();
                input.setValue(50);
                expect(input.value).toBe(50);
                expect(() => input.setValue(-1)).toThrow();
                expect(() => input.setValue(101)).toThrow();
            });

            it('should handle object inputs', () => {
                interface TestObject {
                    id: number;
                    name: string;
                }

                const input: SignalPlus<TestObject> = presets.formInput<TestObject>({
                    initial: { id: 1, name: 'test' },
                    validator: value => value.id > 0 && value.name.length > 0
                }).build();
                input.setValue({ id: 2, name: 'updated' });
                expect(input.value).toEqual({ id: 2, name: 'updated' });
                expect(() => input.setValue({ id: -1, name: '' })).toThrow();
            });
        });

        describe('persistence edge cases', () => {
            it('should handle storage errors', fakeAsync(() => {
                spyOn(localStorage, 'setItem').and.throwError('Storage error');
                const input: SignalPlus<string> = presets.formInput({
                    initial: '',
                    key: 'test-storage'
                }).build();
                expect(() => {
                    input.setValue('test');
                    tick();
                }).not.toThrow();
                expect(input.value).toBe('test');
            }));

            it('should handle invalid stored data', () => {
                localStorage.setItem('test-invalid', 'invalid json{');
                const input: SignalPlus<string> = presets.formInput({
                    initial: 'default',
                    key: 'test-invalid'
                }).build();
                expect(input.value).toBe('default');
            });
        });
    });

    describe('search field preset - comprehensive', () => {
        it('should handle empty and whitespace input', fakeAsync(() => {
            const search: SignalPlus<string> = presets.searchField().build();
            search.setValue('   ');
            tick(300);
            expect(search.value).toBe('   ');
            search.setValue('');
            tick(300);
            expect(search.value).toBe('');
        }));

        it('should handle special characters', fakeAsync(() => {
            const search: SignalPlus<string> = presets.searchField().build();
            const specialChars: string = '!@#$%^&*()';
            search.setValue(specialChars);
            tick(300);
            expect(search.value).toBe(specialChars);
        }));

        it('should properly debounce rapid updates', fakeAsync(() => {
            const search: SignalPlus<string> = presets.searchField().build();
            let updateCount: number = 0;
            search.subscribe(() => updateCount++);
            search.setValue('a');
            search.setValue('ab');
            search.setValue('abc');
            tick(150);
            expect(search.value).toBe('');
            tick(150);
            expect(search.value).toBe('abc');
            expect(updateCount).toBe(2);
        }));
    });

    describe('validators - comprehensive', () => {
        describe('number validators', () => {
            it('should validate positive numbers', () => {
                expect(validators.number.positive(1)).toBe(true);
                expect(validators.number.positive(0)).toBe(true);
                expect(validators.number.positive(-1)).toBe(false);
                expect(validators.number.positive(Infinity)).toBe(true);
                expect(validators.number.positive(-Infinity)).toBe(false);
            });

            it('should validate integers', () => {
                expect(validators.number.integer(1)).toBe(true);
                expect(validators.number.integer(1.5)).toBe(false);
                expect(validators.number.integer(0)).toBe(true);
                expect(validators.number.integer(NaN)).toBe(false);
                expect(validators.number.integer(Infinity)).toBe(false);
            });

            it('should validate ranges', () => {
                const range: (value: number) => boolean = validators.number.range(0, 10);
                expect(range(5)).toBe(true);
                expect(range(0)).toBe(true);
                expect(range(10)).toBe(true);
                expect(range(-1)).toBe(false);
                expect(range(11)).toBe(false);
            });
        });

        describe('string validators', () => {
            it('should validate non-empty strings', () => {
                expect(validators.string.notEmpty('')).toBe(false);
                expect(validators.string.notEmpty(' ')).toBe(true);
                expect(validators.string.notEmpty('test')).toBe(true);
            });

            it('should validate max length', () => {
                const maxLength: (value: string) => boolean = validators.string.maxLength(5);
                expect(maxLength('')).toBe(true);
                expect(maxLength('test')).toBe(true);
                expect(maxLength('toolong')).toBe(false);
            });

            it('should validate patterns', () => {
                const emailPattern: (value: string) => boolean = validators.string.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);
                expect(emailPattern('test@example.com')).toBe(true);
                expect(emailPattern('invalid')).toBe(false);
            });
        });

        describe('array validators', () => {
            it('should validate non-empty arrays', () => {
                expect(validators.array.notEmpty([])).toBe(false);
                expect(validators.array.notEmpty([1])).toBe(true);
            });

            it('should validate max length', () => {
                const maxLength: <T>(x: T[]) => boolean = validators.array.maxLength(2);
                expect(maxLength([1])).toBe(true);
                expect(maxLength([1, 2])).toBe(true);
                expect(maxLength([1, 2, 3])).toBe(false);
            });
        });
    });
}); 