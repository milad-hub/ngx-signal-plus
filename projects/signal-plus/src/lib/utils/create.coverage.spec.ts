import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { spCounter, spForm } from './create';

describe('spCounter default behavior', () => {
  it('should start at zero without arguments', () => {
    const counter = spCounter();
    expect(counter.value).toBe(0);
    counter.destroy();
  });
});

describe('spForm.number debounced transform behavior', () => {
  it('should pass through null and undefined values', fakeAsync(() => {
    const field = spForm.number({ debounce: 50, min: 0, max: 10 });

    field.setValue(null as never);
    tick(50);
    expect(field.value).toBeNull();

    field.setValue(undefined as never);
    tick(50);
    expect(field.value).toBeUndefined();

    field.destroy();
  }));

  it('should convert booleans and clamp out-of-range numbers', fakeAsync(() => {
    const field = spForm.number({ debounce: 50, min: 0, max: 10 });

    field.setValue(true as never);
    tick(50);
    expect(field.value).toBe(1);

    field.setValue(false as never);
    tick(50);
    expect(field.value).toBe(0);

    field.setValue(999);
    tick(50);
    expect(field.value).toBe(10);

    field.destroy();
  }));

  it('should map non-numeric input to null', fakeAsync(() => {
    const field = spForm.number({ debounce: 50 });

    field.setValue('abc' as never);
    tick(50);
    expect(field.value).toBeNull();

    field.destroy();
  }));

  it('should run async validators only for non-null values', fakeAsync(() => {
    const seen: number[] = [];
    const field = spForm.number({
      debounce: 50,
      initial: 3,
      asyncValidators: [
        async (value: number) => {
          seen.push(value);
          return true;
        },
      ],
    });
    tick(1000);
    flushMicrotasks();
    seen.length = 0;

    field.setValue(null as never);
    tick(1000);
    flushMicrotasks();

    field.setValue(5);
    tick(1000);
    flushMicrotasks();

    expect(seen).toEqual([5]);
    field.destroy();
  }));

  it('should run the non-debounced async validator path directly', fakeAsync(() => {
    const seen: (number | null)[] = [];
    const field = spForm.number({
      asyncValidators: [
        async (value: number | null) => {
          seen.push(value);
          return true;
        },
      ],
    });
    tick(1000);
    flushMicrotasks();
    seen.length = 0;

    field.setValue(7);
    tick(1000);
    flushMicrotasks();

    expect(seen).toEqual([7]);
    field.destroy();
  }));
});
