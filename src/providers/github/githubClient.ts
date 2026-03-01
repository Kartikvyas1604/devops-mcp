import { Octokit } from '@octokit/rest';

export class GitHubClient {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    async getUser(username: string) {
        try {
            const response = await this.octokit.users.getByUsername({ username });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch user: ${error.message}`);
        }
    }

    async listRepos(username: string) {
        try {
            const response = await this.octokit.repos.listForUser({ username });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to list repositories: ${error.message}`);
        }
    }

    async createRepo(repoName: string, options: any) {
        try {
            const response = await this.octokit.repos.createForAuthenticatedUser({
                name: repoName,
                ...options,
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create repository: ${error.message}`);
        }
    }

    async deleteRepo(owner: string, repo: string) {
        try {
            await this.octokit.repos.delete({
                owner,
                repo,
            });
        } catch (error) {
            throw new Error(`Failed to delete repository: ${error.message}`);
        }
    }

    // Additional GitHub API methods can be added here
}