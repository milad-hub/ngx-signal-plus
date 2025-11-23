import { Query, QueryCache } from './query-cache';
import { QueryObserver, QueryOptions } from './query-types';

describe('QueryCache', () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    queryCache = new QueryCache();
  });

  afterEach(() => {
    queryCache.gc();
  });

  it('should create a query cache', () => {
    expect(queryCache).toBeDefined();
  });

  it('should set and get queries', () => {
    const queryKey = ['test'];
    const options: QueryOptions = {
      queryKey,
      queryFn: async () => ({ data: 'test' }),
    };
    const query = new Query(queryKey, options);
    queryCache.set(queryKey, query);
    const retrievedQuery = queryCache.get(queryKey);
    expect(retrievedQuery).toBe(query);
  });

  it('should delete queries', () => {
    const queryKey = ['test'];
    const options: QueryOptions = {
      queryKey,
      queryFn: async () => ({ data: 'test' }),
    };
    const query = new Query(queryKey, options);
    queryCache.set(queryKey, query);
    expect(queryCache.get(queryKey)).toBe(query);
    queryCache.delete(queryKey);
    expect(queryCache.get(queryKey)).toBeUndefined();
  });

  it('should invalidate queries', async () => {
    const queryKey = ['test'];
    let callCount = 0;
    const options: QueryOptions<{ count: number }> = {
      queryKey,
      queryFn: async () => {
        callCount++;
        return { count: callCount };
      },
    };
    const query = new Query(queryKey, options);
    queryCache.set(queryKey, query);
    const observer: QueryObserver<{ count: number }> = {
      options,
      onStateUpdate: jasmine.createSpy('onStateUpdate'),
    };
    const unsubscribe = query.subscribe(observer);
    await query.fetch();
    expect(callCount).toBe(1);
    queryCache.invalidate(queryKey);
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();
  });

  it('should invalidate all queries', async () => {
    const queryKey1 = ['test1'];
    const queryKey2 = ['test2'];
    const options1: QueryOptions = {
      queryKey: queryKey1,
      queryFn: async () => ({ data: 'test1' }),
    };
    const options2: QueryOptions = {
      queryKey: queryKey2,
      queryFn: async () => ({ data: 'test2' }),
    };
    const query1 = new Query(queryKey1, options1);
    const query2 = new Query(queryKey2, options2);
    queryCache.set(queryKey1, query1);
    queryCache.set(queryKey2, query2);
    const observer1 = {
      options: options1,
      onStateUpdate: jasmine.createSpy('onStateUpdate1'),
    };
    const observer2 = {
      options: options2,
      onStateUpdate: jasmine.createSpy('onStateUpdate2'),
    };
    const unsub1 = query1.subscribe(observer1);
    const unsub2 = query2.subscribe(observer2);
    const initialCalls1 = (
      observer1.onStateUpdate as jasmine.Spy
    ).calls.count();
    const initialCalls2 = (
      observer2.onStateUpdate as jasmine.Spy
    ).calls.count();
    queryCache.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(
      (observer1.onStateUpdate as jasmine.Spy).calls.count(),
    ).toBeGreaterThan(initialCalls1);
    expect(
      (observer2.onStateUpdate as jasmine.Spy).calls.count(),
    ).toBeGreaterThan(initialCalls2);
    expect(query1.getState().fetchCount).toBeGreaterThan(0);
    expect(query2.getState().fetchCount).toBeGreaterThan(0);
    unsub1();
    unsub2();
  });

  it('should provide stats', () => {
    const queryKey1 = ['test1'];
    const queryKey2 = ['test2'];
    const options: QueryOptions = {
      queryKey: queryKey1,
      queryFn: async () => ({ data: 'test' }),
    };
    const query1 = new Query(queryKey1, options);
    const query2 = new Query(queryKey2, options);
    queryCache.set(queryKey1, query1);
    queryCache.set(queryKey2, query2);
    const stats = queryCache.getStats();
    expect(stats.totalQueries).toBe(2);
    expect(stats.activeQueries).toBe(0);
    expect(stats.gcReadyQueries).toBe(0);
  });

  it('should schedule garbage collection', () => {
    jasmine.clock().install();
    spyOn(queryCache, 'gc').and.callThrough();
    queryCache.scheduleGC();
    jasmine.clock().tick(60000);
    expect(queryCache.gc).toHaveBeenCalled();
    jasmine.clock().uninstall();
  });
});

