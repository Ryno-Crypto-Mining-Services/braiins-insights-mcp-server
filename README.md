# Braiins Insights MCP Server

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
```
npm install -g braiins-insights-mcp-server
```

### Option 2: From Source
```
git clone https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server.git
cd braiins-insights-mcp-server
npm install
npm run build
```

### Option 3: Docker
```
docker pull rynocrypto/braiins-insights-mcp:latest
docker run -it --rm rynocrypto/braiins-insights-mcp
```

---

## ⚙️ Configuration

### Claude Desktop Setup

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```
{
  "mcpServers": {
    "braiins-insights": {
      "command": "npx",
      "args": ["-y", "braiins-insights-mcp-server"],
      "env": {
        "INSIGHTS_CACHE_TTL": "300000",
        "INSIGHTS_RATE_LIMIT": "30"
      }
    }
  }
}
```

### Cursor IDE Setup

Add to `.cursor/mcp_settings.json`:
```
{
  "servers": {
    "braiins-insights": {
      "command": "node",
      "args": ["path/to/braiins-insights-mcp-server/dist/index.js"]
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

## 🧰 Available Tools (17 Total)

### Simple Stats (No Parameters)

#### braiins_hashrate_stats ✅ IMPLEMENTED
Get current Bitcoin network hashrate statistics including:
- Current hashrate and estimated hashrate (EH/s)
- 30-day average hashrate
- Hash price and hash value (USD/TH/day)
- Transaction fee metrics (avg fees per block, fees as % of revenue)
- 1-year hashrate change trends (relative % and absolute EH/s)
- Daily network revenue (USD)

**Example Query:**
```
"What's the current Bitcoin network hashrate?"
```

**Response includes:**
- Current Metrics (hashrate, estimated, 30-day avg)
- Mining Economics (hash price, daily revenue)
- Transaction Fees (avg per block, % of revenue)
- 1-Year Trend (relative/absolute change)

```
braiins_difficulty_stats      // Mining difficulty + next adjustment
braiins_price_stats           // Bitcoin price + 24h change
braiins_transaction_stats     // Mempool size, fees, confirmation times
braiins_pool_stats            // Pool distribution by hashrate
braiins_rss_feed_data         // Braiins blog/news feed
braiins_halvings              // Next halving countdown + history
```

### Parameterized Tools
```
braiins_blocks({ page?, page_size?, start_date?, end_date? })
braiins_blocks_by_country({ page?, page_size? })
braiins_profitability_calculator({ 
  electricity_cost_kwh: number,
  hardware_efficiency_jth: number,
  hardware_cost_usd?: number
})
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
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical design, data flow, caching strategy |
| [API.md](./API.md) | Braiins Insights API endpoint reference |
| [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | Implementation roadmap, phase breakdown |
| [AGENTS.md](./AGENTS.md) | Multi-agent orchestration guide |
| [CLAUDE.md](./CLAUDE.md) | Claude Desktop setup instructions |
| [COPILOT.md](./COPILOT.md) | GitHub Copilot integration guide |

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
- **Email**: support@ryno.services
- **Discord**: [Join our community](https://discord.gg/ryno-crypto)

---

**Repository**: https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server  
**Maintained By**: Ryno Crypto Mining Services  
**Last Updated**: December 13, 2025
