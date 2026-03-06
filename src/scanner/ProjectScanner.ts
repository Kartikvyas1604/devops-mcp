import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
    ProjectContext,
    ProjectFramework,
    PackageManager,
    RuntimeEnvironment,
    ServiceType
} from '../shared/types';

export class ProjectAnalyzer {

    async analyzeWorkspace(): Promise<ProjectContext | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        return this.analyze(workspacePath);
    }

    async analyze(workspacePath: string): Promise<ProjectContext> {
        const files = await this.scanProjectFiles(workspacePath);

        const context: ProjectContext = {
            workspacePath,
            framework: ProjectFramework.UNKNOWN,
            packageManager: PackageManager.UNKNOWN,
            runtime: RuntimeEnvironment.NODE,
            language: 'unknown',
            frameworks: [],
            dependencies: {},
            devDependencies: {},
            gitRemote: undefined,
            gitBranch: undefined,
            hasDocker: false,
            hasKubernetes: false,
            hasTerraform: false,
            hasCI: false,
            ciProvider: undefined,
            existingIntegrations: [],
            envVars: []
        };

        // Detect framework and runtime
        await this.detectFrameworkAndRuntime(workspacePath, files, context);

        // Detect package manager
        context.packageManager = this.detectPackageManager(files);

        // Parse dependencies
        await this.parseDependencies(workspacePath, context);

        // Detect infrastructure
        this.detectIaC(files, context);

        // Detect CI/CD
        this.detectCI(files, context);

        // Detect existing integrations from env and code
        await this.detectExistingIntegrations(workspacePath, files, context);

        // Detect git configuration
        await this.detectGitConfig(workspacePath, context);

        // Parse environment variables
        await this.parseEnvFile(workspacePath, context);

        return context;
    }

    /**
     * Scan project files (smart scan with depth limit)
     */
    private async scanProjectFiles(projectPath: string): Promise<string[]> {
        const files: string[] = [];

        try {
            // Scan root directory
            const rootEntries = await fs.readdir(projectPath, { withFileTypes: true });
            files.push(...rootEntries.map(e => e.name));

            // Scan important subdirectories
            const dirsToScan = ['.github', '.gitlab', '.circleci', 'src', 'lib', 'app', 'pages', 'api', 'test', 'tests', '__tests__', 'terraform', 'k8s', 'helm'];

            for (const dir of dirsToScan) {
                try {
                    const dirPath = path.join(projectPath, dir);
                    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
                    files.push(...dirEntries.map(e => `${dir}/${e.name}`));

                    // Scan one level deeper for workflows
                    if (dir === '.github') {
                        const workflowsPath = path.join(dirPath, 'workflows');
                        try {
                            const workflowFiles = await fs.readdir(workflowsPath);
                            files.push(...workflowFiles.map(f => `.github/workflows/${f}`));
                        } catch { }
                    }
                } catch {
                    // Directory doesn't exist, continue
                }
            }
        } catch (error) {
            console.error('Error scanning project files:', error);
        }

        return files;
    }

    /**
     * Detect framework and runtime environment
     */
    private async detectFrameworkAndRuntime(
        projectPath: string,
        files: string[],
        context: ProjectContext
    ): Promise<void> {
        // Node.js / TypeScript / JavaScript
        if (files.includes('package.json')) {
            context.runtime = RuntimeEnvironment.NODE;

            // Check for TypeScript
            if (files.includes('tsconfig.json') || files.some(f => f.endsWith('.ts'))) {
                context.language = 'typescript';
            } else {
                context.language = 'javascript';
            }

            // Detect framework from package.json
            try {
                const pkgPath = path.join(projectPath, 'package.json');
                const pkgContent = await fs.readFile(pkgPath, 'utf-8');
                const pkg = JSON.parse(pkgContent);
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

                context.dependencies = pkg.dependencies || {};
                context.devDependencies = pkg.devDependencies || {};

                // Framework detection in priority order
                if (allDeps['next']) {
                    context.framework = ProjectFramework.NEXT_JS;
                    context.frameworks.push('Next.js');
                } else if (allDeps['@remix-run/react']) {
                    context.framework = ProjectFramework.REMIX;
                    context.frameworks.push('Remix');
                } else if (allDeps['astro']) {
                    context.framework = ProjectFramework.ASTRO;
                    context.frameworks.push('Astro');
                } else if (allDeps['nuxt']) {
                    context.framework = ProjectFramework.NUXT;
                    context.frameworks.push('Nuxt');
                } else if (allDeps['@nestjs/core']) {
                    context.framework = ProjectFramework.NEST_JS;
                    context.frameworks.push('NestJS');
                } else if (allDeps['vue']) {
                    context.framework = ProjectFramework.VUE;
                    context.frameworks.push('Vue');
                } else if (allDeps['@angular/core']) {
                    context.framework = ProjectFramework.ANGULAR;
                    context.frameworks.push('Angular');
                } else if (allDeps['svelte']) {
                    context.framework = ProjectFramework.SVELTE;
                    context.frameworks.push('Svelte');
                } else if (allDeps['solid-js']) {
                    context.framework = ProjectFramework.SOLID;
                    context.frameworks.push('Solid');
                } else if (allDeps['react']) {
                    context.framework = ProjectFramework.REACT;
                    context.frameworks.push('React');
                } else if (allDeps['express']) {
                    context.framework = ProjectFramework.EXPRESS;
                    context.frameworks.push('Express');
                } else if (allDeps['fastify']) {
                    context.framework = ProjectFramework.FASTIFY;
                    context.frameworks.push('Fastify');
                }

                // Check for Bun runtime
                if (files.includes('bun.lockb') || allDeps['bun']) {
                    context.runtime = RuntimeEnvironment.BUN;
                }

                // Check for Deno
                if (files.includes('deno.json') || files.includes('deno.jsonc')) {
                    context.runtime = RuntimeEnvironment.DENO;
                }

            } catch (error) {
                console.error('Error parsing package.json:', error);
            }
        }

        // Python
        else if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('Pipfile')) {
            context.runtime = RuntimeEnvironment.PYTHON;
            context.language = 'python';

            // Check framework indicators
            if (files.includes('manage.py')) {
                context.framework = ProjectFramework.DJANGO;
                context.frameworks.push('Django');
            } else if (files.some(f => f.includes('app.py') || f.includes('__init__.py'))) {
                // Try to detect Flask or FastAPI from imports
                context.framework = ProjectFramework.FLASK; // Default assumption
                context.frameworks.push('Flask');
            }
        }

        // Go
        else if (files.includes('go.mod')) {
            context.runtime = RuntimeEnvironment.GO;
            context.language = 'go';
            context.framework = ProjectFramework.GO;
        }

        // Rust
        else if (files.includes('Cargo.toml')) {
            context.runtime = RuntimeEnvironment.RUST;
            context.language = 'rust';
            context.framework = ProjectFramework.RUST;
        }

        // Java / Spring Boot
        else if (files.includes('pom.xml')) {
            context.runtime = RuntimeEnvironment.JAVA;
            context.language = 'java';
            context.framework = ProjectFramework.SPRING_BOOT;
            context.frameworks.push('Spring Boot');
        } else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
            context.runtime = RuntimeEnvironment.JAVA;
            context.language = 'java';
            context.framework = ProjectFramework.SPRING_BOOT;
        }

        // PHP
        else if (files.includes('composer.json')) {
            context.runtime = RuntimeEnvironment.PHP;
            context.language = 'php';

            try {
                const composerPath = path.join(projectPath, 'composer.json');
                const composerContent = await fs.readFile(composerPath, 'utf-8');
                const composer = JSON.parse(composerContent);

                if (composer.require?.['laravel/framework']) {
                    context.framework = ProjectFramework.LARAVEL;
                    context.frameworks.push('Laravel');
                }
            } catch { }
        }

        // Ruby
        else if (files.includes('Gemfile')) {
            context.runtime = RuntimeEnvironment.RUBY;
            context.language = 'ruby';

            if (files.includes('config.ru') || files.some(f => f.includes('rails'))) {
                context.framework = ProjectFramework.RAILS;
                context.frameworks.push('Ruby on Rails');
            }
        }

        // .NET
        else if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
            context.runtime = RuntimeEnvironment.DOTNET;
            context.language = 'csharp';
        }
    }

    /**
     * Detect package manager
     */
    private detectPackageManager(files: string[]): PackageManager {
        // Node.js package managers
        if (files.includes('bun.lockb')) {
            return PackageManager.BUN;
        } else if (files.includes('pnpm-lock.yaml')) {
            return PackageManager.PNPM;
        } else if (files.includes('yarn.lock')) {
            return PackageManager.YARN;
        } else if (files.includes('package-lock.json') || files.includes('package.json')) {
            return PackageManager.NPM;
        }

        // Python package managers
        else if (files.includes('poetry.lock')) {
            return PackageManager.POETRY;
        } else if (files.includes('requirements.txt') || files.includes('Pipfile')) {
            return PackageManager.PIP;
        }

        // Other language package managers
        else if (files.includes('Cargo.toml')) {
            return PackageManager.CARGO;
        } else if (files.includes('go.mod')) {
            return PackageManager.GO_MOD;
        } else if (files.includes('pom.xml')) {
            return PackageManager.MAVEN;
        } else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
            return PackageManager.GRADLE;
        } else if (files.includes('Gemfile')) {
            return PackageManager.BUNDLE;
        } else if (files.includes('composer.json')) {
            return PackageManager.COMPOSER;
        }

        return PackageManager.UNKNOWN;
    }

    /**
     * Parse project dependencies
     */
    private async parseDependencies(projectPath: string, context: ProjectContext): Promise<void> {
        // Already parsed in detectFrameworkAndRuntime for package.json
        // Add additional parsing logic for other languages if needed
    }

    /**
     * Detect Infrastructure as Code files
     */
    private detectIaC(files: string[], context: ProjectContext): void {
        // Docker
        context.hasDocker = files.includes('Dockerfile') || files.includes('docker-compose.yml') || files.includes('docker-compose.yaml');

        // Kubernetes
        context.hasKubernetes = files.some(f =>
            f.includes('deployment.yaml') ||
            f.includes('deployment.yml') ||
            f.startsWith('k8s/') ||
            f.startsWith('helm/')
        );

        // Terraform
        context.hasTerraform = files.some(f => f.endsWith('.tf') || f.includes('terraform'));
    }

    /**
     * Detect CI/CD configuration
     */
    private detectCI(files: string[], context: ProjectContext): void {
        if (files.some(f => f.startsWith('.github/workflows/'))) {
            context.hasCI = true;
            context.ciProvider = 'github-actions';
        } else if (files.includes('.gitlab-ci.yml')) {
            context.hasCI = true;
            context.ciProvider = 'gitlab-ci';
        } else if (files.includes('Jenkinsfile')) {
            context.hasCI = true;
            context.ciProvider = 'jenkins';
        } else if (files.includes('.circleci/config.yml')) {
            context.hasCI = true;
            context.ciProvider = 'circleci';
        } else if (files.includes('bitbucket-pipelines.yml')) {
            context.hasCI = true;
            context.ciProvider = 'bitbucket-pipelines';
        }
    }

    /**
     * Detect existing service integrations from environment variables and code
     */
    private async detectExistingIntegrations(
        projectPath: string,
        files: string[],
        context: ProjectContext
    ): Promise<void> {
        const integrations = new Set<ServiceType>();

        // Parse .env file for service indicators
        try {
            const envPath = path.join(projectPath, '.env');
            const envContent = await fs.readFile(envPath, 'utf-8');

            // AWS
            if (envContent.includes('AWS_')) {
                integrations.add(ServiceType.AWS);
            }

            // GCP
            if (envContent.includes('GCP_') || envContent.includes('GOOGLE_')) {
                integrations.add(ServiceType.GCP);
            }

            // Azure
            if (envContent.includes('AZURE_')) {
                integrations.add(ServiceType.AZURE);
            }

            // Stripe
            if (envContent.includes('STRIPE_')) {
                integrations.add(ServiceType.STRIPE);
            }

            // Auth0
            if (envContent.includes('AUTH0_')) {
                integrations.add(ServiceType.AUTH0);
            }

            // Firebase
            if (envContent.includes('FIREBASE_')) {
                integrations.add(ServiceType.FIREBASE_AUTH);
            }

            // Supabase
            if (envContent.includes('SUPABASE_') || envContent.includes('NEXT_PUBLIC_SUPABASE_')) {
                integrations.add(ServiceType.SUPABASE);
            }

            // Clerk
            if (envContent.includes('CLERK_')) {
                integrations.add(ServiceType.CLERK);
            }

            // Slack
            if (envContent.includes('SLACK_')) {
                integrations.add(ServiceType.SLACK);
            }

            // Twilio
            if (envContent.includes('TWILIO_')) {
                integrations.add(ServiceType.TWILIO);
            }

            // SendGrid
            if (envContent.includes('SENDGRID_')) {
                integrations.add(ServiceType.SENDGRID);
            }

            // Databases
            if (envContent.includes('DATABASE_URL') || envContent.includes('POSTGRES_')) {
                integrations.add(ServiceType.POSTGRESQL);
            }
            if (envContent.includes('MONGODB_URI') || envContent.includes('MONGO_')) {
                integrations.add(ServiceType.MONGODB);
            }
            if (envContent.includes('REDIS_URL') || envContent.includes('REDIS_')) {
                integrations.add(ServiceType.REDIS);
            }

        } catch {
            // .env file doesn't exist or can't be read
        }

        // Check dependencies for integration SDKs
        const deps = { ...context.dependencies, ...context.devDependencies };

        if (deps['@aws-sdk/client-s3'] || deps['aws-sdk']) {
            integrations.add(ServiceType.AWS);
        }
        if (deps['@google-cloud/storage'] || deps['firebase']) {
            integrations.add(ServiceType.GCP);
        }
        if (deps['@azure/storage-blob']) {
            integrations.add(ServiceType.AZURE);
        }
        if (deps['stripe']) {
            integrations.add(ServiceType.STRIPE);
        }
        if (deps['@auth0/nextjs-auth0'] || deps['auth0']) {
            integrations.add(ServiceType.AUTH0);
        }
        if (deps['firebase']) {
            integrations.add(ServiceType.FIREBASE_AUTH);
        }
        if (deps['@supabase/supabase-js']) {
            integrations.add(ServiceType.SUPABASE);
        }
        if (deps['@clerk/nextjs'] || deps['@clerk/clerk-react']) {
            integrations.add(ServiceType.CLERK);
        }
        if (deps['@slack/web-api'] || deps['@slack/bolt']) {
            integrations.add(ServiceType.SLACK);
        }
        if (deps['twilio']) {
            integrations.add(ServiceType.TWILIO);
        }
        if (deps['@sendgrid/mail']) {
            integrations.add(ServiceType.SENDGRID);
        }

        context.existingIntegrations = Array.from(integrations);
    }

    /**
     * Detect Git configuration
     */
    private async detectGitConfig(projectPath: string, context: ProjectContext): Promise<void> {
        try {
            const gitConfigPath = path.join(projectPath, '.git', 'config');
            const gitConfig = await fs.readFile(gitConfigPath, 'utf-8');

            // Extract remote URL
            const remoteMatch = gitConfig.match(/url = (.+)/);
            if (remoteMatch) {
                context.gitRemote = remoteMatch[1].trim();
            }

            // Get current branch
            const headPath = path.join(projectPath, '.git', 'HEAD');
            const head = await fs.readFile(headPath, 'utf-8');
            const branchMatch = head.match(/ref: refs\/heads\/(.+)/);
            if (branchMatch) {
                context.gitBranch = branchMatch[1].trim();
            }
        } catch {
            // Git not initialized or error reading config
        }
    }

    /**
     * Parse .env file to detect existing environment variables
     */
    private async parseEnvFile(projectPath: string, context: ProjectContext): Promise<void> {
        try {
            const envPath = path.join(projectPath, '.env');
            const envContent = await fs.readFile(envPath, 'utf-8');

            // Extract variable names (not values, for security)
            const lines = envContent.split('\n');
            const varNames = lines
                .filter(line => line.trim() && !line.trim().startsWith('#'))
                .map(line => line.split('=')[0].trim())
                .filter(name => name.length > 0);

            context.envVars = varNames;
        } catch {
            // .env doesn't exist
            context.envVars = [];
        }
    }
}
