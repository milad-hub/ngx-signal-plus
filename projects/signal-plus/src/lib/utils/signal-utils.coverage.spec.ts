import { TestBed } from '@angular/core/testing';
import { persistentSignal } from './signal-utils';

describe('persistentSignal gap behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should log a quota error when serialization raises a QuotaExceededError', () => {
    const errorSpy = spyOn(console, 'error');
    TestBed.runInInjectionContext(() => {
      const store = persistentSignal('quota-key', {
        toJSON: () => {
          throw new DOMException('quota', 'QuotaExceededError');
        },
      });
      TestBed.flushEffects();
      expect(store.value()).toBeDefined();
    });
    expect(errorSpy).toHaveBeenCalledWith('Storage quota exceeded');
  });

  it('should log a generic error when serialization fails for other reasons', () => {
    const errorSpy = spyOn(console, 'error');
    TestBed.runInInjectionContext(() => {
      interface Circular {
        self?: Circular;
      }
      const circular: Circular = {};
      circular.self = circular;

      const store = persistentSignal<Circular>('circular-key', circular);
      TestBed.flushEffects();
      expect(store.value()).toBe(circular);
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Error saving to storage:',
      jasmine.anything(),
    );
  });

  it('should update the stored value through the update helper', () => {
    TestBed.runInInjectionContext(() => {
      const store = persistentSignal('update-key', 1);
      TestBed.flushEffects();
      store.update((current) => current + 1);
      TestBed.flushEffects();
      expect(store.value()).toBe(2);
    });
    expect(localStorage.getItem('update-key')).toBe('2');
  });
});
