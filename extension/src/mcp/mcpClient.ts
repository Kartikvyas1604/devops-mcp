import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { SecretStorageFacade } from '../auth/secretStorage';

export interface McpClientOptions {
	extensionContext: vscode.ExtensionContext;
	secretStorage: SecretStorageFacade;
}

export interface McpStatus {
	connected: boolean;
	activeTasks: number;
}

export interface ModelResponse {
	modelId: string;
	displayName: string;
	content: string;
	durationMs: number;
	isWinner: boolean;
}

export interface ChatResult {
	id: string;
	prompt: string;
	modelResponses: ModelResponse[];
}

/**
 * Lightweight MCP client that manages the backend process and provides
 * a typed API for sending chat-style requests.
 */
export class McpClient implements vscode.Disposable {
	private readonly options: McpClientOptions;
	private readonly statusEmitter = new vscode.EventEmitter<McpStatus>();
	private status: McpStatus = { connected: false, activeTasks: 0 };
	private childProcess: cp.ChildProcess | undefined;

	public readonly onStatusChanged: vscode.Event<McpStatus> = this.statusEmitter.event;

	public constructor(options: McpClientOptions) {
		this.options = options;
	}

	public async start(): Promise<void> {
		if (this.childProcess) {
			return;
		}

		const serverPath = path.join(
			this.options.extensionContext.extensionPath,
			'..',
			'mcp-server',
			'dist',
			'server.js'
		);

		try {
			this.childProcess = cp.spawn(process.execPath, [serverPath], {
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					VSCODE_GENIE_OPS: '1'
				}
			});

			this.childProcess.on('error', (error: Error) => {
				console.error('MCP server process error', error);
				this.updateStatus(false, 0);
			});

			this.childProcess.on('exit', () => {
				this.updateStatus(false, 0);
				this.childProcess = undefined;
			});

			this.updateStatus(true, 0);
		} catch (error) {
			console.error('Failed to spawn MCP server', error);
			this.updateStatus(false, 0);
			throw error;
		}
	}

	private updateStatus(connected: boolean, activeTasks: number): void {
		this.status = { connected, activeTasks };
		this.statusEmitter.fire(this.status);
	}

	/**
	 * Sends a natural-language request to the MCP backend and returns
	 * a multi-model response. If the backend is not available, a local
	 * fallback is used so the UI remains usable.
	 */
	public async sendChat(prompt: string): Promise<ChatResult> {
		this.updateStatus(this.status.connected, this.status.activeTasks + 1);
		try {
			if (!this.childProcess) {
				// Local fallback for when the MCP server is not yet available.
				return this.runLocalFallback(prompt);
			}

			// TODO: Implement JSON-RPC request/response with the MCP server.
			// For now, we still use the local fallback to keep the feature usable.
			return this.runLocalFallback(prompt);
		} finally {
			this.updateStatus(this.status.connected, Math.max(0, this.status.activeTasks - 1));
		}
	}

	private runLocalFallback(prompt: string): ChatResult {
		const start = Date.now();
		const baseContent =
			'Genie-ops backend is not yet fully configured. This is a local preview response.';

		const models: ModelResponse[] = [
			{
				modelId: 'claude-3.5-sonnet',
				displayName: 'Claude 3.5 Sonnet',
				content: `${baseContent}\n\nInterpreted request:\n${prompt}`,
				durationMs: Date.now() - start,
				isWinner: true
			},
			{
				modelId: 'gpt-4o',
				displayName: 'GPT-4o',
				content: 'Alternative perspective from GPT-4o would appear here once configured.',
				durationMs: Date.now() - start,
				isWinner: false
			},
			{
				modelId: 'mistral-small',
				displayName: 'Mistral',
				content: 'Fast Mistral completion placeholder.',
				durationMs: Date.now() - start,
				isWinner: false
			}
		];

		return {
			id: `local-${start}`,
			prompt,
			modelResponses: models
		};
	}

	public dispose(): void {
		if (this.childProcess && !this.childProcess.killed) {
			this.childProcess.kill();
		}
		this.statusEmitter.dispose();
	}
}

