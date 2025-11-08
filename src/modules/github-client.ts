/**
 * GitHub API client module
 * Handles all interactions with GitHub via the Octokit REST API and gh CLI
 */

import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import { PullRequest, PRFile, Review } from '../types';

export class GitHubClient {
  private octokit: Octokit | null = null;
  private owner: string = '';
  private repo: string = '';

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize the GitHub client using gh CLI authentication
   */
  private initializeClient(): void {
    try {
      // Check if gh CLI is authenticated
      execSync('gh auth status', { stdio: 'pipe' });

      // Get auth token from gh CLI
      const token = execSync('gh auth token', { encoding: 'utf-8' }).trim();

      this.octokit = new Octokit({ auth: token });

      // Get repo information
      const repoInfo = execSync('gh repo view --json owner,name', { encoding: 'utf-8' });
      const { owner, name } = JSON.parse(repoInfo);
      this.owner = owner.login;
      this.repo = name;
    } catch {
      throw new Error('GitHub CLI is not authenticated. Please run "gh auth login" first.');
    }
  }

  /**
   * List open pull requests
   */
  async listPullRequests(limit: number = 50): Promise<PullRequest[]> {
    if (!this.octokit) throw new Error('GitHub client not initialized');

    const { data } = await this.octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      per_page: limit,
    });

    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state as 'open' | 'closed',
      author: pr.user?.login || 'unknown',
      url: pr.html_url,
    }));
  }

  /**
   * Get files for a pull request with pagination support
   */
  async getPRFiles(prNumber: number): Promise<PRFile[]> {
    if (!this.octokit) throw new Error('GitHub client not initialized');

    const files: PRFile[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data } = await this.octokit.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: perPage,
        page,
      });

      if (data.length === 0) break;

      files.push(
        ...data.map((file) => ({
          filename: file.filename,
          status: file.status as 'added' | 'removed' | 'modified' | 'renamed',
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        }))
      );

      if (data.length < perPage) break;
      page++;
    }

    return files;
  }

  /**
   * Get diff for a specific file using gh CLI
   */
  getDiff(prNumber: number, filename: string, ignoreWhitespace: boolean = false): string {
    try {
      const wsFlag = ignoreWhitespace ? '-w' : '';
      const cmd = `gh pr diff ${prNumber} ${wsFlag} -- "${filename}"`;
      return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      return `Error fetching diff: ${error}`;
    }
  }

  /**
   * Get file content at a specific commit
   */
  async getFileContent(ref: string, path: string): Promise<string> {
    if (!this.octokit) throw new Error('GitHub client not initialized');

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return '';
    } catch (error) {
      throw new Error(`Failed to get file content: ${error}`);
    }
  }

  /**
   * Submit a review with comments
   */
  async submitReview(prNumber: number, review: Review): Promise<void> {
    if (!this.octokit) throw new Error('GitHub client not initialized');

    await this.octokit.pulls.createReview({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      event: review.event,
      body: review.body,
      comments: review.comments.map((c) => ({
        path: c.path,
        position: c.position,
        body: c.body,
      })),
    });
  }

  /**
   * Get existing review comments for a PR
   */
  async getReviewComments(prNumber: number): Promise<ReviewComment[]> {
    if (!this.octokit) throw new Error('GitHub client not initialized');

    const { data } = await this.octokit.pulls.listReviewComments({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return data.map((comment) => ({
      id: String(comment.id),
      body: comment.body,
      path: comment.path,
      position: comment.position || comment.original_position || 0,
      line: comment.line,
      status: 'pushed' as const,
      createdAt: new Date(comment.created_at),
    }));
  }

  /**
   * Get general PR comments (issue comments)
   */
  async getIssueComments(prNumber: number) {
    if (!this.octokit) throw new Error('GitHub client not initialized');

    const { data } = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });

    return data.map((comment) => ({
      id: String(comment.id),
      body: comment.body || '',
      user: comment.user?.login || 'unknown',
      createdAt: new Date(comment.created_at),
    }));
  }

  getOwner(): string {
    return this.owner;
  }

  getRepo(): string {
    return this.repo;
  }
}

type ReviewComment = {
  id: string;
  body: string;
  path: string;
  position: number;
  line?: number;
  status: 'pushed';
  createdAt: Date;
};
