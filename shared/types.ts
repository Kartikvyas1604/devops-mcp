/**
 * Shared types between extension and MCP server
 */

export interface ProjectContext {
  frameworks: string[];
  ciProviders: string[];
  cloudProviders: string[];
  integrations: string[];
  rootPath: string | undefined;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  hasDocker?: boolean;
  hasKubernetes?: boolean;
}

export interface ModelResponse {
  modelId: string;
  displayName: string;
  content: string;
  durationMs: number;
  isWinner: boolean;
  confidence?: number;
  reasoning?: string;
}

export interface ChatResult {
  id: string;
  prompt: string;
  modelResponses: ModelResponse[];
}

export interface ConnectionStatus {
  service: string;
  connected: boolean;
  lastChecked?: Date;
  credentials?: any;
}
