# ngx-signal-plus

[![Angular 16-21](https://img.shields.io/badge/Angular-16--21-dd0031)](https://angular.dev/)
[![npm version](https://img.shields.io/npm/v/ngx-signal-plus.svg)](https://www.npmjs.com/package/ngx-signal-plus)
![Coverage](https://img.shields.io/badge/coverage-89.14%25-brightgreen)

Bring validation, persistence, undo/redo, and reactive queries to Angular Signals on Angular 16+.

- Interactive playground: https://stackblitz.com/github/milad-hub/ngx-signal-plus
- Full API docs: https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md
- Repository README (contributors): https://github.com/milad-hub/ngx-signal-plus/blob/main/README.md

## Installation

```bash
npm install ngx-signal-plus
```

## Requirements

- Angular `>=16.0.0 <=21.0.0`
- TypeScript `>=5.0.0`

## Why this library?

| Capability | Angular native | ngx-signal-plus |
| --- | --- | --- |
| Signal validation and validation helpers | Limited | `sp().validate()`, presets, schema helpers |
| localStorage persistence | Manual | `sp().persist()` |
| Undo/redo history | Manual | `sp().withHistory()` |
| Transaction rollback | Manual | `spTransaction()` |
| Middleware/interceptors | No built-in | `spUseMiddleware()` |
| Query cache/retry/invalidation | `resource/httpResource` (basic) | `spQuery()`, `spMutation()`, `QueryClient` |
| Collection CRUD helpers | Manual | `spCollection()` |

## Quick Start

```typescript
import { Component, computed } from "@angular/core";
import { sp } from "ngx-signal-plus";

@Component({
  standalone: true,
  selector: "app-counter",
  template: `
    <p>Count: {{ counter.value }}</p>
    <p>Doubled: {{ doubled() }}</p>
    <button (click)="inc()">+</button>
    <button (click)="dec()">-</button>
    @if (counter.history().length > 1) {
      <button (click)="counter.undo()">Undo</button>
    }
  `,
})
export class CounterComponent {
  counter = sp(0).persist("counter").withHistory(10).validate((n) => n >= 0).build();
  doubled = computed(() => this.counter.value * 2);

  inc() {
    this.counter.setValue(this.counter.value + 1);
  }

  dec() {
    if (this.counter.value > 0) this.counter.setValue(this.counter.value - 1);
  }
}
```

## Core APIs

- Signal creation: `sp`, `spCounter`, `spToggle`, `spForm`, `spComputed`
- Signal enhancement: `enhance`
- Operators: `spMap`, `spFilter`, `spDebounceTime`, `spThrottleTime`, `spDelay`, `spDistinctUntilChanged`
- Forms and groups: `spForm`, `spFormGroup`
- Async helpers: `spAsync`, `spCollection`
- Reactive queries: `spQuery`, `spMutation`, `QueryClient`, `setGlobalQueryClient`
- Transactions: `spTransaction`, `spBatch`
- Schema validation: `spSchema`, `spSchemaValidator`
- Middleware: `spUseMiddleware`, `spRemoveMiddleware`, `spLoggerMiddleware`, `spAnalyticsMiddleware`

## Comparisons

### ngx-signal-plus vs Angular native signals

- Angular provides core signal primitives (signal, computed, effect) and now also resource/httpResource for async patterns.
- ngx-signal-plus focuses on higher-level utilities on top of signals: validation, persistence, undo/redo, middleware, transactions, collections, and query-style helpers.
- Angular resource and httpResource are still marked experimental in Angular docs.

### ngx-signal-plus vs NgRx Signals (@ngrx/signals)

- NgRx Signals is a full state-management approach centered on Signal Store architecture (store features, methods/hooks, and structured app state patterns).
- ngx-signal-plus is intentionally lighter: composable utilities that keep you close to native Angular signal usage without adopting a full store architecture.
- @ngrx/signals is actively maintained (current npm line is 20.x).

### ngx-signal-plus vs TanStack Query (Angular)

- TanStack Query is a dedicated server-state library (fetching, cache lifecycle, invalidation, retries, mutations).
- The Angular adapter package is @tanstack/angular-query-experimental, and TanStack currently labels it experimental.
- ngx-signal-plus includes query-style capabilities inside one package that also covers local signal utilities.

### ngx-signal-plus vs Akita

- Akita is a store-centric architecture built around RxJS stores/queries.
- ngx-signal-plus is signal-first and utility-first, designed for composable local/global signal state without store boilerplate.
- Akita is no longer actively evolving like modern signal-first tools: the npm package is old (8.0.1, last published years ago), and the GitHub repository is archived.
## Documentation

- API documentation: https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/docs/API.md
- Contributing guide: https://github.com/milad-hub/ngx-signal-plus/blob/main/projects/signal-plus/CONTRIBUTING.md
- Issues: https://github.com/milad-hub/ngx-signal-plus/issues

## License

MIT
