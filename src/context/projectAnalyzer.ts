import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Project analysis result
 */
export interface ProjectAnalysis {
    framework: string | null;
    language: string | null;
    packageManager: string | null;
    hasDocker: boolean;
    hasCICD: boolean;
    hasTests: boolean;
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
    detectedServices: string[];
    suggestions: string[];
}

/**
 * ProjectAnalyzer - Analyzes the current workspace to understand the project
 * Used for auto-context awareness and intelligent suggestions
 */
export class ProjectAnalyzer {
    
    /**
     * Analyze a project directory
     * @param projectPath - Path to the project root
     * @returns Analysis results
     */
    async analyze(projectPath: string): Promise<ProjectAnalysis> {
        const analysis: ProjectAnalysis = {
            framework: null,
            language: null,
            packageManager: null,
            hasDocker: false,
            hasCICD: false,
            hasTests: false,
            dependencies: [],
            devDependencies: [],
            scripts: {},
            detectedServices: [],
            suggestions: []
        };

        try {
            // Check for various project files
            const files = await this.listFiles(projectPath);
            
            // Detect language and framework
            await this.detectLanguageAndFramework(projectPath, files, analysis);
            
            // Check for Docker
            analysis.hasDocker = files.includes('Dockerfile') || files.includes('docker-compose.yml');
            
            // Check for CI/CD
            analysis.hasCICD = this.detectCICD(files);
            
            // Check for tests
            analysis.hasTests = this.detectTests(files);
            
            // Parse package.json if exists
            await this.parsePackageJson(projectPath, analysis);
            
            // Detect services from code
            await this.detectServices(projectPath, analysis);
            
            // Generate suggestions
            this.generateSuggestions(analysis);
            
        } catch (error) {
            console.error('Project analysis error:', error);
        }

        return analysis;
    }

    /**
     * List files in the project (top level + common directories)
     */
    private async listFiles(projectPath: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const entries = await fs.promises.readdir(projectPath, { withFileTypes: true });
            
            for (const entry of entries) {
                files.push(entry.name);
                
                // Check common directories
                if (entry.isDirectory() && ['.github', '.gitlab', '.circleci', 'test', 'tests', '__tests__', 'src'].includes(entry.name)) {
                    const subPath = path.join(projectPath, entry.name);
                    const subEntries = await fs.promises.readdir(subPath);
                    files.push(...subEntries.map(f => `${entry.name}/${f}`));
                }
            }
        } catch (error) {
            // Ignore errors
        }

