/**
 * GitHub Integration Client
 * 
 * Provides comprehensive GitHub API integration for:
 * - Repository management
 * - Issues and Pull Requests
 * - Actions (Workflows)
 * - Releases
 * - Notifications
 */

import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { SecretsService } from '../services/secretsService';
import { LoggingService } from '../services/loggingService';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  labels: Array<{ name: string; color: string }>;
  assignees: GitHubUser[];
  milestone: { title: string; number: number } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitHubPullRequest extends GitHubIssue {
  merged: boolean;
  merged_at: string | null;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  mergeable: boolean | null;
  draft: boolean;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  workflow_id: number;
  html_url: string;
  head_branch: string;
  head_sha: string;
  run_number: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  created_at: string;
  published_at: string | null;
  author: GitHubUser;
}

export interface CreateIssueOptions {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface CreatePROptions {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
  maintainer_can_modify?: boolean;
}

export interface CreateReleaseOptions {
  tag_name: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  target_commitish?: string;
  generate_release_notes?: boolean;
}

export class GitHubClient {
  private client: AxiosInstance | null = null;
  private secretsService: SecretsService;
  private logger: LoggingService;
  private currentUser: GitHubUser | null = null;

  constructor(secretsService: SecretsService, logger: LoggingService) {
    this.secretsService = secretsService;
    this.logger = logger;
  }

  async connect(): Promise<boolean> {
    const credentials = await this.secretsService.getCredentials('github');
    
    if (!credentials?.accessToken) {
      this.logger.warn('GitHub credentials not found');
      return false;
    }

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `token ${credentials.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Add response interceptor for rate limiting
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        if (error.response?.status === 403) {
          const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
          const rateLimitReset = error.response.headers['x-ratelimit-reset'];
          
          if (rateLimitRemaining === '0') {
            const resetTime = new Date(parseInt(rateLimitReset as string) * 1000);
            this.logger.warn(`GitHub rate limit exceeded. Resets at ${resetTime.toISOString()}`);
          }
        }
        throw error;
      }
    );

    try {
      // Verify connection by getting current user
      this.currentUser = await this.getCurrentUser();
      this.logger.info(`GitHub connected as ${this.currentUser.login}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to GitHub', error);
      this.client = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.currentUser = null;
    this.logger.info('GitHub disconnected');
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error('GitHub client not connected. Call connect() first.');
    }
  }

