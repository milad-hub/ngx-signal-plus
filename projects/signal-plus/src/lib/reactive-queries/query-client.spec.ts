import {
  QueryClient,
  getGlobalQueryClient,
  setGlobalQueryClient,
} from './query-client';

describe('QueryClient', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    setGlobalQueryClient(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should create a query client', () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getQueryCache()).toBeDefined();
  });

  it('should get and set global query client', () => {
    const client = getGlobalQueryClient();
    expect(client).toBe(queryClient);
  });

  it('should set and get query data', async () => {
    const queryKey = ['test'];
    const testData = { message: 'Hello World' };
    await queryClient.fetchQuery(queryKey, {
      queryKey,
      queryFn: async () => testData,
    });
    const data = queryClient.getQueryData(queryKey);
    expect(data).toEqual(testData);
  });

  it('should invalidate queries', async () => {
    const queryKey = ['test'];
    let callCount = 0;
    const queryFn = async () => {
      callCount++;
      return { count: callCount };
    };
    await queryClient.fetchQuery(queryKey, {
      queryKey,
      queryFn,
    });
    expect(callCount).toBe(1);
    queryClient.invalidateQueries(queryKey);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(callCount).toBe(1);
  });

  it('should handle default options', () => {
    const customClient = new QueryClient({
      defaultOptions: {
        staleTime: 1000,
        retry: 5,
      },
    });
    const defaultOptions = customClient.getDefaultOptions();
    expect(defaultOptions.staleTime).toBe(1000);
    expect(defaultOptions.retry).toBe(5);
  });

  it('should get query state', async () => {
    const queryKey = ['test'];
    const testData = { message: 'Test' };
    await queryClient.fetchQuery(queryKey, {
      queryKey,
      queryFn: async () => testData,
    });
    const state = queryClient.getQueryState(queryKey);
    expect(state).toBeDefined();
    expect(state?.data).toEqual(testData);
    expect(state?.isSuccess).toBe(true);
  });

  it('should provide stats', async () => {
    const queryKey = ['test'];
    await queryClient.fetchQuery(queryKey, {
      queryKey,
      queryFn: async () => ({ data: 'test' }),
    });
    const stats = queryClient.getStats();
    expect(stats.totalQueries).toBe(1);
    expect(stats.activeQueries).toBe(0);
    expect(stats.gcReadyQueries).toBe(0);
  });

  it('should prefetch queries', async () => {
    const queryKey = ['prefetch'];
    let called = false;
    await queryClient.prefetchQuery(queryKey, {
      queryKey,
      queryFn: async () => {
        called = true;
        return { prefetched: true };
      },
    });
    expect(called).toBe(true);
    const data = queryClient.getQueryData(queryKey);
    expect(data).toEqual({ prefetched: true });
  });

  it('should set optimistic data when query is missing', () => {
    const key = ['optimistic-missing'];
    queryClient.setQueryData(key, { value: 1 }, true);
    const state = queryClient.getQueryState(key);
    expect(state?.data).toEqual({ value: 1 });
    expect(state?.isSuccess).toBe(true);
    expect(state?.isStale).toBe(true);
  });

  it('should set optimistic data on existing query', async () => {
    const key = ['optimistic-existing'];
    await queryClient.fetchQuery(key, {
      queryKey: key,
      queryFn: async () => ({ value: 0 }),
    });
    queryClient.setQueryData(
      key,
      (old: { value: number } | undefined) => ({ value: (((old?.value) ?? 0) + 1) }),
      false,
    );
    const state = queryClient.getQueryState(key);
    expect(state?.data).toEqual({ value: 1 });
    expect(state?.isSuccess).toBe(true);
    expect(state?.isStale).toBe(false);
  });

  it('should refetch active queries without key', async () => {
    const key = ['refetch-all'];
    let calls = 0;
    await queryClient.fetchQuery(key, {
      queryKey: key,
      queryFn: async () => {
        calls++;
        return { count: calls };
      },
    });
    const query = queryClient.getQueryCache().get(key)!;
    const observer = {
      options: { queryKey: key, queryFn: async () => ({}) },
      onStateUpdate: jasmine.createSpy('onStateUpdate'),
    };
    const unsub = query.subscribe(observer);
    await queryClient.refetchQueries();
    expect(calls).toBe(2);
    unsub();
  });

  it('should report fetching state during fetch', async () => {
    const key = ['isFetching'];
    const p = queryClient.fetchQuery(key, {
      queryKey: key,
      queryFn: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { ok: true };
      },
    });
    expect(queryClient.isFetching()).toBe(true);
    await p;
    expect(queryClient.isFetching()).toBe(false);
  });

  it('should report isMutating as false by default', () => {
    expect(queryClient.isMutating()).toBe(false);
  });
});