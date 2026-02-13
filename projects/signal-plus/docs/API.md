# ngx-signal-plus API

This file documents the full public API exported by `projects/signal-plus/src/public-api.ts`.

## Table of Contents

- [Requirements](#requirements)
- [Install](#install)
- [Core Signal Creation](#core-signal-creation)
- [Enhance Existing Angular Signals](#enhance-existing-angular-signals)
- [SignalBuilder (exported as `spSignalBuilder`)](#signalbuilder-exported-as-spsignalbuilder)
- [SignalPlus Interface (runtime behavior)](#signalplus-interface-runtime-behavior)
- [Operators](#operators)
- [Computed Enhancement](#computed-enhancement)
- [Form Groups](#form-groups)
- [Async State](#async-state)
- [Collection Utilities](#collection-utilities)
- [Middleware / Plugin System](#middleware--plugin-system)
- [Transactions and Batching](#transactions-and-batching)
- [Reactive Queries](#reactive-queries)
- [Schema Validation Helpers](#schema-validation-helpers)
- [Presets and Validators](#presets-and-validators)
- [Managers](#managers)
- [Error Utilities](#error-utilities)
- [Angular Component and Service Exports](#angular-component-and-service-exports)
- [SSR Safety](#ssr-safety)
- [Exported Types](#exported-types)

## Requirements

- Angular `>=16`
- TypeScript `>=5`

## Install

```bash
npm install ngx-signal-plus
```

## Core Signal Creation

### `sp(initialValue)`

Creates a configurable signal builder for any value type, with validation, transforms, persistence, and history support.

```ts
import { sp } from 'ngx-signal-plus';

const price = sp(10)
  .validate((v) => v >= 0)
  .transform((v) => Math.round(v * 100) / 100)
  .withHistory(10)
  .build();

price.setValue(12.499);
console.log(price.value); // 12.5
```

### `spCounter(initial?, { min?, max? })`

Creates a number-focused signal with optional min/max constraints and built-in history behavior.

```ts
import { spCounter } from 'ngx-signal-plus';

const counter = spCounter(0, { min: 0, max: 5 });
counter.update((v) => v + 1);
console.log(counter.value);
```

### `spToggle(initial?, key?)`

Creates a boolean signal optimized for toggle state, with optional local persistence via a storage key.

```ts
import { spToggle } from 'ngx-signal-plus';

const darkMode = spToggle(false, 'theme-mode');
darkMode.update((v) => !v);
console.log(darkMode.value);
```

### `spForm`

Provides ready-made form-oriented signal factories for text, email, and number input patterns.

```ts
import { spForm } from 'ngx-signal-plus';

const name = spForm.text('', { minLength: 3, maxLength: 20, debounce: 250 });
const email = spForm.email('', { debounce: 250 });
const age = spForm.number({ initial: 18, min: 0, max: 120, debounce: 200 });

console.log(name.value, name.isValid());
console.log(email.value, email.isValid());
console.log(age.value, age.isValid());
```

## Enhance Existing Angular Signals

### `enhance(signal)`

Wraps an existing Angular signal with the SignalBuilder API so you can add advanced behavior incrementally.

```ts
import { signal } from '@angular/core';
import { enhance } from 'ngx-signal-plus';

const base = signal(1);
const enhanced = enhance(base)
  .persist('enhanced-number')
  .distinct()
  .withHistory(5)
  .build();

enhanced.setValue(2);
console.log(enhanced.value);
```

## SignalBuilder (exported as `spSignalBuilder`)

```ts
import { spSignalBuilder } from 'ngx-signal-plus';

const s = new spSignalBuilder(0)
  .validate((n) => n >= 0)
  .debounce(100)
  .onError(console.error)
  .build();

s.setValue(1);
```

Common builder methods:

- `validate`, `validateAsync`
- `transform`, `map`, `filter`
- `debounce`, `distinct`
- `persist`, `withHistory`
- `onError`, `build`

## SignalPlus Interface (runtime behavior)

`SignalPlus<T>` uses property-style values and signal-style reactive flags:

```ts
interface SignalPlus<T> {
  value: T;
  previousValue: T;
  initialValue: T;
  signal: Signal<T>;
  writable: WritableSignal<T>;
  set(value: T): void;
  setValue(value: T): void;
  update(fn: (current: T) => T): void;
  reset(): void;
  validate(): boolean;
  isValid: Signal<boolean>;
  isValidating: Signal<boolean>;
  asyncErrors: Signal<string[]>;
  isDirty: Signal<boolean>;
  hasChanged: Signal<boolean>;
  history: Signal<T[]>;
  undo(): void;
  redo(): void;
  subscribe(cb: (value: T) => void): () => void;
  pipe<R>(...ops: any[]): SignalPlus<R>;
  destroy(): void;
}
```

## Operators

### `spMap`, `spFilter`

Applies projection and predicate-style filtering to signal streams in a pipe-friendly way.

```ts
import { signal } from '@angular/core';
import { spMap, spFilter } from 'ngx-signal-plus';

const n = signal(2);
const mapped = n.pipe(spMap((v) => v * 10));
const filtered = n.pipe(spFilter((v) => v > 0));
```

### `spDebounceTime`, `spThrottleTime`, `spDelay`

Adds time-based control over signal emissions for smoothing bursts or deferring updates.

```ts
import { signal } from '@angular/core';
import { spDebounceTime, spThrottleTime, spDelay } from 'ngx-signal-plus';

const input = signal('');
const debounced = input.pipe(spDebounceTime(300));
const throttled = input.pipe(spThrottleTime(100));
const delayed = input.pipe(spDelay(200));
```

### `spDistinctUntilChanged`, `spSkip`, `spTake`

Helps reduce noise by removing duplicates and limiting which emissions are passed through.

```ts
import { signal } from '@angular/core';
import { spDistinctUntilChanged, spSkip, spTake } from 'ngx-signal-plus';

const source = signal([1, 2, 3, 4]);
const distinct = source.pipe(spDistinctUntilChanged());
const skipped = source.pipe(spSkip(1));
const taken = source.pipe(spTake(2));
```

### `spMerge`, `spCombineLatest`

Combines multiple signals either by forwarding latest changes or by synchronizing latest values.

```ts
import { signal } from '@angular/core';
import { spMerge, spCombineLatest } from 'ngx-signal-plus';

const a = signal(1);
const b = signal(2);

const merged = spMerge(a, b);
const combined = spCombineLatest([a, b]);
```

## Computed Enhancement

### `spComputed(fn, options?)`

Creates a derived SignalPlus value with optional validation, transform, persistence, and history tracking.

```ts
import { signal } from '@angular/core';
import { spComputed } from 'ngx-signal-plus';

const first = signal('John');
const last = signal('Doe');

const fullName = spComputed(() => `${first()} ${last()}`, {
  persist: 'full-name',
  historySize: 5,
  validate: (v) => v.length > 0,
});

console.log(fullName.value);
```

Note: `pipe()` is intentionally not supported for `spComputed` and throws.

## Form Groups

### `spFormGroup(config, options?)`

Combines multiple controls into a structured group with aggregate validity, touched/dirty state, and errors.

```ts
import { spForm, spFormGroup } from 'ngx-signal-plus';

const login = spFormGroup(
  {
    email: spForm.email(''),
    password: spForm.text('', { minLength: 8 }),
  },
  {
    persistKey: 'login-form',
    validators: [(v) => (v.password.length >= 8 ? true : 'Password too short')],
  },
);

login.patchValue({ email: 'user@example.com' });
console.log(login.value(), login.isValid(), login.errors());
```

## Async State

### `spAsync(options)`

Builds a reusable async state container with loading, error, retry, cache, and manual refetch controls.

```ts
import { spAsync } from 'ngx-signal-plus';

const users = spAsync<{ id: string; name: string }[]>({
  fetcher: () => fetch('/api/users').then((r) => r.json()),
  initialValue: null,
  retryCount: 2,
  retryDelay: 300,
  cacheTime: 5000,
  autoFetch: true,
});

await users.refetch();
console.log(users.data(), users.loading(), users.error());
```

## Collection Utilities

### `spCollection(options)`

Creates an ID-based collection helper for CRUD, querying, and optional undo/redo history support.

```ts
import { spCollection } from 'ngx-signal-plus';

type Todo = { id: string; title: string; done: boolean };

const todos = spCollection<Todo>({
  idField: 'id',
  initialValue: [],
  persist: 'todos',
  withHistory: true,
});

todos.add({ id: '1', title: 'Write docs', done: false });
todos.update('1', { done: true });
console.log(todos.findById('1'));
console.log(todos.count(), todos.isEmpty());
```

## Middleware / Plugin System

### Register middleware (`spUseMiddleware`)

Registers middleware hooks that run during signal updates for cross-cutting concerns.

```ts
import { spUseMiddleware, spLoggerMiddleware } from 'ngx-signal-plus';

spUseMiddleware(spLoggerMiddleware('[APP]'));
```

### Analytics middleware (`spAnalyticsMiddleware`)

Sends normalized signal change events to your tracking or telemetry pipeline.

```ts
import { spUseMiddleware, spAnalyticsMiddleware } from 'ngx-signal-plus';

spUseMiddleware(
  spAnalyticsMiddleware((event) => {
    console.log(event.name, event.oldValue, event.newValue, event.timestamp);
  }),
);
```

### Manage middleware (`spRemoveMiddleware`, `spClearMiddleware`, `spGetMiddlewareCount`)

Provides lifecycle controls for middleware registration and registry inspection.

```ts
import {
  spRemoveMiddleware,
  spClearMiddleware,
  spGetMiddlewareCount,
} from 'ngx-signal-plus';

console.log(spGetMiddlewareCount());
spRemoveMiddleware('sp-logger');
spClearMiddleware();
```

## Transactions and Batching

### `spTransaction`

Runs a block atomically and rolls back tracked signal changes if an error occurs.

```ts
import { sp, spTransaction } from 'ngx-signal-plus';

const a = sp(0).build();
const b = sp(0).build();

spTransaction(() => {
  a.setValue(10);
  b.setValue(20);
});
```

### `spBatch`

Groups multiple updates into a single batch context for coordinated state changes.

```ts
import { sp, spBatch } from 'ngx-signal-plus';

const x = sp(1).build();
const y = sp(2).build();

spBatch(() => {
  x.setValue(x.value + 1);
  y.setValue(y.value + 1);
});
```

### Transaction state helpers

Exposes runtime flags and tracked-signal helpers for transaction and batch-aware logic.

```ts
import {
  spIsTransactionActive,
  spIsInTransaction,
  spIsInBatch,
  spGetModifiedSignals,
} from 'ngx-signal-plus';

console.log(spIsTransactionActive());
console.log(spIsInTransaction(a));
console.log(spIsInBatch(a));
console.log(spGetModifiedSignals());
```

## Reactive Queries

### Setup `QueryClient`

Initializes query caching behavior and defaults used by query and mutation helpers.

```ts
import { QueryClient, setGlobalQueryClient } from 'ngx-signal-plus';

const client = new QueryClient({
  defaultOptions: { staleTime: 3000, retry: 1 },
});

setGlobalQueryClient(client);
```

### `spQuery` / `createQuery`

Defines reactive, cached server-state reads with refetching and stale-state handling.

```ts
import { spQuery, createQuery } from 'ngx-signal-plus';

const usersQuery = spQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then((r) => r.json()),
  staleTime: 5000,
});

const userQuery = createQuery(
  ['user', '1'],
  () => fetch('/api/user/1').then((r) => r.json()),
  { retry: 2 },
);

await usersQuery.refetch();
usersQuery.invalidate();
```

### `spMutation` / `createMutation`

Defines tracked write operations with loading/error/success state and retry hooks.

```ts
import { spMutation, createMutation } from 'ngx-signal-plus';

const saveUser = spMutation({
  mutationFn: (payload: { name: string }) =>
    fetch('/api/user', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.json()),
});

await saveUser.mutate({ name: 'Jane' });

const deleteUser = createMutation((id: string) =>
  fetch(`/api/user/${id}`, { method: 'DELETE' }).then((r) => r.json()),
);

await deleteUser.mutateAsync('1');
```

### Global client getter

Returns the shared query client instance so you can invalidate or update cache globally.

```ts
import { getGlobalQueryClient } from 'ngx-signal-plus';

const qc = getGlobalQueryClient();
qc.invalidateQueries(['users']);
```

## Schema Validation Helpers

### `spSchema`

Converts a schema parser into a boolean validator compatible with signal validation APIs.

```ts
import { z } from 'zod';
import { spSchema } from 'ngx-signal-plus';

const userSchema = z.object({ email: z.string().email() });
const validateUser = spSchema(userSchema);

console.log(validateUser({ email: 'a@b.com' })); // true
```

### `spSchemaWithErrors`

Returns structured `{ valid, errors }` output for schema-based validation workflows.

```ts
import { z } from 'zod';
import { spSchemaWithErrors } from 'ngx-signal-plus';

const schema = z.object({ age: z.number().min(18) });
const validateWithErrors = spSchemaWithErrors(schema);

console.log(validateWithErrors({ age: 12 }));
```

### `spSchemaValidator`

Provides both boolean and detailed-error validation methods from a single schema adapter.

```ts
import { z } from 'zod';
import { spSchemaValidator } from 'ngx-signal-plus';

const schema = z.object({ name: z.string().min(1) });
const validator = spSchemaValidator(schema);

console.log(validator.validate({ name: '' }));
console.log(validator.validateWithErrors({ name: '' }));
```

## Presets and Validators

### `spPresets`

Offers preconfigured builders for common scenarios like counters, toggles, and search fields.

```ts
import { spPresets } from 'ngx-signal-plus';

const c = spPresets.counter({ initial: 0, min: 0, max: 100 }).build();
const t = spPresets.toggle(false).build();
const f = spPresets.formInput({ initial: '', debounce: 200 }).build();
const s = spPresets.searchField('').build();
const p = spPresets.persistentToggle(false, 'pref-key').build();

console.log(c.value, t.value, f.value, s.value, p.value);
```

### `spValidators`

Provides reusable validator helpers grouped by type, including async validator factories.

```ts
import { spValidators } from 'ngx-signal-plus';

const isPositive = spValidators.number.positive(5);
const isShortEnough = spValidators.string.maxLength(10)('hello');
const asyncUnique = spValidators.async.unique(async (v: string) => v !== 'taken');

console.log(isPositive, isShortEnough);
await asyncUnique('new-name');
```

## Managers

### `spHistoryManager`

Low-level history utility for manual undo/redo stacks outside SignalPlus instances.

```ts
import { spHistoryManager } from 'ngx-signal-plus';

const history = new spHistoryManager<number>(0);
history.push(1);
history.push(2);
console.log(history.undo());
console.log(history.redo());
```

### `spStorageManager`

SSR-safe local storage helper with namespacing and typed load/save methods.

```ts
import { spStorageManager } from 'ngx-signal-plus';

spStorageManager.save('user-settings', { theme: 'dark' });
const settings = spStorageManager.load<{ theme: string }>('user-settings');
spStorageManager.remove('user-settings');
console.log(settings, spStorageManager.isAvailable());
```

## Error Utilities

### `SpError`, `SP_ERRORS`, `spCreateError`, `formatSpError`

Standardized error model and helpers for consistent diagnostics and guidance across the library.

```ts
import {
  SpError,
  SpErrorCode,
  SP_ERRORS,
  spCreateError,
  formatSpError,
} from 'ngx-signal-plus';

const e1 = spCreateError(SpErrorCode.INIT_001);
const e2 = new SpError(SpErrorCode.VAL_001);

console.log(SP_ERRORS.INIT_001.message);
console.log(formatSpError(SpErrorCode.VAL_001, 'Validation failed'));
console.log(e1, e2);
```

## Angular Component and Service Exports

### `spSignalPlusComponent`

Standalone Angular demo component that showcases core `ngx-signal-plus` capabilities.

```ts
import { Component } from '@angular/core';
import { spSignalPlusComponent } from 'ngx-signal-plus';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [spSignalPlusComponent],
  template: `<lib-signal-plus />`,
})
export class DemoComponent {}
```

### `spSignalPlusService`

Injectable service wrapper for creating signals through a service-oriented API style.

```ts
import { inject } from '@angular/core';
import { spSignalPlusService } from 'ngx-signal-plus';

const signalPlus = inject(spSignalPlusService);
const state = signalPlus.createSimple(0, { history: true });

state.setValue(1);
console.log(state.value);
```

## SSR Safety

The library guards browser-specific behavior internally (`localStorage`, `window`, event listeners, timers), so all features are safe to import and run in SSR.

## Exported Types

The package also exports all primary types for strong typing:

- Core: `SignalPlus`, `BuilderOptions`, `SignalOptions`, `SignalHistory`, `SignalState`, `Validator`, `Transform`, `ErrorHandler`, `AsyncValidator`
- Forms: `FormTextOptions`, `FormNumberOptions`, `FormGroupOptions`, `FormGroupConfig`, `SignalFormGroup`, `FormGroupValidator`
- Async/Collection: `AsyncStateOptions`, `SignalAsync`, `CollectionOptions`, `SignalCollection`
- Middleware: `MiddlewareContext`, `SignalMiddleware`
- Schema: `SchemaLike`, `SafeParseLike`, `SchemaValidationResult`, `ZodError`, `ZodErrorIssue`, `ZodLike`
- Queries: `QueryKey`, `QueryOptions`, `QueryState`, `QueryResult`, `MutationOptions`, `MutationState`, `MutationResult`
- Errors: `SpErrorCode`, `SpErrorContext`, `SpErrorInfo`




