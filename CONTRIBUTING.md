# Contributing to Lark Master MCP

Thank you for your interest in contributing to Lark Master MCP! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/lark-master-mcp.git`
3. Add upstream remote: `git remote add upstream https://github.com/IvyGain/lark-master-mcp.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- [`@larksuite/cli`](https://github.com/larksuite/cli) installed globally

### Install Dependencies

```bash
npm install
```

### Build All Packages

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Type Check

```bash
npm run typecheck
```

## Making Changes

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

**Examples**:
```
feat(mcp-server): add lark_calendar_delete_event tool

Implements the delete event functionality for Calendar tools.

Resolves #123
```

```
fix(webhook): handle missing event_type in Lark events

Adds validation for event_type field to prevent crashes.
```

## Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

3. **Update documentation** if needed

4. **Add tests** for new features

### Submitting

1. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub

3. Fill out the PR template:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How did you test this?
   - **Related Issues**: Link any related issues

### PR Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, a maintainer will merge your PR

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types - use `unknown` if necessary
- Export types for public APIs

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Max line length: 100 characters
- Use trailing commas in objects/arrays

### File Structure

```typescript
// 1. Imports (grouped: external, internal, types)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { myUtil } from './utils.js';
import type { Config } from './types.js';

// 2. Types and interfaces
interface MyOptions {
  // ...
}

// 3. Constants
const DEFAULT_TIMEOUT = 5000;

// 4. Functions
export function myFunction(): void {
  // ...
}

// 5. Exports
export { myUtil };
```

### Naming Conventions

- **Files**: kebab-case (`my-module.ts`)
- **Classes**: PascalCase (`MyClass`)
- **Functions**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE (`MY_CONSTANT`)
- **Interfaces**: PascalCase with `I` prefix optional (`IConfig` or `Config`)

## Testing

### Writing Tests

- Use `vitest` for unit tests
- Place tests in `tests/` directory or colocate with source files
- Name test files: `*.test.ts` or `*.spec.ts`

### Test Structure

```typescript
import { describe, expect, it } from "vitest";

describe("MyModule", () => {
  it("should do something", () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });

  it("should handle errors", () => {
    expect(() => myFunction(invalid)).toThrow();
  });
});
```

### Coverage Goals

- Aim for 80%+ code coverage
- All new features must have tests
- All bug fixes must include regression tests

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic with inline comments
- Keep comments up-to-date with code changes

```typescript
/**
 * Sends a text message to a Lark chat.
 *
 * @param chatId - The chat ID to send to
 * @param text - The message text
 * @returns Promise resolving to message ID
 * @throws Error if chat ID is invalid
 */
export async function sendMessage(chatId: string, text: string): Promise<string> {
  // ...
}
```

### README Updates

- Update README.md for new features
- Add examples for new tools/APIs
- Keep installation instructions current

### Changelog

- Maintainers will update CHANGELOG.md
- Include notable changes in PR description

## Areas for Contribution

### High Priority

- Additional Lark domain coverage (new tools)
- Test coverage improvements
- Performance optimizations
- Bug fixes
- Documentation improvements

### Feature Requests

Before implementing a major feature:

1. Open an issue to discuss
2. Get feedback from maintainers
3. Create a design document if complex
4. Submit PR once approved

### Good First Issues

Look for issues labeled `good first issue` or `help wanted`.

## Questions?

- Open an issue for questions
- Join discussions in GitHub Discussions
- Check existing documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Lark Master MCP! 🎉
