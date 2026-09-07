/**
 * @fileoverview Scope-aware access to the QueryClient
 * @description
 * These two functions used to read and write a module-level variable, which
 * under server-side rendering meant one cache shared by every request. They now
 * resolve the current {@link SignalPlusScope}: the one provided by
 * `provideSignalPlus()` when the call site can reach an injector, and the
 * module-level fallback otherwise.
 */

import { _resolveScope } from '../core/scope';
import { QueryClient } from './query-client';

/**
 * Gets the QueryClient for the current scope, creating one if needed.
 *
 * @returns The scope's QueryClient
 *
 * @remarks
 * Inside an injection context that can reach `provideSignalPlus()`, this is that
 * injector's client — one per request under SSR. Everywhere else it is the
 * module-level client, which is shared by the whole process.
 */
export function getGlobalQueryClient(): QueryClient {
  return _resolveScope().queryClient;
}

/**
 * Sets the QueryClient for the current scope.
 *
 * @param client - QueryClient to use
 *
 * @remarks
 * Called outside an injection context this replaces the module-level client,
 * which one Node process shares across every SSR request. Treat it as
 * browser-only; under SSR configure the client through `provideSignalPlus()`
 * instead, so each request gets its own.
 *
 * @example
 * ```typescript
 * const queryClient = new QueryClient({
 *   defaultOptions: { staleTime: 5000, retry: 3 }
 * });
 * setGlobalQueryClient(queryClient);
 * ```
 */
export function setGlobalQueryClient(client: QueryClient): void {
  _resolveScope().setQueryClient(client);
}
