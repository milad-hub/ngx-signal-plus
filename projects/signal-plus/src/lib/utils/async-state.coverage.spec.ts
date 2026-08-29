import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { spAsync } from './async-state';

describe('spAsync gap behavior', () => {
  it('should swallow autoFetch failures without unhandled rejections', fakeAsync(() => {
    const state = spAsync<number>({
      initialValue: null,
      fetcher: () => Promise.reject(new Error('boom')),
      autoFetch: true,
    });

    tick(0);
    flushMicrotasks();

    expect(state.error()?.message).toBe('boom');
    expect(state.loading()).toBe(false);
  }));

  it('should retry with the default delay when retryDelay is not set', fakeAsync(() => {
    let calls = 0;
    const state = spAsync<number>({
      initialValue: null,
      fetcher: () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new Error('x'))
          : Promise.resolve(7);
      },
      retryCount: 1,
    });

    state.refetch();
    flushMicrotasks();
    tick(1000);
    flushMicrotasks();

    expect(calls).toBe(2);
    expect(state.data()).toBe(7);
  }));

  it('should ignore a fetch that resolves after reset', fakeAsync(() => {
    let resolve!: (value: number) => void;
    const onSuccess = jasmine.createSpy('onSuccess');
    const state = spAsync<number>({
      initialValue: null,
      fetcher: () => new Promise((complete) => (resolve = complete)),
      onSuccess,
    });

    state.refetch();
    state.reset();
    resolve(1);
    flushMicrotasks();

    expect(state.data()).toBeNull();
    expect(state.loading()).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  }));

  it('should stop retries after reset', fakeAsync(() => {
    let calls = 0;
    const onError = jasmine.createSpy('onError');
    const state = spAsync<number>({
      initialValue: null,
      fetcher: () => {
        calls += 1;
        return Promise.reject(new Error('failed'));
      },
      retryCount: 1,
      retryDelay: 10,
      onError,
    });

    state.refetch().catch(() => undefined);
    flushMicrotasks();
    state.reset();
    tick(10);
    flushMicrotasks();

    expect(calls).toBe(1);
    expect(state.error()).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  }));

  it('should allow an invalidated fetch to update state', fakeAsync(() => {
    let resolve!: (value: number) => void;
    let calls = 0;
    const state = spAsync<number>({
      initialValue: null,
      cacheTime: 1000,
      fetcher: () => {
        calls += 1;
        return new Promise((complete) => (resolve = complete));
      },
    });

    state.refetch();
    state.invalidate();
    resolve(1);
    flushMicrotasks();
    state.refetch();
    flushMicrotasks();

    expect(state.data()).toBe(1);
    expect(calls).toBe(1);
  }));
});
