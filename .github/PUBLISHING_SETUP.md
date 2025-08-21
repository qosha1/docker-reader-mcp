# Publishing Setup for Docker Reader MCP

This document explains how to use the GitHub Actions workflows to publish the Docker Reader MCP to npm.

## Prerequisites

1. **NPM Token**: You need to add your npm token as a GitHub secret
2. **GitHub Repository**: The project should be in a GitHub repository
3. **Permissions**: You need write access to the repository

## Setup Steps

### 1. Add NPM Token to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Your npm authentication token (get from npmjs.com → Access Tokens)

### 2. Ensure Package Name is Available

The package is currently named `docker-reader-mcp`. Make sure this name is available on npm, or update the name in `package.json`.

## Publishing Methods

### Method 1: Automatic on Main Branch Push

The workflow automatically runs when you push to the main branch. It will:

1. Run all tests including Docker integration tests
2. Build the TypeScript project
3. Check if the current version exists on npm
4. Publish if it's a new version
5. Create a GitHub release

### Method 2: Manual Release via GitHub UI

1. Go to Actions tab in your GitHub repository
2. Click on "Publish Docker Reader MCP to NPM"
3. Click "Run workflow"
4. Choose:
   - Version type (patch, minor, major)
   - Whether to publish (true/false)
5. Click "Run workflow"

This will automatically bump the version, create a git tag, publish to npm, and create a GitHub release.

### Method 3: Git Tag Release

1. Create and push a git tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. The workflow will automatically detect the tag and publish that version to npm.

### Method 4: GitHub Release

1. Go to Releases tab in your GitHub repository
2. Click "Create a new release"
3. Choose or create a tag (e.g., v1.0.1)
4. Fill in the release details
5. Click "Publish release"

The workflow will automatically publish to npm when the release is created.

## Workflow Features

### Testing Pipeline
- **TypeScript compilation** and type checking
- **Build verification** ensures dist files are created
- **Docker integration testing** with real containers
- **Package validation** checks npm package contents
- **MCP protocol testing** validates all tools and resources

### Publishing Pipeline
- **Version management** with automatic version bumping
- **Duplicate prevention** checks if version already exists on npm
- **Automatic releases** creates GitHub releases with changelog
- **Package optimization** includes only necessary files

### Test Containers
The workflow automatically tests with real Docker containers:
- nginx:alpine (for web server logs)
- redis:alpine (for database logs)

## Manual Testing

You can test the package locally before publishing:

```bash
# Build and pack
npm run build
npm pack

# Test local installation
npm install -g ./docker-reader-mcp-*.tgz

# Test the command
docker-reader-mcp

# Clean up
npm uninstall -g docker-reader-mcp
```

## Package Contents

The published package includes:
- `dist/` - Compiled JavaScript files
- `mcp.json` - MCP server configuration  
- `README.md` - Documentation
- `package.json` - Package metadata
- `LICENSE` - MIT license

## Troubleshooting

### Publication Fails
1. Check that `NPM_TOKEN` secret is set correctly
2. Verify the package name is available on npm
3. Ensure the version number is higher than existing versions

### Tests Fail
1. Check Docker is available in the CI environment (should be by default)
2. Verify all TypeScript compiles without errors
3. Check MCP protocol responses are correctly formatted

### Version Conflicts
1. The workflow prevents publishing duplicate versions
2. Update version in package.json manually or use workflow dispatch
3. Use semantic versioning (patch: 1.0.1, minor: 1.1.0, major: 2.0.0)

## Repository Structure

```
.github/
├── workflows/
│   ├── publish.yml  # Main publishing workflow
│   └── test.yml     # Testing workflow for PRs
└── PUBLISHING_SETUP.md  # This file

src/                 # TypeScript source files
dist/                # Compiled JavaScript (built by workflow)
package.json         # npm package configuration
mcp.json            # MCP server configuration
README.md           # Main documentation
CHANGELOG.md        # Version history
```

This setup ensures reliable, automated publishing with comprehensive testing for the Docker Reader MCP package.