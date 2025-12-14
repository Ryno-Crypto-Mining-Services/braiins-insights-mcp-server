---
name: braiins-api-discovery
description: Systematically explore Braiins Insights Dashboard API endpoints to discover undocumented parameters, validate response structures, and generate comprehensive type definitions
version: 1.0.0
created: 2025-12-13
author: Braiins Insights MCP Team
tags: [api, discovery, braiins, insights, exploration]
---

# Braiins API Discovery Skill

## Purpose

Systematically explore Braiins Insights Dashboard API endpoints to discover undocumented parameters, validate response structures, and generate comprehensive type definitions and test fixtures.

## When to Use This Skill

- ✅ Discovering undocumented query parameters for an endpoint
- ✅ Validating API response structures against type definitions
- ✅ Testing new or unknown API endpoints
- ✅ Generating fixtures for integration tests
- ✅ Documenting API behavior and edge cases
- ✅ Before implementing a new MCP tool

## Prerequisites

- API.md file exists with endpoint catalog
- Node.js 18+ installed
- Internet connection (calls real Braiins Insights API)
- Understanding of HTTP requests and JSON structures

## Core Workflow

### Phase 1: Baseline Endpoint Testing

**Task:** Test the endpoint with no parameters to understand the default response.

**Steps:**

1. **Identify Target Endpoint**
   ```bash
   # Review API.md for endpoint specification
   # Example: GET /v1.0/hashrate-stats
   ```

2. **Test Baseline Request**
   ```bash
   # Make request without parameters
   curl -s https://insights.braiins.com/api/v1.0/hashrate-stats | jq '.'

   # Save response for analysis
   curl -s https://insights.braiins.com/api/v1.0/hashrate-stats > baseline-response.json
   ```

3. **Analyze Response Structure**
   - Document response format (object, array, paginated)
   - Identify all fields and their types
   - Note any null or optional fields
   - Check for nested structures
   - Verify response headers (cache-control, content-type)

4. **Create Initial Documentation**
   ```markdown
   ## Baseline Response Analysis

   **Endpoint:** GET /v1.0/hashrate-stats
   **Authentication:** None required
   **Response Type:** Object
   **Response Time:** ~200ms

   ### Fields Identified:
   - current_hashrate: number (EH/s)
   - hashrate_24h_avg: number (EH/s)
   - network_difficulty: number
   - timestamp_utc: string (ISO 8601)
   ```

### Phase 2: Systematic Parameter Discovery

**Task:** Test common parameter patterns to discover supported options.

**Parameter Categories to Test:**

#### Category 1: Pagination Parameters

Test these parameter combinations:

```bash
# Standard pagination
?page=1&page_size=10
?page=2&page_size=20
?limit=20&offset=10
?per_page=5&page=1

# Edge cases
?page=0          # Test zero-indexing
?page=-1         # Test negative values
?page_size=1000  # Test large page sizes
?page_size=0     # Test zero page size
```

**Documentation Template:**
```markdown
### Pagination Support
- ✅ `page` - Page number (1-indexed)
- ✅ `page_size` - Items per page (default: 10, max: 100)
- ❌ `limit` - Not supported
- ❌ `offset` - Not supported
```

#### Category 2: Date Filtering

Test temporal parameters:

```bash
# Date range filtering
?start_date=2025-12-01
?end_date=2025-12-13
?start_date=2025-12-01&end_date=2025-12-13

# Date formats
?start_date=2025-12-01T00:00:00Z  # ISO 8601
?start_date=1733011200            # Unix timestamp
?start_date=2025-12-01            # Date only

# Relative dates
?days=30
?hours=24
?since=7d
```

**Documentation Template:**
```markdown
### Date Filtering
- ✅ `start_date` - Start date (format: YYYY-MM-DD)
- ✅ `end_date` - End date (format: YYYY-MM-DD)
- ❌ `days` - Not supported
- ✅ Date range: Max 90 days
```

#### Category 3: Sorting and Ordering

Test sort parameters:

```bash
# Sort parameters
?sort=height
?sort=timestamp
?order=asc
?order=desc
?sort=height&order=desc

# Alternative sort syntax
?order_by=timestamp
?sort_by=height&sort_order=desc
```

**Documentation Template:**
```markdown
### Sorting
- ✅ `sort` - Field to sort by (height, timestamp, hashrate)
- ✅ `order` - Sort direction (asc, desc)
- Default: timestamp desc
```

#### Category 4: Filtering Options

Test domain-specific filters:

```bash
# Mining-specific filters
?pool=braiins
?country=US
?min_hashrate=1000
?max_hashrate=5000

# Block-specific filters
?min_height=800000
?max_height=850000
?with_transactions=true
```

**Documentation Template:**
```markdown
### Filtering
- ✅ `pool` - Filter by pool name
- ✅ `country` - Filter by country code (ISO 3166-1 alpha-2)
- ❌ `min_hashrate` - Not supported
```

