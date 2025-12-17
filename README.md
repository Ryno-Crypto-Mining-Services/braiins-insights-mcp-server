# Braiins Insights MCP Server

[![CI](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/actions/workflows/codeql.yml/badge.svg)](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/actions/workflows/codeql.yml)
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
- 24h Average: 751.18 EH/s
- 7d Average: 748.91 EH/s
```

**Q:** "Show me the last 10 blocks"
```
Tool: braiins_blocks (page: 1, page_size: 10)
Response:
| Height  | Pool        | Time     | Transactions | Size    |
|---------|-------------|----------|--------------|---------|
| 872,450 | Braiins     | 2m ago   | 3,247        | 1.42 MB |
| 872,449 | Foundry USA | 12m ago  | 2,891        | 1.38 MB |
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

Currently **5 tools implemented** (17 planned). See [TOOL_CATALOG.md](./TOOL_CATALOG.md) for complete reference.

### Simple Stats Tools (No Parameters Required)

#### `braiins_hashrate_stats` ✅ IMPLEMENTED
Get current Bitcoin network hashrate statistics including 30-day averages, hash price, transaction fees, and year-over-year trends.

**Example Query:**
```
"What's the current Bitcoin network hashrate?"
```

**Response Format:**
- Current hashrate (EH/s) and estimated hashrate
- 30-day average hashrate
- Hash price and hash value (USD/TH/day)
- Transaction fee metrics (avg fees per block, fees as % of revenue)
- 1-year hashrate change (relative % and absolute EH/s)
- Daily network revenue (USD)

---

#### `braiins_difficulty_stats` ✅ IMPLEMENTED
Get current Bitcoin network difficulty statistics and next adjustment prediction.

**Example Query:**
```
"When is the next difficulty adjustment and what's the estimated change?"
```

**Response Format:**
- Current difficulty (scientific notation + decimal)
- Estimated next difficulty
- Estimated difficulty change percentage
- Blocks until next adjustment
- Estimated adjustment time
- Last adjustment time

---

#### `braiins_rss_feed_data` ✅ IMPLEMENTED
Get recent Braiins blog posts, announcements, and news from the Braiins Insights RSS feed.

**Example Query:**
```
"What are the latest Braiins news and announcements?"
```

**Response Format:**
- Recent posts (up to 10 most recent)
- Post titles with links
- Publication dates and authors
- Topic categories
- Article summaries (truncated to 200 chars)

---

#### `braiins_halvings` ✅ IMPLEMENTED
Get Bitcoin halving schedule including next halving countdown, block rewards, and historical halving events.

**Example Query:**
```
"When is the next Bitcoin halving?"
```

**Response Format:**
- Next halving estimated date
- Countdown (years, days, hours)
- Next halving block height
- Current block height and blocks remaining
- Current vs. next block reward (BTC)
- Historical halvings table (date, block height, reward)

---

### Parameterized Tools (With Input Parameters)

#### `braiins_blocks` ✅ IMPLEMENTED
Get recent Bitcoin blocks with optional pagination and date range filtering.

**Parameters:**
- `page` (optional, default: 1) - Page number (1-indexed)
- `page_size` (optional, default: 10) - Blocks per page (1-100)
- `start_date` (optional) - Filter blocks after date (YYYY-MM-DD)
- `end_date` (optional) - Filter blocks before date (YYYY-MM-DD)

**Example Queries:**
```
"Show me the last 20 blocks"
→ { page: 1, page_size: 20 }

"Show blocks mined on December 10, 2025"
→ { start_date: "2025-12-10", end_date: "2025-12-10", page_size: 50 }
```

**Response Format:**
- Blocks table (height, pool, timestamp, tx count, size, hash)
- Summary statistics (avg block size, avg transactions/block)
- Filter information
- Empty result handling with helpful messages

---

#### `braiins_profitability_calculator` ✅ IMPLEMENTED
Calculate Bitcoin mining profitability based on electricity cost and hardware efficiency.

**Parameters (REQUIRED):**
- `electricity_cost_kwh` (required) - Electricity cost in USD per kWh (0-1)
- `hardware_efficiency_jth` (required) - Hardware efficiency in J/TH (1-200)
  - Examples: Antminer S19 Pro: ~29.5 J/TH, S21: ~17.5 J/TH

**Parameters (OPTIONAL):**
- `hardware_cost_usd` (optional) - Hardware cost for ROI calculation

**Example Queries:**
```
"Is mining profitable at $0.08/kWh with an Antminer S19 Pro?"
→ { electricity_cost_kwh: 0.08, hardware_efficiency_jth: 29.5 }

"Calculate ROI for $3000 hardware at $0.05/kWh and 25 J/TH efficiency"
→ { electricity_cost_kwh: 0.05, hardware_efficiency_jth: 25, hardware_cost_usd: 3000 }
```

**Response Format:**
- Input parameters summary
- Profitability indicator (profitable/unprofitable badge)
- Daily metrics per TH/s (revenue, electricity cost, net profit)
- Extended projections (monthly, annual profit)
- ROI analysis (if hardware cost provided)
- Break-even analysis (BTC price, hashrate, electricity threshold)
- Network context (difficulty, market conditions)
- Profitability warnings and recommendations

---

### Planned Tools (Not Yet Implemented)

**Simple Stats:**
```
braiins_price_stats           // Bitcoin price + 24h change
braiins_transaction_stats     // Mempool size, fees, confirmation times
braiins_pool_stats            // Pool distribution by hashrate
```

**Parameterized:**
```
braiins_blocks_by_country({ page?, page_size? })
braiins_cost_to_mine({ electricity_cost_kwh?: number })
braiins_hardware_stats({ models?: string[] })  // POST endpoint
```

### Historical Data
```
braiins_daily_revenue_history              // 30-day mining revenue trend
braiins_hashrate_and_difficulty_history    // Historical network metrics
braiins_hashrate_value_history             // Hashrate price correlation
braiins_transaction_fees_history           // Fee market evolution
```

### Composite Tools
```
braiins_mining_overview                    // Hashrate + Difficulty + Blocks + Price
braiins_profitability_deep_dive            // Calculator + Cost-to-mine + Price + History
braiins_network_health_monitor             // Hashrate history + Difficulty + Blocks + Transactions
```

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
**Last Updated**: December 13, 2025
