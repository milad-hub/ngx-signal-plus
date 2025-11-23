import { signal } from '@angular/core';
import { QueryClient, setGlobalQueryClient } from './query-client';
import { createQuery, spQuery } from './sp-query';

describe('spQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    setGlobalQueryClient(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should create a query with basic options', (done) => {
    const testData = { message: 'Hello World' };
    const query = spQuery({
      queryKey: ['test'],
      queryFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return testData;
      },
    });
    expect(query).toBeDefined();
    expect(query.data).toBeDefined();
    expect(query.isLoading).toBeDefined();
    expect(query.isFetching).toBeDefined();
    expect(query.error).toBeDefined();
    expect(query.refetch).toBeDefined();
    expect(query.invalidate).toBeDefined();
    setTimeout(() => {
      expect(query.data()).toEqual(testData);
      expect(query.isLoading()).toBe(false);
      expect(query.isSuccess()).toBe(true);
      expect(query.error()).toBeNull();
      done();
    }, 50);
  });

  it('should handle query errors', (done) => {
    const errorMessage = 'Query failed';
    const query = spQuery({
      queryKey: ['error'],
      queryFn: async () => {
        throw new Error(errorMessage);
      },
    });
    setTimeout(() => {
      expect(query.isError()).toBe(true);
      expect(query.error()).toEqual(new Error(errorMessage));
      expect(query.isLoading()).toBe(false);
      done();
    }, 50);
  });

  it('should support refetch', (done) => {
    let callCount = 0;
    const query = spQuery({
      queryKey: ['refetch'],
      queryFn: async () => {
        callCount++;
        return { count: callCount };
      },
    });
    setTimeout(async () => {
      expect(query.data()).toEqual({ count: 1 });
      await query.refetch();
      expect(query.data()).toEqual({ count: 2 });
      done();
    }, 50);
  });

  it('should support invalidate', (done) => {
    let callCount = 0;
    const query = spQuery({
      queryKey: ['invalidate'],
      queryFn: async () => {
        callCount++;
        return { count: callCount };
      },
    });
    setTimeout(() => {
      expect(query.data()).toEqual({ count: 1 });
      query.invalidate();
      setTimeout(() => {
        expect(query.data()).toEqual({ count: 1 });
        done();
      }, 50);
    }, 50);
  });

  it('should handle enabled option (boolean)', (done) => {
    const query = spQuery({
      queryKey: ['disabled'],
      queryFn: async () => ({ data: 'should not fetch' }),
      enabled: false,
    });
    setTimeout(() => {
      expect(query.data()).toBeUndefined();
      expect(query.isIdle()).toBe(true);
      done();
    }, 50);
  });

  it('should handle enabled option (signal)', (done) => {
    const enabledSignal = signal(false);
    const query = spQuery({
      queryKey: ['signal-enabled'],
      queryFn: async () => ({ data: 'fetched' }),
      enabled: enabledSignal,
    });
    setTimeout(() => {
      expect(query.data()).toBeUndefined();
      expect(query.isIdle()).toBe(true);
      enabledSignal.set(true);
      setTimeout(() => {
        expect(query.data()).toEqual({ data: 'fetched' });
        expect(query.isSuccess()).toBe(true);
        done();
      }, 50);
    }, 50);
  });

  it('should handle initial data', (done) => {
    const initialData = { value: 'initial' };
    const query = spQuery({
      queryKey: ['initial'],
      queryFn: async () => ({ value: 'fetched' }),
      initialData,
    });
    expect(query.data()).toEqual(initialData);
    expect(query.isLoading()).toBe(false);
    setTimeout(() => {
      expect(query.data()).toEqual({ value: 'fetched' });
      expect(query.isSuccess()).toBe(true);
      done();
    }, 50);
  });

  it('should handle retry logic', (done) => {
    let attempts = 0;
    const query = spQuery({
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
    });
    setTimeout(() => {
      expect(query.data()).toEqual({ success: true });
      expect(query.isSuccess()).toBe(true);
      expect(attempts).toBe(3);
      done();
    }, 200);
  });

  it('should create query with createQuery helper', (done) => {
    const testData = { helper: true };
    const query = createQuery(['helper'], async () => testData, {
      staleTime: 5000,
    });
    expect(query).toBeDefined();
    setTimeout(() => {
      expect(query.data()).toEqual(testData);
      expect(query.isSuccess()).toBe(true);
      done();
    }, 50);
  });

  it('should handle stale time', (done) => {
    let callCount = 0;
    const query = spQuery({
      queryKey: ['stale'],
      queryFn: async () => {
        callCount++;
        return { count: callCount };
      },
      staleTime: 100,
    });
    setTimeout(async () => {
      expect(query.data()).toEqual({ count: 1 });
      expect(query.isStale()).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(query.isStale()).toBe(true);
      await query.refetch();
      expect(query.data()).toEqual({ count: 2 });
      done();
    }, 50);
  });

  it('should handle multiple queries with different keys', (done) => {
    const query1 = spQuery({
      queryKey: ['query1'],
      queryFn: async () => ({ id: 1 }),
    });
    const query2 = spQuery({
      queryKey: ['query2'],
      queryFn: async () => ({ id: 2 }),
    });
    setTimeout(() => {
      expect(query1.data()).toEqual({ id: 1 });
      expect(query2.data()).toEqual({ id: 2 });
      expect(query1.data()).not.toEqual(query2.data());
      done();
    }, 50);
  });

  it('should refetch on window focus when enabled', (done) => {
    let calls = 0;
    const query = spQuery({
      queryKey: ['focus-refetch'],
      queryFn: async () => {
        calls++;
        return { count: calls };
      },
      refetchOnWindowFocus: true,
    });
    setTimeout(() => {
      expect(query.data()).toEqual({ count: 1 });
      window.dispatchEvent(new Event('focus'));
      setTimeout(() => {
        expect(query.data()).toEqual({ count: 2 });
        done();
      }, 50);
    }, 50);
  });

  it('should refetch on interval when visible', (done) => {
    let calls = 0;
    spQuery({
      queryKey: ['interval-refetch'],
      queryFn: async () => {
        calls++;
        return { count: calls };
      },
      refetchInterval: 20,
      refetchIntervalInBackground: false,
    });
    setTimeout(() => {
      setTimeout(() => {
        expect(calls).toBeGreaterThanOrEqual(2);
        done();
      }, 60);
    }, 50);
  });

  it('should refetch on reconnect (online event) when enabled', (done) => {
    let calls = 0;
    const query = spQuery({
      queryKey: ['reconnect-refetch'],
      queryFn: async () => {
        calls++;
        return { count: calls };
      },
      refetchOnReconnect: true,
    });
    setTimeout(() => {
      expect(query.data()).toEqual({ count: 1 });
      window.dispatchEvent(new Event('online'));
      setTimeout(() => {
        expect(query.data()).toEqual({ count: 2 });
        done();
      }, 50);
    }, 50);
  });

  it('should refetch on interval in background when allowed', (done) => {
    let calls = 0;
    spQuery({
      queryKey: ['interval-background'],
      queryFn: async () => {
        calls++;
        return { count: calls };
      },
      refetchInterval: 20,
      refetchIntervalInBackground: true,
    });
    setTimeout(() => {
      setTimeout(() => {
        expect(calls).toBeGreaterThanOrEqual(2);
        done();
      }, 60);
    }, 50);
  });
});
