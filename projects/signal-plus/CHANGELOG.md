# Changelog

All notable changes to `ngx-signal-plus` are documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and is formatted using [Keep a Changelog](https://keepachangelog.com/).

Every version heading below is a release of this package. Each is published to [npm](https://www.npmjs.com/package/ngx-signal-plus) when its branch merges to `main`, so the newest heading can briefly precede its own publish.

A few versions were bumped in this repository and never published. Their changes still reached consumers, inside the next release that actually shipped, and they are documented under that release rather than under a heading of their own: **2.3.0** is included in 2.4.0, **2.9.1** and **2.9.2** in 2.9.3, and **2.9.4**, **2.9.5** and **2.9.6** in 3.0.0. A changelog records what consumers received, so there is no heading for a version nobody could install. 2.9.4 and 2.9.5 changed only repository tooling and are not described below, because they altered nothing a consumer can observe.

Versions `1.0.0-beta.0` through `1.2.10` are tagged in git but have no GitHub release page. The entries below — including the combined `1.2.x` heading — are the record for that era; the tags remain for anyone who wants the exact tree.

## [3.0.5]

### Fixed

- `spToggle(initial, key)` no longer erases the value it is supposed to restore. It wrote `initial` to the storage key on every construction, before the builder read that key back, so the saved state was destroyed each time the toggle was created and a reload always came up with the initial value. The key is now seeded only when it holds nothing, and the builder's own restore path runs first — so a toggle constructed after `setValue(true)` reports `true`.

### Changed

- **Storage format:** a persisted `spToggle` now writes the plain value (`true`) rather than `{"value":true}`. It previously wrote both, through two competing paths: the builder's own persistence wrote the plain value on every write, and a hand-written `setValue` override then overwrote it with the wrapped shape — but only for `setValue`, so `update`, `reset`, `undo` and `redo` left the plain value in place and the stored shape depended on which method you called. The override is gone and `spToggle` now uses the same format as every other persisted signal. Existing wrapped payloads are still read correctly, so a stored `{"value":true}` restores and is rewritten in the new shape on the next write; only code that parses the storage key itself is affected.

## [3.0.4]

### Fixed

- `enhance(signal)` is now connected to the signal it is given. It read the source once and built an independent signal from that value, so the two were never related again: changes to the source were invisible to the enhanced signal, and writes to the enhanced signal never reached the source. Every feature layered on top — persistence, validation, history — operated on a detached copy. The enhanced signal and a writable source now share one underlying cell, so propagation is immediate in both directions, synchronous, and needs no injection context.
- Transforms and validators run on the enhanced signal's write path before the source is updated, so the source receives the transformed value and never receives one the validators rejected. `reset`, `undo` and `redo` write back the same way.
- A change made to the source between `enhance(signal)` and `.build()` is no longer overwritten. The builder captured the value at `enhance()` time and wrote it back during `build()`, discarding anything the source received in between. A persisted value still takes precedence at build time, and is now written through to the source so the two agree.
- A write made directly to the source now updates the enhanced signal's history, persistence and subscribers, not just its value, when `build()` runs in an injection context. Outside one the two still share a value and reads stay correct, but a direct source write updates only `value`.

### Changed

- **Behavior:** a signal enhanced from a read-only source — a `computed`, or any `Signal` without `set` and `update` — is now read through to that source, so its changes are visible through the enhanced signal. Writing to such a signal throws `SpError` `SRC_001` instead of silently updating a copy the source never sees. Code that wrote to an enhanced `computed` was already not affecting anything; it now says so.

## [3.0.3]

### Fixed

- `spBatch` now coalesces notifications. It set an internal active flag that no write path ever read, so every write inside a batch notified subscribers immediately and a batch behaved exactly like writing the signals one by one. Subscribers are now notified once per signal when the block exits, carrying that signal's final value, in order of first write. Debug recording and async validation are deferred with them, so a batch produces no intermediate reactions — the behavior the documentation has always described.
- Nested `spBatch` calls no longer break the outer batch. A nested call previously cleared the outer batch's state on entry and cleared its active flag on exit, ending the outer batch early. Nested calls now join the outermost batch, which owns the single flush.

### Changed

- Behavior on a failed batch is now defined: `spBatch` does not roll back, so if the block throws, the writes stand and the pending notifications are delivered before the error propagates, leaving no subscriber holding a stale value. A signal destroyed inside a batch delivers nothing, and a subscriber that writes during the flush notifies immediately.
- A write made while the batch is flushing supersedes anything still queued for that signal, so the flush can never follow a newer value with an older one. A batch opened by a subscriber during the flush joins that flush rather than starting a competing one.

## [3.0.2]

### Fixed

- `spTransaction` now rolls back. It never did: rollback only restored signals that had been registered by a prior `spIsInTransaction(signal)` call, and nothing in the library ever made that call, so a failing transaction restored nothing and the documented example silently kept its partial writes. Signals are now tracked automatically as they are written, so the documented usage works with no registration call. Writes through `set`, `setValue`, `update`, `reset`, `undo` and `redo` are all tracked.
- A signal written more than once in a transaction now rolls back to the value it held before the transaction began, rather than to an intermediate value, and is reported once in `spGetModifiedSignals()` in order of first write.
- Rollback no longer re-applies a signal's `transform` to the value it restores. Rollback wrote the saved value back through a path that transformed it again, so restoring a transformed signal produced a value that had been transformed twice and never existed.
- Rollback now restores history and the redo stack alongside the value. Restoring previously appended to history and discarded the redo stack, so undoing a step inside a failed transaction left the signal unable to redo it afterwards.

### Changed

- **Behavior:** `spIsInTransaction(signal)` now reports whether that specific signal has been written during the open transaction. It previously ignored its argument and returned `true` for any signal whenever a transaction was open, while silently registering the signal as a side effect. It is now a pure query: calling it neither registers a signal nor arms rollback. Code that called it to opt a signal into rollback can delete the call — tracking is automatic. Code that used it as "is a transaction open" should call `spIsTransactionActive()`.

## [3.0.1]

### Added

- The MIT license text now ships inside the package as `LICENSE`. `package.json` has declared `"license": "MIT"` since the first release and `ng-package.json` has listed `LICENSE` as an asset, but no such file existed anywhere in the repository, so the asset silently resolved to nothing and every published tarball claimed a license it did not include. The terms are unchanged — this adds the text that was always meant to be there.

## [3.0.0]

### Removed

- **Breaking:** `spSignalPlusComponent` is no longer exported. It was a demo component rendering a `lib-signal-plus` element, and it was the single reason this package could not be used on Angular 16 at all: it compiled to a declaration requiring Angular 17 or newer, and the Angular linker rejects an entire bundle on one such declaration. Removing it is what makes the Angular 16 support claimed below real. Everything it demonstrated is shown in the [examples application](https://github.com/milad-hub/ngx-signal-plus/tree/main/projects/examples), which never used the component. `spSignalPlusService` is unaffected and still exported.

### Fixed

- Angular 16 can now build against this package. It never could: every release since the first declared `>=16.0.0` while shipping a bundle the Angular 16 linker refuses. This is stated plainly rather than as a new restriction, because the support was advertised and never worked.
- Widened the peer range upper bound from `<=21.0.0` to `<22.0.0`. The old bound was a version comparison rather than a major-version range, so it admitted only Angular `21.0.0` exactly and rejected `21.0.1` and every release after it. Installing alongside a current Angular 21 failed with `ERESOLVE`. The library itself was always compatible; only the manifest was wrong.
- Removed the `./core`, `./operators`, `./utils` and `./models` subpath exports from the package manifest. These paths never resolved: they pointed at bundles ng-packagr does not emit, because this library has a single entry point and no secondary entry points were ever built. Importing any of them failed for every consumer on every release that declared them. The nonstandard `esm` export condition went with them.
- Everything the library exports has always been available from the package root, and still is: `import { sp, spMap, spQuery } from 'ngx-signal-plus'`. Nothing was removed from the public API, and no working import changed.

### Changed

- Angular peer dependencies are now `>=16.0.0 <22.0.0` for `@angular/common` and `@angular/core`.

## [2.9.3]

### Fixed

- Prevented stale `spAsync` fetches and retries from writing after `reset()`.
- Evicted expired query-cache entries through the cache and preserved `cacheTime: 0`.
- Evaluated cached-query `enabled` state per observer and kept shared refetch intervals active until the final observer unsubscribes.

## [2.9.0]

### Added

- Idempotent `destroy()` methods on `QueryResult` and `InfiniteQueryResult` for manual cleanup.

### Fixed

- Replaced signal-based query `enabled` polling with Angular effects when an injection context is available.
- Query and infinite-query cleanup now shares the Angular owner lifecycle.

## [2.8.1]

### Fixed

- Prevented cancelled query fetches from overwriting newer query state during cancel/refetch races.
- Centralized pending-debounce cleanup in `SignalBuilder`, including nullable debounced values and reset/undo/redo/destroy paths.
- Improved persisted-data error handling and server-mode/localStorage safety.
- Simplified transaction rollback, collection history restoration, and form-group dirty-state handling without changing their public APIs.

### Changed

- Simplified query and mutation retry loops while preserving retry behavior.
- Expanded focused coverage across core signals, managers, operators, queries, forms, middleware, monitoring, platform utilities, schemas, collections, and transactions.

## [2.8.0]

### Added

- `SignalBuilder.monitor(options)` for builder-level monitoring configuration.
- Runtime monitor integration in built signals so `set`, `setValue`, and `update` record metrics through `spMonitor`.
- Middleware runtime integration in built signals for `set`/`setValue`/`update` paths.
- Middleware error hook execution (`onError`) for validation failures and update callback errors.
- New middleware model types in `models/`: `MiddlewareContext` and `SignalMiddleware`.
- Integration tests covering monitor and middleware runtime behavior in `signal-builder.spec.ts`.

### Changed

- Middleware interfaces/types were moved from utility implementation to `models/` and re-exported through package type exports.
- API and README documentation updated for builder monitoring and runtime middleware execution behavior.

## [2.7.0]

### Added

- `spInfiniteQuery()` and `createInfiniteQuery()` for paginated and infinite-scroll query flows.
- `createDependentQuery()` for dependency-driven query activation.
- `spMonitor` utility for opt-in signal performance metrics (`getHotSignals`, `getSlowSignals`, `exportMetrics`).
- `InfiniteQueryOptions` and `InfiniteQueryResult` public types.
- `SpMonitorOptions` and `SignalPerformanceState` public types.

### Changed

- `spMutation()` now supports first-class optimistic cache updates via `optimisticUpdate` with rollback/invalidation controls.
- API and README documentation updated for query enhancements and monitoring APIs.

## [2.6.0]

### Added

- Developer-experience signal composition helpers: `spCombine`, `spAll`, and `spAny`.
- Debug utilities via `spDebug` with runtime state export and activation controls.
- `SignalBuilder.debug(label)` for opt-in signal update tracking.
- `spEffect()` utility with `condition` and `debounce` options and lifecycle controls (`pause`, `resume`, `destroy`).
- New developer-experience model types: `DebugSignalState`, `SpEffectOptions`, and `SpEffectController`.

### Changed

- Public API surface updated to export new developer-experience utilities and types.
- API/README documentation updated to include the new utilities and usage examples.

## [2.5.0]

### Added

- `ReadonlySignalPlus<T>` type and public export for read-only signal contracts.
- `errors: Signal<string[]>` on `SignalPlus<T>` for consistent synchronous validation error access.
- Support for validator return type `boolean | string` so validators can provide explicit error messages.

### Changed

- `spComputed()` now returns `ReadonlySignalPlus<T>` and no longer exposes mutable APIs (`set`, `setValue`, `update`, `pipe`).
- Refactored core `SignalBuilder` internals by extracting shared logic from `build()` into focused helpers (cloning, history sizing, circular-safe serialization, validation error collection) for maintainability.
- Updated API docs and README notes to align with the latest behavior and typing.

## [2.4.2]

### Added

- Rewritten API reference (`docs/API.md`) to cover the full public API with at least one example per feature.

### Changed

- Refined npm README structure for clearer package onboarding and core capability navigation.
- Updated README comparison section with current ecosystem positioning (Angular native signals, NgRx Signals, TanStack Query Angular, Akita).
- Improved reactive query type documentation comments/examples in `src/lib/reactive-queries/query-types.ts`.
- Expanded npm package keywords for better discoverability.
- Normalized changelog structure and rebuilt historical entries for consistency.

## [2.4.1]

### Added

- Structured error handling system (`SpError`) with error codes, context metadata, and formatting helpers.

### Changed

- Type/export cleanup for package surface consistency.

## [2.4.0]

### Added

- Schema validation utilities for signal workflows (`spSchema` family foundation).
- `spSchemaValidator()` for schema validation with detailed error extraction.
- Improved schema validation ergonomics for integration with external schema libraries.

## [2.2.0]

### Added

- Middleware system for signal operations:
  - `spUseMiddleware()`
  - `spRemoveMiddleware()`
  - `spClearMiddleware()`
  - `spGetMiddlewareCount()`
  - `spLoggerMiddleware()`
  - `spAnalyticsMiddleware()`

## [2.1.0]

### Added

- `spComputed()` for enhanced computed signals with persistence/history/validation options.

## [2.0.2]

### Fixed

- Reactive queries SSR compatibility improvements.
- Mutation cleanup and lifecycle stability fixes.

## [2.0.1]

### Added

- Expanded reactive query/mutation architecture and hooks.
- Query key utilities and core query/mutation type definitions.
- Query cache foundations (`Query`, `QueryCache`) with test coverage.

### Fixed

- Memory-leak and cleanup issues in query/mutation lifecycle.
- SSR safety and deterministic query-key hashing behavior.

## [2.0.0]

### Added

- TanStack Query-style server-state management primitives for Angular Signals.

## [1.6.0]

### Added

- Async validation support in `SignalBuilder` and `spForm`.
- Extended async validator coverage (including unique/custom scenarios).

## [1.5.0]

### Added

- `spCollection` utility for collection CRUD, persistence, and history.

## [1.4.2]

### Added

- `spAsync` utility for asynchronous state management with retry/caching/error handling.
- `AsyncStateOptions` and `SignalAsync` model/type support.

## [1.4.1]

### Changed

- Contributor workflow/docs and formatting consistency updates.

## [1.4.0]

### Added

- `spFormGroup` for aggregated form-control state, validation, and persistence.
- ESLint-based static analysis setup for Angular/TypeScript workflow.

## [1.3.1]

### Changed

- Improved `SignalBuilder` cleanup robustness and repeated-destroy handling.

## [1.3.0]

### Added

- `TransactionError` with richer transaction failure metadata/reporting.

## [1.2.30]

### Changed

- Final patch release in the 1.2.x reliability cycle.

## [1.2.x]

### Added

- Significant hardening of `SignalBuilder` history/debounce/reset/undo/redo behavior.
- Circular-reference safe serialization improvements.
- Additional utility improvements in forms/operators/signal-utils.
- Expanded SSR-related test coverage and cleanup lifecycle tests.

### Fixed

- Race conditions and debounce timing edge cases.
- Operator behavior consistency for null/undefined and empty-array scenarios.
- Persistence safety (`localStorage`) via SSR-safe wrappers.

### Changed

- Performance and memory improvements (history/redo limits, conditional cloning).
- Documentation improvements around cleanup, SSR, and bundle optimization.

## [1.2.0]

### Added

- Transaction and batching utilities with public exports and tests.
- Dedicated transaction model extraction (`transactions.models.ts`).

## [1.1.1]

### Changed

- Documentation and contributing-guide refresh.
- Broader test coverage across core/utils/operators/presets.

## [1.1.0]

### Added

- `enhance()` utility for advanced signal enhancement workflows.
- Form input model definitions and broader public API/type refinement.

## [1.0.1]

### Added

- Tree-shakeable submodule exports and packaging improvements.

### Changed

- Initial release stabilization (versioning/docs/keyword updates).
