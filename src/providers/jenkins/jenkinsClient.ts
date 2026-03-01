import axios from 'axios';

export class JenkinsClient {
    private baseUrl: string;
    private auth: { username: string; apiToken: string };

    constructor(baseUrl: string, username: string, apiToken: string) {
        this.baseUrl = baseUrl;
        this.auth = { username, apiToken };
    }

    private async request(method: string, endpoint: string, data?: any) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await axios({
            method,
            url,
            auth: this.auth,
            data,
        });
        return response.data;
    }

    public async getJob(jobName: string) {
        return this.request('GET', `/job/${jobName}/api/json`);
    }

    public async buildJob(jobName: string) {
        return this.request('POST', `/job/${jobName}/build`);
    }

    public async getBuildStatus(jobName: string, buildNumber: number) {
        return this.request('GET', `/job/${jobName}/${buildNumber}/api/json`);
    }

    public async getAllJobs() {
        return this.request('GET', '/api/json?tree=jobs[name,color]');
    }
}