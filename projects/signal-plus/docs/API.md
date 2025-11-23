# ngx-signal-plus API Documentation

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Core Features](#core-features)
- [Signal Creation](#signal-creation)
- [Signal Enhancement](#signal-enhancement)
- [Signal Operators](#signal-operators)
- [Form Handling](#form-handling)
- [Form Groups](#form-groups)
- [Async State Management](#async-state-management)
- [Collection Management](#collection-management)
- [Transactions and Batching](#transactions-and-batching)
- [Managers](#managers)
- [Validators and Presets](#validators-and-presets)
- [Types and Interfaces](#types-and-interfaces)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Reactive Queries](#reactive-queries)

## Overview

`ngx-signal-plus` is a powerful utility library that enhances Angular Signals with additional features for robust state management. It provides a comprehensive set of tools for handling complex state scenarios while maintaining type safety and optimal performance.

### Key Features

- Enhanced signal operations with built-in state tracking
- Type-safe validations and transformations
- Persistent storage with automatic serialization
- Time-based operations (debounce, throttle, delay)
- Automatic cleanup and memory management
- Built-in undo/redo functionality
- Performance optimizations with minimal overhead
- Smart form input handling
- Form groups with aggregated state and validation
- Async state management with loading, error, and retry logic
- Collection management with ID-based CRUD operations

### Requirements

- Angular >= 16.0.0 (fully compatible with Angular 20)
- TypeScript >= 5.0.0

### Server-Side Rendering (SSR) Support

ngx-signal-plus is fully compatible with Angular Universal and server-side rendering:

- All browser-specific APIs (`localStorage`, `window`, etc.) are safely handled
- Signals work seamlessly in both SSR and browser environments
- No configuration needed - SSR support is automatic
- State automatically persists once the app hydrates in the browser

```typescript
// This works in both SSR and browser
const userPrefs = sp({ theme: "dark" }).persist("user-preferences").build();

// In SSR: works in-memory, localStorage calls are safely skipped
// In browser: full persistence with localStorage
```

## Installation

```bash
npm install ngx-signal-plus
```

## Bundle Size Optimization

ngx-signal-plus is designed to be lightweight and efficient. The core library is typically less than 10KB when minified and gzipped.

### Key Optimization Techniques

1. **Tree-shaking**: Only import the specific functions and operators you need.
2. **Minification**: Use a build tool (like `ng build`) to minify and remove unused code.
3. **Lazy Loading**: Only load the components and services you use.
4. **Code Splitting**: Split your application into smaller bundles.

### Example: Optimized Import

```typescript
import { sp, spCounter, spForm, spToggle } from "ngx-signal-plus";
import { signal } from "@angular/core";

// Simple text signal
const name = sp("John").build();
console.log(name.value()); // 'John'
name.setValue("Jane");
console.log(name.previousValue()); // 'John'

// Counter with min/max validation
const counter = spCounter(0, { min: 0, max: 100 });
counter.setValue(counter.value() + 1); // 1
counter.setValue(counter.value() - 1); // 0
counter.setValue(50); // Sets to 50 if within range

// Form inputs with validation
const username = spForm.text("", {
  minLength: 3,
  maxLength: 20,
  debounce: 300,
});
username.setValue("ab"); // Not valid due to minLength
console.log(username.isValid()); // false

const emailInput = spForm.email("user@example.com", {
  debounce: 300,
});
emailInput.setValue("invalid"); // Will not pass validation

// Number input with range validation
const age = spForm.number({
  initial: 18,
  min: 0,
  max: 120,
  debounce: 300,
});

// Toggle with persistence
const darkMode = spToggle(false, "theme-mode"); // Automatically persists to storage
darkMode.setValue(!darkMode.value()); // Toggle the value
```

### SignalPlus Interface

All enhanced signals implement the `SignalPlus<T>` interface, which provides the following methods:

```typescript
interface SignalPlus<T> {
  // Core signal functionality
  value(): T; // Get the current value
  setValue(value: T): void; // Set a new value
  previousValue(): T | undefined; // Get the previous value before last change

  // Validation
  isValid(): boolean; // Check if the current value is valid
  errors(): string[]; // Get any validation error messages

  // History management
  undo(): boolean; // Undo the last change, returns success
  redo(): boolean; // Redo previously undone change, returns success
  canUndo(): boolean; // Check if undo is available
  canRedo(): boolean; // Check if redo is available
  history(): T[]; // Get the history array
  resetHistory(): void; // Clear history stack

  // Subscription
  subscribe(callback: (value: T) => void): () => void; // Subscribe to changes

  // Cleanup
  destroy(): void; // Manually cleanup all resources

  // State management
  reset(): void; // Reset to initial value
}
```

### Signal Enhancement

Enhance existing signals with additional features using the builder pattern:

```typescript
import { enhance } from "ngx-signal-plus";
import { signal } from "@angular/core";

// Create an enhanced signal with multiple features
const enhanced = enhance(signal(0))
  .persist("counter") // Persist to storage
  .validate((n) => n >= 0) // Add validation
  .transform(Math.round) // Transform values
  .withHistory(5) // Enable undo/redo with history size
  .debounce(300) // Add debounce
  .distinctUntilChanged() // Prevent duplicate updates
  .onError((error) => console.error(error)) // Handle errors
  .build();

// Use the enhanced signal
enhanced.setValue(5.7); // Stored as 6 (after rounding)
enhanced.undo(); // Reverts to previous value
console.log(enhanced.isValid()); // Check validation
```

#### Builder Methods

The SignalBuilder provides a fluent API with the following methods:

- `.persist(key: string)`: Persists the signal to localStorage using the provided key
- `.validate(fn: Validator<T>)`: Adds a validation function
- `.transform(fn: Transform<T>)`: Adds a transformation to be applied to values
- `.withHistory(size?: number | boolean)`: Enables undo/redo with optional history size or persistence
- `.debounce(ms: number)`: Adds debouncing to signal updates
- `.throttle(ms: number)`: Adds throttling to signal updates
- `.distinctUntilChanged()`: Prevents duplicate updates
- `.onError(handler: ErrorHandler)`: Sets a handler for validation/transform errors
- `.build()`: Finalizes the configuration and returns the enhanced signal

## Signal Operators

Transform and combine signals using powerful operators:

```typescript
import { spMap, spFilter, spDebounceTime, spDistinctUntilChanged, spDelay, spThrottleTime, spSkip, spTake, spMerge, spCombineLatest } from "ngx-signal-plus";
import { signal, computed } from "@angular/core";

// Transform values
const price = signal(100);
const withTax = price.pipe(
  spMap((n) => n * 1.2),
  spMap((n) => Math.round(n * 100) / 100),
);
console.log(withTax()); // 120.00

// Filter values
const numbers = signal(0);
const positive = numbers.pipe(
  spFilter((n) => n > 0),
  spDistinctUntilChanged(),
);

// Time-based operations
const input = signal("");
const debouncedInput = input.pipe(spDebounceTime(300));
const scrollY = signal(0);
const throttledScroll = scrollY.pipe(spThrottleTime(100));
const value = signal(0);
const delayedUpdate = value.pipe(spDelay(1000));

// Pagination
const items = signal([1, 2, 3, 4, 5]);
const firstThree = items.pipe(spTake(3));
const skipFirst = items.pipe(spSkip(1));

// Combine multiple signals
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = spCombineLatest([firstName, lastName]).pipe(spMap(([first, last]) => `${first} ${last}`));

// Merge signals
const signal1 = signal("a");
const signal2 = signal("b");
const merged = spMerge([signal1, signal2]);
```

### Available Operators

| Operator                 | Description                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| `spMap`                  | Transforms the value of a signal using a mapping function                  |
| `spFilter`               | Only passes through values that meet the filter criteria                   |
| `spDebounceTime`         | Delays updates until the specified time has passed with no new updates     |
| `spThrottleTime`         | Limits the rate of updates to once per specified interval                  |
| `spDelay`                | Delays the emission of values by a specified time                          |
| `spDistinctUntilChanged` | Only emits when the current value is different from the previous           |
| `spSkip`                 | Skips the first n items in an array signal                                 |
| `spTake`                 | Takes only the first n items from an array signal                          |
| `spMerge`                | Combines multiple signals into one, emitting when any input signal changes |
| `spCombineLatest`        | Combines multiple signals, emitting arrays of the latest values from each  |

## Form Handling

The `spForm` namespace provides specialized signals for form inputs with built-in validation, transformation, and debouncing:

```typescript
import { spForm } from "ngx-signal-plus";
import { computed } from "@angular/core";

// Text input with validation and debounce
const username = spForm.text("", {
  minLength: 3,
  maxLength: 20,
  debounce: 300,
});

// Email input with validation
const email = spForm.email("", {
  debounce: 500,
});

// Number input with range validation
const age = spForm.number({
  min: 0,
  max: 120,
  initial: 30,
  debounce: 300,
});

// Form validation
const isFormValid = computed(() => username.isValid() && email.isValid() && age.isValid());

// Form submission
const handleSubmit = () => {
  if (!isFormValid()) {
    // Show error
    return;
  }

  // Submit form
  submit({
    username: username.value(),
    email: email.value(),
    age: age.value(),
  });
};
```

### Form Signal Options

#### Text Input Options (FormTextOptions)

```typescript
interface FormTextOptions {
  minLength?: number; // Minimum length requirement
  maxLength?: number; // Maximum length requirement
  debounce?: number; // Debounce time in milliseconds
}
```

#### Email Input Options

Email inputs use the same options as text inputs but include automatic email format validation.

#### Number Input Options (FormNumberOptions)

```typescript
interface FormNumberOptions {
  min?: number; // Minimum value allowed
  max?: number; // Maximum value allowed
  debounce?: number; // Debounce time in milliseconds
  initial?: number; // Initial value
}
```

## Form Groups

Group multiple form controls together with aggregated state, validation, and persistence:

```typescript
import { spFormGroup, spForm } from "ngx-signal-plus";

const loginForm = spFormGroup({
  email: spForm.email(""),
  password: spForm.text("", { minLength: 8 }),
});

// Access aggregated state
loginForm.isValid(); // Signal<boolean>
loginForm.isDirty(); // Signal<boolean>
loginForm.isTouched(); // Signal<boolean>
loginForm.value(); // Signal<{ email: string; password: string }>
loginForm.errors(); // Signal<Record<string, string[]>>

// Methods
loginForm.setValue({ email: "user@example.com", password: "secret123" });
loginForm.patchValue({ email: "new@example.com" });
loginForm.reset();
loginForm.markAsTouched();
loginForm.submit(); // Returns values if valid, null otherwise
```

## Async State Management

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

## Collection Management

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
todos.addMany([todo1, todo2]);
todos.update("1", { completed: true });
todos.updateMany([{ id: "1", changes: { completed: true } }]);
todos.remove("1");
todos.removeMany(["1", "2"]);
todos.clear();

// Query operations
todos.findById("1"); // O(1) lookup
todos.filter((t) => t.completed);
todos.find((t) => t.completed);
todos.some((t) => t.completed);
todos.every((t) => t.completed);

// Transform operations
todos.sort((a, b) => a.title.localeCompare(b.title));
todos.map((t) => t.title);
todos.reduce((acc, t) => acc + (t.completed ? 1 : 0), 0);

// History operations
todos.undo();
todos.redo();
todos.canUndo();
todos.canRedo();

// Reactive signals
todos.value(); // Signal<Todo[]>
todos.count(); // Signal<number>
todos.isEmpty(); // Signal<boolean>
```

## Reactive Queries

### Overview

Query-style server state management with caching, invalidation, background refetching, mutations, and optimistic updates.

### Core APIs

```typescript
import { QueryClient, setGlobalQueryClient } from "ngx-signal-plus";
import { spQuery, spMutation } from "ngx-signal-plus";

const queryClient = new QueryClient();
setGlobalQueryClient(queryClient);
```

#### spQuery

```typescript
const userQuery = spQuery({
  queryKey: ["user", "1"],
  queryFn: async () => fetch("/api/user/1").then((r) => r.json()),
  staleTime: 5000,
  cacheTime: 300000,
  retry: 3,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 10000,
  refetchIntervalInBackground: false,
});

userQuery.data();
userQuery.isLoading();
userQuery.isFetching();
await userQuery.refetch();
userQuery.invalidate();
```

#### spMutation

```typescript
const updateUser = spMutation({
  mutationFn: async (name: string) => updateUserAPI(name),
  onMutate: (name) => {
    queryClient.setQueryData(["user", "1"], (prev) => ({ id: (prev as { id: number; name: string } | undefined)?.id ?? 1, name }), true);
  },
  onSuccess: () => queryClient.refetchQueries(["user", "1"]),
});
```

#### QueryClient

```typescript
queryClient.setQueryData(["todos"], (prev) => [...((prev as any[]) ?? []), { title: "New" }], true);
await queryClient.refetchQueries(["todos"]);
queryClient.getQueryData(["todos"]);
queryClient.getQueryState(["todos"]);
queryClient.isFetching();
queryClient.isMutating();
```

### Options

`spQuery` options include `queryKey`, `queryFn`, `staleTime`, `cacheTime`, `retry`, `retryDelay`, `enabled`, `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchInterval`, `refetchIntervalInBackground`, `initialData`, `placeholderData`, `structuralSharing`, `onSuccess`, `onError`, `onSettled`.

`spMutation` options include `mutationFn`, `onMutate`, `onSuccess`, `onError`, `onSettled`, `retry`, `retryDelay`.

### Patterns

- Optimistic updates via `setQueryData`
- Invalidate queries to mark stale and refetch active observers
- Background refetch strategies: focus, reconnect, interval
- Enabled gating with boolean or signal

### Notes

- `refetchOnWindowFocus` and `refetchOnReconnect` rely on `window` events; safe in browser environments
- Background fetch errors are suppressed in automated flows to avoid unhandled rejections

## Transactions and Batching

When working with multiple related signals, it's often necessary to update them together in a coordinated way. ngx-signal-plus provides two mechanisms for this:

1. **Transactions**: Atomic operations with automatic rollback on failure
2. **Batching**: Simple grouping of updates without rollback capability

### Transactions

Transactions ensure that a group of signal updates either all succeed together or all fail together with automatic rollback to the initial state.

#### Basic Usage

```typescript
import { spTransaction, sp } from "ngx-signal-plus";

const balance = sp(100).build();
const cart = sp<string[]>([]).build();

// All changes succeed or all are rolled back
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
```

#### Error Handling

If any operation inside a transaction throws an error or fails validation, all changes are automatically rolled back:

```typescript
try {
  spTransaction(() => {
    counter1.setValue(10);
    counter2.setValue(-5); // If counter2 has validation for positive values
    counter3.setValue(15);
  });
} catch (error) {
  // All signals remain unchanged
  console.error("Transaction failed:", error);
}
```

#### When to Use Transactions

Use transactions when:

- Multiple signals represent a single logical state
- Partial updates would leave your application in an inconsistent state
- You need automatic rollback capability
- You're updating related form fields that must be updated together

### Batching

Batching groups multiple signal updates without providing rollback capabilities. It's useful for performance optimization and avoiding unnecessary intermediate reactions.

#### Basic Usage

```typescript
import { spBatch, sp } from "ngx-signal-plus";

const signal1 = sp(0).build();
const signal2 = sp(0).build();
const signal3 = sp(0).build();

// All operations happen as a batch for better performance
spBatch(() => {
  signal1.setValue(1);
  signal2.setValue(2);
  signal3.setValue(3);
  // All changes applied together efficiently
});
```

#### Error Handling

Unlike transactions, batching doesn't roll back if an error occurs:

```typescript
try {
  spBatch(() => {
    counter1.setValue(10); // This update stays
    counter2.setValue(-5); // If this fails validation
    counter3.setValue(15); // This won't execute
  });
} catch (error) {
  // counter1 is updated, others depend on whether they executed before the error
  console.error("Batch operation failed:", error);
}
```

#### When to Use Batching

Use batching when:

- Performance is a concern
- Multiple independent signals need updating
- Complete rollback isn't necessary
- You're making bulk updates to multiple signals

### Best Practices

1. **Keep transactions short and focused**
   - Long transactions increase the risk of conflicts and performance issues

2. **Avoid nested transactions**
   - Nested transactions are explicitly disallowed

3. **Handle transaction errors gracefully**
   - Always use try/catch when working with transactions

4. **Consider batching for performance critical code**
   - Batching can significantly improve performance in UI updates

5. **Test transaction behavior thoroughly**
   - Ensure proper rollback behavior in error cases

### Common Patterns

#### Form Updates

```typescript
// Update multiple form fields atomically
spTransaction(() => {
  nameField.setValue(user.name);
  emailField.setValue(user.email);
  addressField.setValue(user.address);
});
```

#### State Synchronization

```typescript
// Keep multiple pieces of state in sync
spTransaction(() => {
  userState.setValue(newUserData);
  permissionsState.setValue(newPermissions);
  preferencesState.setValue(newPreferences);
});
```

#### Counter Operations

```typescript
// Update multiple counters efficiently
spBatch(() => {
  visitsCounter.setValue(visitsCounter.value + 1);
  totalCounter.setValue(totalCounter.value + 1);
});
```

### API Reference

#### `spTransaction<T>(fn: () => T): T`

Executes a function as an atomic transaction with automatic rollback on error.

Parameters:

- `fn`: Function containing signal operations

Returns:

- The return value of the provided function

Throws:

- Any error that occurred during execution, after performing rollback

#### `spBatch<T>(fn: () => T): T`

Executes a function as a batch operation without rollback capabilities.

Parameters:

- `fn`: Function containing signal operations

Returns:

- The return value of the provided function

Throws:

- Any error that occurred during execution (no rollback)

#### `spIsTransactionActive(): boolean`

Checks if a transaction is currently active.

Returns:

- `true` if a transaction is active, `false` otherwise

#### `spIsInTransaction<T>(signal: SignalPlus<T>): boolean`

Checks if a signal is part of an active transaction.

Parameters:

- `signal`: The signal to check

Returns:

- `true` if the signal is in an active transaction, `false` otherwise

#### `spIsInBatch<T>(signal?: SignalPlus<T>): boolean`

Checks if a batch operation is currently active or if a specific signal is part of an active batch.

Parameters:

- `signal` (optional): The signal to check

Returns:

- `true` if a batch is active or the signal is in an active batch, `false` otherwise

#### `spGetModifiedSignals(): SignalPlus<any>[]`

Gets all signals that have been modified in the current transaction.

Returns:

- Array of signals modified in the current transaction, or empty array if no transaction is active

## Managers

Built-in managers for handling common state management patterns:

```typescript
import { spStorageManager, sp } from "ngx-signal-plus";

// Storage management (static class, no instantiation needed)
interface UserPreferences {
  theme: "light" | "dark";
  fontSize: number;
}

// Save with type checking
spStorageManager.save("user-prefs", {
  theme: "dark",
  fontSize: 16,
});

// Load with automatic type inference
const prefs = spStorageManager.load<UserPreferences>("user-prefs");
console.log(prefs?.theme); // 'dark'

// Remove from storage
spStorageManager.remove("user-prefs");

// History management through signals
const counter = sp(0)
  .withHistory(10) // Keep last 10 values
  .build();

counter.setValue(1);
counter.setValue(2);

// Navigate history
counter.undo(); // Back to 1
counter.redo(); // Back to 2

// Check history
console.log(counter.history()); // Array of past values
```

### History Manager API

```typescript
interface HistoryManager<T> {
  // Core functionality
  push(value: T): void; // Add a value to history
  undo(): T | undefined; // Move backward in history
  redo(): T | undefined; // Move forward in history

  // State checking
  canUndo(): boolean; // Check if undo is available
  canRedo(): boolean; // Check if redo is available

  // Current state
  current(): T; // Get current value

  // Management
  clear(): void; // Clear all history
  size(): number; // Get history size
  history(): T[]; // Get all history values (read-only)
}
```

### Storage Manager API

```typescript
interface StorageManager<T> {
  save(value: T): void; // Save value to storage
  load(): T | undefined; // Load value from storage
  remove(): void; // Remove value from storage
  getKey(): string; // Get storage key
  hasValue(): boolean; // Check if value exists in storage
  onChange(callback: Callback<T>): void; // Register change listener
}
```

## Validators and Presets

The library provides built-in validators and presets for common scenarios.

### Validators

The `spValidators` namespace contains ready-to-use validation functions for various data types:

```typescript
import { spValidators } from "ngx-signal-plus";
import { sp } from "ngx-signal-plus";

// String validation
const text = sp("")
  .validate(spValidators.string.required)
  .validate(spValidators.string.minLength(3))
  .validate(spValidators.string.maxLength(50))
  .validate(spValidators.string.email)
  .validate(spValidators.string.pattern(/^[A-Z]/))
  .build();

// Number validation
const number = sp(0).validate(spValidators.number.min(0)).validate(spValidators.number.max(100)).validate(spValidators.number.integer).validate(spValidators.number.between(18, 65)).build();

// Array validation
const array = sp([]).validate(spValidators.array.minLength(1)).validate(spValidators.array.maxLength(10)).validate(spValidators.array.unique()).build();

// Custom validation
const password = sp("")
  .validate((value) => {
    const hasUppercase = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*]/.test(value);

    return (hasUppercase && hasNumber && hasSpecial) || "Password must include uppercase, number, and special character";
  })
  .build();
```

### Validator Types

| Category | Validators                                                      |
| -------- | --------------------------------------------------------------- |
| String   | `required`, `minLength`, `maxLength`, `email`, `pattern`, `url` |
| Number   | `min`, `max`, `between`, `integer`, `positive`, `negative`      |
| Array    | `minLength`, `maxLength`, `unique`, `contains`                  |
| Object   | `required`, `hasKeys`, `schema`                                 |
| Custom   | Create custom validators with `spValidators.create()`           |

### Presets

The `spPresets` namespace provides ready-to-use configurations for common scenarios:

```typescript
import { spPresets } from "ngx-signal-plus";

// Form field presets
const username = spPresets.textField({
  initial: "",
  validators: [spValidators.string.required, spValidators.string.minLength(3)],
  debounce: 300,
  persistent: true,
  storageKey: "username",
});

// Counter preset
const counter = spPresets.counter({
  initial: 0,
  min: 0,
  max: 100,
  step: 5,
  withHistory: true,
  historySize: 10,
});

// Toggle preset
const darkMode = spPresets.toggle({
  initial: false,
  persistent: true,
  storageKey: "theme-mode",
  onChange: (value) => {
    // Apply theme change
    document.body.classList.toggle("dark-theme", value);
  },
});

// Search input preset
const searchInput = spPresets.searchInput({
  initial: "",
  debounce: 500,
  minLength: 3,
  onSearch: async (term) => {
    // Perform search operation
    const results = await searchApi(term);
    // Handle results
  },
});
```

### Available Presets

| Preset        | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `textField`   | Text input with validation, debouncing, and optional persistence |
| `counter`     | Numeric counter with min/max limits, step size, and history      |
| `toggle`      | Boolean toggle with persistence and change callback              |
| `searchInput` | Debounced search input with minimum length and search callback   |
| `numberInput` | Number input with range limits, step size, and validation        |
| `selectInput` | Selection from predefined options with validation                |

## Types and Interfaces

Type definitions for better TypeScript integration:

```typescript
import type { SignalPlus, SignalOptions, BuilderOptions, FormTextOptions, FormNumberOptions, Validator, Transform, ErrorHandler, SignalHistory, SignalState } from "ngx-signal-plus";

// Create typed signal
const signal: SignalPlus<number> = sp(0).build();

// Form text options
const textOptions: FormTextOptions = {
  minLength: 3,
  maxLength: 20,
  debounce: 300,
};

// Form number options
const numberOptions: FormNumberOptions = {
  min: 0,
  max: 100,
  debounce: 300,
  initial: 50,
};

// Custom validator type
const validator: Validator<string> = (value: string) => {
  return value.length > 0;
};

// Custom transform type
const transform: Transform<number> = (value: number) => {
  return Math.abs(value);
};

// Error handler type
const errorHandler: ErrorHandler = (error: Error) => {
  console.error(error);
};
```

### Key Type Definitions

```typescript
// Core signal interface
type SignalPlus<T> = {
  value(): T;
  setValue(value: T): void;
  previousValue(): T | undefined;
  isValid(): boolean;
  errors(): string[];
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  history(): T[];
  resetHistory(): void;
  subscribe(callback: (value: T) => void): () => void;
  destroy(): void;
  reset(): void;
};

// Validator function type
type Validator<T> = (value: T) => boolean | string | void;

// Transform function type
type Transform<T> = (value: T) => T;

// Error handler function type
type ErrorHandler = (error: Error) => void;
```

## Cleanup and Memory Management

ngx-signal-plus provides automatic and manual cleanup to prevent memory leaks:

### Automatic Cleanup

When the last subscriber unsubscribes, the signal automatically cleans up:

- Storage event listeners (for `localStorage` synchronization)
- Debounce/throttle timers
- All subscribers
- Pending operations

```typescript
import { sp } from "ngx-signal-plus";

const signal = sp(0).persist("counter").debounce(100).build();

// Subscribe
const unsubscribe = signal.subscribe((value) => console.log(value));

// When done, unsubscribe
unsubscribe(); // Automatically cleans up if this was the last subscriber

// Can re-subscribe later - signal reinitializes resources
signal.subscribe((value) => console.log("New:", value));
```

### Manual Cleanup

For explicit cleanup regardless of subscriber count:

```typescript
const signal = sp(0).persist("data").build();
signal.subscribe((value) => console.log(value));

// Later, explicitly destroy the signal
signal.destroy(); // Cleans up all resources immediately
```

### Component Lifecycle

Use cleanup in Angular components:

```typescript
import { Component, OnDestroy } from "@angular/core";
import { sp } from "ngx-signal-plus";

@Component({
  selector: "app-example",
  template: `<div>{{ counter.value() }}</div>`,
})
export class ExampleComponent implements OnDestroy {
  counter = sp(0).persist("counter").build();
  private unsubscribe: (() => void) | null = null;

  ngOnInit() {
    this.unsubscribe = this.counter.subscribe((value) => console.log("Counter changed:", value));
  }

  ngOnDestroy() {
    // Option 1: Unsubscribe (automatic cleanup if last subscriber)
    this.unsubscribe?.();

    // Option 2: Explicit cleanup
    // this.counter.destroy();
  }
}
```

**SSR-Safe:** All cleanup operations work safely in server-side rendering environments.

## Best Practices

### Performance Optimization

1. Use `spDistinctUntilChanged` to prevent unnecessary updates when values haven't changed
2. Apply `spDebounceTime` for input fields or frequent updates
3. Use `spThrottleTime` for scroll or resize events
4. Implement proper cleanup in components using `onDestroy`
5. Use `spMerge` and `spCombineLatest` efficiently for combining signals
6. Keep history size limited when using `withHistory()`
7. Use `computed` for derived state to minimize recalculations

### Type Safety

1. Always specify generic types for signals and managers
2. Use built-in validators for form inputs
3. Implement comprehensive error handlers
4. Use the simplified API functions for common patterns
5. Define interfaces for complex state objects
6. Take advantage of TypeScript's inference with the API

### State Management

1. Use `spHistoryManager` for undo/redo functionality
2. Implement `spStorageManager` for persistent state
3. Use signal enhancement with `enhance` for complex state
4. Apply appropriate validation rules
5. Organize related signals using services
6. Consider the state hierarchy in larger applications

## Advanced Usage

### Custom Operators

Create custom operators for specific needs:

```typescript
import { SignalOperator, Signal, computed } from "@angular/core";

// Custom operator that doubles the value
function double<T extends number>(): SignalOperator<T, T> {
  return (source: Signal<T>) =>
    computed(() => {
      return source() * 2;
    });
}

// Custom operator with parameters
function multiply(factor: number): SignalOperator<number, number> {
  return (source: Signal<number>) =>
    computed(() => {
      return source() * factor;
    });
}

// Usage
const value = signal(5);
const doubled = value.pipe(double());
const multiplied = value.pipe(multiply(3));
```

### Complex State Management

Handle complex state scenarios:

```typescript
import { signal, effect } from "@angular/core";
import { enhance } from "ngx-signal-plus";

interface User {
  id: string;
  name: string;
}

interface Preferences {
  theme: "light" | "dark";
  fontSize: number;
}

interface Theme {
  mode: "light" | "dark";
  primary: string;
  secondary: string;
}

interface AppState {
  user: User;
  preferences: Preferences;
  theme: Theme;
}

const initialState: AppState = {
  user: { id: "", name: "" },
  preferences: { theme: "light", fontSize: 16 },
  theme: { mode: "light", primary: "#007bff", secondary: "#6c757d" },
};

// Validation function
const validateState = (state: AppState): boolean => {
  return !!state.user.id && !!state.user.name;
};

// Normalization function
const normalizeState = (state: AppState): AppState => {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      theme: state.preferences.theme || "light",
      fontSize: state.preferences.fontSize || 16,
    },
  };
};

// Error handler
const handleError = (error: Error): void => {
  console.error("State error:", error);
};

const state = enhance(signal<AppState>(initialState)).persist("app-state").validate(validateState).transform(normalizeState).debounce(300).withHistory().onError(handleError).build();

// Update specific parts of state
state.setValue({
  ...state.value(),
  theme: { ...state.value().theme, mode: "dark" },
});

// Track state changes using the effect API
const trackChanges = effect(() => {
  const newState = state.value();
  // analytics.trackStateChange(newState);
  console.log("State updated:", newState);
});

// Cleanup when no longer needed
// trackChanges.destroy(); // When needed
```

### Complex Form Validation

Implement complex form validation with custom logic:

```typescript
import { spForm } from "ngx-signal-plus";
import { enhance } from "ngx-signal-plus";
import { computed, signal, effect } from "@angular/core";

// Password with custom validation
const password = spForm.text("", {
  minLength: 8,
  debounce: 300,
});

// Confirmation field with custom validation
const passwordConfirm = enhance(signal(""))
  .validate((value) => {
    if (value !== password.value()) {
      return "Passwords do not match";
    }
    return true;
  })
  .debounce(300)
  .build();

// Update confirmation validation when password changes
const passwordEffect = effect(() => {
  const pwd = password.value();
  // This will trigger validation on passwordConfirm
  passwordConfirm.setValue(passwordConfirm.value());
});

// Combined form validation
const isPasswordValid = computed(() => password.isValid() && passwordConfirm.isValid() && password.value().length >= 8);

// Clean up effect when done
// passwordEffect.destroy(); // When needed
```

### Integration with Angular Forms

Integrate with Angular's forms using a custom approach:

```typescript
import { Component, inject } from "@angular/core";
import { FormGroup, FormControl, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { spForm, spSignalPlusComponent } from "ngx-signal-plus";
import { effect } from "@angular/core";

// Define submit function type
interface UserData {
  username: string;
  email: string;
}

type SubmitFn = (data: UserData) => void;

@Component({
  selector: "app-user-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, spSignalPlusComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div>
        <label for="username">Username</label>
        <input id="username" type="text" formControlName="username" />

        @if (!usernameSignal.isValid()) {
          <div class="error">Username must be 3-20 characters</div>
        }
      </div>

      <div>
        <label for="email">Email</label>
        <input id="email" type="email" formControlName="email" />

        @if (!emailSignal.isValid()) {
          <div class="error">Please enter a valid email</div>
        }
      </div>

      <button type="submit" [disabled]="!isValid()">Submit</button>

      @if (formSubmitted) {
        <div class="success">Form submitted successfully!</div>
      }
    </form>

    <div class="form-preview">
      <h3>Form Data Preview</h3>
      @if (isValid()) {
        <dl>
          <dt>Username:</dt>
          <dd>{{ usernameSignal.value() }}</dd>
          <dt>Email:</dt>
          <dd>{{ emailSignal.value() }}</dd>
        </dl>
      } @else {
        <p>Please fill out the form correctly</p>
      }
    </div>
  `,
})
export class UserFormComponent {
  form = new FormGroup({
    username: new FormControl(""),
    email: new FormControl(""),
  });

  // Enhanced signals
  usernameSignal = spForm.text("", { minLength: 3, maxLength: 20 });
  emailSignal = spForm.email("");
  formSubmitted = signal(false);

  // Optional: Submit function that could be injected
  private submit: SubmitFn = inject(SUBMIT_TOKEN, { optional: true }) || ((data) => console.log("Form submitted:", data));

  constructor() {
    // Sync Angular form value to signal
    effect(() => {
      const usernameValue = this.form.get("username")?.value;
      if (usernameValue !== undefined && usernameValue !== this.usernameSignal.value()) {
        this.usernameSignal.setValue(usernameValue);
      }

      const emailValue = this.form.get("email")?.value;
      if (emailValue !== undefined && emailValue !== this.emailSignal.value()) {
        this.emailSignal.setValue(emailValue);
      }
    });

    // Optionally sync signal values back to the form
    effect(() => {
      const username = this.usernameSignal.value();
      this.form.get("username")?.setValue(username, { emitEvent: false });

      const email = this.emailSignal.value();
      this.form.get("email")?.setValue(email, { emitEvent: false });
    });
  }

  isValid(): boolean {
    return this.usernameSignal.isValid() && this.emailSignal.isValid();
  }

  onSubmit() {
    if (this.isValid()) {
      this.submit({
        username: this.usernameSignal.value(),
        email: this.emailSignal.value(),
      });
      this.formSubmitted.set(true);
    }
  }
}

// Injection token definition (would be in a separate file)
import { InjectionToken } from "@angular/core";
export const SUBMIT_TOKEN = new InjectionToken<SubmitFn>("submit.function");
```

## Troubleshooting

### Common Issues and Solutions

1. **Storage Errors**: If you encounter errors with the persistence feature, check that the storage quota hasn't been exceeded and that the browser has permission to use localStorage.

   ```typescript
   // Safer storage implementation
   const counter = sp(0)
     .persist("counter")
     .onError((error) => {
       console.warn("Storage error:", error);
       // Continue without persistence
     })
     .build();
   ```

2. **Memory Leaks**: Make sure to clean up effects and subscriptions in components:

   ```typescript
   import { Component } from "@angular/core";
   import { effect } from "@angular/core";
   import { sp, spSignalPlusComponent } from "ngx-signal-plus";

   @Component({
     standalone: true,
     selector: "app-counter",
     imports: [spSignalPlusComponent],
     template: `
       <div>Count: {{ counter.value() }}</div>
       <button (click)="increment()">+</button>
       <button (click)="decrement()">-</button>

       @if (counter.value() > 10) {
         <div class="warning">High value!</div>
       }

       <div>History:</div>
       @if (counter.history().length > 0) {
         <button (click)="counter.undo()">Undo</button>
       }
     `,
   })
   export class YourComponent {
     counter = sp(0).withHistory(10).build();

     // Effect cleanup is handled automatically by spSignalPlusComponent
     constructor() {
       // This effect will be automatically cleaned up
       effect(() => {
         console.log("Counter changed:", this.counter.value());
       });
     }

     increment() {
       this.counter.setValue(this.counter.value() + 1);
     }

     decrement() {
       this.counter.setValue(this.counter.value() - 1);
     }

     // For manual cleanup if needed:
     // ngOnDestroy() {
     //   this.counterEffect.destroy();
     // }
   }
   ```

3. **Performance Issues**: If you notice performance problems, consider:
   - Limiting history size
   - Using `distinctUntilChanged` for signals that update frequently
   - Using `debounce` or `throttle` for rapid updates
   - Reducing the complexity of computed values

4. **Validation Errors**: If validation is not working as expected:
   - Check your validator functions
   - Ensure validators return boolean values or error messages
   - Check the validation chain order

   ```typescript
   // Debugging validators
   const counter = sp(0)
     .validate((value) => {
       console.log("Running validator 1:", value);
       return value >= 0;
     })
     .validate((value) => {
       console.log("Running validator 2:", value);
       return value <= 100;
     })
     .build();
   ```
