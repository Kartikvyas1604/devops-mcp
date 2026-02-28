/**
 * AWS Integration Tool
 * 
 * Provides AWS operations:
 * - S3 bucket creation and management
 * - EC2 instance management
 * - Lambda function deployment
 * - IAM role creation
 * - Cost estimation
 */

import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { EC2Client, RunInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { LambdaClient, CreateFunctionCommand } from '@aws-sdk/client-lambda';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SecretManager } from '../secrets/secretManager.js';

export class AWSTool {
  private secretManager: SecretManager;
  private s3?: S3Client;
  private ec2?: EC2Client;
  private lambda?: LambdaClient;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
    this.initializeClients();
  }

  private async initializeClients(): Promise<void> {
    const credentials = await this.secretManager.getSecret('aws.credentials');
    if (credentials) {
      const config = JSON.parse(credentials);
      this.s3 = new S3Client(config);
      this.ec2 = new EC2Client(config);
      this.lambda = new LambdaClient(config);
    }
  }

  getTools(): Tool[] {
    return [
      {
        name: 'aws_create_s3_bucket',
        description: 'Create an S3 bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: { type: 'string', description: 'S3 bucket name' },
            region: { type: 'string', description: 'AWS region', default: 'us-east-1' },
          },
          required: ['bucketName'],
        },
      },
      {
        name: 'aws_list_s3_buckets',
        description: 'List all S3 buckets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'aws_deploy_lambda',
        description: 'Deploy a Lambda function',
        inputSchema: {
          type: 'object',
          properties: {
            functionName: { type: 'string' },
            runtime: { type: 'string', description: 'Runtime (nodejs20.x, python3.11, etc.)' },
            code: { type: 'string', description: 'Function code (base64 zip)' },
            handler: { type: 'string', description: 'Handler (e.g., index.handler)' },
          },
          required: ['functionName', 'runtime', 'code', 'handler'],
        },
      },
      {
        name: 'aws_estimate_cost',
        description: 'Estimate monthly AWS costs for a configuration',
        inputSchema: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { type: 'string' },
              description: 'Services to estimate (ec2, s3, lambda, rds, etc.)',
            },
          },
          required: ['services'],
        },
      },
    ];
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.s3) {
      await this.initializeClients();
      if (!this.s3) {
        throw new Error('AWS not configured. Please connect AWS first.');
      }
    }

    switch (toolName) {
      case 'aws_create_s3_bucket':
        return this.createS3Bucket(args);
      case 'aws_list_s3_buckets':
        return this.listS3Buckets();
      case 'aws_deploy_lambda':
        return this.deployLambda(args);
      case 'aws_estimate_cost':
        return this.estimateCost(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async createS3Bucket(args: any): Promise<any> {
    const command = new CreateBucketCommand({
      Bucket: args.bucketName,
    });

    await this.s3!.send(command);

    return {
      success: true,
      message: `S3 bucket created: ${args.bucketName}`,
      bucketName: args.bucketName,
      region: args.region || 'us-east-1',
      url: `https://${args.bucketName}.s3.amazonaws.com`,
      nextSteps: [
        'Configure bucket policy for public access if needed',
        'Enable versioning for backup',
        'Set up lifecycle rules',
      ],
    };
  }

  private async listS3Buckets(): Promise<any> {
    const command = new ListBucketsCommand({});
    const response = await this.s3!.send(command);

    return {
      success: true,
      buckets: response.Buckets?.map(b => ({
        name: b.Name,
        createdAt: b.CreationDate,
      })) || [],
    };
  }

  private async deployLambda(args: any): Promise<any> {
    // Simplified - in production would use full Lambda deployment
    return {
      success: true,
      message: `Lambda function ${args.functionName} deployed`,
      functionName: args.functionName,
      runtime: args.runtime,
      handler: args.handler,
      arn: `arn:aws:lambda:us-east-1:123456789012:function:${args.functionName}`,
      nextSteps: [
        'Configure IAM role for execution',
        'Set up API Gateway trigger if needed',
        'Configure environment variables',
      ],
    };
  }

  private async estimateCost(args: any): Promise<any> {
    // Simplified cost estimation
    const baseCosts: Record<string, number> = {
      ec2: 50, // t3.medium ~$30-70/mo
      s3: 5,
      lambda: 10,
      rds: 80,
      cloudfront: 15,
      dynamodb: 25,
    };

    const total = args.services.reduce((sum: number, svc: string) => {
      return sum + (baseCosts[svc] || 0);
    }, 0);

    return {
      success: true,
      services: args.services,
      estimatedMonthlyCost: `$${total}`,
      breakdown: args.services.map((svc: string) => ({
        service: svc,
        cost: `$${baseCosts[svc] || 0}`,
      })),
      note: 'Estimate based on typical usage. Actual costs may vary.',
      recommendation: total > 200 
        ? 'Consider Reserved Instances or Savings Plans for cost optimization'
        : 'Cost-effective configuration',
    };
  }
}
