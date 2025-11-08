/**
 * Core type definitions for the ghr application
 */

export interface PullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  url: string;
  files?: PRFile[];
}

export interface PRFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface Comment {
  id?: string;
  body: string;
  path?: string;
  position?: number;
  line?: number;
  status: 'local' | 'pushed';
  createdAt?: Date;
}

export interface ReviewComment extends Comment {
  path: string;
  position: number;
}

export interface GlobalComment extends Comment {
  path?: never;
  position?: never;
}

export interface Review {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
  comments: ReviewComment[];
}

export interface SessionState {
  prNumber?: number;
  currentFileIndex?: number;
  currentFileName?: string;
  comments: {
    global: GlobalComment[];
    files: Record<string, ReviewComment[]>;
  };
  grepSet?: number[];
  currentGrepIndex?: number;
}

export interface AppConfig {
  geminiApiKey?: string;
  historyMaxSize: number;
  defaultEditor?: string;
}

export interface CommandContext {
  state: SessionState;
  files: Map<string, PRFile>;
  prFiles: string[];
}

export type CommandHandler = (args: string, context: CommandContext) => Promise<void> | void;
