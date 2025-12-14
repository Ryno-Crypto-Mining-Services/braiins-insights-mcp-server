# API Discovery Report: /v1.0/hashrate-stats

## Discovery Metadata

- **Endpoint Path**: `/v1.0/hashrate-stats`
- **Discovery Date**: 2025-12-13
- **API Base URL**: `https://insights.braiins.com/api` (redirects to `https://learn.braiins.com/api`)
- **HTTP Method**: `GET` (POST returns 405 Method Not Allowed)
- **Authentication**: None required (public endpoint)

## Executive Summary

The `/v1.0/hashrate-stats` endpoint returns a **snapshot of current Bitcoin network hashrate statistics** and mining economics metrics. This is a **parameter-free endpoint** that always returns the latest available data. All tested parameters (pagination, date filtering, sorting) are **ignored** - the response is identical regardless of query string.

## Response Structure

### Baseline Response (No Parameters)

```bash
curl -L https://insights.braiins.com/api/v1.0/hashrate-stats
```

```json
{
  "avg_fees_per_block": 0.016,
  "current_hashrate": 1001.23,
  "current_hashrate_estimated": 1146.5,
  "fees_percent": 0.5,
  "hash_price": 0.039,
  "hash_rate_30": 1074.37,
  "hash_value": 4e-7,
  "monthly_avg_hashrate_change_1_year": {
    "relative": 0.03,
    "absolute": 29.47665536
  },
  "rev_usd": 40872449.1
}
```

### Field Definitions

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `avg_fees_per_block` | number | BTC | Average transaction fees per block |
| `current_hashrate` | number | EH/s | Current network hashrate in exahashes per second |
| `current_hashrate_estimated` | number | EH/s | Estimated current hashrate (alternative calculation) |
| `fees_percent` | number | % | Transaction fees as percentage of total block reward |
| `hash_price` | number | USD/TH/day | Price per terahash per day |
| `hash_rate_30` | number | EH/s | 30-day average hashrate |
| `hash_value` | number | BTC/TH/day | Daily revenue per terahash in BTC |
| `monthly_avg_hashrate_change_1_year` | object | - | Year-over-year hashrate change |
| `monthly_avg_hashrate_change_1_year.relative` | number | decimal | Relative change (0.03 = 3% increase) |
| `monthly_avg_hashrate_change_1_year.absolute` | number | EH/s | Absolute change in EH/s |
| `rev_usd` | number | USD | Total network daily revenue in USD |

### Data Freshness

- **Update Frequency**: Real-time/near-real-time (varies by metric)
- **Caching**: Cloudflare CDN with dynamic caching (no explicit Cache-Control headers)
- **Timestamp**: No explicit timestamp field in response (use HTTP `Date` header)

## Parameter Discovery Results

### Pagination Parameters

**Tested**: `page`, `page_size`, `limit`, `offset`

**Result**: ❌ **NOT SUPPORTED** - All pagination parameters are ignored

```bash
# All return identical response
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats"
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats?page=1"
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats?page_size=10"
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats?limit=20&offset=5"
```

### Date Filtering Parameters

**Tested**: `start_date`, `end_date`, `days`, `hours`

**Result**: ❌ **NOT SUPPORTED** - Date parameters are ignored

```bash
# All return current snapshot
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats?start_date=2025-12-01"
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats?days=7"
```

**Recommendation**: For historical hashrate data, use `/v1.0/hashrate-and-difficulty-history` endpoint instead.

### Sorting Parameters

**Tested**: `sort`, `order`, `order_by`, `sort_by`

**Result**: ❌ **NOT SUPPORTED** - Sorting parameters are ignored (N/A for single-object response)

### Domain-Specific Filtering

**Tested**: `pool`, `country`, `min_hashrate`, `max_hashrate`

**Result**: ❌ **NOT SUPPORTED** - Endpoint returns network-wide aggregates only

