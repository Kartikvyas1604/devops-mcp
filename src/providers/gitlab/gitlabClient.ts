/**
 * GitLab Client - Wrapper for GitLab API operations
 * Uses native fetch API
 */

export interface GitLabProject {
    id?: number;
    name?: string;
    path?: string;
    visibility?: string;
}

export interface GitLabMergeRequest {
    id?: number;
    iid?: number;
    title?: string;
    state?: string;
}

export class GitLabClient {
    private baseUrl: string;
    private token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    private async request<T = unknown>(method: string, endpoint: string, data?: Record<string, unknown>): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Private-Token': this.token,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<T>;
    }

    public async getProjects(): Promise<GitLabProject[]> {
        return this.request<GitLabProject[]>('GET', '/api/v4/projects');
    }

    public async createProject(projectData: Record<string, unknown>): Promise<GitLabProject> {
        return this.request<GitLabProject>('POST', '/api/v4/projects', projectData);
    }

    public async getProject(projectId: number): Promise<GitLabProject> {
        return this.request<GitLabProject>('GET', `/api/v4/projects/${projectId}`);
    }

    public async updateProject(projectId: number, projectData: Record<string, unknown>): Promise<GitLabProject> {
        return this.request<GitLabProject>('PUT', `/api/v4/projects/${projectId}`, projectData);
    }

    public async deleteProject(projectId: number): Promise<void> {
        await this.request('DELETE', `/api/v4/projects/${projectId}`);
    }

    public async getMergeRequests(projectId: number): Promise<GitLabMergeRequest[]> {
        return this.request<GitLabMergeRequest[]>('GET', `/api/v4/projects/${projectId}/merge_requests`);
    }

    public async createMergeRequest(projectId: number, mergeRequestData: Record<string, unknown>): Promise<GitLabMergeRequest> {
        return this.request<GitLabMergeRequest>('POST', `/api/v4/projects/${projectId}/merge_requests`, mergeRequestData);
    }
}