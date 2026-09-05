# Contributing to ngx-signal-plus

Thank you for considering contributing to ngx-signal-plus! This document provides guidelines to help you contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Branch and Merge Policy](#branch-and-merge-policy)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project adopts the [Contributor Covenant](../../.github/CODE_OF_CONDUCT.md),
version 2.1. By participating you are expected to uphold it. Report unacceptable
behaviour to the maintainer at the address given in that file.

## Getting Started

### Prerequisites

- Node.js `>=20.19.0` for the current Angular 20 workspace
- npm

Use the repository's local Angular CLI through npm scripts; no global Angular CLI installation is required.

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/ngx-signal-plus.git
   cd ngx-signal-plus
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the upstream remote:
   ```bash
   git remote add upstream https://github.com/milad-hub/ngx-signal-plus.git
   ```
5. Build the library:
   ```bash
   npm run build:lib
   ```

## Development Workflow

1. Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes
   git checkout -b fix/issue-description
   ```

2. Make your changes following our coding standards

3. Run tests to ensure your changes don't break existing functionality:

   ```bash
   npm run test:lib
   ```

4. Run linting:

   ```bash
   npm run check:lib
   ```

5. Commit your changes following the commit message format:

   ```
   type(scope): description

   [optional body]

   [optional footer]
   ```

6. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing Guidelines

### Unit Tests

- Write tests for new features and bug fixes
- Maintain test coverage above 80%
- Follow the AAA pattern (Arrange, Act, Assert)
- Use Angular's TestBed for component/service testing
- Use Jasmine for test assertions
- Do not add comments to `*.spec.ts` files

### Test Structure

```typescript
describe("Component/Service name", () => {
  describe("Feature/Method name", () => {
    it("should describe expected behavior", () => {
      expect(true).toBe(true);
    });
  });
});
```

### Testing Signals

When testing signals, remember to:

- Test the initial state
- Test state changes
- Test side effects (if any)
- Test cleanup behavior
- Verify validation logic

Example:

```typescript
describe("spCounter", () => {
  it("should update within min/max constraints", () => {
    const counter = spCounter(5, { min: 0, max: 10 });

    counter.setValue(10);

    expect(counter.value).toBe(10);
  });
});
```

### Consumer Smoke Builds

The workspace suite compiles against one Angular version, so it cannot see a
defect that only appears at one end of the supported peer range. `npm run
smoke:lib` closes that gap: it packs the library, installs the tarball into a
throwaway application for each Angular version in
`scripts/smoke/targets.json`, builds it, and runs a spec suite that exercises a
signal, an operator, a query, and a form group through the published entry
point.

```bash
npm run smoke:lib                          # every default lane
npm run smoke:lib -- --only=16             # one lane
npm run smoke:lib -- --only=20             # the optional control lane
npm run smoke:lib -- --keep                # leave the applications in place afterwards
npm run smoke:lib -- --skip-pack           # reuse the tarball from the previous run
npm run smoke:lib -- --legacy-peer-deps    # ignore the declared peer range while installing
```

The default lanes are Angular 16 and 21 — the ends of the declared peer range —
plus Angular 22, the next major. Reach for `--legacy-peer-deps` when a lane fails
during install: if the lane then installs and passes, the defect is in
`peerDependencies` rather than in the library, and the two should never be
reported as the same thing.

Run it before any change to the public surface, to an operator, or to the
package manifest, and read the exit code rather than the last line of output:
`0` means every lane passed, `1` means a lane failed, and `2` means a lane was
skipped because the local Node.js version is older than that Angular version
requires. Angular 22 needs Node.js 24.15.0 or newer, which is stricter than the
workspace's own `>=20.19.0`.

The generated applications live outside the repository, under
`%TEMP%/ngx-signal-plus-smoke` or `$TMPDIR/ngx-signal-plus-smoke`, so nothing
resolves through the workspace's `node_modules`. A failed lane is left on disk
so its output can be inspected.

A lane carrying an `expectedFailure` note is red because of a defect that is
already recorded and scheduled; the note names it and prints before the lane
runs. Clear the note in the same change that fixes the defect, so a lane never
stays red without an explanation attached to it.

Add a lane by adding an entry to `scripts/smoke/targets.json`; a lane marked
`"optional": true` is skipped unless it is named with `--only`, which is how the
Angular 20 control lane is kept out of the default run. The control lane matches
the workspace and is the fastest way to tell a real defect apart from a broken
harness: if it fails, the problem is the harness.

The application in `scripts/smoke/app` is shared by every lane, so it may only
use APIs that exist across the whole supported range.

## Branch and Merge Policy

`main` is protected by a repository ruleset that blocks two operations outright:

- **Force-pushing to `main`** — rejected with `Cannot force-push to this branch`.
- **Deleting `main`** — rejected with `Cannot delete this branch`.

The ruleset has no bypass actors, so it applies to repository administrators
too. That is deliberate: on September 4, 2026 `main` was force-pushed and
deleted during a history cleanup, and a rule that exempts the one person able
to make that mistake would not have prevented it. An administrator can still
disable or delete the ruleset itself, so this is a guardrail against an
accident, not a lock against intent.

Pull requests are **not** required to merge into `main`. For a single
maintainer a mandatory review by nobody is ceremony, and it can be added the
day a second maintainer exists. Direct pushes that move `main` forward are
allowed; only rewriting or removing its history is not.

**Squash is the only merge method.** Merge commits and rebase merging are both
disabled, so `main` keeps one commit per merged branch and a linear history,
which is what makes the release-to-release diffs in the changelog meaningful.
Head branches are deleted automatically on merge.

The practical consequence for a contributor: keep each branch to one logical
change, and expect the squashed commit to be what lands. If you need to redo a
branch, delete and recreate the branch rather than force-pushing anything into
`main`.

The Wiki and Projects tabs are disabled. Discussions is disabled as well, so
questions belong in an issue for now.

## Pull Request Process

1. Update documentation for any new features
2. Add/update tests
3. Ensure all tests pass
4. Update changelog if applicable
5. Submit PR against the `main` branch
6. Request review from maintainers

### PR Title Format

Follow the Angular commit message format:

- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- test: Test updates
- refactor: Code refactoring
- chore: Maintenance tasks

### PR Description Template

GitHub fills a new pull request from
[`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md).
Keeping a second copy here would only let the two drift, so edit that file if
the checklist needs to change.

