/**
 * Command implementations module
 * Contains all command handlers for the application
 */

import { CommandContext } from '../types';
import { GitHubClient } from './github-client';
import { SessionManager } from './session-manager';
import { GeminiClient } from './gemini-client';
import { execSync } from 'child_process';

export class Commands {
  constructor(
    private github: GitHubClient,
    private session: SessionManager,
    private gemini?: GeminiClient
  ) {}

  /**
   * List open pull requests
   */
  async listPRs(): Promise<void> {
    console.log('Fetching list of open pull requests...');
    try {
      const prs = await this.github.listPullRequests(50);
      console.log('\nOpen Pull Requests:');
      console.log('-'.repeat(100));
      prs.forEach((pr) => {
        console.log(`#${pr.number.toString().padStart(5)} ${pr.title}`);
        console.log(`         by ${pr.author} - ${pr.url}`);
      });
      console.log('-'.repeat(100));
    } catch (error) {
      console.error(`Error listing PRs: ${error}`);
    }
  }

  /**
   * Select a pull request
   */
  async selectPR(args: string, context: CommandContext): Promise<void> {
    const prNumber = parseInt(args, 10);
    if (isNaN(prNumber)) {
      console.log('Usage: pr <PR#>');
      return;
    }

    try {
      console.log(`Loading PR #${prNumber}...`);
      const files = await this.github.getPRFiles(prNumber);

      context.prFiles = files.map((f) => f.filename);
      context.files.clear();
      files.forEach((f) => context.files.set(f.filename, f));

      this.session.updateState({
        prNumber,
        currentFileIndex: undefined,
        currentFileName: undefined,
      });

      console.log(`Selected PR #${prNumber} with ${files.length} files.`);

      // Auto-select first file if available
      if (files.length > 0) {
        await this.selectFile('1', context);
      }
    } catch (error) {
      console.error(`Error loading PR: ${error}`);
    }
  }

  /**
   * List files in current PR
   */
  listFiles(context: CommandContext): void {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected. Use "pr <#>" first.');
      return;
    }

    console.log(`\nFiles in PR #${state.prNumber}:`);
    console.log('-'.repeat(100));

    context.prFiles.forEach((filename, index) => {
      const file = context.files.get(filename);
      const marker = index + 1 === state.currentFileIndex ? '→' : ' ';
      const status = file?.status.charAt(0).toUpperCase() || '?';
      const changes = file ? `+${file.additions}/-${file.deletions}` : '';
      console.log(`${marker} ${(index + 1).toString().padStart(4)} [${status}] ${filename.padEnd(60)} ${changes}`);
    });

