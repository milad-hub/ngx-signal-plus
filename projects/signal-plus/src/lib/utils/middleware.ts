/**
 * Middleware system for intercepting signal operations.
 */

export interface MiddlewareContext<T = unknown> {
    signalName?: string;
    oldValue: T;
    newValue: T;
    timestamp: number;
}

export interface SignalMiddleware<T = unknown> {
    name: string;
    onSet?: (context: MiddlewareContext<T>) => void;
    onError?: (error: Error, context: MiddlewareContext<T>) => void;
}

const middlewareRegistry: SignalMiddleware[] = [];

export function spUseMiddleware<T = unknown>(
    middleware: SignalMiddleware<T>,
): void {
    if (!middlewareRegistry.some((m) => m.name === middleware.name)) {
        middlewareRegistry.push(middleware as SignalMiddleware);
    }
}

export function spRemoveMiddleware(name: string): boolean {
    const index = middlewareRegistry.findIndex((m) => m.name === name);
    if (index === -1) return false;
    middlewareRegistry.splice(index, 1);
    return true;
}

export function spClearMiddleware(): void {
    middlewareRegistry.length = 0;
}

export function spGetMiddlewareCount(): number {
    return middlewareRegistry.length;
}

export function spRunMiddleware<T>(context: MiddlewareContext<T>): void {
    for (const m of middlewareRegistry) {
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
): void {
    for (const m of middlewareRegistry) {
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
