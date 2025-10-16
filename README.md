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

- Angular >= 16.0.0 (fully compatible with Angular 16-20)
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
    
    @if (counter.history().length > 0) {
      <button (click)="counter.undo()">Undo</button>
    }
  `,
})
export class CounterComponent {
  // Create an enhanced signal with persistence and history
  counter = sp(0)
    .persist('counter')
    .withHistory(10)
    .validate(value => value >= 0)
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
  .validate(n => n >= 0)
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

// Use built-in validators
const email = sp('')
  .validate(spValidators.string.required)
  .validate(spValidators.string.email)
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
import { spStorageManager, sp } from 'ngx-signal-plus';

// Storage management (saves to localStorage with namespace prefix)
spStorageManager.save('app-settings', { theme: 'dark', language: 'en' });
const settings = spStorageManager.load<{theme: string, language: string}>('app-settings');

// Remove when no longer needed
spStorageManager.remove('app-settings');

// History management through signals
const counter = sp(0)
  .withHistory(10)  // Keep last 10 values
  .build();

counter.setValue(1);
counter.setValue(2);
counter.setValue(3);

// Navigate history
counter.undo(); // Back to 2
counter.undo(); // Back to 1
counter.redo(); // Forward to 2

// Check history
console.log(counter.history()); // Array of past values
```

### Cleanup and Memory Management

**ngx-signal-plus** provides automatic and manual cleanup to prevent memory leaks:

```typescript
import { sp } from 'ngx-signal-plus';

// Automatic cleanup when all subscribers unsubscribe
const signal = sp(0).persist('counter').debounce(300).build();
const unsubscribe = signal.subscribe(value => console.log(value));

// When you're done with the signal
unsubscribe(); // Automatically cleans up when last subscriber unsubscribes

// Manual cleanup with destroy()
const signal2 = sp(0).persist('data').withHistory(10).build();
signal2.setValue(42);

// Explicitly destroy and clean up all resources
signal2.destroy(); // Removes event listeners, clears timers, frees memory
```

**What gets cleaned up:**
- ✅ Storage event listeners (for `localStorage` synchronization)
- ✅ Debounce/throttle timers
- ✅ All subscribers
- ✅ Pending operations

**SSR-Safe:** All cleanup operations work safely in server-side rendering environments.

### Transactions and Batching

Group multiple updates together with automatic rollback on errors:

```typescript
import { spTransaction, spBatch } from 'ngx-signal-plus';

const balance = sp(100).build();
const cart = sp<string[]>([]).build();

// Transaction with automatic rollback
try {
  spTransaction(() => {
    balance.setValue(balance.value() - 50);
    cart.update(items => [...items, 'premium-item']);
    
    if (balance.value() < 0) {
      throw new Error('Insufficient funds');
    }
    // Success - changes are committed
  });
} catch (error) {
  // Error - all changes automatically rolled back
  console.log(balance.value()); // 100 (original value)
  console.log(cart.value());    // [] (original value)
}

// Batch updates for performance (no rollback)
spBatch(() => {
  signal1.setValue(1);
  signal2.setValue(2);
  signal3.setValue(3);
  // All changes applied together efficiently
});
```

### Server-Side Rendering

The library works seamlessly with Angular Universal:

```typescript
// This code works in both SSR and browser
const userPrefs = sp({ theme: 'dark' })
  .persist('user-preferences')
  .build();

// In SSR: works in-memory, localStorage calls are safely skipped
// In browser: full persistence with localStorage
```

What happens during SSR:
- Signals work normally with in-memory state
- localStorage operations are safely skipped (no errors)
- State automatically persists once the app runs in the browser

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