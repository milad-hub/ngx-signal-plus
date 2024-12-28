/**
 * @fileoverview Test suite for SignalPlusService
 * @description Comprehensive tests for signal plus service including:
 * - Signal creation and initialization
 * - Value transformation and validation
 * - History management
 * - Storage persistence
 * - Error handling
 * - Resource cleanup
 * 
 * @package ngx-signal-plus
 * @version 1.0.0
 * @license MIT
 */

import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SignalPlus } from './models/signal-plus.model';
import { debounceTime, map } from './operators/signal-operators';
import { SignalPlusService } from './signal-plus.service';

describe('SignalPlusService', () => {
  let service: SignalPlusService;
  let injector: Injector;

  /**
   * Test setup before each test
   * - Configures testing module
   * - Injects service and dependencies
   * - Clears localStorage
   */
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SignalPlusService]
    });
    service = TestBed.inject(SignalPlusService);
    injector = TestBed.inject(Injector);
    localStorage.clear(); // Clear localStorage before each test
  });

  /**
   * Basic service creation test
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Signal creation and initialization tests
   * Tests the core functionality of creating and configuring signal pluss
   */
  describe('create()', () => {
    /**
     * Verifies basic signal plus creation with initial value
     */
    it('should create a signal plus with initial value', () => {
      runInInjectionContext(injector, () => {
        const plus: SignalPlus<number> = service.create({ initialValue: 42 });
        expect(plus.value).toBe(42);
      });
    });

    /**
     * Tests validation of creation options
     */
    it('should validate options', () => {
      expect(() => service.create({
        initialValue: 0,
        persist: true
      })).toThrowError(/Storage key is required/);
    });

    /**
     * Tests validator function application
     */
    it('should apply validators', () => {
      const plus: SignalPlus<number> = service.create({
        initialValue: 5,
        validators: [
          (value: number) => value >= 0,
          (value: number) => value <= 10
        ]
      });

      expect(plus.isValid()).toBe(true);
      plus.setValue(11);
      expect(plus.isValid()).toBe(false);
    });

    /**
     * Tests history tracking functionality
     */
    it('should track history', () => {
      const plus: SignalPlus<number> = service.create({ initialValue: 0 });
      plus.setValue(1);
      plus.setValue(2);

      expect(plus.value).toBe(2);
      plus.undo();
      expect(plus.value).toBe(1);
      plus.redo();
      expect(plus.value).toBe(2);
    });

    /**
     * Tests localStorage persistence
     */
    it('should persist to localStorage', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const plus: SignalPlus<string> = service.create({
          initialValue: 'test',
          persist: true,
          storageKey: 'test-key'
        });

        plus.setValue('new value');
        tick(); // Allow effect to run

        expect(localStorage.getItem('test-key')).toBe('"new value"');
      });
    }));

    /**
     * Tests value transformation functionality
     */
    it('should transform values', () => {
      const plus: SignalPlus<number> = service.create({
        initialValue: 5,
        transform: (value: number) => value * 2
      });

      expect(plus.value).toBe(10);
      plus.setValue(3);
      expect(plus.value).toBe(6);
    });
  });

  /**
   * Tests for signal operator functionality
   */
  describe('pipe operators', () => {
    it('should apply operators correctly', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        const plus: SignalPlus<number> = service.create<number>({ initialValue: 0 });
        const doubled: SignalPlus<number> = plus.pipe(
          map<number, number>((value) => value * 2),
          debounceTime<number>(100)
        );

        plus.setValue(5);
        tick(150);
        expect(doubled.value).toBe(10);
      });
    }));
  });

  /**
   * Error handling tests
   * Verifies proper error handling in various scenarios
   */
  describe('error handling', () => {
    it('should handle invalid transform functions', () => {
      const plus: SignalPlus<number> = service.create({
        initialValue: 5,
        transform: () => { throw new Error('Transform error'); }
      });

      expect(plus.value).toBe(5); // Should return original value on error
    });

    it('should handle localStorage errors', () => {
      // Mock localStorage.setItem to throw
      spyOn(localStorage, 'setItem').and.throwError('Storage error');

      const plus: SignalPlus<string> = service.create({
        initialValue: 'test',
        persist: true,
        storageKey: 'error-key'
      });

      // Should not throw when storage fails
      expect(() => plus.setValue('new')).not.toThrow();
    });
  });

  /**
   * Resource cleanup tests
   * Verifies proper cleanup of resources
   */
  describe('cleanup', () => {
    it('should cleanup signals on destroy', () => {
      runInInjectionContext(injector, () => {
        const cleanupSpy: jasmine.Spy = jasmine.createSpy('cleanup');
        service['cleanup'].push(cleanupSpy);

        service.ngOnDestroy();

        expect(cleanupSpy).toHaveBeenCalled();
        expect(service['cleanup'].length).toBe(0);
      });
    });
  });

  /**
   * Tests for derived signal functionality
   * Verifies behavior of signals created through pipe operations
   */
  describe('derived signals', () => {
    it('should handle derived signal operations correctly', () => {
      const plus: SignalPlus<number> = service.create<number>({ initialValue: 0 });
      const derived: SignalPlus<number> = plus.pipe(
        map<number, number>((value) => value * 2)
      );

      expect(() => derived.update((value) => value + 1)).toThrow();
      expect(() => derived.setValue(5)).toThrow();
      expect(() => derived.reset()).toThrow();
      expect(derived.isValid()).toBe(true);
      expect(derived.isDirty()).toBe(false);
      expect(derived.hasChanged()).toBe(false);
    });
  });
});
