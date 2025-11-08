/**
 * Command implementations module
 * Contains all command handlers for the application
 */

import { CommandContext } from '../types';
import { GitHubClient } from './github-client';
import { SessionManager } from './session-manager';
import { GeminiClient } from './gemini-client';
import { execSync } from 'child_process';
import { readMultilineInput, parsePositionArg, readLine } from '../utils/input';

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
      console.log(
        `${marker} ${(index + 1).toString().padStart(4)} [${status}] ${filename.padEnd(60)} ${changes}`
      );
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
   * Add a comment (supports multiline and ranges)
   * Usage:
   * - ca g -> file-level comment
   * - ca 5 -> single line comment on line 5
   * - ca 5-10 -> multi-line comment on lines 5 to 10
   */
  async addComment(args: string, _context: CommandContext): Promise<void> {
    const state = this.session.getState();
    const parts = args.trim().split(/\s+/);
    const posArg = parts[0] || '';

    try {
      const posInfo = parsePositionArg(posArg);

      // Determine what type of comment we're adding
      if (posInfo.type === 'global') {
        console.log('Adding a FILE-LEVEL comment.');
        console.log("Type your comment, terminate with a '.' on a single line:");

        const commentText = await readMultilineInput('', '.', '');

        state.comments.global.push({
          body: commentText.trim(),
          status: 'local',
        });

        console.log('\nFile-level comment added successfully.');
      } else {
        // Positional comment (single or range)
        if (!state.currentFileName) {
          console.log('Error: No file selected. Use "fn <#>" first.');
          return;
        }

        if (posInfo.type === 'range') {
          console.log(
            `Adding multi-line comment for lines ${posInfo.start}-${posInfo.end} in ${state.currentFileName}`
          );
        } else {
          console.log(
            `Adding comment at line ${posInfo.start} in ${state.currentFileName}`
          );
        }

        console.log("Type your comment, terminate with a '.' on a single line:");
        const commentText = await readMultilineInput('', '.', '');

        if (!state.comments.files[state.currentFileName]) {
          state.comments.files[state.currentFileName] = [];
        }

        state.comments.files[state.currentFileName].push({
          body: commentText.trim(),
          path: state.currentFileName,
          position: posInfo.start!,
          line: posInfo.type === 'range' ? posInfo.end : posInfo.start,
          status: 'local',
        });

        console.log('\nComment added successfully (local).');
      }

      this.session.updateState(state);
    } catch (error) {
      console.log(`Error: ${error}`);
      console.log('Usage: ca [position]');
      console.log('  ca g     -> file-level comment');
      console.log('  ca       -> file-level comment');
      console.log('  ca 5     -> single line comment on line 5');
      console.log('  ca 5-10  -> multi-line comment on lines 5 to 10');
    }
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
  cd <pos|g>    Delete comment by position or 'g' for global
  rs            Show review summary
  lc            Load existing review comments
  lgc           Load general PR comments
  cp            Push comments as draft review (TODO)
  accept        Accept PR with all comments (TODO)
  reject        Request changes with all comments (TODO)

Search:
  g <regex>     Grep diffs for pattern
  gl <regex>    Grep local filenames for pattern
  g+            Select next file from grep results
  g-            Select previous file from grep results

AI Assistant:
  ajim          Ask Gemini AI about current file (requires GEMINI_API_KEY)

History:
  !!            Repeat last command
  !<n>          Repeat command number n
`);
  }

  /**
   * Grep diffs and select matching files
   */
  async grepDiffs(args: string, context: CommandContext): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected. Use "pr <#>" first.');
      return;
    }

    if (!args.trim()) {
      console.log('Usage: g <regexp>');
      return;
    }

    try {
      const regex = new RegExp(args, 'i');
      const matchedIndices: number[] = [];

      console.log(`\nSearching diffs for pattern: ${args}`);

      for (let i = 0; i < context.prFiles.length; i++) {
        const filename = context.prFiles[i];
        const diff = this.github.getDiff(state.prNumber, filename, false);

        if (regex.test(diff)) {
          matchedIndices.push(i + 1);
        }
      }

      if (matchedIndices.length === 0) {
        console.log('No files found matching the pattern.');
        return;
      }

      // Store grep results
      this.session.updateState({
        ...state,
        grepSet: matchedIndices,
        currentGrepIndex: 0,
      });

      console.log(`\nFound ${matchedIndices.length} file(s) matching '${args}':`);
      matchedIndices.forEach((idx) => {
        const filename = context.prFiles[idx - 1];
        console.log(`  ${idx.toString().padStart(4)} : ${filename}`);
      });

      // Select first match
      console.log('\nSelecting first matching file.');
      await this.selectFile(String(matchedIndices[0]), context);
    } catch (error) {
      console.log(`Invalid regex or error: ${error}`);
    }
  }

  /**
   * Grep local files
   */
  async grepLocal(args: string, context: CommandContext): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected. Use "pr <#>" first.');
      return;
    }

    if (!args.trim()) {
      console.log('Usage: gl <regexp>');
      return;
    }

    try {
      const regex = new RegExp(args, 'i');
      const matchedIndices: number[] = [];

      console.log(`\nSearching local files for pattern: ${args}`);

      context.prFiles.forEach((filename, index) => {
        if (regex.test(filename)) {
          matchedIndices.push(index + 1);
        }
      });

      if (matchedIndices.length === 0) {
        console.log('No files found matching the pattern.');
        return;
      }

      // Store grep results
      this.session.updateState({
        ...state,
        grepSet: matchedIndices,
        currentGrepIndex: 0,
      });

      console.log(`\nFound ${matchedIndices.length} file(s) matching '${args}':`);
      matchedIndices.forEach((idx) => {
        const filename = context.prFiles[idx - 1];
        console.log(`  ${idx.toString().padStart(4)} : ${filename}`);
      });

      // Select first match
      console.log('\nSelecting first matching file.');
      await this.selectFile(String(matchedIndices[0]), context);
    } catch (error) {
      console.log(`Invalid regex or error: ${error}`);
    }
  }

  /**
   * Select next file from grep results
   */
  async grepNext(context: CommandContext): Promise<void> {
    const state = this.session.getState();

    if (!state.grepSet || state.grepSet.length === 0) {
      console.log('No grep results. Use "g <regexp>" first.');
      return;
    }

    const currentIdx = state.currentGrepIndex ?? 0;
    const nextIdx = (currentIdx + 1) % state.grepSet.length;

    this.session.updateState({
      ...state,
      currentGrepIndex: nextIdx,
    });

    const fileIndex = state.grepSet[nextIdx];
    await this.selectFile(String(fileIndex), context);
  }

  /**
   * Select previous file from grep results
   */
  async grepPrev(context: CommandContext): Promise<void> {
    const state = this.session.getState();

    if (!state.grepSet || state.grepSet.length === 0) {
      console.log('No grep results. Use "g <regexp>" first.');
      return;
    }

    const currentIdx = state.currentGrepIndex ?? 0;
    const prevIdx = currentIdx === 0 ? state.grepSet.length - 1 : currentIdx - 1;

    this.session.updateState({
      ...state,
      currentGrepIndex: prevIdx,
    });

    const fileIndex = state.grepSet[prevIdx];
    await this.selectFile(String(fileIndex), context);
  }

  /**
   * Push comments to GitHub as draft review
   */
  async pushComments(): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected.');
      return;
    }

    const unpushed = this.session.getUnpushedCommentCount();
    if (unpushed === 0) {
      console.log('No unpushed comments to push.');
      return;
    }

    console.log(`\nPreparing to push ${unpushed} comment(s) to PR #${state.prNumber}...`);
    console.log('This will create a draft review with your comments.');

    const confirm = await readLine('Type "yes" to confirm: ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Push cancelled.');
      return;
    }

    try {
      // Collect all local comments
      const reviewComments = [];

      // Add file comments
      for (const [, comments] of Object.entries(state.comments.files)) {
        for (const comment of comments) {
          if (comment.status === 'local') {
            reviewComments.push({
              path: comment.path,
              position: comment.position,
              body: comment.body,
            });
          }
        }
      }

      if (reviewComments.length > 0) {
        await this.github.submitReview(state.prNumber, {
          event: 'COMMENT',
          body: state.comments.global
            .filter((c) => c.status === 'local')
            .map((c) => c.body)
            .join('\n\n'),
          comments: reviewComments,
        });

        // Mark comments as pushed
        state.comments.global.forEach((c) => {
          if (c.status === 'local') c.status = 'pushed';
        });
        Object.values(state.comments.files).forEach((comments) => {
          comments.forEach((c) => {
            if (c.status === 'local') c.status = 'pushed';
          });
        });

        this.session.updateState(state);
        console.log(`\nSuccessfully pushed ${unpushed} comment(s) as draft review.`);
      }
    } catch (error) {
      console.error(`Error pushing comments: ${error}`);
    }
  }

  /**
   * Load existing review comments
   */
  async loadComments(): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected.');
      return;
    }

    try {
      console.log(`Loading review comments for PR #${state.prNumber}...`);
      const comments = await this.github.getReviewComments(state.prNumber);

      console.log(`\nFound ${comments.length} review comment(s):\n`);

      // Group by file
      const byFile: Record<string, typeof comments> = {};
      comments.forEach((c) => {
        if (!byFile[c.path]) {
          byFile[c.path] = [];
        }
        byFile[c.path].push(c);
      });

      // Display
      Object.entries(byFile).forEach(([file, fileComments]) => {
        console.log(`${file}:`);
        fileComments.forEach((c) => {
          console.log(`  Line ${c.line || c.position}: ${c.body}`);
          console.log(`    by ${c.createdAt?.toLocaleString() || 'unknown'}`);
        });
        console.log();
      });
    } catch (error) {
      console.error(`Error loading comments: ${error}`);
    }
  }

  /**
   * Load general PR comments (issue comments)
   */
  async loadGeneralComments(): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected.');
      return;
    }

    try {
      console.log(`Loading general comments for PR #${state.prNumber}...`);
      const comments = await this.github.getIssueComments(state.prNumber);

      console.log(`\nFound ${comments.length} general comment(s):\n`);

      comments.forEach((c) => {
        console.log(`[${c.user}] at ${c.createdAt.toLocaleString()}:`);
        console.log(c.body);
        console.log('-'.repeat(80));
      });
    } catch (error) {
      console.error(`Error loading comments: ${error}`);
    }
  }

  /**
   * Submit review as APPROVE
   */
  async acceptReview(): Promise<void> {
    await this.submitReview('APPROVE');
  }

  /**
   * Submit review as REQUEST_CHANGES
   */
  async rejectReview(): Promise<void> {
    await this.submitReview('REQUEST_CHANGES');
  }

  /**
   * Submit a review
   */
  private async submitReview(event: 'APPROVE' | 'REQUEST_CHANGES'): Promise<void> {
    const state = this.session.getState();
    if (!state.prNumber) {
      console.log('No PR selected.');
      return;
    }

    const unpushed = this.session.getUnpushedCommentCount();
    const action = event === 'APPROVE' ? 'approve' : 'request changes for';

    console.log(`\nPreparing to ${action} PR #${state.prNumber}...`);
    if (unpushed > 0) {
      console.log(`This will submit ${unpushed} local comment(s).`);
    } else {
      console.log('No local comments to submit.');
    }

    const confirm = await readLine('Type "yes" to confirm: ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Review submission cancelled.');
      return;
    }

    const reviewBody = await readLine('Optional review message (press Enter to skip): ');

    try {
      // Collect all local comments
      const reviewComments = [];

      // Add file comments
      for (const [, comments] of Object.entries(state.comments.files)) {
        for (const comment of comments) {
          if (comment.status === 'local') {
            reviewComments.push({
              path: comment.path,
              position: comment.position,
              body: comment.body,
            });
          }
        }
      }

      // Build review body with global comments
      let fullBody = reviewBody || '';
      const globalComments = state.comments.global
        .filter((c) => c.status === 'local')
        .map((c) => c.body);

      if (globalComments.length > 0) {
        fullBody = fullBody
          ? fullBody + '\n\n' + globalComments.join('\n\n')
          : globalComments.join('\n\n');
      }

      await this.github.submitReview(state.prNumber, {
        event,
        body: fullBody || undefined,
        comments: reviewComments,
      });

      // Mark all comments as pushed
      state.comments.global.forEach((c) => {
        if (c.status === 'local') c.status = 'pushed';
      });
      Object.values(state.comments.files).forEach((comments) => {
        comments.forEach((c) => {
          if (c.status === 'local') c.status = 'pushed';
        });
      });

      this.session.updateState(state);
      console.log(`\nSuccessfully submitted ${event} review!`);
    } catch (error) {
      console.error(`Error submitting review: ${error}`);
    }
  }

  /**
   * Delete a comment
   */
  deleteComment(args: string): void {
    const state = this.session.getState();
    const parts = args.trim().toLowerCase();

    if (!parts) {
      console.log('Usage: cd <position|g>');
      return;
    }

    if (parts === 'g') {
      // Delete last global comment
      if (state.comments.global.length === 0) {
        console.log('No global comments to delete.');
        return;
      }
      state.comments.global.pop();
      console.log('Deleted last global comment.');
    } else {
      // Delete file comment by position
      const pos = parseInt(parts, 10);
      if (isNaN(pos)) {
        console.log('Invalid position.');
        return;
      }

      if (!state.currentFileName) {
        console.log('No file selected.');
        return;
      }

      const fileComments = state.comments.files[state.currentFileName];
      if (!fileComments || fileComments.length === 0) {
        console.log('No comments for this file.');
        return;
      }

      if (pos < 1 || pos > fileComments.length) {
        console.log(`Invalid position. Valid range: 1-${fileComments.length}`);
        return;
      }

      fileComments.splice(pos - 1, 1);
      console.log(`Deleted comment at position ${pos}.`);

      if (fileComments.length === 0) {
        delete state.comments.files[state.currentFileName];
      }
    }

    this.session.updateState(state);
  }
}