### Issue Templates

Bugs and feature requests are opened through forms in
[`.github/ISSUE_TEMPLATE`](../../.github/ISSUE_TEMPLATE). Blank issues are
disabled. The bug form asks for the library version, the Angular version, and
whether the application uses server-side rendering, because those three
determine which defects are even reachable — several are specific to one end of
the supported Angular range.

## Coding Standards

### Line Endings

Every text file in this repository is LF, in git and in your working copy alike.
`.gitattributes` sets `* text=auto eol=lf`, so git checks files out with LF on
every platform regardless of your `core.autocrlf` setting, which on a default
Git for Windows install is `true` and would otherwise hand you CRLF.

This is not a stylistic preference; it is what makes the format gate usable.
Prettier's `endOfLine` default is `lf`, so before `.gitattributes` existed
`npm run check:lib` failed on every file of a Windows checkout while passing on
Linux, and the failure read as "119 files need formatting" when most of those
files were fine. The alternative — a `.prettierrc` with `endOfLine: "auto"` —
would also have made the gate pass, but by teaching it to accept whatever line
endings it is given, which means CRLF could reach the repository unnoticed. The
gate is deliberately still strict about this: converting a single file to CRLF
fails `npm run check:lib`.

Do not set `core.autocrlf` per repository to work around anything here.
`.gitattributes` already overrides it, and a local override only desynchronises
your checkout from everyone else's.

### Formatting

`npm run check:lib` and `npm run check:examples` run ESLint and then
`prettier --check`. Both must pass before a pull request. There is no
`.prettierrc`: Prettier's defaults apply, with `.editorconfig` supplying
`indent_size`, `insert_final_newline`, `trim_trailing_whitespace`, and
single quotes for TypeScript. Adding a Prettier configuration file would give
the repository two places that decide formatting, so prefer changing
`.editorconfig` if a rule genuinely needs to move.

Run `npm run format:lib` to fix library formatting rather than adjusting code by
hand to satisfy the checker.

### TypeScript Guidelines

- Use strict mode
- Properly type all functions and variables
- No `any` types unless absolutely necessary
- Document public APIs with JSDoc
- Use ES6+ features where applicable
- Prefer interfaces over types for public APIs

### Angular Guidelines

- Follow the [Angular Style Guide](https://angular.dev/style-guide)
- Use Angular CLI for generating components/services
- Implement proper lifecycle hooks
- Prefer `inject()` and use `DestroyRef` for owner-scoped cleanup
- Use standalone components when possible
- Follow Angular's DI pattern

### Code Style and Structure

- Keep files focused and single-responsibility
- Group related functionality in appropriate directories
- Use consistent naming conventions:
  - Component files: `feature-name.component.ts`
  - Service files: `feature-name.service.ts`
  - Interface files: `feature-name.interface.ts`
  - Utility files: `feature-name.util.ts`

```typescript
// Use interfaces for type definitions
interface SignalOptions<T> {
  property: T;
  validation?: boolean;
}

// Document public methods
/**
 * Enhances a signal with additional functionality
 * @param signal The base signal to enhance
 * @returns A builder to configure the enhanced signal
 */
export function enhance<T>(signal: WritableSignal<T>): SignalBuilder<T> {
  // Implementation
}
```

## Documentation

All public APIs must be documented in the `API.md` file.

### API Documentation Guidelines

- Document all exported functions, classes, interfaces, and types
- Provide clear, concise descriptions
- Include code examples for common use cases
- Show both simple and advanced usage
- Keep examples up to date with the latest Angular syntax
- Use proper markdown formatting

### Documentation Format

````markdown
## Feature Name

Description of the feature and its purpose.

### Basic Usage

```typescript
// Code example showing basic usage
```

### Advanced Options

| Option  | Type   | Default   | Description            |
| ------- | ------ | --------- | ---------------------- |
| option1 | string | 'default' | Description of option1 |
| option2 | number | 0         | Description of option2 |

### Methods

#### methodName()

Description of method.

Parameters:

- `param1` (type): Description
- `param2` (type): Description

Returns:

- (ReturnType): Description of return value
````

### Code Comments

- Use JSDoc for public APIs
- Add inline comments for complex logic
- Keep comments up-to-date with code changes

## Release Process

1. Version Update
   - Follow semantic versioning (MAJOR.MINOR.PATCH)
     - MAJOR: Breaking changes
     - MINOR: New features, no breaking changes
     - PATCH: Bug fixes, no breaking changes
   - Update CHANGELOG.md
   - Update package.json version

2. Testing
   - Run full test suite: `npm run test:lib`
   - Run lint and formatting checks: `npm run check:lib`
   - Verify documentation is up-to-date
   - Build the production package: `npm run build:lib`

3. Publishing
   - Build production version:
     ```bash
     npm run build:lib
     ```
   - Publish to npm:
     ```bash
     cd dist/signal-plus
     npm publish
     ```
   - Create a GitHub release with release notes

Thank you for contributing to ngx-signal-plus!
