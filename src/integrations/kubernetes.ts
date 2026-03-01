/**
 * Kubernetes Integration
 * Comprehensive Kubernetes client for cluster management, deployments, services, and more
 */

import * as vscode from 'vscode';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Kubernetes resource types
export interface KubernetesContext {
  name: string;
  cluster: string;
  user: string;
  namespace?: string;
  isCurrent: boolean;
}

export interface KubernetesNamespace {
  name: string;
  status: string;
  labels?: Record<string, string>;
  creationTimestamp: string;
}

export interface KubernetesPod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  nodeName: string;
  ip?: string;
  containers: Array<{ name: string; image: string; ready: boolean }>;
  labels?: Record<string, string>;
}

export interface KubernetesDeployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
  images: string[];
  replicas: number;
  labels?: Record<string, string>;
  conditions: Array<{ type: string; status: string }>;
}

export interface KubernetesService {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP?: string;
  ports: Array<{ port: number; targetPort: number | string; protocol: string; nodePort?: number }>;
  selector: Record<string, string>;
  age: string;
}

export interface KubernetesConfigMap {
  name: string;
  namespace: string;
  data: Record<string, string>;
  creationTimestamp: string;
}

export interface KubernetesSecret {
  name: string;
  namespace: string;
  type: string;
  dataKeys: string[];
  creationTimestamp: string;
}

export interface KubernetesIngress {
  name: string;
  namespace: string;
  class?: string;
  hosts: string[];
  address?: string;
  ports: string;
  age: string;
}

export interface KubernetesNode {
  name: string;
  status: string;
  roles: string[];
  age: string;
  version: string;
  internalIP: string;
  externalIP?: string;
  os: string;
  kernelVersion: string;
  containerRuntime: string;
  allocatable: {
    cpu: string;
    memory: string;
    pods: string;
  };
  capacity: {
    cpu: string;
    memory: string;
    pods: string;
  };
}

export interface KubernetesEvent {
  type: string;
  reason: string;
  object: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export interface HelmRelease {
  name: string;
  namespace: string;
  revision: string;
  updated: string;
  status: string;
  chart: string;
  appVersion: string;
}

interface KubernetesConfig {
  kubeconfigPath?: string;
  context?: string;
  namespace?: string;
}

/**
 * Kubernetes Integration Client
 * Provides comprehensive access to Kubernetes clusters
 */
export class KubernetesIntegration {
  private config: KubernetesConfig;
  private outputChannel: vscode.OutputChannel;
  private logStreamProcesses: Map<string, ChildProcess> = new Map();

  constructor(config: KubernetesConfig = {}) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('DevOps Omnibus - Kubernetes');
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Build kubectl command with common options
   */
  private buildKubectlCommand(args: string[]): string {
    const parts = ['kubectl'];
    
    if (this.config.kubeconfigPath) {
      parts.push(`--kubeconfig="${this.config.kubeconfigPath}"`);
    }
    
    if (this.config.context) {
      parts.push(`--context="${this.config.context}"`);
    }
    
    if (this.config.namespace && !args.some(a => a.startsWith('-n') || a.startsWith('--namespace'))) {
      parts.push(`-n "${this.config.namespace}"`);
    }
    
    parts.push(...args);
    return parts.join(' ');
  }

