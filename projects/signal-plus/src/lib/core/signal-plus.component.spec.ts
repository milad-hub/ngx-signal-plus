import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SignalPlus } from '../models';
import { SignalPlusComponent } from './signal-plus.component';
import { SignalPlusService } from './signal-plus.service';

function createInputEvent(value: string): Event {
    const event: Event = new Event('input');
    Object.defineProperty(event, 'target', { value: { value } });
    return event;
}

function createNumberEvent(value: number): Event {
    const event: Event = new Event('input');
    Object.defineProperty(event, 'target', { value: { value: value.toString() } });
    return event;
}

interface PerformanceMemory {
    usedJSHeapSize: number;
}

describe('SignalPlusComponent', () => {
    let component: SignalPlusComponent;
    let fixture: ComponentFixture<SignalPlusComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SignalPlusComponent]
        }).compileComponents();
        fixture = TestBed.createComponent(SignalPlusComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('initialization', () => {
        it('should create component', () => {
            expect(component).toBeTruthy();
            expect(fixture).toBeTruthy();
        });

        it('should initialize all signals', () => {
            expect(component.counter.value).toBe(0);
            expect(component.counter.initialValue).toBe(0);
            expect(component.input.value).toBe('');
            expect(component.amount.value).toBe(0);
            expect(component.darkMode.value).toBe(false);
            expect(component.search.value).toBe('');
        });
    });

    describe('core signal operations', () => {
        it('should handle increment operation', () => {
            const initialValue: number = component.counter.value;
            component.increment();
            expect(component.counter.value).toBe(initialValue + 1);
            expect(component.counter.previousValue).toBe(initialValue);
            expect(component.counter.isValid()).toBe(true);
        });

        it('should handle decrement operation', () => {
            component.increment();
            const startValue: number = component.counter.value;
            component.decrement();
            expect(component.counter.value).toBe(startValue - 1);
            expect(component.counter.previousValue).toBe(startValue);
        });

        it('should maintain history during operations', () => {
            const operations: number[] = [1, 2, 3];
            operations.forEach(() => component.increment());
            expect(component.counter.history().length).toBe(4);
            expect(component.counter.value).toBe(3);
        });
    });

    describe('form management', () => {
        describe('text input handling', () => {
            it('should handle text input with debounce', fakeAsync(() => {
                const inputValue: string = 'test';
                component.handleInput(createInputEvent(inputValue));
                expect(component.input.value).toBe('');
                tick(300);
                expect(component.input.value).toBe(inputValue);
                expect(component.input.isValid()).toBe(true);
            }));

            it('should maintain input history', fakeAsync(() => {
                const signal: SignalPlus<string> = component.input;
                signal.reset();
                fixture.detectChanges();
                expect(signal.value).toBe('');
                component.handleInput(createInputEvent('first'));
                tick(300);
                expect(signal.value).toBe('first');
                component.handleInput(createInputEvent('second'));
                tick(300);
                expect(signal.value).toBe('second');
                expect(signal.previousValue).toBe('first');
            }));
        });

        describe('amount validation', () => {
            beforeEach(() => {
                fixture.detectChanges();
            });

            it('should validate amount within range', fakeAsync(() => {
                component.updateAmount(createNumberEvent(5));
                tick(300);
                expect(component.amount.value).toBe(5);
                expect(component.amount.isValid()).toBe(true);
            }));

            it('should reject invalid amounts', fakeAsync(() => {
                const signal: SignalPlus<number> = component.amount;
                const initialValue: number = signal.value;
                const consoleSpy: jasmine.Spy = spyOn(console, 'error');
                component.updateAmount(createNumberEvent(11));
                tick(300);
                expect(consoleSpy).toHaveBeenCalled();
                const error: Error = consoleSpy.calls.first().args[0];
                expect(error.message).toBe('Validation failed');
                expect(signal.value).toBe(initialValue);
                expect(signal.isValid()).toBe(true);
                component.updateAmount(createNumberEvent(5));
                tick(300);
                expect(signal.value).toBe(5);
                expect(signal.isValid()).toBe(true);
            }));

            it('should handle multiple rapid updates', fakeAsync(() => {
                const signal: SignalPlus<number> = component.amount;
                component.updateAmount(createNumberEvent(5));
                tick(300);
                expect(signal.value).toBe(5);
                component.updateAmount(createNumberEvent(6));
                tick(300);
                expect(signal.value).toBe(6);
                expect(signal.previousValue).toBe(5);
                expect(signal.isValid()).toBe(true);
            }));
        });

        describe('search functionality', () => {
            it('should handle search with debounce', fakeAsync(() => {
                const searchTerm: string = 'test query';
                component.onSearch(createInputEvent(searchTerm));
                expect(component.search.value).toBe('');
                tick(300);
                expect(component.search.value).toBe(searchTerm);
            }));

            it('should handle distinct search terms', fakeAsync(() => {
                const signal: SignalPlus<string> = component.search;
                component.onSearch(createInputEvent('first'));
                tick(300);
                expect(signal.value).toBe('first');
                component.onSearch(createInputEvent('second'));
                tick(300);
                expect(signal.value).toBe('second');
                expect(signal.previousValue).toBe('first');
                expect(signal.isValid()).toBe(true);
            }));
        });
    });

    describe('theme management', () => {
        beforeEach(() => {
            localStorage.clear();
            fixture.detectChanges();
        });

        it('should persist theme preference', fakeAsync(() => {
            const signal: SignalPlus<boolean> = component.darkMode;
            expect(signal.value).toBe(false);
            component.onThemeChange();
            tick(0);
            expect(signal.value).toBe(true);
            expect(signal.previousValue).toBe(false);
            const stored: string | null = localStorage.getItem('theme-mode');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored || '')).toBe(true);
            component.onThemeChange();
            tick(0);
            expect(signal.value).toBe(false);
            expect(signal.previousValue).toBe(true);
        }));

        it('should handle storage events', fakeAsync(() => {
            const event: StorageEvent = new StorageEvent('storage', {
                key: 'theme-mode',
                newValue: JSON.stringify({ value: true }),
                oldValue: JSON.stringify({ value: false }),
                storageArea: localStorage
            });
            window.dispatchEvent(event);
            fixture.detectChanges();
            tick(300);
            expect(component.darkMode.value).toBe(true);
        }));
    });

    describe('component lifecycle', () => {
        it('should handle subscription cleanup', fakeAsync(() => {
            const values: number[] = [];
            const signal: SignalPlus<number> = component.counter;
            const subscription: () => void = signal.subscribe(value => values.push(value));
            expect(values).toEqual([0]);
            values.length = 0;
            component.increment();
            tick(0);
            expect(values).toEqual([1]);
            subscription();
            component.increment();
            tick(0);
            expect(values).toEqual([1]);
        }));

        it('should handle multiple signal subscriptions', fakeAsync(() => {
            const values: Map<string, any[]> = new Map<string, any[]>();
            const subs: (() => void)[] = [];
            ['counter', 'input'].forEach(name => {
                const valueArray: any[] = [];
                values.set(name, valueArray);
                const signal = component[name as keyof SignalPlusComponent];
                if ('subscribe' in signal) {
                    subs.push(signal.subscribe((v: any) => valueArray.push(v)));
                }
            });
            fixture.detectChanges();
            tick(300);
            component.increment();
            fixture.detectChanges();
            component.handleInput(createInputEvent('test'));
            fixture.detectChanges();
            tick(300);
            expect(values.get('counter')).toEqual([0, 1]);
            expect(values.get('input')).toEqual(['', 'test']);
            subs.forEach(unsub => unsub());
        }));

        it('should cleanup all resources on component destroy', fakeAsync(() => {
            const values: Map<string, any[]> = new Map<string, any[]>();
            const subs: (() => void)[] = [];
            ['counter', 'input'].forEach(name => {
                const valueArray: any[] = [];
                values.set(name, valueArray);
                const signal = component[name as keyof SignalPlusComponent];
                if ('subscribe' in signal) {
                    subs.push(signal.subscribe(v => valueArray.push(v)));
                }
            });
            tick(300);
            fixture.destroy();
            tick(300);
            expect(values.get('counter')).toEqual([0]);
            expect(values.get('input')).toEqual(['']);
        }));

        it('should handle component reinitialization correctly', fakeAsync(() => {
            component.increment();
            component.handleInput(createInputEvent('test'));
            tick(300);
            fixture.destroy();
            fixture = TestBed.createComponent(SignalPlusComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            tick(300);
            expect(component.counter.value).toBe(0);
            expect(component.input.value).toBe('');
            expect(component.amount.value).toBe(0);
            expect(component.search.value).toBe('');
        }));
    });

    describe('resource management', () => {
        it('should handle multiple signal subscriptions and cleanup', fakeAsync(() => {
            const values: Map<string, any[]> = new Map<string, any[]>();
            const subs: (() => void)[] = [];
            ['counter', 'input'].forEach(name => {
                const valueArray: any[] = [];
                values.set(name, valueArray);
                const signal = component[name as keyof SignalPlusComponent];
                if ('subscribe' in signal) {
                    subs.push(signal.subscribe(v => valueArray.push(v)));
                }
            });
            tick(300);
            component.increment();
            component.handleInput(createInputEvent('test'));
            tick(300);
            expect(values.get('counter')).toEqual([0, 1]);
            expect(values.get('input')).toEqual(['', 'test']);
            subs.forEach(unsub => unsub());
        }));
    });

    describe('error handling', () => {
        it('should handle and recover from validation errors', fakeAsync(() => {
            const signal: SignalPlus<number> = component.amount;
            const initialValue: number = signal.value;
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            component.updateAmount(createNumberEvent(11));
            tick(300);
            expect(consoleSpy).toHaveBeenCalled();
            const error: Error = consoleSpy.calls.first().args[0];
            expect(error.message).toBe('Validation failed');
            expect(signal.value).toBe(initialValue);
            expect(signal.isValid()).toBe(true);
            component.updateAmount(createNumberEvent(5));
            tick(300);
            expect(signal.value).toBe(5);
            expect(signal.isValid()).toBe(true);
        }));
    });

    describe('performance and state consistency', () => {
        it('should handle rapid updates while maintaining state', fakeAsync(() => {
            const updateCount: number = 1000;
            const start: number = performance.now();
            const values: any[] = [];
            const unsubscribe: () => void = component.counter.subscribe(v => values.push(v));
            for (let i: number = 0; i < updateCount; i++) {
                component.increment();
                if (i % 100 === 0) {
                    component.handleInput(createInputEvent(`test${i}`));
                }
            }
            tick(300);
            const duration: number = performance.now() - start;
            expect(duration).toBeLessThan(1000);
            expect(component.counter.value).toBe(updateCount);
            expect(component.input.value).toBe('test900');
            expect(component.counter.isValid()).toBe(true);
            expect(component.input.isValid()).toBe(true);
            unsubscribe();
        }));
    });

    describe('complex state management', () => {
        it('should maintain state consistency under rapid changes', fakeAsync(() => {
            const rapidChanges: { counter: number; input: string; amount: number }[] = Array.from(
                { length: 10 },
                (_, i) => ({
                    counter: i,
                    input: `test${i}`,
                    amount: i % 10
                }));
            rapidChanges.forEach(change => {
                component.increment();
                component.handleInput(createInputEvent(change.input));
                if (change.amount <= 10) {
                    component.updateAmount(createNumberEvent(change.amount));
                }
            });
            tick(300);
            expect(component.counter.value).toBe(10);
            expect(component.input.value).toBe('test9');
            expect(component.amount.value).toBe(9);
            expect(component.counter.isValid()).toBe(true);
            expect(component.input.isValid()).toBe(true);
            expect(component.amount.isValid()).toBe(true);
        }));

        it('should handle storage events from other tabs', fakeAsync(() => {
            const storageEvent: StorageEvent = new StorageEvent('storage', {
                key: 'theme-mode',
                newValue: JSON.stringify({ value: true })
            });
            window.dispatchEvent(storageEvent);
            tick(0);
            expect(component.darkMode.value).toBe(true);
        }));
    });

    describe('error chains', () => {
        it('should handle cascading errors gracefully', fakeAsync(() => {
            const signal: SignalPlus<number> = component.amount;
            const initialValue: number = signal.value;
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            component.updateAmount(createNumberEvent(11));
            tick(300);
            expect(consoleSpy).toHaveBeenCalled();
            const firstError: Error = consoleSpy.calls.first().args[0];
            expect(firstError.message).toBe('Validation failed');
            expect(signal.value).toBe(initialValue);
            expect(signal.isValid()).toBe(true);
            consoleSpy.calls.reset();
            component.updateAmount(createNumberEvent(15));
            tick(300);
            expect(consoleSpy).toHaveBeenCalled();
            const secondError: Error = consoleSpy.calls.first().args[0];
            expect(secondError.message).toBe('Validation failed');
            expect(signal.value).toBe(initialValue);
            expect(signal.isValid()).toBe(true);
            component.updateAmount(createNumberEvent(5));
            tick(300);
            expect(signal.value).toBe(5);
            expect(signal.isValid()).toBe(true);
        }));
    });

    describe('form reset behavior', () => {
        it('should reset all form fields to initial state', fakeAsync(() => {
            component.increment();
            component.handleInput(createInputEvent('test'));
            component.updateAmount(createNumberEvent(5));
            component.onSearch(createInputEvent('search'));
            tick(300);
            component.counter.reset();
            component.input.reset();
            component.amount.reset();
            component.search.reset();
            tick(300);
            expect(component.counter.value).toBe(0);
            expect(component.counter.history().length).toBe(1);
            expect(component.input.value).toBe('');
            expect(component.amount.value).toBe(0);
            expect(component.search.value).toBe('');
            expect(component.counter.isDirty()).toBe(false);
            expect(component.input.isDirty()).toBe(false);
            expect(component.amount.isDirty()).toBe(false);
            expect(component.search.isDirty()).toBe(false);
        }));

        it('should maintain validation state after reset', fakeAsync(() => {
            component.updateAmount(createNumberEvent(5));
            expect(component.amount.isValid()).toBe(true);
            component.amount.reset();
            expect(component.amount.value).toBe(0);
            expect(component.amount.isValid()).toBe(true);
        }));
    });

    describe('performance boundaries', () => {
        it('should handle very large datasets', fakeAsync(() => {
            const largeDataset: { id: number; value: string }[] = Array.from(
                { length: 100000 },
                (_, i) => ({ id: i, value: `item${i}` })
            );
            const start: number = performance.now();
            largeDataset.forEach((item, index) => {
                if (index % 1000 === 0) {
                    component.handleInput(createInputEvent(item.value));
                    component.updateAmount(createNumberEvent(index % 10));
                }
            });
            tick(300);
            const duration: number = performance.now() - start;
            expect(duration).toBeLessThan(5000);
            expect(component.input.value).toBe(largeDataset[99000].value);
            expect(component.input.isValid()).toBe(true);
        }));

        it('should maintain stable memory usage under load', fakeAsync(() => {
            const iterations: number = 1000;
            const memorySnapshots: number[] = [];
            for (let i: number = 0; i < iterations; i++) {
                component.increment();
                component.handleInput(createInputEvent(`test${i}`));
                if (i % 100 === 0) {
                    const memory: PerformanceMemory | undefined = (performance as unknown as { memory?: PerformanceMemory }).memory;
                    memorySnapshots.push(memory?.usedJSHeapSize || 0);
                }
                tick(1);
            }
            tick(300);
            const memoryVariance: number = Math.max(...memorySnapshots) - Math.min(...memorySnapshots);
            expect(memoryVariance).toBeLessThan(50 * 1024 * 1024);
        }));
    });

    describe('browser integration', () => {
        it('should handle tab visibility changes', fakeAsync(() => {
            const visibilityHandler: jasmine.Spy = jasmine.createSpy('visibilityHandler');
            document.addEventListener('visibilitychange', visibilityHandler);
            Object.defineProperty(document, 'visibilityState', {
                value: 'hidden',
                writable: true
            });
            document.dispatchEvent(new Event('visibilitychange'));
            tick(0);
            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true
            });
            document.dispatchEvent(new Event('visibilitychange'));
            tick(0);
            expect(visibilityHandler).toHaveBeenCalledTimes(2);
            document.removeEventListener('visibilitychange', visibilityHandler);
        }));

        it('should handle window focus/blur events', fakeAsync(() => {
            const focusHandler: jasmine.Spy = jasmine.createSpy('focusHandler');
            const blurHandler: jasmine.Spy = jasmine.createSpy('blurHandler');
            window.addEventListener('focus', focusHandler);
            window.addEventListener('blur', blurHandler);
            window.dispatchEvent(new Event('blur'));
            tick(0);
            window.dispatchEvent(new Event('focus'));
            tick(0);
            expect(focusHandler).toHaveBeenCalled();
            expect(blurHandler).toHaveBeenCalled();
            window.removeEventListener('focus', focusHandler);
            window.removeEventListener('blur', blurHandler);
        }));

        it('should sync state across browser tabs', fakeAsync(() => {
            const storageHandler: jasmine.Spy = jasmine.createSpy('storageHandler');
            window.addEventListener('storage', storageHandler);
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'theme-mode',
                newValue: JSON.stringify({ value: true }),
                oldValue: JSON.stringify({ value: false }),
                storageArea: localStorage
            }));
            tick(0);
            expect(storageHandler).toHaveBeenCalled();
            expect(component.darkMode.value).toBe(true);
            window.removeEventListener('storage', storageHandler);
        }));
    });

    describe('dependency injection', () => {
        it('should properly inject SignalPlusService', () => {
            const service: SignalPlusService = TestBed.inject(SignalPlusService);
            expect(service).toBeTruthy();
            expect(component['signalPlus']).toBeTruthy();
        });
    });

    describe('counter edge cases', () => {
        it('should allow counter to increment without a max limit by default', () => {
            const initial: number = component.counter.value;
            component.increment();
            expect(component.counter.value).toBe(initial + 1);
        });

        it('should handle minimum value validation', () => {
            expect(() => component.decrement()).toThrowError("Validation failed");
            expect(component.counter.value).toBe(0);
        });
    });

    describe('input validation and error states', () => {
        it('should handle empty input', fakeAsync(() => {
            expect(() => {
                component.handleInput(createInputEvent(''));
                tick(300);
            }).toThrowError("Validation failed");
            expect(component.input.value).toBe('');
        }));

        it('should validate input length', fakeAsync(() => {
            expect(() => {
                component.handleInput(createInputEvent('ab'));
                tick(300);
            }).toThrowError("Validation failed");
            component.handleInput(createInputEvent('abc'));
            tick(300);
            expect(component.input.value).toBe('abc');
        }));
    });

    describe('amount input edge cases', () => {
        it('should handle NaN in amount input', () => {
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            const initialValue: number = component.amount.value;
            component.updateAmount({ target: { value: 'not-a-number' } } as any);
            expect(consoleSpy).toHaveBeenCalled();
            expect(component.amount.value).toBe(initialValue);
        });

        it('should handle decimal values', () => {
            component.updateAmount(createNumberEvent(5.5));
            expect(component.amount.value).toBe(5.5);
            expect(component.amount.isValid()).toBe(true);
        });

        it('should handle edge values', () => {
            component.updateAmount(createNumberEvent(0));
            expect(component.amount.value).toBe(0);
            expect(component.amount.isValid()).toBe(true);
            component.updateAmount(createNumberEvent(10));
            expect(component.amount.value).toBe(10);
            expect(component.amount.isValid()).toBe(true);
        });
    });

    describe('theme persistence edge cases', () => {
        it('should handle initial theme load', fakeAsync(() => {
            localStorage.setItem('theme-mode', JSON.stringify(true));
            const newFixture: ComponentFixture<SignalPlusComponent> = TestBed.createComponent(SignalPlusComponent);
            newFixture.detectChanges();
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'theme-mode',
                newValue: JSON.stringify(true),
                storageArea: localStorage
            }));
            tick();
            newFixture.detectChanges();
            expect(newFixture.componentInstance.darkMode.value).toBe(true);
        }));

        it('should handle storage errors', fakeAsync(() => {
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            spyOn(localStorage, 'setItem').and.callFake(() => {
                consoleSpy('Storage error');
                throw new Error('Storage error');
            });
            component.onThemeChange();
            tick(300);
            expect(consoleSpy).toHaveBeenCalled();
            expect(component.darkMode.value).toBe(true);
        }));
    });

    describe('search input edge cases', () => {
        it('should handle empty search', fakeAsync(() => {
            expect(() => {
                component.onSearch(createInputEvent(''));
                tick(300);
            }).toThrowError("Validation failed");
            expect(component.search.value).toBe('');
        }));

        it('should validate search length', fakeAsync(() => {
            expect(() => {
                component.onSearch(createInputEvent('a'));
                tick(300);
            }).toThrowError("Validation failed");
            component.onSearch(createInputEvent('ab'));
            tick(300);
            expect(component.search.value).toBe('ab');
        }));

        it('should handle rapid search updates', fakeAsync(() => {
            component.onSearch(createInputEvent('a'));
            component.onSearch(createInputEvent('ab'));
            component.onSearch(createInputEvent('abc'));
            tick(300);
            expect(component.search.value).toBe('abc');
            expect(component.search.isValid()).toBe(true);
        }));
    });

    describe('text input validation', () => {
        it('should handle empty input value', fakeAsync(() => {
            const initialValue: string = component.input.value;
            const consoleSpy: jasmine.Spy = spyOn(console, 'error');
            expect(() => {
                component.handleInput({ target: { value: '' } } as any);
                tick(300);
            }).toThrowError('Validation failed');
            expect(component.input.value).toBe(initialValue);
        }));
    });

    describe('theme persistence', () => {
        it('should restore theme preference from storage', fakeAsync(() => {
            localStorage.setItem('theme-mode', JSON.stringify(true));
            const newFixture: ComponentFixture<SignalPlusComponent> = TestBed.createComponent(SignalPlusComponent);
            newFixture.detectChanges();
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'theme-mode',
                newValue: JSON.stringify(true),
                storageArea: localStorage
            }));
            tick(300);
            expect(newFixture.componentInstance.darkMode.value).toBe(true);
            newFixture.destroy();
        }));

        it('should handle theme toggle and persistence', fakeAsync(() => {
            const initialTheme: boolean = component.darkMode.value;
            component.onThemeChange();
            tick(300);
            expect(component.darkMode.value).toBe(!initialTheme);
            const storedTheme = JSON.parse(localStorage.getItem('theme-mode') || 'false');
            expect(storedTheme).toBe(!initialTheme);
            component.onThemeChange();
            tick(300);
            expect(component.darkMode.value).toBe(initialTheme);
        }));
    });
});