import { GoogleAuth } from 'google-auth-library';
import { Compute } from '@google-cloud/compute';
import { Storage } from '@google-cloud/storage';

export class GCPClient {
    private auth: GoogleAuth;
    private compute: Compute;
    private storage: Storage;

    constructor() {
        this.auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        this.compute = new Compute();
        this.storage = new Storage();
    }

    async getProjectId(): Promise<string> {
        const client = await this.auth.getClient();
        const projectId = await client.getProjectId();
        return projectId;
    }

    async listInstances(zone: string): Promise<any[]> {
        const [vms] = await this.compute.zone(zone).getVMs();
        return vms;
    }

    async createBucket(bucketName: string): Promise<void> {
        await this.storage.createBucket(bucketName);
    }

    async listBuckets(): Promise<any[]> {
        const [buckets] = await this.storage.getBuckets();
        return buckets;
    }

    // Additional methods for other GCP services can be added here
}