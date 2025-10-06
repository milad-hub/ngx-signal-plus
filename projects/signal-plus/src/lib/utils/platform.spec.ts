/**
 * @fileoverview Tests for platform detection utilities
 * @description Tests SSR compatibility and browser API detection
 */

import { 
    isBrowser, 
    hasLocalStorage, 
    safeLocalStorageGet, 
    safeLocalStorageSet, 
    safeLocalStorageRemove,
    safeSetTimeout,
    safeClearTimeout,
    safeAddEventListener
} from './platform';

describe('Platform Detection Utilities', () => {
    describe('isBrowser()', () => {
        it('should return true in browser environment', () => {
            expect(isBrowser()).toBe(true);
        });

        it('should handle SSR environment simulation', () => {
            // This test runs in a browser, so we can't truly simulate SSR
            // But we can verify the function exists and returns a boolean
            const result = isBrowser();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('hasLocalStorage()', () => {
        it('should return true when localStorage is available', () => {
            expect(hasLocalStorage()).toBe(true);
        });

        it('should handle localStorage test', () => {
            const result = hasLocalStorage();
            expect(typeof result).toBe('boolean');
        });

        it('should not throw errors', () => {
            expect(() => hasLocalStorage()).not.toThrow();
        });
    });

    describe('safeLocalStorageGet()', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should return null for non-existent keys', () => {
            const result = safeLocalStorageGet('non-existent-key');
            expect(result).toBeNull();
        });

        it('should return stored value', () => {
            localStorage.setItem('test-key', 'test-value');
            const result = safeLocalStorageGet('test-key');
            expect(result).toBe('test-value');
        });

        it('should not throw errors', () => {
            expect(() => safeLocalStorageGet('any-key')).not.toThrow();
        });

        it('should handle invalid keys gracefully', () => {
            const result = safeLocalStorageGet('');
            expect(result).toBeNull();
        });
    });

    describe('safeLocalStorageSet()', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should store value successfully', () => {
            const result = safeLocalStorageSet('test-key', 'test-value');
            expect(result).toBe(true);
            expect(localStorage.getItem('test-key')).toBe('test-value');
        });

        it('should not throw errors', () => {
            expect(() => safeLocalStorageSet('key', 'value')).not.toThrow();
        });

        it('should handle invalid keys gracefully', () => {
            const result = safeLocalStorageSet('', 'value');
            expect(typeof result).toBe('boolean');
        });

        it('should handle complex values', () => {
            const complexValue = JSON.stringify({ a: 1, b: 'test', c: [1, 2, 3] });
            const result = safeLocalStorageSet('complex', complexValue);
            expect(result).toBe(true);
            expect(localStorage.getItem('complex')).toBe(complexValue);
        });
    });

    describe('safeLocalStorageRemove()', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should remove existing key', () => {
            localStorage.setItem('test-key', 'test-value');
            const result = safeLocalStorageRemove('test-key');
            expect(result).toBe(true);
            expect(localStorage.getItem('test-key')).toBeNull();
        });

        it('should handle non-existent keys', () => {
            const result = safeLocalStorageRemove('non-existent');
            expect(typeof result).toBe('boolean');
        });

        it('should not throw errors', () => {
            expect(() => safeLocalStorageRemove('any-key')).not.toThrow();
        });
    });

    describe('safeSetTimeout()', () => {
        it('should execute callback in browser', (done) => {
            let called = false;
            const timeoutId = safeSetTimeout(() => {
                called = true;
                expect(called).toBe(true);
                done();
            }, 10);
            
            expect(timeoutId).toBeDefined();
            expect(typeof timeoutId).toBe('number');
        });

        it('should return a number ID', () => {
            const timeoutId = safeSetTimeout(() => {}, 100);
            expect(typeof timeoutId).toBe('number');
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
        });

        it('should not throw errors', () => {
            expect(() => {
                const id = safeSetTimeout(() => {}, 100);
                if (id !== undefined) {
                    clearTimeout(id);
                }
            }).not.toThrow();
        });
    });

    describe('safeClearTimeout()', () => {
        it('should clear timeout', (done) => {
            let called = false;
            const timeoutId = safeSetTimeout(() => {
                called = true;
            }, 10);
            
            safeClearTimeout(timeoutId);
            
            setTimeout(() => {
                expect(called).toBe(false);
                done();
            }, 20);
        });

        it('should handle undefined timeout ID', () => {
            expect(() => safeClearTimeout(undefined)).not.toThrow();
        });

        it('should handle invalid timeout ID', () => {
            expect(() => safeClearTimeout(99999)).not.toThrow();
        });
    });

    describe('safeAddEventListener()', () => {
        it('should add event listener and return cleanup function', () => {
            let callCount = 0;
            const handler = () => callCount++;
            
            const cleanup = safeAddEventListener('storage', handler);
            expect(typeof cleanup).toBe('function');
            
            // Trigger storage event
            window.dispatchEvent(new StorageEvent('storage', { key: 'test' }));
            expect(callCount).toBe(1);
            
            // Cleanup
            cleanup();
            
            // Event should not trigger after cleanup
            window.dispatchEvent(new StorageEvent('storage', { key: 'test' }));
            expect(callCount).toBe(1);
        });

        it('should not throw errors', () => {
            expect(() => {
                const cleanup = safeAddEventListener('resize', () => {});
                cleanup();
            }).not.toThrow();
        });

        it('should handle multiple listeners', () => {
            let count1 = 0;
            let count2 = 0;
            
            const cleanup1 = safeAddEventListener('storage', () => count1++);
            const cleanup2 = safeAddEventListener('storage', () => count2++);
            
            window.dispatchEvent(new StorageEvent('storage', { key: 'test' }));
            
            expect(count1).toBe(1);
            expect(count2).toBe(1);
            
            cleanup1();
            cleanup2();
        });

        it('should cleanup individual listeners', () => {
            let count1 = 0;
            let count2 = 0;
            
            const cleanup1 = safeAddEventListener('storage', () => count1++);
            const cleanup2 = safeAddEventListener('storage', () => count2++);
            
            cleanup1();
            
            window.dispatchEvent(new StorageEvent('storage', { key: 'test' }));
            
            expect(count1).toBe(0);
            expect(count2).toBe(1);
            
            cleanup2();
        });
    });

    describe('SSR Simulation', () => {
        it('should handle missing window gracefully', () => {
            // In a real SSR environment, these would return false or no-op
            // In browser tests, we verify they don't throw
            expect(() => {
                isBrowser();
                hasLocalStorage();
                safeLocalStorageGet('key');
                safeLocalStorageSet('key', 'value');
                safeLocalStorageRemove('key');
                const id = safeSetTimeout(() => {}, 100);
                safeClearTimeout(id);
                const cleanup = safeAddEventListener('resize', () => {});
                cleanup();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle localStorage quota exceeded', () => {
            // Try to fill localStorage to simulate quota exceeded
            // This is hard to test reliably, so we just verify no crashes
            expect(() => {
                const largeData = 'x'.repeat(1000);
                for (let i = 0; i < 1000; i++) {
                    safeLocalStorageSet(`key-${i}`, largeData);
                }
            }).not.toThrow();
            
            // Cleanup
            localStorage.clear();
        });

        it('should handle localStorage disabled in private mode', () => {
            // This is difficult to test programmatically
            // We verify the functions handle errors gracefully
            expect(() => {
                hasLocalStorage();
                safeLocalStorageGet('test');
                safeLocalStorageSet('test', 'value');
                safeLocalStorageRemove('test');
            }).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        it('should work together in typical usage', () => {
            if (hasLocalStorage()) {
                const key = 'integration-test';
                const value = JSON.stringify({ test: true, data: [1, 2, 3] });
                
                // Set
                const setResult = safeLocalStorageSet(key, value);
                expect(setResult).toBe(true);
                
                // Get
                const getResult = safeLocalStorageGet(key);
                expect(getResult).toBe(value);
                
                // Parse
                const parsed = JSON.parse(getResult!);
                expect(parsed.test).toBe(true);
                expect(parsed.data).toEqual([1, 2, 3]);
                
                // Remove
                const removeResult = safeLocalStorageRemove(key);
                expect(removeResult).toBe(true);
                
                // Verify removed
                const afterRemove = safeLocalStorageGet(key);
                expect(afterRemove).toBeNull();
            }
        });

        it('should handle event listeners with cleanup', (done) => {
            let eventFired = false;
            
            const cleanup = safeAddEventListener('storage', (event) => {
                if (event.key === 'cleanup-test') {
                    eventFired = true;
                }
            });
            
            // Trigger event
            window.dispatchEvent(new StorageEvent('storage', { 
                key: 'cleanup-test', 
                newValue: 'test' 
            }));
            
            setTimeout(() => {
                expect(eventFired).toBe(true);
                cleanup();
                done();
            }, 10);
        });

        it('should handle timeout with cleanup', (done) => {
            let executed = false;
            
            const timeoutId = safeSetTimeout(() => {
                executed = true;
            }, 50);
            
            // Clear before execution
            setTimeout(() => {
                safeClearTimeout(timeoutId);
            }, 25);
            
            // Verify not executed
            setTimeout(() => {
                expect(executed).toBe(false);
                done();
            }, 75);
        });
    });
});

