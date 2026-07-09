import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { spComputed } from './computed';

describe('spComputed gap behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should restore a persisted value', () => {
    localStorage.setItem('sc-key', JSON.stringify(5));
    TestBed.runInInjectionContext(() => {
      const source = signal(1);
      const derived = spComputed(() => source(), { persist: 'sc-key' });
      expect(derived.value).toBe(5);
    });
  });

  it('should ignore invalid persisted values', () => {
    localStorage.setItem('sc-key', '{bad');
    TestBed.runInInjectionContext(() => {
      const derived = spComputed(() => 1, { persist: 'sc-key' });
      expect(derived.value).toBe(1);
    });
  });

  it('should persist recomputed values and expose signal metadata', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(1);
      const derived = spComputed(() => source() * 2, { persist: 'sc-key' });
      TestBed.flushEffects();

      source.set(2);
      TestBed.flushEffects();

      expect(localStorage.getItem('sc-key')).toBe('4');
      expect(derived.value).toBe(4);
      expect(derived.previousValue).toBe(2);
      expect(derived.initialValue).toBe(2);
      expect(derived.signal()).toBe(4);
      expect(derived.writable()).toBe(4);
      expect(derived.isDirty()).toBe(true);
      expect(derived.hasChanged()).toBe(true);
      expect(derived.history().length).toBe(2);
    });
  });

  it('should undo and redo with persistence', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(1);
      const derived = spComputed(() => source() * 2, {
        persist: 'sc-key',
        historySize: 5,
      });
      TestBed.flushEffects();

      derived.undo();
      expect(derived.value).toBe(2);

      source.set(2);
      TestBed.flushEffects();

      derived.undo();
      expect(derived.value).toBe(2);
      expect(localStorage.getItem('sc-key')).toBe('2');

      derived.redo();
      expect(derived.value).toBe(4);
      expect(localStorage.getItem('sc-key')).toBe('4');

      derived.redo();
      expect(derived.value).toBe(4);
    });
  });

  it('should expose validation state with string messages', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(2);
      const derived = spComputed(() => source(), {
        validate: (value) => (value > 0 ? true : 'must be positive'),
      });

      expect(derived.isValid()).toBe(true);
      expect(derived.errors()).toEqual([]);
      expect(derived.validate()).toBe(true);
      expect(derived.isValidating()).toBe(false);
      expect(derived.asyncErrors()).toEqual([]);

      source.set(-1);
      TestBed.flushEffects();
      expect(derived.errors()).toEqual(['must be positive']);
      expect(derived.validate()).toBe(false);
    });
  });

  it('should report a generic error for boolean validator failures', () => {
    TestBed.runInInjectionContext(() => {
      const derived = spComputed(() => -1, { validate: () => false });
      expect(derived.errors()).toEqual(['Validation failed']);
    });
  });

  it('should report no errors without a validator', () => {
    TestBed.runInInjectionContext(() => {
      const derived = spComputed(() => 1);
      expect(derived.errors()).toEqual([]);
      expect(derived.isValid()).toBe(true);
    });
  });

  it('should notify subscribers and clear state on destroy', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(1);
      const derived = spComputed(() => source());
      const seen: number[] = [];

      const unsubscribe = derived.subscribe((value) => seen.push(value));
      TestBed.flushEffects();
      expect(seen).toEqual([1]);

      unsubscribe();
      derived.destroy();
      expect(derived.history()).toEqual([]);
    });
  });
});
