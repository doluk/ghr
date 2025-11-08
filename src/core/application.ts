/**
 * Core application class
 * Orchestrates all modules and manages the main application loop
 */

import * as readline from 'readline';
import { CommandContext } from '../types';
import { GitHubClient } from '../modules/github-client';
import { SessionManager } from '../modules/session-manager';
import { CommandParser } from '../modules/command-parser';
import { Commands } from '../modules/commands';
import { GeminiClient } from '../modules/gemini-client';

export class Application {
  private github: GitHubClient;
  private session: SessionManager;
  private parser: CommandParser;
  private commands: Commands;
  private gemini?: GeminiClient;
  private rl: readline.Interface;
  private context: CommandContext;

  constructor() {
    // Initialize modules
    this.github = new GitHubClient();
    this.session = new SessionManager(100);

    // Initialize Gemini if API key is available
    try {
      if (process.env.GEMINI_API_KEY) {
        this.gemini = new GeminiClient({
          systemInstruction:
            'You are a helpful code review assistant. Help developers understand code changes, identify potential issues, and suggest improvements.',
        });
      }
    } catch {
      // Gemini not available
    }

    this.commands = new Commands(this.github, this.session, this.gemini);
    this.parser = new CommandParser();

    // Initialize context
    this.context = {
      state: this.session.getState(),
      files: new Map(),
      prFiles: [],
    };

    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '',
    });

    this.setupCommands();
  }

  /**
   * Register all commands
   */
  private setupCommands(): void {
    // Session commands
    this.parser.register('q', () => this.quit());
    this.parser.register('quit', () => this.quit());
    this.parser.register('?', () => this.commands.showHelp());
    this.parser.register('help', () => this.commands.showHelp());
    this.parser.register('h', () => this.commands.showHistory());
    this.parser.register('history', () => this.commands.showHistory());

    // PR commands
    this.parser.register('lpr', () => this.commands.listPRs());
    this.parser.register('pr', (args) => this.commands.selectPR(args, this.context));

    // File commands
    this.parser.register('lf', () => this.commands.listFiles(this.context));
    this.parser.register('fn', (args) => this.commands.selectFile(args, this.context));
    this.parser.register('f', (args) => this.commands.selectFileByName(args, this.context));
    this.parser.register('+', (args) => this.commands.selectFile(args, this.context));
    this.parser.register('-', (args) => this.commands.selectFile(args, this.context));

    // Diff commands
    this.parser.register('dd', () => this.commands.showDiff(false, this.context));
    this.parser.register('ddiw', () => this.commands.showDiff(true, this.context));
    this.parser.register('do', () => this.commands.showOriginal(this.context));
    this.parser.register('dn', () => this.commands.showNew(this.context));

    // Comment commands
    this.parser.register('ca', (args) => this.commands.addComment(args, this.context));
    this.parser.register('rs', () => this.commands.showReviewSummary());

    // AI commands
    this.parser.register('ajim', () => this.commands.askGemini(this.context));
  }

  /**
   * Get the prompt string
   */
  private getPrompt(): string {
    const state = this.session.getState();
    let prompt = '\n' + '-'.repeat(100) + '\nghr';

    if (state.prNumber) {
      prompt += ` #${state.prNumber}`;

      if (state.currentFileName) {
        const totalFiles = this.context.prFiles.length;
        const currentIndex = state.currentFileIndex || 0;
        const percentage = totalFiles > 0 ? ((currentIndex / totalFiles) * 100).toFixed(1) : '0.0';

        prompt += ` [${currentIndex}/${totalFiles} | ${percentage}%] ${state.currentFileName}`;
      }
    }

    prompt += ' > ';
    return prompt;
  }

  /**
   * Process a line of input
   */
  private async processLine(line: string): Promise<boolean> {
    const trimmed = line.trim();
    if (!trimmed) return true;

    // Check for history expansion
    const history = this.session.getHistory();
    const expandedLine = this.parser.processHistoryExpansion(trimmed, history);

    if (expandedLine === null) {
      return true; // History command that doesn't execute
    }

    // Show expanded command if different
    if (expandedLine !== trimmed) {
      console.log(`Executing: ${expandedLine}`);
    }

    // Execute command
    try {
      // Update context state before execution
      this.context.state = this.session.getState();

      await this.parser.execute(expandedLine, this.context);

      // Add to history (don't add history lookup commands themselves)
      if (!trimmed.match(/^(h|history|!!?|\!\d+)$/)) {
        this.session.addToHistory(expandedLine);
      }
    } catch (error) {
      console.error(`Command error: ${error}`);
    }

    return true;
  }

  /**
   * Main application loop
   */
  async run(): Promise<void> {
    console.log('GitHub Pull Request Reviewer (ghr) - TypeScript Edition');
    console.log('Type "?" for help, "q" to quit\n');

    // Restore session if available
    const state = this.session.getState();
    if (state.prNumber) {
      console.log(`Restoring session: PR #${state.prNumber}`);
      if (state.currentFileName) {
        console.log(`Last file: ${state.currentFileName}`);
      }
    }

    this.rl.setPrompt(this.getPrompt());
    this.rl.prompt();

    this.rl.on('line', async (line: string) => {
      await this.processLine(line);
      this.rl.setPrompt(this.getPrompt());
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.quit();
    });
  }

  /**
   * Quit the application
   */
  private quit(): void {
    const unpushed = this.session.getUnpushedCommentCount();

    if (unpushed > 0) {
      console.log(`\nWarning: You have ${unpushed} unpushed local comments.`);
      // In non-interactive mode, we'll just warn and exit
      // The TUI version will have proper confirmation
    }

    console.log('\nSaving session...');
    this.session.saveSession();
    this.session.saveHistory();

    console.log('Exiting. Goodbye!\n');
    process.exit(0);
  }
}
