# ngx-signal-plus

A powerful utility library that enhances Angular Signals with additional features for robust state management.

## Features

- Enhanced signal operations with built-in state tracking
- Type-safe validations and transformations
- Persistent storage with automatic serialization
- Time-based operations (debounce, throttle, delay)
- Signal operators for transformation and combination
- Built-in undo/redo functionality
- Form handling with validation
- Automatic cleanup and memory management
- Performance optimizations
- Transactions and batching for atomic operations

## Installation

```bash
npm install ngx-signal-plus
```

## Requirements

- Angular >= 16.0.0 (fully compatible with Angular 19)
- TypeScript >= 5.0.0

## Basic Usage

```typescript
import { Component } from '@angular/core';
import { sp, enhance, spMap, spFilter } from 'ngx-signal-plus';
import { signal, computed } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-counter',
  template: `
    <div>Count: {{ counter.value() }}</div>
    <div>Doubled: {{ doubled() }}</div>
    <button (click)="increment()">Increment</button>
    <button (click)="decrement()">Decrement</button>
    
    @if (counter.canUndo()) {
      <button (click)="counter.undo()">Undo</button>
    }
  `,
})
export class CounterComponent {
  // Create an enhanced signal with persistence and history
  counter = sp(0)
    .persist('counter')
    .withHistory(10)
    .validate(value => value >= 0, 'Must be positive')
    .build();
  
  // Use signal operators
  doubled = computed(() => this.counter.value() * 2);
  
  increment() {
    this.counter.setValue(this.counter.value() + 1);
  }
  
  decrement() {
    if (this.counter.value() > 0) {
      this.counter.setValue(this.counter.value() - 1);
    }
  }
}
```

## Core Features

### Signal Creation

```typescript
import { sp, spCounter, spToggle, spForm } from 'ngx-signal-plus';

// Simple enhanced signal
const name = sp('John').build();

// Counter with min/max validation
const counter = spCounter(0, { min: 0, max: 100 });

// Toggle (boolean) with persistence
const darkMode = spToggle(false, 'theme-mode');

// Form input with validation
const username = spForm.text('', {
  minLength: 3,
  maxLength: 20,
  debounce: 300
});
```

### Signal Enhancement

Enhance existing signals with additional features:

```typescript
import { enhance } from 'ngx-signal-plus';
import { signal } from '@angular/core';

const enhanced = enhance(signal(0))
  .persist('counter')
  .validate(n => n >= 0, 'Must be positive')
  .transform(Math.round)
  .withHistory(5)
  .debounce(300)
  .distinctUntilChanged()
  .build();
```

### Signal Operators

```typescript
import { spMap, spFilter, spDebounceTime, spCombineLatest } from 'ngx-signal-plus';
import { signal } from '@angular/core';

// Transform values
const price = signal(100);
const withTax = price.pipe(
  spMap(n => n * 1.2),
  spMap(n => Math.round(n * 100) / 100)
);

// Combine signals
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = spCombineLatest([firstName, lastName])
  .pipe(spMap(([first, last]) => `${first} ${last}`));
```

### Form Handling

```typescript
import { spForm } from 'ngx-signal-plus';
import { computed } from '@angular/core';

// Form inputs with validation
const username = spForm.text('', { minLength: 3, maxLength: 20 });
const email = spForm.email('');
const age = spForm.number({ min: 18, max: 99, initial: 30 });

// Form validation
const isFormValid = computed(() => 
  username.isValid() && email.isValid() && age.isValid()
);
```

### Validation and Presets

```typescript
import { spValidators, spPresets } from 'ngx-signal-plus';

// Use validators
const email = sp('')
  .validate(spValidators.string.required, 'Email is required')
  .validate(spValidators.string.email, 'Must be a valid email')
  .build();

// Use presets for common patterns
const counter = spPresets.counter({
  initial: 0,
  min: 0,
  max: 100,
  step: 1,
  withHistory: true
});

const darkMode = spPresets.toggle({
  initial: false,
  persistent: true,
  storageKey: 'theme-mode'
});
```

### State Management

```typescript
import { spHistoryManager, spStorageManager } from 'ngx-signal-plus';

// History management
const history = new spHistoryManager(0, { maxSize: 10 });
history.push(1);
history.undo();
history.redo();

// Storage management
const storage = new spStorageManager<{theme: string}>('app-settings');
storage.save({ theme: 'dark' });
const settings = storage.load();
```

## Available Features

| Category | Features |
|----------|----------|
| **Signal Creation** | `sp`, `spCounter`, `spToggle`, `spForm` |
| **Signal Enhancement** | `enhance`, validation, transformation, persistence, history |
| **Signal Operators** | `spMap`, `spFilter`, `spDebounceTime`, `spThrottleTime`, `spDelay`, `spDistinctUntilChanged`, `spSkip`, `spTake`, `spMerge`, `spCombineLatest` |
| **Transactions & Batching** | `spTransaction`, `spBatch`, `spIsTransactionActive`, `spIsInTransaction`, `spIsInBatch`, `spGetModifiedSignals` |
| **Utilities** | `spValidators`, `spPresets` |
| **State Management** | `spHistoryManager`, `spStorageManager` |
| **Components** | `spSignalPlusComponent`, `spSignalPlusService`, `spSignalBuilder` |

## Documentation

For detailed documentation including all features, API reference, and examples, see our [API Documentation](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md).

## Contributing

Please read our [Contributing Guide](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/CONTRIBUTING.md).

## Support

- [Documentation](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md)
- [Issue Tracker](https://github.com/milad-hub/ngx-signal-plus/issues)

## License

MIT
