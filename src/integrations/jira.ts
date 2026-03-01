/**
 * Jira Integration
 * Comprehensive Jira client for issues, projects, sprints, and workflows
 */

import * as vscode from 'vscode';

// Jira types
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead: { accountId: string; displayName: string };
  avatarUrls: Record<string, string>;
  url: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string | JiraDocument;
    status: { name: string; id: string; statusCategory: { name: string; colorName: string } };
    priority: { name: string; id: string; iconUrl: string };
    issuetype: { name: string; id: string; iconUrl: string };
    assignee?: { accountId: string; displayName: string; avatarUrls: Record<string, string> };
    reporter: { accountId: string; displayName: string; avatarUrls: Record<string, string> };
    project: { key: string; name: string };
    created: string;
    updated: string;
    duedate?: string;
    labels: string[];
    components: Array<{ id: string; name: string }>;
    fixVersions: Array<{ id: string; name: string }>;
    parent?: { key: string; fields: { summary: string } };
    subtasks: Array<{ key: string; fields: { summary: string; status: { name: string } } }>;
    comment?: { total: number; comments: JiraComment[] };
    customfield_10020?: number; // Story points (common custom field)
    [key: string]: any;
  };
}

export interface JiraDocument {
  type: 'doc';
  version: 1;
  content: any[];
}

export interface JiraComment {
  id: string;
  author: { accountId: string; displayName: string; avatarUrls: Record<string, string> };
  body: string | JiraDocument;
  created: string;
  updated: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string; id: string; statusCategory: { name: string } };
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isConditional: boolean;
}

export interface JiraSprint {
  id: number;
  self: string;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId: number;
  goal?: string;
}

export interface JiraBoard {
  id: number;
  self: string;
  name: string;
  type: 'scrum' | 'kanban' | 'simple';
  location: { projectId: number; projectKey: string; projectName: string };
}

export interface JiraVersion {
  id: string;
  self: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  projectId: number;
}

export interface JiraWorklog {
  id: string;
  author: { accountId: string; displayName: string };
  timeSpent: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string | JiraDocument;
}

export interface CreateIssueInput {
  projectKey: string;
  summary: string;
  issueType: string;
  description?: string;
  assigneeId?: string;
  priority?: string;
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  parentKey?: string;
  customFields?: Record<string, any>;
}

export interface UpdateIssueInput {
  summary?: string;
  description?: string;
  assigneeId?: string;
  priority?: string;
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  customFields?: Record<string, any>;
}

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

/**
 * Jira Integration Client
 * Provides comprehensive access to Jira functionality
 */
export class JiraIntegration {
  private config: JiraConfig;
  private outputChannel: vscode.OutputChannel;

  constructor(config: JiraConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('DevOps Omnibus - Jira');
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make API request to Jira
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}/rest/api/3/${endpoint}`;
    this.log(`${method} ${endpoint}`);

    // This would use fetch or axios in production
    throw new Error('Jira credentials not configured. Please set up Jira integration.');
  }

  /**
   * Make Agile API request
   */
  private async agileRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}/rest/agile/1.0/${endpoint}`;
    this.log(`${method} ${endpoint}`);

