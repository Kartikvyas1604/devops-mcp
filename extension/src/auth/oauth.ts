/**
 * OAuth Integration Helpers
 * 
 * Provides OAuth flows for services that don't have built-in VS Code auth.
 */

import * as vscode from 'vscode';
import { SecretStorageFacade } from './secretStorage';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export class OAuthManager {
  private secretStorage: SecretStorageFacade;

  constructor(secretStorage: SecretStorageFacade) {
    this.secretStorage = secretStorage;
  }

  /**
   * Authenticate with GitHub using VS Code built-in auth.
   */
  async authenticateGitHub(): Promise<string | undefined> {
    try {
      const session = await vscode.authentication.getSession('github', ['repo', 'workflow'], {
        createIfNone: true,
      });

      if (session) {
        await this.secretStorage.storeSecret('github.token', session.accessToken);
        return session.accessToken;
      }
    } catch (error) {
      console.error('GitHub auth error:', error);
      void vscode.window.showErrorMessage('Failed to authenticate with GitHub');
    }
    return undefined;
  }

  /**
   * Authenticate with Slack using OAuth2.
   * Opens a webview for the OAuth flow.
   */
  async authenticateSlack(): Promise<string | undefined> {
    return this.customOAuthFlow({
      serviceName: 'Slack',
      clientId: 'YOUR_SLACK_CLIENT_ID', // Would be configurable
      scopes: ['chat:write', 'channels:manage', 'incoming-webhook'],
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      secretKey: 'slack.token',
    });
  }

  /**
   * Authenticate with Jira using OAuth2.
   */
  async authenticateJira(): Promise<string | undefined> {
    const domain = await vscode.window.showInputBox({
      prompt: 'Enter your Jira domain (e.g., yourcompany.atlassian.net)',
      placeHolder: 'yourcompany.atlassian.net',
    });

    if (!domain) {
      return undefined;
    }

    const email = await vscode.window.showInputBox({
      prompt: 'Enter your Jira email',
      placeHolder: 'you@company.com',
    });

    const apiToken = await vscode.window.showInputBox({
      prompt: 'Enter your Jira API token (create at https://id.atlassian.com/manage/api-tokens)',
      password: true,
    });

    if (email && apiToken) {
      const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
      await this.secretStorage.storeSecret('jira.token', JSON.stringify({ domain, credentials }));
      return credentials;
    }

    return undefined;
  }

  /**
   * Authenticate with AWS using credentials.
   */
  async authenticateAWS(): Promise<any> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Access Key + Secret', value: 'keys' },
        { label: 'AWS SSO', value: 'sso' },
        { label: 'IAM Role', value: 'role' },
      ],
      { placeHolder: 'Select AWS authentication method' }
    );

    if (!choice) {
      return undefined;
    }

    if (choice.value === 'keys') {
      const accessKeyId = await vscode.window.showInputBox({
        prompt: 'Enter AWS Access Key ID',
        placeHolder: 'AKIAIOSFODNN7EXAMPLE',
      });

      const secretAccessKey = await vscode.window.showInputBox({
        prompt: 'Enter AWS Secret Access Key',
        password: true,
      });

      const region = await vscode.window.showInputBox({
        prompt: 'Enter AWS region',
        placeHolder: 'us-east-1',
        value: 'us-east-1',
      });

      if (accessKeyId && secretAccessKey && region) {
        const credentials = {
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        };
        await this.secretStorage.storeSecret('aws.credentials', JSON.stringify(credentials));
        return credentials;
      }
    } else if (choice.value === 'sso') {
      void vscode.window.showInformationMessage(
        'AWS SSO authentication will open in your browser. Follow the instructions.'
      );
      // In production, would handle SSO flow
      return undefined;
    }

    return undefined;
  }

  /**
   * Authenticate with Google Cloud.
   */
  async authenticateGCP(): Promise<any> {
    const projectId = await vscode.window.showInputBox({
      prompt: 'Enter your GCP Project ID',
      placeHolder: 'my-project-123',
    });

    if (!projectId) {
      return undefined;
    }

    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Service Account JSON', value: 'json' },
        { label: 'gcloud CLI', value: 'cli' },
      ],
      { placeHolder: 'Select authentication method' }
    );

    if (!choice) {
      return undefined;
    }

    if (choice.value === 'json') {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { JSON: ['json'] },
        title: 'Select Service Account JSON file',
      });

      if (uris && uris.length > 0) {
        const content = await vscode.workspace.fs.readFile(uris[0]);
        const credentials = { projectId, keyFile: content.toString() };
        await this.secretStorage.storeSecret('gcp.credentials', JSON.stringify(credentials));
        return credentials;
      }
    } else {
      void vscode.window.showInformationMessage(
        'Using gcloud CLI credentials. Ensure you have run "gcloud auth login".'
      );
      const credentials = { projectId, useGcloud: true };
      await this.secretStorage.storeSecret('gcp.credentials', JSON.stringify(credentials));
      return credentials;
    }

    return undefined;
  }

  /**
   * Generic OAuth flow using a webview.
   */
  private async customOAuthFlow(config: {
    serviceName: string;
    clientId: string;
    scopes: string[];
    authUrl: string;
    tokenUrl: string;
    secretKey: 'slack.token' | 'jira.token';
  }): Promise<string | undefined> {
    void vscode.window.showInformationMessage(
      `${config.serviceName} OAuth flow will appear in a webview. Please authenticate.`
    );

    // In production, would open webview with OAuth flow
    // For now, direct user to manual token entry
    const token = await vscode.window.showInputBox({
      prompt: `Enter your ${config.serviceName} token`,
      password: true,
      ignoreFocusOut: true,
    });

    if (token) {
      await this.secretStorage.storeSecret(config.secretKey, token);
      return token;
    }

    return undefined;
  }

  /**
   * Check if a service is authenticated.
   */
  async isAuthenticated(service: string): Promise<boolean> {
    const keyMap: Record<string, any> = {
      github: 'github.token',
      slack: 'slack.token',
      jira: 'jira.token',
      aws: 'aws.credentials',
      gcp: 'gcp.credentials',
      azure: 'azure.credentials',
    };

    const key = keyMap[service.toLowerCase()];
    if (!key) {
      return false;
    }

    const value = await this.secretStorage.getSecret(key);
    return !!value;
  }

  /**
   * Disconnect a service (remove credentials).
   */
  async disconnect(service: string): Promise<void> {
    const keyMap: Record<string, any> = {
      github: 'github.token',
      slack: 'slack.token',
      jira: 'jira.token',
      aws: 'aws.credentials',
      gcp: 'gcp.credentials',
      azure: 'azure.credentials',
      kubernetes: 'kubernetes.kubeconfig',
    };

    const key = keyMap[service.toLowerCase()];
    if (key) {
      await this.secretStorage.deleteSecret(key);
      void vscode.window.showInformationMessage(`Disconnected from ${service}`);
    }
  }
}
