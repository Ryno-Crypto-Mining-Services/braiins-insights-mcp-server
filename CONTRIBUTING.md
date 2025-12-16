# Contributing to Braiins Insights MCP Server

Thank you for your interest in contributing to the Braiins Insights MCP Server! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing](#testing)

---

## Getting Started

### Prerequisites

- **Node.js** 18+ with npm/yarn
- **TypeScript** 5.0+
- **Git** for version control

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/braiins-insights-mcp-server.git
   cd braiins-insights-mcp-server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Workflow

### Running the Development Server

```bash
npm run dev  # Watch mode with auto-restart
```

### Code Quality Commands

```bash
npm run lint              # Check linting
npm run lint:fix          # Auto-fix linting issues
npm run type-check        # TypeScript type checking
npm run format            # Format code with Prettier
npm test                  # Run unit tests
npm run test:integration  # Run integration tests
npm run test:coverage     # Generate coverage report
```

### Building

```bash
npm run build  # Compile TypeScript to dist/
```

---

## GitHub Secrets Configuration

The CI/CD workflows require the following secrets to be configured in your GitHub repository settings.

### Required Secrets

#### 1. NPM_TOKEN

**Purpose:** Publish packages to npm registry

**How to obtain:**
1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to **Account Settings** → **Access Tokens**
3. Click **Generate New Token** → **Automation**
4. Copy the token (it will only be shown once)

**How to configure:**
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: Paste your npm token
5. Click **Add secret**

**Permissions needed:** Publish access to `@ryno-crypto/braiins-insights-mcp-server`

---

#### 2. CODECOV_TOKEN

**Purpose:** Upload test coverage reports to Codecov

**How to obtain:**
1. Go to [codecov.io](https://codecov.io/)
2. Sign in with GitHub
3. Add your repository
4. Copy the **Upload Token** from the repository settings

**How to configure:**
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `CODECOV_TOKEN`
4. Value: Paste your Codecov token
5. Click **Add secret**

**Optional:** Public repositories can use Codecov without a token, but using a token provides better reliability and avoids rate limits.

---

#### 3. SNYK_TOKEN

**Purpose:** Run security vulnerability scans on dependencies

**How to obtain:**
1. Sign up for a free account at [snyk.io](https://snyk.io/)
2. Go to **Account Settings** (click your profile icon)
3. Click **General** → **Auth Token**
4. Click **Show** to reveal your API token
5. Copy the token

**How to configure:**
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `SNYK_TOKEN`
4. Value: Paste your Snyk API token
5. Click **Add secret**

**Permissions needed:** Free tier is sufficient for open-source projects

---

### Optional Secrets

#### GITHUB_TOKEN

**Purpose:** Automatically provided by GitHub Actions for repository operations

**Configuration:** No manual configuration required - GitHub automatically provides this token to workflows.

**Permissions:** Configured in workflow files via `permissions` key.

---

### Verifying Secrets Configuration

After adding secrets, verify they're configured correctly:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see:
   - `NPM_TOKEN` ✓
   - `CODECOV_TOKEN` ✓
   - `SNYK_TOKEN` ✓

3. Trigger a workflow run to test:
   ```bash
   git commit --allow-empty -m "chore: test CI secrets"
   git push
   ```

4. Monitor the workflow run at **Actions** tab:
   - **CI workflow** should pass all jobs
   - **Security workflow** should complete Snyk scan
   - Check **Codecov** for coverage upload confirmation

---

### Secret Rotation

**Best Practice:** Rotate secrets every 90 days for security.

To rotate a secret:
1. Generate a new token from the service (npm, Codecov, Snyk)
2. Update the secret in GitHub repository settings
3. Trigger a test workflow to verify the new token works
4. Revoke the old token from the service

---

## Pull Request Process

### 1. Before Submitting

- [ ] Run `npm run lint:fix` to fix linting issues
- [ ] Run `npm run type-check` to verify TypeScript types
- [ ] Run `npm test` to ensure all tests pass
- [ ] Run `npm run test:coverage` to check coverage (minimum 80%)
- [ ] Update documentation if needed
- [ ] Add tests for new features
- [ ] Update CHANGELOG.md with your changes

### 2. Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**
```bash
feat(tools): add braiins_transaction_stats tool
fix(api): handle null hashrate values gracefully
docs: update API.md with discovered parameters
test: add integration tests for blocks tool
```

### 3. Pull Request Title

PR titles must follow semantic format (enforced by CI):

```
<type>: <description>
```

**Examples:**
- `feat: implement profitability calculator tool`
- `fix: correct difficulty formatting in stats tool`
- `docs: add CI/CD setup instructions`

### 4. PR Checklist

- [ ] PR title follows semantic format
- [ ] All CI checks pass
- [ ] Code coverage meets minimum 80%
- [ ] No new linting errors introduced
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Breaking changes documented (if applicable)
- [ ] PR is appropriately sized (<50 files, <1000 lines)

### 5. Review Process

1. Submit PR with descriptive title and body
2. Wait for automated checks to complete
3. Address any CI failures or linting issues
4. Request review from maintainers
5. Address review feedback
6. Once approved, maintainers will merge

---

## Code Standards

### TypeScript

- Enable strict mode in tsconfig.json
- Use explicit types (avoid `any` unless absolutely necessary)
- Document public APIs with JSDoc comments
- Follow existing code patterns

### Testing

- Write tests for all new features
- Maintain minimum 80% code coverage
- Use descriptive test names
- Include edge cases and error scenarios

### Formatting

- Code is automatically formatted with Prettier
- Run `npm run format` before committing
- ESLint enforces code quality rules

---

## Testing

### Unit Tests

```bash
npm test              # Run all unit tests
npm run test:watch    # Watch mode for development
```

Located in `tests/unit/`

### Integration Tests

```bash
npm run test:integration  # Test against real Braiins Insights API
```

Located in `tests/integration/`

### Coverage

```bash
npm run test:coverage  # Generate HTML coverage report
```

Report available at `coverage/index.html`

---

## Questions?

- **Issues:** [GitHub Issues](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/discussions)
- **Email:** support@ryno.services

---

**Thank you for contributing to Braiins Insights MCP Server!** 🚀
