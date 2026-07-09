import { signal } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { spInfiniteQuery } from './sp-infinite-query';

describe('spInfiniteQuery gap behavior', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should accept object query keys and expose fetching state', fakeAsync(() => {
    const result = spInfiniteQuery<number[], number>({
      queryKey: { key: ['iq-object'] },
      queryFn: (page) => Promise.resolve([page]),
      initialPageParam: 0,
      getNextPageParam: (last) => last[0] + 1,
    });

    flushMicrotasks();
    expect(result.pages().length).toBe(1);
    expect(result.isFetchingNextPage()).toBe(false);
  }));

  it('should report more pages when a page resolves to undefined', fakeAsync(() => {
    const result = spInfiniteQuery<number[] | undefined, number>({
      queryKey: ['iq-undef'],
      queryFn: () => Promise.resolve(undefined),
      initialPageParam: 0,
      getNextPageParam: () => undefined,
    });

    flushMicrotasks();
    expect(result.hasNextPage()).toBe(true);
  }));

  it('should use the initial page param when fetching the first page manually', fakeAsync(() => {
    const result = spInfiniteQuery<number[], number>({
      queryKey: ['iq-manual'],
      queryFn: (page) => Promise.resolve([page]),
      initialPageParam: 7,
      getNextPageParam: () => undefined,
      enabled: false,
    });

    result.fetchNextPage();
    flushMicrotasks();

    expect(result.pages()).toEqual([[7]]);
  }));

  it('should clear the enabled watcher on context destroy', fakeAsync(() => {
    const enabled = signal(false);

    TestBed.runInInjectionContext(() => {
      spInfiniteQuery<number[], number>({
        queryKey: ['iq-watcher'],
        queryFn: (page) => Promise.resolve([page]),
        initialPageParam: 0,
        getNextPageParam: () => undefined,
        enabled,
      });
    });

    TestBed.resetTestingModule();
    tick(200);

    expect(enabled()).toBe(false);
  }));
});
