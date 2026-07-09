import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { spMonitor } from '../utils/monitor';
import { _setServerModeForTesting } from '../utils/platform';
import { SignalBuilder } from './signal-builder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBuilder = any;

describe('SignalBuilder debounce null-value regression', () => {
  it('should apply a debounced update whose final value is legitimately null', fakeAsync(() => {
    const s = new SignalBuilder<number | null>(0).debounce(50).build();
    s.setValue(null);
    tick(50);
    expect(s.value).toBeNull();
    s.destroy();
  }));

  it('should apply a debounced update whose final value is legitimately null after a non-null initial value', fakeAsync(() => {
    const s = new SignalBuilder<number | null>(5).debounce(50).build();
    s.setValue(1);
    tick(50);
    expect(s.value).toBe(1);

    s.setValue(null);
    tick(50);
    expect(s.value).toBeNull();
    s.destroy();
  }));
});

describe('SignalBuilder internal gap behavior', () => {
  afterEach(() => {
    spMonitor.clear();
    _setServerModeForTesting(false);
  });

  it('should initialize validators array when missing before validate()', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    delete builder.options.validators;
    builder.validate(() => true);
    expect(builder.options.validators.length).toBe(1);
  });

  it('should initialize asyncValidators array when missing before validateAsync()', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    delete builder.options.asyncValidators;
    builder.validateAsync(async () => true);
    expect(builder.options.asyncValidators.length).toBe(1);
  });

  it('should initialize errorHandlers array when missing before onError()', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    delete builder.options.errorHandlers;
    builder.onError(() => undefined);
    expect(builder.options.errorHandlers.length).toBe(1);
  });

  it('should default monitor() options to an empty object', () => {
    const builder = new SignalBuilder(1).monitor() as AnyBuilder;
    expect(builder.options.monitorOptions).toEqual({});
  });

  it('should leave monitorOptions undefined on map() when not configured', () => {
    const mapped = new SignalBuilder(1).map((v) => v.toString()) as AnyBuilder;
    expect(mapped.options.monitorOptions).toBeUndefined();
  });

  it('should fall back to an identity transform when none is configured', () => {
    const builder = new SignalBuilder(5) as AnyBuilder;
    delete builder.options.transform;
    const s = builder.build();
    s.setValue(9);
    expect(s.value).toBe(9);
  });

  it('should disable update tracking when trackUpdates is false and trackPerformance unset', () => {
    const s = new SignalBuilder(1)
      .monitor({ trackUpdates: false, label: 'gap-monitor-off' })
      .build();
    s.setValue(2);
    expect(spMonitor.getHotSignals().some((m) => m.name === 'gap-monitor-off')).toBe(
      false,
    );
  });

  it('should enable tracking via trackPerformance even when trackUpdates is false', () => {
    const s = new SignalBuilder(1)
      .monitor({
        trackUpdates: false,
        trackPerformance: true,
        label: 'gap-monitor-perf',
      })
      .build();
    s.setValue(2);
    const metric = spMonitor
      .getHotSignals()
      .find((m) => m.name === 'gap-monitor-perf');
    expect(metric?.updates).toBe(1);
  });

  it('should run async validation synchronously outside the browser', fakeAsync(() => {
    _setServerModeForTesting(true);
    const s = new SignalBuilder(0).validateAsync(async () => true).build();
    s.setValue(1);
    flushMicrotasks();
    expect(s.isValidating()).toBe(false);
  }));

  it('should skip persistence loading errors gracefully when storage is unavailable', () => {
    const s = new SignalBuilder(1).persist('gap-storage-key').build();
    expect(s.value).toBe(1);
    s.destroy();
  });

  it('should track debug labels through spDebug', () => {
    const s = new SignalBuilder(1).debug('gap-debug-label').build();
    s.setValue(2);
    expect(s.value).toBe(2);
    s.destroy();
  });

  it('should recompute distinct comparisons for reference-unequal but deep-equal objects', () => {
    const s = new SignalBuilder({ a: 1 }).distinct().build();
    let notifications = 0;
    s.subscribe(() => (notifications += 1));
    s.setValue({ a: 1 });
    expect(notifications).toBe(1);
    s.setValue({ a: 2 });
    expect(notifications).toBe(2);
  });

  it('should treat non-serializable distinct values as always changed', () => {
    interface Circular {
      self?: Circular;
    }
    const circular: Circular = {};
    circular.self = circular;

    const s = new SignalBuilder<Circular>({}).distinct().build();
    expect(() => s.setValue(circular)).not.toThrow();
  });

  it('should ignore filter rejections by not applying the invalid value', () => {
    const s = new SignalBuilder(1)
      .filter((v) => v > 0)
      .build();
    expect(() => s.setValue(-1)).toThrow();
    expect(s.value).toBe(1);
  });

  it('should undo through multiple steps and redo back', () => {
    const s = new SignalBuilder(0).withHistory(5).build();
    s.setValue(1);
    s.setValue(2);
    s.undo();
    s.undo();
    expect(s.value).toBe(0);
    s.redo();
    expect(s.value).toBe(1);
  });

  it('should reset a signal configured with history and persistence', () => {
    const s = new SignalBuilder(0)
      .withHistory(5)
      .persist('gap-reset-key')
      .build();
    s.setValue(1);
    s.reset();
    expect(s.value).toBe(0);
    expect(s.history().length).toBe(1);
    s.destroy();
  });

  it('should apply operators through pipe() and propagate updates', () => {
    const s = new SignalBuilder(1).build();
    const doubled = s.pipe((source: unknown) => {
      const sig = source as () => number;
      return () => sig() * 2;
    });
    expect(doubled.value).toBe(2);
    s.setValue(3);
    expect(doubled.value).toBe(6);
  });

  it('should serialize using the circular-safe fallback when persisting circular data', () => {
    interface Circular {
      self?: Circular;
    }
    const circular: Circular = {};
    circular.self = circular;

    const s = new SignalBuilder<Circular>({}).persist('gap-circular-key').build();
    expect(() => s.setValue(circular)).not.toThrow();
    s.destroy();
  });

  it('should collect a generic validation message for boolean validator failures', () => {
    const s = new SignalBuilder(1)
      .validate(() => false)
      .build();
    expect(() => s.setValue(2)).toThrowError('Validation failed');
  });

  it('should stop collecting validation errors after a boolean validator fails', () => {
    const second = jasmine.createSpy('secondValidator').and.returnValue(true);
    const s = new SignalBuilder(1)
      .validate(() => false)
      .validate(second)
      .build();
    expect(() => s.setValue(2)).toThrowError('Validation failed');
    expect(second).not.toHaveBeenCalled();
  });

  it('should continue past string validation errors to collect further failures', () => {
    const second = jasmine.createSpy('secondValidator').and.returnValue('second failed');
    const s = new SignalBuilder(1)
      .validate(() => 'first failed')
      .validate(second)
      .build();
    expect(() => s.setValue(2)).toThrowError('first failed');
    expect(second).toHaveBeenCalled();
  });

  it('should collect an error message when a validator throws', () => {
    const s = new SignalBuilder(1)
      .validate(() => {
        throw new Error('validator exploded');
      })
      .build();
    expect(() => s.setValue(2)).toThrowError('validator exploded');
  });

  it('should collect a generic message when a validator throws a non-Error', () => {
    const s = new SignalBuilder(1)
      .validate(() => {
        throw 'plain string failure';
      })
      .build();
    expect(() => s.setValue(2)).toThrowError('Validation failed');
  });

  it('should copy monitorOptions across map() when configured', () => {
    const mapped = new SignalBuilder(1)
      .monitor({ label: 'gap-map-monitor' })
      .map((v) => v.toString()) as AnyBuilder;
    expect(mapped.options.monitorOptions).toEqual({ label: 'gap-map-monitor' });
  });

  it('should default trackUpdates to true when monitor options omit it entirely', () => {
    const s = new SignalBuilder(1).monitor({ label: 'gap-default-track' }).build();
    s.setValue(2);
    const metric = spMonitor
      .getHotSignals()
      .find((m) => m.name === 'gap-default-track');
    expect(metric?.updates).toBe(1);
  });

  it('should expose the raw value through the signal property', () => {
    const s = new SignalBuilder(1).build();
    expect(s.signal()).toBe(1);
    s.setValue(2);
    expect(s.signal()).toBe(2);
  });

  it('should reset to the initial value when defaultValue is unset', () => {
    const builder = new SignalBuilder(7) as AnyBuilder;
    builder.options.defaultValue = null;
    const s = builder.build();
    s.setValue(9);
    s.reset();
    expect(s.value).toBe(7);
  });

  it('should propagate a transform error during reset through both catch layers', () => {
    let failOnReset = false;
    const s = new SignalBuilder(1)
      .transform((v) => {
        if (failOnReset) throw new Error('reset transform failed');
        return v;
      })
      .build();
    s.setValue(2);
    failOnReset = true;
    expect(() => s.reset()).toThrowError('reset transform failed');
  });

  it('should expose validate() as a callable method', () => {
    const s = new SignalBuilder(1)
      .validate((v) => v > 0)
      .build();
    expect(s.validate()).toBe(true);
  });

  it('should fall back to reference comparison in hasChanged for circular values', () => {
    interface Circular {
      self?: Circular;
    }
    const a: Circular = {};
    a.self = a;
    const b: Circular = {};
    b.self = b;

    const s = new SignalBuilder<Circular>(a).build();
    s.setValue(b);
    expect(s.hasChanged()).toBe(true);
  });

  it('should propagate an operator error during the initial pipe() evaluation', () => {
    const s = new SignalBuilder(1).build();
    expect(() =>
      s.pipe(() => {
        throw new Error('initial pipe failure');
      }),
    ).toThrowError('initial pipe failure');
  });

  it('should route an operator error on later recompute through the error handler', () => {
    const handler = jasmine.createSpy('errorHandler');
    const s = new SignalBuilder(1).onError(handler).build();
    let calls = 0;
    const doubled = s.pipe((source: unknown) => {
      const sig = source as () => number;
      return () => {
        calls += 1;
        if (calls > 1) {
          throw new Error('pipe recompute failure');
        }
        return sig() * 2;
      };
    });
    expect(doubled.value).toBe(2);
    expect(() => s.setValue(5)).not.toThrow();
    expect(handler).toHaveBeenCalledWith(jasmine.any(Error));
  });

  it('should clear a pending async validation timeout on destroy', fakeAsync(() => {
    const s = new SignalBuilder(0)
      .validateAsync(async () => true)
      .build();
    s.setValue(1);
    expect(() => s.destroy()).not.toThrow();
    tick(100);
  }));

  it('should clear a pending debounce through the internal immediate-operation helpers', () => {
    const s = new SignalBuilder(0).debounce(100).build() as AnyBuilder;
    s.setValue(1);
    expect(() => s._clearPendingOperations()).not.toThrow();
    expect(() => s._setValueImmediate(2)).not.toThrow();
    expect(s.value).toBe(2);
  });

  it('should clear an active debounce timeout inside _setValueImmediate', () => {
    const s = new SignalBuilder(0).debounce(100).build() as AnyBuilder;
    s.setValue(1);
    expect(() => s._setValueImmediate(2)).not.toThrow();
    expect(s.value).toBe(2);
  });

  it('should collect a generic message when collectValidationErrors catches a non-Error throw', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const errors = builder.collectValidationErrors(
      [
        () => {
          throw 'non-error validator failure';
        },
      ],
      5,
    );
    expect(errors).toEqual(['Validation failed']);
  });

  it('should serialize using the fallback value when the primary data fails non-circularly', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const badPrimary = {
      toJSON(): never {
        throw new RangeError('primary unserializable');
      },
    };
    const result = builder.serializeWithCircularCheck(badPrimary, 42);
    expect(result).toBe('42');
  });

  it('should rethrow when both the primary and fallback data fail non-circularly', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const bad = {
      toJSON(): never {
        throw new RangeError('always fails');
      },
    };
    expect(() => builder.serializeWithCircularCheck(bad, bad)).toThrowError(
      'always fails',
    );
  });

  it('should rethrow the original error when no fallback data is provided', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const bad = {
      toJSON(): never {
        throw new RangeError('no fallback available');
      },
    };
    expect(() => builder.serializeWithCircularCheck(bad)).toThrowError(
      'no fallback available',
    );
  });

  it('should rethrow a non-circular TypeError from a failing fallback', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const primary = {
      toJSON(): never {
        throw new RangeError('primary fails');
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback: any = { big: 0n };
    expect(() => builder.serializeWithCircularCheck(primary, fallback)).toThrowError(
      /BigInt/,
    );
  });

  it('should invoke the generic Async validation error message for a non-Error thrown by a single validator', fakeAsync(() => {
    const s = new SignalBuilder(0)
      .validateAsync(async () => {
        throw 'plain validator failure';
      })
      .build();
    s.setValue(1);
    tick(100);
    flushMicrotasks();
    expect(s.asyncErrors()).toEqual(['Async validation error']);
  }));

  it('should route a synchronous guard failure in runAsyncValidation through its catch handler', fakeAsync(() => {
    const builder = new SignalBuilder(0) as AnyBuilder;
    builder.validateAsync(async () => true);
    const throwingLengthHolder: { length: number } = Object.defineProperty(
      {},
      'length',
      {
        get(): number {
          throw new Error('length access boom');
        },
      },
    ) as { length: number };
    builder.options.asyncValidators = throwingLengthHolder;

    const errorHandler = jasmine.createSpy('errorHandler');
    builder.onError(errorHandler);
    const s = builder.build();

    expect(() => s.setValue(1)).not.toThrow();
    flushMicrotasks();
    expect(errorHandler).toHaveBeenCalledWith(jasmine.any(Error));
  }));

  it('should route a storage-write failure during setValue when serialization fails identically for data and fallback', () => {
    const handler = jasmine.createSpy('errorHandler');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = { big: 1n };
    const s = new SignalBuilder<unknown>(1).persist('gap-write-fail').onError(handler).build();
    expect(() => s.setValue(bad)).not.toThrow();
    expect(handler).toHaveBeenCalledWith(jasmine.any(Error));
  });

  it('should route a storage-write failure during reset when serialization fails identically for data and fallback', () => {
    const handler = jasmine.createSpy('errorHandler');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = { big: 1n };
    const s = new SignalBuilder<unknown>(0)
      .transform(() => bad)
      .persist('gap-reset-fail')
      .onError(handler)
      .build();
    expect(() => s.reset()).not.toThrow();
    expect(handler).toHaveBeenCalledWith(jasmine.any(Error));
  });

  it('should String-convert a non-Error thrown during destroy cleanup', () => {
    spyOn(AbortController.prototype, 'abort').and.callFake(() => {
      throw 'abort failed';
    });
    const errorSpy = spyOn(console, 'error');

    const s = new SignalBuilder(0).validateAsync(async () => true).build();
    s.setValue(1);

    expect(() => s.destroy()).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should log a non-Error thrown by a registered error handler during destroy cleanup', () => {
    spyOn(AbortController.prototype, 'abort').and.callFake(() => {
      throw 'abort failed';
    });
    const errorSpy = spyOn(console, 'error');

    const s = new SignalBuilder(0)
      .validateAsync(async () => true)
      .onError(() => {
        throw 'handler failed non-error';
      })
      .build();
    s.setValue(1);

    expect(() => s.destroy()).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should route a malformed cross-tab storage event through the error handler', () => {
    const handler = jasmine.createSpy('errorHandler');
    new SignalBuilder(1)
      .persist('gap-storage-event-key')
      .onError(handler)
      .build();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'gap-storage-event-key',
        newValue: '{not valid json',
      }),
    );

    expect(handler).toHaveBeenCalledWith(jasmine.any(Error));
  });

  it('should return a generic message when collectValidationErrors receives a broken validators array', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const brokenValidators = Object.defineProperty({}, 'length', {
      get(): number {
        throw new Error('validators length boom');
      },
    });
    const errors = builder.collectValidationErrors(brokenValidators, 5);
    expect(errors).toEqual(['Validation failed']);
  });

  it('should use the circular-safe fallback when the fallback data is itself circular', () => {
    const builder = new SignalBuilder(1) as AnyBuilder;
    const primary = {
      toJSON(): never {
        throw new RangeError('primary fails');
      },
    };
    interface Circular {
      self?: Circular;
    }
    const circularFallback: Circular = {};
    circularFallback.self = circularFallback;

    const result = builder.serializeWithCircularCheck(primary, circularFallback);
    expect(result).toContain('[Circular Reference]');
  });
});

