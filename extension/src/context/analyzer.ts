import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { McpClient } from '../mcp/mcpClient';

export interface ProjectContext {
	frameworks: string[];
	ciProviders: string[];
	cloudProviders: string[];
	integrations: string[];
	rootPath: string | undefined;
	packageManager?: 'npm' | 'yarn' | 'pnpm';
	hasDocker?: boolean;
	hasKubernetes?: boolean;
	languages?: string[];
}

export interface ProjectContextService {
	getContext(): ProjectContext;
	refresh(): Promise<void>;
}

class ProjectContextAnalyzer implements ProjectContextService {
	private context: ProjectContext;
	private readonly workspaceRoot: string | undefined;

	public constructor(workspaceRoot: string | undefined) {
		this.workspaceRoot = workspaceRoot;
		this.context = {
			frameworks: [],
			ciProviders: [],
			cloudProviders: [],
			integrations: [],
			rootPath: workspaceRoot,
		};
		
		// Initial scan
		this.scanProject();
	}

	public getContext(): ProjectContext {
		return this.context;
	}

	public async refresh(): Promise<void> {
		this.scanProject();
	}

	private scanProject(): void {
		if (!this.workspaceRoot) {
			return;
		}

		this.detectFrameworks();
		this.detectCI();
		this.detectCloud();
		this.detectIntegrations();
		this.detectPackageManager();
		this.detectContainerization();
		this.detectLanguages();
	}

	private detectFrameworks(): void {
		const frameworks: string[] = [];

		if (this.fileExists('package.json')) {
			const pkg = this.readJson('package.json');
			if (pkg) {
				if (pkg.dependencies?.next || pkg.devDependencies?.next) frameworks.push('Next.js');
				if (pkg.dependencies?.react || pkg.devDependencies?.react) frameworks.push('React');
				if (pkg.dependencies?.vue || pkg.devDependencies?.vue) frameworks.push('Vue');
				if (pkg.dependencies?.express) frameworks.push('Express');
				if (pkg.dependencies?.nestjs) frameworks.push('NestJS');
			}
		}

		if (this.fileExists('requirements.txt') || this.fileExists('Pipfile')) {
			frameworks.push('Python');
			const req = this.readFile('requirements.txt');
			if (req?.includes('django')) frameworks.push('Django');
			if (req?.includes('flask')) frameworks.push('Flask');
			if (req?.includes('fastapi')) frameworks.push('FastAPI');
		}

		if (this.fileExists('pom.xml') || this.fileExists('build.gradle')) {
			frameworks.push('Java');
			const pom = this.readFile('pom.xml');
			if (pom?.includes('spring')) frameworks.push('Spring Boot');
		}

		if (this.fileExists('go.mod')) {
			frameworks.push('Go');
		}

		this.context.frameworks = frameworks;
	}

	private detectCI(): void {
		const ciProviders: string[] = [];

		if (this.fileExists('.github/workflows')) ciProviders.push('GitHub Actions');
		if (this.fileExists('.gitlab-ci.yml')) ciProviders.push('GitLab CI');
		if (this.fileExists('.circleci/config.yml')) ciProviders.push('CircleCI');
		if (this.fileExists('azure-pipelines.yml')) ciProviders.push('Azure Pipelines');
		if (this.fileExists('Jenkinsfile')) ciProviders.push('Jenkins');

		this.context.ciProviders = ciProviders;
	}

	private detectCloud(): void {
		const cloudProviders: string[] = [];

		if (this.fileExists('vercel.json')) cloudProviders.push('Vercel');
		if (this.fileExists('netlify.toml')) cloudProviders.push('Netlify');
		if (this.fileExists('cloudformation.yml') || this.fileExists('cdk.json')) {
			cloudProviders.push('AWS');
		}
		if (this.fileExists('app.yaml') || this.fileExists('cloudbuild.yaml')) {
			cloudProviders.push('Google Cloud');
		}
		if (this.fileExists('azure-deploy.yml')) cloudProviders.push('Azure');

		this.context.cloudProviders = cloudProviders;
	}

	private detectIntegrations(): void {
		const integrations: string[] = [];

		if (this.fileExists('package.json')) {
			const pkg = this.readJson('package.json');
			if (pkg?.dependencies) {
				if (pkg.dependencies['@stripe/stripe-js']) integrations.push('Stripe');
				if (pkg.dependencies['@auth0/nextjs-auth0']) integrations.push('Auth0');
				if (pkg.dependencies['@slack/web-api']) integrations.push('Slack');
				if (pkg.dependencies['@octokit/rest']) integrations.push('GitHub API');
				if (pkg.dependencies['aws-sdk'] || pkg.dependencies['@aws-sdk/client-s3']) {
					integrations.push('AWS SDK');
				}
			}
		}

		this.context.integrations = integrations;
	}

	private detectPackageManager(): void {
		if (this.fileExists('pnpm-lock.yaml')) {
			this.context.packageManager = 'pnpm';
		} else if (this.fileExists('yarn.lock')) {
			this.context.packageManager = 'yarn';
		} else if (this.fileExists('package-lock.json')) {
			this.context.packageManager = 'npm';
		}
	}

	private detectContainerization(): void {
		this.context.hasDocker = this.fileExists('Dockerfile') || this.fileExists('docker-compose.yml');
		this.context.hasKubernetes = this.fileExists('k8s') || this.fileExists('kubernetes');
	}

	private detectLanguages(): void {
		const languages: string[] = [];

		if (this.fileExists('package.json') || this.fileExists('tsconfig.json')) {
			languages.push('TypeScript/JavaScript');
		}
		if (this.fileExists('requirements.txt') || this.fileExists('setup.py')) {
			languages.push('Python');
		}
		if (this.fileExists('pom.xml') || this.fileExists('build.gradle')) {
			languages.push('Java');
		}
		if (this.fileExists('go.mod')) {
			languages.push('Go');
		}
		if (this.fileExists('Cargo.toml')) {
			languages.push('Rust');
		}

		this.context.languages = languages;
	}

	private fileExists(relativePath: string): boolean {
		if (!this.workspaceRoot) return false;
		const fullPath = path.join(this.workspaceRoot, relativePath);
		return fs.existsSync(fullPath);
	}

	private readFile(relativePath: string): string | null {
		if (!this.workspaceRoot) return null;
		const fullPath = path.join(this.workspaceRoot, relativePath);
		try {
			return fs.readFileSync(fullPath, 'utf-8');
		} catch {
			return null;
		}
	}

	private readJson(relativePath: string): any | null {
		const content = this.readFile(relativePath);
		if (!content) return null;
		try {
			return JSON.parse(content);
		} catch {
			return null;
		}
	}
}

/**
 * Initializes the project context analyzer.
 */
export function initializeProjectContext(
	_context: vscode.ExtensionContext,
	_mcpClient: McpClient
): ProjectContextService {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	return new ProjectContextAnalyzer(workspaceRoot);
}

