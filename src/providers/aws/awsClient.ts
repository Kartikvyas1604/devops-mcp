import AWS from 'aws-sdk';

class AWSClient {
    private readonly ec2: AWS.EC2;
    private readonly s3: AWS.S3;
    private readonly lambda: AWS.Lambda;

    constructor() {
        this.ec2 = new AWS.EC2();
        this.s3 = new AWS.S3();
        this.lambda = new AWS.Lambda();
    }

    // EC2 Methods
    public async listInstances(): Promise<AWS.EC2.Instance[]> {
        const result = await this.ec2.describeInstances().promise();
        return result.Reservations?.flatMap(reservation => reservation.Instances) || [];
    }

    public async startInstance(instanceId: string): Promise<AWS.EC2.StartInstancesResult> {
        return this.ec2.startInstances({ InstanceIds: [instanceId] }).promise();
    }

    public async stopInstance(instanceId: string): Promise<AWS.EC2.StopInstancesResult> {
        return this.ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
    }

    // S3 Methods
    public async listBuckets(): Promise<AWS.S3.Bucket[]> {
        const result = await this.s3.listBuckets().promise();
        return result.Buckets || [];
    }

    public async uploadFile(bucketName: string, key: string, body: Buffer | string): Promise<AWS.S3.PutObjectOutput> {
        return this.s3.upload({ Bucket: bucketName, Key: key, Body: body }).promise();
    }

    // Lambda Methods
    public async invokeFunction(functionName: string, payload: any): Promise<AWS.Lambda.InvocationResponse> {
        return this.lambda.invoke({
            FunctionName: functionName,
            Payload: JSON.stringify(payload),
        }).promise();
    }
}

export default AWSClient;