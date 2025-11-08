/**
 * Command parser and dispatcher module
 * Handles command parsing, history expansion, and command execution
 */

import { CommandContext, CommandHandler } from '../types';

export class CommandParser {
  private commands: Map<string, CommandHandler> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a command handler
   */
  register(name: string, handler: CommandHandler): void {
    this.commands.set(name.toLowerCase(), handler);
  }

  /**
   * Register a command alias
   */
  registerAlias(alias: string, command: string): void {
    this.aliases.set(alias.toLowerCase(), command.toLowerCase());
  }

  /**
   * Parse and execute a command
   */
  async execute(input: string, context: CommandContext): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed) return true;

    // Split command and arguments
    const parts = trimmed.split(/\s+/);
    let cmdName = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    // Resolve aliases
    if (this.aliases.has(cmdName)) {
      cmdName = this.aliases.get(cmdName)!;
    }

    // Special handling for + and - commands
    if (cmdName === '+' || cmdName === '-') {
      const handler = this.commands.get(cmdName);
      if (handler) {
        await handler(cmdName, context);
        return true;
      }
    }

    // Execute command
    const handler = this.commands.get(cmdName);
    if (handler) {
      await handler(args, context);
      return true;
    }

    console.log(`Unknown command: '${cmdName}'. Type '?' for help.`);
    return false;
  }

  /**
   * Process history expansion (!! and !n)
   */
  processHistoryExpansion(input: string, history: string[]): string | null {
    const trimmed = input.trim();

    // Handle !! - repeat last command
    if (trimmed === '!!') {
      if (history.length === 0) {
        console.log('No commands in history');
        return null;
      }
      return history[history.length - 1];
    }

    // Handle !n - repeat command number n
    const historyMatch = trimmed.match(/^!(\d+)$/);
    if (historyMatch) {
      const index = parseInt(historyMatch[1], 10) - 1;
      if (index >= 0 && index < history.length) {
        return history[index];
      }
      console.log(`No command at index ${historyMatch[1]}`);
      return null;
    }

    // No history expansion needed
    return input;
  }

  /**
   * Get list of available commands
   */
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Check if command exists
   */
  hasCommand(name: string): boolean {
    const cmdName = name.toLowerCase();
    return this.commands.has(cmdName) || this.aliases.has(cmdName);
  }
}
