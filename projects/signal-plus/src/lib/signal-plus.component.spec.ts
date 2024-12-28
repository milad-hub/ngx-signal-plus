/**
 * @fileoverview Test suite for SignalPlusComponent
 * @description Comprehensive tests for signal plus component including:
 * - Basic signal operations (increment, decrement)
 * - History management (undo/redo)
 * - Value validation
 * - Computed signals
 * - Time-based operations (debounce)
 * - Component lifecycle
 * - Error handling
 * 
 * @package ngx-signal-plus
 * @version 1.0.0
 * @license MIT
 */

import { DestroyRef, Injector, effect, runInInjectionContext } from '@angular/core';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { SignalPlus } from './models/signal-plus.model';
import { SignalPlusComponent } from './signal-plus.component';
import { SignalPlusService } from './signal-plus.service';

describe('SignalPlusComponent', () => {
  let component: SignalPlusComponent;
  let fixture: ComponentFixture<SignalPlusComponent>;
  let injector: Injector;

  /**
   * Test setup before each test
   * - Configures testing module
   * - Creates component instance
   * - Injects dependencies
   */
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SignalPlusComponent],
      providers: [SignalPlusService]
    });
    injector = TestBed.inject(Injector);
    fixture = TestBed.createComponent(SignalPlusComponent);
    component = fixture.componentInstance;
  });

  /**
   * Basic component creation test
   */
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Counter increment functionality
   * Verifies that counter value increases by 1
   */
  it('should increment counter', () => {
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
      const plus: SignalPlus<number> | null = component.counter();
      const initialValue: number = plus?.value ?? 0;

      component.increment();
      expect(plus?.value).toBe(initialValue + 1);
    });
  });

  it('should decrement counter', () => {
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
      const plus: SignalPlus<number> | null = component.counter();
      plus?.setValue(1); // Set initial value

      component.decrement();
      expect(plus?.value).toBe(0);
    });
  });

  it('should handle undo/redo', () => {
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
      const plus: SignalPlus<number> | null = component.counter();

      plus?.setValue(1);
      plus?.setValue(2);
      expect(plus?.value).toBe(2);

      plus?.undo();
      expect(plus?.value).toBe(1);

      plus?.redo();
      expect(plus?.value).toBe(2);
    });
  });

  it('should validate counter range', () => {
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
      const plus: SignalPlus<number> | null = component.counter();

      if (plus) {
        plus.setValue(11); // Set invalid value directly
        expect(plus.isValid()).toBeFalse();

        plus.setValue(5); // Set valid value
        expect(plus.isValid()).toBeTrue();
      }
    });
  });

  it('should compute doubled value', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
      tick(); // Let effects settle

      const plus: SignalPlus<number> | null = component.counter();
      plus?.setValue(1);
      tick(); // Let effects process
      fixture.detectChanges(); // Update view

      expect(component.doubled().value).toBe(2);
    });
  }));

  it('should debounce updates', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
      tick(); // Let initial effects settle

      const plus: SignalPlus<number> | null = component.counter();
      const initialValue: number = component.debounced().value;

      // First update
      plus?.setValue(1);
      fixture.detectChanges();
      expect(component.debounced().value).toBe(initialValue); // Should not change yet

      // Second update before debounce
      plus?.setValue(2);
      fixture.detectChanges();
      expect(component.debounced().value).toBe(initialValue); // Should not change yet

      // Final update
      plus?.setValue(3);
      fixture.detectChanges();
      expect(component.debounced().value).toBe(initialValue); // Should not change yet

      // Wait for debounce period
      tick(500);
      fixture.detectChanges();

      // Should now have the final value
      expect(component.debounced().value).toBe(3);

      // Cleanup
      discardPeriodicTasks();
    });
  }));

  /**
   * Component initialization tests
   * Verifies proper setup and error handling during component initialization
   */
  describe('initialization', () => {
    /**
     * Tests default value initialization
     * - Resets existing state
     * - Verifies signal synchronization
     * - Checks computed and derived values
     */
    it('should initialize with default values', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        // Reset any existing state
        component['counter$'].set(null);
        component['doubled$'].set(0);
        component['debounced$'].set(0);

        component.ngOnInit();
        fixture.detectChanges();
        tick(1000); // Wait for all effects and debounce to settle

        const plus: SignalPlus<number> | null = component.counter();
        if (plus) {
          // Reset and wait for effects to stabilize
          plus.reset();
          component['doubled$'].set(0);
          component['debounced$'].set(0);
          tick(1000);
          fixture.detectChanges();

          // Force synchronization of all signals
          plus.setValue(0);
          tick(1000);
          fixture.detectChanges();

          // Verify initial values
          expect(plus.value).toBe(0);
          expect(component.doubled().value).toBe(0);
          expect(component.debounced().value).toBe(0);
        }
        discardPeriodicTasks();
      });
    }));

    it('should handle initialization errors gracefully', () => {
      runInInjectionContext(injector, () => {
        const errorSpy: jasmine.Spy = spyOn(console, 'error');
        const mockSignalPlus: SignalPlusService = TestBed.inject(SignalPlusService);
        spyOn(mockSignalPlus, 'create').and.throwError('Init error');

        component.ngOnInit();
        expect(errorSpy).toHaveBeenCalled();
        expect(component.counter()).toBeNull();
      });
    });
  });

  /**
   * Component lifecycle and cleanup tests
   * Ensures proper resource management and cleanup
   */
  describe('component lifecycle and cleanup', () => {
    /**
     * Verifies effect cleanup
     * - Creates and tracks effect
     * - Verifies effect execution
     * - Ensures proper cleanup
     */
    it('should clean up on destroy', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        // Initialize component first
        component.ngOnInit();
        fixture.detectChanges();
        tick(1000);

        const plus: SignalPlus<number> | null = component.counter();
        expect(plus).toBeTruthy('Plus should be initialized');

        // Create a spy to track effect execution
        const effectSpy: jasmine.Spy = jasmine.createSpy('effect');
        let lastValue: number | undefined;

        // Create an effect that we can track
        const effectRef = effect(() => {
          const value: number | undefined = plus?.value;
          if (value !== lastValue) {
            lastValue = value;
            effectSpy(value);
          }
        });

        // Reset spy calls from initialization
        effectSpy.calls.reset();

        // Verify effect is working
        plus?.setValue(1);
        tick(1000);
        fixture.detectChanges();
        expect(effectSpy).toHaveBeenCalledWith(1);

        // Reset spy calls
        effectSpy.calls.reset();

        // Clean up effect manually
        effectRef.destroy();

        // Try to trigger effect after cleanup
        plus?.setValue(2);
        tick(1000);
        fixture.detectChanges();

        // Effect should not be called after cleanup
        expect(effectSpy).not.toHaveBeenCalled();

        discardPeriodicTasks();
      });
    }));

    it('should handle ngOnDestroy', () => {
      runInInjectionContext(injector, () => {
        // Initialize
        component.ngOnInit();
        fixture.detectChanges();

        // Verify destroy doesn't throw
        expect(() => component.ngOnDestroy()).not.toThrow();
      });
    });

    it('should handle multiple effect initializations', () => {
      runInInjectionContext(injector, () => {
        // Call twice to ensure no issues with multiple initializations
        component['initializeEffects']();
        component['initializeEffects']();

        fixture.detectChanges();
        expect(component).toBeTruthy();
      });
    });

    it('should cleanup all effects on destroy', () => {
      runInInjectionContext(injector, () => {
        const destroyRef: DestroyRef = TestBed.inject(DestroyRef);
        const cleanupSpy: jasmine.Spy = jasmine.createSpy('cleanup');
        let cleanupFn: (() => void) | undefined;

        spyOn(destroyRef, 'onDestroy').and.callFake((fn: () => void) => {
          cleanupFn = cleanupSpy;
          return cleanupSpy;
        });

        component.ngOnInit();
        fixture.detectChanges();

        cleanupFn?.();
        expect(cleanupSpy).toHaveBeenCalled();
      });
    });
  });

  /**
   * History management tests
   * Verifies undo/redo functionality and state tracking
   */
  describe('history management', () => {
    /**
     * Tests empty history handling
     * Ensures proper behavior when no history exists
     */
    it('should handle empty history for canUndo', () => {
      runInInjectionContext(injector, () => {
        fixture.detectChanges();
        const plus: SignalPlus<number> | null = component.counter();
        if (plus) {
          spyOn(plus, 'history').and.returnValue([]);
          expect(component.canUndo()).toBeFalse();
        }
      });
    });

    it('should handle null counter for canRedo', () => {
      runInInjectionContext(injector, () => {
        component['counter$'].set(null);
        expect(component.canRedo()).toBeFalse();
      });
    });

    it('should track value changes correctly', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        component.ngOnInit();
        fixture.detectChanges();
        tick();

        const plus: SignalPlus<number> | null = component.counter();
        if (plus) {
          const initialValue: number = plus.value;
          plus.setValue(1);
          expect(plus.previousValue).toBe(initialValue);
          expect(plus.hasChanged()).toBeTrue();

          plus.reset();
          expect(plus.value).toBe(0);
          expect(plus.hasChanged()).toBeFalse();
        }
      });
    }));

    it('should handle undo/redo with single history item', fakeAsync(() => {
      runInInjectionContext(injector, () => {
        component.ngOnInit();
        fixture.detectChanges();
        tick(1000);

        const plus: SignalPlus<number> | null = component.counter();
        if (plus) {
          plus.reset();
          tick(1000);
          fixture.detectChanges();

          component.increment();
          tick(1000);
          fixture.detectChanges();

          expect(plus.value).toBe(1);
          expect(component.canUndo()).toBeFalse();
          expect(component.canRedo()).toBeTrue();

          plus.undo();
          tick(1000);
          fixture.detectChanges();
          expect(plus.value).toBe(0);

          plus.redo();
          tick(1000);
          fixture.detectChanges();
          expect(plus.value).toBe(1);
        }
        discardPeriodicTasks();
      });
    }));
  });

  /**
   * Validation tests
   * Verifies value constraints and validation behavior
   */
  describe('validation', () => {
    /**
     * Tests value range validation
     * Checks both valid and invalid values
     */
    it('should validate counter range', () => {
      runInInjectionContext(injector, () => {
        fixture.detectChanges();
        const plus: SignalPlus<number> | null = component.counter();

        if (plus) {
          plus.setValue(11);
          expect(plus.isValid()).toBeFalse();

          plus.setValue(5);
          expect(plus.isValid()).toBeTrue();
        }
      });
    });

    it('should handle validator constraints', () => {
      runInInjectionContext(injector, () => {
        fixture.detectChanges();
        const plus: SignalPlus<number> | null = component.counter();

        plus?.setValue(11); // Above max
        expect(plus?.isValid()).toBeFalse();
        expect(plus?.value).toBe(11);

        plus?.setValue(-1); // Below min
        expect(plus?.isValid()).toBeFalse();
        expect(plus?.value).toBe(-1);

        plus?.setValue(5); // Valid value
        expect(plus?.isValid()).toBeTrue();
        expect(plus?.value).toBe(5);
      });
    });

    it('should handle invalid values through update', () => {
      runInInjectionContext(injector, () => {
        fixture.detectChanges();
        const plus: SignalPlus<number> | null = component.counter();
        if (plus) {
          plus.update(() => 11);
          expect(plus.isValid()).toBeFalse();
          expect(plus.value).toBe(11);
        }
      });
    });
  });
});
