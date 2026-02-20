import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { spAll, spAny, spCombine } from './combine';

describe('combine utils', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should combine multiple signals', () => {
    TestBed.runInInjectionContext(() => {
      const first = signal('John');
      const last = signal('Doe');
      const fullName = spCombine([first, last], (f, l) => `${f} ${l}`);

      expect(fullName()).toBe('John Doe');

      first.set('Jane');
      TestBed.tick();
      expect(fullName()).toBe('Jane Doe');
    });
  });

  it('should return true when all signals are true', () => {
    TestBed.runInInjectionContext(() => {
      const a = signal(true);
      const b = signal(true);
      const c = signal(false);
      const all = spAll([a, b, c]);

      expect(all()).toBe(false);

      c.set(true);
      TestBed.tick();
      expect(all()).toBe(true);
    });
  });

  it('should return true when at least one signal is true', () => {
    TestBed.runInInjectionContext(() => {
      const a = signal(false);
      const b = signal(false);
      const c = signal(false);
      const any = spAny([a, b, c]);

      expect(any()).toBe(false);

      b.set(true);
      TestBed.tick();
      expect(any()).toBe(true);
    });
  });
});
