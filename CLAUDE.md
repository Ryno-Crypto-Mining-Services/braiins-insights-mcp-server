# CLAUDE.md – Claude Agent Configuration for Braiins Insights MCP Server

## Import Universal Standards

See `AGENTS.md` for core development standards including project overview, code structure, testing philosophy, security policies, and git operations. This document extends those standards with Claude-specific workflows and capabilities for the **Braiins Insights Dashboard API** integration.

***

## Project Context: Braiins Insights Dashboard

**Correct Project Name:** Braiins Insights MCP Server (NOT "Braiins Pool")

**Core Distinction:**
- **Braiins Insights Dashboard:** Public analytics platform at [insights.braiins.com](https://insights.braiins.com) providing Bitcoin network metrics, mining statistics, profitability calculators, and market data
- **Braiins Pool:** Private mining pool API (different authentication, different endpoints)

**API Base URL:** `https://insights.braiins.com/api`

**Key API Characteristics:**
- **No Authentication Required:** Most endpoints are public (except where noted)
- **17 Documented Endpoints:** Mix of GET/POST operations (v1.0 and v2.0 paths)
- **Data Categories:**
  - Network metrics (hashrate, difficulty, blocks)
  - Mining economics (profitability, cost-to-mine, halvings)
  - Market data (prices, transaction fees, revenue)
  - Hardware specifications
  - Geographic data (blocks by country)

**Reference Documentation:**
- [API.md](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/blob/main/API.md) – Endpoint definitions
- [Braiins Insights Dashboard](https://insights.braiins.com) – Live dashboard for testing data formats

***

## Claude-Specific Capabilities for Insights API

### Long Context (200,000 Tokens)

Claude's 200K context window enables:
- **Comprehensive API schema analysis** - Load all 17 endpoint specifications, actual API responses, and response type definitions simultaneously
- **Cross-endpoint correlation** - Identify data relationships (e.g., `hashrate_stats` + `difficulty_stats` for mining health indicators)
- **Historical data pattern analysis** - Analyze time-series endpoints (`hashrate-and-difficulty-history`, `daily-revenue-history`, `transaction-fees-history`) to understand data structures

**Recommended Context Loading Order for Insights API:**
1. Load `AGENTS.md` + `API.md` for project context
2. Load example API responses from live endpoints (use curl/fetch to capture)
3. Load `src/types/insights.ts` for existing type definitions
4. Load specific tool file being modified (e.g., `src/tools/hashrate-stats.ts`)
5. Reference fixture data: `tests/integration/fixtures/hashrate-stats.json`

### Constitutional AI Training

Claude excels at:
- **API response structure inference** - Given raw JSON responses, design optimal TypeScript interfaces
- **Data transformation logic** - Converting raw API data to LLM-friendly markdown formats
- **Parameter extraction** - Identifying which query parameters are supported by undocumented endpoints
- **Error scenario planning** - Designing graceful degradation when Insights API returns unexpected formats

***

## Claude Development Workflow for Insights API

### Phase 1: API Discovery & Type System (Architect Role)

**Task:** Explore Insights API endpoints, capture real responses, design TypeScript type system

**Claude Workflow:**
```
1. Review API.md for endpoint catalog
2. For each endpoint, fetch live data:
   - Use curl or Node fetch to call actual API
   - Capture full JSON response
   - Identify response patterns
3. Design TypeScript interfaces for all 17 endpoints
4. Create type hierarchy:
   - BraiinsInsightsBaseResponse
   - BraiinsInsightsHashrateStats
   - BraiinsInsightsDifficultyStats
   - BraiinsInsightsBlockData
   - etc.
5. Document query parameters by testing different inputs
6. Generate ARCHITECTURE.md with Insights-specific considerations
```

**Claude Prompting Example:**
```
Load these files into context:
- API.md (endpoint definitions)
- Raw API response from GET https://insights.braiins.com/api/v1.0/hashrate-stats

Task: Design TypeScript interfaces for the Insights API type system.

Requirements:
1. Examine the raw API response structure
2. Create a TypeScript interface BraiinsInsightsHashrateStats that matches the response
3. Include JSDoc comments for each field explaining the metric
4. Identify nullable fields and make them optional
5. Convert snake_case API fields to camelCase TypeScript (with transformation notes)
6. Suggest additional fields that might exist but aren't in this single response

Provide complete TypeScript code with examples.
```

### Phase 2: Tool Implementation (Builder Role - with Claude Assistance)

**Task:** Implement MCP tools for each Insights API endpoint

**Critical Differences from Pool API:**
- **No authentication headers** (most endpoints are public)
- **Variable response formats** - Some endpoints return arrays, others objects, some paginated
- **POST endpoints** - `hardware-stats` and `blocks` support POST for complex filtering
- **Version paths** - v1.0 vs v2.0 endpoints have different data structures

**Claude Workflow:**
```
1. Load type definitions from Phase 1
2. For EACH tool (17 total):
   a. Understand the endpoint's purpose from API.md
   b. Implement HTTP client method (GET or POST)
   c. Add response transformation (JSON → LLM-friendly markdown)
   d. Handle edge cases (empty arrays, missing fields)
   e. Create test fixture with real API data
3. Design composite tools that combine multiple endpoints:
   - "mining_health_snapshot" (hashrate + difficulty + blocks)
   - "profitability_overview" (cost-to-mine + calculator + price-stats)
```

**Claude Prompting Example:**
```
Implement the MCP tool: braiins_hashrate_stats

Context:
- API endpoint: GET https://insights.braiins.com/api/v1.0/hashrate-stats
- No authentication required
- Response type: BraiinsInsightsHashrateStats (from types/insights.ts)
- Expected response format:
{
  "current_hashrate_ehs": 756.42,
  "hashrate_24h_avg_ehs": 751.18,
  "hashrate_7d_avg_ehs": 748.95,
  "network_difficulty": 109780000000000000,
  "timestamp_utc": "2025-12-13T18:00:00Z"
}

Requirements:
1. Validate input (no parameters expected, but handle if user passes any)
2. Call InsightsApiClient.getHashrateStats()
3. Format response as markdown:
   - Section: "# 📊 Bitcoin Network Hashrate Statistics"
   - Display hashrate in EH/s (exahashes per second) with 2 decimals
   - Show 24h and 7d averages
   - Include difficulty in scientific notation
   - Add timestamp at bottom
4. Error handling:
   - NetworkError → "Unable to reach Insights API"
   - ValidationError for malformed API response
5. Add test fixture at tests/integration/fixtures/hashrate-stats.json

Provide complete TypeScript implementation.
```

### Phase 3: Composite Tool Design (Architect + Builder Collaboration)

**Task:** Create higher-level tools that aggregate multiple Insights endpoints for complex queries

**Examples:**

**Composite Tool 1: Mining Health Dashboard**
```typescript
// Tool: braiins_mining_health_snapshot
// Combines: hashrate-stats + difficulty-stats + blocks + pool-stats
// Returns: Comprehensive mining ecosystem health report

{
  "name": "braiins_mining_health_snapshot",
  "description": "Get comprehensive Bitcoin mining health metrics including hashrate, difficulty, recent blocks, and pool distribution",
  "inputSchema": {
    "type": "object",
    "properties": {
      "include_blocks": {
        "type": "boolean",
        "description": "Include recent block data",
        "default": true
      },
      "block_count": {
        "type": "number",
        "description": "Number of recent blocks to fetch",
        "default": 10,
        "minimum": 1,
        "maximum": 100
      }
    }
  }
}
```

**Composite Tool 2: Profitability Analysis**
```typescript
// Tool: braiins_profitability_analysis
// Combines: profitability-calculator + cost-to-mine + price-stats + hashrate-value-history
// Returns: Complete mining profitability report with historical context

{
  "name": "braiins_profitability_analysis",
  "description": "Analyze Bitcoin mining profitability with cost-to-mine calculations, current prices, and hashrate value trends",
  "inputSchema": {
    "type": "object",
    "properties": {
      "electricity_cost_kwh": {
        "type": "number",
        "description": "Electricity cost in USD per kWh",
        "default": 0.05,
        "minimum": 0,
        "maximum": 1
      },
      "hardware_efficiency_jth": {
        "type": "number",
        "description": "Hardware efficiency in joules per terahash",
        "default": 25
      }
    }
  }
}
```

**Claude Prompting for Composite Tools:**
```
Design a composite MCP tool that provides a "mining health snapshot" by calling multiple Insights API endpoints.

Available endpoints to combine:
1. /v1.0/hashrate-stats (network hashrate metrics)
2. /v1.0/difficulty-stats (difficulty metrics)
3. /v1.0/blocks (recent blocks mined)
4. /v1.0/pool-stats (pool distribution)

Requirements:
1. Make all API calls in parallel (Promise.all)
2. Handle partial failures gracefully (some endpoints may be slow/down)
3. Aggregate data into unified markdown report with sections:
   - Network Overview (hashrate + difficulty)
   - Recent Activity (blocks mined in last hour)
   - Pool Health (pool distribution metrics)
4. Add performance timing (log total execution time)
5. Cache results for 5 minutes to avoid redundant API calls

Design the tool schema, implementation, and error handling strategy.
```

### Phase 4: Testing & Validation (Validator Role)

**Task:** Verify implementation against live Insights API, not mocked data

**Claude Workflow:**
```
1. Load complete implementation (all 17 tools + composites)
2. For EACH tool:
   a. Review test coverage (unit + integration)
   b. Identify missing edge cases:
      - Empty response arrays (e.g., no recent blocks)
      - Null/undefined fields in API response
      - Very large numbers (difficulty, hashrate)
      - Date format variations
   c. Generate comprehensive test suite
3. Design integration tests that call REAL Insights API:
   - Mark as @integration tests
   - Run in CI but not in pre-commit hooks
   - Verify actual response structure matches types
4. Performance testing:
   - Measure response times for each endpoint
   - Identify slow endpoints (>2 seconds)
   - Test composite tools under load
```

**Claude Prompting Example:**
```
Review this integration test for gaps:
[paste tests/integration/hashrate-stats.test.ts]

Current test coverage:
1. ✅ Happy path: API returns valid hashrate stats
2. ✅ Network error: timeout after 5 seconds
3. ❓ Edge case: What if API returns null for hashrate_24h_avg_ehs?
4. ❓ Edge case: What if timestamp_utc is missing?
5. ❓ Edge case: What if hashrate values are negative (invalid)?

Task: Generate missing test cases to achieve 100% coverage of error paths.

Requirements:
- Use real API response structure (not mocked objects)
- Test with actual Insights API in @integration test suite
- Add fixtures for edge cases (edge-cases/hashrate-stats-null-fields.json)
- Verify error messages are user-friendly
```

***

## Tool Permissions & Restrictions

### Allowed Operations

Claude can:
- ✅ Call live Insights API endpoints for response discovery
- ✅ Generate TypeScript interfaces from actual API responses
- ✅ Design composite tools that orchestrate multiple endpoints
- ✅ Write integration tests that hit real Insights API
- ✅ Analyze time-series data patterns (historical endpoints)
- ✅ Create visualization recommendations (charts for hashrate history)
- ✅ Generate API documentation from inferred schemas
- ✅ Review response transformation logic for accuracy

### Restricted Operations

Claude cannot:
- ❌ Modify Braiins Insights API endpoints (read-only consumer)
- ❌ Deploy server to production
- ❌ Commit directly to main branch
- ❌ Change tool naming conventions without team approval
- ❌ Add authentication unless explicitly required by new endpoints

***

## Claude-Specific Development Commands

```bash
# All commands run in project root with Node.js 18+

# Development: Watch TypeScript compilation + auto-restart server
npm run dev

# Build: Compile TypeScript to dist/
npm run build

# Type-check: Verify TypeScript without compiling
npm run type-check

# Lint: Check code style
npm run lint

# Test: Run unit tests only (no API calls)
npm run test

# Integration: Run tests against REAL Insights API
npm run test:integration
# WARNING: Makes actual HTTP requests to insights.braiins.com

# Coverage: Generate test coverage report
npm run test:coverage

# API Explorer: Interactive REPL for testing Insights endpoints
npm run explore-api
# Loads all endpoints, lets you call them interactively

# Fixture Generator: Fetch fresh API responses and save as fixtures
npm run generate-fixtures
# Calls each endpoint and saves to tests/integration/fixtures/

# MCP Inspector: Test server with interactive protocol
npm run inspector
```

***

## Context Management for Claude Sessions

### Session 1: API Discovery (Architect Role)

**Load into context window:**
1. `AGENTS.md` (project overview, 4 KB)
2. `API.md` (endpoint catalog, 6 KB)
3. Raw API responses from 3-5 key endpoints (captured via curl, ~10 KB total):
   ```bash
   curl https://insights.braiins.com/api/v1.0/hashrate-stats > hashrate-stats-raw.json
   curl https://insights.braiins.com/api/v1.0/difficulty-stats > difficulty-stats-raw.json
   curl https://insights.braiins.com/api/v1.0/blocks > blocks-raw.json
   ```
4. Total: ~20 KB of 200K context = plenty of room for analysis

**Prompt:**
```
You are the Architect for the Braiins Insights MCP Server.

Context loaded:
- AGENTS.md (project standards)
- API.md (17 endpoint definitions)
- Raw API responses from hashrate-stats, difficulty-stats, blocks

Task 1: Analyze the API response structures and design a TypeScript type system.

For each endpoint:
1. Identify the response format (object, array, paginated)
2. Map JSON fields to TypeScript properties (snake_case → camelCase)
3. Determine which fields are optional (nullable in responses)
4. Document field meanings with JSDoc comments
5. Create a type hierarchy (base types + specific interfaces)

Task 2: Document query parameter discovery strategy.
- Many endpoints in API.md don't specify parameters
- Design a systematic testing approach to discover:
  * Pagination support (page, page_size, limit, offset)
  * Filtering options (date ranges, pool names, countries)
  * Sorting options (order, sort_by)

Provide:
- Complete src/types/insights.ts with all 17 endpoint types
- Test plan for parameter discovery (which endpoints to test first)
- Recommendations for handling versioned endpoints (v1.0 vs v2.0)
```

### Session 2: Core Tools Implementation (Builder Role)

**Load into context:**
1. `AGENTS.md` (1 KB)
2. `src/types/insights.ts` from Session 1 (8 KB)
3. `src/api/client.ts` (HTTP client implementation, 5 KB)
4. API.md (6 KB)
5. One tool specification (e.g., braiins_hashrate_stats)
6. Example fixture (2 KB)
7. Total: ~22 KB, leaving 178K for code generation

**Prompt:**
```
You are the Builder implementing MCP tools for Braiins Insights.

Context:
- Type system (insights.ts)
- HTTP client (client.ts)
- Endpoint spec: GET /v1.0/hashrate-stats

Implement the following tools in this order:
1. braiins_hashrate_stats (simple GET, no params)
2. braiins_difficulty_stats (simple GET, no params)
3. braiins_blocks (GET with pagination, test with ?page=1&page_size=10)
4. braiins_profitability_calculator (GET with query params for calculator inputs)

For each tool:
- Create src/tools/<tool-name>.ts
- Implement execute() method with validation
- Add response transformation to markdown
- Create test fixture (tests/integration/fixtures/<tool-name>.json)
- Write unit test (tests/unit/<tool-name>.test.ts)

Start with braiins_hashrate_stats. Provide complete implementation.
```

### Session 3: Composite Tools & Advanced Features (Architect + Builder)

**Load into context:**
1. All tool implementations from Session 2 (~40 KB)
2. Response fixtures (~15 KB)
3. Performance profiling data (if available, ~5 KB)
4. Total: ~60 KB, leaving 140K for complex orchestration logic

**Prompt:**
```
Design composite tools that combine multiple Insights endpoints.

Available tools:
[list all 17 implemented tools]

Task: Create 3 composite tools that provide high-value insights:

1. "braiins_mining_overview"
   - Combines: hashrate-stats + difficulty-stats + price-stats + blocks
   - Purpose: 30-second summary of Bitcoin mining ecosystem
   - Output: Executive summary with key metrics

2. "braiins_profitability_deep_dive"
   - Combines: profitability-calculator + cost-to-mine + hashrate-value-history
   - Purpose: Detailed profitability analysis with historical context
   - Parameters: electricity_cost_kwh, hardware_model
   - Output: ROI projections, break-even analysis

3. "braiins_network_health_monitor"
   - Combines: hashrate-and-difficulty-history + blocks + transaction-stats
   - Purpose: Detect network anomalies (hashrate drops, mempool congestion)
   - Output: Health score (0-100) with alerts

For each composite tool:
- Design input schema
- Implement parallel API calls (Promise.all)
- Handle partial failures (degraded mode)
- Add caching (5-minute TTL)
- Format as comprehensive markdown report

Provide implementation for braiins_mining_overview first.
```

***

## Common Claude Workflows for Insights API

### Workflow 1: "Discover Undocumented Parameters"

**Prompt:**
```
The API.md lists GET /v1.0/blocks but doesn't specify query parameters.

Task: Design a systematic test plan to discover supported parameters.

Approach:
1. Test common pagination params:
   - ?page=1&page_size=10
   - ?limit=20&offset=10
   - ?per_page=5
2. Test filtering params:
   - ?start_date=2025-12-01&end_date=2025-12-13
   - ?pool=braiins
   - ?country=US
3. Test sorting params:
   - ?sort=height&order=desc
   - ?order_by=timestamp

For each test:
- Make actual API call
- Document response differences
- Identify which params are supported
- Update API.md with findings

Provide test script (TypeScript) that systematically tests all combinations.
```

### Workflow 2: "Optimize Response Transformation"

**Prompt:**
```
Load the current implementation of braiins_hashrate_and_difficulty_history tool.

Current issue: Response contains 30 days of hourly data (720 data points), which produces a very long markdown table that exceeds token limits.

Task: Redesign the response transformation to be more LLM-friendly.

Options:
1. Aggregate to daily instead of hourly (30 data points)
2. Show only summary statistics (min, max, avg, current)
3. Create a sparkline ASCII chart instead of table
4. Offer multiple format options via input param: "detailed" | "summary" | "chart"

Recommend the best approach and provide implementation.
```

### Workflow 3: "Add Response Caching"

**Prompt:**
```
Many Insights API endpoints return data that changes infrequently:
- hashrate-stats: Updates every ~10 minutes
- difficulty-stats: Updates every 2 weeks (at adjustment)
- halvings: Static until next halving event

Task: Implement intelligent caching in InsightsApiClient.

Requirements:
1. Cache responses in-memory with TTL:
   - hashrate-stats: 5 minutes
   - difficulty-stats: 1 hour
   - halvings: 24 hours
   - blocks: 30 seconds (fast-changing)
2. Cache key includes endpoint + query params
3. Add cache hit/miss logging
4. Provide cache.clear() method for testing
5. Respect Cache-Control headers from API if present

Provide complete caching implementation with tests.
```

***

## Quality Validation Checklist (Claude Review)

Before handoff to next agent, Claude should verify:

### Type Safety
- [ ] All Insights API response types defined in `src/types/insights.ts`
- [ ] Type guards implemented for runtime validation (`isHashrateStats`, etc.)
- [ ] No `any` types except in explicitly documented edge cases
- [ ] Zod schemas match TypeScript interfaces

### API Coverage
- [ ] All 17 endpoints from API.md have corresponding tools
- [ ] Each tool tested against live Insights API (integration tests)
- [ ] Undocumented parameters discovered and documented
- [ ] POST endpoint bodies properly typed (hardware-stats, blocks)

### Error Handling
- [ ] Network errors handled gracefully (timeout, DNS failure)
- [ ] Malformed API responses detected and reported clearly
- [ ] Empty result arrays handled (e.g., no blocks found)
- [ ] Null/undefined fields in API response don't crash tools

### Response Formatting
- [ ] All markdown responses use consistent structure (headers, tables, timestamps)
- [ ] Large datasets aggregated to avoid token limit issues
- [ ] Numerical values formatted appropriately (2 decimals for hashrate, scientific notation for difficulty)
- [ ] Timestamps converted to human-readable format

### Documentation
- [ ] Each tool has JSDoc comments explaining purpose and parameters
- [ ] API.md updated with discovered parameters
- [ ] Example queries provided for each tool in README.md
- [ ] ARCHITECTURE.md reflects Insights-specific design decisions

### Performance
- [ ] Response times <2 seconds for simple tools
- [ ] Composite tools use parallel API calls (Promise.all)
- [ ] Caching implemented for slow/stable endpoints
- [ ] No redundant API calls in single tool execution

### Testing
- [ ] Unit tests for all tools (>85% coverage)
- [ ] Integration tests with real Insights API
- [ ] Fixtures generated from actual API responses
- [ ] Edge cases covered (empty arrays, null fields, large numbers)

***

## Insights-Specific Best Practices

### 1. Handle Large Numbers Gracefully

Bitcoin metrics involve very large numbers:
- Network hashrate: ~750 EH/s (750,000,000,000,000,000,000 hashes/sec)
- Difficulty: ~110,000,000,000,000,000
- Block rewards: 3.125 BTC (625,000,000 satoshis)

**Best Practice:**
```typescript
// ❌ Bad: Display raw number
`Hashrate: ${stats.hashrate_hs} H/s` // 750000000000000000000

// ✅ Good: Use appropriate units with formatting
function formatHashrate(hashesPerSecond: number): string {
  const ehs = hashesPerSecond / 1e18;
  return `${ehs.toFixed(2)} EH/s`;
}

function formatDifficulty(difficulty: number): string {
  return difficulty.toExponential(2); // 1.10e+17
}
```

### 2. Respect API Rate Limits (Even Without Authentication)

Insights API is public but likely has rate limits:

```typescript
// Implement conservative rate limiting
class InsightsApiClient {
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly BURST_LIMIT = 10;

  // Track requests with sliding window
  private checkRateLimit(): void {
    // Similar to Pool API client, but adjust limits
  }
}
```

### 3. Design for Data Freshness Awareness

Different endpoints have different update frequencies:

```typescript
// Add metadata to responses indicating freshness
interface InsightsToolResponse {
  data: string; // Markdown content
  metadata: {
    cached: boolean;
    cache_age_seconds?: number;
    next_update_estimate?: string; // "~10 minutes" for hashrate
    data_timestamp: string; // From API response
  };
}
```

### 4. Handle Versioned Endpoints

Insights has v1.0 and v2.0 paths:

```typescript
// Design client to handle version differences
class InsightsApiClient {
  async getCostToMine(): Promise<CostToMineData> {
    // Use v2.0 endpoint
    return this.get<CostToMineData>('/v2.0/cost-to-mine');
  }

  async getHashrateStats(): Promise<HashrateStats> {
    // Use v1.0 endpoint
    return this.get<HashrateStats>('/v1.0/hashrate-stats');
  }
}
```

***

## Debugging Workflows

### Issue: "Tool Returns Empty/Unexpected Data"

**Claude Debugging Prompt:**
```
Tool braiins_blocks is returning an empty array when it should show recent blocks.

Debug checklist:
1. Verify API endpoint URL is correct (check for typos)
2. Test API directly with curl:
   curl https://insights.braiins.com/api/v1.0/blocks
3. Compare tool's HTTP request headers vs curl
4. Check response status code (200 OK?)
5. Validate response structure matches type definition
6. Check if API requires specific query parameters

Provide step-by-step debugging script and likely root causes.
```

### Issue: "Response Transformation Loses Data"

**Claude Debugging Prompt:**
```
The braiins_hashrate_and_difficulty_history tool returns markdown, but when I compare the markdown to the raw API response, some data points are missing.

Current transformation:
[paste formatAsMarkdown function]

Task:
1. Identify which fields from API response are not in markdown
2. Determine if omission is intentional (e.g., dropping internal metadata)
3. If unintentional, fix transformation logic
4. Add test to verify no data loss in transformation

Provide fixed implementation with explanation.
```

***

## Integration with Other Tools

### Claude + Cursor Workflow

```
Scenario: Claude designs the type system and architecture,
          Cursor implements the individual tools

Step 1: Claude session generates:
- src/types/insights.ts (17 endpoint types)
- ARCHITECTURE.md (design decisions)
- API parameter discovery plan

Step 2: Hand off to Cursor with prompt:
"Implement tools 1-5 from the architecture doc.
 Use types from insights.ts.
 Follow error handling patterns from AGENTS.md."

Step 3: Claude reviews Cursor's implementation:
- Validates type usage
- Checks error handling completeness
- Suggests optimizations
```

***

## Summary

This CLAUDE.md provides Claude-specific guidance for developing the **Braiins Insights MCP Server**:

✅ **Correct Project Focus:** Braiins Insights Dashboard API (public analytics), not Braiins Pool API  
✅ **Context Management:** Optimal file loading for 200K context window  
✅ **API Discovery:** Systematic approach to exploring undocumented parameters  
✅ **Type System Design:** Handling 17 endpoints with versioned paths (v1.0/v2.0)  
✅ **Composite Tools:** Orchestrating multiple endpoints for high-value insights  
✅ **Large Number Handling:** Formatting exahash and difficulty values appropriately  
✅ **Testing Strategy:** Integration tests with live Insights API, not just mocks  
✅ **Performance:** Caching strategies for different endpoint update frequencies  

Proceed to `DEVELOPMENT_PLAN.md` for implementation roadmap and `ARCHITECTURE.md` for technical design specific to Insights API integration.

***

**Document Version:** 1.0  
**Last Updated:** December 13, 2025  
**Project:** Braiins Insights MCP Server (https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server)  
**Maintained By:** Claude Development Standards Team  
**Review Cycle:** Quarterly or upon API version updatesImport command and agent standards from docs/claude/
