import axios from 'axios';

export class GitLabClient {
    private baseUrl: string;
    private token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    private async request(method: string, endpoint: string, data?: any) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Private-Token': this.token,
            'Content-Type': 'application/json',
        };

        const response = await axios({
            method,
            url,
            headers,
            data,
        });

        return response.data;
    }

    public async getProjects() {
        return this.request('GET', '/api/v4/projects');
    }

    public async createProject(projectData: any) {
        return this.request('POST', '/api/v4/projects', projectData);
    }

    public async getProject(projectId: number) {
        return this.request('GET', `/api/v4/projects/${projectId}`);
    }

    public async updateProject(projectId: number, projectData: any) {
        return this.request('PUT', `/api/v4/projects/${projectId}`, projectData);
    }

    public async deleteProject(projectId: number) {
        return this.request('DELETE', `/api/v4/projects/${projectId}`);
    }

    public async getMergeRequests(projectId: number) {
        return this.request('GET', `/api/v4/projects/${projectId}/merge_requests`);
    }

    public async createMergeRequest(projectId: number, mergeRequestData: any) {
        return this.request('POST', `/api/v4/projects/${projectId}/merge_requests`, mergeRequestData);
    }
}