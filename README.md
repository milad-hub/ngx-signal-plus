# ngx-signal-plus

A utility library providing operators and state management tools for Angular Signals.

[![npm version](https://img.shields.io/badge/npm-1.0.0--beta.0-blue.svg)](https://www.npmjs.com/package/ngx-signal-plus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Signal operators (map, filter, etc.)
- State management utilities
- History tracking (undo/redo)
- Type-safe operations
- Storage persistence
- Async handling

## Installation

```bash
npm install ngx-signal-plus
```

## Requirements

- Angular >= 16.0.0
- Node.js >= 18.13.0
- TypeScript >= 4.8.0

## Basic Usage

```typescript
import { SignalPlusService, spMap, spFilter } from "ngx-signal-plus";

@Component({
  selector: "app-counter",
  template: `<div>Count: {{ counter.value }}</div>`,
})
export class CounterComponent {
  counter = this.signalPlus.create({
    initialValue: 0,
    persist: true,
    storageKey: "counter",
  });

  filtered = this.counter.pipe(
    spFilter((x) => x >= 0),
    spMap((x) => x * 2)
  );

  constructor(private signalPlus: SignalPlusService) {}
}
```

## Core Components

### SignalPlusService

Core service for creating and managing enhanced signals:

```typescript
const counter = signalPlus.create({
  initialValue: 0,
  persist: true,
  storageKey: 'counter',
  validators: [(value) => value >= 0],
  transform: (value) => Math.round(value),
  debounceTime: 300,
  distinctUntilChanged: true
});
```

### SignalPlus Interface

Enhanced signal interface with additional features:

```typescript
interface SignalPlus<T> {
  // Core functionality
  value: T;
  previousValue: T | undefined;
  signal: Signal<T>;
  writable: WritableSignal<T>;

  // Methods
  setValue(newValue: T): void;
  update(fn: (current: T) => T): void;
  reset(): void;
  validate(): boolean;

  // State tracking
  isValid: Signal<boolean>;
  isDirty: Signal<boolean>;
  hasChanged: Signal<boolean>;

  // History management
  history: Signal<T[]>;
  undo(): void;
  redo(): void;

  // Subscriptions
  subscribe(callback: (value: T) => void): () => void;
  pipe<R>(...operators: SignalOperator<T, R>[]): SignalPlus<R>;
}
```

### HistoryManager

Manages undo/redo functionality:

```typescript
const counterWithHistory = signalPlus.create({
  initialValue: 0,
  storageKey: 'counter-history'
});

// Undo/redo operations
counterWithHistory.undo();
counterWithHistory.redo();

// Access history
const history = counterWithHistory.history();
```

## Available Operators

| Category       | Operators                                           | Description                                    |
| -------------- | -------------------------------------------------- | ---------------------------------------------- |
| Transformation | `spMap`, `spFilter`                                 | Transform and filter signal values             |
| Time-based     | `spDebounceTime`, `spThrottleTime`, `spDelay`      | Control timing of signal updates               |
| State          | `spDistinctUntilChanged`                           | Emit only when value changes                   |
| Flow Control   | `spSkip`, `spTake`                                 | Control flow of signal updates                 |
| Combination    | `spMerge`, `spCombineLatest`                       | Combine multiple signals                       |

## Available Utilities

| Category         | Utilities                                          | Description                                    |
| ---------------- | ------------------------------------------------- | ---------------------------------------------- |
| State Management | `spWithHistory`                                    | Adds undo/redo capability                      |
|                  | `spPersistent`                                     | Persists signal value to storage               |
| Performance      | `spMemoized`                                       | Memoizes expensive computations                |
|                  | `spBatch`                                          | Batches multiple signal updates                |
| Validation      | `spValidated`                                      | Adds validation rules to signals               |
| Async           | `spAsync`                                          | Handles async operations                        |
| Cleanup         | `spCleanup`                                        | Automatic resource cleanup                      |

## Documentation

See our [API Documentation](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md) for detailed usage.

## Contributing

Please read our [Contributing Guide](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/CONTRIBUTING.md).

## Support

- [Documentation](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md)
- [Issue Tracker](https://github.com/milad-hub/ngx-signal-plus/issues)

## Development

### Development server

```bash
ng serve
```

The application will automatically reload if you change any of the source files.

### Building

```bash
ng build
```

Build artifacts will be stored in the `dist/` directory.

### Running unit tests

```bash
ng test
```

### Running end-to-end tests

```bash
ng e2e
```

## License

MIT
