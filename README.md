# ngx-signal-plus

[![Angular 16-21](https://img.shields.io/badge/Angular-16--21-dd0031)](https://angular.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-97ca00)](LICENSE)
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

- Angular peer dependencies: `>=16.0.0 <22.0.0`
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

The package declares Angular peer dependencies for Angular 16 through 21. The npm badge above shows the published version. The repository includes build, test, lint, and formatting scripts. Releases follow [Semantic Versioning](https://semver.org/); see the [changelog](projects/signal-plus/CHANGELOG.md) for documented release history.

## Deprecation Policy

Deprecated public APIs are marked in JSDoc and announced in the [changelog](projects/signal-plus/CHANGELOG.md). They remain available for at least one MINOR release and are removed only in a MAJOR release.

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
npm run check:lib
npm run smoke:lib
```

### Consumer Smoke Builds

`npm run smoke:lib` packs the library and installs the tarball into throwaway
applications pinned to the ends of the supported Angular range, then builds each
one and runs a spec suite against a real signal, operator, query, and form
group. The workspace suite compiles against one Angular version only, so this is
the only check that sees version-dependent breakage.

```bash
npm run smoke:lib                          # every default lane
npm run smoke:lib -- --only=16             # one lane
npm run smoke:lib -- --only=20             # the optional control lane
npm run smoke:lib -- --keep                # leave the applications in place afterwards
npm run smoke:lib -- --skip-pack           # reuse the tarball from the previous run
npm run smoke:lib -- --legacy-peer-deps    # ignore the declared peer range while installing
```

The default lanes are Angular 16 and 21, the ends of the declared peer range,
plus Angular 22, the next major. An Angular 20 control lane matching the
workspace is available through `--only=20`; it is the fastest way to tell a real
defect apart from a broken harness. `--legacy-peer-deps` separates a manifest
problem from a code problem: if a lane installs and passes only with that flag,
the defect is in `peerDependencies`, not in the library.

The applications are generated outside the repository, under
`%TEMP%/ngx-signal-plus-smoke` or `$TMPDIR/ngx-signal-plus-smoke`, so the
workspace's own `node_modules` cannot satisfy an import the published package
should have satisfied. Override the location with `--dir=<path>`.

Lanes are declared in [`scripts/smoke/targets.json`](scripts/smoke/targets.json)
and share one application in [`scripts/smoke/app`](scripts/smoke/app). Exit code
`0` means every lane passed, `1` means a lane failed, and `2` means a lane was
skipped because the local Node.js version is older than that Angular version
requires. A failed lane's application is left on disk for inspection.

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

- [Code of Conduct](.github/CODE_OF_CONDUCT.md) — Contributor Covenant 2.1
- [Security policy](SECURITY.md) — report vulnerabilities privately, not as an issue
- [Report a bug](https://github.com/milad-hub/ngx-signal-plus/issues/new?template=bug_report.yml) or [request a feature](https://github.com/milad-hub/ngx-signal-plus/issues/new?template=feature_request.yml)

`main` cannot be force-pushed or deleted, and squash is the only merge method. See the [branch and merge policy](projects/signal-plus/CONTRIBUTING.md#branch-and-merge-policy).

## Changelog

Read the [changelog](projects/signal-plus/CHANGELOG.md) for release history.

## License

[MIT](LICENSE) © Milad Jokar
