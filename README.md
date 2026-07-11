# ngx-signal-plus

[![Angular 16-21](https://img.shields.io/badge/Angular-16--21-dd0031)](https://angular.dev/)
[![npm version](https://img.shields.io/npm/v/ngx-signal-plus.svg)](https://www.npmjs.com/package/ngx-signal-plus)

Composable utilities for Angular Signals, including validation, persistence, history, collections, and query-style state.

## Key Features

- **Signal utilities** — builders, enhancement, composition, and operators.
- **Validation and schema helpers** — validators, presets, and schema adapters.
- **Persistence and history** — local storage support and undo/redo state history.
- **Forms and form groups** — signal-backed controls and grouped validation.
- **Async state and collections** — loading state and collection CRUD helpers.
- **Reactive queries and mutations** — query, mutation, dependent-query, and infinite-query primitives.
- **Transactions and batching** — coordinated updates and rollback support.
- **Middleware, debugging, and monitoring** — opt-in signal instrumentation and hooks.

## Installation

```bash
npm install ngx-signal-plus
```

## Requirements

- Angular peer dependencies: `>=16.0.0 <=21.0.0`
- Node.js `>=18.13.0`
- A TypeScript version supported by your Angular version

## Quick Start

```typescript
import { sp } from "ngx-signal-plus";

const count = sp(0).build();

console.log(count.value);
count.setValue(count.value + 1);
```

## Common Examples

```typescript
import { sp } from "ngx-signal-plus";

const preferences = sp({ theme: "system" }).persist("preferences").build();
const quantity = sp(1)
  .validate((value) => value > 0)
  .build();
const editor = sp("").withHistory(20).build();

editor.undo();
```

## Why This Library?

Angular Signals provide the core reactive primitive. This package adds optional, composable utilities when an application needs concerns such as validation, persistence, history, collections, transactions, or query-style state.

## Best Fit

Use `ngx-signal-plus` when your application already uses Angular Signals and needs lightweight utilities without adopting a complete store architecture.

Choose another approach when your team wants the NgRx Signal Store architecture, requires a dedicated server-state solution, or only needs Angular's native signal primitives.

## Core APIs

| Category                              | Purpose                                       | Key APIs                                                                                                                                  |
| ------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Signal creation and enhancement       | Create and extend signal-backed state.        | `sp`, `spCounter`, `spToggle`, `spForm`, `spComputed`, `enhance`                                                                          |
| Validation, persistence, and history  | Add constraints, storage, and state history.  | `spValidators`, `spSchema`, `spSchemaValidator`, `spHistoryManager`, `spStorageManager`                                                   |
| Forms and form groups                 | Build validated signal-backed form state.     | `spForm`, `spFormGroup`                                                                                                                   |
| Async state and collections           | Model async values and mutable collections.   | `spAsync`, `spCollection`                                                                                                                 |
| Reactive queries                      | Manage query, mutation, and pagination state. | `spQuery`, `spMutation`, `spInfiniteQuery`, `createQuery`, `createMutation`, `createInfiniteQuery`, `createDependentQuery`, `QueryClient` |
| Transactions and batching             | Coordinate related state updates.             | `spTransaction`, `spBatch`                                                                                                                |
| Middleware, debugging, and monitoring | Add hooks and inspect signal behavior.        | `spUseMiddleware`, `spRemoveMiddleware`, `spLoggerMiddleware`, `spAnalyticsMiddleware`, `spDebug`, `spMonitor`, `spEffect`                |
| Operators and composition             | Transform and combine signal streams.         | `spMap`, `spFilter`, `spDebounceTime`, `spThrottleTime`, `spDelay`, `spDistinctUntilChanged`, `spCombine`, `spAll`, `spAny`               |

See the [API reference](projects/signal-plus/docs/API.md) for the complete public API.

## Comparison

| Tool                       | Primary focus                       | When it may fit better                                                                   |
| -------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Angular native signals     | Core reactive primitives            | You only need Angular's built-in signal APIs.                                            |
| NgRx Signals               | Signal Store-based state management | Your application adopts a structured store architecture.                                 |
| TanStack Query for Angular | Server-state fetching and caching   | Server-state lifecycle is the main concern.                                              |
| Akita                      | RxJS store/query architecture       | You maintain an existing Akita application or prefer its store model.                    |
| ngx-signal-plus            | Composable signal utilities         | You want optional signal-focused helpers without adopting a complete store architecture. |

## Documentation

- [API reference](projects/signal-plus/docs/API.md)
- [Examples application](projects/examples/README.md) and [API coverage map](projects/examples/API_COVERAGE.md)
- [npm package](https://www.npmjs.com/package/ngx-signal-plus)
- [Issues](https://github.com/milad-hub/ngx-signal-plus/issues)

## Examples

Run the Angular 20 workspace examples locally with `npm run start:examples`. The application covers signal enhancement, collections, forms, history, async state, queries, mutations, batching, debugging, and monitoring.

[Open the examples in StackBlitz](https://stackblitz.com/github/milad-hub/ngx-signal-plus?startScript=start:examples)

## Project Status

The package declares Angular peer dependencies from 16.0.0 through 21.0.0. The npm badge above shows the published version. The repository includes build, test, lint, and formatting scripts. Releases follow [Semantic Versioning](https://semver.org/); see the [changelog](projects/signal-plus/CHANGELOG.md) for documented release history.

## Development

### Repository Layout

```text
projects/signal-plus/
  src/lib/
    core/
    managers/
    models/
    operators/
    reactive-queries/
    utils/
  docs/API.md
  README.md          (npm-facing)
README.md            (GitHub-facing)
```

### Development Setup

The current Angular 20 workspace requires Node.js `>=20.19.0` and npm.

```bash
npm install
```

### Common Scripts

```bash
npm run build:lib
npm run test:lib
npm run test:lib:coverage
npm run lint:lib
npm run format:check:lib
```

### Quality Rules

1. Every implementation change must be covered by tests.
2. Shared interfaces and types belong in `projects/signal-plus/src/lib/models`.
3. Comments and documentation should be necessary, concise, and human-written.
4. Do not add comments to `*.spec.ts` files.
5. Prefer simple, focused changes that follow existing project patterns.

### Documentation Ownership

- Root `README.md`: GitHub package overview and repository guidance.
- `projects/signal-plus/README.md`: npm consumer documentation.
- `projects/signal-plus/docs/API.md`: full API reference.

## Contributing

Read the [contributing guide](projects/signal-plus/CONTRIBUTING.md) before opening a pull request.

## Changelog

Read the [changelog](projects/signal-plus/CHANGELOG.md) for release history.

## License

MIT
