/**
 * Middleware system for intercepting signal operations.
 */

import {
  MiddlewareContext,
  SignalMiddleware,
} from '../models/middleware.model';
import { SignalPlusScope, _resolveScope } from '../core/scope';

export function spUseMiddleware<T = unknown>(
  middleware: SignalMiddleware<T>,
): void {
  const registry = _resolveScope().middleware;
  if (!registry.some((m) => m.name === middleware.name)) {
    registry.push(middleware as SignalMiddleware);
  }
}

export function spRemoveMiddleware(name: string): boolean {
  const registry = _resolveScope().middleware;
  const index = registry.findIndex((m) => m.name === name);
  if (index === -1) return false;
  registry.splice(index, 1);
  return true;
}

export function spClearMiddleware(): void {
  _resolveScope().middleware.length = 0;
}

export function spGetMiddlewareCount(): number {
  return _resolveScope().middleware.length;
}

export function spRunMiddleware<T>(
  context: MiddlewareContext<T>,
  scope?: SignalPlusScope,
): void {
  for (const m of (scope ?? _resolveScope()).middleware) {
    try {
      m.onSet?.(context as MiddlewareContext);
    } catch {
      /* ignore */
    }
  }
}

export function spRunMiddlewareError<T>(
  error: Error,
  context: MiddlewareContext<T>,
  scope?: SignalPlusScope,
): void {
  for (const m of (scope ?? _resolveScope()).middleware) {
    try {
      m.onError?.(error, context as MiddlewareContext);
    } catch {
      /* ignore */
    }
  }
}

export function spLoggerMiddleware(prefix = '[Signal]'): SignalMiddleware {
  return {
    name: 'sp-logger',
    onSet: (ctx) =>
      console.log(
        `${prefix} ${ctx.signalName || 'signal'}: ${JSON.stringify(ctx.oldValue)} -> ${JSON.stringify(ctx.newValue)}`,
      ),
    onError: (error, ctx) =>
      console.error(
        `${prefix} Error in ${ctx.signalName || 'signal'}:`,
        error.message,
      ),
  };
}

export function spAnalyticsMiddleware(
  tracker: (event: {
    name: string;
    oldValue: unknown;
    newValue: unknown;
    timestamp: number;
  }) => void,
): SignalMiddleware {
  return {
    name: 'sp-analytics',
    onSet: (ctx) =>
      tracker({
        name: ctx.signalName || 'unknown',
        oldValue: ctx.oldValue,
        newValue: ctx.newValue,
        timestamp: ctx.timestamp,
      }),
  };
}
