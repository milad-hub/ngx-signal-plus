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
        return calls === 1 ? Promise.reject(new Error('x')) : Promise.resolve(7);
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
});