### Phase 3: Edge Case and Error Testing

**Task:** Test boundary conditions and error scenarios.

**Test Cases:**

1. **Invalid Parameter Values**
   ```bash
   ?page=abc          # Non-numeric
   ?page_size=-10     # Negative
   ?start_date=invalid # Invalid format
   ```

2. **Missing Required Parameters**
   ```bash
   # If endpoint requires parameters, test without them
   ```

3. **Conflicting Parameters**
   ```bash
   ?page=1&offset=10  # If both pagination styles exist
   ```

4. **Rate Limiting**
   ```bash
   # Make rapid consecutive requests (10 requests/second)
   for i in {1..20}; do curl -s https://insights.braiins.com/api/v1.0/hashrate-stats & done
   ```

5. **Response Headers Analysis**
   ```bash
   curl -I https://insights.braiins.com/api/v1.0/hashrate-stats
   # Check for: X-RateLimit-*, Cache-Control, ETag
   ```

### Phase 4: Documentation and Fixture Generation

**Task:** Create comprehensive documentation and test fixtures.

**Outputs:**

#### 1. Discovery Report

Create: `docs/api-discovery/{endpoint-name}.md`

```markdown
# API Discovery Report: {endpoint-name}

**Date:** 2025-12-13
**Endpoint:** GET /v1.0/{endpoint-name}
**Base URL:** https://insights.braiins.com/api

## Summary

Brief description of endpoint purpose.

## Request

### Method
GET

### Authentication
None required

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (1-indexed) |
| page_size | number | No | 10 | Items per page (max: 100) |
| start_date | string | No | - | Start date (YYYY-MM-DD) |

### Parameter Discovery Results

#### Pagination
- ✅ Supported: page, page_size
- ❌ Not Supported: limit, offset
- Max page_size: 100
- Zero-indexed: No (1-indexed)

#### Date Filtering
- ✅ Supported: start_date, end_date
- Format: YYYY-MM-DD
- Max range: 90 days

#### Sorting
- ✅ Supported: sort, order
- Available fields: timestamp, height, hashrate
- Default: timestamp desc

## Response

### Structure
Object with nested arrays

### Status Codes
- 200: Success
- 400: Invalid parameters
- 429: Rate limit exceeded
- 500: Server error

### Response Time
Average: 250ms
Min: 150ms
Max: 500ms

### Sample Response

```json
{
  "current_hashrate": 1094.42,
  "hashrate_24h_avg": 1075.18,
  "network_difficulty": 109780000000000000,
  "timestamp_utc": "2025-12-13T18:00:00Z"
}
```

### Field Analysis

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| current_hashrate | number | No | Current network hashrate in EH/s |
| hashrate_24h_avg | number | No | 24-hour average hashrate in EH/s |
| network_difficulty | number | No | Current network difficulty |
| timestamp_utc | string | No | Timestamp in ISO 8601 format |

## Edge Cases

### Tested Scenarios
- ✅ Empty date range: Returns empty array
- ✅ Invalid date format: Returns 400 error
- ✅ Page beyond available: Returns empty array
- ✅ Negative page_size: Returns 400 error

## Rate Limiting

- Limit: ~60 requests/minute
- Response Header: X-RateLimit-Limit
- Reset Header: X-RateLimit-Reset
- Behavior on exceed: 429 status code

## Caching

- Cache-Control: max-age=300 (5 minutes)
- Recommended client cache: 5 minutes
- ETag support: Yes

## Type Definition Recommendations

```typescript
export interface {EndpointName}Response {
  current_hashrate: number;
  hashrate_24h_avg: number;
  network_difficulty: number;
  timestamp_utc: string;
}

export interface {EndpointName}Params {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  sort?: 'timestamp' | 'height' | 'hashrate';
  order?: 'asc' | 'desc';
}
```

## Test Fixture

See: `tests/integration/fixtures/{endpoint-name}.json`

## Notes

- Endpoint is public (no authentication)
- Response format stable across requests
- Cloudflare protection present (302 redirects)

## Version History

- v1.0.0 (2025-12-13): Initial discovery
```

#### 2. Test Fixture

Create: `tests/integration/fixtures/{endpoint-name}.json`

```json
{
  "baseline": {
    "request": {
      "method": "GET",
      "url": "/v1.0/hashrate-stats",
      "params": {}
    },
    "response": {
      "status": 200,
      "data": {
        "current_hashrate": 1094.42,
        "hashrate_24h_avg": 1075.18,
        "network_difficulty": 109780000000000000,
        "timestamp_utc": "2025-12-13T18:00:00Z"
      }
    }
  },
  "with_pagination": {
    "request": {
      "method": "GET",
      "url": "/v1.0/hashrate-stats",
      "params": {
        "page": 1,
        "page_size": 10
      }
    },
    "response": {
      "status": 200,
      "data": {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 10
      }
    }
  },
  "edge_cases": {
    "invalid_page": {
      "request": {
        "params": {
          "page": -1
        }
      },
      "response": {
        "status": 400,
        "error": "Invalid page number"
      }
    }
  }
}
```

