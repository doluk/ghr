# Contributing to ghr

Thank you for your interest in contributing to ghr! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm (comes with Node.js)
- GitHub CLI (`gh`) installed and authenticated
- Git

### Development Setup

1. Fork the repository on GitHub

2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ghr.git
   cd ghr
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run in development mode:
   ```bash
   npm run dev
   ```

## Development Workflow

### Code Style

We use ESLint and Prettier for code quality:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Type Checking

Always run type checking before committing:

```bash
npm run type-check
```

### Building

```bash
# Clean build
npm run clean

# Build TypeScript
npm run build

# Both (clean then build)
npm run prebuild && npm run build
```

## Project Structure

```
src/
├── core/           # Core application logic
├── modules/        # Feature modules
├── types/          # TypeScript type definitions
├── ui/             # UI components (future)
└── utils/          # Utility functions
```

### Adding New Features

1. **Plan**: Discuss the feature in an issue first
2. **Module**: Create or extend appropriate module in `src/modules/`
3. **Types**: Add type definitions to `src/types/`
4. **Commands**: If adding a command, update `src/modules/commands.ts`
5. **Register**: Register the command in `src/core/application.ts`
6. **Document**: Update README.md and help text

### Module Guidelines

Each module should:
- Have a single, clear responsibility
- Export a class or functions
- Include JSDoc comments
- Handle errors appropriately
- Use TypeScript types

Example:
```typescript
/**
 * Module description
 */

export class MyModule {
  /**
   * Method description
   * @param param - Parameter description
   * @returns Return value description
   */
  myMethod(param: string): boolean {
    // Implementation
    return true;
  }
}
```

## Testing

Currently, testing infrastructure is being set up. For now:

1. Test your changes manually
2. Ensure existing functionality still works
3. Test edge cases
4. Test error handling

Future: We'll add Jest for unit testing.

## Commit Guidelines

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(commands): add support for draft reviews
fix(github): handle API rate limiting
docs(readme): update installation instructions
```

### Pull Requests

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes with clear commits

3. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```

4. Open a Pull Request with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots for UI changes
   - Test results

## Code Review

All submissions require review. We review for:

- Code quality and style
- Type safety
- Error handling
- Documentation
- Performance
- Security

## Areas for Contribution

### High Priority

- [ ] TUI framework integration
- [ ] Interactive prompts for confirmations
- [ ] Comprehensive test suite
- [ ] Shell completion scripts
- [ ] Editor integrations

### Medium Priority

- [ ] Enhanced grep with syntax highlighting
- [ ] Better diff viewing
- [ ] Comment threading
- [ ] Review templates
- [ ] Configuration file support

### Documentation

- [ ] Video tutorials
- [ ] More examples
- [ ] API documentation
- [ ] Architecture diagrams

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and PRs first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make ghr better for everyone!
