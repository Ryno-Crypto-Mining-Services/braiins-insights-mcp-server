# Changelog

All notable changes to the Braiins Insights MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2025-12-14

### Added

**New MCP Tools (5 total):**

- **braiins_difficulty_stats** - Get current Bitcoin network difficulty statistics and next adjustment prediction
  - Current difficulty (scientific notation + decimal)
  - Estimated next difficulty with % change
  - Blocks until next adjustment
  - Estimated adjustment time and last adjustment time

- **braiins_rss_feed_data** - Get recent Braiins blog posts and announcements
  - Up to 10 most recent posts
  - Post titles with clickable links
  - Publication dates and authors
  - Topic categories and article summaries

- **braiins_halvings** - Get Bitcoin halving schedule and countdown
  - Next halving estimated date with countdown
  - Block heights (current and target)
  - Current vs. next block rewards
  - Historical halvings table

- **braiins_blocks** - Get recent Bitcoin blocks with pagination and filtering
  - Pagination support (page, page_size: 1-100)
  - Date range filtering (start_date, end_date)
  - Blocks table with height, pool, timestamp, tx count, size, hash
  - Summary statistics (avg block size, avg tx count)

- **braiins_profitability_calculator** - Calculate mining profitability
  - Required parameters: electricity_cost_kwh, hardware_efficiency_jth
  - Optional parameter: hardware_cost_usd for ROI analysis
  - Daily/monthly/annual profit projections
  - Break-even analysis (BTC price, hashrate, electricity threshold)
  - Market condition assessment with warnings

**Documentation:**

- **TOOL_CATALOG.md** - Comprehensive MCP tool reference
  - Complete parameter specifications for all tools
  - Example queries and responses
  - Error handling documentation
  - Tool categorization (simple, parameterized, historical, composite)

- **USAGE_EXAMPLES.md** - Practical usage examples
  - Claude Desktop examples
  - Cursor IDE integration examples
  - Common use cases (daily operations, investment decisions, market research)
  - Advanced patterns (comparative analysis, time-series context, code generation)
  - Integration examples (Slack bot, monitoring dashboard, automated alerts)

- **Updated ARCHITECTURE.md** - Added MCP Tool Architecture section
  - Tool organization structure (simple/ vs parameterized/)
  - Common tool patterns (error handling, markdown formatting, validation)
  - Type safety approach
  - Testing strategy and performance considerations
  - Future enhancements roadmap

**Type Definitions:**

- `BraiinsInsightsDifficultyStats` - Difficulty statistics response type
- `BraiinsInsightsHalvingData` - Halving schedule response type
- `BraiinsInsightsBlockData` - Block data response type
- `BlocksQueryParams` - Blocks query parameters type
- `BraiinsInsightsProfitability` - Profitability calculator response type
- `ProfitabilityQueryParams` - Profitability calculator parameters type

**API Client Methods:**

- `getDifficultyStats()` - Fetch difficulty statistics
- `getHalvings()` - Fetch halving schedule
- `getBlocks(params?)` - Fetch blocks with pagination/filtering
- `getProfitabilityCalculator(params)` - Calculate profitability

**Testing:**

- Unit tests for all 5 new tools
- Integration tests with API fixtures
- Zod validation schema tests
- Error handling tests (network, API, validation errors)
- Edge case tests (empty results, null fields, large numbers)

### Changed

- **README.md** - Expanded "Available Tools" section
  - Added detailed descriptions for all 5 implemented tools
  - Added example queries and response formats
  - Added parameter specifications for parameterized tools
  - Distinguished implemented tools from planned tools
  - Updated documentation reference table

### Fixed

- Improved error messages for validation failures
- Better handling of empty API responses
- Consistent markdown formatting across all tools

---

## [0.1.0] - 2025-12-13

### Added

**Initial Release:**

- **braiins_hashrate_stats** MCP tool
  - Current hashrate and estimated hashrate (EH/s)
  - 30-day average hashrate
  - Hash price and hash value (USD/TH/day)
  - Transaction fee metrics
  - 1-year hashrate change trends
  - Daily network revenue

**Core Infrastructure:**

- MCP Server implementation with stdio transport
- InsightsApiClient with caching and rate limiting
- Type system for Braiins Insights API responses
- Error handling framework (NetworkError, InsightsApiError, ValidationError)
- Tool base classes and interfaces

**Documentation:**

- README.md with quick start guide
- ARCHITECTURE.md with technical design
- API.md with endpoint reference
- DEVELOPMENT_PLAN.md with roadmap
- AGENTS.md for multi-agent orchestration
- CLAUDE.md for Claude Desktop setup
- COPILOT.md for GitHub Copilot integration

**Development Tools:**

- TypeScript 5.0+ configuration
- ESLint and Prettier for code quality
- Jest testing framework
- GitHub Actions CI/CD pipeline

---

## [Unreleased]

### Planned for v0.3.0

**Additional Simple Stats Tools:**
- `braiins_price_stats` - Bitcoin price with 24h change
- `braiins_transaction_stats` - Mempool size, fees, confirmation times
- `braiins_pool_stats` - Pool distribution by hashrate

**Additional Parameterized Tools:**
- `braiins_blocks_by_country` - Geographic block distribution
- `braiins_cost_to_mine` - Cost to mine 1 BTC calculation
- `braiins_hardware_stats` - Hardware specifications (POST endpoint)

**Historical Data Tools:**
- `braiins_daily_revenue_history` - 30-day mining revenue trend
- `braiins_hashrate_and_difficulty_history` - Historical network metrics
- `braiins_hashrate_value_history` - Hashrate price correlation
- `braiins_transaction_fees_history` - Fee market evolution

### Planned for v0.4.0

**Composite Tools:**
- `braiins_mining_overview` - Comprehensive ecosystem snapshot
  - Combines: hashrate + difficulty + blocks + price
  - Unified markdown report

- `braiins_profitability_deep_dive` - Detailed profitability analysis
  - Combines: calculator + cost-to-mine + price + hashrate-value-history
  - Historical context and ROI projections

- `braiins_network_health_monitor` - Network health indicators
  - Combines: hashrate-history + difficulty + blocks + transactions
  - Anomaly detection and alerts

**Performance Improvements:**
- Parallel API calls for composite tools (Promise.all)
- Configurable cache TTLs per endpoint
- Cache hit/miss logging
- Response time optimization

### Planned for v0.5.0

**Advanced Features:**
- Streaming support for large datasets
- Webhook notifications for difficulty adjustments
- Custom alert thresholds
- Persistent cache storage (Redis/file-based)
- Historical data aggregation (hourly, daily, weekly)

**Developer Experience:**
- Interactive API explorer CLI
- Fixture generator for testing
- MCP Inspector integration
- Enhanced debugging tools

---

## Release Notes Format

Each release follows this structure:

### Added
- New features and tools

### Changed
- Updates to existing functionality

### Deprecated
- Features marked for removal

### Removed
- Deleted features

### Fixed
- Bug fixes

### Security
- Security-related changes

---

## Versioning Guide

**MAJOR version** (x.0.0):
- Incompatible API changes
- Breaking changes to tool schemas
- Major architectural overhaul

**MINOR version** (0.x.0):
- New tools added
- New features (backwards compatible)
- Significant enhancements

**PATCH version** (0.0.x):
- Bug fixes
- Documentation updates
- Performance improvements

---

## Links

- **Repository:** https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server
- **Issues:** https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/issues
- **Discussions:** https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/discussions

---

**Maintained By:** Ryno Crypto Mining Services
**Last Updated:** December 14, 2025
