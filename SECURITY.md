# Security Policy

## Supported versions

Fixes land on the latest released version only. There are no maintenance
branches for older releases.

| Version | Supported |
| ------- | --------- |
| 2.9.x   | Yes       |
| < 2.9   | No        |

## Reporting a vulnerability

Report privately through GitHub, not in a public issue:

1. Go to the [Security tab](https://github.com/milad-hub/ngx-signal-plus/security)
2. Choose **Report a vulnerability**

That opens a private advisory visible only to you and the maintainer. Please
include the library version, the Angular version, whether the application runs
with server-side rendering, and the smallest reproduction you can manage.

Expect an acknowledgement within a week. If a report is confirmed, the fix and
the advisory are published together.

## Scope

This is a client-side library with no server, no network calls of its own, and
one runtime dependency (`tslib`). The security surface is therefore what the
library can do to an application that installs it, and what untrusted input can
do through the library once it is installed.

Reports that are in scope include:

- State from `localStorage` or a cross-tab `storage` event reaching application
  state in a way the application cannot defend against. Persisted payloads are
  parsed and restored by the signal builder, `spComputed`, `spCollection`, and
  `spFormGroup`.
- Data from one server-side rendered request becoming visible to another. The
  query cache, the middleware registry, and the transaction context are
  currently module-scoped, so this is a known weakness rather than a
  hypothetical one.
- Validation that can be bypassed in a way that lets invalid state through a
  documented guard, including asynchronous validators.
- Disclosure of application state or storage keys through diagnostics that run
  in production builds.
- Vulnerabilities in any third-party code bundled into the published package.

Out of scope:

- Vulnerabilities in build and test tooling that never reaches a consuming
  application — Angular CLI, Karma, ESLint, Prettier, `ng-packagr` and their
  dependency trees. These are tracked through Dependabot instead.
- Storing sensitive data in `localStorage` through the persistence helpers.
  Browser storage is readable by any script on the origin; the persistence
  features are documented for non-sensitive state and are not an encryption
  boundary.
- Denial of service caused by deliberately pathological input from the
  application's own code, such as unbounded history sizes or deeply nested
  values passed to a signal.

## Known weaknesses

Some of the behavior described above is already known and scheduled rather than
undiscovered. Cross-request state sharing under server-side rendering and
unvalidated restoration of persisted payloads are both tracked, and the `ssr`
topic has been removed from this repository until the first is fixed. A report
that these exist is welcome but will be closed as already known; a report that
demonstrates a concrete exploitation path beyond them is valuable.
