# Braiins Insights Public API (MCP Integration)

This document defines how the MCP server for Braiins Insights exposes the public API endpoints from `https://insights.braiins.com/api`. 

Base URL: `https://insights.braiins.com/api` 

---

## Design Goals

- Provide typed tools for each Insights endpoint.
- Keep the MCP surface minimal and composable for agents.
- Allow both simple (no-parameter) and parameterized calls where supported. 

---

## Endpoints Covered

The MCP server will expose tools for the following Insights endpoints. 

- `GET /v1.0/adjustment-tracker-widget`  
- `GET/POST /v1.0/blocks`  
- `GET/POST /v1.0/blocks-by-country`  
- `GET /v1.0/daily-revenue-history`  
- `GET /v1.0/difficulty-stats`  
- `POST /v1.0/hardware-stats`  
- `GET /v1.0/hashrate-and-difficulty-history`  
- `GET /v1.0/hashrate-stats`  
- `GET /v1.0/hashrate-value-history`  
- `GET /v1.0/pool-stats`  
- `GET /v1.0/price-stats`  
- `GET /v1.0/rss-feed-data`  
- `GET /v1.0/transaction-fees-history`  
- `GET /v1.0/transaction-stats`  
- `GET /v2.0/cost-to-mine`  
- `GET /v2.0/halvings`  
- `GET /v2.0/profitability-calculator` 

---

## MCP Tool Definitions (Conceptual)

Each endpoint is exposed as a tool named `braiins_<slug>`.   
Actual parameter schemas should be derived by inspecting the live API responses and any auxiliary docs.

### 1. Adjustment Tracker Widget

- **Tool name:** `braiins_adjustment_tracker_widget`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/adjustment-tracker-widget`  
- **Params:** none (per page, parameters not documented).   
- **Description:** Returns data used by the “Adjustment Tracked Widget” in Braiins Insights. 

### 2. Latest Blocks Mined

- **Tool name:** `braiins_blocks`  
- **HTTP method:** `GET` (prefer GET for MCP)  
- **Path:** `/v1.0/blocks`  
- **Params (example sketch):**
  - `page` (integer, optional)
  - `page_size` (integer, optional)
- **Description:** Paginated list of mined blocks in descending order. 

### 3. Latest Blocks Mined by Country

- **Tool name:** `braiins_blocks_by_country`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/blocks-by-country`  
- **Params:** likely similar to `/blocks`; confirm from responses.   
- **Description:** Mined block data aggregated by country. 

### 4. Daily Revenue History

- **Tool name:** `braiins_daily_revenue_history`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/daily-revenue-history`  
- **Params:** TBD from API behavior (e.g., date range).   
- **Description:** Historical daily revenue metrics. 

### 5. Difficulty Stats

- **Tool name:** `braiins_difficulty_stats`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/difficulty-stats`  
- **Params:** none (explicitly states no parameters).   
- **Description:** Current difficulty-related statistics. 

### 6. Hardware Stats

- **Tool name:** `braiins_hardware_stats`  
- **HTTP method:** `POST`  
- **Path:** `/v1.0/hardware-stats`  
- **Params/body:** request body likely specifies hardware models or filters; determine from actual responses.   
- **Description:** Stats for mining hardware models. 

### 7. Hashrate and Difficulty History

