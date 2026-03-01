/**
 * GCP Services - High-level GCP operations wrapper
 */

import { GCPClient, GCPInstance, GCPBucket } from './gcpClient';

export const getGCPProjectId = async (): Promise<string> => {
    const client = new GCPClient();
    return await client.getProjectId();
};

export const listGCPInstances = async (zone: string): Promise<GCPInstance[]> => {
    const client = new GCPClient();
    return await client.listInstances(zone);
};

export const listGCPBuckets = async (): Promise<GCPBucket[]> => {
    const client = new GCPClient();
    return await client.listBuckets();
};

export const createGCPBucket = async (bucketName: string): Promise<void> => {
    const client = new GCPClient();
    return await client.createBucket(bucketName);
};