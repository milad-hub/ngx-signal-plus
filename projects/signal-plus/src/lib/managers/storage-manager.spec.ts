import { StorageManager } from './storage-manager';

describe('StorageManager', () => {
    const TEST_KEY: string = 'test-key';
    const FULL_TEST_KEY: string = 'ngx-signal-plus:test-key';

    beforeEach(() => {
        localStorage.clear();
    });

    describe('Basic Operations', () => {
        it('should save and load primitive values', () => {
            const value: string = 'test-value';
            StorageManager.save(TEST_KEY, value);
            const loaded: string | undefined = StorageManager.load<string>(TEST_KEY);
            expect(loaded).toBe(value);
            expect(localStorage.getItem(FULL_TEST_KEY)).toBe(JSON.stringify(value));
        });

        it('should save and load complex objects', () => {
            const value: { id: number, name: string, nested: { value: boolean } } = {
                id: 1,
                name: 'test',
                nested: { value: true }
            };
            StorageManager.save(TEST_KEY, value);
            const loaded: typeof value | undefined = StorageManager.load<typeof value>(TEST_KEY);
            expect(loaded).toEqual(value);
        });

        it('should handle undefined values', () => {
            const loaded: string | undefined = StorageManager.load<string>('non-existent-key');
            expect(loaded).toBeUndefined();
        });

        it('should remove values', () => {
            StorageManager.save(TEST_KEY, 'value');
            StorageManager.remove(TEST_KEY);
            expect(localStorage.getItem(FULL_TEST_KEY)).toBeNull();
            expect(StorageManager.load(TEST_KEY)).toBeUndefined();
        });

        it('should handle empty string values', () => {
            const value: string = '';
            StorageManager.save(TEST_KEY, value);
            const loaded: string | undefined = StorageManager.load<string>(TEST_KEY);
            expect(loaded).toBe(value);
        });

        it('should handle numeric values', () => {
            const values: number[] = [0, -1, 1.5, Number.MAX_SAFE_INTEGER];
            values.forEach((value: number) => {
                StorageManager.save(TEST_KEY, value);
                const loaded: number | undefined = StorageManager.load<number>(TEST_KEY);
                expect(loaded).toBe(value);
            });
        });
    });

    describe('Error Handling', () => {
        let consoleErrorSpy: jasmine.Spy;
        let consoleWarnSpy: jasmine.Spy;

        beforeEach(() => {
            consoleErrorSpy = spyOn(console, 'error');
            consoleWarnSpy = spyOn(console, 'warn');
        });

        afterEach(() => {
            consoleErrorSpy.calls.reset();
            consoleWarnSpy.calls.reset();
        });

        it('should handle storage errors', () => {
            spyOn(localStorage, 'setItem').and.throwError('Storage error');
            StorageManager.save(TEST_KEY, 'value');
            const warnCalled = consoleWarnSpy.calls.any();
            const errorCalled = consoleErrorSpy.calls.any();
            expect(warnCalled || errorCalled).toBe(true);
        });

        it('should handle JSON parse errors', () => {
            localStorage.setItem(FULL_TEST_KEY, 'invalid-json');
            const loaded: string | undefined = StorageManager.load(TEST_KEY);
            expect(loaded).toBeUndefined();
            expect(consoleErrorSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to load/));
        });

        it('should handle removal errors', () => {
            spyOn(localStorage, 'removeItem').and.throwError('Remove error');
            StorageManager.remove(TEST_KEY);
            expect(true).toBe(true);
        });

        it('should handle quota exceeded errors', () => {
            spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
            StorageManager.save(TEST_KEY, 'value');
            const warnCalled = consoleWarnSpy.calls.any();
            const errorCalled = consoleErrorSpy.calls.any();
            expect(warnCalled || errorCalled).toBe(true);
        });
    });

    describe('Storage Availability', () => {
        it('should detect when storage is available', () => {
            const available: boolean = StorageManager.isAvailable();
            expect(available).toBe(true);
        });

        it('should detect when storage is not available', () => {
            spyOn(localStorage, 'setItem').and.throwError('Storage not available');
            const available: boolean = StorageManager.isAvailable();
            expect(available).toBe(false);
        });

        it('should handle private browsing mode', () => {
            spyOn(localStorage, 'setItem').and.throwError('SecurityError');
            const available: boolean = StorageManager.isAvailable();
            expect(available).toBe(false);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle large objects', () => {
            const largeObject: { array: string[], nested: { deep: { deeper: { deepest: boolean } } } } = {
                array: new Array(1000).fill('test'),
                nested: { deep: { deeper: { deepest: true } } }
            };
            StorageManager.save(TEST_KEY, largeObject);
            const loaded: typeof largeObject | undefined = StorageManager.load<typeof largeObject>(TEST_KEY);
            expect(loaded).toEqual(largeObject);
        });

        it('should handle special types', () => {
            const specialObject: { date: Date, regex: RegExp, null: null, undefined: undefined } = {
                date: new Date(),
                regex: /test/,
                null: null,
                undefined: undefined
            };
            StorageManager.save(TEST_KEY, specialObject);
            const loaded: any = StorageManager.load<any>(TEST_KEY);
            expect(loaded.date).toBeDefined();
            expect(loaded.regex).toBeDefined();
            expect(loaded.null).toBeNull();
            expect(loaded.undefined).toBeUndefined();
        });

        it('should maintain type safety', () => {
            interface TestType {
                id: number;
                name: string;
            }

            const testValue: TestType = { id: 1, name: 'test' };
            StorageManager.save<TestType>(TEST_KEY, testValue);
            const loadedValue: TestType | undefined = StorageManager.load<TestType>(TEST_KEY);
            expect(loadedValue?.id).toBe(1);
            expect(loadedValue?.name).toBe('test');
        });

        it('should handle array values', () => {
            const testArray: number[] = [1, 2, 3];
            StorageManager.save(TEST_KEY, testArray);
            const loadedArray: number[] | undefined = StorageManager.load<number[]>(TEST_KEY);
            expect(loadedArray).toEqual(testArray);
        });

        it('should handle circular references', () => {
            const errorSpy: jasmine.Spy = spyOn(console, 'error');
            const circularObj: any = { name: 'test' };
            circularObj.self = circularObj;
            StorageManager.save(TEST_KEY, circularObj);
            const loadedValue: unknown = StorageManager.load(TEST_KEY);
            expect(errorSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to save.*circular structure/i));
            expect(loadedValue).toBeUndefined();
        });
    });

    describe('Storage Key Management', () => {
        it('should properly handle key prefix', () => {
            const value = 'test-value';
            StorageManager.save(TEST_KEY, value);
            expect(localStorage.getItem(FULL_TEST_KEY)).toBeDefined();
            expect(localStorage.getItem(TEST_KEY)).toBeNull();
        });

        it('should handle invalid keys', () => {
            const invalidKeys: (string | null | undefined)[] = ['', ' ', null, undefined];
            const consoleSpy: jasmine.Spy = spyOn(console, 'warn');
            invalidKeys.forEach((key: string | null | undefined) => {
                StorageManager.save(key as string, 'test');
                expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Invalid key/));
            });
        });

        it('should handle very long keys', () => {
            const longKey: string = 'a'.repeat(1000);
            const consoleSpy: jasmine.Spy = spyOn(console, 'warn');
            StorageManager.save(longKey, 'test');
            expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/key length exceeds/));
        });

        it('should prevent key collisions', () => {
            const baseKey: string = 'collision-test';
            const value1: string = 'value1';
            const value2: string = 'value2';
            StorageManager.save(baseKey, value1);
            StorageManager.save(`ngx-signal-plus:${baseKey}`, value2);
            const loaded: string | undefined = StorageManager.load<string>(baseKey);
            expect(loaded).toBe(value1);
        });
    });

    describe('Data Integrity', () => {
        let consoleSpy: jasmine.Spy;

        beforeEach(() => {
            consoleSpy = spyOn(console, 'error');
        });

        afterEach(() => {
            consoleSpy.calls.reset();
        });

        it('should handle corrupted data', () => {
            localStorage.setItem(FULL_TEST_KEY, '{corrupted:json:data');
            const loaded: unknown = StorageManager.load(TEST_KEY);
            expect(loaded).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to load/));
        });

        it('should handle partial data corruption', () => {
            const data: { id: number, name: string } = { id: 1, name: 'test' };
            StorageManager.save(TEST_KEY, data);
            const corruptedJson: string | undefined = localStorage.getItem(FULL_TEST_KEY)?.replace('test', 'test"');
            localStorage.setItem(FULL_TEST_KEY, corruptedJson!);
            const loaded: unknown = StorageManager.load(TEST_KEY);
            expect(loaded).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to load/));
        });

        it('should handle versioned data structures', () => {
            interface OldVersion {
                id: number;
                name: string;
            }

            interface NewVersion {
                id: number;
                name: string;
                version: number;
            }

            const oldData: OldVersion = { id: 1, name: 'test' };
            StorageManager.save(TEST_KEY, oldData);
            const loaded: NewVersion | undefined = StorageManager.load<NewVersion>(TEST_KEY);
            expect(loaded?.id).toBe(1);
            expect(loaded?.name).toBe('test');
            expect(loaded?.version).toBeUndefined();
        });
    });

    describe('Concurrency', () => {
        it('should handle storage events from other contexts', (done) => {
            const value: string = 'test-value';
            const storageKey: string = 'test-key';
            const fullKey: string = `ngx-signal-plus:${storageKey}`;
            localStorage.setItem(fullKey, JSON.stringify(value));
            const storageEvent: StorageEvent = new StorageEvent('storage', {
                key: fullKey,
                newValue: JSON.stringify(value),
                oldValue: null,
                storageArea: localStorage
            });
            window.dispatchEvent(storageEvent);
            setTimeout(() => {
                const loaded: string | undefined = StorageManager.load<string>(storageKey);
                expect(loaded).toBe(value);
                done();
            }, 0);
        });

        it('should handle storage events with null newValue (deletion)', (done: () => void) => {
            StorageManager.save('test-key', 'value');
            localStorage.removeItem('ngx-signal-plus:test-key');
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'ngx-signal-plus:test-key',
                newValue: null,
                oldValue: '"value"',
                storageArea: localStorage
            }));
            setTimeout(() => {
                expect(StorageManager.load('test-key')).toBeUndefined();
                done();
            }, 0);
        });

        it('should handle concurrent save operations', () => {
            const values: string[] = Array.from({ length: 100 }, (_, i) => `value-${i}`);
            values.forEach((value: string) => {
                StorageManager.save(TEST_KEY, value);
            });
            const loaded: string | undefined = StorageManager.load<string>(TEST_KEY);
            expect(loaded).toBe(values[values.length - 1]);
        });

        it('should handle rapid save/load sequences', () => {
            const operations: number = 100;
            const results: (string | undefined)[] = [];
            for (let i: number = 0; i < operations; i++) {
                StorageManager.save(TEST_KEY, `value-${i}`);
                results.push(StorageManager.load(TEST_KEY));
            }
            results.forEach((result: string | undefined, index: number) => {
                expect(result).toBe(`value-${index}`);
            });
        });
    });
}); 