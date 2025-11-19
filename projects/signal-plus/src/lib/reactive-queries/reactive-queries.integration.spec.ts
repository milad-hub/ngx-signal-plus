import { computed, signal } from '@angular/core';
import { QueryClient, setGlobalQueryClient } from './query-client';
import { createMutation, spMutation } from './sp-mutation';
import { createQuery, spQuery } from './sp-query';

describe('Reactive Queries Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    setGlobalQueryClient(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should integrate query and mutation with invalidation', (done) => {
    let userData = { id: 1, name: 'John' };
    let updateCount = 0;
    const userQuery = spQuery({
      queryKey: ['user', '1'],
      queryFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...userData };
      },
    });
    const updateMutation = spMutation({
      mutationFn: async (newName: string) => {
        updateCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        userData = { ...userData, name: newName };
        return { ...userData };
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['user', '1']);
      },
    });
    setTimeout(async () => {
      expect(userQuery.data()).toEqual({ id: 1, name: 'John' });
      expect(userQuery.isSuccess()).toBe(true);
      await updateMutation.mutate('Jane');
      expect(updateMutation.isSuccess()).toBe(true);
      expect(updateMutation.data()).toEqual({ id: 1, name: 'Jane' });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(userQuery.data()).toEqual({ id: 1, name: 'Jane' });
      expect(updateCount).toBe(1);
      done();
    }, 50);
  });

  it('should handle dependent queries', (done) => {
    const userIdSignal = signal<number | null>(null);
    const userQuery = spQuery({
      queryKey: ['user', userIdSignal()?.toString() || 'null'],
      queryFn: async () => {
        const userId = userIdSignal();
        if (!userId) throw new Error('No user ID');
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { id: userId, name: `User ${userId}` };
      },
      enabled: computed(() => !!userIdSignal()),
    });
    const postsQuery = spQuery({
      queryKey: ['posts', userQuery.data()?.id?.toString() || 'null'],
      queryFn: async () => {
        const user = userQuery.data();
        if (!user) throw new Error('No user');
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [
          { id: 1, userId: user.id, title: 'Post 1' },
          { id: 2, userId: user.id, title: 'Post 2' },
        ];
      },
      enabled: computed(() => !!userQuery.data()),
    });
    setTimeout(() => {
      expect(userQuery.isIdle()).toBe(true);
      expect(postsQuery.isIdle()).toBe(true);
      userIdSignal.set(1);
      setTimeout(() => {
        expect(userQuery.data()).toEqual({ id: 1, name: 'User 1' });
        expect(userQuery.isSuccess()).toBe(true);
        expect(postsQuery.data()).toEqual([
          { id: 1, userId: 1, title: 'Post 1' },
          { id: 2, userId: 1, title: 'Post 2' },
        ]);
        expect(postsQuery.isSuccess()).toBe(true);
        done();
      }, 100);
    }, 50);
  });

  it('should handle concurrent mutations', (done) => {
    let data = { value: 0 };
    let mutationCount = 0;
    const incrementMutation = spMutation({
      mutationFn: async (increment: number) => {
        mutationCount++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        data = { value: data.value + increment };
        return { ...data };
      },
    });
    const promises = [
      incrementMutation.mutate(1),
      incrementMutation.mutate(2),
      incrementMutation.mutate(3),
    ];
    Promise.all(promises).then((results) => {
      expect(mutationCount).toBe(1);
      expect(results[0]).toEqual({ value: 1 });
      expect(results[1]).toEqual({ value: 1 });
      expect(results[2]).toEqual({ value: 1 });
      done();
    });
  });

  it('should support optimistic updates via onMutate and refetch on success', (done) => {
    let user = { id: 1, name: 'John' };
    const userQuery = spQuery({
      queryKey: ['user', '1'],
      queryFn: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return { ...user };
      },
      staleTime: 1000,
    });
    const updateMutation = spMutation({
      mutationFn: async (newName: string) => {
        await new Promise((r) => setTimeout(r, 20));
        user = { ...user, name: newName };
        return { ...user };
      },
      onMutate: (newName: string) => {
        queryClient.setQueryData(
          ['user', '1'],
          (prev: { id: number; name: string } | undefined) => ({ id: (prev?.id ?? 1), name: newName }),
          true,
        );
      },
      onSuccess: () => {
        queryClient.refetchQueries(['user', '1']);
      },
    });
    setTimeout(async () => {
      expect(userQuery.data()).toEqual({ id: 1, name: 'John' });
      const p = updateMutation.mutate('Jane');
      setTimeout(() => {
        expect(userQuery.data()).toEqual({ id: 1, name: 'Jane' });
      }, 5);
      await p;
      setTimeout(() => {
        expect(userQuery.data()).toEqual({ id: 1, name: 'Jane' });
        done();
      }, 30);
    }, 50);
  });

  it('should handle many queries with global invalidate and refetch', (done) => {
    const TOTAL = 25;
    const calls: number[] = Array.from({ length: TOTAL }, () => 0);
    const queries = Array.from({ length: TOTAL }, (_, i) =>
      spQuery({
        queryKey: ['bulk', i.toString()],
        queryFn: async () => {
          calls[i]++;
          return { id: i, count: calls[i] };
        },
      }),
    );
    setTimeout(() => {
      for (let i = 0; i < TOTAL; i++) {
        expect(queries[i].data()).toEqual({ id: i, count: 1 });
      }
      queryClient.invalidateQueries();
      setTimeout(() => {
        for (let i = 0; i < TOTAL; i++) {
          expect(calls[i]).toBeGreaterThanOrEqual(2);
        }
        done();
      }, 150);
    }, 100);
  });

  it('should work with createQuery and createMutation helpers', (done) => {
    const testData = { id: 1, name: 'Test' };
    const query = createQuery(
      ['helper-query'],
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return testData;
      },
      {
        staleTime: 5000,
      },
    );
    const mutation = createMutation(
      async (newName: string) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...testData, name: newName };
      },
      {
        retry: 2,
      },
    );
    setTimeout(async () => {
      expect(query.data()).toEqual(testData);
      expect(query.isSuccess()).toBe(true);
      await mutation.mutate('Updated');
      expect(mutation.isSuccess()).toBe(true);
      expect(mutation.data()).toEqual({ id: 1, name: 'Updated' });
      done();
    }, 50);
  });

  it('should handle error recovery with retry', (done) => {
    let attempts = 0;
    let shouldFail = true;
    const query = spQuery({
      queryKey: ['retry-recovery'],
      queryFn: async () => {
        attempts++;
        if (shouldFail) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return { success: true, attempts };
      },
      retry: 3,
      retryDelay: 10,
    });
    setTimeout(() => {
      expect(query.isError()).toBe(true);
      expect(attempts).toBe(4);
      shouldFail = false;
      attempts = 0;
      query.refetch().then(() => {
        expect(query.isSuccess()).toBe(true);
        expect(query.data()).toEqual({ success: true, attempts: 1 });
        done();
      });
    }, 200);
  });

  it('should handle query cancellation', (done) => {
    const query = spQuery({
      queryKey: ['cancellation'],
      queryFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { completed: true };
      },
    });
    const startTime = Date.now();
    setTimeout(() => {
      queryClient.cancelQueries(['cancellation']);
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(200);
        expect(query.isFetching()).toBe(false);
        done();
      }, 100);
    }, 50);
  });
});