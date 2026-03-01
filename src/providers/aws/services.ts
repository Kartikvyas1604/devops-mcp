/**
 * AWS Service - High-level AWS operations wrapper
 * Note: Requires @aws-sdk/* packages for full functionality
 */

export interface EC2Instance {
    InstanceId?: string;
    InstanceType?: string;
    State?: { Name?: string };
}

export interface S3Bucket {
    Name?: string;
    CreationDate?: Date;
}

export interface LambdaFunction {
    FunctionName?: string;
    Runtime?: string;
    Handler?: string;
}

export class AWSService {
    private ec2Client: unknown;
    private s3Client: unknown;
    private lambdaClient: unknown;
    private initialized = false;

    constructor() {
        this.initializeClients();
    }

    private async initializeClients(): Promise<void> {
        try {
            const [ec2Module, s3Module, lambdaModule] = await Promise.all([
                import('@aws-sdk/client-ec2').catch(() => null),
                import('@aws-sdk/client-s3').catch(() => null),
                import('@aws-sdk/client-lambda').catch(() => null)
            ]);

            if (ec2Module && s3Module && lambdaModule) {
                this.ec2Client = new ec2Module.EC2Client({});
                this.s3Client = new s3Module.S3Client({});
                this.lambdaClient = new lambdaModule.LambdaClient({});
                this.initialized = true;
            }
        } catch {
            console.warn('AWS SDK not available. AWS operations will be stubbed.');
        }
    }

    async listEC2Instances(): Promise<EC2Instance[]> {
        if (!this.initialized) {
            console.warn('AWS SDK not initialized');
            return [];
        }
        try {
            const ec2Module = await import('@aws-sdk/client-ec2');
            const client = this.ec2Client as { send: (cmd: unknown) => Promise<{ Reservations?: { Instances?: EC2Instance[] }[] }> };
            const command = new ec2Module.DescribeInstancesCommand({});
            const response = await client.send(command);
            return response.Reservations?.flatMap(reservation => reservation.Instances || []) || [];
        } catch {
            return [];
        }
    }

    async listS3Buckets(): Promise<S3Bucket[]> {
        if (!this.initialized) {
            console.warn('AWS SDK not initialized');
            return [];
        }
        try {
            const s3Module = await import('@aws-sdk/client-s3');
            const client = this.s3Client as { send: (cmd: unknown) => Promise<{ Buckets?: S3Bucket[] }> };
            const command = new s3Module.ListBucketsCommand({});
            const response = await client.send(command);
            return response.Buckets || [];
        } catch {
            return [];
        }
    }

    async listLambdaFunctions(): Promise<LambdaFunction[]> {
        if (!this.initialized) {
            console.warn('AWS SDK not initialized');
            return [];
        }
        try {
            const lambdaModule = await import('@aws-sdk/client-lambda');
            const client = this.lambdaClient as { send: (cmd: unknown) => Promise<{ Functions?: LambdaFunction[] }> };
            const command = new lambdaModule.ListFunctionsCommand({});
            const response = await client.send(command);
            return response.Functions || [];
        } catch {
            return [];
        }
    }
}