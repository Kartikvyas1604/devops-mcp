/**
 * Google Cloud Platform Integration
 * Comprehensive GCP client for Cloud Run, Cloud Functions, GKE, Cloud Storage, Compute Engine
 */

import * as vscode from 'vscode';

// Types for GCP resources
export interface GCPCredentials {
  projectId: string;
  keyFilePath?: string;
  accessToken?: string;
}

export interface CloudFunction {
  name: string;
  runtime: string;
  entryPoint: string;
  httpsTrigger?: { url: string };
  eventTrigger?: { eventType: string; resource: string };
  status: string;
  updateTime: string;
  availableMemoryMb: number;
  timeout: string;
  labels?: Record<string, string>;
}

export interface CloudRunService {
  name: string;
  namespace: string;
  url?: string;
  status: {
    conditions: Array<{ type: string; status: string }>;
    latestReadyRevisionName?: string;
    traffic?: Array<{ revisionName: string; percent: number }>;
  };
  spec: {
    template: {
      spec: {
        containers: Array<{ image: string }>;
      };
    };
  };
  metadata: {
    creationTimestamp: string;
    annotations?: Record<string, string>;
  };
}

export interface GCEInstance {
  id: string;
  name: string;
  zone: string;
  machineType: string;
  status: string;
  networkInterfaces: Array<{
    networkIP: string;
    accessConfigs?: Array<{ natIP: string }>;
  }>;
  disks: Array<{
    source: string;
    type: string;
    boot: boolean;
  }>;
  labels?: Record<string, string>;
  creationTimestamp: string;
}

export interface GCSBucket {
  name: string;
  location: string;
  storageClass: string;
  timeCreated: string;
  updated: string;
  labels?: Record<string, string>;
}

export interface GKECluster {
  name: string;
  location: string;
  status: string;
  nodePoolCount: number;
  currentNodeCount: number;
  endpoint: string;
  currentMasterVersion: string;
  createTime: string;
}

export interface PubSubTopic {
  name: string;
  labels?: Record<string, string>;
}

export interface PubSubSubscription {
  name: string;
  topic: string;
  pushConfig?: { pushEndpoint: string };
  ackDeadlineSeconds: number;
  messageRetentionDuration: string;
}

interface GCPConfig {
  projectId: string;
  region: string;
  zone?: string;
}

/**
 * GCP Integration Client
 * Provides comprehensive access to Google Cloud Platform services
 */
export class GCPIntegration {
  private config: GCPConfig;
  private accessToken?: string;
  private outputChannel: vscode.OutputChannel;

  constructor(config: GCPConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('DevOps Omnibus - GCP');
  }

  /**
   * Set authentication credentials
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  private getBaseUrl(service: string): string {
    const serviceUrls: Record<string, string> = {
      cloudfunctions: `https://cloudfunctions.googleapis.com/v1`,
      run: `https://${this.config.region}-run.googleapis.com/apis/serving.knative.dev/v1`,
      compute: `https://compute.googleapis.com/compute/v1`,
      storage: `https://storage.googleapis.com/storage/v1`,
      container: `https://container.googleapis.com/v1`,
      pubsub: `https://pubsub.googleapis.com/v1`,
    };
    return serviceUrls[service] || '';
  }

  private async request<T>(
    service: string,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: unknown
  ): Promise<T> {
    const baseUrl = this.getBaseUrl(service);
    const url = `${baseUrl}${path}`;

    this.log(`${method} ${url}`);

    // This would use actual HTTP client in production
    // For now, we simulate the API structure
    throw new Error('GCP credentials not configured. Please authenticate with Google Cloud.');
  }

  // ============================================
  // Cloud Functions Operations
  // ============================================

  /**
   * List Cloud Functions in a project
   */
  async listFunctions(): Promise<CloudFunction[]> {
    this.log('Listing Cloud Functions');
    
    const location = `projects/${this.config.projectId}/locations/${this.config.region}`;
    const result = await this.request<{ functions: CloudFunction[] }>(
      'cloudfunctions',
      `/projects/${this.config.projectId}/locations/-/functions`
    );
    
    return result.functions || [];
  }

  /**
   * Get details of a specific Cloud Function
   */
  async getFunction(functionName: string): Promise<CloudFunction> {
    this.log(`Getting function: ${functionName}`);
    
    const name = `projects/${this.config.projectId}/locations/${this.config.region}/functions/${functionName}`;
    return this.request<CloudFunction>('cloudfunctions', `/${name}`);
  }

