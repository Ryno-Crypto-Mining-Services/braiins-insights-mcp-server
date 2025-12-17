# Braiins Insights MCP Server

[![CI](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server)
[![npm version](https://badge.fury.io/js/%40ryno-crypto%2Fbraiins-insights-mcp-server.svg)](https://www.npmjs.com/package/@ryno-crypto/braiins-insights-mcp-server)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server)

Connect your AI coding assistant (Claude Desktop, Cursor, GitHub Copilot) to real-time Bitcoin network analytics through the **Braiins Insights Dashboard API**. Access hashrate statistics, mining profitability calculations, network difficulty trends, and 14 additional data sources via standardized Model Context Protocol (MCP) tools.

---

## 🚀 Features

### Core Capabilities
- **17+ MCP Tools**: Hashrate stats, difficulty metrics, block data, profitability calculators, and more
- **Composite Analytics**: Multi-endpoint tools for mining overviews and profitability deep dives
- **Intelligent Caching**: Variable TTLs (30s-24h) based on data update frequency
- **Public API**: No authentication required for most endpoints
- **Multi-Platform**: Claude Desktop, Cursor IDE, VS Code with Copilot support

### Data Sources (v1.0 & v2.0 APIs)
| Category | Tools | Update Frequency |
|----------|-------|------------------|
| **Network Stats** | Hashrate, Difficulty, Blocks | 30s - 5min |
| **Market Data** | Price stats, Transaction fees | 5min |
| **Mining Economics** | Profitability calculator, Cost-to-mine | Real-time |
| **Historical Data** | Hashrate history, Revenue trends | 10min - 1h |
| **Static Reference** | Halvings, Hardware specs | 24h |

---

## 📋 Prerequisites

- **Node.js** 18+ with npm/yarn
- **TypeScript** 5.0+
- **MCP-compatible client**:
  - [Claude Desktop](https://claude.ai/download) 0.7.0+
  - [Cursor IDE](https://cursor.sh) with MCP extension
  - [VS Code](https://code.visualstudio.com/) with GitHub Copilot Chat

---

## 🛠️ Installation

### Option 1: NPM Package (Recommended)
```bash
npm install -g @ryno-crypto/braiins-insights-mcp-server
```

### Option 2: From Source
```bash
git clone https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server.git
cd braiins-insights-mcp-server
npm install
npm run build
```

### Option 3: Docker (GitHub Container Registry)

Pull the latest release from GitHub Container Registry:
```bash
docker pull ghcr.io/ryno-crypto-mining-services/braiins-insights-mcp-server:latest
```

Run interactively (for testing):
```bash
docker run -it --rm ghcr.io/ryno-crypto-mining-services/braiins-insights-mcp-server:latest
```

### Option 4: Build Docker Locally

Clone and build the Docker image from source:
```bash
git clone https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server.git
cd braiins-insights-mcp-server

# Build the image
docker build -t braiins-insights-mcp-server:local .

# Run interactively (for testing)
docker run -it --rm braiins-insights-mcp-server:local
```

---

## ⚙️ Configuration

### Claude Desktop Setup

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

#### Option A: NPM Package (Recommended)
```json
{
  "mcpServers": {
    "braiins-insights": {
      "command": "npx",
      "args": ["-y", "@ryno-crypto/braiins-insights-mcp-server"]
    }
  }
}
```

#### Option B: Docker (GitHub Container Registry)
```json
{
  "mcpServers": {
    "braiins-insights": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "ghcr.io/ryno-crypto-mining-services/braiins-insights-mcp-server:latest"
      ]
    }
  }
}
```

#### Option C: Local Docker Build
```json
{
  "mcpServers": {
    "braiins-insights": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "braiins-insights-mcp-server:local"
      ]
    }
  }
}
```

### Cursor IDE Setup

Add to `.cursor/mcp.json` in your project root or `~/.cursor/mcp.json` for global configuration:

#### Option A: NPM Package (Recommended)
```json
{
  "mcpServers": {
    "braiins-insights": {
      "command": "npx",
      "args": ["-y", "@ryno-crypto/braiins-insights-mcp-server"]
    }
  }
}
```

#### Option B: Docker (GitHub Container Registry)
```json
{
  "mcpServers": {
    "braiins-insights": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "ghcr.io/ryno-crypto-mining-services/braiins-insights-mcp-server:latest"
      ]
    }
  }
}
```

#### Option C: Local Docker Build
```json
{
  "mcpServers": {
    "braiins-insights": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "braiins-insights-mcp-server:local"
      ]
    }
  }
}
```

See [CLAUDE.md](./CLAUDE.md), [COPILOT.md](./COPILOT.md) for detailed platform-specific instructions.

---

## 🎯 Usage Examples

### Basic Queries (Claude Desktop)

**Q:** "What's the current Bitcoin network hashrate?"
```
Tool: braiins_hashrate_stats
Response:
# 📊 Bitcoin Network Hashrate Statistics
- Hashrate: 756.42 EH/s
- Estimated Hashrate: 751.18 EH/s
- 30-Day Average: 748.91 EH/s
```

**Q:** "Show me the last 10 blocks"
```
Tool: braiins_blocks (limit: 10)
Response:
| Height  | Pool        | Time     | Value (BTC) |
|---------|-------------|----------|-------------|
| 872,450 | Braiins     | 2m ago   | 3.247       |
| 872,449 | Foundry USA | 12m ago  | 3.189       |
...
```

### Advanced Queries (Composite Tools)

**Q:** "Give me a comprehensive mining overview"
```
Tool: braiins_mining_overview
Fetches: Hashrate + Difficulty + Price + Recent Blocks
Response: Unified markdown report with all data
```

**Q:** "Is mining profitable at $0.08/kWh with 25 J/TH hardware?"
```
Tool: braiins_profitability_calculator
Args: { electricity_cost_kwh: 0.08, hardware_efficiency_jth: 25 }
Response:
# ⚡ Mining Profitability Analysis
- Daily Revenue: $3.42/TH
- Electricity Cost: $1.92/TH
- Net Profit: $1.50/TH per day
- ROI Period: 487 days (at $5,000 hardware cost)
```

---

## 🧰 Available MCP Tools

**17 tools implemented** across 4 categories. See [TOOL_CATALOG.md](./TOOL_CATALOG.md) for complete reference.

### Simple Stats Tools (7 tools - No Parameters Required)

| Tool | Description |
|------|-------------|
| `braiins_hashrate_stats` | Network hashrate, 30-day average, hash price, transaction fees, YoY trends |
| `braiins_difficulty_stats` | Current difficulty, next adjustment prediction, epoch timing |
| `braiins_price_stats` | Current BTC price with 24h change percentage |
| `braiins_pool_stats` | Mining pool distribution by hashrate |
| `braiins_transaction_stats` | Mempool size, average fees, confirmation times |
| `braiins_rss_feed_data` | Latest Braiins blog posts and announcements |
| `braiins_halvings` | Halving countdown, block rewards, historical events |

### Parameterized Tools (3 tools - With Input Parameters)

| Tool | Parameters | Description |
|------|------------|-------------|
| `braiins_blocks` | `limit` (1-100) | Recent blocks with pool, timestamp, value |
| `braiins_profitability_calculator` | `electricity_cost_kwh`, `hardware_efficiency_jth`, `hardware_cost_usd?` | Mining profitability with ROI analysis |
| `braiins_cost_to_mine` | `electricity_cost_kwh?` | Cost to mine 1 BTC at given electricity rate |

### Historical Data Tools (4 tools - Time-Series Data)

| Tool | Description |
|------|-------------|
| `braiins_daily_revenue_history` | 30-day mining revenue trend |
| `braiins_hashrate_and_difficulty_history` | Historical network hashrate and difficulty |
| `braiins_hashrate_value_history` | Hash price correlation over time |
| `braiins_transaction_fees_history` | Fee market evolution |

### Composite Tools (3 tools - Multi-Endpoint Aggregators)

| Tool | Combines | Description |
|------|----------|-------------|
| `braiins_mining_overview` | Hashrate + Difficulty + Price + Blocks | 30-second ecosystem snapshot |
| `braiins_profitability_deep_dive` | Calculator + Cost-to-mine + Price + History | Comprehensive profitability analysis |
| `braiins_network_health_monitor` | Hashrate history + Difficulty + Blocks | Network health score with anomaly detection |

### Detailed Tool Examples

#### `braiins_hashrate_stats`
Get current Bitcoin network hashrate statistics.

```
"What's the current Bitcoin network hashrate?"
```
Returns: Current/estimated hashrate (EH/s), 30-day average, hash price (USD/TH/day), fee metrics, YoY change.

---

#### `braiins_blocks`
Get recent Bitcoin blocks with optional limit.

**Parameters:**
- `limit` (optional, default: 10, max: 100) - Number of blocks to return

```
"Show me the last 20 blocks"
→ { limit: 20 }
```
Returns: Blocks table (height, pool, timestamp, value in BTC/USD).

---

#### `braiins_profitability_calculator`
Calculate Bitcoin mining profitability.

**Parameters:**
- `electricity_cost_kwh` (required, 0-1) - Electricity cost in USD/kWh
- `hardware_efficiency_jth` (required, 1-200) - Hardware efficiency in J/TH
- `hardware_cost_usd` (optional) - Hardware cost for ROI calculation

```
"Is mining profitable at $0.08/kWh with an Antminer S21?"
→ { electricity_cost_kwh: 0.08, hardware_efficiency_jth: 17.5 }
```
Returns: Daily/monthly profit, ROI period, break-even analysis.

---

#### `braiins_mining_overview`
Comprehensive Bitcoin mining ecosystem overview.

**Parameters:**
- `include_recent_blocks` (optional, default: true) - Include recent blocks
- `block_count` (optional, default: 5, max: 20) - Number of blocks

```
"Give me a comprehensive mining overview"
→ { include_recent_blocks: true, block_count: 5 }
```
Returns: Unified report with hashrate, difficulty, price, and recent blocks.

---

## 🏗️ Architecture

```
AI Assistant → MCP Protocol (JSON-RPC) → Braiins Insights MCP Server
                                         ├─ Tool Registry (17 tools)
                                         ├─ Input Validation (Zod)
                                         ├─ API Client with Caching
                                         └─ Rate Limiter (30 req/min)
                                         ↓
                           Braiins Insights Dashboard API
                           (https://insights.braiins.com/api)
```

**Key Components:**
- **MCP Server Core**: Tool registration, request routing, stdio transport
- **API Client**: HTTP communication, caching (variable TTLs), rate limiting
- **Tool Layer**: Simple stats, parameterized tools, composite tools
- **Validation Layer**: Zod schemas for type-safe inputs

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical design.

---

## 🧪 Testing

```
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires network access)
npm run test:integration

# E2E tests with Claude Desktop
npm run test:e2e
```

**Test Coverage:**
- Unit tests (70%): Individual tools, cache logic, response formatting
- Integration tests (25%): Real API requests with fixtures
- E2E tests (5%): Full MCP protocol with stdio transport

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [TOOL_CATALOG.md](./TOOL_CATALOG.md) | **Complete MCP tool reference with all parameters and examples** |
| [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) | **Practical usage examples and integration patterns** |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical design, data flow, caching strategy |
| [API.md](./API.md) | Braiins Insights API endpoint reference |
| [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | Implementation roadmap, phase breakdown |
| [AGENTS.md](./AGENTS.md) | Multi-agent orchestration guide |
| [CLAUDE.md](./CLAUDE.md) | Claude Desktop setup instructions |
| [COPILOT.md](./COPILOT.md) | GitHub Copilot integration guide |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-tool`)
3. **Commit** changes with conventional commits (`feat: add mining alerts tool`)
4. **Test** your changes (`npm test`)
5. **Push** to branch (`git push origin feature/amazing-tool`)
6. **Open** a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📜 License

Apache License 2.0 - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- **Braiins Team**: For the comprehensive Insights Dashboard API
- **Anthropic**: For the Model Context Protocol specification
- **Community Contributors**: See [CONTRIBUTORS.md](./CONTRIBUTORS.md)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/discussions)
- **Email**: support@rynocrypto.com
- **Discord**: [Join our community](https://discord.gg/ryno-crypto)

---

**Repository**: https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server
**Maintained By**: Ryno Crypto Mining Services
**Last Updated**: December 17, 2025