  /**
   * Execute kubectl command and return parsed JSON
   */
  private async kubectl<T>(args: string[]): Promise<T> {
    const cmd = this.buildKubectlCommand([...args, '-o json']);
    this.log(`Executing: ${cmd}`);
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stderr) {
        this.log(`Warning: ${stderr}`);
      }
      return JSON.parse(stdout);
    } catch (error: any) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute kubectl command and return raw output
   */
  private async kubectlRaw(args: string[]): Promise<string> {
    const cmd = this.buildKubectlCommand(args);
    this.log(`Executing: ${cmd}`);
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stderr) {
        this.log(`Warning: ${stderr}`);
      }
      return stdout.trim();
    } catch (error: any) {
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // Context and Configuration
  // ============================================

  /**
   * Get current context
   */
  async getCurrentContext(): Promise<string> {
    return this.kubectlRaw(['config', 'current-context']);
  }

  /**
   * List all contexts
   */
  async listContexts(): Promise<KubernetesContext[]> {
    const output = await this.kubectlRaw(['config', 'get-contexts', '-o name']);
    const contexts = output.split('\n').filter(Boolean);
    const currentContext = await this.getCurrentContext();
    
    return contexts.map(name => ({
      name,
      cluster: '', // Would need to parse kubeconfig for this
      user: '',
      isCurrent: name === currentContext,
    }));
  }

  /**
   * Switch context
   */
  async useContext(contextName: string): Promise<void> {
    await this.kubectlRaw(['config', 'use-context', contextName]);
    this.config.context = contextName;
  }

  /**
   * Set default namespace for this session
   */
  setNamespace(namespace: string): void {
    this.config.namespace = namespace;
  }

  // ============================================
  // Namespace Operations
  // ============================================

  /**
   * List namespaces
   */
  async listNamespaces(): Promise<KubernetesNamespace[]> {
    const result = await this.kubectl<{ items: any[] }>(['get', 'namespaces', '-A']);
    
    return result.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      labels: ns.metadata.labels,
      creationTimestamp: ns.metadata.creationTimestamp,
    }));
  }

  /**
   * Create namespace
   */
  async createNamespace(name: string, labels?: Record<string, string>): Promise<void> {
    const manifest = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name, labels },
    };
    
    await this.kubectlRaw(['apply', '-f', '-'], );
  }

  /**
   * Delete namespace
   */
  async deleteNamespace(name: string): Promise<void> {
    await this.kubectlRaw(['delete', 'namespace', name]);
  }

  // ============================================
  // Pod Operations
  // ============================================

  /**
   * List pods
   */
  async listPods(namespace?: string, labelSelector?: string): Promise<KubernetesPod[]> {
    const args = ['get', 'pods'];
    
    if (namespace) {
      args.push('-n', namespace);
    } else if (!this.config.namespace) {
      args.push('-A');
    }
    
    if (labelSelector) {
      args.push('-l', labelSelector);
    }
    
    const result = await this.kubectl<{ items: any[] }>(args);
    
    return result.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      ready: `${pod.status.containerStatuses?.filter((c: any) => c.ready).length || 0}/${pod.spec.containers.length}`,
      restarts: pod.status.containerStatuses?.reduce((sum: number, c: any) => sum + c.restartCount, 0) || 0,
      age: this.formatAge(pod.metadata.creationTimestamp),
      nodeName: pod.spec.nodeName,
      ip: pod.status.podIP,
      containers: pod.spec.containers.map((c: any, i: number) => ({
        name: c.name,
        image: c.image,
        ready: pod.status.containerStatuses?.[i]?.ready || false,
      })),
      labels: pod.metadata.labels,
    }));
  }

  /**
   * Get pod details
   */
  async getPod(name: string, namespace?: string): Promise<KubernetesPod> {
    const args = ['get', 'pod', name];
    if (namespace) args.push('-n', namespace);
    
    const pod = await this.kubectl<any>(args);
    
    return {
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      ready: `${pod.status.containerStatuses?.filter((c: any) => c.ready).length || 0}/${pod.spec.containers.length}`,
      restarts: pod.status.containerStatuses?.reduce((sum: number, c: any) => sum + c.restartCount, 0) || 0,
      age: this.formatAge(pod.metadata.creationTimestamp),
      nodeName: pod.spec.nodeName,
      ip: pod.status.podIP,
      containers: pod.spec.containers.map((c: any, i: number) => ({
        name: c.name,
        image: c.image,
        ready: pod.status.containerStatuses?.[i]?.ready || false,
      })),
      labels: pod.metadata.labels,
    };
  }

  /**
   * Delete pod
   */
  async deletePod(name: string, namespace?: string): Promise<void> {
    const args = ['delete', 'pod', name];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  /**
   * Get pod logs
   */
  async getPodLogs(
    name: string,
    options?: {
      namespace?: string;
      container?: string;
      tail?: number;
      since?: string;
      previous?: boolean;
    }
  ): Promise<string> {
    const args = ['logs', name];
    
    if (options?.namespace) args.push('-n', options.namespace);
    if (options?.container) args.push('-c', options.container);
    if (options?.tail) args.push('--tail', String(options.tail));
    if (options?.since) args.push('--since', options.since);
    if (options?.previous) args.push('-p');
    
    return this.kubectlRaw(args);
  }

  /**
   * Stream pod logs
   */
  streamPodLogs(
    name: string,
    onLog: (log: string) => void,
    options?: {
      namespace?: string;
      container?: string;
      tail?: number;
    }
  ): () => void {
    const args = ['logs', '-f', name];
    
    if (options?.namespace) args.push('-n', options.namespace);
    if (options?.container) args.push('-c', options.container);
    if (options?.tail) args.push('--tail', String(options.tail));
    
    const cmd = this.buildKubectlCommand(args);
    const [command, ...cmdArgs] = cmd.split(' ');
    
    const proc = spawn(command, cmdArgs, { shell: true });
    const key = `${options?.namespace || 'default'}/${name}/${options?.container || ''}`;
    this.logStreamProcesses.set(key, proc);
    
    proc.stdout.on('data', (data: Buffer) => {
      onLog(data.toString());
    });
    
    proc.stderr.on('data', (data: Buffer) => {
      this.log(`Log stream error: ${data.toString()}`);
    });
    
    return () => {
      proc.kill();
      this.logStreamProcesses.delete(key);
    };
  }

  /**
   * Execute command in pod
   */
  async execInPod(
    name: string,
    command: string[],
    options?: {
      namespace?: string;
      container?: string;
    }
  ): Promise<string> {
    const args = ['exec', name];
    
    if (options?.namespace) args.push('-n', options.namespace);
    if (options?.container) args.push('-c', options.container);
    
    args.push('--', ...command);
    
    return this.kubectlRaw(args);
  }

  // ============================================
  // Deployment Operations
  // ============================================

  /**
   * List deployments
   */
  async listDeployments(namespace?: string): Promise<KubernetesDeployment[]> {
    const args = ['get', 'deployments'];
    
    if (namespace) {
      args.push('-n', namespace);
    } else if (!this.config.namespace) {
      args.push('-A');
    }
    
    const result = await this.kubectl<{ items: any[] }>(args);
    
    return result.items.map(deploy => ({
      name: deploy.metadata.name,
      namespace: deploy.metadata.namespace,
      ready: `${deploy.status.readyReplicas || 0}/${deploy.spec.replicas}`,
      upToDate: deploy.status.updatedReplicas || 0,
      available: deploy.status.availableReplicas || 0,
      age: this.formatAge(deploy.metadata.creationTimestamp),
      images: deploy.spec.template.spec.containers.map((c: any) => c.image),
      replicas: deploy.spec.replicas,
      labels: deploy.metadata.labels,
      conditions: deploy.status.conditions || [],
    }));
  }

  /**
   * Scale deployment
   */
  async scaleDeployment(name: string, replicas: number, namespace?: string): Promise<void> {
    const args = ['scale', 'deployment', name, `--replicas=${replicas}`];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  /**
   * Restart deployment
   */
  async restartDeployment(name: string, namespace?: string): Promise<void> {
    const args = ['rollout', 'restart', 'deployment', name];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  /**
   * Get deployment rollout status
   */
  async getRolloutStatus(name: string, namespace?: string): Promise<string> {
    const args = ['rollout', 'status', 'deployment', name];
    if (namespace) args.push('-n', namespace);
    
    return this.kubectlRaw(args);
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(name: string, namespace?: string, revision?: number): Promise<void> {
    const args = ['rollout', 'undo', 'deployment', name];
    if (namespace) args.push('-n', namespace);
    if (revision) args.push(`--to-revision=${revision}`);
    
    await this.kubectlRaw(args);
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(name: string, namespace?: string): Promise<void> {
    const args = ['delete', 'deployment', name];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  // ============================================
  // Service Operations
  // ============================================

  /**
   * List services
   */
  async listServices(namespace?: string): Promise<KubernetesService[]> {
    const args = ['get', 'services'];
    
    if (namespace) {
      args.push('-n', namespace);
    } else if (!this.config.namespace) {
      args.push('-A');
    }
    
    const result = await this.kubectl<{ items: any[] }>(args);
    
    return result.items.map(svc => ({
      name: svc.metadata.name,
      namespace: svc.metadata.namespace,
      type: svc.spec.type,
      clusterIP: svc.spec.clusterIP,
      externalIP: svc.status.loadBalancer?.ingress?.[0]?.ip,
      ports: svc.spec.ports.map((p: any) => ({
        port: p.port,
        targetPort: p.targetPort,
        protocol: p.protocol,
        nodePort: p.nodePort,
      })),
      selector: svc.spec.selector || {},
      age: this.formatAge(svc.metadata.creationTimestamp),
    }));
  }

  /**
   * Delete service
   */
  async deleteService(name: string, namespace?: string): Promise<void> {
    const args = ['delete', 'service', name];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  // ============================================
  // Node Operations
  // ============================================

  /**
   * List nodes
   */
  async listNodes(): Promise<KubernetesNode[]> {
    const result = await this.kubectl<{ items: any[] }>(['get', 'nodes']);
    
    return result.items.map(node => ({
      name: node.metadata.name,
      status: node.status.conditions.find((c: any) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
      roles: Object.keys(node.metadata.labels || {})
        .filter(l => l.startsWith('node-role.kubernetes.io/'))
        .map(l => l.replace('node-role.kubernetes.io/', '')),
      age: this.formatAge(node.metadata.creationTimestamp),
      version: node.status.nodeInfo.kubeletVersion,
      internalIP: node.status.addresses.find((a: any) => a.type === 'InternalIP')?.address || '',
      externalIP: node.status.addresses.find((a: any) => a.type === 'ExternalIP')?.address,
      os: `${node.status.nodeInfo.osImage}`,
      kernelVersion: node.status.nodeInfo.kernelVersion,
      containerRuntime: node.status.nodeInfo.containerRuntimeVersion,
      allocatable: {
        cpu: node.status.allocatable.cpu,
        memory: node.status.allocatable.memory,
        pods: node.status.allocatable.pods,
      },
      capacity: {
        cpu: node.status.capacity.cpu,
        memory: node.status.capacity.memory,
        pods: node.status.capacity.pods,
      },
    }));
  }

  /**
   * Cordon node (mark unschedulable)
   */
  async cordonNode(name: string): Promise<void> {
    await this.kubectlRaw(['cordon', name]);
  }

  /**
   * Uncordon node (mark schedulable)
   */
  async uncordonNode(name: string): Promise<void> {
    await this.kubectlRaw(['uncordon', name]);
  }

  /**
   * Drain node
   */
  async drainNode(name: string, options?: { force?: boolean; ignoreDaemonsets?: boolean }): Promise<void> {
    const args = ['drain', name];
    if (options?.force) args.push('--force');
    if (options?.ignoreDaemonsets) args.push('--ignore-daemonsets');
    
    await this.kubectlRaw(args);
  }

  // ============================================
  // ConfigMap and Secret Operations
  // ============================================

  /**
   * List ConfigMaps
   */
  async listConfigMaps(namespace?: string): Promise<KubernetesConfigMap[]> {
    const args = ['get', 'configmaps'];
    if (namespace) args.push('-n', namespace);
    
    const result = await this.kubectl<{ items: any[] }>(args);
    
    return result.items.map(cm => ({
      name: cm.metadata.name,
      namespace: cm.metadata.namespace,
      data: cm.data || {},
      creationTimestamp: cm.metadata.creationTimestamp,
    }));
  }

  /**
   * Create ConfigMap
   */
  async createConfigMap(
    name: string,
    data: Record<string, string>,
    namespace?: string
  ): Promise<void> {
    const args = ['create', 'configmap', name];
    if (namespace) args.push('-n', namespace);
    
    for (const [key, value] of Object.entries(data)) {
      args.push(`--from-literal=${key}=${value}`);
    }
    
    await this.kubectlRaw(args);
  }

  /**
   * Delete ConfigMap
   */
  async deleteConfigMap(name: string, namespace?: string): Promise<void> {
    const args = ['delete', 'configmap', name];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  /**
   * List Secrets
   */
  async listSecrets(namespace?: string): Promise<KubernetesSecret[]> {
    const args = ['get', 'secrets'];
    if (namespace) args.push('-n', namespace);
    
    const result = await this.kubectl<{ items: any[] }>(args);
    
    return result.items.map(secret => ({
      name: secret.metadata.name,
      namespace: secret.metadata.namespace,
      type: secret.type,
      dataKeys: Object.keys(secret.data || {}),
      creationTimestamp: secret.metadata.creationTimestamp,
    }));
  }

  /**
   * Create Secret
   */
  async createSecret(
    name: string,
    data: Record<string, string>,
    namespace?: string,
    type?: string
  ): Promise<void> {
    const args = ['create', 'secret', type || 'generic', name];
    if (namespace) args.push('-n', namespace);
    
    for (const [key, value] of Object.entries(data)) {
      args.push(`--from-literal=${key}=${value}`);
    }
    
    await this.kubectlRaw(args);
  }

  /**
   * Delete Secret
   */
  async deleteSecret(name: string, namespace?: string): Promise<void> {
    const args = ['delete', 'secret', name];
    if (namespace) args.push('-n', namespace);
    
    await this.kubectlRaw(args);
  }

  // ============================================
  // Apply and Delete Resources
  // ============================================

  /**
   * Apply YAML manifest
   */
  async apply(manifest: string, namespace?: string): Promise<string> {
    const args = ['apply', '-f', '-'];
    if (namespace) args.push('-n', namespace);
    
    const cmd = this.buildKubectlCommand(args);
    const { stdout } = await execAsync(cmd, { input: manifest });
    return stdout;
  }

  /**
   * Apply from file
   */
  async applyFile(filePath: string, namespace?: string): Promise<string> {
    const args = ['apply', '-f', filePath];
    if (namespace) args.push('-n', namespace);
    
    return this.kubectlRaw(args);
  }

  /**
   * Delete from manifest
   */
  async deleteManifest(manifest: string, namespace?: string): Promise<string> {
    const args = ['delete', '-f', '-'];
    if (namespace) args.push('-n', namespace);
    
    const cmd = this.buildKubectlCommand(args);
    const { stdout } = await execAsync(cmd, { input: manifest });
    return stdout;
  }

  // ============================================
  // Events
  // ============================================

  /**
   * Get events
   */
  async getEvents(namespace?: string, fieldSelector?: string): Promise<KubernetesEvent[]> {
    const args = ['get', 'events', '--sort-by=.lastTimestamp'];
    if (namespace) args.push('-n', namespace);
    if (fieldSelector) args.push(`--field-selector=${fieldSelector}`);
    
    const result = await this.kubectl<{ items: any[] }>(args);
    
    return result.items.map(event => ({
      type: event.type,
      reason: event.reason,
      object: `${event.involvedObject.kind}/${event.involvedObject.name}`,
      message: event.message,
      count: event.count || 1,
      firstTimestamp: event.firstTimestamp,
      lastTimestamp: event.lastTimestamp,
    }));
  }

  // ============================================
  // Helm Operations
  // ============================================

  /**
   * List Helm releases
   */
  async listHelmReleases(namespace?: string): Promise<HelmRelease[]> {
    const args = ['list'];
    if (namespace) {
      args.push('-n', namespace);
    } else {
      args.push('-A');
    }
    args.push('-o', 'json');
    
    try {
      const { stdout } = await execAsync(`helm ${args.join(' ')}`);
      return JSON.parse(stdout);
    } catch (error: any) {
      this.log(`Helm error: ${error.message}`);
      return [];
    }
  }

  /**
   * Install Helm chart
   */
  async installHelmChart(
    releaseName: string,
    chart: string,
    options?: {
      namespace?: string;
      values?: Record<string, any>;
      valuesFile?: string;
      version?: string;
      wait?: boolean;
      createNamespace?: boolean;
    }
  ): Promise<string> {
    const args = ['install', releaseName, chart];
    
    if (options?.namespace) args.push('-n', options.namespace);
    if (options?.version) args.push('--version', options.version);
    if (options?.valuesFile) args.push('-f', options.valuesFile);
    if (options?.wait) args.push('--wait');
    if (options?.createNamespace) args.push('--create-namespace');
    
    if (options?.values) {
      for (const [key, value] of Object.entries(options.values)) {
        args.push('--set', `${key}=${value}`);
      }
    }
    
    try {
      const { stdout } = await execAsync(`helm ${args.join(' ')}`);
      return stdout;
    } catch (error: any) {
      throw new Error(`Helm install failed: ${error.message}`);
    }
  }

  /**
   * Upgrade Helm release
   */
  async upgradeHelmRelease(
    releaseName: string,
    chart: string,
    options?: {
      namespace?: string;
      values?: Record<string, any>;
      valuesFile?: string;
      version?: string;
      wait?: boolean;
      install?: boolean;
    }
  ): Promise<string> {
    const args = ['upgrade', releaseName, chart];
    
    if (options?.namespace) args.push('-n', options.namespace);
    if (options?.version) args.push('--version', options.version);
    if (options?.valuesFile) args.push('-f', options.valuesFile);
    if (options?.wait) args.push('--wait');
    if (options?.install) args.push('--install');
    
    if (options?.values) {
      for (const [key, value] of Object.entries(options.values)) {
        args.push('--set', `${key}=${value}`);
      }
    }
    
    try {
      const { stdout } = await execAsync(`helm ${args.join(' ')}`);
      return stdout;
    } catch (error: any) {
      throw new Error(`Helm upgrade failed: ${error.message}`);
    }
  }

  /**
   * Uninstall Helm release
   */
  async uninstallHelmRelease(releaseName: string, namespace?: string): Promise<string> {
    const args = ['uninstall', releaseName];
    if (namespace) args.push('-n', namespace);
    
    try {
      const { stdout } = await execAsync(`helm ${args.join(' ')}`);
      return stdout;
    } catch (error: any) {
      throw new Error(`Helm uninstall failed: ${error.message}`);
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Format age from timestamp
   */
  private formatAge(timestamp: string): string {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Port forward
   */
  portForward(
    resourceType: string,
    resourceName: string,
    localPort: number,
    remotePort: number,
    namespace?: string
  ): () => void {
    const args = ['port-forward', `${resourceType}/${resourceName}`, `${localPort}:${remotePort}`];
    if (namespace) args.push('-n', namespace);
    
    const cmd = this.buildKubectlCommand(args);
    const [command, ...cmdArgs] = cmd.split(' ');
    
    const proc = spawn(command, cmdArgs, { shell: true });
    const key = `pf-${resourceType}-${resourceName}-${localPort}`;
    this.logStreamProcesses.set(key, proc);
    
    proc.stdout.on('data', (data: Buffer) => {
      this.log(`Port forward: ${data.toString()}`);
    });
    
    return () => {
      proc.kill();
      this.logStreamProcesses.delete(key);
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    for (const proc of this.logStreamProcesses.values()) {
      proc.kill();
    }
    this.logStreamProcesses.clear();
    this.outputChannel.dispose();
  }
}
