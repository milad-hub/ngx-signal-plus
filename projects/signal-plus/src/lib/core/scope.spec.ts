import {
  EnvironmentInjector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SignalPlus } from '../models';
import {
  getGlobalQueryClient,
  setGlobalQueryClient,
} from '../reactive-queries/global-query-client';
import { QueryClient } from '../reactive-queries/query-client';
import { sp } from '../utils/create';
import {
  spClearMiddleware,
  spGetMiddlewareCount,
  spUseMiddleware,
} from '../utils/middleware';
import {
  _resetTransactionState,
  spBatch,
  spIsInBatch,
  spIsInTransaction,
  spIsTransactionActive,
  spTransaction,
} from '../utils/transactions';
import {
  SignalPlusScope,
  _getModuleScope,
  _resolveScope,
  provideSignalPlus,
} from './scope';

describe('injector-scoped library state', () => {
  let requestA: EnvironmentInjector;
  let requestB: EnvironmentInjector;

  // Two live injectors at once, which is what one Node process serving two
  // concurrent SSR requests actually looks like
  beforeEach(() => {
    TestBed.configureTestingModule({});
    const parent = TestBed.inject(EnvironmentInjector);
    requestA = createEnvironmentInjector([provideSignalPlus()], parent);
    requestB = createEnvironmentInjector([provideSignalPlus()], parent);
  });

  afterEach(() => {
    requestA.destroy();
    requestB.destroy();
    _resetTransactionState(_getModuleScope());
    _getModuleScope().middleware.length = 0;
  });

  it('gives each injector its own scope', () => {
    const scopeA = _resolveScope(requestA);
    const scopeB = _resolveScope(requestB);

    expect(scopeA).toBeInstanceOf(SignalPlusScope);
    expect(scopeB).toBeInstanceOf(SignalPlusScope);
    expect(scopeA).not.toBe(scopeB);
    expect(scopeA).not.toBe(_getModuleScope());
    expect(scopeB).not.toBe(_getModuleScope());
  });

  it('applies the provider default query options to the scope client', () => {
    const parent = TestBed.inject(EnvironmentInjector);
    const configured = createEnvironmentInjector(
      [provideSignalPlus({ defaultQueryOptions: { staleTime: 4321 } })],
      parent,
    );

    try {
      const client = runInInjectionContext(configured, () =>
        getGlobalQueryClient(),
      );

      expect(client.getDefaultOptions().staleTime).toBe(4321);
      expect(_resolveScope(requestA).queryClient.getDefaultOptions().staleTime)
        .withContext('an unconfigured scope keeps the built-in default')
        .toBe(0);
    } finally {
      configured.destroy();
    }
  });

  it('reports batch membership per scope with and without a signal', () => {
    const counter: SignalPlus<number> = runInInjectionContext(requestA, () =>
      sp(0).build(),
    );

    expect(spIsInBatch()).toBe(false);
    expect(spIsInBatch(counter)).toBe(false);

    runInInjectionContext(requestA, () =>
      spBatch(() => {
        expect(spIsInBatch()).toBe(true);
        expect(spIsInBatch(counter)).toBe(true);
        expect(runInInjectionContext(requestB, () => spIsInBatch())).toBe(
          false,
        );
      }),
    );

    expect(spIsInBatch()).toBe(false);
  });

  it('holds independent query caches per injector', () => {
    const clientA = runInInjectionContext(requestA, () =>
      getGlobalQueryClient(),
    );
    const clientB = runInInjectionContext(requestB, () =>
      getGlobalQueryClient(),
    );

    clientA.setQueryData(['scoped', 'user'], 'from-a');

    expect(clientA).not.toBe(clientB);
    expect(clientA.getQueryData(['scoped', 'user'])).toBe('from-a');
    expect(clientB.getQueryData(['scoped', 'user'])).toBeUndefined();
  });

  it('isolates middleware per injector', () => {
    runInInjectionContext(requestA, () => {
      spUseMiddleware({ name: 'scoped-a' });
      expect(spGetMiddlewareCount()).toBe(1);
    });

    expect(runInInjectionContext(requestB, () => spGetMiddlewareCount())).toBe(
      0,
    );
    expect(spGetMiddlewareCount()).toBe(0);
  });

  it('does not let one injector observe another injector transaction', () => {
    const scopeA = _resolveScope(requestA);
    const scopeB = _resolveScope(requestB);

    runInInjectionContext(requestA, () => {
      spTransaction(() => {
        expect(spIsTransactionActive()).toBe(true);
        expect(scopeA.transaction.active).toBe(true);
        expect(scopeB.transaction.active).toBe(false);
        expect(_getModuleScope().transaction.active).toBe(false);
      });
    });

    expect(scopeA.transaction.active).toBe(false);
    expect(runInInjectionContext(requestB, () => spIsTransactionActive())).toBe(
      false,
    );
  });

  it('runs concurrent transactions in two injectors without interference', () => {
    const counterA: SignalPlus<number> = runInInjectionContext(requestA, () =>
      sp(1).build(),
    );
    const counterB: SignalPlus<number> = runInInjectionContext(requestB, () =>
      sp(1).build(),
    );

    runInInjectionContext(requestA, () => {
      spTransaction(() => {
        counterA.setValue(5);
        expect(spIsInTransaction(counterA)).toBe(true);
        expect(spIsInTransaction(counterB)).toBe(false);
      });
    });

    expect(counterA.value).toBe(5);
    expect(counterB.value).toBe(1);
  });

  it('rolls back only the signals belonging to the failing injector', () => {
    const counterA: SignalPlus<number> = runInInjectionContext(requestA, () =>
      sp(1).build(),
    );
    const counterB: SignalPlus<number> = runInInjectionContext(requestB, () =>
      sp(1).build(),
    );

    expect(() =>
      runInInjectionContext(requestA, () =>
        spTransaction(() => {
          counterA.setValue(10);
          counterB.setValue(10);
          throw new Error('boom');
        }),
      ),
    ).toThrow();

    expect(counterA.value).toBe(1);
    expect(counterB.value).toBe(10);
  });

  describe('module fallback', () => {
    it('resolves the module scope outside any injection context', () => {
      expect(_resolveScope()).toBe(_getModuleScope());
    });

    it('resolves the module scope when no provider is present', () => {
      const bare = TestBed.inject(EnvironmentInjector);

      expect(_resolveScope(bare)).toBe(_getModuleScope());
      expect(runInInjectionContext(bare, () => _resolveScope())).toBe(
        _getModuleScope(),
      );
    });

    it('keeps middleware global when registered outside an injector', () => {
      spUseMiddleware({ name: 'fallback-only' });

      expect(spGetMiddlewareCount()).toBe(1);
      expect(_getModuleScope().middleware.length).toBe(1);

      spClearMiddleware();
      expect(spGetMiddlewareCount()).toBe(0);
    });

    it('keeps setGlobalQueryClient pointed at the module scope', () => {
      const original = getGlobalQueryClient();
      const replacement = new QueryClient();
      setGlobalQueryClient(replacement);

      expect(getGlobalQueryClient()).toBe(replacement);
      expect(_getModuleScope().queryClient).toBe(replacement);

      setGlobalQueryClient(original);
    });

    it('tracks a fallback transaction against a signal built in an injector', () => {
      const counter: SignalPlus<number> = runInInjectionContext(requestA, () =>
        sp(0).build(),
      );

      spTransaction(() => {
        counter.setValue(7);
        expect(spIsInTransaction(counter)).toBe(true);
      });

      expect(counter.value).toBe(7);
    });
  });
});
