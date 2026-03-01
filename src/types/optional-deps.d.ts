/**
 * Type declarations for optional dependencies
 * These modules may or may not be installed depending on which features are needed
 */

// AI SDKs
declare module '@anthropic-ai/sdk' {
    export default class Anthropic {
        constructor(options?: { apiKey?: string });
        messages: {
            create(params: unknown): Promise<unknown>;
        };
    }
}

declare module 'openai' {
    export default class OpenAI {
        constructor(options?: { apiKey?: string });
        chat: {
            completions: {
                create(params: unknown): Promise<unknown>;
            };
        };
    }
}

// AWS SDK v3
declare module '@aws-sdk/client-ec2' {
    export class EC2Client {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class DescribeInstancesCommand {
        constructor(input?: unknown);
    }
    export class StartInstancesCommand {
        constructor(input: unknown);
    }
    export class StopInstancesCommand {
        constructor(input: unknown);
    }
    export class TerminateInstancesCommand {
        constructor(input: unknown);
    }
    export class DescribeSecurityGroupsCommand {
        constructor(input?: unknown);
    }
    export class DescribeVpcsCommand {
        constructor(input?: unknown);
    }
    export class DescribeSubnetsCommand {
        constructor(input?: unknown);
    }
    export class RunInstancesCommand {
        constructor(input: unknown);
    }
}

declare module '@aws-sdk/client-s3' {
    export class S3Client {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class ListBucketsCommand {
        constructor(input?: unknown);
    }
    export class CreateBucketCommand {
        constructor(input: unknown);
    }
    export class DeleteBucketCommand {
        constructor(input: unknown);
    }
    export class ListObjectsV2Command {
        constructor(input: unknown);
    }
    export class GetObjectCommand {
        constructor(input: unknown);
    }
    export class PutObjectCommand {
        constructor(input: unknown);
    }
    export class DeleteObjectCommand {
        constructor(input: unknown);
    }
    export class HeadObjectCommand {
        constructor(input: unknown);
    }
}

declare module '@aws-sdk/client-lambda' {
    export class LambdaClient {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class ListFunctionsCommand {
        constructor(input?: unknown);
    }
    export class InvokeCommand {
        constructor(input: unknown);
    }
    export class GetFunctionCommand {
        constructor(input: unknown);
    }
    export class CreateFunctionCommand {
        constructor(input: unknown);
    }
    export class UpdateFunctionCodeCommand {
        constructor(input: unknown);
    }
    export class DeleteFunctionCommand {
        constructor(input: unknown);
    }
    export class GetFunctionConfigurationCommand {
        constructor(input: unknown);
    }
    export class UpdateFunctionConfigurationCommand {
        constructor(input: unknown);
    }
}

declare module '@aws-sdk/client-ecs' {
    export class ECSClient {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class ListClustersCommand {
        constructor(input?: unknown);
    }
    export class ListServicesCommand {
        constructor(input: unknown);
    }
    export class ListTasksCommand {
        constructor(input: unknown);
    }
    export class DescribeTasksCommand {
        constructor(input: unknown);
    }
    export class DescribeServicesCommand {
        constructor(input: unknown);
    }
    export class UpdateServiceCommand {
        constructor(input: unknown);
    }
    export class DescribeClustersCommand {
        constructor(input: unknown);
    }
    export class RunTaskCommand {
        constructor(input: unknown);
    }
}

declare module '@aws-sdk/client-cloudwatch-logs' {
    export class CloudWatchLogsClient {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class GetLogEventsCommand {
        constructor(input: unknown);
    }
    export class DescribeLogGroupsCommand {
        constructor(input?: unknown);
    }
    export class DescribeLogStreamsCommand {
        constructor(input: unknown);
    }
    export class FilterLogEventsCommand {
        constructor(input: unknown);
    }
}

declare module '@aws-sdk/client-ecr' {
    export class ECRClient {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class DescribeRepositoriesCommand {
        constructor(input?: unknown);
    }
    export class DescribeImagesCommand {
        constructor(input: unknown);
    }
    export class GetAuthorizationTokenCommand {
        constructor(input?: unknown);
    }
    export class ListImagesCommand {
        constructor(input: unknown);
    }
}

declare module '@aws-sdk/client-sts' {
    export class STSClient {
        constructor(config?: unknown);
        send(command: unknown): Promise<unknown>;
    }
    export class GetCallerIdentityCommand {
        constructor(input?: unknown);
    }
}

// Legacy AWS SDK v2
declare module 'aws-sdk' {
    export class EC2 {
        constructor(config?: unknown);
        describeInstances(): { promise(): Promise<unknown> };
        startInstances(params: unknown): { promise(): Promise<unknown> };
        stopInstances(params: unknown): { promise(): Promise<unknown> };
    }
    export class S3 {
        constructor(config?: unknown);
        listBuckets(): { promise(): Promise<unknown> };
        listObjects(params: unknown): { promise(): Promise<unknown> };
        getObject(params: unknown): { promise(): Promise<unknown> };
        putObject(params: unknown): { promise(): Promise<unknown> };
    }
    export class Lambda {
        constructor(config?: unknown);
        listFunctions(): { promise(): Promise<unknown> };
        invoke(params: unknown): { promise(): Promise<unknown> };
    }
}

// Azure SDKs
declare module '@azure/identity' {
    export class DefaultAzureCredential {
        constructor();
        getToken(scopes: string | string[]): Promise<{ token: string; expiresOnTimestamp: number }>;
    }
    export class ClientSecretCredential {
        constructor(tenantId: string, clientId: string, clientSecret: string);
    }
}

declare module '@azure/arm-resources' {
    export class ResourceManagementClient {
        constructor(credentials: unknown, subscriptionId: string);
        resources: {
            list(): AsyncIterable<unknown>;
            beginDeleteAndWait(resourceGroupName: string, resourceProviderNamespace: string, parentResourcePath: string, resourceType: string, resourceName: string): Promise<void>;
        };
        resourceGroups: {
            get(resourceGroupName: string): Promise<unknown>;
            createOrUpdate(resourceGroupName: string, parameters: unknown): Promise<unknown>;
            beginDeleteAndWait(resourceGroupName: string): Promise<void>;
        };
    }
}

// Google Cloud SDKs
declare module 'google-auth-library' {
    export class GoogleAuth {
        constructor(options?: unknown);
        getClient(): Promise<{ getProjectId(): Promise<string> }>;
    }
    export class OAuth2Client {
        constructor(clientId?: string, clientSecret?: string, redirectUri?: string);
        generateAuthUrl(options: unknown): string;
        getToken(code: string): Promise<{ tokens: unknown }>;
        setCredentials(tokens: unknown): void;
        refreshAccessToken(): Promise<{ credentials: unknown }>;
    }
}

declare module '@google-cloud/compute' {
    export class Compute {
        constructor();
        zone(name: string): {
            getVMs(): Promise<[unknown[]]>;
        };
    }
}

declare module '@google-cloud/storage' {
    export class Storage {
        constructor();
        createBucket(name: string): Promise<void>;
        getBuckets(): Promise<[unknown[]]>;
    }
}

// GitHub SDK
declare module '@octokit/rest' {
    export class Octokit {
        constructor(options?: { auth?: string });
        users: {
            getByUsername(params: { username: string }): Promise<{ data: unknown }>;
        };
        repos: {
            listForUser(params: { username: string }): Promise<{ data: unknown[] }>;
            createForAuthenticatedUser(params: unknown): Promise<{ data: unknown }>;
            delete(params: { owner: string; repo: string }): Promise<void>;
        };
    }
}

// Kubernetes SDK
declare module '@kubernetes/client-node' {
    export class KubeConfig {
        constructor();
        loadFromDefault(): void;
        makeApiClient<T>(apiType: new () => T): T;
    }
    export class CoreV1Api {
        listNamespacedPod(namespace: string): Promise<{ body: unknown }>;
        readNamespacedPod(name: string, namespace: string): Promise<{ body: unknown }>;
        createNamespacedPod(namespace: string, body: unknown): Promise<{ body: unknown }>;
        deleteNamespacedPod(name: string, namespace: string): Promise<{ body: unknown }>;
    }
    export class AppsV1Api {
        listNamespacedDeployment(namespace: string): Promise<{ body: unknown }>;
        createNamespacedDeployment(namespace: string, body: unknown): Promise<{ body: unknown }>;
        deleteNamespacedDeployment(name: string, namespace: string): Promise<{ body: unknown }>;
    }
}

// Docker SDK
declare module 'dockerode' {
    export default class Docker {
        constructor(options?: unknown);
        listContainers(options?: unknown): Promise<unknown[]>;
        listImages(options?: unknown): Promise<unknown[]>;
        listVolumes(options?: unknown): Promise<{ Volumes: unknown[] }>;
        listNetworks(options?: unknown): Promise<unknown[]>;
        getContainer(id: string): Container;
        getImage(name: string): Image;
        createContainer(options: unknown): Promise<Container>;
        pull(repoTag: string, options?: unknown): Promise<unknown>;
        buildImage(tarStream: unknown, options: unknown): Promise<unknown>;
    }
    export interface Container {
        start(): Promise<void>;
        stop(): Promise<void>;
        remove(): Promise<void>;
        inspect(): Promise<unknown>;
        logs(options?: unknown): Promise<unknown>;
        exec(options: unknown): Promise<Exec>;
    }
    export interface Image {
        remove(): Promise<void>;
        inspect(): Promise<unknown>;
        tag(options: unknown): Promise<void>;
        push(options?: unknown): Promise<unknown>;
    }
    export interface Exec {
        start(options?: unknown): Promise<unknown>;
    }
}

// Application Insights
declare module 'applicationinsights' {
    export class TelemetryClient {
        constructor(instrumentationKey?: string);
        trackEvent(telemetry: { name: string; properties?: Record<string, string> }): void;
        trackException(telemetry: { exception: Error }): void;
        trackMetric(telemetry: { name: string; value: number; properties?: Record<string, string> }): void;
        trackTrace(telemetry: { message: string; properties?: Record<string, string> }): void;
        flush(): void;
    }
}
