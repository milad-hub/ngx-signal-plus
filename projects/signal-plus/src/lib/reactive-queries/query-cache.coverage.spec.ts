import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { _setServerModeForTesting } from '../utils/platform';
import { Query, QueryCache } from './query-cache';

function makeObserver() {
  return { options: {} as never, onStateUpdate: () => undefined };
}

describe('QueryCache gap behavior', () => {
  afterEach(() => {
    _setServerModeForTesting(false);
  });

  it('should delete garbage-collectable queries during gc', fakeAsync(() => {
    const cache = new QueryCache();
    const query = new Query<number>(['gc'], {
      queryKey: ['gc'],
      queryFn: () => Promise.resolve(1),
      cacheTime: 1,
    });
    cache.set(['gc'], query);
    query.refetch();
    flushMicrotasks();
    tick(10);

    cache.gc();
    expect(cache.get(['gc'])).toBeUndefined();
  }));

  it('should skip scheduling gc outside the browser', () => {
    _setServerModeForTesting(true);
    const cache = new QueryCache();
    cache.scheduleGC();
    expect(cache.getStats().totalQueries).toBe(0);
  });
});

describe('Query gap behavior', () => {
  it('should run success callbacks with function-based retry and delay', fakeAsync(() => {
    let calls = 0;
    const onSuccess = jasmine.createSpy('onSuccess');
    const onSettled = jasmine.createSpy('onSettled');
    const query = new Query<number>(['retry-fn'], {
      queryKey: ['retry-fn'],
      queryFn: () => {
        calls += 1;
        return calls < 2 ? Promise.reject(new Error('x')) : Promise.resolve(9);
      },
      retry: (failureCount) => failureCount < 3,
      retryDelay: () => 5,
      onSuccess,
      onSettled,
    });

    query.refetch();
    flushMicrotasks();
    tick(5);
    flushMicrotasks();

    expect(onSuccess).toHaveBeenCalledWith(9);
    expect(onSettled).toHaveBeenCalledWith(9, null);
    query.destroy();
  }));

  it('should run error callbacks when retries are exhausted', fakeAsync(() => {
    const onError = jasmine.createSpy('onError');
    const onSettled = jasmine.createSpy('onSettled');
    const query = new Query<number>(['err'], {
      queryKey: ['err'],
      queryFn: () => Promise.reject(new Error('bad')),
      retry: () => false,
      onError,
      onSettled,
    });

    query.refetch().catch(() => undefined);
    flushMicrotasks();

    expect(onError).toHaveBeenCalledWith(jasmine.any(Error));
    expect(onSettled).toHaveBeenCalledWith(undefined, jasmine.any(Error));
    query.destroy();
  }));

  it('should abort an in-flight retry loop on cancel', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['abort'], {
      queryKey: ['abort'],
      queryFn: () => {
        calls += 1;
        return Promise.reject(new Error('x'));
      },
      retry: 5,
      retryDelay: 50,
    });

    let rejected: Error | null = null;
    query.refetch().catch((error: Error) => (rejected = error));
    flushMicrotasks();
    query.cancel();
    tick(50);
    flushMicrotasks();

    expect(calls).toBe(1);
    expect(rejected!.message).toBe('Query aborted');
    query.destroy();
  }));

  it('should not resurrect a cancelled retry loop after a refetch', fakeAsync(() => {
    let calls = 0;
    let fail = true;
    const query = new Query<number>(['cancel-refetch'], {
      queryKey: ['cancel-refetch'],
      queryFn: () => {
        calls += 1;
        return fail ? Promise.reject(new Error('x')) : Promise.resolve(calls);
      },
      retry: 5,
      retryDelay: 50,
    });

    query.refetch().catch(() => undefined);
    flushMicrotasks();
    query.cancel();

    fail = false;
    query.refetch();
    flushMicrotasks();
    expect(calls).toBe(2);
    expect(query.getState().isSuccess).toBe(true);

    tick(50);
    flushMicrotasks();
    expect(calls).toBe(2);
    expect(query.getState().isSuccess).toBe(true);
    expect(query.getState().isError).toBe(false);
    query.destroy();
  }));

  it('should refetch on interval when background refetching is enabled', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['interval-bg'], {
      queryKey: ['interval-bg'],
      queryFn: () => Promise.resolve(++calls),
      refetchInterval: 20,
      refetchIntervalInBackground: true,
    });
    const unsubscribe = query.subscribe(makeObserver());

    query.refetch();
    flushMicrotasks();
    tick(20);
    flushMicrotasks();

    expect(calls).toBe(2);
    unsubscribe();
    query.destroy();
  }));

  it('should refetch on interval while the document is visible', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['interval-visible'], {
      queryKey: ['interval-visible'],
      queryFn: () => Promise.resolve(++calls),
      refetchInterval: 20,
    });
    const unsubscribe = query.subscribe(makeObserver());

    query.refetch();
    flushMicrotasks();
    tick(20);
    flushMicrotasks();

    expect(calls).toBe(2);
    unsubscribe();
    query.destroy();
  }));

  it('should swallow a failed interval refetch', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['interval-fail'], {
      queryKey: ['interval-fail'],
      queryFn: () => {
        calls += 1;
        return calls === 1
          ? Promise.resolve(1)
          : Promise.reject(new Error('x'));
      },
      refetchInterval: 20,
    });
    const unsubscribe = query.subscribe(makeObserver());

    query.refetch();
    flushMicrotasks();
    tick(20);
    flushMicrotasks();

    expect(calls).toBe(2);
    expect(query.getState().isError).toBe(true);
    unsubscribe();
    query.destroy();
  }));

  it('should default setOptimisticData markStale to false when omitted', fakeAsync(() => {
    const query = new Query<number>(['opt-default'], {
      queryKey: ['opt-default'],
      queryFn: () => Promise.resolve(1),
    });

    query.refetch();
    flushMicrotasks();
    expect(query.getState().isStale).toBe(false);

    query.setOptimisticData(2);
    expect(query.getState().isStale).toBe(false);
    query.destroy();
  }));

  it('should schedule garbage collection when the last observer unsubscribes', fakeAsync(() => {
    const query = new Query<number>(['gc-sub'], {
      queryKey: ['gc-sub'],
      queryFn: () => Promise.resolve(1),
      cacheTime: 10,
    });

    const unsubscribe = query.subscribe(makeObserver());
    flushMicrotasks();
    unsubscribe();
    tick(10);

    expect(query.hasObservers()).toBe(false);
  }));

  it('should refetch when the connection is restored', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['online'], {
      queryKey: ['online'],
      queryFn: () => Promise.resolve(++calls),
      refetchOnReconnect: true,
    });

    const unsubscribe = query.subscribe(makeObserver());
    flushMicrotasks();
    window.dispatchEvent(new Event('online'));
    flushMicrotasks();

    expect(calls).toBe(2);
    unsubscribe();
    query.destroy();
    tick(10);
  }));

  it('should swallow a failed focus refetch', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['focus-fail'], {
      queryKey: ['focus-fail'],
      queryFn: () => {
        calls += 1;
        return calls === 1
          ? Promise.resolve(1)
          : Promise.reject(new Error('x'));
      },
      refetchOnWindowFocus: true,
    });

    const unsubscribe = query.subscribe(makeObserver());
    flushMicrotasks();
    window.dispatchEvent(new Event('focus'));
    flushMicrotasks();

    expect(calls).toBe(2);
    expect(query.getState().isError).toBe(true);
    unsubscribe();
    query.destroy();
    tick(10);
  }));

  it('should swallow a failed reconnect refetch', fakeAsync(() => {
    let calls = 0;
    const query = new Query<number>(['online-fail'], {
      queryKey: ['online-fail'],
      queryFn: () => {
        calls += 1;
        return calls === 1
          ? Promise.resolve(1)
          : Promise.reject(new Error('x'));
      },
      refetchOnReconnect: true,
    });

    const unsubscribe = query.subscribe(makeObserver());
    flushMicrotasks();
    window.dispatchEvent(new Event('online'));
    flushMicrotasks();

    expect(calls).toBe(2);
    expect(query.getState().isError).toBe(true);
    unsubscribe();
    query.destroy();
    tick(10);
  }));

  it('should mark cached data stale in getState after the stale time', fakeAsync(() => {
    const query = new Query<number>(['stale'], {
      queryKey: ['stale'],
      queryFn: () => Promise.resolve(1),
      staleTime: 5,
    });

    query.refetch();
    flushMicrotasks();
    expect(query.getState().isStale).toBe(false);

    query.destroy();
    tick(6);
    expect(query.getState().isStale).toBe(true);
  }));
});
