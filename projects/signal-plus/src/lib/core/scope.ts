/**
 * @fileoverview Injector-scoped container for the library's shared state
 * @description
 * The query client, the middleware registry and the transaction and batch
 * contexts were module-level singletons. Under server-side rendering one Node
 * process serves every request, so a singleton is shared by every user: cached
 * query data crosses requests, a middleware registered by one request applies
 * to all of them, and two concurrent requests share one transaction flag.
 *
 * `provideSignalPlus()` binds one `SignalPlusScope` to an environment injector,
 * which under SSR means one per request. It is opt-in: without it every entry
 * point resolves the module-level fallback and behaves exactly as before, so
 * callers outside an injection context keep working.
 *
 * @example
 * ```typescript
 * bootstrapApplication(AppComponent, {
 *   providers: [provideSignalPlus()],
 * });
 * ```
 */

import {
  EnvironmentProviders,
  Injector,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { SignalMiddleware } from '../models/middleware.model';
import { SignalPlus } from '../models/signal-plus.model';
import {
  BatchContext,
  ScopedTransactionContext,
} from '../models/transactions.models';
import { QueryClient } from '../reactive-queries/query-client';
import { QueryOptions } from '../reactive-queries/query-types';

/**
 * Options accepted by {@link provideSignalPlus}
 */
export interface SignalPlusScopeOptions {
  /** Default query options for the scope's own QueryClient */
  defaultQueryOptions?: Partial<QueryOptions>;
}

/**
 * Holds every piece of state the library shares between call sites
 *
 * @remarks
 * One instance per environment injector when {@link provideSignalPlus} is used,
 * plus one module-level instance that every non-DI caller resolves.
 */
export class SignalPlusScope {
  readonly middleware: SignalMiddleware[] = [];

  readonly transaction: ScopedTransactionContext = {
    active: false,
    originalValues: new Map(),
    patchedSignals: new Map(),
    modifiedSignals: [],
    modifiedSet: new Set(),
    snapshots: new Map(),
    attemptedValues: new Map(),
    startTime: null,
  };

  readonly batch: BatchContext = {
    active: false,
    flushing: false,
    signals: new Set(),
    pending: new Map(),
  };

  private client: QueryClient | null = null;

  constructor(private readonly options: SignalPlusScopeOptions = {}) {}

  /**
   * The scope's QueryClient, created on first use
   */
  get queryClient(): QueryClient {
    if (!this.client) {
      this.client = new QueryClient(
        this.options.defaultQueryOptions
          ? { defaultOptions: this.options.defaultQueryOptions }
          : {},
      );
    }
    return this.client;
  }

  /**
   * Replaces the scope's QueryClient
   */
  setQueryClient(client: QueryClient): void {
    this.client = client;
  }
}

const moduleScope = new SignalPlusScope();

/**
 * The module-level fallback scope
 *
 * @returns The scope every caller outside a provided injector resolves
 * @remarks
 * Shared by the whole process, so it is browser-only in any honest sense. Under
 * SSR use {@link provideSignalPlus} so each request gets its own.
 */
export function _getModuleScope(): SignalPlusScope {
  return moduleScope;
}

/**
 * Provides one SignalPlusScope for an environment injector
 *
 * @param options Optional configuration for the scope's QueryClient
 * @returns Environment providers to add to `bootstrapApplication` or a route
 *
 * @example
 * ```typescript
 * bootstrapApplication(AppComponent, {
 *   providers: [provideSignalPlus({ defaultQueryOptions: { staleTime: 5000 } })],
 * });
 * ```
 */
export function provideSignalPlus(
  options: SignalPlusScopeOptions = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SignalPlusScope,
      useFactory: () => new SignalPlusScope(options),
    },
  ]);
}

/**
 * Resolves the scope for the current call site
 *
 * @param injector Optional injector to resolve from instead of the ambient one
 * @returns The provided scope when one is reachable, otherwise the module fallback
 * @internal
 */
export function _resolveScope(injector?: Injector | null): SignalPlusScope {
  if (injector) {
    return injector.get(SignalPlusScope, moduleScope);
  }

  try {
    return inject(SignalPlusScope, { optional: true }) ?? moduleScope;
  } catch {
    return moduleScope;
  }
}

/**
 * Resolves the scope that owns a signal's shared state
 *
 * @param signal The signal being written or notified
 * @param isActive Predicate selecting the state that must be active
 * @returns The signal's own scope when it holds the active state, else the fallback
 * @internal
 * @remarks
 * A write path has no injection context, so the scope captured when the signal
 * was built is the only one it knows. The module fallback is consulted second
 * so that a transaction or batch opened outside an injection context still sees
 * writes to signals built inside one, which is how the library behaved before
 * scopes existed.
 */
export function _scopeForSignal<T>(
  signal: SignalPlus<T>,
  isActive: (scope: SignalPlusScope) => boolean,
): SignalPlusScope {
  const own = signal._scope;

  if (own && isActive(own)) {
    return own;
  }

  if (isActive(moduleScope)) {
    return moduleScope;
  }

  return own ?? moduleScope;
}
