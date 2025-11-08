# ghr: The Command-Line GitHub Pull Request Reviewer

**ghr** is a powerful TypeScript-based command-line utility designed to streamline the process of reviewing large GitHub Pull Requests. It enables you to quickly navigate files, view diffs (with and without whitespace changes), and track line-specific comments, all from within your terminal.

This is a complete rewrite of the original Perl version, now featuring:
- 🎯 **Modular TypeScript Architecture** - Clean, reusable, and maintainable code
- 🚀 **Better Performance** - Leveraging Node.js and modern async patterns
- 🔧 **Type Safety** - Full TypeScript support for safer development
- 📦 **Easy Distribution** - npm package with simple installation
- 🎨 **Extensible Design** - Modular components for easy customization
- 🤖 **AI Integration** - Built-in Gemini AI support for code review assistance

---

## ✨ Features

* **Interactive Session:** Persistent state tracking for the current PR, file, and local comments. Command history.
* **Efficient Navigation:** Use simple commands (`+`, `-`) to jump between changed files.
* **File Selection:** Select files by index or full name (`fn 5`, `f file.c`).
* **Diff Viewing:** View diffs with standard output (`dd`) or with whitespace changes ignored (`ddiw`).
* **Comment Tracking:** Add positional comments (`ca`) and view pending comments (`rs`).
* **Full Review Submission:** Submit a complete review with comments (planned feature).
* **Contextual Prompt:** The prompt always shows the current PR, file index, and file name.
* **AI Assistance:** Access the Gemini model directly to ask questions or get contextual feedback.

---

## 🚀 Installation & Setup

### Prerequisites

1. **Node.js:** Ensure you have Node.js 18+ installed.
   ```bash
   node --version  # Should be >= 18.0.0
   ```

2. **GitHub CLI:** Install and authenticate the GitHub CLI.
   ```bash
   # Check installation
   gh --version
   # Ensure you are authenticated
   gh auth status
   ```

3. **Gemini API Key (Optional):** Set the `GEMINI_API_KEY` environment variable for AI features.
   ```bash
   export GEMINI_API_KEY="YOUR_API_KEY_HERE"
   ```

### Installation from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/doluk/ghr.git
   cd ghr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link for global usage (optional):
   ```bash
   npm link
   ```

### Running ghr

1. Navigate to a Git repository that has open Pull Requests.
2. Start the interactive session:
   ```bash
   ghr
   # or if not globally linked:
   npm run dev
   ```

---

## 📖 Usage and Commands

All commands are executed from the `ghr` interactive prompt.

### ⚙️ Session Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| `pr <#>` | Select and load the files for a specific Pull Request. | `pr 301` |
| `lpr` | List your current open Pull Requests. | `lpr` |
| `?` | Display the list of available commands. | `?` |
| `h` | Show command history. | `h` |
| `q` | Quit the application. | `q` |
| `!!` | Repeat previous command. | `!!` |
| `!n` | Repeat command from history. | `!27` |

### 📁 File Navigation & Viewing

| Command | Description | Example |
| :--- | :--- | :--- |
| `lf` | List all files in the current PR. | `lf` |
| `fn <index>` | Select a file by its index number (from `lf` list). | `fn 5` |
| `f <name>` | Select a file by its name regex. | `f \.h$` |
| **`+`** | Move to and view the **next** file in the PR. | `+` |
| **`-`** | Move to and view the **previous** file in the PR. | `-` |
| `dd` | Show the standard Git diff for the currently selected file. | `dd` |
| **`ddiw`** | Show the diff **ignoring whitespace** changes. | `ddiw` |
| `do` | Show the **original** file content (before changes). | `do` |
| `dn` | Show the **new** file content (with changes). | `dn` |

### 💬 Commenting and Review

| Command | Description | Example |
| :--- | :--- | :--- |
| `ca <pos> <text>` | **Add** a positional comment to the current file. | `ca 12 Fix this bug` |
| `rs` | Show a **Review Summary** of all locally tracked comments. | `rs` |

### 🤖 AI Assistant

| Command | Description | Example |
| :--- | :--- | :--- |
| `ajim` | **Ask Gemini** a question about the current file or code (requires API key). | `ajim` |

---

## 🏗️ Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/
├── core/               # Core application logic
│   └── application.ts  # Main app orchestration
├── modules/            # Feature modules
│   ├── github-client.ts      # GitHub API integration
│   ├── session-manager.ts    # State persistence
│   ├── command-parser.ts     # Command parsing
│   ├── commands.ts           # Command implementations
│   └── gemini-client.ts      # AI integration
├── types/              # TypeScript type definitions
│   └── index.ts
├── ui/                 # UI components (TUI - planned)
└── index.ts           # Entry point
```

### Key Modules

- **GitHubClient**: Handles all GitHub API interactions via Octokit and gh CLI
- **SessionManager**: Manages persistent state and command history
- **CommandParser**: Parses and dispatches user commands
- **Commands**: Implements all command handlers
- **GeminiClient**: Provides AI assistance via Google's Gemini API

---

## 🔧 Development

### Scripts

```bash
npm run dev          # Run in development mode with tsx
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run the compiled JavaScript
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
npm run clean        # Remove build artifacts
```

### Testing

The application can be tested in a repository with pull requests:

```bash
cd /path/to/your/repo
ghr
# or
npm run dev
```

---

## 🤝 Contribution

Feel free to fork the repository and contribute! We welcome:
- Bug reports and fixes
- Feature requests and implementations
- Documentation improvements
- Code quality enhancements

---

## 📋 Migration from Perl Version

The TypeScript version maintains command compatibility with the original Perl version while adding:
- Better error handling
- Type safety
- Modular architecture
- Improved performance
- Easier maintenance and extension

All Perl module files (`GeminiChat.pm`, `GeminiConverse.pm`) and the original `ghr` script are preserved for reference but are no longer used.

---

## ⚖️ License

This project is licensed under the MIT License.

---

## 🎯 Roadmap

- [x] Core CLI functionality
- [x] Modular TypeScript architecture
- [x] GitHub API integration
- [x] Session persistence
- [x] Command history
- [x] Gemini AI integration
- [ ] TUI framework integration (blessed)
- [ ] Interactive comment editing
- [ ] Review submission
- [ ] Enhanced grep functionality
- [ ] Shell integration (bash, zsh completions)
- [ ] Editor integration (Emacs, Neovim plugins)
- [ ] Comprehensive test suite
- [ ] npm package publication

---

## 🙏 Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- [Octokit](https://github.com/octokit/rest.js)
- [GitHub CLI](https://cli.github.com/)
- [Google Gemini API](https://ai.google.dev/)
