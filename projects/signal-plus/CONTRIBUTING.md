# Contributing to ngx-signal-plus

Thank you for considering contributing to ngx-signal-plus! This document provides guidelines to help you contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project follows the [Angular Code of Conduct](https://github.com/angular/angular/blob/main/CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js (^18.13.0 || ^20.9.0)
- npm (latest stable version)
- Angular CLI (^19.0.0)

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
   ng build signal-plus
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
   ng test signal-plus
   ```

4. Run linting:

   ```bash
   ng lint
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

### Test Structure

```typescript
describe("Component/Service name", () => {
  describe("Feature/Method name", () => {
    it("should describe expected behavior", () => {
      // Test implementation
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
  it("should respect min/max constraints", () => {
    const counter = spCounter(5, { min: 0, max: 10 });

    counter.setValue(15);
    expect(counter.value()).toBe(10); // Should cap at max

    counter.setValue(-5);
    expect(counter.value()).toBe(0); // Should cap at min
  });
});
```

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

```
## Description
Brief description of the changes

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation (API.md)
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## Coding Standards

### TypeScript Guidelines

- Use strict mode
- Properly type all functions and variables
- No `any` types unless absolutely necessary
- Document public APIs with JSDoc
- Use ES6+ features where applicable
- Prefer interfaces over types for public APIs

### Angular Guidelines

- Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- Use Angular CLI for generating components/services
- Implement proper lifecycle hooks
- Handle cleanup in `ngOnDestroy`
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
````

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

   - Run full test suite: `ng test signal-plus`
   - Verify documentation is up-to-date
   - Check bundle size: `ng build signal-plus --configuration production`

3. Publishing

   - Build production version:
     ```bash
     ng build signal-plus --configuration production
     ```
   - Publish to npm:
     ```bash
     cd dist/signal-plus
     npm publish
     ```
   - Create a GitHub release with release notes

Thank you for contributing to ngx-signal-plus!
````
