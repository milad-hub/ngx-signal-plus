import { signal } from '@angular/core';
import { QueryClient, setGlobalQueryClient } from './query-client';
import { createInfiniteQuery, spInfiniteQuery } from './sp-infinite-query';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('spInfiniteQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    setGlobalQueryClient(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch initial page and next page', async () => {
    const query = spInfiniteQuery<number, number>({
      queryKey: ['infinite', 'numbers'],
      initialPageParam: 1,
      queryFn: async (page) => page,
      getNextPageParam: (lastPage) => (lastPage < 2 ? lastPage + 1 : undefined),
    });

    await wait(25);

    expect(query.pages()).toEqual([1]);
    expect(query.hasNextPage()).toBe(true);

    await query.fetchNextPage();

    expect(query.pages()).toEqual([1, 2]);
    expect(query.hasNextPage()).toBe(false);
  });

  it('should stop fetching when next page param is undefined', async () => {
    const query = spInfiniteQuery<number, number>({
      queryKey: ['infinite', 'single-page'],
      initialPageParam: 1,
      queryFn: async (page) => page,
      getNextPageParam: () => undefined,
    });

    await wait(25);
    expect(query.pages()).toEqual([1]);

    await query.fetchNextPage();

    expect(query.pages()).toEqual([1]);
    expect(query.hasNextPage()).toBe(false);
  });

  it('should use cached pages without calling queryFn', async () => {
    const key = ['infinite', 'cached'];
    queryClient.setQueryData(key, [10, 20]);

    let calls = 0;
    const query = spInfiniteQuery<number, number>({
      queryKey: key,
      initialPageParam: 1,
      queryFn: async (page) => {
        calls += 1;
        return page;
      },
      getNextPageParam: () => undefined,
    });

    await wait(25);

    expect(query.pages()).toEqual([10, 20]);
    expect(calls).toBe(0);
  });

  it('should not auto-fetch when enabled is false', async () => {
    let calls = 0;
    const query = spInfiniteQuery<number, number>({
      queryKey: ['infinite', 'disabled'],
      initialPageParam: 1,
      queryFn: async (page) => {
        calls += 1;
        return page;
      },
      getNextPageParam: () => undefined,
      enabled: false,
    });

    await wait(40);

    expect(query.pages()).toEqual([]);
    expect(calls).toBe(0);

    await query.refetch();

    expect(query.pages()).toEqual([1]);
    expect(calls).toBe(1);
  });

  it('should start fetching when enabled signal becomes true', async () => {
    const enabled = signal(false);
    let calls = 0;

    const query = spInfiniteQuery<number, number>({
      queryKey: ['infinite', 'signal-enabled'],
      initialPageParam: 1,
      queryFn: async (page) => {
        calls += 1;
        return page;
      },
      getNextPageParam: () => undefined,
      enabled,
    });

    await wait(120);
    expect(query.pages()).toEqual([]);
    expect(calls).toBe(0);

    enabled.set(true);

    await wait(140);
    expect(query.pages()).toEqual([1]);
    expect(calls).toBe(1);
  });

  it('should expose fetch errors', async () => {
    const query = spInfiniteQuery<number, number>({
      queryKey: ['infinite', 'error'],
      initialPageParam: 1,
      queryFn: async () => {
        throw new Error('boom');
      },
      getNextPageParam: () => undefined,
    });

    await wait(30);

    expect(query.error()).toEqual(jasmine.any(Error));
    expect(query.isLoading()).toBe(false);
    expect(query.isFetching()).toBe(false);
  });

  it('should create infinite query via helper', async () => {
    const query = createInfiniteQuery<number, number>(
      ['infinite', 'helper'],
      async (page) => page,
      {
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage < 2 ? lastPage + 1 : undefined),
      },
    );

    await wait(25);

    expect(query.pages()).toEqual([1]);

    await query.fetchNextPage();

    expect(query.pages()).toEqual([1, 2]);
  });
});
