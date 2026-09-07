import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Query } from './query-cache';
import { QueryObserver, QueryOptions, QueryState } from './query-types';

describe('query state machine', () => {
  const record = <T>(query: Query<T>): QueryState<T>[] => {
    const seen: QueryState<T>[] = [];
    const observer: QueryObserver<T> = {
      options: { queryKey: ['probe'], queryFn: async () => undefined as T },
      onStateUpdate: (state: QueryState<T>) => seen.push(state),
    };
    query.subscribe(observer);
    return seen;
  };

  const exclusiveCount = (state: QueryState<unknown>): number =>
    [state.isIdle, state.isLoading, state.isSuccess, state.isError].filter(
      Boolean,
    ).length;

  const options = <T>(over: Partial<QueryOptions<T>> = {}): QueryOptions<T> =>
    ({
      queryKey: ['state-machine'],
      queryFn: async () => 'value' as unknown as T,
      retry: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...over,
    }) as QueryOptions<T>;

  describe('exclusivity', () => {
    it('reports exactly one status at construction', () => {
      const query = new Query<string>(['state-machine'], options<string>());
      const state = query.getState();

      expect(exclusiveCount(state)).toBe(1);
      expect(state.isIdle).toBe(true);
    });

    it('never reports two statuses together across a full lifecycle', fakeAsync(() => {
      const query = new Query<string>(['state-machine'], options<string>());
      const seen = record(query);

      flushMicrotasks();
      query.refetch().catch(() => undefined);
      flushMicrotasks();

      expect(seen.length).toBeGreaterThan(1);
      seen.forEach((state, index) => {
        expect(exclusiveCount(state))
          .withContext(`notification ${index} reported two statuses at once`)
          .toBe(1);
      });
    }));

    it('leaves idle for good once a fetch has started', fakeAsync(() => {
      const query = new Query<string>(['state-machine'], options<string>());

      query.refetch().catch(() => undefined);
      flushMicrotasks();

      expect(query.getState().isIdle).toBe(false);
      expect(query.getState().isSuccess).toBe(true);
    }));

    it('clears isSuccess when a refetch fails after a success', fakeAsync(() => {
      let shouldFail = false;
      const query = new Query<string>(
        ['state-machine'],
        options<string>({
          queryFn: async () => {
            if (shouldFail) {
              throw new Error('refetch failed');
            }
            return 'first';
          },
        }),
      );

      query.refetch().catch(() => undefined);
      flushMicrotasks();
      expect(query.getState().isSuccess).toBe(true);

      shouldFail = true;
      query.refetch().catch(() => undefined);
      flushMicrotasks();

      const state = query.getState();
      expect(state.isError).toBe(true);
      expect(state.isSuccess).toBe(false);
      expect(state.isIdle).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(exclusiveCount(state)).toBe(1);
    }));

    it('clears isError when a later fetch succeeds', fakeAsync(() => {
      let shouldFail = true;
      const query = new Query<string>(
        ['state-machine'],
        options<string>({
          queryFn: async () => {
            if (shouldFail) {
              throw new Error('first attempt failed');
            }
            return 'recovered';
          },
        }),
      );

      query.refetch().catch(() => undefined);
      flushMicrotasks();
      expect(query.getState().isError).toBe(true);

      shouldFail = false;
      query.refetch().catch(() => undefined);
      flushMicrotasks();

      const state = query.getState();
      expect(state.isSuccess).toBe(true);
      expect(state.isError).toBe(false);
      expect(state.error).toBeNull();
      expect(exclusiveCount(state)).toBe(1);
    }));

    it('stays successful while a background refetch is in flight', fakeAsync(() => {
      const query = new Query<string>(['state-machine'], options<string>());

      query.refetch().catch(() => undefined);
      flushMicrotasks();

      const seen = record(query);
      query.refetch().catch(() => undefined);

      const fetching = seen.find((state) => state.isFetching);
      expect(fetching).toBeDefined();
      expect(fetching?.isSuccess).toBe(true);
      expect(fetching?.isLoading).toBe(false);
      expect(exclusiveCount(fetching as QueryState<string>)).toBe(1);

      flushMicrotasks();
    }));
  });

  describe('initialData', () => {
    it('reports a seeded query as successful rather than idle', () => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ initialData: 'seed' }),
      );
      const state = query.getState();

      expect(state.data).toBe('seed');
      expect(state.isSuccess).toBe(true);
      expect(state.isIdle).toBe(false);
      expect(state.isError).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(exclusiveCount(state)).toBe(1);
    });

    it('keeps seeded data stale so it still refetches', () => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ initialData: 'seed' }),
      );

      expect(query.getState().isStale).toBe(true);
    });

    it('does not report loading for a seeded query that is refetching', fakeAsync(() => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ initialData: 'seed' }),
      );
      const seen = record(query);

      query.refetch().catch(() => undefined);

      const fetching = seen.find((state) => state.isFetching);
      expect(fetching?.isLoading).toBe(false);

      flushMicrotasks();
    }));
  });

  describe('staleness notification', () => {
    it('reschedules staleness when data is written straight into the cache', fakeAsync(() => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ staleTime: 100 }),
      );
      const seen = record(query);
      flushMicrotasks();
      seen.length = 0;

      expect(query.getState().isStale).toBe(false);

      tick(60);
      query.setOptimisticData('written directly');
      expect(seen[seen.length - 1].isStale).toBe(false);

      // The fetch scheduled staleness for t=100. The direct write moved
      // dataUpdatedAt to t=60, so the entry must stay fresh until t=160.
      tick(50);
      expect(seen[seen.length - 1].isStale)
        .withContext('data written 110ms ago went stale on the old deadline')
        .toBe(false);
      expect(query.getState().isStale).toBe(false);

      tick(50);
      expect(seen[seen.length - 1].isStale)
        .withContext('the stale transition never reached the observer')
        .toBe(true);
      expect(query.getState().isStale).toBe(true);

      flushMicrotasks();
    }));

    it('does not let reading the query swallow a later transition', fakeAsync(() => {
      // staleTime 0 schedules no timer, so elapsed staleness is reported by
      // getState() alone. A getter that wrote its finding back would leave the
      // stored state already stale, and the next real transition to stale would
      // then be a no-op that notifies nobody.
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ staleTime: 0 }),
      );

      query.refetch().catch(() => undefined);
      flushMicrotasks();
      expect(query.getState().isStale).toBe(false);

      const seen = record(query);
      tick(5);

      expect(query.getState().isStale)
        .withContext('elapsed staleness should be reported on read')
        .toBe(true);

      // subscribe() hands a new observer the stored state verbatim, so it is
      // the way to see whether the read above wrote its finding back
      const probe: QueryState<string>[] = [];
      query.subscribe({
        options: { queryKey: ['probe'], queryFn: async () => 'value' },
        onStateUpdate: (state: QueryState<string>) => probe.push(state),
      });

      expect(probe[0].isStale)
        .withContext('getState() wrote its stale finding into the stored state')
        .toBe(false);

      seen.length = 0;
      query.invalidate();

      expect(seen.length)
        .withContext('reading the query consumed the transition to stale')
        .toBeGreaterThan(0);
      expect(seen[seen.length - 1].isStale).toBe(true);

      flushMicrotasks();
    }));

    it('refetches for a new subscriber when the data has aged out', fakeAsync(() => {
      // staleTime 0 is the QueryClient default and schedules no timer, so the
      // only thing that can tell a new subscriber the data has aged out is the
      // derived staleness. Reading the raw flag here would leave every default
      // query permanently fresh after its first fetch.
      let fetches = 0;
      const query = new Query<string>(
        ['state-machine'],
        options<string>({
          staleTime: 0,
          queryFn: async () => {
            fetches++;
            return 'value';
          },
        }),
      );

      query.refetch().catch(() => undefined);
      flushMicrotasks();
      expect(fetches).toBe(1);

      tick(5);
      record(query);
      flushMicrotasks();

      expect(fetches)
        .withContext('a new subscriber did not refetch aged-out data')
        .toBe(2);
    }));

    it('does not refetch for a new subscriber while the data is still fresh', fakeAsync(() => {
      let fetches = 0;
      const query = new Query<string>(
        ['state-machine'],
        options<string>({
          staleTime: 1000,
          queryFn: async () => {
            fetches++;
            return 'value';
          },
        }),
      );

      query.refetch().catch(() => undefined);
      flushMicrotasks();
      expect(fetches).toBe(1);

      tick(5);
      record(query);
      flushMicrotasks();

      expect(fetches)
        .withContext('a new subscriber refetched data that was still fresh')
        .toBe(1);

      tick(1000);
    }));

    it('reports the same staleness to a reader and an observer', fakeAsync(() => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ staleTime: 40 }),
      );
      const seen = record(query);
      flushMicrotasks();

      tick(40);

      expect(query.getState().isStale).toBe(true);
      expect(seen[seen.length - 1].isStale).toBe(true);

      flushMicrotasks();
    }));

    it('reports staleness through getState for an entry with no timer', () => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ staleTime: 0 }),
      );

      query.setOptimisticData('written directly');
      const state = query.getState();

      expect(state.data).toBe('written directly');
      expect(state.isSuccess).toBe(true);
    });
  });

  describe('notification', () => {
    it('notifies on every state change', fakeAsync(() => {
      const query = new Query<string>(
        ['state-machine'],
        options<string>({ staleTime: 100 }),
      );
      const seen = record(query);
      flushMicrotasks();
      seen.length = 0;

      expect(query.getState().isStale).toBe(false);

      query.invalidate();

      expect(seen.length).toBeGreaterThan(0);
      expect(seen[seen.length - 1].isStale).toBe(true);

      flushMicrotasks();
    }));

    it('does not notify when a transition changes nothing', fakeAsync(() => {
      const query = new Query<string>(['state-machine'], options<string>());
      const seen = record(query);

      flushMicrotasks();
      seen.length = 0;

      query.invalidate();
      const afterFirst = seen.length;
      query.invalidate();

      expect(seen.length)
        .withContext('a no-op transition notified observers')
        .toBe(afterFirst);

      flushMicrotasks();
    }));
  });
});
