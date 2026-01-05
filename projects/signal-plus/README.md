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
- Form groups with aggregated state and validation
- Async state management with loading, error, and retry logic
- Reactive Queries for server state (TanStack Query style)
- Collection management with ID-based CRUD operations
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
import { Component } from "@angular/core";
import { sp, enhance, spMap, spFilter } from "ngx-signal-plus";
import { signal, computed } from "@angular/core";

@Component({
  standalone: true,
  selector: "app-counter",
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
    .persist("counter")
    .withHistory(10)
    .validate((value) => value >= 0)
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
import { sp, spCounter, spToggle, spForm } from "ngx-signal-plus";

// Simple enhanced signal
const name = sp("John").build();

// Counter with min/max validation
const counter = spCounter(0, { min: 0, max: 100 });

// Toggle (boolean) with persistence
const darkMode = spToggle(false, "theme-mode");

// Form input with validation
const username = spForm.text("", {
  minLength: 3,
  maxLength: 20,
  debounce: 300,
});
```

### Signal Enhancement

Enhance existing signals with additional features:

```typescript
import { enhance } from "ngx-signal-plus";
import { signal } from "@angular/core";

const enhanced = enhance(signal(0))
  .persist("counter")
  .validate((n) => n >= 0)
  .transform(Math.round)
  .withHistory(5)
  .debounce(300)
  .distinctUntilChanged()
  .build();
```

### Computed Signal Enhancement

Create computed signals with persistence, history, and validation:

```typescript
import { spComputed } from "ngx-signal-plus";
import { signal } from "@angular/core";

const firstName = signal("John");
const lastName = signal("Doe");

// Computed signal with history and persistence
const fullName = spComputed(() => `${firstName()} ${lastName()}`, { persist: "user-fullname", historySize: 5 });

fullName.value; // 'John Doe'
firstName.set("Jane");
fullName.value; // 'Jane Doe' (auto-updates)
fullName.undo(); // 'John Doe'
fullName.isValid(); // true
```

### Signal Operators

```typescript
import { spMap, spFilter, spDebounceTime, spCombineLatest } from "ngx-signal-plus";
import { signal } from "@angular/core";

// Transform values
const price = signal(100);
const withTax = price.pipe(
  spMap((n) => n * 1.2),
  spMap((n) => Math.round(n * 100) / 100),
);

// Combine signals
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = spCombineLatest([firstName, lastName]).pipe(spMap(([first, last]) => `${first} ${last}`));
```

### Form Handling

```typescript
import { spForm } from "ngx-signal-plus";
import { computed } from "@angular/core";

// Form inputs with validation
const username = spForm.text("", { minLength: 3, maxLength: 20 });
const email = spForm.email("");
const age = spForm.number({ min: 18, max: 99, initial: 30 });

// Form validation
const isFormValid = computed(() => username.isValid() && email.isValid() && age.isValid());
```

### Form Groups

Group multiple form controls together with aggregated state, validation, and persistence:

```typescript
import { spFormGroup, spForm } from "ngx-signal-plus";

// Basic form group
const loginForm = spFormGroup({
  email: spForm.email(""),
  password: spForm.text("", { minLength: 8 }),
});

// Access aggregated state
loginForm.isValid(); // false if password < 8 chars
loginForm.isDirty(); // true if any field changed
loginForm.isTouched(); // true if any field touched
loginForm.value(); // { email: '', password: '' }
loginForm.errors(); // { email: [...], password: [...] }

// Update values
loginForm.setValue({ email: "user@example.com", password: "secret123" });
loginForm.patchValue({ email: "new@example.com" }); // Partial update

// Form actions
loginForm.reset(); // Reset all fields to initial values
loginForm.markAsTouched(); // Mark all fields as touched
loginForm.submit(); // Returns values if valid, null otherwise

// Nested form groups
const credentials = spFormGroup({
  email: spForm.email(""),
  password: spForm.text("", { minLength: 8 }),
});

const profile = spFormGroup({
  name: spForm.text(""),
  age: spForm.number({ min: 18 }),
});

const registrationForm = spFormGroup({
  credentials,
  profile,
});

// Group-level validation
const passwordForm = spFormGroup(
  {
    password: spForm.text("password123"),
    confirmPassword: spForm.text("password123"),
  },
  {
    validators: [(values) => values.password === values.confirmPassword || "Passwords must match"],
  },
);

// Persistence
const persistedForm = spFormGroup(
  {
    email: spForm.email(""),
    preferences: spForm.text(""),
  },
  {
    persistKey: "user-form", // Automatically saves/restores from localStorage
  },
);
```

### Async State Management

Manage asynchronous operations with built-in loading, error, and data states:

```typescript
import { spAsync } from "ngx-signal-plus";

const userData = spAsync<User>({
  fetcher: () => fetch("/api/user").then((r) => r.json()),
  initialValue: null,
  retryCount: 3,
  retryDelay: 1000,
  cacheTime: 5000,
  autoFetch: true,
  onSuccess: (data) => console.log("Loaded:", data),
  onError: (error) => console.error("Failed:", error),
});

// Reactive state signals
userData.data(); // Signal<User | null>
userData.loading(); // Signal<boolean>
userData.error(); // Signal<Error | null>
userData.isSuccess(); // Signal<boolean>
userData.isError(); // Signal<boolean>

// Methods
await userData.refetch(); // Manually refetch data
userData.invalidate(); // Mark cache as stale
userData.reset(); // Reset to initial state
userData.mutate(newData); // Optimistic update
```

### Reactive Queries

```typescript
import { QueryClient, setGlobalQueryClient } from "ngx-signal-plus";
import { spQuery, spMutation } from "ngx-signal-plus";

const qc = new QueryClient();
setGlobalQueryClient(qc);

const todosQuery = spQuery({
  queryKey: ["todos"],
  queryFn: async () => fetch("/api/todos").then((r) => r.json()),
  staleTime: 5000,
  refetchOnWindowFocus: true,
});

const addTodo = spMutation({
  mutationFn: async (title: string) => postTodo(title),
  onMutate: (title) => {
    qc.setQueryData(["todos"], (prev) => [...((prev as { title: string }[] | undefined) ?? []), { title }], true);
  },
  onSuccess: () => qc.refetchQueries(["todos"]),
});
```

Highlights:

- Cache-aware queries with invalidation and refetch
- Mutations with optimistic updates
- Interval/focus/reconnect refetch strategies

### Collection Management

Manage arrays of entities with ID-based operations, optimized updates, and history support:

```typescript
import { spCollection } from "ngx-signal-plus";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const todos = spCollection<Todo>({
  idField: "id",
  initialValue: [],
  persist: "todos-key",
  withHistory: true,
});

// CRUD operations
todos.add({ id: "1", title: "Learn Angular", completed: false });
todos.addMany([todo1, todo2, todo3]);
todos.update("1", { completed: true });
todos.updateMany([
  { id: "1", changes: { completed: true } },
  { id: "2", changes: { title: "Updated" } },
]);
todos.remove("1");
todos.removeMany(["1", "2"]);
todos.clear();

// Query operations
const todo = todos.findById("1");
const completed = todos.filter((t) => t.completed);
const firstCompleted = todos.find((t) => t.completed);
const hasCompleted = todos.some((t) => t.completed);
const allCompleted = todos.every((t) => t.completed);

// Transform operations
const sorted = todos.sort((a, b) => a.title.localeCompare(b.title));
const titles = todos.map((t) => t.title);
const totalCompleted = todos.reduce((acc, t) => acc + (t.completed ? 1 : 0), 0);

// History operations
todos.undo(); // Undo last operation
todos.redo(); // Redo last undone operation
todos.canUndo(); // Check if undo is available
todos.canRedo(); // Check if redo is available

// Reactive signals
todos.value(); // Signal<Todo[]>
todos.count(); // Signal<number>
todos.isEmpty(); // Signal<boolean>
```

### Validation and Presets

```typescript
import { spValidators, spPresets } from "ngx-signal-plus";

// Use built-in validators
const email = sp("").validate(spValidators.string.required).validate(spValidators.string.email).build();

// Use presets for common patterns
const counter = spPresets.counter({
  initial: 0,
  min: 0,
  max: 100,
  step: 1,
  withHistory: true,
});

const darkMode = spPresets.toggle({
  initial: false,
  persistent: true,
  storageKey: "theme-mode",
});
```

### Middleware/Plugin System

Intercept signal operations for logging, analytics, and error tracking:

```typescript
import { spUseMiddleware, spLoggerMiddleware, spAnalyticsMiddleware } from "ngx-signal-plus";

// Built-in logger middleware
spUseMiddleware(spLoggerMiddleware("[DEBUG]"));

// Custom analytics middleware
spUseMiddleware(
  spAnalyticsMiddleware((event) => {
    analytics.track("signal_change", event);
  }),
);

// Custom middleware
spUseMiddleware({
  name: "error-tracker",
  onSet: (ctx) => console.log(`${ctx.signalName}: ${ctx.oldValue} -> ${ctx.newValue}`),
  onError: (error) => Sentry.captureException(error),
});
```

### State Management

```typescript
import { spStorageManager, sp } from "ngx-signal-plus";

// Storage management (saves to localStorage with namespace prefix)
spStorageManager.save("app-settings", { theme: "dark", language: "en" });
const settings = spStorageManager.load<{ theme: string; language: string }>("app-settings");

// Remove when no longer needed
spStorageManager.remove("app-settings");

// History management through signals
const counter = sp(0)
  .withHistory(10) // Keep last 10 values
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
import { sp } from "ngx-signal-plus";

// Automatic cleanup when all subscribers unsubscribe
const signal = sp(0).persist("counter").debounce(300).build();
const unsubscribe = signal.subscribe((value) => console.log(value));

// When you're done with the signal
unsubscribe(); // Automatically cleans up when last subscriber unsubscribes

// Manual cleanup with destroy()
const signal2 = sp(0).persist("data").withHistory(10).build();
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
import { spTransaction, spBatch } from "ngx-signal-plus";

const balance = sp(100).build();
const cart = sp<string[]>([]).build();

// Transaction with automatic rollback
try {
  spTransaction(() => {
    balance.setValue(balance.value() - 50);
    cart.update((items) => [...items, "premium-item"]);

    if (balance.value() < 0) {
      throw new Error("Insufficient funds");
    }
    // Success - changes are committed
  });
} catch (error) {
  // Error - all changes automatically rolled back
  console.log(balance.value()); // 100 (original value)
  console.log(cart.value()); // [] (original value)
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
const userPrefs = sp({ theme: "dark" }).persist("user-preferences").build();

// In SSR: works in-memory, localStorage calls are safely skipped
// In browser: full persistence with localStorage
```

What happens during SSR:

- Signals work normally with in-memory state
- localStorage operations are safely skipped (no errors)
- State automatically persists once the app runs in the browser

## Available Features

| Category                    | Features                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Signal Creation**         | `sp`, `spCounter`, `spToggle`, `spForm`, `spComputed`                                                                                          |
| **Signal Enhancement**      | `enhance`, validation, transformation, persistence, history                                                                                    |
| **Signal Operators**        | `spMap`, `spFilter`, `spDebounceTime`, `spThrottleTime`, `spDelay`, `spDistinctUntilChanged`, `spSkip`, `spTake`, `spMerge`, `spCombineLatest` |
| **Form Groups**             | `spFormGroup` - Group multiple controls with aggregated state, validation, and persistence                                                     |
| **Async State Management**  | `spAsync` - Manage asynchronous operations with loading, error, retry, and caching                                                             |
| **Collection Management**   | `spCollection` - Manage arrays of entities with ID-based CRUD, queries, transforms, and history                                                |
| **Transactions & Batching** | `spTransaction`, `spBatch`, `spIsTransactionActive`, `spIsInTransaction`, `spIsInBatch`, `spGetModifiedSignals`                                |
| **Utilities**               | `spValidators`, `spPresets`                                                                                                                    |
| **Middleware/Plugins**      | `spUseMiddleware`, `spRemoveMiddleware`, `spLoggerMiddleware`, `spAnalyticsMiddleware`                                                         |
| **State Management**        | `spHistoryManager`, `spStorageManager`                                                                                                         |
| **Components**              | `spSignalPlusComponent`, `spSignalPlusService`, `spSignalBuilder`                                                                              |

## Bundle Size Optimization

The library is built with tree-shaking and optimization in mind. You only pay for what you use.

### Modern Package Exports

The package provides **modular exports** for selective importing:

```typescript
// Import only what you need - tree-shaking removes unused code

// Core signals only (~3KB gzipped)
import { sp, spCounter, spToggle } from "ngx-signal-plus/core";

// Operators only (~2KB gzipped)
import { spMap, spFilter, spDebounceTime } from "ngx-signal-plus/operators";

// Utilities only (~2KB gzipped)
import { enhance, spValidators, spPresets } from "ngx-signal-plus/utils";

// State managers (~1KB gzipped)
import { spHistoryManager, spStorageManager } from "ngx-signal-plus";

// Everything (~8KB gzipped)
import { sp, spMap, spFilter, enhance, spValidators } from "ngx-signal-plus";
```

### Tree-Shaking Configuration

The package is optimized for tree-shaking:

- ✅ **`sideEffects: false`** in package.json - marks the library as side-effect free
- ✅ **Modular exports** - separate entry points for each feature category
- ✅ **ES2022 modules** - modern JavaScript with full tree-shaking support
- ✅ **FESM bundles** - Flat ESM bundles for better optimization
- ✅ **Individual entry points** for granular control:
  - `ngx-signal-plus/core` - Core signal creation
  - `ngx-signal-plus/operators` - Signal operators
  - `ngx-signal-plus/utils` - Utilities and validators
  - `ngx-signal-plus/models` - TypeScript types

### Best Practices for Minimal Bundle

**1. Import only what you need:**

```typescript
// ✅ Good - imports only used features
import { sp, spCounter } from "ngx-signal-plus";

// ❌ Avoid - imports everything even if unused
import * as SignalPlus from "ngx-signal-plus";
```

**2. Use named imports:**

```typescript
// ✅ Good - tree-shaking can remove unused exports
import { sp, spMap } from "ngx-signal-plus";

// ❌ Less optimal - may import more than needed
import SignalPlus from "ngx-signal-plus";
```

**3. Import from specific entry points:**

```typescript
// ✅ Good - direct import from feature module
import { spMap, spFilter } from "ngx-signal-plus/operators";

// ✅ Also good - barrel export handles tree-shaking
import { spMap, spFilter } from "ngx-signal-plus";
```

### Typical Bundle Sizes

| Feature Set     | Size (gzipped) | Savings vs Full |
| --------------- | -------------- | --------------- |
| Just `sp()`     | ~1.5 KB        | -87%            |
| Core signals    | ~3 KB          | -62%            |
| + Operators     | ~5 KB          | -38%            |
| + All utilities | ~8 KB          | 0%              |

### Performance Impact

- **Tree-shaking enabled**: Webpack, Vite, Rollup automatically remove unused code
- **No performance penalty**: Modern bundlers handle optimization automatically
- **Zero runtime overhead**: Only loaded features are included

## Documentation

For detailed documentation including all features, API reference, and examples, see our [API Documentation](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md).

## Contributing

Please read our [Contributing Guide](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/CONTRIBUTING.md).

## Support

- [Documentation](https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md)
- [Issue Tracker](https://github.com/milad-hub/ngx-signal-plus/issues)

## License

MIT
