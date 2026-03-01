/**
 * AWS Integration Client
 * 
 * Provides AWS service integration for:
 * - Lambda functions
 * - ECS/Fargate
 * - S3 storage
 * - EC2 instances
 * - CloudWatch logs
 * - ECR (Container Registry)
 */

import * as vscode from 'vscode';
import { SecretsService } from '../services/secretsService';
import { LoggingService } from '../services/loggingService';
import { ConfigService } from '../services/configService';

// AWS SDK v3 imports
import { LambdaClient, ListFunctionsCommand, InvokeCommand, CreateFunctionCommand, UpdateFunctionCodeCommand, GetFunctionCommand, DeleteFunctionCommand } from '@aws-sdk/client-lambda';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand, TerminateInstancesCommand } from '@aws-sdk/client-ec2';
import { ECSClient, ListClustersCommand, ListServicesCommand, DescribeServicesCommand, UpdateServiceCommand, ListTasksCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, GetLogEventsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { ECRClient, DescribeRepositoriesCommand, GetAuthorizationTokenCommand, ListImagesCommand } from '@aws-sdk/client-ecr';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region?: string;
}

export interface LambdaFunction {
  name: string;
  arn: string;
  runtime: string;
  handler: string;
  memorySize: number;
  timeout: number;
  codeSize: number;
  lastModified: string;
  description?: string;
}

export interface S3Bucket {
  name: string;
  creationDate: Date;
  region?: string;
}

export interface EC2Instance {
  instanceId: string;
  name: string;
  instanceType: string;
  state: string;
  publicIp?: string;
  privateIp?: string;
  launchTime: Date;
  platform?: string;
}

export interface ECSCluster {
  name: string;
  arn: string;
  status: string;
  runningTasksCount: number;
  pendingTasksCount: number;
  activeServicesCount: number;
}

export interface ECSService {
  name: string;
  arn: string;
  status: string;
  desiredCount: number;
  runningCount: number;
  pendingCount: number;
  taskDefinition: string;
  launchType: string;
}

export class AWSIntegration {
  private secretsService: SecretsService;
  private configService: ConfigService;
  private logger: LoggingService;
  private region: string = 'us-east-1';
  private credentials: AWSCredentials | null = null;

  // Service clients
  private lambdaClient: LambdaClient | null = null;
  private s3Client: S3Client | null = null;
  private ec2Client: EC2Client | null = null;
  private ecsClient: ECSClient | null = null;
  private logsClient: CloudWatchLogsClient | null = null;
  private ecrClient: ECRClient | null = null;
  private stsClient: STSClient | null = null;

  constructor(secretsService: SecretsService, configService: ConfigService, logger: LoggingService) {
    this.secretsService = secretsService;
    this.configService = configService;
    this.logger = logger;
  }

