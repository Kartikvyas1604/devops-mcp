export interface Provider {
    name: string;
    type: string;
    version: string;
}

export interface AWSProvider extends Provider {
    region: string;
    services: string[];
}

export interface AzureProvider extends Provider {
    subscriptionId: string;
    resourceGroup: string;
}

export interface GCPProvider extends Provider {
    projectId: string;
    services: string[];
}

export interface DockerProvider extends Provider {
    dockerHost: string;
}

export interface KubernetesProvider extends Provider {
    clusterName: string;
    namespace: string;
}

export interface GitHubProvider extends Provider {
    repository: string;
    accessToken: string;
}

export interface GitLabProvider extends Provider {
    repository: string;
    accessToken: string;
}

export interface JenkinsProvider extends Provider {
    jenkinsUrl: string;
    jobName: string;
}