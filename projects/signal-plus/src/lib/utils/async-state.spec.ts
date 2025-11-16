import { fakeAsync, tick } from '@angular/core/testing';
import { spAsync } from './async-state';

describe('spAsync', () => {
  describe('basic functionality', () => {
    it('should create async signal with initial value', () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('test'),
        initialValue: 'initial',
      });

      expect(asyncSignal.data()).toBe('initial');
      expect(asyncSignal.loading()).toBe(false);
      expect(asyncSignal.error()).toBeNull();
      expect(asyncSignal.isSuccess()).toBe(true);
      expect(asyncSignal.isError()).toBe(false);
    });

    it('should fetch data successfully', async () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('success'),
        initialValue: null,
      });

      await asyncSignal.refetch();

      expect(asyncSignal.data()).toBe('success');
      expect(asyncSignal.error()).toBeNull();
      expect(asyncSignal.loading()).toBe(false);
      expect(asyncSignal.isSuccess()).toBe(true);
      expect(asyncSignal.isError()).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('success'),
        initialValue: null,
      });

      const fetchPromise = asyncSignal.refetch();
      expect(asyncSignal.loading()).toBe(true);
      await fetchPromise;
      expect(asyncSignal.loading()).toBe(false);
    });

    it('should handle errors', async () => {
      const testError = new Error('Fetch failed');
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.reject(testError),
        initialValue: null,
      });

      try {
        await asyncSignal.refetch();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(testError);
      }

      expect(asyncSignal.data()).toBeNull();
      expect(asyncSignal.error()).toBe(testError);
      expect(asyncSignal.loading()).toBe(false);
      expect(asyncSignal.isSuccess()).toBe(false);
      expect(asyncSignal.isError()).toBe(true);
    });
  });

  describe('retry logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          attempts++;
          if (attempts < 2) {
            return Promise.reject(new Error('Failed'));
          }
          return Promise.resolve('success');
        },
        initialValue: null,
        retryCount: 2,
        retryDelay: 10,
      });

      await asyncSignal.refetch();

      expect(attempts).toBe(2);
      expect(asyncSignal.data()).toBe('success');
      expect(asyncSignal.error()).toBeNull();
    });

    it('should respect retry delay', fakeAsync(async () => {
      let attempts = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          attempts++;
          if (attempts < 2) {
            return Promise.reject(new Error('Failed'));
          }
          return Promise.resolve('success');
        },
        initialValue: null,
        retryCount: 2,
        retryDelay: 100,
      });

      const fetchPromise = asyncSignal.refetch();

      expect(attempts).toBe(1);
      tick(50);
      expect(attempts).toBe(1); // Should not have retried yet
      tick(50);
      expect(attempts).toBe(2); // Should have retried now

      await fetchPromise;
      expect(asyncSignal.data()).toBe('success');
    }));

    it('should exhaust retries and throw error', async () => {
      let attempts = 0;
      const testError = new Error('Failed');
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          attempts++;
          return Promise.reject(testError);
        },
        initialValue: null,
        retryCount: 2,
        retryDelay: 10,
      });

      try {
        await asyncSignal.refetch();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(testError);
      }

      expect(attempts).toBe(3); // Initial + 2 retries
      expect(asyncSignal.error()).toBe(testError);
      expect(asyncSignal.isError()).toBe(true);
    });

    it('should not retry if retryCount is 0', async () => {
      let attempts = 0;
      const testError = new Error('Failed');
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          attempts++;
          return Promise.reject(testError);
        },
        initialValue: null,
        retryCount: 0,
      });

      try {
        await asyncSignal.refetch();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBe(testError);
      }

      expect(attempts).toBe(1);
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccessSpy = jasmine.createSpy('onSuccess');
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('success'),
        initialValue: null,
        onSuccess: onSuccessSpy,
      });

      await asyncSignal.refetch();

      expect(onSuccessSpy).toHaveBeenCalledWith('success');
      expect(onSuccessSpy).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback', async () => {
      const testError = new Error('Failed');
      const onErrorSpy = jasmine.createSpy('onError');
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.reject(testError),
        initialValue: null,
        retryCount: 0,
        onError: onErrorSpy,
      });

      try {
        await asyncSignal.refetch();
      } catch {
        // Expected
      }

      expect(onErrorSpy).toHaveBeenCalledWith(testError);
      expect(onErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call onSuccess on error', async () => {
      const onSuccessSpy = jasmine.createSpy('onSuccess');
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.reject(new Error('Failed')),
        initialValue: null,
        retryCount: 0,
        onSuccess: onSuccessSpy,
      });

      try {
        await asyncSignal.refetch();
      } catch {
        // Expected
      }

      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    it('should cache results when cacheTime is set', async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve('cached');
        },
        initialValue: null,
        cacheTime: 1000,
      });

      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      expect(asyncSignal.data()).toBe('cached');
    });

    it('should invalidate cache', async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve(`data-${fetchCount}`);
        },
        initialValue: null,
        cacheTime: 1000,
      });

      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      asyncSignal.invalidate();
      await asyncSignal.refetch();
      expect(fetchCount).toBe(2);
    });

    it('should expire cache after cacheTime', fakeAsync(async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve('cached');
        },
        initialValue: null,
        cacheTime: 100,
      });

      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      tick(50);
      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      tick(50);
      await asyncSignal.refetch();
      expect(fetchCount).toBe(2);
    }));

    it('should not cache if cacheTime is 0', async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve('data');
        },
        initialValue: null,
        cacheTime: 0,
      });

      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      await asyncSignal.refetch();
      expect(fetchCount).toBe(2); // Should fetch again
    });
  });

  describe('race conditions', () => {
    it('should handle concurrent refetch calls', async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: async () => {
          fetchCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'data';
        },
        initialValue: null,
      });

      const promise1 = asyncSignal.refetch();
      const promise2 = asyncSignal.refetch();
      const promise3 = asyncSignal.refetch();

      await Promise.all([promise1, promise2, promise3]);

      expect(fetchCount).toBe(1);
      expect(asyncSignal.data()).toBe('data');
    });

    it('should handle refetch during ongoing fetch', async () => {
      let resolveFirstFetch: (value: string) => void;
      const firstPromise = new Promise<string>((resolve) => {
        resolveFirstFetch = resolve;
      });

      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: async () => {
          fetchCount++;
          if (fetchCount === 1) {
            return firstPromise;
          }
          return Promise.resolve('second');
        },
        initialValue: null,
      });

      const firstRefetch = asyncSignal.refetch();
      const secondRefetch = asyncSignal.refetch();

      resolveFirstFetch!('first');
      await firstRefetch;
      await secondRefetch;

      expect(asyncSignal.data()).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('success'),
        initialValue: 'initial',
      });

      await asyncSignal.refetch();
      expect(asyncSignal.data()).toBe('success');

      asyncSignal.reset();

      expect(asyncSignal.data()).toBe('initial');
      expect(asyncSignal.error()).toBeNull();
      expect(asyncSignal.loading()).toBe(false);
    });

    it('should clear cache on reset', async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve('data');
        },
        initialValue: null,
        cacheTime: 1000,
      });

      await asyncSignal.refetch();
      expect(fetchCount).toBe(1);

      asyncSignal.reset();

      await asyncSignal.refetch();
      expect(fetchCount).toBe(2);
    });
  });

  describe('mutate', () => {
    it('should optimistically update data', async () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('fetched'),
        initialValue: null,
      });

      await asyncSignal.refetch();
      expect(asyncSignal.data()).toBe('fetched');

      asyncSignal.mutate('optimistic');

      expect(asyncSignal.data()).toBe('optimistic');
      expect(asyncSignal.error()).toBeNull();
    });

    it('should update cache when mutating', async () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('original'),
        initialValue: null,
        cacheTime: 1000,
      });

      await asyncSignal.refetch();
      asyncSignal.mutate('mutated');
      asyncSignal.invalidate();
      await asyncSignal.refetch();

      expect(asyncSignal.data()).toBe('original');
    });
  });

  describe('autoFetch', () => {
    it('should auto-fetch on creation when autoFetch is true', fakeAsync(async () => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve('auto-fetched');
        },
        initialValue: null,
        autoFetch: true,
      });

      expect(fetchCount).toBe(0);
      expect(asyncSignal.loading()).toBe(false);

      tick(0);
      tick(10);

      expect(fetchCount).toBe(1);
      expect(asyncSignal.data()).toBe('auto-fetched');
      expect(asyncSignal.loading()).toBe(false);
      expect(asyncSignal.isSuccess()).toBe(true);
    }));

    it('should not auto-fetch when autoFetch is false', fakeAsync(() => {
      let fetchCount = 0;
      const asyncSignal = spAsync<string>({
        fetcher: () => {
          fetchCount++;
          return Promise.resolve('data');
        },
        initialValue: null,
        autoFetch: false,
      });

      tick(100);
      expect(fetchCount).toBe(0);
      expect(asyncSignal.data()).toBeNull();
    }));
  });

  describe('edge cases', () => {
    it('should handle null initial value', () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.resolve('data'),
        initialValue: null,
      });

      expect(asyncSignal.data()).toBeNull();
      expect(asyncSignal.isSuccess()).toBe(true); // null data but no error
    });

    it('should handle non-Error rejections', async () => {
      const asyncSignal = spAsync<string>({
        fetcher: () => Promise.reject('string error'),
        initialValue: null,
        retryCount: 0,
      });

      try {
        await asyncSignal.refetch();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('string error');
      }

      expect(asyncSignal.error()).toBeInstanceOf(Error);
    });

    it('should handle complex data types', async () => {
      interface ComplexData {
        id: number;
        items: string[];
        metadata: { count: number };
      }

      const complexData: ComplexData = {
        id: 1,
        items: ['a', 'b'],
        metadata: { count: 2 },
      };

      const asyncSignal = spAsync<ComplexData>({
        fetcher: () => Promise.resolve(complexData),
        initialValue: null,
      });

      await asyncSignal.refetch();

      expect(asyncSignal.data()).toEqual(complexData);
      expect(asyncSignal.data()?.id).toBe(1);
      expect(asyncSignal.data()?.items).toEqual(['a', 'b']);
    });
  });
});

