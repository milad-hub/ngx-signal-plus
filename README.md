# ngx-signal-plus (Repository)

This README is for contributors and maintainers of the repository.

For npm package usage, examples, and API highlights, use:
- `projects/signal-plus/README.md`
- https://www.npmjs.com/package/ngx-signal-plus

## Project Purpose

`ngx-signal-plus` is an Angular library that extends Angular Signals with:
- validation and presets,
- persistence and history,
- form/form-group helpers,
- collection and async-state utilities,
- reactive-query style APIs,
- transaction and batching helpers.

## Repository Layout

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
README.md            (this file, contributor-facing)
```

## Development Setup

Requirements:
- Node `>=18.13.0`
- npm

Install dependencies:

```bash
npm install
```

## Common Scripts

```bash
npm run build:lib
npm run test:lib
npm run test:lib:coverage
npm run lint:lib
npm run format:check:lib
```

## Quality Rules

These are enforced working rules for this repository:

1. Every implementation change must be covered by tests.
2. Shared interfaces/types belong in `projects/signal-plus/src/lib/models`.
3. Comments/docs should be necessary, concise, and human-written.
4. Do not add comments to `*.spec.ts` files.
5. Prefer simple, focused changes that follow existing project patterns.

## Documentation Ownership

- Root `README.md` (this file): repository/GitHub contributor guidance.
- `projects/signal-plus/README.md`: npm consumer documentation.
- `projects/signal-plus/docs/API.md`: full API reference.

## Current API Notes

- `spComputed()` is modeled as `ReadonlySignalPlus<T>` (read-only computed surface).
- `SignalPlus<T>` includes `errors: Signal<string[]>` for validation error access.

## Release Notes

- Changelog: `projects/signal-plus/CHANGELOG.md`

## Contributing

Please read:
- `projects/signal-plus/CONTRIBUTING.md`

## License

MIT
