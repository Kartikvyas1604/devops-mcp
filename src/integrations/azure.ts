/**
 * Microsoft Azure Integration
 * Comprehensive Azure client for App Service, Functions, AKS, Storage, Container Registry
 */

import * as vscode from 'vscode';

// Types for Azure resources
export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  subscriptionId: string;
  accessToken?: string;
}

export interface AzureFunction {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  runtime: string;
  state: string;
  defaultHostName: string;
  httpsOnly: boolean;
  tags?: Record<string, string>;
}

export interface AppServicePlan {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  sku: {
    name: string;
    tier: string;
    capacity: number;
  };
  kind: string;
}

export interface WebApp {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  state: string;
  defaultHostName: string;
  httpsOnly: boolean;
  kind: string;
  serverFarmId: string;
  tags?: Record<string, string>;
}

export interface AKSCluster {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  kubernetesVersion: string;
  dnsPrefix: string;
  fqdn: string;
  provisioningState: string;
  powerState: { code: string };
  agentPoolProfiles: Array<{
    name: string;
    count: number;
    vmSize: string;
    mode: string;
  }>;
  tags?: Record<string, string>;
}

export interface StorageAccount {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  sku: { name: string; tier: string };
  kind: string;
  accessTier: string;
  provisioningState: string;
  primaryEndpoints: {
    blob: string;
    queue: string;
    table: string;
    file: string;
  };
  tags?: Record<string, string>;
}

export interface ContainerRegistry {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  loginServer: string;
  sku: { name: string; tier: string };
  adminUserEnabled: boolean;
  provisioningState: string;
  tags?: Record<string, string>;
}

export interface VirtualMachine {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  vmSize: string;
  provisioningState: string;
  powerState: string;
  osType: 'Linux' | 'Windows';
  osProfile?: {
    computerName: string;
    adminUsername: string;
  };
  networkProfile?: {
    networkInterfaces: Array<{ id: string }>;
  };
  tags?: Record<string, string>;
}

export interface ResourceGroup {
  id: string;
  name: string;
  location: string;
  provisioningState: string;
  tags?: Record<string, string>;
}

interface AzureConfig {
  subscriptionId: string;
  tenantId?: string;
  resourceGroup?: string;
  location: string;
}

/**
 * Azure Integration Client
 * Provides comprehensive access to Microsoft Azure services
 */
export class AzureIntegration {
  private config: AzureConfig;
  private accessToken?: string;
  private outputChannel: vscode.OutputChannel;

  private readonly apiVersion = {
    compute: '2023-03-01',
    web: '2022-09-01',
    storage: '2023-01-01',
    containerservice: '2023-07-01',
    containerregistry: '2023-01-01-preview',
    resources: '2021-04-01',
  };

  constructor(config: AzureConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('DevOps Omnibus - Azure');
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

  private getBaseUrl(): string {
    return 'https://management.azure.com';
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: unknown,
    apiVersion?: string
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`;
    this.log(`${method} ${url}`);

    // This would use actual HTTP client in production
    // For now, we simulate the API structure
    throw new Error('Azure credentials not configured. Please authenticate with Azure.');
  }

  // ============================================
  // Resource Group Operations
  // ============================================

  /**
   * List resource groups
   */
  async listResourceGroups(): Promise<ResourceGroup[]> {
    this.log('Listing resource groups');

    const result = await this.request<{ value: ResourceGroup[] }>(
      `/subscriptions/${this.config.subscriptionId}/resourcegroups`,
      'GET',
      undefined,
      this.apiVersion.resources
    );

    return result.value || [];
  }

  /**
   * Create a resource group
   */
  async createResourceGroup(name: string, location?: string, tags?: Record<string, string>): Promise<ResourceGroup> {
    this.log(`Creating resource group: ${name}`);

    return this.request<ResourceGroup>(
      `/subscriptions/${this.config.subscriptionId}/resourcegroups/${name}`,
      'PUT',
      {
        location: location || this.config.location,
        tags,
      },
      this.apiVersion.resources
    );
  }

  /**
   * Delete a resource group
   */
  async deleteResourceGroup(name: string): Promise<void> {
    this.log(`Deleting resource group: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourcegroups/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.resources
    );
  }