  /**
   * Deploy a new Cloud Function
   */
  async deployFunction(options: {
    name: string;
    runtime: string;
    entryPoint: string;
    sourceArchiveUrl?: string;
    sourceRepository?: { url: string };
    httpsTrigger?: boolean;
    eventTrigger?: { eventType: string; resource: string };
    environmentVariables?: Record<string, string>;
    availableMemoryMb?: number;
    timeout?: string;
    labels?: Record<string, string>;
  }): Promise<CloudFunction> {
    this.log(`Deploying function: ${options.name}`);

    const location = `projects/${this.config.projectId}/locations/${this.config.region}`;
    
    const body: any = {
      name: `${location}/functions/${options.name}`,
      runtime: options.runtime,
      entryPoint: options.entryPoint,
      availableMemoryMb: options.availableMemoryMb || 256,
      timeout: options.timeout || '60s',
      environmentVariables: options.environmentVariables,
      labels: options.labels,
    };

    if (options.httpsTrigger) {
      body.httpsTrigger = {};
    } else if (options.eventTrigger) {
      body.eventTrigger = options.eventTrigger;
    }

    if (options.sourceArchiveUrl) {
      body.sourceArchiveUrl = options.sourceArchiveUrl;
    } else if (options.sourceRepository) {
      body.sourceRepository = options.sourceRepository;
    }

    return this.request<CloudFunction>(
      'cloudfunctions',
      `/${location}/functions`,
      'POST',
      body
    );
  }

  /**
   * Invoke a Cloud Function
   */
  async invokeFunction(functionName: string, data?: unknown): Promise<string> {
    this.log(`Invoking function: ${functionName}`);

    const name = `projects/${this.config.projectId}/locations/${this.config.region}/functions/${functionName}`;
    const result = await this.request<{ result: string }>(
      'cloudfunctions',
      `/${name}:call`,
      'POST',
      { data: JSON.stringify(data || {}) }
    );

    return result.result;
  }

  /**
   * Delete a Cloud Function
   */
  async deleteFunction(functionName: string): Promise<void> {
    this.log(`Deleting function: ${functionName}`);

    const name = `projects/${this.config.projectId}/locations/${this.config.region}/functions/${functionName}`;
    await this.request('cloudfunctions', `/${name}`, 'DELETE');
  }

  // ============================================
  // Cloud Run Operations
  // ============================================

  /**
   * List Cloud Run services
   */
  async listServices(): Promise<CloudRunService[]> {
    this.log('Listing Cloud Run services');

    const result = await this.request<{ items: CloudRunService[] }>(
      'run',
      `/namespaces/${this.config.projectId}/services`
    );

    return result.items || [];
  }

  /**
   * Get a Cloud Run service
   */
  async getService(serviceName: string): Promise<CloudRunService> {
    this.log(`Getting service: ${serviceName}`);

    return this.request<CloudRunService>(
      'run',
      `/namespaces/${this.config.projectId}/services/${serviceName}`
    );
  }

