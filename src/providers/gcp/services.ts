import { GCPClient } from './gcpClient';

export const createGCPProject = async (projectName: string) => {
    const client = new GCPClient();
    return await client.createProject(projectName);
};

export const deployGCPFunction = async (functionName: string, sourceCode: string) => {
    const client = new GCPClient();
    return await client.deployFunction(functionName, sourceCode);
};

export const listGCPProjects = async () => {
    const client = new GCPClient();
    return await client.listProjects();
};

export const deleteGCPProject = async (projectId: string) => {
    const client = new GCPClient();
    return await client.deleteProject(projectId);
};

// Additional GCP service-related functions can be added here as needed.