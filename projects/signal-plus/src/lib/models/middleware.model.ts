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