  // ============================================
  // Azure Functions Operations
  // ============================================

  /**
   * List Azure Functions
   */
  async listFunctions(resourceGroup?: string): Promise<AzureFunction[]> {
    const rg = resourceGroup || this.config.resourceGroup;
    this.log(`Listing functions in: ${rg || 'all resource groups'}`);

    let path: string;
    if (rg) {
      path = `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites`;
    } else {
      path = `/subscriptions/${this.config.subscriptionId}/providers/Microsoft.Web/sites`;
    }

    const result = await this.request<{ value: WebApp[] }>(
      path,
      'GET',
      undefined,
      this.apiVersion.web
    );

    // Filter to function apps only
    return (result.value || [])
      .filter(app => app.kind?.includes('functionapp'))
      .map(app => ({
        id: app.id,
        name: app.name,
        resourceGroup: app.resourceGroup,
        location: app.location,
        runtime: '', // Would need to fetch app settings for this
        state: app.state,
        defaultHostName: app.defaultHostName,
        httpsOnly: app.httpsOnly,
        tags: app.tags,
      }));
  }

  /**
   * Create an Azure Function App
   */
  async createFunctionApp(options: {
    name: string;
    resourceGroup?: string;
    runtime: 'node' | 'python' | 'dotnet' | 'java';
    runtimeVersion: string;
    storageAccountName: string;
    planId?: string;
    tags?: Record<string, string>;
  }): Promise<AzureFunction> {
    const rg = options.resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Creating function app: ${options.name}`);

    const runtimeSettings: Record<string, { workerRuntime: string; linuxFxVersion: string }> = {
      node: { workerRuntime: 'node', linuxFxVersion: `Node|${options.runtimeVersion}` },
      python: { workerRuntime: 'python', linuxFxVersion: `Python|${options.runtimeVersion}` },
      dotnet: { workerRuntime: 'dotnet', linuxFxVersion: `DOTNET|${options.runtimeVersion}` },
      java: { workerRuntime: 'java', linuxFxVersion: `Java|${options.runtimeVersion}` },
    };

    const settings = runtimeSettings[options.runtime];

    const functionApp = {
      location: this.config.location,
      kind: 'functionapp,linux',
      properties: {
        serverFarmId: options.planId,
        siteConfig: {
          linuxFxVersion: settings.linuxFxVersion,
          appSettings: [
            { name: 'FUNCTIONS_WORKER_RUNTIME', value: settings.workerRuntime },
            { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' },
            { name: 'AzureWebJobsStorage', value: `DefaultEndpointsProtocol=https;AccountName=${options.storageAccountName}` },
          ],
        },
        httpsOnly: true,
      },
      tags: options.tags,
    };

    const result = await this.request<WebApp>(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${options.name}`,
      'PUT',
      functionApp,
      this.apiVersion.web
    );