  async connect(): Promise<boolean> {
    try {
      const creds = await this.secretsService.getCredentials('aws');
      
      if (!creds?.accessKeyId || !creds?.secretAccessKey) {
        this.logger.warn('AWS credentials not found');
        return false;
      }

      this.credentials = {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        region: creds.region || this.configService.get('aws.region') as string || 'us-east-1'
      };

      this.region = this.credentials.region!;

      // Initialize clients
      const clientConfig = {
        region: this.region,
        credentials: {
          accessKeyId: this.credentials.accessKeyId,
          secretAccessKey: this.credentials.secretAccessKey,
          sessionToken: this.credentials.sessionToken
        }
      };

      this.lambdaClient = new LambdaClient(clientConfig);
      this.s3Client = new S3Client(clientConfig);
      this.ec2Client = new EC2Client(clientConfig);
      this.ecsClient = new ECSClient(clientConfig);
      this.logsClient = new CloudWatchLogsClient(clientConfig);
      this.ecrClient = new ECRClient(clientConfig);
      this.stsClient = new STSClient(clientConfig);

      // Verify connection
      const identity = await this.stsClient.send(new GetCallerIdentityCommand({}));
      this.logger.info(`AWS connected as ${identity.Arn}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to AWS', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.lambdaClient = null;
    this.s3Client = null;
    this.ec2Client = null;
    this.ecsClient = null;
    this.logsClient = null;
    this.ecrClient = null;
    this.stsClient = null;
    this.credentials = null;
    this.logger.info('AWS disconnected');
  }

  isConnected(): boolean {
    return this.stsClient !== null;
  }

  getRegion(): string {
    return this.region;
  }

  async setRegion(region: string): Promise<void> {
    this.region = region;
    if (this.isConnected()) {
      await this.connect(); // Reconnect with new region
    }
  }

  // Lambda operations
  async listLambdaFunctions(): Promise<LambdaFunction[]> {
    if (!this.lambdaClient) throw new Error('AWS not connected');

    const functions: LambdaFunction[] = [];
    let nextMarker: string | undefined;

    do {
      const response = await this.lambdaClient.send(new ListFunctionsCommand({
        Marker: nextMarker
      }));

      for (const fn of response.Functions || []) {
        functions.push({
          name: fn.FunctionName!,
          arn: fn.FunctionArn!,
          runtime: fn.Runtime!,
          handler: fn.Handler!,
          memorySize: fn.MemorySize!,
          timeout: fn.Timeout!,
          codeSize: fn.CodeSize!,
          lastModified: fn.LastModified!,
          description: fn.Description
        });
      }

      nextMarker = response.NextMarker;
    } while (nextMarker);

    return functions;
  }

  async getLambdaFunction(name: string): Promise<LambdaFunction | null> {
    if (!this.lambdaClient) throw new Error('AWS not connected');

    try {
      const response = await this.lambdaClient.send(new GetFunctionCommand({
        FunctionName: name
      }));

      const fn = response.Configuration!;
      return {
        name: fn.FunctionName!,
        arn: fn.FunctionArn!,
        runtime: fn.Runtime!,
        handler: fn.Handler!,
        memorySize: fn.MemorySize!,
        timeout: fn.Timeout!,
        codeSize: fn.CodeSize!,
        lastModified: fn.LastModified!,
        description: fn.Description
      };
    } catch (error) {
      return null;
    }
  }

  async invokeLambda(name: string, payload?: object): Promise<{ statusCode: number; result: unknown }> {
    if (!this.lambdaClient) throw new Error('AWS not connected');

    const response = await this.lambdaClient.send(new InvokeCommand({
      FunctionName: name,
      Payload: payload ? Buffer.from(JSON.stringify(payload)) : undefined
    }));

    return {
      statusCode: response.StatusCode!,
      result: response.Payload ? JSON.parse(Buffer.from(response.Payload).toString()) : null
    };
  }

  async updateLambdaCode(name: string, zipFile: Buffer): Promise<void> {
    if (!this.lambdaClient) throw new Error('AWS not connected');

    await this.lambdaClient.send(new UpdateFunctionCodeCommand({
      FunctionName: name,
      ZipFile: zipFile
    }));

    this.logger.info(`Lambda function ${name} code updated`);
  }

  async deleteLambdaFunction(name: string): Promise<void> {
    if (!this.lambdaClient) throw new Error('AWS not connected');

    await this.lambdaClient.send(new DeleteFunctionCommand({
      FunctionName: name
    }));

    this.logger.info(`Lambda function ${name} deleted`);
  }

  // S3 operations
  async listS3Buckets(): Promise<S3Bucket[]> {
    if (!this.s3Client) throw new Error('AWS not connected');

    const response = await this.s3Client.send(new ListBucketsCommand({}));
    
    return (response.Buckets || []).map(bucket => ({
      name: bucket.Name!,
      creationDate: bucket.CreationDate!
    }));
  }

  async listS3Objects(bucket: string, prefix?: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    if (!this.s3Client) throw new Error('AWS not connected');

    const objects: Array<{ key: string; size: number; lastModified: Date }> = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      }));

      for (const obj of response.Contents || []) {
        objects.push({
          key: obj.Key!,
          size: obj.Size!,
          lastModified: obj.LastModified!
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  async uploadToS3(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<void> {
    if (!this.s3Client) throw new Error('AWS not connected');

    await this.s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body) : body,
      ContentType: contentType
    }));

    this.logger.info(`Uploaded ${key} to s3://${bucket}`);
  }

  async downloadFromS3(bucket: string, key: string): Promise<Buffer> {
    if (!this.s3Client) throw new Error('AWS not connected');

    const response = await this.s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    const stream = response.Body as ReadableStream;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  }

  async deleteS3Object(bucket: string, key: string): Promise<void> {
    if (!this.s3Client) throw new Error('AWS not connected');

    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    this.logger.info(`Deleted s3://${bucket}/${key}`);
  }

  async createS3Bucket(name: string): Promise<void> {
    if (!this.s3Client) throw new Error('AWS not connected');

    await this.s3Client.send(new CreateBucketCommand({
      Bucket: name,
      CreateBucketConfiguration: this.region !== 'us-east-1' ? {
        LocationConstraint: this.region as any
      } : undefined
    }));

    this.logger.info(`S3 bucket ${name} created`);
  }

  // EC2 operations
  async listEC2Instances(): Promise<EC2Instance[]> {
    if (!this.ec2Client) throw new Error('AWS not connected');

    const instances: EC2Instance[] = [];

    const response = await this.ec2Client.send(new DescribeInstancesCommand({}));

    for (const reservation of response.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        const nameTag = instance.Tags?.find(t => t.Key === 'Name');
        
        instances.push({
          instanceId: instance.InstanceId!,
          name: nameTag?.Value || instance.InstanceId!,
          instanceType: instance.InstanceType!,
          state: instance.State?.Name!,
          publicIp: instance.PublicIpAddress,
          privateIp: instance.PrivateIpAddress,
          launchTime: instance.LaunchTime!,
          platform: instance.Platform
        });
      }
    }

    return instances;
  }

  async startEC2Instance(instanceId: string): Promise<void> {
    if (!this.ec2Client) throw new Error('AWS not connected');

    await this.ec2Client.send(new StartInstancesCommand({
      InstanceIds: [instanceId]
    }));

    this.logger.info(`EC2 instance ${instanceId} started`);
  }

  async stopEC2Instance(instanceId: string): Promise<void> {
    if (!this.ec2Client) throw new Error('AWS not connected');

    await this.ec2Client.send(new StopInstancesCommand({
      InstanceIds: [instanceId]
    }));

    this.logger.info(`EC2 instance ${instanceId} stopped`);
  }

  async terminateEC2Instance(instanceId: string): Promise<void> {
    if (!this.ec2Client) throw new Error('AWS not connected');

    await this.ec2Client.send(new TerminateInstancesCommand({
      InstanceIds: [instanceId]
    }));

    this.logger.info(`EC2 instance ${instanceId} terminated`);
  }

  // ECS operations
  async listECSClusters(): Promise<string[]> {
    if (!this.ecsClient) throw new Error('AWS not connected');

    const clusters: string[] = [];
    let nextToken: string | undefined;

    do {
      const response = await this.ecsClient.send(new ListClustersCommand({
        nextToken
      }));

      clusters.push(...(response.clusterArns || []));
      nextToken = response.nextToken;
    } while (nextToken);

    return clusters;
  }

  async listECSServices(cluster: string): Promise<ECSService[]> {
    if (!this.ecsClient) throw new Error('AWS not connected');

    const serviceArns: string[] = [];
    let nextToken: string | undefined;

    do {
      const listResponse = await this.ecsClient.send(new ListServicesCommand({
        cluster,
        nextToken
      }));

      serviceArns.push(...(listResponse.serviceArns || []));
      nextToken = listResponse.nextToken;
    } while (nextToken);

    if (serviceArns.length === 0) {
      return [];
    }

    const describeResponse = await this.ecsClient.send(new DescribeServicesCommand({
      cluster,
      services: serviceArns
    }));

    return (describeResponse.services || []).map(svc => ({
      name: svc.serviceName!,
      arn: svc.serviceArn!,
      status: svc.status!,
      desiredCount: svc.desiredCount!,
      runningCount: svc.runningCount!,
      pendingCount: svc.pendingCount!,
      taskDefinition: svc.taskDefinition!,
      launchType: svc.launchType!
    }));
  }

  async scaleECSService(cluster: string, service: string, desiredCount: number): Promise<void> {
    if (!this.ecsClient) throw new Error('AWS not connected');

    await this.ecsClient.send(new UpdateServiceCommand({
      cluster,
      service,
      desiredCount
    }));

    this.logger.info(`ECS service ${service} scaled to ${desiredCount}`);
  }

  // CloudWatch Logs operations
  async listLogGroups(prefix?: string): Promise<Array<{ name: string; storedBytes: number; creationTime: number }>> {
    if (!this.logsClient) throw new Error('AWS not connected');

    const logGroups: Array<{ name: string; storedBytes: number; creationTime: number }> = [];
    let nextToken: string | undefined;

    do {
      const response = await this.logsClient.send(new DescribeLogGroupsCommand({
        logGroupNamePrefix: prefix,
        nextToken
      }));

      for (const group of response.logGroups || []) {
        logGroups.push({
          name: group.logGroupName!,
          storedBytes: group.storedBytes || 0,
          creationTime: group.creationTime || 0
        });
      }

      nextToken = response.nextToken;
    } while (nextToken);

    return logGroups;
  }

  async getLogs(logGroup: string, logStream?: string, options: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    filterPattern?: string;
  } = {}): Promise<Array<{ timestamp: number; message: string }>> {
    if (!this.logsClient) throw new Error('AWS not connected');

    if (options.filterPattern) {
      const response = await this.logsClient.send(new FilterLogEventsCommand({
        logGroupName: logGroup,
        logStreamNames: logStream ? [logStream] : undefined,
        startTime: options.startTime,
        endTime: options.endTime,
        limit: options.limit || 100,
        filterPattern: options.filterPattern
      }));

      return (response.events || []).map(e => ({
        timestamp: e.timestamp!,
        message: e.message!
      }));
    }

    if (!logStream) {
      throw new Error('logStream is required when not using filterPattern');
    }

    const response = await this.logsClient.send(new GetLogEventsCommand({
      logGroupName: logGroup,
      logStreamName: logStream,
      startTime: options.startTime,
      endTime: options.endTime,
      limit: options.limit || 100
    }));

    return (response.events || []).map(e => ({
      timestamp: e.timestamp!,
      message: e.message!
    }));
  }

