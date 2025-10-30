import { fakeAsync, tick } from '@angular/core/testing';
import { SignalPlus } from '../models';
import { sp, spCounter, spForm, spToggle, createSimple } from './create';

describe('Signal Creation Utils', () => {
    let originalLocalStorage: Storage;
    let mockStorage: { [key: string]: string } = {};

    beforeEach(() => {
        originalLocalStorage = window.localStorage;
        mockStorage = {};
        const mockLocalStorage = {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, value: string) => { mockStorage[key] = value; },
            clear: () => { mockStorage = {}; },
            removeItem: (key: string) => { delete mockStorage[key]; },
            length: 0,
            key: (index: number) => Object.keys(mockStorage)[index]
        };
        Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
    });

    afterEach(() => {
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
        mockStorage = {};
    });

    describe('sp function', () => {
        it('should create basic signal', () => {
            const signal: SignalPlus<number> = sp(0).build();
            expect(signal.value).toEqual(0);
        });

        it('should support validation', () => {
            const signal: SignalPlus<number> = sp(0)
                .validate((n: number) => n >= 0)
                .build();
            expect(() => signal.setValue(-1)).toThrow();
            expect(signal.value).toEqual(0);
        });

        it('should support persistence', fakeAsync(() => {
            const signal: SignalPlus<string> = sp('test')
                .persist('test-key')
                .build();
            signal.setValue('updated');
            tick();
            expect(localStorage.getItem('test-key')).toBe('"updated"');
        }));

        it('should support history', () => {
            const signal: SignalPlus<number> = sp(0)
                .withHistory(true)
                .build();
            signal.setValue(1);
            signal.setValue(2);
            signal.undo();
            expect(signal.value).toBe(1);
        });

        it('should support multiple features', fakeAsync(() => {
            const signal: SignalPlus<number> = sp(0)
                .validate((n: number) => n >= 0)
                .persist('test-multi')
                .withHistory(true)
                .build();
            signal.setValue(1);
            signal.setValue(2);
            tick();
            expect(signal.value).toEqual(2);
            expect(signal.isValid()).toBe(true);
            const storedData = JSON.parse(localStorage.getItem('test-multi')!);
            expect(storedData.value).toEqual(2);
            expect(signal.history().length).toEqual(3);
            expect(signal.history()).toContain(0);
            expect(signal.history()).toContain(1);
            expect(signal.history()).toContain(2);
        }));
    });

    describe('spCounter', () => {
        it('should create counter with validation', () => {
            const counter: SignalPlus<number> = spCounter(0, { min: 0, max: 10 });
            counter.setValue(5);
            expect(counter.value).toBe(5);
            expect(() => counter.setValue(-1)).toThrow();
            expect(() => counter.setValue(11)).toThrow();
        });

        it('should support history', () => {
            const counter: SignalPlus<number> = spCounter(0);
            counter.setValue(1);
            counter.setValue(2);
            counter.undo();
            expect(counter.value).toBe(1);
        });

        it('should handle undefined min/max options', () => {
            const counter: SignalPlus<number> = spCounter(0);
            counter.setValue(-100);
            expect(counter.value).toBe(-100);
            counter.setValue(100);
            expect(counter.value).toBe(100);
        });

        it('should handle only min option', () => {
            const counter: SignalPlus<number> = spCounter(0, { min: 0 });
            expect(() => counter.setValue(-1)).toThrow();
            counter.setValue(100);
            expect(counter.value).toBe(100);
        });

        it('should handle only max option', () => {
            const counter: SignalPlus<number> = spCounter(0, { max: 10 });
            counter.setValue(-100);
            expect(counter.value).toBe(-100);
            expect(() => counter.setValue(11)).toThrow();
        });

        it('should handle invalid option combinations', () => {
            const counter: SignalPlus<number> = spCounter(0, { min: 10, max: 0 });
            expect(() => counter.setValue(5)).toThrow();
        });
    });

    describe('spToggle', () => {
        it('should create toggle with persistence', fakeAsync(() => {
            const toggle: SignalPlus<boolean> = spToggle(false, 'test-toggle');
            expect(toggle.value).toBe(false);
            toggle.setValue(true);
            tick();
            const storedData: SignalPlus<boolean> = JSON.parse(localStorage.getItem('test-toggle') || '{"value":false}');
            expect(storedData.value).toBe(true);
            expect(toggle.value).toBe(true);
        }));

        it('should support history', () => {
            const toggle: SignalPlus<boolean> = spToggle(false);
            toggle.setValue(true);
            toggle.setValue(false);
            toggle.undo();
            expect(toggle.value).toBe(true);
        });

        it('should handle localStorage errors', fakeAsync(() => {
            Object.defineProperty(window, 'localStorage', {
                value: {
                    setItem: () => { throw new Error('Storage error'); },
                    getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
                    clear: originalLocalStorage.clear.bind(originalLocalStorage)
                }
            });
            const toggle: SignalPlus<boolean> = spToggle(false, 'test-toggle');
            expect(() => {
                toggle.setValue(true);
                tick();
            }).not.toThrow();
            expect(toggle.value).toBe(true);
        }));

        it('should handle undefined initial value', () => {
            const toggle: SignalPlus<boolean> = spToggle();
            expect(toggle.value).toBe(false);
        });

        it('should work without persistence key', () => {
            const toggle: SignalPlus<boolean> = spToggle(true);
            toggle.setValue(false);
            expect(toggle.value).toBe(false);
            expect(localStorage.getItem('toggle')).toBeNull();
        });

        it('should properly override setValue with persistence', fakeAsync(() => {
            const toggle: SignalPlus<boolean> = spToggle(false, 'test-toggle');
            localStorage.setItem('test-toggle', JSON.stringify({ value: false }));
            const originalValue: SignalPlus<boolean> = JSON.parse(localStorage.getItem('test-toggle') || '{"value":false}');
            expect(originalValue.value).toBe(false);
            toggle.setValue(true);
            tick();
            const newValue: SignalPlus<boolean> = JSON.parse(localStorage.getItem('test-toggle') || '{"value":false}');
            expect(newValue.value).toBe(true);
        }));

        it('should handle persistence error recovery', fakeAsync(() => {
            const key = 'recovery-test';
            localStorage.setItem(key, JSON.stringify({ value: 1 }));
            localStorage.setItem(key, 'invalid json{');
            const signal: SignalPlus<number> = sp(0).persist(key).build();
            expect(signal.value).toBe(0);
            signal.setValue(2);
            tick();
            expect(signal.value).toBe(2);
            const storedValue = JSON.parse(localStorage.getItem(key) || '0');
            expect(storedValue).toBe(2);
        }));
    });

    describe('createSimple', () => {
        it('should create toggle signal with boolean value', () => {
            const toggle: SignalPlus<boolean> = createSimple(true);
            expect(toggle.value).toBe(true);
            toggle.setValue(false);
            expect(toggle.value).toBe(false);
        });

        it('should create toggle signal with boolean false', () => {
            const toggle: SignalPlus<boolean> = createSimple(false);
            expect(toggle.value).toBe(false);
            toggle.setValue(true);
            expect(toggle.value).toBe(true);
        });

        it('should support persistence with key', fakeAsync(() => {
            const toggle: SignalPlus<boolean> = createSimple(false, 'test-create-simple');
            expect(toggle.value).toBe(false);
            toggle.setValue(true);
            tick();
            const storedData: SignalPlus<boolean> = JSON.parse(localStorage.getItem('test-create-simple') || '{"value":false}');
            expect(storedData.value).toBe(true);
            expect(toggle.value).toBe(true);
        }));

        it('should throw TypeError for non-boolean string', () => {
            expect(() => createSimple('not a boolean' as any)).toThrowError(TypeError);
            expect(() => createSimple('not a boolean' as any)).toThrowError(/createSimple: initial value must be boolean, got string/);
        });

        it('should throw TypeError for non-boolean number', () => {
            expect(() => createSimple(0 as any)).toThrowError(TypeError);
            expect(() => createSimple(0 as any)).toThrowError(/createSimple: initial value must be boolean, got number/);
        });

        it('should throw TypeError for null', () => {
            expect(() => createSimple(null as any)).toThrowError(TypeError);
            expect(() => createSimple(null as any)).toThrowError(/createSimple: initial value must be boolean, got object/);
        });

        it('should throw TypeError for undefined', () => {
            expect(() => createSimple(undefined as any)).toThrowError(TypeError);
            expect(() => createSimple(undefined as any)).toThrowError(/createSimple: initial value must be boolean, got undefined/);
        });

        it('should throw TypeError for array', () => {
            expect(() => createSimple([] as any)).toThrowError(TypeError);
            expect(() => createSimple([] as any)).toThrowError(/createSimple: initial value must be boolean, got object/);
        });

        it('should throw TypeError for object', () => {
            expect(() => createSimple({} as any)).toThrowError(TypeError);
            expect(() => createSimple({} as any)).toThrowError(/createSimple: initial value must be boolean, got object/);
        });

        it('should work without persistence key', () => {
            const toggle: SignalPlus<boolean> = createSimple(true);
            toggle.setValue(false);
            expect(toggle.value).toBe(false);
            expect(localStorage.getItem('test-create-simple')).toBeNull();
        });

        it('should support history like spToggle', () => {
            const toggle: SignalPlus<boolean> = createSimple(false);
            toggle.setValue(true);
            toggle.setValue(false);
            toggle.undo();
            expect(toggle.value).toBe(true);
        });
    });

    describe('spForm', () => {
        describe('text input', () => {
            it('should create text input with defaults', () => {
                const form: SignalPlus<string> = spForm.text();
                expect(form.value).toBe('');
                expect(form.isValid()).toBe(true);
            });

            it('should create text input with validation', () => {
                const form: SignalPlus<string> = spForm.text('', {
                    minLength: 3,
                    maxLength: 10
                });
                expect(() => form.setValue('ab')).toThrow();
                expect(form.isValid()).toBe(false);
                expect(() => form.setValue('valid')).not.toThrow();
                expect(form.isValid()).toBe(true);
                expect(() => form.setValue('toolongvalue')).toThrow();
                expect(form.isValid()).toBe(true);
            });

            it('should support debounce', fakeAsync(() => {
                const form: SignalPlus<string> = spForm.text('', { debounce: 100 });
                let lastValue: string = '';
                form.subscribe(value => lastValue = value);
                form.setValue('test');
                expect(lastValue).toBe('');
                tick(100);
                expect(lastValue).toBe('test');
            }));

            it('should handle empty string validation', () => {
                const form: SignalPlus<string> = spForm.text('', { minLength: 1 });
                expect(form.isValid()).toBe(false);
            });

            it('should handle null/undefined input transformation', () => {
                const form: SignalPlus<string> = spForm.text();
                form.setValue(null as any);
                expect(form.value).toBe('');
                form.setValue(undefined as any);
                expect(form.value).toBe('');
            });

            it('should handle only minLength', () => {
                const form: SignalPlus<string> = spForm.text('', { minLength: 3 });
                expect(() => form.setValue('ab')).toThrow();
                expect(() => form.setValue('abc')).not.toThrow();
                expect(() => form.setValue('very long value')).not.toThrow();
            });

            it('should handle only maxLength', () => {
                const form: SignalPlus<string> = spForm.text('', { maxLength: 5 });
                expect(() => form.setValue('')).not.toThrow();
                expect(() => form.setValue('valid')).not.toThrow();
                expect(() => form.setValue('too long')).toThrow();
            });

            it('should handle invalid length combinations', () => {
                const form: SignalPlus<string> = spForm.text('', { minLength: 10, maxLength: 5 });
                expect(() => form.setValue('short')).toThrow();
                expect(() => form.setValue('too long value')).toThrow();
            });
        });

        describe('email input', () => {
            it('should create email input with defaults', () => {
                const form: SignalPlus<string> = spForm.email();
                expect(form.value).toBe('');
                expect(form.isValid()).toBe(false);
            });

            it('should validate email format', () => {
                const form: SignalPlus<string> = spForm.email();
                expect(form.isValid()).toBe(false);
                expect(() => form.setValue('invalid')).toThrow();
                expect(form.isValid()).toBe(false);
                expect(() => form.setValue('test@example.com')).not.toThrow();
                expect(form.isValid()).toBe(true);
            });

            it('should support custom debounce', fakeAsync(() => {
                const form: SignalPlus<string> = spForm.email('', { debounce: 200 });
                let lastValue: string = '';
                form.subscribe(value => lastValue = value);
                form.setValue('test@example.com');
                tick(100);
                expect(lastValue).toBe('');
                tick(100);
                expect(lastValue).toBe('test@example.com');
            }));

            it('should validate complex email formats', () => {
                const form: SignalPlus<string> = spForm.email();
                expect(() => form.setValue('user+tag@sub.example.com')).not.toThrow();
                expect(() => form.setValue('user.name@example.co.uk')).not.toThrow();
                expect(() => form.setValue('user123@example.com')).not.toThrow();
                expect(() => form.setValue('user@.com')).toThrow();
                expect(() => form.setValue('user@com')).toThrow();
                expect(() => form.setValue('@example.com')).toThrow();
                expect(() => form.setValue('user@example')).toThrow();
            });

            it('should handle null/undefined input transformation', () => {
                const form: SignalPlus<string> = spForm.email();
                try {
                    form.setValue(null as any);
                } catch (e) { }
                expect(form.value).toBe('');
                expect(form.isValid()).toBe(false);
                try {
                    form.setValue(undefined as any);
                } catch (e) { }
                expect(form.value).toBe('');
                expect(form.isValid()).toBe(false);
            });

            it('should handle debounce error scenarios', fakeAsync(() => {
                let lastValue: string = '';
                let valueChangeCount: number = 0;
                const form: SignalPlus<string> = spForm.email('', { debounce: 100 });
                form.subscribe(value => {
                    lastValue = value;
                    valueChangeCount++;
                });
                form.setValue('invalid');
                tick(100);
                expect(lastValue).toBe('');
                expect(valueChangeCount).toBe(2);
            }));

            it('should handle email validation with empty string in non-debounced mode', () => {
                const form: SignalPlus<string> = spForm.email();
                expect(() => form.setValue('')).toThrow();
                expect(form.value).toBe('');
                expect(form.isValid()).toBe(false);
                expect(() => form.setValue('test@example.com')).not.toThrow();
                expect(form.value).toBe('test@example.com');
                expect(form.isValid()).toBe(true);
            });
        });

        describe('number input', () => {
            it('should create number input with defaults', () => {
                const form: SignalPlus<number | null> = spForm.number();
                expect(form.value).toBe(0);
                expect(form.isValid()).toBe(true);
            });
            it('should validate number range', () => {
                const form: SignalPlus<number | null> = spForm.number({
                    min: 0,
                    max: 10
                });
                form.setValue(-1);
                expect(form.value).toBe(0);
                expect(form.isValid()).toBe(true);
                form.setValue(11);
                expect(form.value).toBe(10);
                expect(form.isValid()).toBe(true);
            });

            it('should round numbers', () => {
                const form: SignalPlus<number | null> = spForm.number();
                form.setValue(5.7);
                expect(form.value).toBe(6);
                form.setValue(5.2);
                expect(form.value).toBe(5);
            });

            it('should support debounce', fakeAsync(() => {
                const form: SignalPlus<number | null> = spForm.number();
                let lastValue: number | null = 0;
                form.subscribe(value => lastValue = value);
                form.setValue(42);
                expect(lastValue).toBe(42);
            }));

            it('should handle null in debounced version', fakeAsync(() => {
                const form: SignalPlus<number | null> = spForm.number({ debounce: 100 });
                let lastValue: number | null = null;
                form.subscribe(value => lastValue = value);
                form.setValue(null as any);
                expect(lastValue).toBeNull();
                tick(100);
                expect(lastValue).toBeNull();
            }));

            it('should handle undefined values', () => {
                const form: SignalPlus<number | null> = spForm.number();
                form.setValue(undefined as any);
                expect(form.value).toBe(0);
            });

            it('should handle only min option', () => {
                const form: SignalPlus<number | null> = spForm.number({ min: 0 });
                form.setValue(-1);
                expect(form.value).toBe(0);
                form.setValue(100);
                expect(form.value).toBe(100);
            });

            it('should handle only max option', () => {
                const form: SignalPlus<number | null> = spForm.number({ max: 10 });
                form.setValue(-100);
                expect(form.value).toBe(-100);
                form.setValue(20);
                expect(form.value).toBe(10);
            });

            it('should handle invalid min/max combinations', () => {
                const form: SignalPlus<number | null> = spForm.number({ min: 10, max: 0 });
                try {
                    form.setValue(5);
                } catch (e) { }
                expect(form.value).toBe(10);
            });

            it('should handle transform edge cases', () => {
                const form: SignalPlus<number | null> = spForm.number();
                try {
                    form.setValue('abc' as any);
                } catch (e) { }
                expect(form.value).toBe(0);
                form.setValue(true as any);
                expect(form.value).toBe(1);
                form.setValue(false as any);
                expect(form.value).toBe(0);
            });
        });
    });
    describe('error handling', () => {
        it('should handle localStorage errors', fakeAsync(() => {
            Object.defineProperty(window, 'localStorage', {
                value: {
                    setItem: () => { throw new Error('Storage error'); },
                    getItem: originalLocalStorage.getItem.bind(originalLocalStorage),
                    clear: originalLocalStorage.clear.bind(originalLocalStorage)
                }
            });
            const signal: SignalPlus<number> = sp(0).persist('test-key').build();
            expect(() => {
                signal.setValue(1);
                tick();
            }).not.toThrow();
            expect(signal.value).toBe(1);
        }));

        it('should handle validation error propagation', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = sp(0)
                .validate(x => {
                    if (x < 0) throw new Error('Custom validation error');
                    return true;
                })
                .onError(errorHandler)
                .build();
            try {
                signal.setValue(-1);
                fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toBe('Custom validation error');
                expect(errorHandler).toHaveBeenCalled();
                expect(signal.value).toBe(0);
            }
        });

        it('should handle transform error handling', () => {
            const errorHandler: jasmine.Spy = jasmine.createSpy('errorHandler');
            const signal: SignalPlus<number> = sp(0)
                .transform(x => {
                    if (x < 0) throw new Error('Transform error');
                    return x * 2;
                })
                .onError(errorHandler)
                .build();
            try {
                signal.setValue(-1);
                fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toBe('Transform error');
                expect(errorHandler).toHaveBeenCalled();
                expect(signal.value).toBe(0);
            }
        });

        it('should handle debounce error scenarios', fakeAsync(() => {
            let lastValue: string = '';
            let valueChangeCount: number = 0;
            const form: SignalPlus<string> = spForm.email('', { debounce: 100 });
            form.subscribe(value => {
                lastValue = value;
                valueChangeCount++;
            });
            form.setValue('invalid');
            tick(100);
            expect(lastValue).toBe('');
            // Count is 2: one for initial subscription call, one after debounce completes
            // (even though validation fails, the debounced processing still notifies)
            expect(valueChangeCount).toBe(2);
        }));

        it('should handle persistence error recovery', fakeAsync(() => {
            const key = 'recovery-test';
            localStorage.setItem(key, JSON.stringify({ value: 1 }));
            localStorage.setItem(key, 'invalid json{');
            const signal: SignalPlus<number> = sp(0).persist(key).build();
            expect(signal.value).toBe(0);
            signal.setValue(2);
            tick();
            expect(signal.value).toBe(2);
            const storedValue = JSON.parse(localStorage.getItem(key) || '0');
            expect(storedValue).toBe(2);
        }));
    });

    describe('edge cases', () => {
        it('should handle circular references', () => {
            const circular: any = { value: 1 };
            circular.self = circular;
            const signal: SignalPlus<any> = sp({ value: 0 }).persist('circular-test').build();
            // Circular references are now handled gracefully - they don't throw
            // The serialization helper detects circular refs and stores them with placeholders
            expect(() => signal.setValue(circular)).not.toThrow();
            // The signal value should be updated to the circular object
            expect(signal.value.value).toBe(1);
            expect(signal.value.self).toBeDefined();
            // Clean up
            localStorage.removeItem('circular-test');
        });

        it('should handle undefined/null initial values', () => {
            expect(() => sp(undefined as any)).toThrow();
            expect(() => sp(null as any)).not.toThrow();
        });

        it('should handle invalid option combinations', () => {
            const signal: SignalPlus<string> = spForm.text('', {
                minLength: 10,
                maxLength: 5,
                debounce: -100
            });
            expect(signal.value).toBe('');
            expect(() => signal.setValue('test')).toThrow();
        });

        it('should handle memory cleanup', () => {
            const signal: SignalPlus<number> = sp(0).build();
            const subscriptions: (() => void)[] = [];
            for (let i: number = 0; i < 10; i++) {
                subscriptions.push(signal.subscribe(() => { }));
            }
            subscriptions.forEach(cleanup => cleanup());
            signal.setValue(1);
            expect(signal.value).toBe(1);
        });

        it('should handle subscription cleanup', () => {
            const signal: SignalPlus<number> = sp(0).build();
            const values: number[] = [];
            const cleanup: () => void = signal.subscribe(value => values.push(value));
            cleanup();
            signal.setValue(1);
            expect(values).toEqual([0]);
        });
    });
}); 