        return files;
    }

    /**
     * Detect the programming language and framework
     */
    private async detectLanguageAndFramework(
        projectPath: string, 
        files: string[], 
        analysis: ProjectAnalysis
    ): Promise<void> {
        // Node.js / JavaScript / TypeScript
        if (files.includes('package.json')) {
            analysis.language = files.some(f => f.endsWith('.ts') || f.includes('tsconfig')) 
                ? 'TypeScript' 
                : 'JavaScript';
            analysis.packageManager = files.includes('yarn.lock') 
                ? 'yarn' 
                : files.includes('pnpm-lock.yaml') 
                    ? 'pnpm' 
                    : 'npm';

            // Detect framework from package.json
            try {
                const pkgPath = path.join(projectPath, 'package.json');
                const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf-8'));
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

                if (allDeps['next']) { analysis.framework = 'Next.js'; }
                else if (allDeps['@angular/core']) { analysis.framework = 'Angular'; }
                else if (allDeps['vue']) { analysis.framework = 'Vue.js'; }
                else if (allDeps['react']) { analysis.framework = 'React'; }
                else if (allDeps['express']) { analysis.framework = 'Express.js'; }
                else if (allDeps['fastify']) { analysis.framework = 'Fastify'; }
                else if (allDeps['nest']) { analysis.framework = 'NestJS'; }
                else if (allDeps['svelte']) { analysis.framework = 'Svelte'; }
            } catch {
                // Ignore parse errors
            }
        }

        // Python
        if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('setup.py')) {
            analysis.language = 'Python';
            analysis.packageManager = files.includes('poetry.lock') ? 'poetry' : 'pip';

            if (files.includes('manage.py')) { analysis.framework = 'Django'; }
            else if (files.some(f => f.includes('flask'))) { analysis.framework = 'Flask'; }
            else if (files.some(f => f.includes('fastapi'))) { analysis.framework = 'FastAPI'; }
        }

        // Go
        if (files.includes('go.mod')) {
            analysis.language = 'Go';
            analysis.packageManager = 'go modules';
        }

        // Rust
        if (files.includes('Cargo.toml')) {
            analysis.language = 'Rust';
            analysis.packageManager = 'cargo';
        }

        // Java
        if (files.includes('pom.xml')) {
            analysis.language = 'Java';
            analysis.packageManager = 'maven';
            analysis.framework = 'Spring Boot'; // Common assumption
        } else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
            analysis.language = 'Java/Kotlin';
            analysis.packageManager = 'gradle';
        }

        // Ruby
        if (files.includes('Gemfile')) {
            analysis.language = 'Ruby';
            analysis.packageManager = 'bundler';
            if (files.includes('config.ru') || files.some(f => f.includes('rails'))) {
                analysis.framework = 'Ruby on Rails';
            }
        }
    }

    /**
     * Detect CI/CD configuration
     */
    private detectCICD(files: string[]): boolean {
        const cicdFiles = [
            '.github/workflows',
            '.gitlab-ci.yml',
            '.circleci/config.yml',
            'Jenkinsfile',
            'azure-pipelines.yml',
            '.travis.yml',
            'bitbucket-pipelines.yml'
        ];

        return files.some(f => cicdFiles.some(ci => f.includes(ci) || f === ci));
    }

    /**
     * Detect test files
     */
    private detectTests(files: string[]): boolean {
        const testPatterns = [
            'test',
            'tests',
            '__tests__',
            'spec',
            '.test.',
            '.spec.',
            '_test.go',
            '_test.py'
        ];

        return files.some(f => testPatterns.some(p => f.toLowerCase().includes(p)));
    }

    /**
     * Parse package.json for Node.js projects
     */
    private async parsePackageJson(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        try {
            const pkgPath = path.join(projectPath, 'package.json');
            const content = await fs.promises.readFile(pkgPath, 'utf-8');
            const pkg = JSON.parse(content);

            analysis.dependencies = Object.keys(pkg.dependencies || {});
            analysis.devDependencies = Object.keys(pkg.devDependencies || {});
            analysis.scripts = pkg.scripts || {};
        } catch {
            // Not a Node.js project or package.json doesn't exist
        }
    }

    /**
     * Detect external services from code and configuration
     */
    private async detectServices(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        const services: Set<string> = new Set();

        // Check dependencies for common services
        const allDeps = [...analysis.dependencies, ...analysis.devDependencies];

        // AWS
        if (allDeps.some(d => d.startsWith('aws-') || d.startsWith('@aws-sdk'))) {
            services.add('AWS');
        }

        // Database
        if (allDeps.some(d => ['pg', 'mysql', 'mysql2', 'mongodb', 'mongoose', 'prisma', '@prisma/client'].includes(d))) {
            services.add('Database');
        }

        // Redis
        if (allDeps.some(d => ['redis', 'ioredis'].includes(d))) {
            services.add('Redis');
        }

        // Auth services
        if (allDeps.some(d => d.includes('auth0'))) {
            services.add('Auth0');
        }
        if (allDeps.some(d => d.includes('firebase'))) {
            services.add('Firebase');
        }

        // Payment
        if (allDeps.includes('stripe')) {
            services.add('Stripe');
        }

        // Messaging
        if (allDeps.some(d => d.includes('slack') || d.includes('@slack'))) {
            services.add('Slack');
        }
        if (allDeps.includes('twilio')) {
            services.add('Twilio');
        }

        // Check for .env.example
        try {
            const envExamplePath = path.join(projectPath, '.env.example');
            const envContent = await fs.promises.readFile(envExamplePath, 'utf-8');
            
            if (envContent.includes('AWS')) { services.add('AWS'); }
            if (envContent.includes('STRIPE')) { services.add('Stripe'); }
            if (envContent.includes('DATABASE') || envContent.includes('POSTGRES') || envContent.includes('MYSQL')) {
                services.add('Database');
            }
            if (envContent.includes('REDIS')) { services.add('Redis'); }
            if (envContent.includes('SLACK')) { services.add('Slack'); }
        } catch {
            // .env.example doesn't exist
        }

        analysis.detectedServices = Array.from(services);
    }

    /**
     * Generate suggestions based on analysis
     */
    private generateSuggestions(analysis: ProjectAnalysis): void {
        const suggestions: string[] = [];

        if (!analysis.hasDocker) {
            suggestions.push('Add a Dockerfile for containerization');
        }

        if (!analysis.hasCICD) {
            suggestions.push('Set up CI/CD pipeline for automated testing and deployment');
        }

        if (!analysis.hasTests) {
            suggestions.push('Add unit tests to improve code quality');
        }

        if (analysis.language === 'TypeScript' && !analysis.devDependencies.includes('@types/node')) {
            suggestions.push('Add @types/node for better TypeScript support');
        }

        if (analysis.dependencies.length > 0 && !analysis.devDependencies.includes('eslint')) {
            suggestions.push('Add ESLint for code quality checks');
        }

        analysis.suggestions = suggestions;
    }

    /**
     * Get a summary of the project for AI context
     */
    async getProjectContext(projectPath: string): Promise<string> {
        const analysis = await this.analyze(projectPath);
        
        let context = `Project Analysis:\n`;
        context += `- Language: ${analysis.language || 'Unknown'}\n`;
        context += `- Framework: ${analysis.framework || 'None detected'}\n`;
        context += `- Package Manager: ${analysis.packageManager || 'Unknown'}\n`;
        context += `- Has Docker: ${analysis.hasDocker ? 'Yes' : 'No'}\n`;
        context += `- Has CI/CD: ${analysis.hasCICD ? 'Yes' : 'No'}\n`;
        context += `- Has Tests: ${analysis.hasTests ? 'Yes' : 'No'}\n`;
        
        if (analysis.detectedServices.length > 0) {
            context += `- Detected Services: ${analysis.detectedServices.join(', ')}\n`;
        }
        
        if (analysis.dependencies.length > 0) {
            context += `- Key Dependencies: ${analysis.dependencies.slice(0, 10).join(', ')}\n`;
        }

        return context;
    }
}
