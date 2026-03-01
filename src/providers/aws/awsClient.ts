/**
 * AWS Client - Wrapper for AWS SDK operations
 * Note: Requires aws-sdk package to be installed for full functionality
 */

// Type definitions for AWS responses (stub types when SDK not installed)
export interface EC2Instance {
    InstanceId?: string;
    InstanceType?: string;
    State?: { Name?: string };
    Tags?: Array<{ Key?: string; Value?: string }>;
}

export interface S3Bucket {
    Name?: string;
    CreationDate?: Date;
}

export interface LambdaInvocationResponse {
    StatusCode?: number;
    Payload?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AWSModule = any;

class AwsClient {
    private ec2: unknown;
    private s3: unknown;
    private lambda: unknown;
    private initialized = false;

    constructor() {
        this.initializeClients();
    }

    private async initializeClients(): Promise<void> {
        try {
            // Dynamically import AWS SDK if available
            const AWS: AWSModule = await import('aws-sdk').catch(() => null);
            if (AWS) {
                this.ec2 = new AWS.default.EC2();
                this.s3 = new AWS.default.S3();
                this.lambda = new AWS.default.Lambda();
                this.initialized = true;
            }
        } catch {
            console.warn('AWS SDK not available. AWS operations will be stubbed.');
        }
    }

    // EC2 Methods
    public async listInstances(): Promise<EC2Instance[]> {
        if (!this.initialized || !this.ec2) {
            console.warn('AWS SDK not initialized');
            return [];
        }
        const ec2 = this.ec2 as { describeInstances: () => { promise: () => Promise<{ Reservations?: Array<{ Instances?: EC2Instance[] }> }> } };
        const result = await ec2.describeInstances().promise();
        return result.Reservations?.flatMap((r: { Instances?: EC2Instance[] }) => r.Instances ?? []) ?? [];
    }

    public async startInstance(instanceId: string): Promise<unknown> {
        if (!this.initialized || !this.ec2) {
            throw new Error('AWS SDK not initialized');
        }
        const ec2 = this.ec2 as { startInstances: (params: { InstanceIds: string[] }) => { promise: () => Promise<unknown> } };
        return ec2.startInstances({ InstanceIds: [instanceId] }).promise();
    }

    public async stopInstance(instanceId: string): Promise<unknown> {
        if (!this.initialized || !this.ec2) {
            throw new Error('AWS SDK not initialized');
        }
        const ec2 = this.ec2 as { stopInstances: (params: { InstanceIds: string[] }) => { promise: () => Promise<unknown> } };
        return ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
    }

    // S3 Methods
    public async listBuckets(): Promise<S3Bucket[]> {
        if (!this.initialized || !this.s3) {
            console.warn('AWS SDK not initialized');
            return [];
        }
        const s3 = this.s3 as { listBuckets: () => { promise: () => Promise<{ Buckets?: S3Bucket[] }> } };
        const result = await s3.listBuckets().promise();
        return result.Buckets ?? [];
    }

    public async uploadFile(bucketName: string, key: string, body: Buffer | string): Promise<unknown> {
        if (!this.initialized || !this.s3) {
            throw new Error('AWS SDK not initialized');
        }
        const s3 = this.s3 as { upload: (params: { Bucket: string; Key: string; Body: Buffer | string }) => { promise: () => Promise<unknown> } };
        return s3.upload({ Bucket: bucketName, Key: key, Body: body }).promise();
    }

    // Lambda Methods
    public async invokeFunction(functionName: string, payload: unknown): Promise<LambdaInvocationResponse> {
        if (!this.initialized || !this.lambda) {
            throw new Error('AWS SDK not initialized');
        }
        const lambda = this.lambda as { invoke: (params: { FunctionName: string; Payload: string }) => { promise: () => Promise<LambdaInvocationResponse> } };
        return lambda.invoke({
            FunctionName: functionName,
            Payload: JSON.stringify(payload),
        }).promise();
    }
}

export default AwsClient;
export { AwsClient };