    return {
      id: result.id,
      name: result.name,
      resourceGroup: rg,
      location: result.location,
      runtime: options.runtime,
      state: result.state,
      defaultHostName: result.defaultHostName,
      httpsOnly: result.httpsOnly,
      tags: result.tags,
    };
  }

  /**
   * Delete an Azure Function App
   */
  async deleteFunctionApp(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Deleting function app: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.web
    );
  }

  // ============================================
  // Azure App Service Operations
  // ============================================

  /**
   * List Web Apps
   */
  async listWebApps(resourceGroup?: string): Promise<WebApp[]> {
    const rg = resourceGroup || this.config.resourceGroup;
    this.log(`Listing web apps in: ${rg || 'all resource groups'}`);

    let path: string;
    if (rg) {
      path = `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites`;
    } else {
      path = `/subscriptions/${this.config.subscriptionId}/providers/Microsoft.Web/sites`;
    }

    const result = await this.request<{ value: WebApp[] }>(
      path,
      'GET',
      undefined,
      this.apiVersion.web
    );

    // Filter to web apps only (exclude function apps)
    return (result.value || []).filter(app => !app.kind?.includes('functionapp'));
  }

  /**
   * Create a Web App
   */
  async createWebApp(options: {
    name: string;
    resourceGroup?: string;
    runtime: 'node' | 'python' | 'dotnet' | 'php' | 'java';
    runtimeVersion: string;
    planId: string;
    startupCommand?: string;
    appSettings?: Record<string, string>;
    tags?: Record<string, string>;
  }): Promise<WebApp> {
    const rg = options.resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Creating web app: ${options.name}`);

    const linuxFxVersionMap: Record<string, string> = {
      node: `NODE|${options.runtimeVersion}`,
      python: `PYTHON|${options.runtimeVersion}`,
      dotnet: `DOTNETCORE|${options.runtimeVersion}`,
      php: `PHP|${options.runtimeVersion}`,
      java: `JAVA|${options.runtimeVersion}`,
    };

    const webApp = {
      location: this.config.location,
      kind: 'app,linux',
      properties: {
        serverFarmId: options.planId,
        siteConfig: {
          linuxFxVersion: linuxFxVersionMap[options.runtime],
          appCommandLine: options.startupCommand,
          appSettings: options.appSettings
            ? Object.entries(options.appSettings).map(([name, value]) => ({ name, value }))
            : undefined,
        },
        httpsOnly: true,
      },
      tags: options.tags,
    };

    return this.request<WebApp>(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${options.name}`,
      'PUT',
      webApp,
      this.apiVersion.web
    );
  }

  /**
   * Restart a Web App
   */
  async restartWebApp(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Restarting web app: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/restart`,
      'POST',
      undefined,
      this.apiVersion.web
    );
  }

  /**
   * Stop a Web App
   */
  async stopWebApp(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Stopping web app: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/stop`,
      'POST',
      undefined,
      this.apiVersion.web
    );
  }

  /**
   * Start a Web App
   */
  async startWebApp(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Starting web app: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/start`,
      'POST',
      undefined,
      this.apiVersion.web
    );
  }

  /**
   * Delete a Web App
   */
  async deleteWebApp(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Deleting web app: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.web
    );
  }

  // ============================================
  // Azure Kubernetes Service (AKS) Operations
  // ============================================

  /**
   * List AKS clusters
   */
  async listAKSClusters(resourceGroup?: string): Promise<AKSCluster[]> {
    const rg = resourceGroup || this.config.resourceGroup;
    this.log(`Listing AKS clusters in: ${rg || 'all resource groups'}`);

    let path: string;
    if (rg) {
      path = `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerService/managedClusters`;
    } else {
      path = `/subscriptions/${this.config.subscriptionId}/providers/Microsoft.ContainerService/managedClusters`;
    }

    const result = await this.request<{ value: AKSCluster[] }>(
      path,
      'GET',
      undefined,
      this.apiVersion.containerservice
    );

    return result.value || [];
  }

  /**
   * Create an AKS cluster
   */
  async createAKSCluster(options: {
    name: string;
    resourceGroup?: string;
    kubernetesVersion?: string;
    nodeCount?: number;
    nodeSize?: string;
    enableAutoScaling?: boolean;
    minCount?: number;
    maxCount?: number;
    tags?: Record<string, string>;
  }): Promise<AKSCluster> {
    const rg = options.resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Creating AKS cluster: ${options.name}`);

    const cluster = {
      location: this.config.location,
      properties: {
        kubernetesVersion: options.kubernetesVersion || '1.27',
        dnsPrefix: `${options.name}-dns`,
        agentPoolProfiles: [{
          name: 'nodepool1',
          count: options.nodeCount || 3,
          vmSize: options.nodeSize || 'Standard_DS2_v2',
          mode: 'System',
          enableAutoScaling: options.enableAutoScaling,
          minCount: options.enableAutoScaling ? (options.minCount || 1) : undefined,
          maxCount: options.enableAutoScaling ? (options.maxCount || 10) : undefined,
        }],
        identity: {
          type: 'SystemAssigned',
        },
      },
      tags: options.tags,
    };

    return this.request<AKSCluster>(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerService/managedClusters/${options.name}`,
      'PUT',
      cluster,
      this.apiVersion.containerservice
    );
  }

  /**
   * Get AKS cluster credentials (kubeconfig)
   */
  async getAKSCredentials(name: string, resourceGroup?: string): Promise<string> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Getting credentials for AKS cluster: ${name}`);

    const result = await this.request<{ kubeconfigs: Array<{ name: string; value: string }> }>(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerService/managedClusters/${name}/listClusterUserCredential`,
      'POST',
      undefined,
      this.apiVersion.containerservice
    );

    if (result.kubeconfigs && result.kubeconfigs.length > 0) {
      return Buffer.from(result.kubeconfigs[0].value, 'base64').toString('utf-8');
    }

    throw new Error('No kubeconfig returned');
  }

  /**
   * Scale an AKS cluster node pool
   */
  async scaleAKSNodePool(
    clusterName: string,
    nodePoolName: string,
    nodeCount: number,
    resourceGroup?: string
  ): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Scaling AKS node pool ${nodePoolName} in ${clusterName} to ${nodeCount}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerService/managedClusters/${clusterName}/agentPools/${nodePoolName}`,
      'PATCH',
      { properties: { count: nodeCount } },
      this.apiVersion.containerservice
    );
  }

  /**
   * Delete an AKS cluster
   */
  async deleteAKSCluster(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Deleting AKS cluster: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerService/managedClusters/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.containerservice
    );
  }

  // ============================================
  // Azure Storage Operations
  // ============================================

  /**
   * List storage accounts
   */
  async listStorageAccounts(resourceGroup?: string): Promise<StorageAccount[]> {
    const rg = resourceGroup || this.config.resourceGroup;
    this.log(`Listing storage accounts in: ${rg || 'all resource groups'}`);

    let path: string;
    if (rg) {
      path = `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Storage/storageAccounts`;
    } else {
      path = `/subscriptions/${this.config.subscriptionId}/providers/Microsoft.Storage/storageAccounts`;
    }

    const result = await this.request<{ value: StorageAccount[] }>(
      path,
      'GET',
      undefined,
      this.apiVersion.storage
    );

    return result.value || [];
  }

  /**
   * Create a storage account
   */
  async createStorageAccount(options: {
    name: string;
    resourceGroup?: string;
    sku?: 'Standard_LRS' | 'Standard_GRS' | 'Standard_RAGRS' | 'Premium_LRS';
    kind?: 'StorageV2' | 'BlobStorage' | 'BlockBlobStorage';
    accessTier?: 'Hot' | 'Cool';
    enableHttpsOnly?: boolean;
    tags?: Record<string, string>;
  }): Promise<StorageAccount> {
    const rg = options.resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Creating storage account: ${options.name}`);

    const storageAccount = {
      location: this.config.location,
      sku: { name: options.sku || 'Standard_LRS' },
      kind: options.kind || 'StorageV2',
      properties: {
        accessTier: options.accessTier || 'Hot',
        supportsHttpsTrafficOnly: options.enableHttpsOnly !== false,
        minimumTlsVersion: 'TLS1_2',
      },
      tags: options.tags,
    };

    return this.request<StorageAccount>(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Storage/storageAccounts/${options.name}`,
      'PUT',
      storageAccount,
      this.apiVersion.storage
    );
  }

  /**
   * Delete a storage account
   */
  async deleteStorageAccount(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Deleting storage account: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Storage/storageAccounts/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.storage
    );
  }

  // ============================================
  // Azure Container Registry (ACR) Operations
  // ============================================

  /**
   * List container registries
   */
  async listContainerRegistries(resourceGroup?: string): Promise<ContainerRegistry[]> {
    const rg = resourceGroup || this.config.resourceGroup;
    this.log(`Listing container registries in: ${rg || 'all resource groups'}`);

    let path: string;
    if (rg) {
      path = `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerRegistry/registries`;
    } else {
      path = `/subscriptions/${this.config.subscriptionId}/providers/Microsoft.ContainerRegistry/registries`;
    }

    const result = await this.request<{ value: ContainerRegistry[] }>(
      path,
      'GET',
      undefined,
      this.apiVersion.containerregistry
    );

    return result.value || [];
  }

  /**
   * Create a container registry
   */
  async createContainerRegistry(options: {
    name: string;
    resourceGroup?: string;
    sku?: 'Basic' | 'Standard' | 'Premium';
    adminUserEnabled?: boolean;
    tags?: Record<string, string>;
  }): Promise<ContainerRegistry> {
    const rg = options.resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Creating container registry: ${options.name}`);

    const registry = {
      location: this.config.location,
      sku: { name: options.sku || 'Basic' },
      properties: {
        adminUserEnabled: options.adminUserEnabled || false,
      },
      tags: options.tags,
    };

    return this.request<ContainerRegistry>(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerRegistry/registries/${options.name}`,
      'PUT',
      registry,
      this.apiVersion.containerregistry
    );
  }

  /**
   * Get container registry credentials
   */
  async getContainerRegistryCredentials(
    name: string,
    resourceGroup?: string
  ): Promise<{ username: string; passwords: Array<{ name: string; value: string }> }> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Getting credentials for registry: ${name}`);

    return this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerRegistry/registries/${name}/listCredentials`,
      'POST',
      undefined,
      this.apiVersion.containerregistry
    );
  }

  /**
   * Delete a container registry
   */
  async deleteContainerRegistry(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Deleting container registry: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.ContainerRegistry/registries/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.containerregistry
    );
  }

  // ============================================
  // Virtual Machine Operations
  // ============================================

  /**
   * List virtual machines
   */
  async listVMs(resourceGroup?: string): Promise<VirtualMachine[]> {
    const rg = resourceGroup || this.config.resourceGroup;
    this.log(`Listing VMs in: ${rg || 'all resource groups'}`);

    let path: string;
    if (rg) {
      path = `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines`;
    } else {
      path = `/subscriptions/${this.config.subscriptionId}/providers/Microsoft.Compute/virtualMachines`;
    }

    const result = await this.request<{ value: VirtualMachine[] }>(
      path,
      'GET',
      undefined,
      this.apiVersion.compute
    );

    return result.value || [];
  }

  /**
   * Start a virtual machine
   */
  async startVM(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Starting VM: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${name}/start`,
      'POST',
      undefined,
      this.apiVersion.compute
    );
  }

  /**
   * Stop a virtual machine
   */
  async stopVM(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Stopping VM: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${name}/deallocate`,
      'POST',
      undefined,
      this.apiVersion.compute
    );
  }

  /**
   * Restart a virtual machine
   */
  async restartVM(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Restarting VM: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${name}/restart`,
      'POST',
      undefined,
      this.apiVersion.compute
    );
  }

  /**
   * Delete a virtual machine
   */
  async deleteVM(name: string, resourceGroup?: string): Promise<void> {
    const rg = resourceGroup || this.config.resourceGroup;
    if (!rg) throw new Error('Resource group is required');

    this.log(`Deleting VM: ${name}`);

    await this.request(
      `/subscriptions/${this.config.subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Compute/virtualMachines/${name}`,
      'DELETE',
      undefined,
      this.apiVersion.compute
    );
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