describe('SignalBuilder async validation abort edge cases', () => {
  let originalAbortedDescriptor: PropertyDescriptor | undefined;

  const forceAborted = (getter: () => boolean): void => {
    originalAbortedDescriptor = Object.getOwnPropertyDescriptor(
      AbortSignal.prototype,
      'aborted',
    );
    Object.defineProperty(AbortSignal.prototype, 'aborted', {
      configurable: true,
      get: getter,
    });
  };

  afterEach(() => {
    if (originalAbortedDescriptor) {
      Object.defineProperty(AbortSignal.prototype, 'aborted', originalAbortedDescriptor);
      originalAbortedDescriptor = undefined;
    }
  });

  it('should stop async validation immediately when already aborted at entry', fakeAsync(() => {
    forceAborted(() => true);

    const s = new SignalBuilder(0).validateAsync(async () => true).build();
    s.setValue(1);
    tick(100);
    flushMicrotasks();

    expect(s.isValidating()).toBe(true);
  }));

  it('should stop iterating validators mid-loop once aborted', fakeAsync(() => {
    let flag = false;
    forceAborted(() => flag);

    const second = jasmine.createSpy('secondValidator').and.returnValue(true);
    const s = new SignalBuilder(0)
      .validateAsync(async () => {
        flag = true;
        return true;
      })
      .validateAsync(second)
      .build();

    s.setValue(1);
    tick(100);
    flushMicrotasks();

    expect(second).not.toHaveBeenCalled();
  }));

  it('should record a non-Error async validation failure via the outer catch', fakeAsync(() => {
    const builder = new SignalBuilder(0) as AnyBuilder;
    builder.validateAsync(async () => true);
    builder.options.asyncValidators = {
      length: 1,
      [Symbol.iterator]: () => {
        throw 'iterator boom';
      },
    };
    const s = builder.build();

    s.setValue(1);
    tick(100);
    flushMicrotasks();

    expect(s.asyncErrors()).toEqual(['Async validation error']);
  }));

  it('should record an Error-based async validation failure via the outer catch', fakeAsync(() => {
    const builder = new SignalBuilder(0) as AnyBuilder;
    builder.validateAsync(async () => true);
    builder.options.asyncValidators = {
      length: 1,
      [Symbol.iterator]: () => {
        throw new Error('iterator error boom');
      },
    };
    const s = builder.build();

    s.setValue(1);
    tick(100);
    flushMicrotasks();

    expect(s.asyncErrors()).toEqual(['iterator error boom']);
  }));
});
