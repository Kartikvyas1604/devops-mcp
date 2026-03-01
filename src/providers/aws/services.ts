import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";

export class AWSService {
    private ec2Client: EC2Client;
    private s3Client: S3Client;
    private lambdaClient: LambdaClient;

    constructor() {
        this.ec2Client = new EC2Client({});
        this.s3Client = new S3Client({});
        this.lambdaClient = new LambdaClient({});
    }

    async listEC2Instances() {
        const command = new DescribeInstancesCommand({});
        const response = await this.ec2Client.send(command);
        return response.Reservations?.flatMap(reservation => reservation.Instances) || [];
    }

    async listS3Buckets() {
        const command = new ListBucketsCommand({});
        const response = await this.s3Client.send(command);
        return response.Buckets || [];
    }

    async listLambdaFunctions() {
        const command = new ListFunctionsCommand({});
        const response = await this.lambdaClient.send(command);
        return response.Functions || [];
    }
}