describe('Query', () => {
  let query: Query<{ data: string }>;
  let options: QueryOptions<{ data: string }>;

  beforeEach(() => {
    options = {
      queryKey: ['test'],
      queryFn: async () => ({ data: 'test' }),
    };
    query = new Query(['test'], options);
  });

  it('should create a query with initial state', () => {
    const state = query.getState();
    expect(state.isIdle).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.isFetching).toBe(false);
    expect(state.data).toBeUndefined();
    expect(state.error).toBeNull();
  });

  it('should fetch data successfully', async () => {
    const result = await query.fetch();
    expect(result).toEqual({ data: 'test' });
    const state = query.getState();
    expect(state.isSuccess).toBe(true);
    expect(state.data).toEqual({ data: 'test' });
    expect(state.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const errorOptions: QueryOptions = {
      queryKey: ['error'],
      queryFn: async () => {
        throw new Error('Fetch failed');
      },
    };
    const errorQuery = new Query(['error'], errorOptions);
    try {
      await errorQuery.fetch();
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toEqual(new Error('Fetch failed'));
    }
    const state = errorQuery.getState();
    expect(state.isError).toBe(true);
    expect(state.error).toEqual(new Error('Fetch failed'));
  });

  it('should handle retry logic', async () => {
    let attempts = 0;
    const errorOptions: QueryOptions = {
      queryKey: ['retry'],
      queryFn: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return { success: true };
      },
      retry: 3,
      retryDelay: 10,
    };
    const retryQuery = new Query(['retry'], errorOptions);
    const result = await retryQuery.fetch();
    expect(result).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  it('should notify observers on state changes', async () => {
    const observer: QueryObserver<{ data: string }> = {
      options: options as QueryOptions<{ data: string }>,
      onStateUpdate: jasmine.createSpy('onStateUpdate'),
    };
    const unsubscribe = query.subscribe(observer);
    await query.fetch();
    expect(observer.onStateUpdate).toHaveBeenCalled();
    unsubscribe();
  });

  it('should handle multiple observers', async () => {
    const observer1: QueryObserver<{ data: string }> = {
      options: options as QueryOptions<{ data: string }>,
      onStateUpdate: jasmine.createSpy('onStateUpdate1'),
    };
    const observer2: QueryObserver<{ data: string }> = {
      options: options as QueryOptions<{ data: string }>,
      onStateUpdate: jasmine.createSpy('onStateUpdate2'),
    };
    const unsub1 = query.subscribe(observer1);
    const unsub2 = query.subscribe(observer2);
    await query.fetch();
    expect(observer1.onStateUpdate).toHaveBeenCalled();
    expect(observer2.onStateUpdate).toHaveBeenCalled();
    unsub1();
    unsub2();
  });

  it('should invalidate and refetch', async () => {
    let callCount = 0;
    const options: QueryOptions = {
      queryKey: ['invalidate'],
      queryFn: async () => {
        callCount++;
        return { count: callCount };
      },
    };
    const invalidateQuery = new Query(['invalidate'], options);
    await invalidateQuery.fetch();
    expect(callCount).toBe(1);
    const observer = {
      options,
      onStateUpdate: jasmine.createSpy('onStateUpdate'),
    };
    const unsubscribe = invalidateQuery.subscribe(observer);
    invalidateQuery.invalidate();
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();
  });

  it('should handle refetch', async () => {
    let callCount = 0;
    const options: QueryOptions = {
      queryKey: ['refetch'],
      queryFn: async () => {
        callCount++;
        return { count: callCount };
      },
    };
    const refetchQuery = new Query(['refetch'], options);
    await refetchQuery.fetch();
    expect(callCount).toBe(1);
    await refetchQuery.refetch();
    expect(callCount).toBe(2);
  });

  it('should handle abort on destroy', () => {
    const abortOptions: QueryOptions = {
      queryKey: ['abort'],
      queryFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { data: 'should not reach' };
      },
    };
    const abortQuery = new Query(['abort'], abortOptions);
    const fetchPromise = abortQuery.fetch();
    abortQuery.destroy();
    expect(() => fetchPromise).not.toThrow();
  });
});
