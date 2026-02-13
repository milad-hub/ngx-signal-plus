# Changelog

All notable changes to `ngx-signal-plus` are documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and is formatted using [Keep a Changelog](https://keepachangelog.com/).

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

- `spSchemaValidator()` for schema validation with detailed error extraction.
- Improved schema validation ergonomics for integration with external schema libraries.

## [2.3.0]

### Added

- Schema validation utilities for signal workflows (`spSchema` family foundation).

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