    console.log('-'.repeat(100));
  }

  /**
   * Select a file by index or navigate with + or -
   */
  async selectFile(args: string, context: CommandContext): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected. Use "pr <#>" first.');
      return;
    }

    let index: number;

    if (args === '+') {
      index = (state.currentFileIndex || 0) + 1;
    } else if (args === '-') {
      index = (state.currentFileIndex || 2) - 1;
    } else {
      index = parseInt(args, 10);
    }

    if (isNaN(index) || index < 1 || index > context.prFiles.length) {
      console.log(`Invalid file index. Valid range: 1-${context.prFiles.length}`);
      return;
    }

    const filename = context.prFiles[index - 1];
    this.session.updateState({
      currentFileIndex: index,
      currentFileName: filename,
    });

    const file = context.files.get(filename);
    const totalFiles = context.prFiles.length;
    const percentage = ((index / totalFiles) * 100).toFixed(1);

    console.log(`\n[${index}/${totalFiles} | ${percentage}%] ${filename}`);
    if (file) {
      console.log(`Status: ${file.status} | Changes: +${file.additions}/-${file.deletions}`);
    }

    // Auto-show diff
    await this.showDiff(false, context);
  }

  /**
   * Select file by name regex
   */
  async selectFileByName(args: string, context: CommandContext): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected. Use "pr <#>" first.');
      return;
    }

    if (!args.trim()) {
      console.log('Usage: f <name_regex>');
      return;
    }

    try {
      const regex = new RegExp(args, 'i');
      const matchIndex = context.prFiles.findIndex((f) => regex.test(f));

      if (matchIndex === -1) {
        console.log(`No file matching "${args}" found.`);
        return;
      }

      await this.selectFile(String(matchIndex + 1), context);
    } catch (error) {
      console.log(`Invalid regex: ${error}`);
    }
  }

  /**
   * Show diff for current file
   */
  async showDiff(ignoreWhitespace: boolean, _context: CommandContext): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber || !state.currentFileName) {
      console.log('No file selected.');
      return;
    }

    try {
      const diff = this.github.getDiff(state.prNumber, state.currentFileName, ignoreWhitespace);
      console.log('\n' + diff);
    } catch (error) {
      console.error(`Error showing diff: ${error}`);
    }
  }

  /**
   * Show original file content
   */
  showOriginal(_context: CommandContext): void {
    const state = this.session.getState();
    if (!state.prNumber || !state.currentFileName) {
      console.log('No file selected.');
      return;
    }

    try {
      const cmd = `gh pr view ${state.prNumber} --json baseRefOid --jq .baseRefOid`;
      const baseRef = execSync(cmd, { encoding: 'utf-8' }).trim();

      const content = execSync(`git show ${baseRef}:"${state.currentFileName}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      const lines = content.split('\n');
      lines.forEach((line, i) => {
        console.log(`${(i + 1).toString().padStart(6)} ${line}`);
      });
    } catch {
      console.log(`Error: File may not exist in base branch or git command failed.`);
    }
  }

  /**
   * Show new file content
   */
  showNew(_context: CommandContext): void {
    const state = this.session.getState();
    if (!state.prNumber || !state.currentFileName) {
      console.log('No file selected.');
      return;
    }

    try {
      const cmd = `gh pr view ${state.prNumber} --json headRefOid --jq .headRefOid`;
      const headRef = execSync(cmd, { encoding: 'utf-8' }).trim();

      const content = execSync(`git show ${headRef}:"${state.currentFileName}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      const lines = content.split('\n');
      lines.forEach((line, i) => {
        console.log(`${(i + 1).toString().padStart(6)} ${line}`);
      });
    } catch {
      console.log(`Error: Could not retrieve file content.`);
    }
  }

  /**
   * Add a comment
   */
  addComment(args: string, _context: CommandContext): void {
    const state = this.session.getState();
    const parts = args.split(/\s+/, 2);
    const position = parts[0];
    const text = parts[1] || '';

    if (!position) {
      console.log('Usage: ca <position|g> [comment text]');
      console.log('If no comment text provided, will prompt for multiline input.');
      return;
    }

    // Get comment text (interactive or from args)
    let commentText = text;
    if (!commentText) {
      console.log('Enter comment (Ctrl+D to finish):');
      // For now, we'll require the comment in the args
      console.log('Please provide comment text in the command.');
      return;
    }

    if (position.toLowerCase() === 'g') {
      // Global comment
      state.comments.global.push({
        body: commentText,
        status: 'local',
      });
      console.log('Global comment added.');
    } else {
      // File comment
      if (!state.currentFileName) {
        console.log('No file selected.');
        return;
      }

      const pos = parseInt(position, 10);
      if (isNaN(pos)) {
        console.log('Invalid position.');
        return;
      }

      if (!state.comments.files[state.currentFileName]) {
        state.comments.files[state.currentFileName] = [];
      }

      state.comments.files[state.currentFileName].push({
        body: commentText,
        path: state.currentFileName,
        position: pos,
        status: 'local',
      });

      console.log(`Comment added at position ${pos} in ${state.currentFileName}`);
    }

    this.session.updateState(state);
  }

  /**
   * Show review summary
   */
  showReviewSummary(): void {
    const state = this.session.getState();
    console.log('\n=== Review Summary ===\n');

    // Global comments
    if (state.comments.global.length > 0) {
      console.log('Global Comments:');
      state.comments.global.forEach((c, i) => {
        console.log(`  ${i + 1}. [${c.status}] ${c.body}`);
      });
      console.log();
    }

    // File comments
    const fileComments = Object.entries(state.comments.files);
    if (fileComments.length > 0) {
      console.log('File Comments:');
      fileComments.forEach(([file, comments]) => {
        console.log(`  ${file}:`);
        comments.forEach((c, i) => {
          console.log(`    ${i + 1}. [${c.status}] Line ${c.position}: ${c.body}`);
        });
      });
      console.log();
    }

    const unpushed = this.session.getUnpushedCommentCount();
    console.log(`Total unpushed comments: ${unpushed}`);
  }

  /**
   * Ask Gemini AI
   */
  async askGemini(_context: CommandContext): Promise<void> {
    if (!this.gemini) {
      console.log('Gemini API not configured. Set GEMINI_API_KEY environment variable.');
      return;
    }

    console.log('\nGemini AI Assistant');
    console.log('Ask a question about the current file or code review:');
    console.log('(Type your question and press Enter, or just Enter to cancel)\n');

    // For now, we'll need interactive input which we'll handle differently
    // This is a placeholder
    console.log('Interactive Gemini chat not yet implemented in this version.');
    console.log('This will be available in the TUI version.');
  }

  /**
   * Show command history
   */
  showHistory(): void {
    const history = this.session.getHistory();
    console.log('\n=== Command History ===\n');
    history.forEach((cmd, i) => {
      console.log(`${(i + 1).toString().padStart(4)}  ${cmd}`);
    });
    console.log();
  }

  /**
   * Show help
   */
  showHelp(): void {
    console.log(`
=== GitHub Review CLI (ghr) Help ===

Session Commands:
  pr <#>        Select and load a pull request
  lpr           List open pull requests
  q             Quit the application
  ?             Show this help
  h             Show command history

File Navigation:
  lf            List all files in current PR
  fn <#>        Select file by index number
  f <regex>     Select file by name regex
  +             Move to next file
  -             Move to previous file

Viewing Files:
  dd            Show diff for current file
  ddiw          Show diff ignoring whitespace
  do            Show original file content
  dn            Show new file content

Comments and Review:
  ca <pos> <text>  Add comment (pos = line number or 'g' for global)
  rs            Show review summary
  lc            Load existing review comments (TODO)

AI Assistant:
  ajim          Ask Gemini AI about current file (requires GEMINI_API_KEY)

History:
  !!            Repeat last command
  !<n>          Repeat command number n
`);
  }
}
