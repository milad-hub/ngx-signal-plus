# ngx-signal-plus

A comprehensive utility library for Angular Signals

Version: 1.0.1

[![npm version](https://img.shields.io/badge/npm-1.0.1-blue.svg)](https://www.npmjs.com/package/ngx-signal-plus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Enhanced Signal Management
- Tree-shakable imports
- State persistence
- History tracking
- Validation support

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
// Import specific modules for better tree-shaking
import { SignalPlusService } from "ngx-signal-plus/core";
import { spMap, spFilter } from "ngx-signal-plus/operators";

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

## Import Options

You can import specific modules to optimize bundle size:

```typescript
// Core functionality
import { SignalPlusService } from 'ngx-signal-plus/core';

// Operators
import { spMap, spFilter } from 'ngx-signal-plus/operators';

// Utilities
import { spWithHistory, spPersistent } from 'ngx-signal-plus/utils';

// Types
import type { SignalOptions } from 'ngx-signal-plus/models';
```

Or import everything (not recommended for production):

```typescript
import { SignalPlusService, spMap, spWithHistory } from 'ngx-signal-plus';
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
