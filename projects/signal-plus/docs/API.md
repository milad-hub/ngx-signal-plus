# ngx-signal-plus API Documentation

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Signal Operators](#signal-operators)
- [Requirements](#requirements)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Utility Functions](#utility-functions)
- [Types](#types)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Performance](#performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Migration](#migration)
- [Contributing](#contributing)

## Overview

Signal Plus is a comprehensive utility library for Angular Signals that provides enhanced functionality, operators, and utilities.

Version: 1.0.0-beta.2

### Requirements

- Angular >= 16.0.0
- Node.js >= 18.13.0
- TypeScript >= 5.6.2

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Dependencies

- @angular/core: >=16.0.0
- @angular/common: >=16.0.0

## Installation

```bash
npm install ngx-signal-plus
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

## Core Concepts

Signal Plus extends Angular's signals with additional functionality:

- Signal transformation through operators
- State management capabilities
- Error handling and recovery
- Resource cleanup
- Type safety

### Basic Usage

```typescript
import { SignalPlusService } from "ngx-signal-plus";

const counter = signalPlus.create({
  initialValue: 0,
  persist: true,
  storageKey: "counter",
  validators: [(value) => value >= 0],
  transform: (value) => Math.round(value),
  debounceTime: 300,
  distinctUntilChanged: true,
});
```

## Core Components

### SignalPlusComponent

A standalone demo component that showcases signal plus features.

```typescript
import { SignalPlusComponent } from "ngx-signal-plus";

// Standalone component usage
@Component({
  imports: [SignalPlusComponent]
})

// Or in NgModule
@NgModule({
  imports: [SignalPlusComponent]
})
```

Features demonstrated:

- Basic counter operations (increment/decrement)
- Value tracking (current and previous values)
- State validation
- History management (undo/redo)
- Derived signals (doubled values)
- Time-based operations (debounced values)

Example template usage:

```html
<lib-signal-plus></lib-signal-plus>
```

Component Output:

```html
<div class="signal-plus-demo">
  <h3>Signal Plus Demo</h3>

  <!-- Basic Counter -->
  <div class="counter">
    <h4>Basic Counter</h4>
    <p>Current value: {{ count.value }}</p>
    <p>Previous value: {{ count.previousValue }}</p>
    <p>Is valid: {{ count.isValid() ? 'Yes' : 'No' }}</p>
    <p>Has changed: {{ count.hasChanged() ? 'Yes' : 'No' }}</p>

    <!-- Counter Controls -->
    <button (click)="increment()">Increment</button>
    <button (click)="decrement()">Decrement</button>
    <button (click)="reset()">Reset</button>
    <button (click)="undo()">Undo</button>
    <button (click)="redo()">Redo</button>
  </div>

  <!-- Derived Values -->
  <div class="derived">
    <h4>Derived Values</h4>
    <p>Doubled: {{ doubled.value }}</p>
    <p>Debounced: {{ debounced.value }}</p>
  </div>
</div>
```

## Signal Operators

### spMap<TInput, TOutput>

Transforms signal values using a projection function.

```typescript
import { spMap } from "ngx-signal-plus";

const source = signal(1);
const doubled = source.pipe(spMap((x: number) => x * 2));
// doubled() -> 2
```

### spFilter<T>

Filters signal values based on a predicate function.

```typescript
import { spFilter } from "ngx-signal-plus";

const source = signal(0);
const positive = source.pipe(spFilter((x: number) => x > 0));
```

Features:

- Maintains last valid value
- Type-safe error propagation
- Automatic error recovery

### spDebounceTime<T>

Debounces signal emissions by specified time.

```typescript
import { spDebounceTime } from "ngx-signal-plus";

const debounced = source.pipe(spDebounceTime(300));
```

Parameters:

- `duration`: Time in milliseconds to debounce

### spDistinctUntilChanged<T>

Emits only when value changes based on equality comparison.

```typescript
import { spDistinctUntilChanged } from "ngx-signal-plus";

const distinct = source.pipe(spDistinctUntilChanged());
```

### spDelay<T>

Delays signal emissions by specified time.

```typescript
import { spDelay } from "ngx-signal-plus";

const delayed = source.pipe(spDelay(1000));
```

### spThrottleTime<T>

Limits emission rate to specified interval.

```typescript
import { spThrottleTime } from "ngx-signal-plus";

const throttled = source.pipe(spThrottleTime(1000));
```

### spSkip<T>

Skips specified number of emissions.

```typescript
import { spSkip } from "ngx-signal-plus";

const skipped = source.pipe(spSkip(2));
```

### spTake<T>

Takes specified number of emissions and completes.

```typescript
import { spTake } from "ngx-signal-plus";

const taken = source.pipe(spTake(2));
```

### spMerge<T>

Merges multiple signals into a single signal.

```typescript
import { spMerge } from "ngx-signal-plus";

const merged = spMerge(signal1, signal2);
```

### combineLatest<T>

Combines latest values from multiple signals.

```typescript
import { combineLatest } from "ngx-signal-plus";

const name = signal("John");
const age = signal(25);

const combined = combineLatest([name, age]);
// combined() -> ['John', 25]

name.set("Jane"); // combined() -> ['Jane', 25]
age.set(30); // combined() -> ['Jane', 30]

// Error handling
try {
  const combined = combineLatest([name, undefined]); // Throws TypeError
} catch (err) {
  if (err instanceof TypeError) {
    console.error("Invalid signal in array");
  }
}
```

## Utility Functions

### spWithHistory<T>

Creates a signal with undo/redo capabilities.

```typescript
import { spWithHistory } from "ngx-signal-plus";

const counter = spWithHistory(0);
counter.push(1);
counter.undo(); // Returns to 0
counter.redo(); // Goes back to 1
```

### spMemoized<T>

Creates a memoized computed signal.

```typescript
import { spMemoized } from "ngx-signal-plus";

const memoized = spMemoized(() => expensiveComputation(), [dep1, dep2]);
```

### spValidated<T>

Creates a signal with validation.

```typescript
import { spValidated } from "ngx-signal-plus";

const email = spValidated("", (value) => /^[^@]+@[^@]+\.[^@]+$/.test(value));
```

### spAsync<T>

Handles async operations with loading and error states.

```typescript
import { spAsync } from "ngx-signal-plus";

interface User {
  id: number;
  name: string;
}

const users = spAsync<User[]>();

// Basic usage
await users.execute(fetchUsers());
console.log(users.value()); // User[] or undefined
console.log(users.loading()); // boolean
console.log(users.error()); // Error | null

// Error handling
try {
  await users.execute(Promise.reject(new Error("Failed to fetch")));
} catch (err) {
  console.log(users.error()?.message); // 'Failed to fetch'
  console.log(users.loading()); // false
  console.log(users.value()); // undefined
}

// Recovery after error
await users.execute(fetchUsers()); // Clears error state if successful
```

### spBatch<T>

Batches multiple updates into a single emission.

```typescript
import { spBatch } from "ngx-signal-plus";

const counter = spBatch(0);
let emissionCount = 0;

effect(() => {
  counter.value();
  emissionCount++;
});

// Multiple updates batched into one emission
counter.update((v) => v + 1); // Not emitted yet
counter.update((v) => v * 2); // Not emitted yet
counter.update((v) => v + 3); // All updates processed in next tick

// After next tick: value = ((0 + 1) * 2) + 3 = 5
// emissionCount = 2 (initial + one batch)
```

### spCleanup<T>

Manages resource cleanup with automatic disposal.

```typescript
import { spCleanup } from "ngx-signal-plus";

// Example with WebSocket
const connection = spCleanup<WebSocket | null>(null);

// Set value with cleanup
connection.set(new WebSocket("ws://example.com"), () => {
  connection.value?.close();
});

// Automatic cleanup on new value
connection.set(new WebSocket("ws://example.com/new"), () => {
  connection.value?.close();
}); // Previous WebSocket is automatically closed

// Manual cleanup
connection.destroy(); // Closes current WebSocket
```

### spPersistent<T>

Persists signal values to localStorage.

```typescript
import { spPersistent } from "ngx-signal-plus";

const persistent = spPersistent("key", initialValue);
```

### spDebounced<T>

Creates a debounced signal.

```typescript
import { spDebounced } from "ngx-signal-plus";

const debounced = spDebounced(signal, 300);
```

### spThrottled<T>

Creates a throttled signal.

```typescript
import { spThrottled } from "ngx-signal-plus";

const throttled = spThrottled(signal, 300);
```

## Types

### SignalOptions<T>

Configuration options for creating a signal plus instance.

```typescript
interface SignalOptions<T> {
  // Initial value for the signal
  initialValue: T;

  // Key for persisting signal value in storage
  storageKey?: string;

  // Enable persistence to localStorage
  persist?: boolean;

  // Array of validation functions
  validators?: ((value: T) => boolean)[];

  // Transform function applied before setting value
  transform?: (value: T) => T;

  // Debounce time in milliseconds
  debounceTime?: number;

  // Only emit when value changes
  distinctUntilChanged?: boolean;
}
```

### SignalHistory<T>

Interface for managing signal value history.

```typescript
interface SignalHistory<T> {
  // Previous values
  past: T[];

  // Current value
  present: T;

  // Future values (for redo operations)
  future: T[];
}
```

### SignalState

Interface for tracking signal state information.

```typescript
interface SignalState {
  // Loading state flag
  loading: boolean;

  // Error state
  error: Error | null;

  // Last update timestamp
  timestamp: number;
}
```

### SignalPlus<T>

Core plus interface for signals.

```typescript
interface SignalPlus<T> {
  value: T;
  previousValue: T | undefined;
  signal: Signal<T>;
  writable: WritableSignal<T>;
  setValue(newValue: T): void;
  update(fn: (current: T) => T): void;
  reset(): void;
  validate(): boolean;
  isValid: Signal<boolean>;
  isDirty: Signal<boolean>;
  hasChanged: Signal<boolean>;
  history: Signal<T[]>;
  undo(): void;
  redo(): void;
  subscribe(callback: (value: T) => void): () => void;
  pipe<R>(...operators: SignalOperator<T, R>[]): SignalPlus<R>;
}
```

## Error Handling

### Try-Catch Pattern

```typescript
effect(() => {
  try {
    const value = filteredSignal();
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    }
  }
});
```

### Error Recovery

Signals automatically maintain last valid state and recover when valid values resume.

```typescript
const filtered = source.pipe(spFilter((x: number) => {
  if (x < 0) throw new Error("Invalid value");
  return x > 0;
}));

// Error thrown but last valid value maintained
source.set(-1); // Throws but keeps last value
source.set(5); // Recovers with new value
```

## Best Practices

### 1. Resource Management

Always cleanup effects and subscriptions:

```typescript
const effectRef = effect(() => {
  // Effect logic
});
onDestroy(() => effectRef.destroy());
```

### 2. Type Safety

Use proper type annotations:

```typescript
const typed = signal<number>(0);
const doubled = typed.pipe(spMap((x: number) => x * 2));
```

### 3. Error Boundaries

Implement error boundaries in effects:

```typescript
effect(() => {
  try {
    // Signal operations
  } catch (err: unknown) {
    // Type-safe error handling
    if (err instanceof Error) {
      handleError(err);
    }
  }
});
```

### 4. Performance

Use memoization for expensive computations:

```typescript
const memoized = spMemoized(() => expensiveOperation(), [dependency1, dependency2]);
```

### 5. State Management

Leverage history and validation:

```typescript
const validated = spValidated(0, (x) => x >= 0);
const withHistory = spWithHistory(0);
```

## Advanced Usage

### Custom Operators

Create custom operators:

```typescript
function customOperator<T>(): SignalOperator<T> {
  return (source: Signal<T>) => {
    // Implementation
  };
}
```

### Composition Patterns

Combine multiple operators:

```typescript
const result = plus.pipe(
  spFilter((x) => x > 0),
  spMap((x) => x * 2),
  spDebounceTime(300)
);
```

## Performance

### Memory Management

- Effects are automatically cleaned up
- Use `spCleanup` for manual resource management
- Implement `ngOnDestroy` for component cleanup

### Optimization Tips

1. Use `spMemoized` for expensive computations
2. Implement `spDistinctUntilChanged` to prevent unnecessary updates
3. Batch updates with `spBatch`
4. Use appropriate debounce/throttle times

### Performance Example

```typescript
// Add memoization for expensive computations
const computed = spMemoized(() => expensiveOperation(), [dep1, dep2]);

// Use batching for multiple updates
const batchedSignal = spBatch(0);
```

## Security

### LocalStorage

When using `spPersistent`:

- Don't store sensitive information
- Validate data on retrieval
- Handle storage quota exceeded

### Input Validation

Always validate inputs:

```typescript
const validated = spValidated(initialValue, (value) => validateInput(value));
```

## Troubleshooting

### Common Issues

1. Memory Leaks

```typescript
// Wrong
effect(() => {
  /* ... */
});

// Correct
const effectRef = effect(() => {
  /* ... */
});
onDestroy(() => effectRef.destroy());
```

2. Signal Updates Not Reflecting

```typescript
// Check if running in Angular zone
runInInjectionContext(injector, () => {
  // Signal operations
});
```

3. Type Errors

```typescript
// Use explicit typing
const signal = plus.create<number>({
  initialValue: 0,
});
```

## Migration

### From RxJS

```typescript
// RxJS
const subject$ = new BehaviorSubject(0);
subject$.pipe(
  map((x) => x * 2),
  filter((x) => x > 0)
);

// Signal Plus
const signal = plus.create({ initialValue: 0 });
signal.pipe(
  spMap((x) => x * 2),
  spFilter((x) => x > 0)
);
```

## Contributing

For detailed information about contributing to this project, please see our [Contributing Guide](../CONTRIBUTING.md).

### Development

1. Fork the repository
2. Create your feature branch
3. Write tests for your changes
4. Submit a pull request

### Code Style

- Follow Angular style guide
- Use TypeScript strict mode
- Include JSDoc comments
- Write unit tests for new features

### Documentation

When adding new features, please update:

- API documentation
- Code examples
- Type definitions
- Test cases

For more details about development setup and processes, refer to our [CONTRIBUTING.md](../CONTRIBUTING.md).
