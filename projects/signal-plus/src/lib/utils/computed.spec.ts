import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { spComputed } from './computed';

describe('spComputed', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({});
    });

    it('should create a computed signal with initial value', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(5);
            const computed = spComputed(() => source() * 2);
            expect(computed.value).toBe(10);
        });
    });

    it('should update when source signal changes', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(3);
            const computed = spComputed(() => source() * 2);
            expect(computed.value).toBe(6);
            source.set(7);
            TestBed.tick();
            expect(computed.value).toBe(14);
        });
    });

    it('should combine multiple source signals', () => {
        TestBed.runInInjectionContext(() => {
            const firstName = signal('John');
            const lastName = signal('Doe');
            const fullName = spComputed(() => `${firstName()} ${lastName()}`);
            expect(fullName.value).toBe('John Doe');
            firstName.set('Jane');
            TestBed.tick();
            expect(fullName.value).toBe('Jane Doe');
        });
    });

    it('should support validation', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(10);
            const computed = spComputed(() => source(), {
                validate: (v) => v > 0,
            });
            expect(computed.value).toBe(10);
            expect(computed.isValid()).toBe(true);
        });
    });

    it('should support history tracking', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(1);
            const computed = spComputed(() => source(), { historySize: 5 });
            expect(computed.value).toBe(1);
            source.set(2);
            TestBed.tick();
            source.set(3);
            TestBed.tick();
            expect(computed.value).toBe(3);
            expect(computed.history().length).toBeGreaterThan(1);
        });
    });

    it('should support undo with history', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(100);
            const computed = spComputed(() => source(), { historySize: 10 });
            expect(computed.value).toBe(100);
            source.set(200);
            TestBed.tick();
            expect(computed.value).toBe(200);
            computed.undo();
            expect(computed.value).toBe(100);
        });
    });

    it('should support transformation', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(5);
            const computed = spComputed(() => source(), {
                transform: (v) => v * 10,
            });
            expect(computed.value).toBe(50);
        });
    });

    it('should work with complex objects', () => {
        TestBed.runInInjectionContext(() => {
            const user = signal({ name: 'John', age: 30 });
            const computed = spComputed(() => ({
                ...user(),
                isAdult: user().age >= 18,
            }));
            expect(computed.value).toEqual({ name: 'John', age: 30, isAdult: true });
            user.set({ name: 'Jane', age: 16 });
            TestBed.tick();
            expect(computed.value).toEqual({ name: 'Jane', age: 16, isAdult: false });
        });
    });

    it('should support redo after undo', () => {
        TestBed.runInInjectionContext(() => {
            const source = signal(1);
            const computed = spComputed(() => source(), { historySize: 5 });
            source.set(2);
            TestBed.tick();
            source.set(3);
            TestBed.tick();
            expect(computed.value).toBe(3);
            computed.undo();
            expect(computed.value).toBe(2);
            computed.redo();
            expect(computed.value).toBe(3);
        });
    });

    it('should handle array computations', () => {
        TestBed.runInInjectionContext(() => {
            const items = signal([1, 2, 3]);
            const sum = spComputed(() => items().reduce((a, b) => a + b, 0));
            expect(sum.value).toBe(6);
            items.set([1, 2, 3, 4]);
            TestBed.tick();
            expect(sum.value).toBe(10);
        });
    });
});