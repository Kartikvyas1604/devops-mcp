/**
 * Jenkins Client - Wrapper for Jenkins API operations
 * Uses native fetch API with Basic auth
 */

export interface JenkinsJob {
    name?: string;
    color?: string;
    url?: string;
}

export interface JenkinsBuild {
    number?: number;
    result?: string;
    building?: boolean;
}

export interface JenkinsJobsResponse {
    jobs?: JenkinsJob[];
}

export class JenkinsClient {
    private baseUrl: string;
    private authHeader: string;

    constructor(baseUrl: string, username: string, apiToken: string) {
        this.baseUrl = baseUrl;
        this.authHeader = 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64');
    }

    private async request<T = unknown>(method: string, endpoint: string, data?: Record<string, unknown>): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Jenkins API error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) as T : {} as T;
    }

    public async getJob(jobName: string): Promise<JenkinsJob> {
        return this.request<JenkinsJob>('GET', `/job/${jobName}/api/json`);
    }

    public async buildJob(jobName: string): Promise<void> {
        await this.request('POST', `/job/${jobName}/build`);
    }

    public async getBuildStatus(jobName: string, buildNumber: number): Promise<JenkinsBuild> {
        return this.request<JenkinsBuild>('GET', `/job/${jobName}/${buildNumber}/api/json`);
    }

    public async getAllJobs(): Promise<JenkinsJobsResponse> {
        return this.request<JenkinsJobsResponse>('GET', '/api/json?tree=jobs[name,color]');
    }
}