    throw new Error('Jira credentials not configured. Please set up Jira integration.');
  }

  // ============================================
  // Project Operations
  // ============================================

  /**
   * List all projects
   */
  async listProjects(): Promise<JiraProject[]> {
    const result = await this.request<{ values: JiraProject[] }>('project/search');
    return result.values;
  }

  /**
   * Get project details
   */
  async getProject(projectKeyOrId: string): Promise<JiraProject> {
    return this.request<JiraProject>(`project/${projectKeyOrId}`);
  }

  /**
   * Get project versions
   */
  async getProjectVersions(projectKeyOrId: string): Promise<JiraVersion[]> {
    return this.request<JiraVersion[]>(`project/${projectKeyOrId}/versions`);
  }

  /**
   * Create a version
   */
  async createVersion(options: {
    projectId: number;
    name: string;
    description?: string;
    releaseDate?: string;
    startDate?: string;
  }): Promise<JiraVersion> {
    return this.request<JiraVersion>('version', 'POST', options);
  }

  /**
   * Release a version
   */
  async releaseVersion(versionId: string): Promise<void> {
    await this.request(`version/${versionId}`, 'PUT', {
      released: true,
      releaseDate: new Date().toISOString().split('T')[0],
    });
  }

  // ============================================
  // Issue Operations
  // ============================================

  /**
   * Search issues using JQL
   */
  async searchIssues(
    jql: string,
    options?: {
      startAt?: number;
      maxResults?: number;
      fields?: string[];
      expand?: string[];
    }
  ): Promise<{ issues: JiraIssue[]; total: number }> {
    const result = await this.request<{ issues: JiraIssue[]; total: number }>('search', 'POST', {
      jql,
      startAt: options?.startAt || 0,
      maxResults: options?.maxResults || 50,
      fields: options?.fields || ['*all'],
      expand: options?.expand,
    });

    return result;
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string, expand?: string[]): Promise<JiraIssue> {
    const params = expand ? `?expand=${expand.join(',')}` : '';
    return this.request<JiraIssue>(`issue/${issueKey}${params}`);
  }

  /**
   * Create an issue
   */
  async createIssue(input: CreateIssueInput): Promise<JiraIssue> {
    const fields: Record<string, any> = {
      project: { key: input.projectKey },
      summary: input.summary,
      issuetype: { name: input.issueType },
    };

    if (input.description) {
      fields.description = this.textToDocument(input.description);
    }

    if (input.assigneeId) {
      fields.assignee = { accountId: input.assigneeId };
    }

    if (input.priority) {
      fields.priority = { name: input.priority };
    }

    if (input.labels) {
      fields.labels = input.labels;
    }

    if (input.components) {
      fields.components = input.components.map(name => ({ name }));
    }

    if (input.fixVersions) {
      fields.fixVersions = input.fixVersions.map(name => ({ name }));
    }

    if (input.parentKey) {
      fields.parent = { key: input.parentKey };
    }

    if (input.customFields) {
      Object.assign(fields, input.customFields);
    }

    return this.request<JiraIssue>('issue', 'POST', { fields });
  }

  /**
   * Update an issue
   */
  async updateIssue(issueKey: string, input: UpdateIssueInput): Promise<void> {
    const fields: Record<string, any> = {};

    if (input.summary) {
      fields.summary = input.summary;
    }

    if (input.description !== undefined) {
      fields.description = input.description ? this.textToDocument(input.description) : null;
    }

    if (input.assigneeId !== undefined) {
      fields.assignee = input.assigneeId ? { accountId: input.assigneeId } : null;
    }

    if (input.priority) {
      fields.priority = { name: input.priority };
    }

    if (input.labels) {
      fields.labels = input.labels;
    }

    if (input.components) {
      fields.components = input.components.map(name => ({ name }));
    }

    if (input.fixVersions) {
      fields.fixVersions = input.fixVersions.map(name => ({ name }));
    }

    if (input.customFields) {
      Object.assign(fields, input.customFields);
    }

    await this.request(`issue/${issueKey}`, 'PUT', { fields });
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueKey: string, deleteSubtasks = true): Promise<void> {
    await this.request(`issue/${issueKey}?deleteSubtasks=${deleteSubtasks}`, 'DELETE');
  }

  /**
   * Assign issue
   */
  async assignIssue(issueKey: string, accountId: string | null): Promise<void> {
    await this.request(`issue/${issueKey}/assignee`, 'PUT', { accountId });
  }

  /**
   * Get issue transitions
   */
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const result = await this.request<{ transitions: JiraTransition[] }>(`issue/${issueKey}/transitions`);
    return result.transitions;
  }

  /**
   * Transition issue
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    fields?: Record<string, any>,
    comment?: string
  ): Promise<void> {
    const body: any = {
      transition: { id: transitionId },
    };

    if (fields) {
      body.fields = fields;
    }

    if (comment) {
      body.update = {
        comment: [{
          add: {
            body: this.textToDocument(comment),
          },
        }],
      };
    }

    await this.request(`issue/${issueKey}/transitions`, 'POST', body);
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey: string, body: string): Promise<JiraComment> {
    return this.request<JiraComment>(`issue/${issueKey}/comment`, 'POST', {
      body: this.textToDocument(body),
    });
  }

  /**
   * Get issue comments
   */
  async getComments(issueKey: string): Promise<JiraComment[]> {
    const result = await this.request<{ comments: JiraComment[] }>(`issue/${issueKey}/comment`);
    return result.comments;
  }

  /**
   * Add worklog to issue
   */
  async addWorklog(
    issueKey: string,
    timeSpent: string,
    started?: string,
    comment?: string
  ): Promise<JiraWorklog> {
    return this.request<JiraWorklog>(`issue/${issueKey}/worklog`, 'POST', {
      timeSpent,
      started: started || new Date().toISOString(),
      comment: comment ? this.textToDocument(comment) : undefined,
    });
  }

  /**
   * Watch an issue
   */
  async watchIssue(issueKey: string): Promise<void> {
    await this.request(`issue/${issueKey}/watchers`, 'POST');
  }

  /**
   * Link issues
   */
  async linkIssues(
    inwardIssue: string,
    outwardIssue: string,
    linkType: string
  ): Promise<void> {
    await this.request('issueLink', 'POST', {
      type: { name: linkType },
      inwardIssue: { key: inwardIssue },
      outwardIssue: { key: outwardIssue },
    });
  }

  // ============================================
  // Sprint and Board Operations
  // ============================================

  /**
   * List all boards
   */
  async listBoards(projectKeyOrId?: string): Promise<JiraBoard[]> {
    const params = projectKeyOrId ? `?projectKeyOrId=${projectKeyOrId}` : '';
    const result = await this.agileRequest<{ values: JiraBoard[] }>(`board${params}`);
    return result.values;
  }

  /**
   * Get board details
   */
  async getBoard(boardId: number): Promise<JiraBoard> {
    return this.agileRequest<JiraBoard>(`board/${boardId}`);
  }

  /**
   * List sprints for a board
   */
  async listSprints(
    boardId: number,
    state?: 'active' | 'closed' | 'future'
  ): Promise<JiraSprint[]> {
    const params = state ? `?state=${state}` : '';
    const result = await this.agileRequest<{ values: JiraSprint[] }>(`board/${boardId}/sprint${params}`);
    return result.values;
  }

  /**
   * Get sprint details
   */
  async getSprint(sprintId: number): Promise<JiraSprint> {
    return this.agileRequest<JiraSprint>(`sprint/${sprintId}`);
  }

  /**
   * Get issues in sprint
   */
  async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
    const result = await this.agileRequest<{ issues: JiraIssue[] }>(`sprint/${sprintId}/issue`);
    return result.issues;
  }

  /**
   * Move issues to sprint
   */
  async moveIssuesToSprint(sprintId: number, issueKeys: string[]): Promise<void> {
    await this.agileRequest(`sprint/${sprintId}/issue`, 'POST', {
      issues: issueKeys,
    });
  }

  /**
   * Start a sprint
   */
  async startSprint(
    sprintId: number,
    startDate: string,
    endDate: string,
    goal?: string
  ): Promise<void> {
    await this.agileRequest(`sprint/${sprintId}`, 'POST', {
      state: 'active',
      startDate,
      endDate,
      goal,
    });
  }

  /**
   * Complete a sprint
   */
  async completeSprint(sprintId: number): Promise<void> {
    await this.agileRequest(`sprint/${sprintId}`, 'POST', {
      state: 'closed',
    });
  }

  /**
   * Get backlog issues
   */
  async getBacklogIssues(boardId: number): Promise<JiraIssue[]> {
    const result = await this.agileRequest<{ issues: JiraIssue[] }>(`board/${boardId}/backlog`);
    return result.issues;
  }

  // ============================================
  // User Operations
  // ============================================

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<Array<{ accountId: string; displayName: string; emailAddress?: string }>> {
    const result = await this.request<any[]>(`user/search?query=${encodeURIComponent(query)}`);
    return result;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ accountId: string; displayName: string; emailAddress: string }> {
    return this.request('myself');
  }

  /**
   * Get assignable users for project
   */
  async getAssignableUsers(projectKey: string): Promise<Array<{ accountId: string; displayName: string }>> {
    return this.request(`user/assignable/search?project=${projectKey}`);
  }

  // ============================================
  // Quick Actions
  // ============================================

  /**
   * Get my open issues
   */
  async getMyOpenIssues(): Promise<JiraIssue[]> {
    const result = await this.searchIssues('assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC');
    return result.issues;
  }

  /**
   * Get issues updated today
   */
  async getIssuesUpdatedToday(projectKey?: string): Promise<JiraIssue[]> {
    let jql = 'updated >= startOfDay()';
    if (projectKey) {
      jql = `project = ${projectKey} AND ${jql}`;
    }
    jql += ' ORDER BY updated DESC';
    
    const result = await this.searchIssues(jql);
    return result.issues;
  }

  /**
   * Get sprint burndown data
   */
  async getSprintBurndown(boardId: number, sprintId: number): Promise<any> {
    return this.agileRequest(`board/${boardId}/sprint/${sprintId}/burndown`);
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Convert plain text to Jira Document format
   */
  private textToDocument(text: string): JiraDocument {
    return {
      type: 'doc',
      version: 1,
      content: text.split('\n\n').map(paragraph => ({
        type: 'paragraph',
        content: [{
          type: 'text',
          text: paragraph,
        }],
      })),
    };
  }

  /**
   * Build JQL query
   */
  buildJQL(): JQLBuilder {
    return new JQLBuilder();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

/**
 * JQL Query Builder
 */
export class JQLBuilder {
  private clauses: string[] = [];
  private orderBy?: string;

  project(key: string): this {
    this.clauses.push(`project = ${key}`);
    return this;
  }

  status(status: string | string[]): this {
    if (Array.isArray(status)) {
      this.clauses.push(`status IN (${status.map(s => `"${s}"`).join(', ')})`);
    } else {
      this.clauses.push(`status = "${status}"`);
    }
    return this;
  }

  assignee(accountId: string | 'currentUser()' | 'unassigned'): this {
    if (accountId === 'currentUser()') {
      this.clauses.push('assignee = currentUser()');
    } else if (accountId === 'unassigned') {
      this.clauses.push('assignee is EMPTY');
    } else {
      this.clauses.push(`assignee = "${accountId}"`);
    }
    return this;
  }

  reporter(accountId: string | 'currentUser()'): this {
    if (accountId === 'currentUser()') {
      this.clauses.push('reporter = currentUser()');
    } else {
      this.clauses.push(`reporter = "${accountId}"`);
    }
    return this;
  }

  type(issueType: string | string[]): this {
    if (Array.isArray(issueType)) {
      this.clauses.push(`issuetype IN (${issueType.map(t => `"${t}"`).join(', ')})`);
    } else {
      this.clauses.push(`issuetype = "${issueType}"`);
    }
    return this;
  }

  priority(priority: string | string[]): this {
    if (Array.isArray(priority)) {
      this.clauses.push(`priority IN (${priority.map(p => `"${p}"`).join(', ')})`);
    } else {
      this.clauses.push(`priority = "${priority}"`);
    }
    return this;
  }

  labels(labels: string[]): this {
    labels.forEach(label => {
      this.clauses.push(`labels = "${label}"`);
    });
    return this;
  }

  sprint(sprintName: string | 'openSprints()' | 'futureSprints()' | 'closedSprints()'): this {
    if (sprintName.endsWith('()')) {
      this.clauses.push(`sprint IN ${sprintName}`);
    } else {
      this.clauses.push(`sprint = "${sprintName}"`);
    }
    return this;
  }

  createdAfter(date: string): this {
    this.clauses.push(`created >= "${date}"`);
    return this;
  }

  updatedAfter(date: string): this {
    this.clauses.push(`updated >= "${date}"`);
    return this;
  }

  text(searchText: string): this {
    this.clauses.push(`text ~ "${searchText}"`);
    return this;
  }

  resolved(): this {
    this.clauses.push('resolution is not EMPTY');
    return this;
  }

  unresolved(): this {
    this.clauses.push('resolution is EMPTY');
    return this;
  }

  order(field: string, direction: 'ASC' | 'DESC' = 'DESC'): this {
    this.orderBy = `ORDER BY ${field} ${direction}`;
    return this;
  }

  raw(clause: string): this {
    this.clauses.push(clause);
    return this;
  }

  build(): string {
    let jql = this.clauses.join(' AND ');
    if (this.orderBy) {
      jql += ` ${this.orderBy}`;
    }
    return jql;
  }
}
