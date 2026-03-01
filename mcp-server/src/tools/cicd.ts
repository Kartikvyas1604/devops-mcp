/**
 * CI/CD tool implementations for MCP server
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

interface GitHubWorkflowConfig {
  name: string;
  on: Record<string, unknown>;
  jobs: Record<string, unknown>;
}

interface GitLabPipelineConfig {
  stages: string[];
  [key: string]: unknown;
}

interface JenkinsPipelineConfig {
  pipeline: {
    agent: unknown;
    stages: unknown[];
  };
}

export class CICDTools {
  private githubApi?: AxiosInstance;
  private gitlabApi?: AxiosInstance;
  private jenkinsApi?: AxiosInstance;

  async execute(tool: string, args: Record<string, unknown>): Promise<string> {
    switch (tool) {
      case 'cicd_generate_pipeline':
        return this.generatePipeline(args);
      case 'cicd_trigger_pipeline':
        return this.triggerPipeline(args);
      case 'cicd_get_pipeline_status':
        return this.getPipelineStatus(args);
      default:
        throw new Error(`Unknown CI/CD tool: ${tool}`);
    }
  }

  private async generatePipeline(args: Record<string, unknown>): Promise<string> {
    const platform = args.platform as 'github' | 'gitlab' | 'jenkins' | 'azure';
    const projectType = args.projectType as string;
    const stages = args.stages as string[] ?? ['build', 'test', 'deploy'];
    const deployTarget = args.deployTarget as string | undefined;
    const outputPath = args.outputPath as string | undefined;

    if (!platform || !projectType) {
      throw new Error('Platform and projectType are required');
    }

    let config: string;

    switch (platform) {
      case 'github':
        config = this.generateGitHubWorkflow(projectType, stages, deployTarget);
        break;
      case 'gitlab':
        config = this.generateGitLabPipeline(projectType, stages, deployTarget);
        break;
      case 'jenkins':
        config = this.generateJenkinsfile(projectType, stages, deployTarget);
        break;
      case 'azure':
        config = this.generateAzurePipeline(projectType, stages, deployTarget);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Save to file if path provided
    if (outputPath) {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, config, 'utf-8');
      return JSON.stringify({
        platform,
        projectType,
        stages,
        outputPath,
        message: `Pipeline configuration saved to ${outputPath}`,
        config
      }, null, 2);
    }

    return JSON.stringify({
      platform,
      projectType,
      stages,
      config
    }, null, 2);
  }

  private generateGitHubWorkflow(projectType: string, stages: string[], deployTarget?: string): string {
    const workflow: GitHubWorkflowConfig = {
      name: 'CI/CD Pipeline',
      on: {
        push: { branches: ['main', 'master'] },
        pull_request: { branches: ['main', 'master'] }
      },
      jobs: {}
    };

    // Build job based on project type
    const buildConfig = this.getBuildConfig(projectType);
    
    if (stages.includes('build') || stages.includes('test')) {
      workflow.jobs['build'] = {
        'runs-on': 'ubuntu-latest',
        steps: [
          { uses: 'actions/checkout@v4' },
          ...buildConfig.setupSteps,
          ...(stages.includes('build') ? buildConfig.buildSteps : []),
          ...(stages.includes('test') ? buildConfig.testSteps : [])
        ]
      };
    }

    if (stages.includes('deploy') && deployTarget) {
      workflow.jobs['deploy'] = {
        'runs-on': 'ubuntu-latest',
        needs: 'build',
        if: "github.ref == 'refs/heads/main'",
        steps: [
          { uses: 'actions/checkout@v4' },
          ...this.getDeploySteps('github', deployTarget)
        ]
      };
    }

    return this.toYaml(workflow);
  }

  private generateGitLabPipeline(projectType: string, stages: string[], deployTarget?: string): string {
    const buildConfig = this.getBuildConfig(projectType);
    
    const pipeline: GitLabPipelineConfig = {
      stages,
      image: buildConfig.image
    };

    if (stages.includes('build')) {
      pipeline['build'] = {
        stage: 'build',
        script: buildConfig.buildCommands
      };
    }

    if (stages.includes('test')) {
      pipeline['test'] = {
        stage: 'test',
        script: buildConfig.testCommands
      };
    }

    if (stages.includes('deploy') && deployTarget) {
      pipeline['deploy'] = {
        stage: 'deploy',
        script: this.getDeployCommands(deployTarget),
        only: ['main', 'master']
      };
    }

    return this.toYaml(pipeline);
  }

  private generateJenkinsfile(projectType: string, stages: string[], deployTarget?: string): string {
    const buildConfig = this.getBuildConfig(projectType);
    
    const pipelineStages: string[] = [];

    if (stages.includes('build')) {
      pipelineStages.push(`
        stage('Build') {
            steps {
                ${buildConfig.buildCommands.map(cmd => `sh '${cmd}'`).join('\n                ')}
            }
        }`);
    }

    if (stages.includes('test')) {
      pipelineStages.push(`
        stage('Test') {
            steps {
                ${buildConfig.testCommands.map(cmd => `sh '${cmd}'`).join('\n                ')}
            }
        }`);
    }

    if (stages.includes('deploy') && deployTarget) {
      pipelineStages.push(`
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                ${this.getDeployCommands(deployTarget).map(cmd => `sh '${cmd}'`).join('\n                ')}
            }
        }`);
    }

    return `pipeline {
    agent any
    
    stages {${pipelineStages.join('\n')}
    }
    
    post {
        always {
            cleanWs()
        }
    }
}`;
  }

  private generateAzurePipeline(projectType: string, stages: string[], deployTarget?: string): string {
    const buildConfig = this.getBuildConfig(projectType);
    
    const pipeline: Record<string, unknown> = {
      trigger: ['main', 'master'],
      pool: {
        vmImage: 'ubuntu-latest'
      },
      stages: []
    };

    const pipelineStages = pipeline.stages as Record<string, unknown>[];

    if (stages.includes('build') || stages.includes('test')) {
      const jobs: Record<string, unknown>[] = [];
      const steps: Record<string, unknown>[] = [];

      if (stages.includes('build')) {
        buildConfig.buildCommands.forEach(cmd => {
          steps.push({ script: cmd, displayName: 'Build' });
        });
      }

      if (stages.includes('test')) {
        buildConfig.testCommands.forEach(cmd => {
          steps.push({ script: cmd, displayName: 'Test' });
        });
      }

      jobs.push({ job: 'BuildAndTest', steps });
      pipelineStages.push({ stage: 'Build', jobs });
    }

    if (stages.includes('deploy') && deployTarget) {
      const deploySteps = this.getDeployCommands(deployTarget).map(cmd => ({
        script: cmd,
        displayName: 'Deploy'
      }));
      
      pipelineStages.push({
        stage: 'Deploy',
        condition: "eq(variables['Build.SourceBranch'], 'refs/heads/main')",
        jobs: [{ job: 'Deploy', steps: deploySteps }]
      });
    }

    return this.toYaml(pipeline);
  }

  private getBuildConfig(projectType: string): {
    image: string;
    setupSteps: Record<string, unknown>[];
    buildSteps: Record<string, unknown>[];
    testSteps: Record<string, unknown>[];
    buildCommands: string[];
    testCommands: string[];
  } {
    switch (projectType.toLowerCase()) {
      case 'node':
      case 'nodejs':
      case 'javascript':
      case 'typescript':
        return {
          image: 'node:20',
          setupSteps: [
            { uses: 'actions/setup-node@v4', with: { 'node-version': '20', cache: 'npm' } }
          ],
          buildSteps: [
            { run: 'npm ci' },
            { run: 'npm run build --if-present' }
          ],
          testSteps: [
            { run: 'npm test' }
          ],
          buildCommands: ['npm ci', 'npm run build --if-present'],
          testCommands: ['npm test']
        };

      case 'python':
        return {
          image: 'python:3.11',
          setupSteps: [
            { uses: 'actions/setup-python@v5', with: { 'python-version': '3.11' } },
            { run: 'pip install -r requirements.txt' }
          ],
          buildSteps: [],
          testSteps: [
            { run: 'pytest' }
          ],
          buildCommands: ['pip install -r requirements.txt'],
          testCommands: ['pytest']
        };

      case 'go':
      case 'golang':
        return {
          image: 'golang:1.21',
          setupSteps: [
            { uses: 'actions/setup-go@v5', with: { 'go-version': '1.21' } }
          ],
          buildSteps: [
            { run: 'go build -v ./...' }
          ],
          testSteps: [
            { run: 'go test -v ./...' }
          ],
          buildCommands: ['go build -v ./...'],
          testCommands: ['go test -v ./...']
        };

      case 'java':
      case 'maven':
        return {
          image: 'maven:3.9-eclipse-temurin-21',
          setupSteps: [
            { uses: 'actions/setup-java@v4', with: { 'java-version': '21', distribution: 'temurin', cache: 'maven' } }
          ],
          buildSteps: [
            { run: 'mvn package -DskipTests' }
          ],
          testSteps: [
            { run: 'mvn test' }
          ],
          buildCommands: ['mvn package -DskipTests'],
          testCommands: ['mvn test']
        };

      case 'rust':
        return {
          image: 'rust:latest',
          setupSteps: [
            { uses: 'actions-rs/toolchain@v1', with: { toolchain: 'stable', override: true } }
          ],
          buildSteps: [
            { run: 'cargo build --release' }
          ],
          testSteps: [
            { run: 'cargo test' }
          ],
          buildCommands: ['cargo build --release'],
          testCommands: ['cargo test']
        };

      default:
        return {
          image: 'ubuntu:latest',
          setupSteps: [],
          buildSteps: [{ run: 'echo "Build step"' }],
          testSteps: [{ run: 'echo "Test step"' }],
          buildCommands: ['echo "Build step"'],
          testCommands: ['echo "Test step"']
        };
    }
  }

  private getDeploySteps(platform: string, target: string): Record<string, unknown>[] {
    switch (target.toLowerCase()) {
      case 'aws':
        return [
          { uses: 'aws-actions/configure-aws-credentials@v4', with: { 'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}', 'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}', 'aws-region': '${{ vars.AWS_REGION }}' } },
          { run: 'aws s3 sync ./dist s3://${{ vars.S3_BUCKET }}' }
        ];
      case 'gcp':
        return [
          { uses: 'google-github-actions/auth@v2', with: { 'credentials_json': '${{ secrets.GCP_CREDENTIALS }}' } },
          { run: 'gcloud app deploy' }
        ];
      case 'azure':
        return [
          { uses: 'azure/login@v1', with: { creds: '${{ secrets.AZURE_CREDENTIALS }}' } },
          { uses: 'azure/webapps-deploy@v2', with: { 'app-name': '${{ vars.AZURE_APP_NAME }}' } }
        ];
      case 'k8s':
      case 'kubernetes':
        return [
          { run: 'kubectl apply -f k8s/' }
        ];
      default:
        return [{ run: `echo "Deploy to ${target}"` }];
    }
  }

  private getDeployCommands(target: string): string[] {
    switch (target.toLowerCase()) {
      case 'aws':
        return ['aws s3 sync ./dist s3://${S3_BUCKET}'];
      case 'gcp':
        return ['gcloud app deploy'];
      case 'azure':
        return ['az webapp deploy'];
      case 'k8s':
      case 'kubernetes':
        return ['kubectl apply -f k8s/'];
      default:
        return [`echo "Deploy to ${target}"`];
    }
  }

  private toYaml(obj: unknown, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    if (typeof obj === 'string') {
      // Check if string needs quoting
      if (obj.includes(':') || obj.includes('#') || obj.includes("'") || obj.includes('"') || obj.startsWith('$')) {
        return `'${obj.replace(/'/g, "''")}'`;
      }
      return obj;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          const itemYaml = this.toYaml(item, indent + 1);
          const lines = itemYaml.split('\n');
          lines[0] = `- ${lines[0]}`;
          return spaces + lines.join('\n' + spaces + '  ');
        }
        return `${spaces}- ${this.toYaml(item, 0)}`;
      }).join('\n');
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
        }
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return `${spaces}${key}: []`;
          }
          return `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
        }
        return `${spaces}${key}: ${this.toYaml(value, 0)}`;
      }).join('\n');
    }
    
    return String(obj);
  }

  private async triggerPipeline(args: Record<string, unknown>): Promise<string> {
    const platform = args.platform as 'github' | 'gitlab' | 'jenkins';
    const repo = args.repo as string;
    const workflow = args.workflow as string;
    const branch = args.branch as string ?? 'main';
    const inputs = args.inputs as Record<string, unknown> | undefined;

    if (!platform || !repo || !workflow) {
      throw new Error('Platform, repo, and workflow are required');
    }

    switch (platform) {
      case 'github':
        return this.triggerGitHubWorkflow(repo, workflow, branch, inputs);
      case 'gitlab':
        return this.triggerGitLabPipeline(repo, branch, inputs);
      case 'jenkins':
        return this.triggerJenkinsBuild(repo, workflow, inputs);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async triggerGitHubWorkflow(repo: string, workflow: string, branch: string, inputs?: Record<string, unknown>): Promise<string> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const response = await api.post(`/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      ref: branch,
      inputs: inputs || {}
    });

    if (response.status === 204) {
      return JSON.stringify({
        status: 'triggered',
        platform: 'github',
        repo,
        workflow,
        branch,
        message: `Workflow ${workflow} triggered successfully on ${repo}`
      }, null, 2);
    }

    throw new Error('Failed to trigger workflow');
  }

  private async triggerGitLabPipeline(project: string, branch: string, variables?: Record<string, unknown>): Promise<string> {
    const token = process.env.GITLAB_TOKEN;
    if (!token) {
      throw new Error('GITLAB_TOKEN environment variable is required');
    }

    const api = axios.create({
      baseURL: process.env.GITLAB_URL || 'https://gitlab.com/api/v4',
      headers: {
        'PRIVATE-TOKEN': token
      }
    });

    const encodedProject = encodeURIComponent(project);
    const response = await api.post(`/projects/${encodedProject}/pipeline`, {
      ref: branch,
      variables: variables ? Object.entries(variables).map(([key, value]) => ({ key, value })) : []
    });

    return JSON.stringify({
      status: 'triggered',
      platform: 'gitlab',
      project,
      branch,
      pipelineId: response.data.id,
      webUrl: response.data.web_url,
      message: `Pipeline triggered successfully on ${project}`
    }, null, 2);
  }

  private async triggerJenkinsBuild(job: string, pipeline: string, params?: Record<string, unknown>): Promise<string> {
    const url = process.env.JENKINS_URL;
    const user = process.env.JENKINS_USER;
    const token = process.env.JENKINS_TOKEN;

    if (!url || !user || !token) {
      throw new Error('JENKINS_URL, JENKINS_USER, and JENKINS_TOKEN environment variables are required');
    }

    const api = axios.create({
      baseURL: url,
      auth: { username: user, password: token }
    });

    const endpoint = params 
      ? `/job/${pipeline}/buildWithParameters`
      : `/job/${pipeline}/build`;

    await api.post(endpoint, null, { params });

    return JSON.stringify({
      status: 'triggered',
      platform: 'jenkins',
      job,
      pipeline,
      message: `Jenkins build triggered successfully for ${pipeline}`
    }, null, 2);
  }

  private async getPipelineStatus(args: Record<string, unknown>): Promise<string> {
    const platform = args.platform as 'github' | 'gitlab' | 'jenkins';
    const repo = args.repo as string;
    const runId = args.runId as string;

    if (!platform || !repo || !runId) {
      throw new Error('Platform, repo, and runId are required');
    }

    switch (platform) {
      case 'github':
        return this.getGitHubWorkflowStatus(repo, runId);
      case 'gitlab':
        return this.getGitLabPipelineStatus(repo, runId);
      case 'jenkins':
        return this.getJenkinsBuildStatus(runId);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async getGitHubWorkflowStatus(repo: string, runId: string): Promise<string> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const response = await api.get(`/repos/${repo}/actions/runs/${runId}`);
    const run = response.data;

    return JSON.stringify({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      commit: run.head_sha.substring(0, 7),
      actor: run.actor.login,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      url: run.html_url
    }, null, 2);
  }

  private async getGitLabPipelineStatus(project: string, pipelineId: string): Promise<string> {
    const token = process.env.GITLAB_TOKEN;
    if (!token) {
      throw new Error('GITLAB_TOKEN environment variable is required');
    }

    const api = axios.create({
      baseURL: process.env.GITLAB_URL || 'https://gitlab.com/api/v4',
      headers: {
        'PRIVATE-TOKEN': token
      }
    });

    const encodedProject = encodeURIComponent(project);
    const response = await api.get(`/projects/${encodedProject}/pipelines/${pipelineId}`);
    const pipeline = response.data;

    return JSON.stringify({
      id: pipeline.id,
      status: pipeline.status,
      ref: pipeline.ref,
      sha: pipeline.sha.substring(0, 7),
      user: pipeline.user.name,
      createdAt: pipeline.created_at,
      updatedAt: pipeline.updated_at,
      webUrl: pipeline.web_url
    }, null, 2);
  }

  private async getJenkinsBuildStatus(buildUrl: string): Promise<string> {
    const url = process.env.JENKINS_URL;
    const user = process.env.JENKINS_USER;
    const token = process.env.JENKINS_TOKEN;

    if (!url || !user || !token) {
      throw new Error('JENKINS_URL, JENKINS_USER, and JENKINS_TOKEN environment variables are required');
    }

    const api = axios.create({
      baseURL: url,
      auth: { username: user, password: token }
    });

    const response = await api.get(`${buildUrl}/api/json`);
    const build = response.data;

    return JSON.stringify({
      number: build.number,
      result: build.result,
      building: build.building,
      duration: build.duration,
      timestamp: new Date(build.timestamp).toISOString(),
      url: build.url
    }, null, 2);
  }
}
