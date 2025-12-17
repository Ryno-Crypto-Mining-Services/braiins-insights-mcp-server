# Changelog

All notable changes to the Braiins Insights MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.2] - 2025-12-17

### Fixed

- **API Type Definitions**: Updated all type definitions to match actual Braiins Insights API response structures
  - `BraiinsInsightsDifficultyStats`: Fixed field names (`difficulty`, `estimated_adjustment`, `block_epoch`, etc.)
  - `BraiinsInsightsPriceStats`: Fixed field names (`price`, `percent_change_24h`, `timestamp`)
  - `BraiinsInsightsBlockData`: Fixed field names (`pool`, `block_value_btc`, `block_value_usd`)
  - `BlocksQueryParams`: Changed from `page`/`page_size` to `limit` parameter

- **Tool Implementations**: Updated all tools to use correct API field references
  - `braiins_difficulty_stats`: Fixed field mappings
  - `braiins_price_stats`: Fixed field mappings and added timestamp formatting
  - `braiins_blocks`: Changed pagination to use `limit` parameter
  - `braiins_mining_overview`: Updated all composite data references
  - `braiins_network_health_monitor`: Fixed difficulty calculations
  - `braiins_profitability_deep_dive`: Fixed price stats references

### Added

- **Docker Documentation**: Comprehensive Docker setup instructions in README
  - GitHub Container Registry (GHCR) pull instructions
  - Local Docker build instructions
  - Docker configuration options for Claude Desktop and Cursor IDE

### Changed

- Updated README.md with accurate tool counts (17 tools, not 5)
- Reorganized Available MCP Tools section with clear categorization
- Updated all documentation references to reflect current API structure

---

## [0.3.1] - 2025-12-16

### Fixed

- **CI/CD Pipeline**: Fixed npm publish workflow
  - Corrected npm publish environment configuration
  - Removed GitHub Packages publishing (scope mismatch with org name)
  - Primary distribution now via npmjs.org and Docker via GHCR

---

## [0.3.0] - 2025-12-15

### Added

**New MCP Tools (12 additional tools, 17 total):**

**Simple Stats Tools:**
- `braiins_price_stats` - Current BTC price with 24h change percentage
- `braiins_pool_stats` - Mining pool distribution by hashrate
- `braiins_transaction_stats` - Mempool size, average fees, confirmation times

**Parameterized Tools:**
- `braiins_cost_to_mine` - Cost to mine 1 BTC at given electricity rate

**Historical Data Tools:**
- `braiins_daily_revenue_history` - 30-day mining revenue trend
- `braiins_hashrate_and_difficulty_history` - Historical network hashrate and difficulty
- `braiins_hashrate_value_history` - Hash price correlation over time
- `braiins_transaction_fees_history` - Fee market evolution

**Composite Tools:**
- `braiins_mining_overview` - Comprehensive ecosystem snapshot (hashrate + difficulty + price + blocks)
- `braiins_profitability_deep_dive` - Full profitability analysis with historical context
- `braiins_network_health_monitor` - Network health score with anomaly detection

**Infrastructure:**
- Docker support with multi-stage builds
- GitHub Container Registry (GHCR) publishing
- Pre-commit hooks with Husky and lint-staged
- Improved test coverage with comprehensive unit tests

### Changed

- Tool registry expanded from 5 to 17 tools
- API client enhanced with additional endpoint methods
- Improved caching strategies for different data types

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

### Planned for v0.4.0

**Additional Tools:**
- `braiins_blocks_by_country` - Geographic block distribution
- `braiins_hardware_stats` - Hardware specifications (POST endpoint)

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
**Last Updated:** December 17, 2025
