import * as vscode from 'vscode';

export type SecretKey =
	| 'models.anthropic.apiKey'
	| 'models.openai.apiKey'
	| 'models.gemini.apiKey'
	| 'models.mistral.apiKey'
	| 'models.perplexity.apiKey'
	| 'github.token'
	| 'docker.registryCredentials'
	| 'aws.credentials'
	| 'slack.token'
	| 'jira.token'
	| 'gcp.credentials'
	| 'azure.credentials'
	| 'kubernetes.kubeconfig';

/**
 * Thin wrapper around VS Code SecretStorage that provides
 * type-safe, namespaced access to secrets.
 */
export class SecretStorageFacade {
	private readonly storage: vscode.SecretStorage;
	private readonly prefix = 'genie-ops/';

	public constructor(storage: vscode.SecretStorage) {
		this.storage = storage;
	}

	private toKey(key: SecretKey): string {
		return `${this.prefix}${key}`;
	}

	public async getSecret(key: SecretKey): Promise<string | undefined> {
		return this.storage.get(this.toKey(key));
	}

	public async storeSecret(key: SecretKey, value: string): Promise<void> {
		await this.storage.store(this.toKey(key), value);
	}

	public async deleteSecret(key: SecretKey): Promise<void> {
		await this.storage.delete(this.toKey(key));
	}
}

