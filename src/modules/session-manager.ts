/**
 * Session state management module
 * Handles persistent storage and retrieval of session data
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SessionState } from '../types';

export class SessionManager {
  private sessionFile: string;
  private historyFile: string;
  private state: SessionState;
  private commandHistory: string[] = [];
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    const cwd = process.cwd();
    this.sessionFile = join(cwd, '.ghr_session');
    this.historyFile = join(cwd, '.ghr_command_history');
    this.maxHistorySize = maxHistorySize;

    this.state = {
      comments: {
        global: [],
        files: {},
      },
    };

    this.loadSession();
    this.loadHistory();
  }

  /**
   * Load session state from file
   */
  private loadSession(): void {
    if (existsSync(this.sessionFile)) {
      try {
        const data = readFileSync(this.sessionFile, 'utf-8');
        const loaded = JSON.parse(data);
        this.state = { ...this.state, ...loaded };
        console.log(`Session loaded from ${this.sessionFile}`);
      } catch (error) {
        console.warn(`Warning: Could not load session: ${error}`);
      }
    }
  }

  /**
   * Save session state to file
   */
  saveSession(): void {
    try {
      const data = JSON.stringify(this.state, null, 2);
      writeFileSync(this.sessionFile, data, 'utf-8');
    } catch (error) {
      console.warn(`Warning: Could not save session: ${error}`);
    }
  }

  /**
   * Load command history from file
   */
  private loadHistory(): void {
    if (existsSync(this.historyFile)) {
      try {
        const data = readFileSync(this.historyFile, 'utf-8');
        this.commandHistory = data
          .split('\n')
          .filter((line) => line.trim())
          .slice(-this.maxHistorySize);
        console.log(`Loaded ${this.commandHistory.length} commands from history.`);
      } catch (error) {
        console.warn(`Warning: Could not load history: ${error}`);
      }
    }
  }

  /**
   * Save command history to file
   */
  saveHistory(): void {
    try {
      const historyToSave = this.commandHistory.slice(-this.maxHistorySize);
      const data = historyToSave.join('\n') + '\n';
      writeFileSync(this.historyFile, data, 'utf-8');
    } catch (error) {
      console.warn(`Warning: Could not save history: ${error}`);
    }
  }

  /**
   * Add command to history
   */
  addToHistory(command: string): void {
    if (command.trim()) {
      this.commandHistory.push(command);
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory.shift();
      }
    }
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Get command from history by index (1-based)
   */
  getHistoryCommand(index: number): string | undefined {
    if (index > 0 && index <= this.commandHistory.length) {
      return this.commandHistory[index - 1];
    }
    return undefined;
  }

  /**
   * Get last command from history
   */
  getLastCommand(): string | undefined {
    return this.commandHistory[this.commandHistory.length - 1];
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Update state
   */
  updateState(updates: Partial<SessionState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Reset session state
   */
  resetSession(): void {
    this.state = {
      comments: {
        global: [],
        files: {},
      },
    };
  }

  /**
   * Get unpushed comment count
   */
  getUnpushedCommentCount(): number {
    let count = 0;

    // Count global comments
    count += this.state.comments.global.filter((c) => c.status === 'local').length;

    // Count file comments
    Object.values(this.state.comments.files).forEach((comments) => {
      count += comments.filter((c) => c.status === 'local').length;
    });

    return count;
  }
}
