import { fakeAsync, tick } from '@angular/core/testing';
import { SignalPlusService } from './signal-plus.service';

describe('SignalPlusService static helper gap behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should apply default bounds when counter is created without config', () => {
    const counter = SignalPlusService.counter().build();

    counter.setValue(5);
    expect(counter.value).toBe(5);
    expect(counter.isValid()).toBe(true);
    counter.destroy();
  });

  it('should apply default validator and debounce when form config is minimal', fakeAsync(() => {
    const field = SignalPlusService.form({
      initial: 'a',
      key: 'svc-coverage-key',
    }).build();

    field.setValue('b');
    tick(300);
    expect(field.value).toBe('b');
    field.destroy();
  }));
});
