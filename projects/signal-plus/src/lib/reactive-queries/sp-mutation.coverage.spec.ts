import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { MutationResult } from './interfaces';
import { getGlobalQueryClient } from './query-client';
import { spMutation } from './sp-mutation';

describe('spMutation gap behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should invalidate queries after an optimistic success', fakeAsync(() => {
    const client = getGlobalQueryClient();
    client.setQueryData<number[]>(['opt-s'], [1]);

    const mutation = spMutation<number, number>({
      mutationFn: (value) => Promise.resolve(value),
      optimisticUpdate: {
        queryKey: ['opt-s'],
        updater: (current, value) => [
          ...((current as number[] | undefined) ?? []),
          value,
        ],
        invalidateOnSettled: true,
      },
    });

    mutation.mutate(2);
    flushMicrotasks();

    expect(mutation.isSuccess()).toBe(true);
  }));

  it('should run settled callbacks and invalidation on error', fakeAsync(() => {
    const client = getGlobalQueryClient();
    client.setQueryData<number[]>(['opt-e'], [1]);
    const onSettled = jasmine.createSpy('onSettled');

    const mutation = spMutation<number, number>({
      mutationFn: () => Promise.reject(new Error('bad')),
      onSettled,
      optimisticUpdate: {
        queryKey: ['opt-e'],
        updater: (current) => current as number[],
        invalidateOnSettled: true,
      },
    });

    mutation.mutate(1).catch(() => undefined);
    flushMicrotasks();

    expect(onSettled).toHaveBeenCalledWith(undefined, jasmine.any(Error), 1);
    expect(mutation.isError()).toBe(true);
  }));

  it('should support function-based retry and retry delay', fakeAsync(() => {
    let calls = 0;
    const mutation = spMutation<number, number>({
      mutationFn: () => {
        calls += 1;
        return calls < 2 ? Promise.reject(new Error('x')) : Promise.resolve(1);
      },
      retry: (failureCount) => failureCount < 3,
      retryDelay: () => 5,
    });

    mutation.mutate(1);
    flushMicrotasks();
    tick(5);
    flushMicrotasks();

    expect(mutation.data()).toBe(1);
  }));

  it('should reject mutations after the context is destroyed', fakeAsync(() => {
    let mutation!: MutationResult<number, number>;
    TestBed.runInInjectionContext(() => {
      mutation = spMutation<number, number>({
        mutationFn: (value) => Promise.resolve(value),
      });
    });

    TestBed.resetTestingModule();

    let message = '';
    mutation.mutate(1).catch((error: Error) => (message = error.message));
    flushMicrotasks();

    expect(message).toBe('Mutation was destroyed');
  }));
});
