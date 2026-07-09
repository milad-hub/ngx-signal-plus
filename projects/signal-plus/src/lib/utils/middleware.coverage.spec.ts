import { MiddlewareContext } from '../models/middleware.model';
import { spAnalyticsMiddleware, spLoggerMiddleware } from './middleware';

function makeContext(signalName?: string): MiddlewareContext {
  return { signalName, oldValue: 1, newValue: 2, timestamp: 123 };
}

describe('built-in middleware behavior', () => {
  it('should log set operations with the signal name', () => {
    const logSpy = spyOn(console, 'log');
    spLoggerMiddleware().onSet?.(makeContext('counter'));
    expect(logSpy).toHaveBeenCalledWith('[Signal] counter: 1 -> 2');
  });

  it('should log set operations with a fallback name', () => {
    const logSpy = spyOn(console, 'log');
    spLoggerMiddleware('[Custom]').onSet?.(makeContext());
    expect(logSpy).toHaveBeenCalledWith('[Custom] signal: 1 -> 2');
  });

  it('should log errors with the signal name', () => {
    const errorSpy = spyOn(console, 'error');
    spLoggerMiddleware().onError?.(new Error('boom'), makeContext('counter'));
    expect(errorSpy).toHaveBeenCalledWith('[Signal] Error in counter:', 'boom');
  });

  it('should log errors with a fallback name', () => {
    const errorSpy = spyOn(console, 'error');
    spLoggerMiddleware().onError?.(new Error('boom'), makeContext());
    expect(errorSpy).toHaveBeenCalledWith('[Signal] Error in signal:', 'boom');
  });

  it('should report analytics events with the signal name', () => {
    const tracker = jasmine.createSpy('tracker');
    spAnalyticsMiddleware(tracker).onSet?.(makeContext('counter'));
    expect(tracker).toHaveBeenCalledWith({
      name: 'counter',
      oldValue: 1,
      newValue: 2,
      timestamp: 123,
    });
  });

  it('should report analytics events with a fallback name', () => {
    const tracker = jasmine.createSpy('tracker');
    spAnalyticsMiddleware(tracker).onSet?.(makeContext());
    expect(tracker).toHaveBeenCalledWith({
      name: 'unknown',
      oldValue: 1,
      newValue: 2,
      timestamp: 123,
    });
  });
});