- **Tool name:** `braiins_hashrate_and_difficulty_history`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/hashrate-and-difficulty-history`  
- **Description:** Historical hashrate and difficulty series. 

### 8. Hashrate Stats

- **Tool name:** `braiins_hashrate_stats`
- **HTTP method:** `GET`
- **Path:** `/v1.0/hashrate-stats`
- **Authentication:** None (public endpoint)
- **Query Parameters:** None supported (tested: page, start_date, format - all ignored)
- **Response Type:** `BraiinsInsightsHashrateStats` (see `src/types/insights-api.ts`)
- **Cache TTL:** 5 minutes (300,000ms)
- **Discovery Status:** ✅ Complete (see `docs/api-discovery/hashrate-stats.md`)
- **Description:** Current Bitcoin network hashrate statistics including:
  - Current and estimated hashrate (EH/s)
  - 30-day average hashrate
  - Hash price and value (USD/TH/day)
  - Transaction fee metrics (avg fees per block, fees as % of revenue)
  - 1-year hashrate change trends (relative % and absolute EH/s)
  - Daily network revenue (USD)
- **Example Response Fields:**
  - `current_hashrate`: 1094.42 (EH/s)
  - `current_hashrate_estimated`: 1148.46 (EH/s)
  - `hash_rate_30`: 1075.4 (EH/s)
  - `hash_price`: 0.038 (USD/TH/day)
  - `avg_fees_per_block`: 0.015 (BTC)
  - `fees_percent`: 0.48 (%)
  - `monthly_avg_hashrate_change_1_year.relative`: 0.03 (3% increase)
  - `monthly_avg_hashrate_change_1_year.absolute`: 29.48 (EH/s)
  - `rev_usd`: 40809781.01 (USD)
- **Note:** Returns 302 redirect via Cloudflare; HTTP clients must follow redirects (use `curl -L`) 

### 9. Hashrate Value History

- **Tool name:** `braiins_hashrate_value_history`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/hashrate-value-history`  
- **Description:** Time series of hashrate value. 

### 10. Pool Stats

- **Tool name:** `braiins_pool_stats`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/pool-stats`  
- **Description:** Mining pool statistics for the dashboard. 

### 11. Price Stats

- **Tool name:** `braiins_price_stats`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/price-stats`  
- **Params:** none.   
- **Description:** Price-related statistics (e.g., BTC price metrics). 

### 12. RSS Feed Data

- **Tool name:** `braiins_rss_feed_data`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/rss-feed-data`  
- **Params:** none.   
- **Description:** Data backing the Insights RSS feed. 

### 13. Transaction Fees History

- **Tool name:** `braiins_transaction_fees_history`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/transaction-fees-history`  
- **Description:** Historical transaction fee data. 

### 14. Transaction Stats

- **Tool name:** `braiins_transaction_stats`  
- **HTTP method:** `GET`  
- **Path:** `/v1.0/transaction-stats`  
- **Params:** none.   
- **Description:** Current transaction statistics. 

### 15. Cost to Mine

- **Tool name:** `braiins_cost_to_mine`  
- **HTTP method:** `GET`  
- **Path:** `/v2.0/cost-to-mine`  
- **Description:** Data for the “Cost to Mine 1 BTC” calculator. 

### 16. Halvings

- **Tool name:** `braiins_halvings`  
- **HTTP method:** `GET`  
- **Path:** `/v2.0/halvings`  
- **Description:** Halving-related data used in Insights. 

### 17. Profitability Calculator

- **Tool name:** `braiins_profitability_calculator`  
- **HTTP method:** `GET`  
- **Path:** `/v2.0/profitability-calculator`  
- **Description:** Underlying data for the profitability calculator dashboard. 

---

## MCP Server Shape

Implementation details will depend on your MCP framework, but at a high level:

- Each tool:
  - Accepts a JSON object of query parameters (or body for POST).
  - Performs an HTTP request against the Insights base URL.
  - Returns the raw JSON from Braiins with minimal transformation. 

Example conceptual tool schema (pseudo-JSON):

```
{
  "name": "braiins_hashrate_stats",
  "description": "Get hashrate statistics from Braiins Insights",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

Fill in real schemas as you probe each endpoint from a REPL or test client.

---

## Notes and Next Steps

- Inspect live responses to:
  - Infer field types and ranges.
  - Decide which filters to expose as MCP parameters.
- Optionally add:
  - Caching for high-frequency endpoints.
  - Higher-level composite tools (e.g., “profitability_snapshot”) that orchestrate multiple API calls for agents. 

