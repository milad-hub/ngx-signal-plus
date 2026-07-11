# ngx-signal-plus examples

This Angular 20 standalone application consumes the workspace build of `ngx-signal-plus` through the `signal-plus` TypeScript path alias.

## Run locally

```bash
npm run start:examples
```

For a public GitHub repository, [open the same workspace in StackBlitz](https://stackblitz.com/github/milad-hub/ngx-signal-plus?startScript=start:examples). The root `.stackblitzrc` runs the same startup command after dependencies install.

Build the library first when invoking Angular directly:

```bash
npm run build:lib
npx ng serve examples
```

## Included example

- Counter and enhancement: `sp()`, validation, persistence, history, undo/redo, and Angular `computed`.
- Todo collection: `spCollection()` CRUD, derived filters, persistence, and history.
- Form validation: grouped validated signals through `spFormGroup()`.
- Editor: bounded history with undo, redo, and reset.
- Async state and query: `spAsync()`, `spQuery()`, and `spMutation()` with deterministic local delays.
- Shopping cart: structured state, derived totals, and `spBatch()`.
- Diagnostics: `spDebug` and `spMonitor` state inspection.

See [API_COVERAGE.md](API_COVERAGE.md) for the complete public-API mapping.

## Adding an example

Keep examples inside this application, import only from `signal-plus`, and add focused tests for state transitions or validation behavior.
