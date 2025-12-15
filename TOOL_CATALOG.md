# MCP Tool Catalog - Braiins Insights Server

Complete reference for all Model Context Protocol (MCP) tools provided by the Braiins Insights MCP Server.

**Status:** 5 of 17 tools implemented (v0.2.0)

---

## Table of Contents

- [Simple Stats Tools (No Parameters)](#simple-stats-tools-no-parameters)
  - [braiins_hashrate_stats](#braiins_hashrate_stats-)
  - [braiins_difficulty_stats](#braiins_difficulty_stats-)
  - [braiins_rss_feed_data](#braiins_rss_feed_data-)
  - [braiins_halvings](#braiins_halvings-)
- [Parameterized Tools](#parameterized-tools)
  - [braiins_blocks](#braiins_blocks-)
  - [braiins_profitability_calculator](#braiins_profitability_calculator-)
- [Planned Tools](#planned-tools)
- [Tool Categories](#tool-categories)
- [Error Handling](#error-handling)

---

## Simple Stats Tools (No Parameters)

These tools require no input parameters and return current statistics from the Braiins Insights API.

### braiins_hashrate_stats ✅

**Description:** Get current Bitcoin network hashrate statistics including 30-day averages, hash price, transaction fees, and year-over-year trends.

**API Endpoint:** `GET /v1.0/hashrate-stats`

**Parameters:** None

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Example MCP Request:**
```json
{
  "name": "braiins_hashrate_stats",
  "arguments": {}
}
```

**Example Natural Language Queries:**
- "What's the current Bitcoin network hashrate?"
- "Show me the network hashrate statistics"
- "How has hashrate changed over the past year?"
- "What's the current hash price?"

**Response Format:**

Returns formatted markdown with:

1. **Current Metrics**
   - Current Hashrate (EH/s)
   - Estimated Hashrate (EH/s)
   - 30-Day Average Hashrate (EH/s)

2. **Mining Economics**
   - Hash Price (USD/TH/day)
   - Hash Value (USD/PH/day)
   - Daily Network Revenue (USD)

3. **Transaction Fees**
   - Average Fees per Block (BTC)
   - Fees as % of Revenue

4. **1-Year Trend**
   - Relative Change (%)
   - Absolute Change (EH/s)

**Sample Output:**
```markdown
# 📊 Bitcoin Network Hashrate Statistics

## Current Metrics

- **Current Hashrate:** 756.42 EH/s
- **Estimated Hashrate:** 758.91 EH/s
- **30-Day Average:** 751.18 EH/s

## Mining Economics

- **Hash Price:** $0.0542/TH/day
- **Hash Value:** $54.20/PH/day
- **Daily Network Revenue:** $40,982,400

## Transaction Fees

- **Average Fees per Block:** 0.157 BTC
- **Fees as % of Revenue:** 4.8%

## 1-Year Trend

- **Relative Change:** +12.4%
- **Absolute Change:** +83.5 EH/s

---
*Data from Braiins Insights Dashboard*
*Timestamp: 2025-12-14T12:00:00Z*
```

**Error Scenarios:**
- API unavailable → Returns network error message
- Malformed API response → Returns validation error
- Timeout → Returns timeout error after 10 seconds

---

### braiins_difficulty_stats ✅

**Description:** Get current Bitcoin network difficulty statistics and next adjustment prediction.

**API Endpoint:** `GET /v1.0/difficulty-stats`

**Parameters:** None

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Example MCP Request:**
```json
{
  "name": "braiins_difficulty_stats",
  "arguments": {}
}
```

**Example Natural Language Queries:**
- "When is the next difficulty adjustment?"
- "What's the current network difficulty?"
- "How much will difficulty change at the next adjustment?"
- "Show me difficulty statistics"

**Response Format:**

Returns formatted markdown with:

1. **Current Metrics**
   - Current Difficulty (scientific notation + decimal)
   - Estimated Next Difficulty
   - Estimated Difficulty Change (%)

2. **Next Adjustment**
   - Blocks Until Adjustment
   - Estimated Adjustment Time
   - Last Adjustment Time

**Sample Output:**
```markdown
# ⛏️ Bitcoin Network Difficulty Statistics

## Current Metrics

- **Current Difficulty:** 1.10e+17 (109,780,000,000,000,000)
- **Estimated Next Difficulty:** 1.12e+17 (112,045,600,000,000,000)
- **Estimated Change:** +2.06%

## Next Adjustment

- **Blocks Until Adjustment:** 1,456
- **Estimated Adjustment Time:** Sat, 21 Dec 2025 18:30:00 GMT
- **Last Adjustment:** Sat, 07 Dec 2025 14:20:00 GMT

---
*Data from Braiins Insights Dashboard*
*Timestamp: 2025-12-14T12:00:00Z*
```

**Error Scenarios:**
- API unavailable → Returns network error message
- Invalid date format → Returns original ISO string
- Missing fields → Gracefully omits unavailable data

---

### braiins_rss_feed_data ✅

**Description:** Get recent Braiins blog posts, announcements, and news from the Braiins Insights RSS feed.

**API Endpoint:** `GET /v1.0/rss-feed-data`

**Parameters:** None

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Example MCP Request:**
```json
{
  "name": "braiins_rss_feed_data",
  "arguments": {}
}
```

**Example Natural Language Queries:**
- "What are the latest Braiins news and announcements?"
- "Show me recent Braiins blog posts"
- "Any new updates from Braiins?"
- "Get Braiins RSS feed"

**Response Format:**

Returns formatted markdown with:

1. **Recent Posts** (up to 10 most recent)
   - Post title (with clickable link)
   - Publication date and time
   - Author name (if available)
   - Topic categories (if available)
   - Article summary (truncated to 200 characters)

2. **Summary Statistics**
   - Total items displayed
   - Total items available (if paginated)

**Sample Output:**
```markdown
# 📰 Braiins News & Announcements

**Recent Posts:**

### 1. [Braiins Pool Launches Stratum V2 Support](https://braiins.com/blog/stratum-v2-launch)
- **Published:** December 10, 2025, 2:30 PM GMT
- **Author:** Jan Čapek
- **Topics:** Mining, Stratum V2, Protocol

Braiins Pool is proud to announce full support for Stratum V2, the next-generation mining protocol that improves efficiency, security, and decentralization for Bitcoin mining...

### 2. [Bitcoin Network Hashrate Reaches New All-Time High](https://braiins.com/blog/hashrate-ath-2025)
- **Published:** December 8, 2025, 10:15 AM GMT
- **Author:** Mining Analytics Team
- **Topics:** Network Stats, Hashrate, Mining

The Bitcoin network hashrate has reached a new all-time high of 780 EH/s, surpassing the previous record set in November. This milestone reflects continued investment...

---

**Total Items:** 10
(Showing 10 of 15 total posts)

*Data from Braiins Insights Dashboard*
```

**Notes:**
- Maximum 10 items displayed
- Items sorted by publication date (newest first)
- HTML tags removed from descriptions
- Long descriptions truncated at word boundaries

**Error Scenarios:**
- Empty feed → Returns "No recent posts available"
- Invalid RSS format → Returns format error message
- Network error → Returns network error

---

### braiins_halvings ✅

**Description:** Get Bitcoin halving schedule including next halving countdown, block rewards, and historical halving events.

**API Endpoint:** `GET /v2.0/halvings`

**Parameters:** None

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Example MCP Request:**
```json
{
  "name": "braiins_halvings",
  "arguments": {}
}
```

**Example Natural Language Queries:**
- "When is the next Bitcoin halving?"
- "How many blocks until the next halving?"
- "Show me the Bitcoin halving schedule"
- "What will the block reward be after the next halving?"
- "Show historical halving events"

**Response Format:**

Returns formatted markdown with:

1. **Next Halving**
   - Estimated Date (human-readable)
   - Countdown (years, days, hours)
   - Block Height (target)
   - Current Block Height
   - Blocks Remaining
   - Current Block Reward (BTC)
   - Next Block Reward (BTC)

2. **Historical Halvings** (table format)
   - Halving number (1st, 2nd, 3rd, etc.)
   - Date
   - Block height
   - Block reward after halving

**Sample Output:**
```markdown
# ⏳ Bitcoin Halving Schedule

## Next Halving

- **Estimated Date:** April 15, 2028, 6:00 AM UTC
- **Countdown:** ~3 years, 122 days
- **Block Height:** 1,050,000
- **Current Block Height:** 872,450
- **Blocks Remaining:** 177,550
- **Current Block Reward:** 3.125 BTC
- **Next Block Reward:** 1.5625 BTC

## Historical Halvings

| Halving | Date | Block Height | Block Reward |
|---------|------|--------------|--------------|
| 1st | November 28, 2012 | 210,000 | 25 BTC |
| 2nd | July 9, 2016 | 420,000 | 12.5 BTC |
| 3rd | May 11, 2020 | 630,000 | 6.25 BTC |
| 4th | April 19, 2024 | 840,000 | 3.125 BTC |

---
*Data from Braiins Insights Dashboard*
```

**Notes:**
- Halving occurs every 210,000 blocks (~4 years)
- Countdown dynamically calculated from current time
- Historical halvings sorted chronologically

**Error Scenarios:**
- Past halving date → Shows "Halving has already occurred"
- Invalid date calculation → Shows "Unable to calculate"
- Network error → Returns network error

---

## Parameterized Tools

These tools accept input parameters to customize queries and filter results.

### braiins_blocks ✅

**Description:** Get recent Bitcoin blocks with optional pagination and date range filtering.

**API Endpoint:** `GET /v1.0/blocks`

**Parameters:**

| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `page` | number | No | 1 | Min: 1 | Page number (1-indexed) |
| `page_size` | number | No | 10 | Min: 1, Max: 100 | Number of blocks per page |
| `start_date` | string | No | - | Format: YYYY-MM-DD | Filter blocks after this date |
| `end_date` | string | No | - | Format: YYYY-MM-DD | Filter blocks before this date |

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "page": {
      "type": "number",
      "description": "Page number (1-indexed)",
      "default": 1,
      "minimum": 1
    },
    "page_size": {
      "type": "number",
      "description": "Number of blocks per page",
      "default": 10,
      "minimum": 1,
      "maximum": 100
    },
    "start_date": {
      "type": "string",
      "description": "Filter blocks after this date (ISO 8601: YYYY-MM-DD)",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "end_date": {
      "type": "string",
      "description": "Filter blocks before this date (ISO 8601: YYYY-MM-DD)",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    }
  },
  "required": []
}
```

**Example MCP Requests:**

**Basic usage (defaults):**
```json
{
  "name": "braiins_blocks",
  "arguments": {}
}
```

**Custom page size:**
```json
{
  "name": "braiins_blocks",
  "arguments": {
    "page_size": 20
  }
}
```

**Pagination:**
```json
{
  "name": "braiins_blocks",
  "arguments": {
    "page": 2,
    "page_size": 50
  }
}
```

**Date range filter:**
```json
{
  "name": "braiins_blocks",
  "arguments": {
    "start_date": "2025-12-10",
    "end_date": "2025-12-13",
    "page_size": 100
  }
}
```

**Example Natural Language Queries:**
- "Show me the last 10 blocks" → `{}`
- "Show me the last 20 blocks" → `{ page_size: 20 }`
- "Show blocks from page 3" → `{ page: 3 }`
- "Show blocks mined on December 10, 2025" → `{ start_date: "2025-12-10", end_date: "2025-12-10" }`
- "Show the last 50 blocks from this week" → `{ start_date: "2025-12-08", page_size: 50 }`

**Response Format:**

Returns formatted markdown with:

1. **Filter Information**
   - Applied filters (page, page_size, date range)

2. **Blocks Table**
   - Height
   - Mining Pool
   - Timestamp (relative: "2m ago", "1h ago")
   - Transaction Count
   - Block Size (MB)
   - Block Hash (shortened)

3. **Summary Statistics**
   - Total blocks displayed
   - Average block size
   - Average transactions per block

**Sample Output:**
```markdown
# 🧱 Recent Bitcoin Blocks

**Filters Applied:**
- Page: 1
- Page Size: 10

**Blocks:**

| Height  | Pool        | Timestamp    | Transactions | Size    | Hash (short) |
|---------|-------------|--------------|--------------|---------|--------------|
| 872,450 | Braiins     | 2m ago       | 3,247        | 1.42 MB | `00000000...a3f8e2` |
| 872,449 | Foundry USA | 12m ago      | 2,891        | 1.38 MB | `00000000...b7c9d1` |
| 872,448 | AntPool     | 25m ago      | 3,105        | 1.45 MB | `00000000...c2d4e5` |
| 872,447 | F2Pool      | 38m ago      | 2,756        | 1.35 MB | `00000000...d8e3f6` |
| 872,446 | ViaBTC      | 51m ago      | 3,421        | 1.48 MB | `00000000...e4f5a7` |
| 872,445 | Braiins     | 1h ago       | 2,998        | 1.41 MB | `00000000...f9a6b8` |
| 872,444 | Foundry USA | 1h ago       | 3,156        | 1.43 MB | `00000000...a1b7c9` |
| 872,443 | Luxor       | 1h ago       | 2,845        | 1.37 MB | `00000000...b2c8da` |
| 872,442 | AntPool     | 2h ago       | 3,287        | 1.46 MB | `00000000...c3d9eb` |
| 872,441 | Marathon   | 2h ago       | 3,019        | 1.42 MB | `00000000...d4eafc` |

**Summary:**
- Total Blocks Displayed: 10
- Average Block Size: 1.42 MB
- Average Transactions/Block: 3,073

---
*Data retrieved from Braiins Insights Dashboard*
*Timestamp: 2025-12-14T12:00:00Z*
```

**Empty Result Example:**
```markdown
# 🧱 Recent Bitcoin Blocks

⚠️ **No blocks found** for the specified criteria.

**Filters:**
- Page: 5
- Page Size: 10
- Date Range: 2025-12-01 to 2025-12-05

Try adjusting your filters or page number.
```

**Validation Errors:**

Invalid page number:
```
❌ **Validation Error**: Invalid input parameters

- page: Page number must be at least 1

Please check your input and try again.
```

Invalid date format:
```
❌ **Validation Error**: Invalid input parameters

- start_date: Start date must be in YYYY-MM-DD format

Please check your input and try again.
```

Date range error:
```
❌ **Validation Error**: Invalid input parameters

- start_date: start_date must be before or equal to end_date

Please check your input and try again.
```

**Error Scenarios:**
- Invalid pagination → Returns validation error
- Invalid date format → Returns validation error
- start_date > end_date → Returns validation error
- Empty results → Returns helpful "no blocks found" message
- Network error → Returns network error
- API error → Returns API error with status code

---

### braiins_profitability_calculator ✅

**Description:** Calculate Bitcoin mining profitability based on electricity cost and hardware efficiency with optional ROI analysis.

**API Endpoint:** `GET /v2.0/profitability-calculator`

**Parameters:**

| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `electricity_cost_kwh` | number | **Yes** | - | Min: 0, Max: 1 | Electricity cost in USD per kWh |
| `hardware_efficiency_jth` | number | **Yes** | - | Min: 1, Max: 200 | Hardware efficiency in joules per terahash |
| `hardware_cost_usd` | number | No | - | Min: 0 | Hardware cost in USD for ROI calculation |

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "electricity_cost_kwh": {
      "type": "number",
      "description": "Electricity cost in USD per kilowatt-hour",
      "minimum": 0,
      "maximum": 1
    },
    "hardware_efficiency_jth": {
      "type": "number",
      "description": "Hardware efficiency in joules per terahash (e.g., Antminer S19 Pro: ~29.5 J/TH, S21: ~17.5 J/TH)",
      "minimum": 1,
      "maximum": 200
    },
    "hardware_cost_usd": {
      "type": "number",
      "description": "Optional: Hardware cost in USD for ROI calculation",
      "minimum": 0
    }
  },
  "required": ["electricity_cost_kwh", "hardware_efficiency_jth"]
}
```

**Hardware Efficiency Reference:**

| ASIC Model | Efficiency (J/TH) | Typical Use Case |
|------------|-------------------|------------------|
| Antminer S21 | ~17.5 | Latest generation, most efficient |
| Antminer S19 XP | ~21.5 | High efficiency, 2022+ |
| Antminer S19 Pro | ~29.5 | Common, moderate efficiency |
| Antminer S19 | ~34.5 | Older generation |
| Antminer S17 | ~45 | Legacy hardware |
| WhatsMiner M50 | ~26 | Competitor to S19 series |

**Example MCP Requests:**

**Basic profitability (S19 Pro at $0.08/kWh):**
```json
{
  "name": "braiins_profitability_calculator",
  "arguments": {
    "electricity_cost_kwh": 0.08,
    "hardware_efficiency_jth": 29.5
  }
}
```

**With ROI calculation:**
```json
{
  "name": "braiins_profitability_calculator",
  "arguments": {
    "electricity_cost_kwh": 0.05,
    "hardware_efficiency_jth": 17.5,
    "hardware_cost_usd": 5000
  }
}
```

**High electricity cost scenario:**
```json
{
  "name": "braiins_profitability_calculator",
  "arguments": {
    "electricity_cost_kwh": 0.15,
    "hardware_efficiency_jth": 34.5
  }
}
```

**Example Natural Language Queries:**
- "Is mining profitable at $0.08/kWh with an Antminer S19 Pro?" → `{ electricity_cost_kwh: 0.08, hardware_efficiency_jth: 29.5 }`
- "Calculate ROI for $3000 hardware at $0.05/kWh and 25 J/TH efficiency" → `{ electricity_cost_kwh: 0.05, hardware_efficiency_jth: 25, hardware_cost_usd: 3000 }`
- "What's my daily profit with $0.12/kWh electricity and S21 efficiency?" → `{ electricity_cost_kwh: 0.12, hardware_efficiency_jth: 17.5 }`
- "Is mining profitable with cheap electricity at $0.03/kWh?" → `{ electricity_cost_kwh: 0.03, hardware_efficiency_jth: 29.5 }`

**Response Format:**

Returns formatted markdown with:

1. **Input Parameters Summary**
   - Electricity cost ($/kWh)
   - Hardware efficiency (J/TH)
   - Hardware cost (if provided)

2. **Profitability Metrics**
   - Profitability indicator badge (✅ profitable / ❌ unprofitable)
   - Daily revenue per TH/s
   - Daily electricity cost per TH/s
   - Net daily profit per TH/s with badge
   - Monthly profit projection (30 days)
   - Annual profit projection (365 days)

3. **ROI Analysis** (if hardware cost provided)
   - Hardware cost
   - Estimated ROI period (days, months, years)
   - Daily progress percentage

4. **Break-Even Analysis**
   - Break-even BTC price
   - Current BTC price with comparison indicator
   - Break-even hashrate
   - Profitability threshold ($/kWh)

5. **Network Context**
   - Current network difficulty
   - Market condition assessment

6. **Warnings/Recommendations**
   - Profitability warnings for marginal or unprofitable scenarios
   - Recommendations based on current conditions

**Sample Output (Profitable Scenario):**
```markdown
# ⚡ Bitcoin Mining Profitability Analysis

## Input Parameters

- **Electricity Cost:** $0.0500/kWh
- **Hardware Efficiency:** 17.5 J/TH
- **Hardware Cost:** $5,000.00

## Profitability Metrics ✅

### Daily Metrics (per TH/s)

- **Daily Revenue:** $0.0542/TH
- **Daily Electricity Cost:** $0.0210/TH
- **Net Daily Profit:** +$0.0332/TH (Highly Profitable)

### Extended Projections

- **Monthly Profit:** +$0.996/TH (30 days)
- **Annual Profit:** +$12.118/TH (365 days)

## Return on Investment

- **Hardware Cost:** $5,000.00
- **Estimated ROI Period:** 487 days (16.2 months / 1.33 years)
- **Daily Progress:** 0.21% of investment

## Break-Even Analysis

- **Break-even BTC Price:** $28,450.00
- **Current BTC Price:** $96,250.00 ✅ (Well above break-even)
- **Break-even Hashrate:** 8.42 TH/s
- **Profitability Threshold:** $0.1284/kWh

## Network Context

- **Network Difficulty:** 1.10e+17
- **Current Market Conditions:** Excellent - High profit margins

---

*Data retrieved from Braiins Insights Dashboard*
*Calculations based on current network conditions as of 2025-12-14T12:00:00Z*
*Profitability estimates assume stable network conditions and BTC price.*
```

**Sample Output (Unprofitable Scenario):**
```markdown
# ⚡ Bitcoin Mining Profitability Analysis

## Input Parameters

- **Electricity Cost:** $0.1500/kWh
- **Hardware Efficiency:** 34.5 J/TH

## Profitability Metrics ❌

### Daily Metrics (per TH/s)

- **Daily Revenue:** $0.0542/TH
- **Daily Electricity Cost:** $0.1242/TH
- **Net Daily Profit:** -$0.0700/TH (Unprofitable)

### Extended Projections

- **Monthly Profit:** -$2.100/TH (30 days)
- **Annual Profit:** -$25.550/TH (365 days)

## Break-Even Analysis

- **Break-even BTC Price:** $218,500.00
- **Current BTC Price:** $96,250.00 ❌ (Well below break-even)
- **Break-even Hashrate:** 45.2 TH/s
- **Profitability Threshold:** $0.0436/kWh

## Network Context

- **Network Difficulty:** 1.10e+17
- **Current Market Conditions:** Critical - Significant losses

---

*Data retrieved from Braiins Insights Dashboard*
*Calculations based on current network conditions as of 2025-12-14T12:00:00Z*
*⚠️ WARNING: Mining is currently unprofitable with these parameters. Consider reducing electricity costs or upgrading hardware.*
```

**Validation Errors:**

Missing required parameters:
```
❌ **Invalid Input Parameters**

- electricity_cost_kwh: Required
- hardware_efficiency_jth: Required

**Required parameters:**
- electricity_cost_kwh: number (0-1)
- hardware_efficiency_jth: number (1-200)

**Optional:**
- hardware_cost_usd: number (≥0)
```

Out of range electricity cost:
```
❌ **Invalid Input Parameters**

- electricity_cost_kwh: Electricity cost unreasonably high (>$1/kWh)

**Required parameters:**
- electricity_cost_kwh: number (0-1)
- hardware_efficiency_jth: number (1-200)
```

Negative hardware cost:
```
❌ **Invalid Input Parameters**

- hardware_cost_usd: Hardware cost cannot be negative

**Required parameters:**
- electricity_cost_kwh: number (0-1)
- hardware_efficiency_jth: number (1-200)

**Optional:**
- hardware_cost_usd: number (≥0)
```

**Error Scenarios:**
- Missing required parameters → Returns validation error listing missing params
- Invalid parameter types → Returns Zod validation error
- Out-of-range values → Returns range validation error
- Network error → Returns network error
- API error → Returns API error with status code

**Notes:**
- All profitability calculations assume current network conditions
- Results change with BTC price and network difficulty
- ROI calculations don't account for hardware depreciation
- Assumes 100% uptime (no downtime or maintenance)
- Transaction fees included in revenue calculations

---

## Planned Tools

These tools are documented in the API but not yet implemented in the MCP server.

### Simple Stats Tools (Planned)

#### braiins_price_stats 📋 PLANNED
- **Description:** Bitcoin price statistics with 24h change
- **Endpoint:** `GET /v1.0/price-stats`
- **Parameters:** None

#### braiins_transaction_stats 📋 PLANNED
- **Description:** Mempool size, transaction fees, and confirmation times
- **Endpoint:** `GET /v1.0/transaction-stats`
- **Parameters:** None

#### braiins_pool_stats 📋 PLANNED
- **Description:** Mining pool distribution by hashrate
- **Endpoint:** `GET /v1.0/pool-stats`
- **Parameters:** None

### Parameterized Tools (Planned)

#### braiins_blocks_by_country 📋 PLANNED
- **Description:** Bitcoin blocks mined by country with geographic distribution
- **Endpoint:** `GET /v1.0/blocks-by-country`
- **Parameters:** `page`, `page_size`

#### braiins_cost_to_mine 📋 PLANNED
- **Description:** Calculate cost to mine 1 BTC with electricity cost input
- **Endpoint:** `GET /v2.0/cost-to-mine`
- **Parameters:** `electricity_cost_kwh` (optional)

#### braiins_hardware_stats 📋 PLANNED
- **Description:** Hardware specifications and performance metrics
- **Endpoint:** `POST /v1.0/hardware-stats`
- **Parameters:** `models` (array of hardware model names)

### Historical Data Tools (Planned)

#### braiins_daily_revenue_history 📋 PLANNED
- **Description:** 30-day mining revenue trend
- **Endpoint:** `GET /v1.0/daily-revenue-history`
- **Parameters:** Date range

#### braiins_hashrate_and_difficulty_history 📋 PLANNED
- **Description:** Historical network hashrate and difficulty metrics
- **Endpoint:** `GET /v1.0/hashrate-and-difficulty-history`
- **Parameters:** Date range, aggregation level

#### braiins_hashrate_value_history 📋 PLANNED
- **Description:** Hashrate price correlation over time
- **Endpoint:** `GET /v1.0/hashrate-value-history`
- **Parameters:** Date range

#### braiins_transaction_fees_history 📋 PLANNED
- **Description:** Historical transaction fee market evolution
- **Endpoint:** `GET /v1.0/transaction-fees-history`
- **Parameters:** Date range

### Composite Tools (Planned)

#### braiins_mining_overview 📋 PLANNED
- **Description:** Comprehensive mining ecosystem snapshot
- **Combines:** `hashrate_stats + difficulty_stats + blocks + price_stats`
- **Parameters:** Optional filters

#### braiins_profitability_deep_dive 📋 PLANNED
- **Description:** Detailed profitability analysis with historical context
- **Combines:** `profitability_calculator + cost_to_mine + price_stats + hashrate_value_history`
- **Parameters:** Electricity cost, hardware efficiency, date range

#### braiins_network_health_monitor 📋 PLANNED
- **Description:** Network health indicators and anomaly detection
- **Combines:** `hashrate_and_difficulty_history + blocks + transaction_stats`
- **Parameters:** Date range, alert thresholds

---

## Tool Categories

### By Complexity

**Simple (No Parameters):**
- ✅ `braiins_hashrate_stats`
- ✅ `braiins_difficulty_stats`
- ✅ `braiins_rss_feed_data`
- ✅ `braiins_halvings`
- 📋 `braiins_price_stats`
- 📋 `braiins_transaction_stats`
- 📋 `braiins_pool_stats`

**Parameterized (Optional Parameters):**
- ✅ `braiins_blocks`
- 📋 `braiins_blocks_by_country`
- 📋 `braiins_cost_to_mine`

**Parameterized (Required Parameters):**
- ✅ `braiins_profitability_calculator`
- 📋 `braiins_hardware_stats`

**Historical (Date Range Parameters):**
- 📋 `braiins_daily_revenue_history`
- 📋 `braiins_hashrate_and_difficulty_history`
- 📋 `braiins_hashrate_value_history`
- 📋 `braiins_transaction_fees_history`

**Composite (Multi-Endpoint Aggregation):**
- 📋 `braiins_mining_overview`
- 📋 `braiins_profitability_deep_dive`
- 📋 `braiins_network_health_monitor`

### By Data Type

**Network Statistics:**
- ✅ `braiins_hashrate_stats`
- ✅ `braiins_difficulty_stats`
- 📋 `braiins_transaction_stats`
- 📋 `braiins_pool_stats`

**Block Data:**
- ✅ `braiins_blocks`
- 📋 `braiins_blocks_by_country`

**Economic Analysis:**
- ✅ `braiins_profitability_calculator`
- 📋 `braiins_cost_to_mine`
- 📋 `braiins_price_stats`

**Reference Data:**
- ✅ `braiins_halvings`
- 📋 `braiins_hardware_stats`

**News/Updates:**
- ✅ `braiins_rss_feed_data`

**Historical Trends:**
- 📋 `braiins_daily_revenue_history`
- 📋 `braiins_hashrate_and_difficulty_history`
- 📋 `braiins_hashrate_value_history`
- 📋 `braiins_transaction_fees_history`

### By Update Frequency

**Real-time (30s-1min cache):**
- ✅ `braiins_blocks`

**Frequent (5-10min cache):**
- ✅ `braiins_hashrate_stats`
- ✅ `braiins_difficulty_stats`
- ✅ `braiins_profitability_calculator`
- 📋 `braiins_price_stats`
- 📋 `braiins_transaction_stats`

**Moderate (1-24hr cache):**
- 📋 `braiins_pool_stats`
- 📋 Historical data tools

**Static (24hr+ cache):**
- ✅ `braiins_halvings`
- 📋 `braiins_hardware_stats`

**Dynamic (no cache):**
- ✅ `braiins_rss_feed_data`

---

## Error Handling

All tools follow consistent error handling patterns:

### Error Types

**1. Validation Errors** (Invalid Input)
```markdown
❌ **Validation Error**: Invalid input parameters

- parameter_name: error description

Please check your input and try again.
```

**2. Network Errors** (Connection Issues)
```markdown
❌ **Network Error**: Could not reach Braiins Insights API

Details: Connection timeout after 10 seconds

Please check your internet connection.
```

**3. API Errors** (Server Issues)
```markdown
❌ **API Error**: Internal server error

Status: 500

Please try again later or check the Braiins Insights API status.
```

**4. Response Validation Errors** (Malformed API Response)
```markdown
❌ **Response Validation Error**: The API returned unexpected data format

Please report this issue.
```

**5. Unexpected Errors** (Unknown Issues)
```markdown
❌ **Unexpected Error**: [error message]

Please report this issue if it persists.
```

### Error Response Format

All error responses follow the MCP error format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[Error message with details and recommendations]"
    }
  ],
  "isError": true
}
```

### Debugging Tips

**Common Issues:**

1. **Tool not found**
   - Ensure server is running and connected
   - Check tool name spelling (case-sensitive)
   - Verify tool is implemented (check version)

2. **Validation errors**
   - Review parameter types (number vs string)
   - Check parameter constraints (min/max values)
   - Verify required parameters are provided
   - Check date format (YYYY-MM-DD)

3. **Network errors**
   - Verify internet connectivity
   - Check firewall settings
   - Ensure https://insights.braiins.com is accessible

4. **Empty results**
   - Adjust query parameters (date range, page number)
   - Try broader filters
   - Check if data exists for the time period

5. **Unexpected data format**
   - Report issue with full error message
   - Include timestamp and parameters used
   - API format may have changed

---

## Version History

**v0.2.0 (Current)** - December 14, 2025
- ✅ Implemented 5 core tools
  - `braiins_hashrate_stats`
  - `braiins_difficulty_stats`
  - `braiins_rss_feed_data`
  - `braiins_halvings`
  - `braiins_blocks`
  - `braiins_profitability_calculator`

**v0.1.0** - December 13, 2025
- Initial release with `braiins_hashrate_stats`

---

## Support

**Documentation:**
- [README.md](./README.md) - Quick start guide
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) - Practical usage examples
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture

**Issues & Questions:**
- GitHub Issues: https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/issues
- Email: support@ryno.services

**API Reference:**
- [API.md](./API.md) - Braiins Insights API documentation
- Live Dashboard: https://insights.braiins.com

---

**Last Updated:** December 14, 2025
**Document Version:** 1.0
**Server Version:** 0.2.0
