/**
 * GitHub Client - Wrapper for GitHub API operations
 * Note: Requires @octokit/rest package for full functionality
 */

export interface GitHubUser {
    login?: string;
    id?: number;
    name?: string;
}

export interface GitHubRepo {
    id?: number;
    name?: string;
    full_name?: string;
    private?: boolean;
}

export class GitHubClient {
    private octokit: unknown;
    private initialized = false;

    constructor(token?: string) {
        this.initializeClient(token);
    }

    private async initializeClient(token?: string): Promise<void> {
        try {
            const octokitModule = await import('@octokit/rest').catch(() => null);
            if (octokitModule) {
                this.octokit = new octokitModule.Octokit({ auth: token });
                this.initialized = true;
            }
        } catch {
            console.warn('Octokit not available. GitHub operations will be stubbed.');
        }
    }

    async getUser(username: string): Promise<GitHubUser | null> {
        if (!this.initialized || !this.octokit) {
            return null;
        }
        try {
            const octokit = this.octokit as { users: { getByUsername: (params: { username: string }) => Promise<{ data: GitHubUser }> } };
            const response = await octokit.users.getByUsername({ username });
            return response.data;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch user: ${message}`);
        }
    }

    async listRepos(username: string): Promise<GitHubRepo[]> {
        if (!this.initialized || !this.octokit) {
            return [];
        }
        try {
            const octokit = this.octokit as { repos: { listForUser: (params: { username: string }) => Promise<{ data: GitHubRepo[] }> } };
            const response = await octokit.repos.listForUser({ username });
            return response.data;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list repositories: ${message}`);
        }
    }

    async createRepo(repoName: string, options?: Record<string, unknown>): Promise<GitHubRepo | null> {
        if (!this.initialized || !this.octokit) {
            throw new Error('Octokit not initialized');
        }
        try {
            const octokit = this.octokit as { repos: { createForAuthenticatedUser: (params: { name: string } & Record<string, unknown>) => Promise<{ data: GitHubRepo }> } };
            const response = await octokit.repos.createForAuthenticatedUser({
                name: repoName,
                ...options,
            });
            return response.data;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create repository: ${message}`);
        }
    }

    async deleteRepo(owner: string, repo: string): Promise<void> {
        if (!this.initialized || !this.octokit) {
            throw new Error('Octokit not initialized');
        }
        try {
            const octokit = this.octokit as { repos: { delete: (params: { owner: string; repo: string }) => Promise<void> } };
            await octokit.repos.delete({ owner, repo });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete repository: ${message}`);
        }
    }
}