#### 3. Update API.md

Add discovered parameters to the endpoint documentation:

```markdown
### GET /v1.0/hashrate-stats

**Description:** Get current Bitcoin network hashrate statistics

**Query Parameters:**
- `page` (number, optional): Page number (1-indexed, default: 1)
- `page_size` (number, optional): Items per page (default: 10, max: 100)
- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `end_date` (string, optional): End date (YYYY-MM-DD)
- `sort` (string, optional): Sort field (timestamp, height, hashrate)
- `order` (string, optional): Sort direction (asc, desc)

**Response:** BraiinsInsightsHashrateStats object

**Cache:** 5 minutes

**See:** docs/api-discovery/hashrate-stats.md
```

#### 4. TypeScript Type Definitions

Create or update: `src/types/insights-api.ts`

Add type definitions based on discovery:

```typescript
/**
 * Query parameters for hashrate stats endpoint
 *
 * @see docs/api-discovery/hashrate-stats.md
 */
export interface HashrateStatsParams {
  page?: number;
  page_size?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  sort?: 'timestamp' | 'height' | 'hashrate';
  order?: 'asc' | 'desc';
}
```

## Deliverables Checklist

After completing discovery for an endpoint, verify:

- [ ] Discovery report created (`docs/api-discovery/{endpoint-name}.md`)
- [ ] Test fixtures generated (`tests/integration/fixtures/{endpoint-name}.json`)
- [ ] Type definitions created/updated (`src/types/insights-api.ts`)
- [ ] API.md updated with discovered parameters
- [ ] Edge cases documented
- [ ] Rate limiting behavior documented
- [ ] Caching recommendations documented
- [ ] Sample requests and responses included

## Tips and Best Practices

### 1. Use jq for JSON Analysis

```bash
# Pretty print response
curl -s URL | jq '.'

# Extract specific fields
curl -s URL | jq '.current_hashrate'

# Get all keys
curl -s URL | jq 'keys'

# Check for null values
curl -s URL | jq 'to_entries | map(select(.value == null))'
```

### 2. Test Parameters Systematically

Don't guess - test each parameter individually first, then in combinations:

```bash
# Test ONE parameter at a time
?page=1
?page_size=10

# Then test combinations
?page=1&page_size=10
```

### 3. Document Non-Support

It's valuable to document what does NOT work:

```markdown
### Not Supported
- ❌ `limit` - Use `page_size` instead
- ❌ `offset` - Use `page` instead
```

### 4. Capture Actual Responses

Always save actual API responses, not hand-crafted examples:

```bash
curl -s https://insights.braiins.com/api/v1.0/hashrate-stats > actual-response.json
```

### 5. Note Cloudflare Behavior

Braiins Insights uses Cloudflare, which may:
- Return 302 redirects
- Add security headers
- Rate limit aggressively

Document this behavior in the discovery report.

## Common Patterns Found in Braiins Insights API

Based on previous discoveries:

### Pagination Pattern
- Uses `page` (1-indexed) and `page_size`
- Max `page_size`: 100
- Returns empty array for pages beyond available data

### Date Filtering Pattern
- Format: `YYYY-MM-DD`
- Parameters: `start_date`, `end_date`
- Max range: 90 days

### Sorting Pattern
- Two parameters: `sort` and `order`
- Common sort fields: `timestamp`, `height`, `hashrate`
- Default order: `desc` (newest first)

### Response Patterns
- Simple endpoints: Single object
- List endpoints: Array or paginated object
- Historical endpoints: Array of time-series data

## Troubleshooting

### Issue: API Returns 302 Redirect

**Cause:** Cloudflare redirect
**Solution:** Use `curl -L` to follow redirects or set `redirect: 'follow'` in fetch

### Issue: API Returns 429

**Cause:** Rate limit exceeded
**Solution:** Add delays between requests (minimum 1 second)

### Issue: Unexpected Response Format

**Cause:** Endpoint may have multiple response formats based on parameters
**Solution:** Test with and without parameters to identify conditional formats

### Issue: Null Values in Response

**Cause:** Data may not be available yet or calculation in progress
**Solution:** Document as optional field in type definition

## Integration with Other Skills

After completing API discovery:

1. **Hand off to braiins-type-system-design skill**
   - Use discovery report to create comprehensive types
   - Include all discovered parameters and response fields

2. **Hand off to braiins-tool-implementation skill**
   - Use type definitions to implement MCP tool
   - Use test fixtures for integration tests

## Version History

- **v1.0.0** (2025-12-13): Initial skill creation

## Maintenance

Update this skill when:
- New parameter patterns discovered
- Braiins Insights API changes behavior
- New testing techniques identified
- Common issues require documentation

---

**Skill Created:** 2025-12-13
**Last Updated:** 2025-12-13
**Maintained By:** Braiins Insights MCP Team
