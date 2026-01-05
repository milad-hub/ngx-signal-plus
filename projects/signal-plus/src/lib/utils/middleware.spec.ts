import {
    MiddlewareContext,
    spAnalyticsMiddleware,
    spClearMiddleware,
    spGetMiddlewareCount,
    spLoggerMiddleware,
    spRemoveMiddleware,
    spRunMiddleware,
    spRunMiddlewareError,
    spUseMiddleware,
} from './middleware';

describe('Middleware System', () => {
    beforeEach(() => {
        spClearMiddleware();
    });

    afterEach(() => {
        spClearMiddleware();
    });

    describe('spUseMiddleware', () => {
        it('should register a middleware', () => {
            spUseMiddleware({ name: 'test' });
            expect(spGetMiddlewareCount()).toBe(1);
        });

        it('should not register duplicate middleware with same name', () => {
            spUseMiddleware({ name: 'test' });
            spUseMiddleware({ name: 'test' });
            expect(spGetMiddlewareCount()).toBe(1);
        });

        it('should register multiple middleware with different names', () => {
            spUseMiddleware({ name: 'test1' });
            spUseMiddleware({ name: 'test2' });
            expect(spGetMiddlewareCount()).toBe(2);
        });
    });

    describe('spRemoveMiddleware', () => {
        it('should remove a registered middleware', () => {
            spUseMiddleware({ name: 'test' });
            const result = spRemoveMiddleware('test');
            expect(result).toBe(true);
            expect(spGetMiddlewareCount()).toBe(0);
        });

        it('should return false when middleware not found', () => {
            const result = spRemoveMiddleware('nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('spClearMiddleware', () => {
        it('should clear all middleware', () => {
            spUseMiddleware({ name: 'test1' });
            spUseMiddleware({ name: 'test2' });
            spClearMiddleware();
            expect(spGetMiddlewareCount()).toBe(0);
        });
    });

    describe('spRunMiddleware', () => {
        it('should call onSet for all registered middleware', () => {
            const calls: MiddlewareContext[] = [];
            spUseMiddleware({
                name: 'test',
                onSet: (ctx) => calls.push(ctx),
            });
            const context: MiddlewareContext<number> = {
                signalName: 'counter',
                oldValue: 0,
                newValue: 1,
                timestamp: Date.now(),
            };
            spRunMiddleware(context);
            expect(calls.length).toBe(1);
            expect(calls[0].newValue).toBe(1);
        });

        it('should continue even if middleware throws', () => {
            const calls: number[] = [];
            spUseMiddleware({
                name: 'throws',
                onSet: () => {
                    throw new Error('Test error');
                },
            });
            spUseMiddleware({
                name: 'continues',
                onSet: () => calls.push(1),
            });
            spRunMiddleware({
                oldValue: 0,
                newValue: 1,
                timestamp: Date.now(),
            });
            expect(calls.length).toBe(1);
        });
    });

    describe('spRunMiddlewareError', () => {
        it('should call onError for all registered middleware', () => {
            const errors: Error[] = [];
            spUseMiddleware({
                name: 'test',
                onError: (error) => errors.push(error),
            });
            const error = new Error('Test error');
            spRunMiddlewareError(error, {
                oldValue: 0,
                newValue: 1,
                timestamp: Date.now(),
            });
            expect(errors.length).toBe(1);
            expect(errors[0].message).toBe('Test error');
        });
    });

    describe('spLoggerMiddleware', () => {
        it('should create a logger middleware with default prefix', () => {
            const middleware = spLoggerMiddleware();
            expect(middleware.name).toBe('sp-logger');
            expect(middleware.onSet).toBeDefined();
            expect(middleware.onError).toBeDefined();
        });

        it('should create a logger middleware with custom prefix', () => {
            const middleware = spLoggerMiddleware('[DEBUG]');
            expect(middleware.name).toBe('sp-logger');
        });
    });

    describe('spAnalyticsMiddleware', () => {
        it('should create an analytics middleware', () => {
            const events: unknown[] = [];
            const middleware = spAnalyticsMiddleware((event) => events.push(event));
            expect(middleware.name).toBe('sp-analytics');
            spUseMiddleware(middleware);
            spRunMiddleware({
                signalName: 'test',
                oldValue: 0,
                newValue: 1,
                timestamp: 1234567890,
            });
            expect(events.length).toBe(1);
            expect(events[0]).toEqual({
                name: 'test',
                oldValue: 0,
                newValue: 1,
                timestamp: 1234567890,
            });
        });
    });
});