import * as vscode from 'vscode';
import { McpClient } from '../mcp/mcpClient';

export interface ProjectContext {
	frameworks: string[];
	ciProviders: string[];
	cloudProviders: string[];
	integrations: string[];
	rootPath: string | undefined;
}

export interface ProjectContextService {
	getContext(): ProjectContext;
}

class NoopProjectContextService implements ProjectContextService {
	private readonly workspaceRoot: string | undefined;

	public constructor(workspaceRoot: string | undefined) {
		this.workspaceRoot = workspaceRoot;
	}

	public getContext(): ProjectContext {
		return {
			frameworks: [],
			ciProviders: [],
			cloudProviders: [],
			integrations: [],
			rootPath: this.workspaceRoot
		};
	}
}

/**
 * Initializes the project context analyzer.
 *
 * For the first iteration this is a no-op implementation that can be
 * expanded to inspect the workspace (package.json, Dockerfile, etc.)
 * and notify the MCP backend.
 */
export function initializeProjectContext(
	_context: vscode.ExtensionContext,
	_mcpClient: McpClient
): ProjectContextService {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	return new NoopProjectContextService(workspaceRoot);
}