  // ECR operations
  async listECRRepositories(): Promise<Array<{ name: string; uri: string; createdAt: Date }>> {
    if (!this.ecrClient) throw new Error('AWS not connected');

    const repos: Array<{ name: string; uri: string; createdAt: Date }> = [];
    let nextToken: string | undefined;

    do {
      const response = await this.ecrClient.send(new DescribeRepositoriesCommand({
        nextToken
      }));

      for (const repo of response.repositories || []) {
        repos.push({
          name: repo.repositoryName!,
          uri: repo.repositoryUri!,
          createdAt: repo.createdAt!
        });
      }

      nextToken = response.nextToken;
    } while (nextToken);

    return repos;
  }

  async getECRAuthToken(): Promise<{ username: string; password: string; proxyEndpoint: string }> {
    if (!this.ecrClient) throw new Error('AWS not connected');

    const response = await this.ecrClient.send(new GetAuthorizationTokenCommand({}));
    const authData = response.authorizationData?.[0];

    if (!authData) {
      throw new Error('Failed to get ECR authorization token');
    }

    const token = Buffer.from(authData.authorizationToken!, 'base64').toString();
    const [username, password] = token.split(':');

    return {
      username,
      password,
      proxyEndpoint: authData.proxyEndpoint!
    };
  }

  async listECRImages(repository: string): Promise<Array<{ imageTag: string; digest: string; pushedAt: Date }>> {
    if (!this.ecrClient) throw new Error('AWS not connected');

    const images: Array<{ imageTag: string; digest: string; pushedAt: Date }> = [];
    let nextToken: string | undefined;

    do {
      const response = await this.ecrClient.send(new ListImagesCommand({
        repositoryName: repository,
        nextToken
      }));

      for (const img of response.imageIds || []) {
        if (img.imageTag) {
          images.push({
            imageTag: img.imageTag,
            digest: img.imageDigest!,
            pushedAt: new Date() // Would need describe-images for actual date
          });
        }
      }

      nextToken = response.nextToken;
    } while (nextToken);

    return images;
  }
}
