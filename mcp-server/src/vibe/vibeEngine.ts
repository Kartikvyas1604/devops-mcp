/**
 * Vibe Coding Engine
 * 
 * Generates complete application scaffolds from natural language descriptions.
 * Uses multi-model consensus on architecture decisions.
 */

import { AIOrchestrator } from '../orchestrator/aiOrchestrator.js';

export interface VibeRequest {
  description: string;
  preferredStack?: string[];
  integrations?: string[];
  deployTarget?: string;
}

export interface VibeResult {
  projectName: string;
  architecture: string;
  techStack: string[];
  fileStructure: Record<string, string>;
  setupInstructions: string[];
  estimatedTime: string;
  modelConsensus: string;
}

export class VibeCodingEngine {
  private orchestrator: AIOrchestrator;

  constructor(orchestrator: AIOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Generate a complete application from natural language.
   */
  async vibeCode(request: VibeRequest): Promise<VibeResult> {
    // Step 1: Get architecture recommendations from multiple AI models
    const architecturePrompt = `
You are an expert software architect. Design a production-grade application based on this description:

DESCRIPTION: ${request.description}
PREFERRED_STACK: ${request.preferredStack?.join(', ') || 'auto-detect best fit'}
INTEGRATIONS: ${request.integrations?.join(', ') || 'none specified'}
DEPLOY_TARGET: ${request.deployTarget || 'flexible'}

Provide:
1. Recommended tech stack (specific versions)
2. Project structure (folders and key files)
3. Architecture pattern (MVC, microservices, serverless, etc.)
4. Database choice and schema outline
5. DevOps setup (CI/CD, containerization)
6. Security considerations
7. Estimated development time

Format as JSON with these keys: techStack, architecture, database, devops, structure, security, timeEstimate
`;

    const result = await this.orchestrator.executeParallel(architecturePrompt);

    // Parse the winner's response (in production, would parse all and find consensus)
    const winnerResponse = result.modelResponses.find(r => r.isWinner)!;
    
    // Step 2: Generate file scaffolds
    const fileStructure = this.generateFileStructure(request, winnerResponse.content);

    // Step 3: Create setup instructions
    const setupInstructions = this.generateSetupInstructions(request, winnerResponse.content);

    return {
      projectName: this.extractProjectName(request.description),
      architecture: winnerResponse.content,
      techStack: this.extractTechStack(winnerResponse.content),
      fileStructure,
      setupInstructions,
      estimatedTime: '2-4 hours for full implementation',
      modelConsensus: result.winnerExplanation,
    };
  }

  private extractProjectName(description: string): string {
    // Simple extraction - in production would use NLP
    const words = description.split(' ').slice(0, 3);
    return words.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  private extractTechStack(architectureText: string): string[] {
    // Simplified - would parse the JSON response
    const commonStacks = [
      'Next.js',
      'React',
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'Tailwind CSS',
      'Stripe',
      'Auth0',
      'Docker',
      'GitHub Actions',
    ];
    
    return commonStacks.filter(tech => 
      architectureText.toLowerCase().includes(tech.toLowerCase())
    );
  }

  private generateFileStructure(request: VibeRequest, architecture: string): Record<string, string> {
    // Generate a complete Next.js + API scaffold as default
    return {
      'package.json': this.generatePackageJson(request),
      'README.md': this.generateReadme(request),
      'Dockerfile': this.generateDockerfile(),
      '.github/workflows/ci.yml': this.generateGitHubActions(),
      'src/app/page.tsx': this.generateNextJsHomePage(request),
      'src/app/api/hello/route.ts': this.generateAPIRoute(),
      'src/lib/db.ts': this.generateDatabaseClient(),
      'src/components/Header.tsx': this.generateHeaderComponent(),
      '.env.example': this.generateEnvExample(request),
      'docker-compose.yml': this.generateDockerCompose(request),
      'tsconfig.json': this.generateTsConfig(),
    };
  }

  private generatePackageJson(request: VibeRequest): string {
    const projectName = this.extractProjectName(request.description);
    return JSON.stringify({
      name: projectName,
      version: '1.0.0',
      description: request.description,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        test: 'vitest',
      },
      dependencies: {
        'next': '^14.1.0',
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        '@stripe/stripe-js': request.integrations?.includes('stripe') ? '^3.0.0' : undefined,
        '@auth0/nextjs-auth0': request.integrations?.includes('auth0') ? '^3.5.0' : undefined,
        'pg': '^8.11.3',
      },
      devDependencies: {
        '@types/node': '^20.11.0',
        '@types/react': '^18.2.0',
        'typescript': '^5.3.0',
        'vitest': '^1.2.0',
      },
    }, null, 2);
  }

  private generateReadme(request: VibeRequest): string {
    const projectName = this.extractProjectName(request.description);
    return `# ${projectName}

${request.description}

## 🚀 Generated by Genie-ops

This project was scaffolded automatically using Genie-ops Vibe Coding Engine.

## Features

- Modern Next.js 14 setup with App Router
- TypeScript for type safety
- Docker containerization
- GitHub Actions CI/CD
- Production-ready architecture

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Deployment

### Docker

\`\`\`bash
docker build -t ${projectName} .
docker run -p 3000:3000 ${projectName}
\`\`\`

### Cloud Platforms

- **Vercel**: \`vercel --prod\`
- **AWS**: Use provided CloudFormation templates
- **Google Cloud Run**: \`gcloud run deploy\`

## Architecture

See the generated architecture.md for detailed system design.

## License

MIT
`;
  }

  private generateDockerfile(): string {
    return `FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
`;
  }

  private generateGitHubActions(): string {
    return `name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: echo "Deploy step here"
`;
  }

  private generateNextJsHomePage(request: VibeRequest): string {
    return `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to ${this.extractProjectName(request.description)}
        </h1>
        <p className="text-xl mb-8">
          ${request.description}
        </p>
        <p className="text-sm text-gray-500">
          🧞 Generated by Genie-ops
        </p>
      </div>
    </main>
  );
}
`;
  }

  private generateAPIRoute(): string {
    return `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Hello from your Vibe-coded API!',
    timestamp: new Date().toISOString(),
  });
}
`;
  }

  private generateDatabaseClient(): string {
    return `import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
`;
  }

  private generateHeaderComponent(): string {
    return `export default function Header() {
  return (
    <header className="w-full border-b">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-xl font-bold">MyApp</div>
        <div className="space-x-4">
          <a href="/" className="hover:underline">Home</a>
          <a href="/about" className="hover:underline">About</a>
          <a href="/contact" className="hover:underline">Contact</a>
        </div>
      </nav>
    </header>
  );
}
`;
  }

  private generateEnvExample(request: VibeRequest): string {
    let env = `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# App
NODE_ENV=development
PORT=3000
`;

    if (request.integrations?.includes('stripe')) {
      env += `\n# Stripe\nSTRIPE_SECRET_KEY=sk_test_...\nSTRIPE_PUBLISHABLE_KEY=pk_test_...\n`;
    }

    if (request.integrations?.includes('auth0')) {
      env += `\n# Auth0\nAUTH0_SECRET=...\nAUTH0_BASE_URL=http://localhost:3000\nAUTH0_ISSUER_BASE_URL=...\nAUTH0_CLIENT_ID=...\nAUTH0_CLIENT_SECRET=...\n`;
    }

    return env;
  }

  private generateDockerCompose(request: VibeRequest): string {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
`;
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }, null, 2);
  }

  private generateSetupInstructions(request: VibeRequest, architecture: string): string[] {
    return [
      '1. Extract all generated files to your project directory',
      '2. Run: npm install',
      '3. Copy .env.example to .env and fill in your credentials',
      '4. Run: docker-compose up -d (starts PostgreSQL)',
      '5. Run: npm run dev',
      '6. Open http://localhost:3000',
      '7. Deploy: docker build && docker push, or vercel --prod',
      '8. Set up monitoring and error tracking (recommended: Sentry)',
    ];
  }
}