## Edge Cases and Error Scenarios

### Invalid Parameters

**Behavior**: API **ignores** invalid parameters without error

```bash
curl -L "https://insights.braiins.com/api/v1.0/hashrate-stats?invalid_param=test"
# Returns: Normal 200 OK response (parameter ignored)
```

### Unsupported HTTP Methods

**HEAD Request**:
```bash
curl -I https://learn.braiins.com/api/v1.0/hashrate-stats
# Returns: HTTP 405 Method Not Allowed
```

**POST Request**:
```bash
curl -X POST https://insights.braiins.com/api/v1.0/hashrate-stats
# Returns: "HTTP method not allowed"
```

**Supported Methods**: `GET` only

### Rate Limiting

**Testing**: Not observed during discovery testing (20+ requests in 2 minutes)

**Cloudflare Protection**: Endpoint is behind Cloudflare CDN
- `cf-cache-status: DYNAMIC` (not cached at edge)
- `cf-ray` header present for tracing

**Recommendation**: Implement conservative client-side rate limiting (60 requests/minute)

### Network Errors

**Redirect Behavior**:
```
https://insights.braiins.com/api/v1.0/hashrate-stats
  → 302 redirect to
https://learn.braiins.com/api/v1.0/hashrate-stats
```

**Client Recommendation**: Use `-L` flag (follow redirects) or update base URL to `https://learn.braiins.com/api`

## Response Headers Analysis

```
HTTP/2 302
location: https://learn.braiins.com/api/v1.0/hashrate-stats
cache-control: private, max-age=0, no-store, no-cache, must-revalidate
server: cloudflare
cf-cache-status: DYNAMIC
```

**Key Observations**:
- Redirect from `insights.braiins.com` to `learn.braiins.com`
- No server-side caching (`no-store`, `no-cache`)
- Cloudflare CDN with dynamic content
- No explicit rate limit headers

## Type System Recommendations

### TypeScript Interface

```typescript
/**
 * Response from GET /v1.0/hashrate-stats
 *
 * Returns current Bitcoin network hashrate statistics and mining economics.
 * This is a snapshot endpoint with no parameters - always returns latest data.
 */
interface BraiinsInsightsHashrateStats {
  /** Average transaction fees per block (BTC) */
  avg_fees_per_block: number;

  /** Current network hashrate (EH/s) */
  current_hashrate: number;

  /** Estimated current hashrate using alternative calculation (EH/s) */
  current_hashrate_estimated: number;

  /** Transaction fees as percentage of total block reward */
  fees_percent: number;

  /** Hash price: USD per terahash per day */
  hash_price: number;

  /** 30-day average network hashrate (EH/s) */
  hash_rate_30: number;

  /** Hash value: Daily revenue per terahash (BTC/TH/day) */
  hash_value: number;

  /** Year-over-year hashrate change statistics */
  monthly_avg_hashrate_change_1_year: {
    /** Relative change (0.03 = 3% increase) */
    relative: number;

    /** Absolute change in EH/s */
    absolute: number;
  };

  /** Total network daily revenue (USD) */
  rev_usd: number;
}

/**
 * Input schema for braiins_hashrate_stats tool
 *
 * Note: This endpoint accepts no parameters. All query parameters are ignored.
 */
interface BraiinsHashrateStatsInput {
  // No parameters
}
```

### Zod Schema (Runtime Validation)

```typescript
import { z } from 'zod';

const BraiinsInsightsHashrateStatsSchema = z.object({
  avg_fees_per_block: z.number().nonnegative(),
  current_hashrate: z.number().positive(),
  current_hashrate_estimated: z.number().positive(),
  fees_percent: z.number().nonnegative().max(100),
  hash_price: z.number().nonnegative(),
  hash_rate_30: z.number().positive(),
  hash_value: z.number().nonnegative(),
  monthly_avg_hashrate_change_1_year: z.object({
    relative: z.number(),
    absolute: z.number()
  }),
  rev_usd: z.number().nonnegative()
});

const BraiinsHashrateStatsInputSchema = z.object({
  // No parameters - empty schema
}).strict();
```

