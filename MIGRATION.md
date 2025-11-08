# Migration Guide: Perl to TypeScript

This document outlines the migration from the original Perl implementation to the new TypeScript version of ghr.

## Overview

The TypeScript version is a complete rewrite that maintains command compatibility while introducing modern architecture and tooling.

## What Changed

### Language & Runtime
- **Perl** → **TypeScript/Node.js**
  - Better type safety
  - Modern async/await patterns
  - Rich npm ecosystem
  - Better IDE support

### Architecture
- **Monolithic script** → **Modular architecture**
  - Separated concerns into modules
  - Reusable components
  - Easier to test and maintain
  - Better code organization

### Dependencies
- **Perl Modules** (JSON.pm) → **npm packages**
  - @octokit/rest for GitHub API
  - blessed for TUI (planned)
  - dotenv for environment management
  - TypeScript tooling

### File Structure

**Before (Perl):**
```
ghr                 # Main script (~1889 lines)
GeminiChat.pm      # Gemini integration
GeminiConverse.pm  # Conversational AI
```

**After (TypeScript):**
```
src/
├── core/
│   └── application.ts       # Main app logic
├── modules/
│   ├── github-client.ts     # GitHub API
│   ├── session-manager.ts   # State management
│   ├── command-parser.ts    # Command parsing
│   ├── commands.ts          # Command implementations
│   └── gemini-client.ts     # AI integration
├── types/
│   └── index.ts             # Type definitions
└── index.ts                 # Entry point
```

## Command Compatibility

All commands from the Perl version are supported:

| Category | Commands | Status |
|----------|----------|--------|
| Session | pr, lpr, q, ?, h, !!, !n | ✅ Implemented |
| Navigation | lf, fn, f, +, - | ✅ Implemented |
| Viewing | dd, ddiw, do, dn | ✅ Implemented |
| Comments | ca, cd, rs, lc, lgc | ✅ Implemented |
| Review | cp, accept, reject | ⚠️ UI pending |
| Search | g, gl, g+, g- | ✅ Implemented |
| AI | ajim | ✅ Implemented |

## Installation

### Perl Version
```bash
perl ghr
```

### TypeScript Version
```bash
npm install
npm run build
npm link  # for global installation
ghr       # or npm run dev
```

## Configuration

### Environment Variables

Both versions use the same environment variables:

- `GEMINI_API_KEY`: For AI assistance features

### Session Files

Both versions create session files in the current directory:

- `.ghr_session`: Persistent session state
- `.ghr_command_history`: Command history

The TypeScript version uses JSON format for better readability.

## API Integration

### GitHub CLI

Both versions rely on `gh` CLI for authentication:

```bash
gh auth status
gh auth login
```

### GitHub API

- **Perl**: Direct CLI commands and API calls
- **TypeScript**: Octokit REST API client + gh CLI for auth

## Performance

The TypeScript version offers:

- **Better startup time**: No Perl interpreter overhead
- **Async operations**: Non-blocking I/O for API calls
- **Better error handling**: Typed error handling

## Development

### Perl Version
- No build step
- Direct script execution
- Manual dependency management

### TypeScript Version
- Build step required (`npm run build`)
- Development mode with hot reload (`npm run dev`)
- Automated dependency management via npm
- Linting and formatting built-in

## Breaking Changes

### None for End Users

Command syntax and behavior remain the same. The migration is transparent to users.

### For Developers

- Requires Node.js 18+ instead of Perl
- Different module system
- Different testing approach
- Different packaging

## Migration Checklist

If you're migrating from the Perl version:

- [x] Install Node.js 18+
- [x] Clone/pull the repository
- [x] Run `npm install`
- [x] Run `npm run build`
- [x] Verify `gh` CLI is authenticated
- [x] Test basic commands
- [ ] Migrate custom scripts (if any)

## Future Enhancements

The TypeScript version enables:

- TUI framework integration (blessed)
- Better shell integration
- Editor plugins (Emacs, Neovim)
- Automated testing
- npm package distribution
- Better CI/CD integration

## Support

For issues or questions:

1. Check the README.md
2. Review existing GitHub issues
3. Open a new issue with details

## Legacy Files

The original Perl implementation is preserved in the `legacy/` directory for reference.