  // User operations
  async getCurrentUser(): Promise<GitHubUser> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubUser>('/user');
    return response.data;
  }

  // Repository operations
  async listRepos(options: { 
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
  } = {}): Promise<GitHubRepo[]> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubRepo[]>('/user/repos', {
      params: {
        type: options.type || 'owner',
        sort: options.sort || 'pushed',
        per_page: options.per_page || 30
      }
    });
    return response.data;
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubRepo>(`/repos/${owner}/${repo}`);
    return response.data;
  }

  async createRepo(name: string, options: {
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  } = {}): Promise<GitHubRepo> {
    this.ensureConnected();
    const response = await this.client!.post<GitHubRepo>('/user/repos', {
      name,
      ...options
    });
    return response.data;
  }

  // Issues operations
  async listIssues(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubIssue[]> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubIssue[]>(
      `/repos/${owner}/${repo}/issues`,
      { params: { ...options, per_page: options.per_page || 30 } }
    );
    return response.data;
  }

  async getIssue(owner: string, repo: string, issue_number: number): Promise<GitHubIssue> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubIssue>(
      `/repos/${owner}/${repo}/issues/${issue_number}`
    );
    return response.data;
  }

  async createIssue(owner: string, repo: string, options: CreateIssueOptions): Promise<GitHubIssue> {
    this.ensureConnected();
    const response = await this.client!.post<GitHubIssue>(
      `/repos/${owner}/${repo}/issues`,
      options
    );
    return response.data;
  }

  async updateIssue(owner: string, repo: string, issue_number: number, options: Partial<CreateIssueOptions> & { state?: 'open' | 'closed' }): Promise<GitHubIssue> {
    this.ensureConnected();
    const response = await this.client!.patch<GitHubIssue>(
      `/repos/${owner}/${repo}/issues/${issue_number}`,
      options
    );
    return response.data;
  }

  async addIssueComment(owner: string, repo: string, issue_number: number, body: string): Promise<{ id: number; body: string }> {
    this.ensureConnected();
    const response = await this.client!.post(
      `/repos/${owner}/${repo}/issues/${issue_number}/comments`,
      { body }
    );
    return response.data;
  }

  // Pull Request operations
  async listPullRequests(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubPullRequest[]> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubPullRequest[]>(
      `/repos/${owner}/${repo}/pulls`,
      { params: { ...options, per_page: options.per_page || 30 } }
    );
    return response.data;
  }

  async getPullRequest(owner: string, repo: string, pull_number: number): Promise<GitHubPullRequest> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${pull_number}`
    );
    return response.data;
  }

  async createPullRequest(owner: string, repo: string, options: CreatePROptions): Promise<GitHubPullRequest> {
    this.ensureConnected();
    const response = await this.client!.post<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls`,
      options
    );
    return response.data;
  }

  async mergePullRequest(owner: string, repo: string, pull_number: number, options: {
    commit_title?: string;
    commit_message?: string;
    merge_method?: 'merge' | 'squash' | 'rebase';
  } = {}): Promise<{ merged: boolean; message: string }> {
    this.ensureConnected();
    const response = await this.client!.put(
      `/repos/${owner}/${repo}/pulls/${pull_number}/merge`,
      {
        merge_method: options.merge_method || 'merge',
        commit_title: options.commit_title,
        commit_message: options.commit_message
      }
    );
    return response.data;
  }

  async requestReviewers(owner: string, repo: string, pull_number: number, reviewers: string[]): Promise<void> {
    this.ensureConnected();
    await this.client!.post(
      `/repos/${owner}/${repo}/pulls/${pull_number}/requested_reviewers`,
      { reviewers }
    );
  }

  // Actions (Workflows) operations
  async listWorkflows(owner: string, repo: string): Promise<Array<{ id: number; name: string; path: string; state: string }>> {
    this.ensureConnected();
    const response = await this.client!.get(`/repos/${owner}/${repo}/actions/workflows`);
    return response.data.workflows;
  }

  async listWorkflowRuns(owner: string, repo: string, options: {
    workflow_id?: number;
    branch?: string;
    status?: 'queued' | 'in_progress' | 'completed';
    per_page?: number;
  } = {}): Promise<GitHubWorkflowRun[]> {
    this.ensureConnected();
    
    let url = `/repos/${owner}/${repo}/actions/runs`;
    if (options.workflow_id) {
      url = `/repos/${owner}/${repo}/actions/workflows/${options.workflow_id}/runs`;
    }

    const response = await this.client!.get(url, {
      params: {
        branch: options.branch,
        status: options.status,
        per_page: options.per_page || 30
      }
    });
    return response.data.workflow_runs;
  }

  async getWorkflowRun(owner: string, repo: string, run_id: number): Promise<GitHubWorkflowRun> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubWorkflowRun>(
      `/repos/${owner}/${repo}/actions/runs/${run_id}`
    );
    return response.data;
  }

  async triggerWorkflow(owner: string, repo: string, workflow_id: string | number, ref: string, inputs?: Record<string, string>): Promise<void> {
    this.ensureConnected();
    await this.client!.post(
      `/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
      { ref, inputs }
    );
    this.logger.info(`Triggered workflow ${workflow_id} on ${ref}`);
  }

  async rerunWorkflow(owner: string, repo: string, run_id: number): Promise<void> {
    this.ensureConnected();
    await this.client!.post(`/repos/${owner}/${repo}/actions/runs/${run_id}/rerun`);
  }

  async cancelWorkflowRun(owner: string, repo: string, run_id: number): Promise<void> {
    this.ensureConnected();
    await this.client!.post(`/repos/${owner}/${repo}/actions/runs/${run_id}/cancel`);
  }

  // Release operations
  async listReleases(owner: string, repo: string, per_page: number = 30): Promise<GitHubRelease[]> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubRelease[]>(
      `/repos/${owner}/${repo}/releases`,
      { params: { per_page } }
    );
    return response.data;
  }

  async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
    this.ensureConnected();
    const response = await this.client!.get<GitHubRelease>(
      `/repos/${owner}/${repo}/releases/latest`
    );
    return response.data;
  }

  async createRelease(owner: string, repo: string, options: CreateReleaseOptions): Promise<GitHubRelease> {
    this.ensureConnected();
    const response = await this.client!.post<GitHubRelease>(
      `/repos/${owner}/${repo}/releases`,
      options
    );
    return response.data;
  }

  // Branch operations
  async listBranches(owner: string, repo: string, per_page: number = 30): Promise<Array<{ name: string; protected: boolean }>> {
    this.ensureConnected();
    const response = await this.client!.get(`/repos/${owner}/${repo}/branches`, {
      params: { per_page }
    });
    return response.data;
  }

  async createBranch(owner: string, repo: string, branchName: string, fromSha: string): Promise<void> {
    this.ensureConnected();
    await this.client!.post(`/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: fromSha
    });
  }

  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    this.ensureConnected();
    await this.client!.delete(`/repos/${owner}/${repo}/git/refs/heads/${branchName}`);
  }

  // Search operations
  async searchRepos(query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubRepo[]> {
    this.ensureConnected();
    const response = await this.client!.get('/search/repositories', {
      params: { q: query, ...options, per_page: options.per_page || 30 }
    });
    return response.data.items;
  }

  async searchIssues(query: string, options: {
    sort?: 'comments' | 'reactions' | 'created' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubIssue[]> {
    this.ensureConnected();
    const response = await this.client!.get('/search/issues', {
      params: { q: query, ...options, per_page: options.per_page || 30 }
    });
    return response.data.items;
  }

  // Notification operations
  async listNotifications(options: {
    all?: boolean;
    participating?: boolean;
    since?: string;
    per_page?: number;
  } = {}): Promise<Array<{ id: string; reason: string; subject: { title: string; url: string; type: string } }>> {
    this.ensureConnected();
    const response = await this.client!.get('/notifications', {
      params: { ...options, per_page: options.per_page || 50 }
    });
    return response.data;
  }

  async markNotificationAsRead(thread_id: string): Promise<void> {
    this.ensureConnected();
    await this.client!.patch(`/notifications/threads/${thread_id}`);
  }

  // OAuth helper for initial setup
  static getOAuthUrl(clientId: string, redirectUri: string, scopes: string[] = ['repo', 'workflow', 'read:user']): string {
    const scopeString = scopes.join(' ');
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopeString)}`;
  }
}