## MCP Tool Design Recommendations

### Tool Schema

```json
{
  "name": "braiins_hashrate_stats",
  "description": "Get current Bitcoin network hashrate statistics including current hashrate, 30-day average, hash price, hash value, and mining revenue metrics. Returns a snapshot of latest data with no historical lookback.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  }
}
```

**Category**: Simple snapshot tool (no parameters)

### Response Formatting Strategy

**Markdown Output Structure**:

```markdown
# 📊 Bitcoin Network Hashrate Statistics

## Current Network Metrics

- **Current Hashrate**: 1,001.23 EH/s
- **Estimated Hashrate**: 1,146.50 EH/s
- **30-Day Average**: 1,074.37 EH/s

## Mining Economics

- **Hash Price**: $0.039 USD/TH/day
- **Hash Value**: 0.0000004 BTC/TH/day
- **Network Revenue**: $40,872,449.10 USD/day

## Transaction Fees

- **Avg Fees/Block**: 0.016 BTC
- **Fees % of Reward**: 0.5%

## Year-over-Year Change

- **Absolute**: +29.48 EH/s
- **Relative**: +3.0%

---
*Data from Braiins Insights API*
```

### Caching Recommendations

**Client-Side Caching**:
- **TTL**: 5 minutes (data updates frequently but not real-time)
- **Cache Key**: `hashrate-stats` (no parameters to vary)
- **Invalidation**: Time-based only

**Rationale**: Reduce API load for repeated queries within same session

## Test Fixture

**Location**: `tests/integration/fixtures/hashrate-stats.json`

```json
{
  "endpoint": "/v1.0/hashrate-stats",
  "method": "GET",
  "parameters": null,
  "response": {
    "status": 200,
    "body": {
      "avg_fees_per_block": 0.016,
      "current_hashrate": 1001.23,
      "current_hashrate_estimated": 1146.5,
      "fees_percent": 0.5,
      "hash_price": 0.039,
      "hash_rate_30": 1074.37,
      "hash_value": 4e-7,
      "monthly_avg_hashrate_change_1_year": {
        "relative": 0.03,
        "absolute": 29.47665536
      },
      "rev_usd": 40872449.1
    }
  },
  "captured_at": "2025-12-13T03:25:00Z"
}
```

## Implementation Checklist

- [ ] Update API.md with "No parameters" note
- [ ] Create `src/types/insights-api.ts` with `BraiinsInsightsHashrateStats` interface
- [ ] Implement `InsightsApiClient.getHashrateStats()` method
- [ ] Implement `braiins_hashrate_stats` MCP tool
- [ ] Add response transformation to markdown
- [ ] Create test fixture at `tests/integration/fixtures/hashrate-stats.json`
- [ ] Write unit tests for tool
- [ ] Write integration test (calls real API)
- [ ] Add 5-minute client-side caching
- [ ] Document in README.md with example query

## Related Endpoints

For related data:
- **Historical hashrate**: `/v1.0/hashrate-and-difficulty-history`
- **Difficulty stats**: `/v1.0/difficulty-stats`
- **Network blocks**: `/v1.0/blocks`
- **Pool distribution**: `/v1.0/pool-stats`

## Discovery Limitations

**Untested Scenarios**:
- High-frequency request patterns (100+ req/min) to confirm rate limits
- Behavior during network difficulty adjustment events
- Behavior during Bitcoin halving events
- Response consistency across multiple Cloudflare edge locations

**Recommendation**: Monitor production usage for edge cases not covered in discovery testing.

---

**Discovery Completed**: 2025-12-13
**Discoverer**: Claude (Braiins Insights MCP Server)
**Next Steps**: Implement tool following recommendations above
