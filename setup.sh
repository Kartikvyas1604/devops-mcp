#!/bin/bash

# Genie-ops Development Setup Script
# Automates the installation and configuration of Genie-ops

set -e

echo "🧞 Genie-ops Setup Script"
echo "========================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current version: $(node -v)"
  echo "   Install from https://nodejs.org/"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi
echo "✓ npm $(npm -v)"

# Install extension dependencies
echo ""
echo "Installing extension dependencies..."
cd extension
npm install
echo "✓ Extension dependencies installed"

# Install MCP server dependencies
echo ""
echo "Installing MCP server dependencies..."
cd ../mcp-server
npm install
echo "✓ MCP server dependencies installed"

# Build TypeScript
echo ""
echo "Building TypeScript..."
cd ../extension
npm run compile
cd ../mcp-server
npm run build
echo "✓ TypeScript compiled"

# Create sample .env file
echo ""
echo "Creating sample configuration..."
cd ..
if [ ! -f .env.example ]; then
  cat > .env.example << 'EOF'
# Genie-ops Configuration (Example)
# Copy to .env and fill in your API keys

# AI Model API Keys (at least one required)
ANTHROPIC_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_gemini_api_key_here
MISTRAL_API_KEY=your_mistral_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Service Credentials (optional, can set via extension UI)
GITHUB_TOKEN=your_github_pat_here
SLACK_TOKEN=your_slack_bot_token_here
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
EOF
  echo "✓ Created .env.example file"
else
  echo "✓ .env.example already exists"
fi

# VS Code launch configuration
echo ""
echo "Setting up VS Code debugging..."
mkdir -p .vscode
if [ ! -f .vscode/launch.json ]; then
  cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/extension"
      ],
      "outFiles": [
        "${workspaceFolder}/extension/out/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/extension",
        "--extensionTestsPath=${workspaceFolder}/extension/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/extension/out/test/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    }
  ]
}
EOF
  echo "✓ Created .vscode/launch.json"
else
  echo "✓ .vscode/launch.json already exists"
fi

echo ""
echo "========================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and add your API keys:"
echo "     cp .env.example .env"
echo ""
echo "  2. Open this folder in VS Code:"
echo "     code ."
echo ""
echo "  3. Press F5 to launch the extension in a new VS Code window"
echo ""
echo "  4. Run the 'Genie-ops: Open Chat' command to get started"
echo ""
echo "  5. Use 'Genie-ops: Connect Service' commands to authenticate"
echo ""
echo "📚 Documentation:"
echo "   README.md       - Feature overview and usage"
echo "   TESTING.md      - Testing guide"
echo "   CONTRIBUTING.md - Development guidelines"
echo ""
echo "🔗 Resources:"
echo "   GitHub: https://github.com/0xkartikvyas/genie-ops"
echo "   Issues: https://github.com/0xkartikvyas/genie-ops/issues"
echo ""
echo "Happy DevOps automation! 🚀"
