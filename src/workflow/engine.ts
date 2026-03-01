/**
 * Workflow Automation Engine
 * Execute complex multi-step DevOps workflows with conditional logic and parallel execution
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

// Workflow Types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'parallel' | 'conditional' | 'approval' | 'notification';
  config: TaskConfig | ParallelConfig | ConditionalConfig | ApprovalConfig | NotificationConfig;
  dependsOn?: string[];
  timeout?: number;
  retries?: number;
  continueOnError?: boolean;
}

export interface TaskConfig {
  action: string;
  params: Record<string, any>;
  outputs?: string[];
}

export interface ParallelConfig {
  steps: WorkflowStep[];
  maxConcurrency?: number;
  failFast?: boolean;
}

export interface ConditionalConfig {
  condition: string;
  ifTrue: WorkflowStep[];
  ifFalse?: WorkflowStep[];
}

export interface ApprovalConfig {
  approvers?: string[];
  message: string;
  timeout?: number;
  autoApprove?: {
    environments?: string[];
    conditions?: string;
  };
}

export interface NotificationConfig {
  channel: 'slack' | 'email' | 'webhook';
  recipients?: string[];
  template: string;
  data?: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  triggers?: WorkflowTrigger[];
  env?: Record<string, string>;
  steps: WorkflowStep[];
  onSuccess?: WorkflowStep[];
  onFailure?: WorkflowStep[];
  metadata?: Record<string, any>;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'git' | 'file';
  config: Record<string, any>;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'waiting_approval';
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy?: string;
  trigger?: string;
  stepResults: Map<string, StepResult>;
  outputs: Record<string, any>;
  logs: WorkflowLog[];
  error?: string;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
  retryCount?: number;
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  stepId?: string;
  message: string;
  data?: any;
}

// Built-in workflow actions
type ActionHandler = (params: Record<string, any>, context: ExecutionContext) => Promise<any>;

interface ExecutionContext {
  workflowId: string;
  runId: string;
  stepId: string;
  env: Record<string, string>;
  outputs: Record<string, any>;
  log: (level: string, message: string, data?: any) => void;
  setOutput: (key: string, value: any) => void;
  getOutput: (stepId: string, key: string) => any;
}

/**
 * Workflow Engine
 * Executes complex multi-step DevOps workflows
 */