  /**
   * Deploy a Cloud Run service
   */
  async deployService(options: {
    name: string;
    image: string;
    port?: number;
    env?: Record<string, string>;
    memory?: string;
    cpu?: string;
    maxInstances?: number;
    minInstances?: number;
    concurrency?: number;
    allowUnauthenticated?: boolean;
    labels?: Record<string, string>;
  }): Promise<CloudRunService> {
    this.log(`Deploying service: ${options.name}`);

    const service = {
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      metadata: {
        name: options.name,
        namespace: this.config.projectId,
        labels: options.labels,
        annotations: {
          'run.googleapis.com/ingress': options.allowUnauthenticated 
            ? 'all' 
            : 'internal-and-cloud-load-balancing',
        },
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'autoscaling.knative.dev/maxScale': String(options.maxInstances || 100),
              'autoscaling.knative.dev/minScale': String(options.minInstances || 0),
              'run.googleapis.com/cpu-throttling': 'true',
            },
          },
          spec: {
            containerConcurrency: options.concurrency || 80,
            containers: [{
              image: options.image,
              ports: [{ containerPort: options.port || 8080 }],
              resources: {
                limits: {
                  memory: options.memory || '512Mi',
                  cpu: options.cpu || '1',
                },
              },
              env: options.env 
                ? Object.entries(options.env).map(([name, value]) => ({ name, value }))
                : undefined,
            }],
          },
        },
      },
    };

    return this.request<CloudRunService>(
      'run',
      `/namespaces/${this.config.projectId}/services`,
      'POST',
      service
    );
  }

  /**
   * Delete a Cloud Run service
   */
  async deleteService(serviceName: string): Promise<void> {
    this.log(`Deleting service: ${serviceName}`);

    await this.request(
      'run',
      `/namespaces/${this.config.projectId}/services/${serviceName}`,
      'DELETE'
    );
  }

  /**
   * Get Cloud Run service revisions
   */
  async listRevisions(serviceName: string): Promise<any[]> {
    this.log(`Listing revisions for: ${serviceName}`);

    const result = await this.request<{ items: any[] }>(
      'run',
      `/namespaces/${this.config.projectId}/revisions?labelSelector=serving.knative.dev/service=${serviceName}`
    );

    return result.items || [];
  }

  // ============================================
  // Google Kubernetes Engine (GKE) Operations
  // ============================================

  /**
   * List GKE clusters
   */
  async listClusters(): Promise<GKECluster[]> {
    this.log('Listing GKE clusters');

    const result = await this.request<{ clusters: GKECluster[] }>(
      'container',
      `/projects/${this.config.projectId}/locations/-/clusters`
    );

    return result.clusters || [];
  }

  /**
   * Get a GKE cluster
   */
  async getCluster(clusterName: string): Promise<GKECluster> {
    this.log(`Getting cluster: ${clusterName}`);

    return this.request<GKECluster>(
      'container',
      `/projects/${this.config.projectId}/locations/${this.config.region}/clusters/${clusterName}`
    );
  }

  /**
   * Create a GKE cluster
   */
  async createCluster(options: {
    name: string;
    nodeCount?: number;
    machineType?: string;
    diskSizeGb?: number;
    enableAutoscaling?: boolean;
    minNodeCount?: number;
    maxNodeCount?: number;
    preemptible?: boolean;
    labels?: Record<string, string>;
  }): Promise<GKECluster> {
    this.log(`Creating cluster: ${options.name}`);

    const cluster = {
      name: options.name,
      initialNodeCount: options.nodeCount || 3,
      nodeConfig: {
        machineType: options.machineType || 'e2-medium',
        diskSizeGb: options.diskSizeGb || 100,
        preemptible: options.preemptible || false,
        labels: options.labels,
      },
      autoscaling: options.enableAutoscaling ? {
        enableNodeAutoprovisioning: true,
        resourceLimits: [
          { resourceType: 'cpu', minimum: 1, maximum: options.maxNodeCount || 10 },
          { resourceType: 'memory', minimum: 1, maximum: (options.maxNodeCount || 10) * 8 },
        ],
      } : undefined,
    };

    return this.request<GKECluster>(
      'container',
      `/projects/${this.config.projectId}/locations/${this.config.region}/clusters`,
      'POST',
      { cluster }
    );
  }

  /**
   * Delete a GKE cluster
   */
  async deleteCluster(clusterName: string): Promise<void> {
    this.log(`Deleting cluster: ${clusterName}`);

    await this.request(
      'container',
      `/projects/${this.config.projectId}/locations/${this.config.region}/clusters/${clusterName}`,
      'DELETE'
    );
  }

  /**
   * Resize a GKE cluster node pool
   */
  async resizeNodePool(
    clusterName: string,
    nodePoolName: string,
    nodeCount: number
  ): Promise<void> {
    this.log(`Resizing node pool ${nodePoolName} in ${clusterName} to ${nodeCount}`);

    await this.request(
      'container',
      `/projects/${this.config.projectId}/locations/${this.config.region}/clusters/${clusterName}/nodePools/${nodePoolName}:setSize`,
      'POST',
      { nodeCount }
    );
  }

  // ============================================
  // Cloud Storage Operations
  // ============================================

  /**
   * List Cloud Storage buckets
   */
  async listBuckets(): Promise<GCSBucket[]> {
    this.log('Listing Cloud Storage buckets');

    const result = await this.request<{ items: GCSBucket[] }>(
      'storage',
      `/b?project=${this.config.projectId}`
    );

    return result.items || [];
  }

  /**
   * Create a Cloud Storage bucket
   */
  async createBucket(options: {
    name: string;
    location?: string;
    storageClass?: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
    labels?: Record<string, string>;
    versioning?: boolean;
    lifecycle?: Array<{
      action: { type: string };
      condition: { age?: number; isLive?: boolean };
    }>;
  }): Promise<GCSBucket> {
    this.log(`Creating bucket: ${options.name}`);

    const bucket = {
      name: options.name,
      location: options.location || this.config.region,
      storageClass: options.storageClass || 'STANDARD',
      labels: options.labels,
      versioning: options.versioning ? { enabled: true } : undefined,
      lifecycle: options.lifecycle ? { rule: options.lifecycle } : undefined,
    };

    return this.request<GCSBucket>(
      'storage',
      `/b?project=${this.config.projectId}`,
      'POST',
      bucket
    );
  }

  /**
   * Delete a Cloud Storage bucket
   */
  async deleteBucket(bucketName: string): Promise<void> {
    this.log(`Deleting bucket: ${bucketName}`);

    await this.request('storage', `/b/${bucketName}`, 'DELETE');
  }

  /**
   * List objects in a bucket
   */
  async listObjects(
    bucketName: string,
    options?: { prefix?: string; maxResults?: number }
  ): Promise<Array<{ name: string; size: string; updated: string }>> {
    this.log(`Listing objects in: ${bucketName}`);

    const params = new URLSearchParams();
    if (options?.prefix) params.append('prefix', options.prefix);
    if (options?.maxResults) params.append('maxResults', String(options.maxResults));

    const result = await this.request<{ items: any[] }>(
      'storage',
      `/b/${bucketName}/o?${params.toString()}`
    );

    return (result.items || []).map(item => ({
      name: item.name,
      size: item.size,
      updated: item.updated,
    }));
  }

  /**
   * Get a signed URL for an object
   */
  async getSignedUrl(
    bucketName: string,
    objectName: string,
    options?: { expiresIn?: number; action?: 'read' | 'write' }
  ): Promise<string> {
    this.log(`Generating signed URL for: ${bucketName}/${objectName}`);

    // In production, this would use the signBlob API
    // For now, return the public URL pattern
    return `https://storage.googleapis.com/${bucketName}/${objectName}`;
  }

  // ============================================
  // Compute Engine Operations
  // ============================================

  /**
   * List Compute Engine instances
   */
  async listInstances(): Promise<GCEInstance[]> {
    this.log('Listing Compute Engine instances');

    const zone = this.config.zone || `${this.config.region}-a`;
    const result = await this.request<{ items: GCEInstance[] }>(
      'compute',
      `/projects/${this.config.projectId}/zones/${zone}/instances`
    );

    return result.items || [];
  }

  /**
   * Create a Compute Engine instance
   */
  async createInstance(options: {
    name: string;
    machineType?: string;
    sourceImage?: string;
    diskSizeGb?: number;
    diskType?: 'pd-standard' | 'pd-ssd' | 'pd-balanced';
    network?: string;
    subnetwork?: string;
    externalIp?: boolean;
    preemptible?: boolean;
    labels?: Record<string, string>;
    metadata?: Record<string, string>;
    startupScript?: string;
  }): Promise<GCEInstance> {
    this.log(`Creating instance: ${options.name}`);

    const zone = this.config.zone || `${this.config.region}-a`;
    const machineType = `zones/${zone}/machineTypes/${options.machineType || 'e2-medium'}`;
    
    const instance = {
      name: options.name,
      machineType,
      labels: options.labels,
      scheduling: options.preemptible ? {
        preemptible: true,
        automaticRestart: false,
      } : undefined,
      disks: [{
        boot: true,
        autoDelete: true,
        initializeParams: {
          sourceImage: options.sourceImage || 'projects/debian-cloud/global/images/family/debian-11',
          diskSizeGb: String(options.diskSizeGb || 10),
          diskType: `zones/${zone}/diskTypes/${options.diskType || 'pd-standard'}`,
        },
      }],
      networkInterfaces: [{
        network: options.network || 'global/networks/default',
        subnetwork: options.subnetwork,
        accessConfigs: options.externalIp !== false ? [{
          name: 'External NAT',
          type: 'ONE_TO_ONE_NAT',
        }] : undefined,
      }],
      metadata: options.startupScript || options.metadata ? {
        items: [
          ...(options.startupScript ? [{ key: 'startup-script', value: options.startupScript }] : []),
          ...(options.metadata ? Object.entries(options.metadata).map(([key, value]) => ({ key, value })) : []),
        ],
      } : undefined,
    };

    return this.request<GCEInstance>(
      'compute',
      `/projects/${this.config.projectId}/zones/${zone}/instances`,
      'POST',
      instance
    );
  }

  /**
   * Start a Compute Engine instance
   */
  async startInstance(instanceName: string): Promise<void> {
    this.log(`Starting instance: ${instanceName}`);

    const zone = this.config.zone || `${this.config.region}-a`;
    await this.request(
      'compute',
      `/projects/${this.config.projectId}/zones/${zone}/instances/${instanceName}/start`,
      'POST'
    );
  }

  /**
   * Stop a Compute Engine instance
   */
  async stopInstance(instanceName: string): Promise<void> {
    this.log(`Stopping instance: ${instanceName}`);

    const zone = this.config.zone || `${this.config.region}-a`;
    await this.request(
      'compute',
      `/projects/${this.config.projectId}/zones/${zone}/instances/${instanceName}/stop`,
      'POST'
    );
  }

  /**
   * Delete a Compute Engine instance
   */
  async deleteInstance(instanceName: string): Promise<void> {
    this.log(`Deleting instance: ${instanceName}`);

    const zone = this.config.zone || `${this.config.region}-a`;
    await this.request(
      'compute',
      `/projects/${this.config.projectId}/zones/${zone}/instances/${instanceName}`,
      'DELETE'
    );
  }

  // ============================================
  // Pub/Sub Operations
  // ============================================

  /**
   * List Pub/Sub topics
   */
  async listTopics(): Promise<PubSubTopic[]> {
    this.log('Listing Pub/Sub topics');

    const result = await this.request<{ topics: PubSubTopic[] }>(
      'pubsub',
      `/projects/${this.config.projectId}/topics`
    );

    return result.topics || [];
  }

  /**
   * Create a Pub/Sub topic
   */
  async createTopic(topicName: string, labels?: Record<string, string>): Promise<PubSubTopic> {
    this.log(`Creating topic: ${topicName}`);

    return this.request<PubSubTopic>(
      'pubsub',
      `/projects/${this.config.projectId}/topics/${topicName}`,
      'PUT',
      { labels }
    );
  }

  /**
   * Delete a Pub/Sub topic
   */
  async deleteTopic(topicName: string): Promise<void> {
    this.log(`Deleting topic: ${topicName}`);

    await this.request(
      'pubsub',
      `/projects/${this.config.projectId}/topics/${topicName}`,
      'DELETE'
    );
  }

  /**
   * Publish a message to a topic
   */
  async publish(topicName: string, data: unknown, attributes?: Record<string, string>): Promise<string> {
    this.log(`Publishing to topic: ${topicName}`);

    const message = {
      data: Buffer.from(JSON.stringify(data)).toString('base64'),
      attributes,
    };

    const result = await this.request<{ messageIds: string[] }>(
      'pubsub',
      `/projects/${this.config.projectId}/topics/${topicName}:publish`,
      'POST',
      { messages: [message] }
    );

    return result.messageIds[0];
  }

  /**
   * Create a Pub/Sub subscription
   */
  async createSubscription(options: {
    subscriptionName: string;
    topicName: string;
    pushEndpoint?: string;
    ackDeadlineSeconds?: number;
    messageRetentionDuration?: string;
  }): Promise<PubSubSubscription> {
    this.log(`Creating subscription: ${options.subscriptionName}`);

    const subscription = {
      topic: `projects/${this.config.projectId}/topics/${options.topicName}`,
      pushConfig: options.pushEndpoint ? { pushEndpoint: options.pushEndpoint } : undefined,
      ackDeadlineSeconds: options.ackDeadlineSeconds || 10,
      messageRetentionDuration: options.messageRetentionDuration || '604800s',
    };

    return this.request<PubSubSubscription>(
      'pubsub',
      `/projects/${this.config.projectId}/subscriptions/${options.subscriptionName}`,
      'PUT',
      subscription
    );
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
