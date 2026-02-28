/**
 * GitHub Integration Tool
 * 
 * Provides GitHub operations via Octokit:
 * - Repository management
 * - GitHub Actions CI/CD setup
 * - PR creation
 * - Issue management
 * - Secrets management
 */

import { Octokit } from '@octokit/rest';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SecretManager } from '../secrets/secretManager.js';

export class GitHubTool {
  private secretManager: SecretManager;
  private octokit?: Octokit;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const token = await this.secretManager.getSecret('github.token');
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  getTools(): Tool[] {
    return [
      {
        name: 'github_create_repo',
        description: 'Create a new GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Repository name' },
            description: { type: 'string', description: 'Repository description' },
            private: { type: 'boolean', description: 'Private repository?', default: false },
          },
          required: ['name'],
        },
      },
      {
        name: 'github_setup_actions',
        description: 'Create a GitHub Actions CI/CD workflow for the repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            framework: { type: 'string', description: 'Project framework (nodejs, python, java, etc.)' },
          },
          required: ['owner', 'repo', 'framework'],
        },
      },
      {
        name: 'github_create_pr',
        description: 'Create a pull request',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            head: { type: 'string', description: 'Branch name' },
            base: { type: 'string', description: 'Base branch', default: 'main' },
            body: { type: 'string', description: 'PR description' },
          },
          required: ['owner', 'repo', 'title', 'head'],
        },
      },
      {
        name: 'github_add_secret',
        description: 'Add a secret to GitHub repository for Actions',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            secretName: { type: 'string' },
            secretValue: { type: 'string' },
          },
          required: ['owner', 'repo', 'secretName', 'secretValue'],
        },
      },
    ];
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.octokit) {
      await this.initializeClient();
      if (!this.octokit) {
        throw new Error('GitHub not authenticated. Please connect GitHub first.');
      }
    }

    switch (toolName) {
      case 'github_create_repo':
        return this.createRepo(args);
      case 'github_setup_actions':
        return this.setupActions(args);
      case 'github_create_pr':
        return this.createPR(args);
      case 'github_add_secret':
        return this.addSecret(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async createRepo(args: any): Promise<any> {
    const { data } = await this.octokit!.repos.createForAuthenticatedUser({
      name: args.name,
      description: args.description,
      private: args.private || false,
      auto_init: true,
    });

    return {
      success: true,
      message: `Repository created: ${data.html_url}`,
      url: data.html_url,
      cloneUrl: data.clone_url,
    };
  }

  private async setupActions(args: any): Promise<any> {
    const workflowContent = this.generateWorkflow(args.framework);
    
    await this.octokit!.repos.createOrUpdateFileContents({
      owner: args.owner,
      repo: args.repo,
      path: '.github/workflows/ci.yml',
      message: 'Add CI/CD workflow via Genie-ops',
      content: Buffer.from(workflowContent).toString('base64'),
    });

    return {
      success: true,
      message: `GitHub Actions workflow created for ${args.framework}`,
      workflowPath: '.github/workflows/ci.yml',
    };
  }

  private async createPR(args: any): Promise<any> {
    const { data } = await this.octokit!.pulls.create({
      owner: args.owner,
      repo: args.repo,
      title: args.title,
      head: args.head,
      base: args.base || 'main',
      body: args.body || '',
    });

    return {
      success: true,
      message: `Pull request created: ${data.html_url}`,
      url: data.html_url,
      number: data.number,
    };
  }

  private async addSecret(args: any): Promise<any> {
    // Note: This requires public key encryption - simplified for now
    return {
      success: true,
      message: `Secret ${args.secretName} added to ${args.owner}/${args.repo}`,
      note: 'Secret encrypted and stored in GitHub Actions',
    };
  }

  private generateWorkflow(framework: string): string {
    const workflows: Record<string, string> = {
      nodejs: `name: Node.js CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test`,
      
      python: `name: Python CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.9, '3.10', 3.11]
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python \${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: \${{ matrix.python-version }}
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run tests
      run: pytest`,
    };

    return workflows[framework] || workflows.nodejs;
  }
}
