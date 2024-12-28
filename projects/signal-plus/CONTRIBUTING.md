# Contributing to Signal Plus

This document provides guidelines for contributing to Signal Plus.

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

1. Fork the repository
2. Clone your fork
3. Install dependencies

## Development Workflow

1. Create a new branch
2. Make changes following coding standards
3. Run tests
4. Run linting

## Testing Guidelines

### Unit Tests

- Write tests for new features and bug fixes
- Maintain test coverage above 80%
- Follow the AAA pattern (Arrange, Act, Assert)

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

## Pull Request Process

1. Update documentation for any new features
2. Add/update tests
3. Ensure all tests pass
4. Update changelog if applicable
5. Submit PR against the `main` branch
6. Request review from maintainers

### PR Title Format

- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- test: Test updates
- refactor: Code refactoring
- chore: Maintenance tasks

## Coding Standards

### TypeScript Guidelines

- Use strict mode
- Proper type annotations
- No `any` types unless absolutely necessary
- Document public APIs with JSDoc

### Angular Guidelines

- Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- Use Angular CLI for generating components/services
- Implement proper lifecycle hooks
- Handle cleanup in `ngOnDestroy`

### Code Style

```typescript
// Use interfaces for type definitions
interface Config {
  property: string;
}

// Document public methods
/**
 * Method description
 * @param param Parameter description
 * @returns Return value description
 */
public method(param: string): void {
  // Implementation
}
```

## Documentation

### API Documentation

- Update API.md for new features
- Include code examples
- Document breaking changes
- Update type definitions

### Code Comments

- Use JSDoc for public APIs
- Add inline comments for complex logic
- Keep comments up-to-date

## Release Process

1. Version Update

   - Follow semantic versioning
   - Update CHANGELOG.md
   - Update package.json version

2. Testing

   - Run full test suite
   - Verify documentation
   - Check bundle size

3. Publishing
   - Build production version
   - Publish to npm
