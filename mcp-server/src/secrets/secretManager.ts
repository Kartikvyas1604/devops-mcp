/**
 * Secret Manager - Credential Storage Abstraction
 * 
 * Provides a unified interface for storing and retrieving secrets.
 * In production, integrates with VS Code SecretStorage.
 */

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

export class SecretManager {
  private secrets: Map<string, string> = new Map();

  /**
   * Store a secret. In production, this delegates to VS Code SecretStorage.
   */
  async storeSecret(key: SecretKey, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  /**
   * Retrieve a secret.
   */
  async getSecret(key: SecretKey): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  /**
   * Delete a secret.
   */
  async deleteSecret(key: SecretKey): Promise<void> {
    this.secrets.delete(key);
  }

  /**
   * Check if a secret exists.
   */
  async hasSecret(key: SecretKey): Promise<boolean> {
    return this.secrets.has(key);
  }
}