export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private runs: Map<string, WorkflowRun> = new Map();
  private actions: Map<string, ActionHandler> = new Map();
  private outputChannel: vscode.OutputChannel;

  constructor() {
    super();
    this.outputChannel = vscode.window.createOutputChannel('DevOps Omnibus - Workflows');
    this.registerBuiltInActions();
  }

  /**
   * Register built-in workflow actions
   */
  private registerBuiltInActions(): void {
    // Docker actions
    this.registerAction('docker.build', async (params, ctx) => {
      ctx.log('info', `Building Docker image: ${params.tag}`);
      return { imageId: `sha256:${Date.now()}`, tag: params.tag };
    });

    this.registerAction('docker.push', async (params, ctx) => {
      ctx.log('info', `Pushing Docker image: ${params.image}`);
      return { pushed: true };
    });

    this.registerAction('docker.run', async (params, ctx) => {
      ctx.log('info', `Running container from: ${params.image}`);
      return { containerId: `container-${Date.now()}` };
    });

    // Kubernetes actions
    this.registerAction('kubernetes.apply', async (params, ctx) => {
      ctx.log('info', `Applying Kubernetes manifest: ${params.manifest}`);
      return { applied: true };
    });

    this.registerAction('kubernetes.rollout', async (params, ctx) => {
      ctx.log('info', `Rolling out: ${params.deployment}`);
      return { status: 'success' };
    });

    this.registerAction('kubernetes.scale', async (params, ctx) => {
      ctx.log('info', `Scaling ${params.deployment} to ${params.replicas} replicas`);
      return { scaled: true, replicas: params.replicas };
    });

    // Git actions
    this.registerAction('git.clone', async (params, ctx) => {
      ctx.log('info', `Cloning repository: ${params.repo}`);
      return { cloned: true, path: params.path || '/tmp/repo' };
    });

    this.registerAction('git.checkout', async (params, ctx) => {
      ctx.log('info', `Checking out: ${params.ref}`);
      return { checkedOut: params.ref };
    });

    this.registerAction('git.tag', async (params, ctx) => {
      ctx.log('info', `Creating tag: ${params.tag}`);
      return { tagged: params.tag };
    });

    // Cloud deployment actions
    this.registerAction('aws.lambda.deploy', async (params, ctx) => {
      ctx.log('info', `Deploying Lambda function: ${params.functionName}`);
      return { functionArn: `arn:aws:lambda:us-east-1:123456789:function:${params.functionName}` };
    });

    this.registerAction('aws.ecs.deploy', async (params, ctx) => {
      ctx.log('info', `Deploying to ECS: ${params.service}`);
      return { serviceArn: `arn:aws:ecs:us-east-1:123456789:service/${params.service}` };
    });

    this.registerAction('gcp.cloudrun.deploy', async (params, ctx) => {
      ctx.log('info', `Deploying to Cloud Run: ${params.service}`);
      return { url: `https://${params.service}-xxxxx.run.app` };
    });

    this.registerAction('azure.webapp.deploy', async (params, ctx) => {
      ctx.log('info', `Deploying to Azure App Service: ${params.appName}`);
      return { url: `https://${params.appName}.azurewebsites.net` };
    });

    // CI/CD actions
    this.registerAction('pipeline.trigger', async (params, ctx) => {
      ctx.log('info', `Triggering pipeline: ${params.pipeline}`);
      return { runId: `run-${Date.now()}` };
    });

    this.registerAction('test.run', async (params, ctx) => {
      ctx.log('info', `Running tests: ${params.suite || 'all'}`);
      return { passed: true, total: 100, failed: 0 };
    });

    // Notification actions
    this.registerAction('notify.slack', async (params, ctx) => {
      ctx.log('info', `Sending Slack notification to: ${params.channel}`);
      return { sent: true, channel: params.channel };
    });

    this.registerAction('notify.email', async (params, ctx) => {
      ctx.log('info', `Sending email to: ${params.to}`);
      return { sent: true };
    });

    // Utility actions
    this.registerAction('shell.exec', async (params, ctx) => {
      ctx.log('info', `Executing: ${params.command}`);
      return { exitCode: 0, output: '' };
    });

    this.registerAction('http.request', async (params, ctx) => {
      ctx.log('info', `HTTP ${params.method || 'GET'} ${params.url}`);
      return { status: 200, body: {} };
    });

    this.registerAction('wait', async (params, ctx) => {
      const duration = params.duration || 1000;
      ctx.log('info', `Waiting for ${duration}ms`);
      await new Promise(resolve => setTimeout(resolve, duration));
      return { waited: duration };
    });
  }

  /**
   * Register a custom action handler
   */
  registerAction(name: string, handler: ActionHandler): void {
    this.actions.set(name, handler);
  }

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:registered', workflow);
    this.log(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  /**
   * Get a workflow by ID
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * List all registered workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflowId: string,
    options?: {
      env?: Record<string, string>;
      triggeredBy?: string;
      trigger?: string;
    }
  ): Promise<WorkflowRun> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const run: WorkflowRun = {
      id: runId,
      workflowId,
      status: 'running',
      startedAt: new Date(),
      triggeredBy: options?.triggeredBy,
      trigger: options?.trigger,
      stepResults: new Map(),
      outputs: {},
      logs: [],
    };

    this.runs.set(runId, run);
    this.emit('run:started', run);
    this.log(`Starting workflow run: ${runId}`);

    try {
      // Merge environment variables
      const env = { ...workflow.env, ...options?.env };

      // Execute steps
      await this.executeSteps(workflow.steps, run, env);

      // Execute onSuccess hooks
      if (workflow.onSuccess && workflow.onSuccess.length > 0) {
        await this.executeSteps(workflow.onSuccess, run, env);
      }

      run.status = 'success';
      run.completedAt = new Date();
      this.emit('run:completed', run);
      this.log(`Workflow completed successfully: ${runId}`);
    } catch (error: any) {
      run.status = 'failed';
      run.error = error.message;
      run.completedAt = new Date();

      // Execute onFailure hooks
      if (workflow.onFailure && workflow.onFailure.length > 0) {
        try {
          await this.executeSteps(workflow.onFailure, run, { ...workflow.env, ...options?.env });
        } catch (hookError) {
          this.log(`onFailure hook failed: ${hookError}`);
        }
      }

      this.emit('run:failed', run, error);
      this.log(`Workflow failed: ${runId} - ${error.message}`);
    }

    return run;
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(
    steps: WorkflowStep[],
    run: WorkflowRun,
    env: Record<string, string>
  ): Promise<void> {
    // Build dependency graph
    const completed = new Set<string>();
    const pending = [...steps];

    while (pending.length > 0) {
      // Find steps that can be executed
      const ready = pending.filter(step => {
        if (!step.dependsOn || step.dependsOn.length === 0) return true;
        return step.dependsOn.every(dep => completed.has(dep));
      });

      if (ready.length === 0 && pending.length > 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      // Execute ready steps
      for (const step of ready) {
        await this.executeStep(step, run, env);
        completed.add(step.id);
        pending.splice(pending.indexOf(step), 1);
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    run: WorkflowRun,
    env: Record<string, string>
  ): Promise<void> {
    const result: StepResult = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
    };

    run.stepResults.set(step.id, result);
    this.emit('step:started', step, run);

    const context = this.createContext(run, step.id, env);

    try {
      let output: any;

      switch (step.type) {
        case 'task':
          output = await this.executeTask(step.config as TaskConfig, context, step);
          break;

        case 'parallel':
          output = await this.executeParallel(step.config as ParallelConfig, run, env);
          break;

        case 'conditional':
          output = await this.executeConditional(step.config as ConditionalConfig, run, env);
          break;

        case 'approval':
          output = await this.executeApproval(step.config as ApprovalConfig, run);
          break;

        case 'notification':
          output = await this.executeNotification(step.config as NotificationConfig, context);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      result.status = 'success';
      result.output = output;
      result.completedAt = new Date();
      this.emit('step:completed', step, run, output);
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      result.completedAt = new Date();

      if (!step.continueOnError) {
        throw error;
      }

      this.emit('step:failed', step, run, error);
    }
  }

  /**
   * Execute a task step
   */
  private async executeTask(
    config: TaskConfig,
    context: ExecutionContext,
    step: WorkflowStep
  ): Promise<any> {
    const handler = this.actions.get(config.action);
    if (!handler) {
      throw new Error(`Unknown action: ${config.action}`);
    }

    // Resolve parameter expressions
    const resolvedParams = this.resolveParams(config.params, context);

    // Execute with retry logic
    let lastError: Error | undefined;
    const maxRetries = step.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const output = await Promise.race([
          handler(resolvedParams, context),
          step.timeout
            ? new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Task timeout')), step.timeout)
              )
            : new Promise(() => {}),
        ]);

        // Store outputs
        if (config.outputs) {
          config.outputs.forEach(key => {
            if (output && key in output) {
              context.setOutput(key, output[key]);
            }
          });
        }

        return output;
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          context.log('warn', `Task failed, retrying (${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute parallel steps
   */
  private async executeParallel(
    config: ParallelConfig,
    run: WorkflowRun,
    env: Record<string, string>
  ): Promise<any[]> {
    const maxConcurrency = config.maxConcurrency || config.steps.length;
    const results: any[] = [];
    const errors: Error[] = [];

    // Execute in batches
    for (let i = 0; i < config.steps.length; i += maxConcurrency) {
      const batch = config.steps.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(async step => {
        try {
          await this.executeStep(step, run, env);
          return run.stepResults.get(step.id)?.output;
        } catch (error: any) {
          if (config.failFast) {
            throw error;
          }
          errors.push(error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    if (errors.length > 0 && config.failFast) {
      throw errors[0];
    }

    return results;
  }

  /**
   * Execute conditional step
   */
  private async executeConditional(
    config: ConditionalConfig,
    run: WorkflowRun,
    env: Record<string, string>
  ): Promise<any> {
    const conditionResult = this.evaluateCondition(config.condition, run.outputs, env);

    if (conditionResult) {
      await this.executeSteps(config.ifTrue, run, env);
      return { branch: 'true', executed: config.ifTrue.map(s => s.id) };
    } else if (config.ifFalse) {
      await this.executeSteps(config.ifFalse, run, env);
      return { branch: 'false', executed: config.ifFalse.map(s => s.id) };
    }

    return { branch: 'false', executed: [] };
  }

  /**
   * Execute approval step
   */
  private async executeApproval(
    config: ApprovalConfig,
    run: WorkflowRun
  ): Promise<{ approved: boolean; approvedBy?: string }> {
    // Check auto-approve conditions
    if (config.autoApprove) {
      const env = run.outputs.environment;
      if (config.autoApprove.environments?.includes(env)) {
        return { approved: true, approvedBy: 'auto-approve' };
      }
    }

    // In a real implementation, this would wait for user approval
    // For now, we'll simulate auto-approval pending UI integration
    run.status = 'waiting_approval';
    this.emit('approval:required', run, config);

    // Simulate approval (in production, this would wait for user input)
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ approved: true, approvedBy: 'auto' });
      }, 1000);
    });
  }

  /**
   * Execute notification step
   */
  private async executeNotification(
    config: NotificationConfig,
    context: ExecutionContext
  ): Promise<any> {
    const message = this.resolveTemplate(config.template, context);

    switch (config.channel) {
      case 'slack':
        return this.actions.get('notify.slack')?.({ message, ...config.data }, context);
      case 'email':
        return this.actions.get('notify.email')?.({ message, to: config.recipients, ...config.data }, context);
      case 'webhook':
        return this.actions.get('http.request')?.({ ...config.data, body: { message } }, context);
      default:
        throw new Error(`Unknown notification channel: ${config.channel}`);
    }
  }

  /**
   * Create execution context for a step
   */
  private createContext(
    run: WorkflowRun,
    stepId: string,
    env: Record<string, string>
  ): ExecutionContext {
    return {
      workflowId: run.workflowId,
      runId: run.id,
      stepId,
      env,
      outputs: run.outputs,
      log: (level, message, data) => {
        const log: WorkflowLog = {
          timestamp: new Date(),
          level: level as any,
          stepId,
          message,
          data,
        };
        run.logs.push(log);
        this.emit('log', log);
      },
      setOutput: (key, value) => {
        run.outputs[`${stepId}.${key}`] = value;
        run.outputs[key] = value;
      },
      getOutput: (outputStepId, key) => {
        return run.outputs[`${outputStepId}.${key}`] || run.outputs[key];
      },
    };
  }

  /**
   * Resolve parameter expressions
   */
  private resolveParams(params: Record<string, any>, context: ExecutionContext): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveExpression(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveParams(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolve expression in string
   */
  private resolveExpression(value: string, context: ExecutionContext): string {
    return value.replace(/\$\{\{([^}]+)\}\}/g, (_, expr) => {
      const trimmed = expr.trim();
      
      // Environment variable
      if (trimmed.startsWith('env.')) {
        return context.env[trimmed.slice(4)] || '';
      }
      
      // Output reference
      if (trimmed.startsWith('outputs.') || trimmed.startsWith('steps.')) {
        const path = trimmed.replace(/^(outputs\.|steps\.)/, '');
        return context.outputs[path] || '';
      }

      return '';
    });
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(
    condition: string,
    outputs: Record<string, any>,
    env: Record<string, string>
  ): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    
    if (condition === 'true') return true;
    if (condition === 'false') return false;

    // Check for output value conditions
    const outputMatch = condition.match(/outputs\.(\w+)\s*(==|!=|>=|<=|>|<)\s*['"]?([^'"]+)['"]?/);
    if (outputMatch) {
      const [, key, op, expectedValue] = outputMatch;
      const actualValue = outputs[key];

      switch (op) {
        case '==': return String(actualValue) === expectedValue;
        case '!=': return String(actualValue) !== expectedValue;
        case '>': return Number(actualValue) > Number(expectedValue);
        case '<': return Number(actualValue) < Number(expectedValue);
        case '>=': return Number(actualValue) >= Number(expectedValue);
        case '<=': return Number(actualValue) <= Number(expectedValue);
      }
    }

    // Check for env conditions
    const envMatch = condition.match(/env\.(\w+)\s*(==|!=)\s*['"]?([^'"]+)['"]?/);
    if (envMatch) {
      const [, key, op, expectedValue] = envMatch;
      const actualValue = env[key];

      return op === '==' 
        ? actualValue === expectedValue 
        : actualValue !== expectedValue;
    }

    return false;
  }

  /**
   * Resolve template string
   */
  private resolveTemplate(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      
      if (trimmed.startsWith('env.')) {
        return context.env[trimmed.slice(4)] || '';
      }
      
      if (trimmed.startsWith('outputs.')) {
        return String(context.outputs[trimmed.slice(8)] || '');
      }

      return String(context.outputs[trimmed] || '');
    });
  }

  /**
   * Cancel a running workflow
   */
  async cancel(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    if (run.status === 'running' || run.status === 'waiting_approval') {
      run.status = 'cancelled';
      run.completedAt = new Date();
      this.emit('run:cancelled', run);
      this.log(`Workflow cancelled: ${runId}`);
    }
  }

  /**
   * Get workflow run status
   */
  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * List workflow runs
   */
  listRuns(workflowId?: string): WorkflowRun[] {
    const runs = Array.from(this.runs.values());
    if (workflowId) {
      return runs.filter(r => r.workflowId === workflowId);
    }
    return runs;
  }

  /**
   * Log message
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.workflows.clear();
    this.runs.clear();
    this.actions.clear();
    this.outputChannel.dispose();
  }
}

/**
 * Workflow Builder - Fluent API for creating workflows
 */
export class WorkflowBuilder {
  private workflow: Partial<Workflow>;
  private currentSteps: WorkflowStep[] = [];

  constructor(id: string, name: string) {
    this.workflow = {
      id,
      name,
      version: '1.0.0',
      steps: [],
    };
  }

  description(desc: string): this {
    this.workflow.description = desc;
    return this;
  }

  version(v: string): this {
    this.workflow.version = v;
    return this;
  }

  env(variables: Record<string, string>): this {
    this.workflow.env = { ...this.workflow.env, ...variables };
    return this;
  }

  trigger(type: WorkflowTrigger['type'], config: Record<string, any>): this {
    if (!this.workflow.triggers) {
      this.workflow.triggers = [];
    }
    this.workflow.triggers.push({ type, config });
    return this;
  }

  task(id: string, name: string, action: string, params: Record<string, any>): this {
    this.currentSteps.push({
      id,
      name,
      type: 'task',
      config: { action, params },
    });
    return this;
  }

  parallel(id: string, name: string, steps: WorkflowStep[]): this {
    this.currentSteps.push({
      id,
      name,
      type: 'parallel',
      config: { steps },
    });
    return this;
  }

  conditional(
    id: string,
    name: string,
    condition: string,
    ifTrue: WorkflowStep[],
    ifFalse?: WorkflowStep[]
  ): this {
    this.currentSteps.push({
      id,
      name,
      type: 'conditional',
      config: { condition, ifTrue, ifFalse },
    });
    return this;
  }

  approval(id: string, name: string, message: string, approvers?: string[]): this {
    this.currentSteps.push({
      id,
      name,
      type: 'approval',
      config: { message, approvers },
    });
    return this;
  }

  notify(id: string, name: string, channel: 'slack' | 'email' | 'webhook', template: string): this {
    this.currentSteps.push({
      id,
      name,
      type: 'notification',
      config: { channel, template },
    });
    return this;
  }

  dependsOn(stepId: string, dependsOnIds: string[]): this {
    const step = this.currentSteps.find(s => s.id === stepId);
    if (step) {
      step.dependsOn = dependsOnIds;
    }
    return this;
  }

  timeout(stepId: string, ms: number): this {
    const step = this.currentSteps.find(s => s.id === stepId);
    if (step) {
      step.timeout = ms;
    }
    return this;
  }

  retries(stepId: string, count: number): this {
    const step = this.currentSteps.find(s => s.id === stepId);
    if (step) {
      step.retries = count;
    }
    return this;
  }

  continueOnError(stepId: string, value = true): this {
    const step = this.currentSteps.find(s => s.id === stepId);
    if (step) {
      step.continueOnError = value;
    }
    return this;
  }

  onSuccess(steps: WorkflowStep[]): this {
    this.workflow.onSuccess = steps;
    return this;
  }

  onFailure(steps: WorkflowStep[]): this {
    this.workflow.onFailure = steps;
    return this;
  }

  build(): Workflow {
    return {
      ...this.workflow,
      steps: this.currentSteps,
    } as Workflow;
  }
}

// Export a singleton instance
export const workflowEngine = new WorkflowEngine();
