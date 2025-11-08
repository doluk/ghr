/**
 * Utility functions for interactive CLI operations
 */

import * as readline from 'readline';

/**
 * Read multiline input from user until terminator is entered
 * @param prompt - Initial prompt to display
 * @param terminator - Line that signals end of input (default: '.')
 * @param initialText - Optional initial text to prepend
 * @returns Promise resolving to the complete input text
 */
export async function readMultilineInput(
  prompt: string = '',
  terminator: string = '.',
  initialText: string = ''
): Promise<string> {
  if (prompt) {
    console.log(prompt);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  let text = initialText ? initialText + '\n' : '';

  return new Promise((resolve) => {
    rl.on('line', (line: string) => {
      if (line === terminator) {
        rl.close();
        resolve(text);
      } else {
        text += line + '\n';
      }
    });

    rl.on('close', () => {
      resolve(text);
    });
  });
}

/**
 * Read a single line of input from user
 * @param prompt - Prompt to display
 * @returns Promise resolving to the input line
 */
export async function readLine(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Parse position argument which can be:
 * - 'g' or empty for global/file-level comment
 * - A number for single line (e.g., '5')
 * - A range for multiline (e.g., '5-10')
 * @param posArg - Position argument string
 * @returns Object with type and position info
 */
export function parsePositionArg(posArg: string): {
  type: 'global' | 'single' | 'range';
  start?: number;
  end?: number;
} {
  const trimmed = posArg.trim().toLowerCase();

  if (trimmed === 'g' || trimmed === '') {
    return { type: 'global' };
  }

  // Check for range (e.g., "5-10")
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return { type: 'range', start, end };
  }

  // Single line
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    const line = parseInt(singleMatch[1], 10);
    return { type: 'single', start: line };
  }

  throw new Error(`Invalid position argument: ${posArg}`);
}
