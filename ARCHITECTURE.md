# ARCHITECTURE.md – Braiins Insights MCP Server Technical Design

## System Overview

The Braiins Insights MCP Server acts as a bridge between AI coding assistants (Claude Desktop, Cursor, etc.) and the **Braiins Insights Dashboard API**, exposing Bitcoin network analytics, mining statistics, and profitability metrics as standardized Model Context Protocol (MCP) tools.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Coding Assistant                      │
│              (Claude Desktop, Cursor, etc.)                 │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (stdio)
                         │ JSON-RPC 2.0
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Braiins Insights MCP Server                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          MCP Tool Registry (17+ Tools)               │   │
│  │  - braiins_hashrate_stats                            │   │
│  │  - braiins_difficulty_stats                          │   │
│  │  - braiins_blocks                                    │   │
│  │  - braiins_profitability_calculator                  │   │
│  │  - braiins_cost_to_mine                              │   │
│  │  - [12 more tools...]                                │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐   │
│  │       Input Validation Layer (Zod)                   │   │
│  │  - Schema validation for parameterized tools         │   │
│  │  - Type coercion for query params                    │   │
│  │  - Error transformation                              │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐   │
│  │         InsightsApiClient                            │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ Conservative Rate Limiter (public API)       │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ Response Caching (TTL by endpoint type)      │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ HTTP Client (native fetch, GET/POST)         │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │ HTTPS (no auth required for most)           │
└───────────────┼─────────────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────────────────┐
│         Braiins Insights Dashboard API                      │
│  Base URL: https://insights.braiins.com/api                 │
│                                                             │
│  v1.0 Endpoints (11):                                       │
│  - /v1.0/hashrate-stats                                     │
│  - /v1.0/difficulty-stats                                   │
│  - /v1.0/blocks                                             │
│  - /v1.0/pool-stats                                         │
│  - /v1.0/price-stats                                        │
│  - [6 more v1.0 endpoints...]                               │
│                                                             │
│  v2.0 Endpoints (3):                                        │
│  - /v2.0/cost-to-mine                                       │
│  - /v2.0/halvings                                           │
│  - /v2.0/profitability-calculator                           │
└─────────────────────────────────────────────────────────────┘
```

***

## Key Architectural Differences from Pool API

### 1. Public vs. Private API

**Braiins Insights (This Project):**
- ✅ No authentication required for most endpoints
- ✅ Public data (network stats, market data, mining economics)
- ✅ Rate limiting enforced by IP/client (likely more lenient)
- ✅ Designed for public consumption (dashboards, analytics)

**Braiins Pool (Different Project):**
- ❌ Requires API key authentication
- ❌ Private data (individual pool/worker stats)
- ❌ Stricter rate limits per account
- ❌ Account-specific operations

### 2. Endpoint Characteristics

| Characteristic | Insights API | Pool API |
|----------------|--------------|----------|
| **Base URL** | `insights.braiins.com/api` | `pool.braiins.com/api` |
| **Authentication** | None (public) | Bearer token required |
| **HTTP Methods** | GET, POST | GET, POST, PATCH |
| **Data Type** | Network-wide analytics | Account/pool-specific |
| **Update Frequency** | Varies (30s to 24h) | Real-time to hourly |
| **Versioning** | v1.0, v2.0 paths | Single version |
| **Pagination** | Supported on some | Standard pagination |

### 3. Data Freshness Strategy

```typescript
// Insights API has different update cadences
const CACHE_TTL = {
  // Fast-changing (30 seconds - 5 minutes)
  'blocks': 30_000,                    // New blocks ~every 10 min
  'hashrate-stats': 300_000,           // Updates every 5 min
  'transaction-stats': 300_000,
  
  // Medium-changing (5 minutes - 1 hour)
  'price-stats': 300_000,              // Market data
  'pool-stats': 600_000,               // Pool distribution
  'difficulty-stats': 3_600_000,       // Updates at adjustment (~2 weeks)
  
  // Slow-changing (hours to static)
  'halvings': 86_400_000,              // Static until next halving
  'rss-feed-data': 3_600_000,
  'hardware-stats': 3_600_000,
  
  // Historical (rarely changes)
  'hashrate-and-difficulty-history': 600_000,  // 10 min
  'daily-revenue-history': 3_600_000,          // 1 hour
  'transaction-fees-history': 3_600_000
};
```

***

## Component Design

### 1. MCP Server Core (src/index.ts)

**Responsibility:** Implement MCP protocol, route tool requests, handle 17+ tools

**Key Differences from Pool Server:**
- No authentication initialization (public API)
- More tools to register (17 vs 4)
- Support for composite tools (mining health dashboard, profitability analysis)

```typescript
class BraiinsInsightsMCPServer {
  private server: Server;              // @modelcontextprotocol/sdk
  private apiClient: InsightsApiClient;
  private tools: Map<string, MCPTool>;
  private compositeTools: Map<string, CompositeTool>;

  constructor(config: ServerConfig) {
    // Initialize MCP server with stdio transport
    // No API key required for Insights
    this.apiClient = new InsightsApiClient({
      baseUrl: config.baseUrl || "https://insights.braiins.com/api",
      timeout: 10000,  // Longer timeout for historical queries
      cacheConfig: CACHE_TTL
    });
    
    // Register all 17 tools
    this.registerTools();
    this.registerCompositeTools();
  }

  async start(): Promise<void> {
    // Set up request handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ...Array.from(this.tools.values()).map(t => t.schema),
        ...Array.from(this.compositeTools.values()).map(t => t.schema)
      ]
    }));
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Check regular tools first
      if (this.tools.has(name)) {
        return await this.tools.get(name)!.execute(args);
      }
      
      // Check composite tools
      if (this.compositeTools.has(name)) {
        return await this.compositeTools.get(name)!.execute(args);
      }
      
      throw new Error(`Unknown tool: ${name}`);
    });
    
    // Connect stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info("Braiins Insights MCP Server started", {
      toolCount: this.tools.size + this.compositeTools.size,
      baseUrl: this.apiClient.baseUrl
    });
  }
}
```

***

### 2. API Client Layer (src/api/insights-client.ts)

**Responsibility:** HTTP communication with Insights API, caching, parameter discovery

#### InsightsApiClient Class

```typescript
class InsightsApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number = 10000;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTTL: Record<string, number>;
  
  // No API key required (public API)
  constructor(config: InsightsClientConfig) {
    this.baseUrl = config.baseUrl || "https://insights.braiins.com/api";
    this.timeout = config.timeout || 10000;
    this.cacheTTL = config.cacheConfig || CACHE_TTL;
  }

  // Public API methods for v1.0 endpoints
  async getHashrateStats(): Promise<InsightsHashrateStats>
  async getDifficultyStats(): Promise<InsightsDifficultyStats>
  async getBlocks(params?: BlocksParams): Promise<InsightsBlockData[]>
  async getBlocksByCountry(params?: BlocksParams): Promise<InsightsCountryBlockData[]>
  async getDailyRevenueHistory(): Promise<InsightsRevenueHistory>
  async getHashrateAndDifficultyHistory(): Promise<InsightsHashDiffHistory>
  async getHashrateValueHistory(): Promise<InsightsHashrateValue[]>
  async getPoolStats(): Promise<InsightsPoolStats>
  async getPriceStats(): Promise<InsightsPriceStats>
  async getRSSFeedData(): Promise<InsightsRSSFeed>
  async getTransactionFeesHistory(): Promise<InsightsTransactionFees[]>
  async getTransactionStats(): Promise<InsightsTransactionStats>
  
  // Public API methods for v2.0 endpoints
  async getCostToMine(params?: CostToMineParams): Promise<InsightsCostToMine>
  async getHalvings(): Promise<InsightsHalvingData>
  async getProfitabilityCalculator(params: ProfitabilityParams): Promise<InsightsProfitability>
  
  // POST endpoint for hardware stats
  async getHardwareStats(body: HardwareStatsRequest): Promise<InsightsHardwareStats[]>

  // Internal methods
  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T>
  private async post<T>(endpoint: string, body: any): Promise<T>
  private checkCache<T>(key: string): T | null
  private setCache<T>(key: string, value: T, ttl: number): void
  private buildHeaders(): Record<string, string>
}
```

#### Intelligent Caching Strategy

**Why Cache?**
- Public API likely has rate limits (even without auth)
- Many endpoints return data that changes infrequently
- Reduces latency for repeated queries
- Minimizes load on Braiins infrastructure

```typescript
interface CacheEntry {
  data: any;
  expires: number;  // Unix timestamp
  endpoint: string;
}

class InsightsApiClient {
  private checkCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      logger.debug(`Cache expired for ${key}`);
      return null;
    }
    
    logger.debug(`Cache hit for ${key}`, {
      age_seconds: (entry.expires - Date.now()) / 1000
    });
    
    return entry.data as T;
  }
  
  private setCache<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttl,
      endpoint: key.split('?')[0]  // Store base endpoint
    });
    
    logger.debug(`Cached ${key} for ${ttl / 1000}s`);
  }
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // Build cache key from endpoint + params
    const cacheKey = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    // Check cache first
    const cached = this.checkCache<T>(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.timeout)
    });
    
    if (!response.ok) {
      throw new InsightsApiError(
        `Insights API returned ${response.status}`,
        response.status,
        endpoint
      );
    }
    
    const data = await response.json() as T;
    
    // Determine TTL based on endpoint
    const endpointBase = endpoint.split('?')[0];
    const ttl = this.cacheTTL[endpointBase] || 300_000; // Default 5 min
    
    // Cache the result
    this.setCache(cacheKey, data, ttl);
    
    return data;
  }
}
```

#### Rate Limiting (Conservative)

Since Insights API is public and rate limits are unknown, implement conservative client-side limiting:

```typescript
class InsightsApiClient {
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 30;  // Conservative
  private readonly BURST_LIMIT = 5;
  
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneSecondAgo = now - 1_000;
    
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => ts > oneMinuteAgo
    );
    
    // Check minute-level limit
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = this.requestTimestamps[0];
      const retryAfterMs = 60_000 - (now - oldestInWindow) + 100;
      
      throw new RateLimitError(
        `Client-side rate limit: ${this.MAX_REQUESTS_PER_MINUTE} req/min`,
        retryAfterMs
      );
    }
    
    // Check burst limit (5 req/sec)
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneSecondAgo);
    if (recentRequests.length >= this.BURST_LIMIT) {
      await sleep(1000); // Wait 1 second
    }
    
    this.requestTimestamps.push(now);
  }
}
```

***

### 3. Tool Layer (src/tools/)

#### Tool Categories

**Category 1: Simple Stats Tools (No Parameters)**
```typescript
// These fetch current state, no user input needed
- braiins_hashrate_stats
- braiins_difficulty_stats
- braiins_price_stats
- braiins_transaction_stats
- braiins_pool_stats
- braiins_rss_feed_data
- braiins_halvings
```

**Category 2: Parameterized Tools**
```typescript
// These accept query parameters
- braiins_blocks({ page?, page_size?, start_date?, end_date? })
- braiins_blocks_by_country({ page?, page_size? })
- braiins_profitability_calculator({ 
    electricity_cost_kwh: number,
    hardware_efficiency_jth: number,
    hardware_cost_usd?: number
  })
- braiins_cost_to_mine({ electricity_cost_kwh?: number })
- braiins_hardware_stats({ models?: string[] })  // POST endpoint
```

**Category 3: Historical Data Tools**
```typescript
// Time-series endpoints
- braiins_daily_revenue_history
- braiins_hashrate_and_difficulty_history
- braiins_hashrate_value_history
- braiins_transaction_fees_history
```

**Category 4: Composite Tools (Multi-Endpoint)**
```typescript
// Aggregate multiple endpoints
- braiins_mining_overview  
  (hashrate + difficulty + blocks + price)
  
- braiins_profitability_deep_dive
  (calculator + cost-to-mine + price + hashrate-value-history)
  
- braiins_network_health_monitor
  (hashrate-history + difficulty + blocks + transaction-stats)
```

#### Example Tool: Simple Stats

```typescript
// src/tools/hashrate-stats.ts
export class HashrateStatsTool implements MCPTool {
  name = "braiins_hashrate_stats";
  description = "Get current Bitcoin network hashrate statistics including 24h and 7d averages";
  
  inputSchema = {
    type: "object",
    properties: {},  // No parameters
    required: []
  };

  constructor(private apiClient: InsightsApiClient) {}

  async execute(input: unknown): Promise<MCPResponse> {
    try {
      const stats = await this.apiClient.getHashrateStats();
      const markdown = this.formatResponse(stats);
      
      return {
        content: [{
          type: "text",
          text: markdown
        }],
        isError: false
      };
    } catch (error) {
      return handleToolError(error);
    }
  }

  private formatResponse(stats: InsightsHashrateStats): string {
    return `
# 📊 Bitcoin Network Hashrate Statistics

## Current Metrics
- **Hashrate:** ${this.formatHashrate(stats.current_hashrate_ehs)} EH/s
- **24h Average:** ${this.formatHashrate(stats.hashrate_24h_avg_ehs)} EH/s
- **7d Average:** ${this.formatHashrate(stats.hashrate_7d_avg_ehs)} EH/s

## Network Difficulty
- **Current:** ${stats.network_difficulty.toExponential(2)}
- **Next Adjustment:** ~${stats.blocks_until_adjustment} blocks

*Last updated: ${new Date(stats.timestamp_utc).toLocaleString()}*
    `.trim();
  }
  
  private formatHashrate(ehs: number): string {
    return ehs.toFixed(2);
  }
}
```

#### Example Tool: Parameterized

```typescript
// src/tools/blocks.ts
export class BlocksTool implements MCPTool {
  name = "braiins_blocks";
  description = "Get recent Bitcoin blocks mined with optional pagination and date filtering";
  
  inputSchema = {
    type: "object",
    properties: {
      page: {
        type: "number",
        description: "Page number for pagination (1-indexed)",
        minimum: 1,
        default: 1
      },
      page_size: {
        type: "number",
        description: "Number of blocks per page",
        minimum: 1,
        maximum: 100,
        default: 10
      },
      start_date: {
        type: "string",
        description: "Filter blocks after this date (ISO 8601 format)",
        format: "date-time"
      },
      end_date: {
        type: "string",
        description: "Filter blocks before this date (ISO 8601 format)",
        format: "date-time"
      }
    },
    required: []
  };

  constructor(private apiClient: InsightsApiClient) {}

  async execute(input: unknown): Promise<MCPResponse> {
    try {
      // Validate input
      const params = BlocksInputSchema.parse(input);
      
      // Fetch blocks
      const blocks = await this.apiClient.getBlocks(params);
      
      // Handle empty result
      if (blocks.length === 0) {
        return {
          content: [{
            type: "text",
            text: "⚠️ No blocks found matching the specified criteria."
          }],
          isError: false
        };
      }
      
      // Format as markdown table
      const markdown = this.formatAsTable(blocks, params);
      
      return {
        content: [{
          type: "text",
          text: markdown
        }],
        isError: false
      };
    } catch (error) {
      return handleToolError(error);
    }
  }

  private formatAsTable(blocks: InsightsBlockData[], params: BlocksParams): string {
    const rows = blocks.map(block => 
      `| ${block.height} | ${block.pool_name || 'Unknown'} | ${this.formatTime(block.timestamp)} | ${block.transaction_count} | ${block.size_mb.toFixed(2)} MB |`
    ).join('\n');
    
    return `
# 🧱 Recent Bitcoin Blocks

Showing ${blocks.length} blocks (page ${params.page || 1}, ${params.page_size || 10} per page)

| Height | Pool | Time | Transactions | Size |
|--------|------|------|--------------|------|
${rows}

*Data from Braiins Insights Dashboard*
    `.trim();
  }
}
```

#### Example Tool: Composite

```typescript
// src/tools/mining-overview.ts
export class MiningOverviewTool implements CompositeTool {
  name = "braiins_mining_overview";
  description = "Get comprehensive Bitcoin mining ecosystem snapshot";
  
  inputSchema = {
    type: "object",
    properties: {
      include_recent_blocks: {
        type: "boolean",
        description: "Include list of recent blocks",
        default: true
      },
      block_count: {
        type: "number",
        description: "Number of recent blocks to include",
        default: 5,
        minimum: 1,
        maximum: 20
      }
    }
  };

  constructor(private apiClient: InsightsApiClient) {}

  async execute(input: unknown): Promise<MCPResponse> {
    try {
      const params = MiningOverviewInputSchema.parse(input);
      
      // Fetch all data in parallel
      const [hashrate, difficulty, price, blocks] = await Promise.allSettled([
        this.apiClient.getHashrateStats(),
        this.apiClient.getDifficultyStats(),
        this.apiClient.getPriceStats(),
        params.include_recent_blocks 
          ? this.apiClient.getBlocks({ page: 1, page_size: params.block_count })
          : Promise.resolve([])
      ]);
      
      // Handle partial failures gracefully
      const markdown = this.buildReport({
        hashrate: hashrate.status === 'fulfilled' ? hashrate.value : null,
        difficulty: difficulty.status === 'fulfilled' ? difficulty.value : null,
        price: price.status === 'fulfilled' ? price.value : null,
        blocks: blocks.status === 'fulfilled' ? blocks.value : []
      });
      
      return {
        content: [{
          type: "text",
          text: markdown
        }],
        isError: false
      };
    } catch (error) {
      return handleToolError(error);
    }
  }

  private buildReport(data: MiningOverviewData): string {
    const sections: string[] = [];
    
    sections.push("# 🌐 Bitcoin Mining Ecosystem Overview\n");
    
    if (data.hashrate) {
      sections.push(`## Network Hashrate
- Current: ${data.hashrate.current_hashrate_ehs.toFixed(2)} EH/s
- 24h Avg: ${data.hashrate.hashrate_24h_avg_ehs.toFixed(2)} EH/s
- Trend: ${this.calculateTrend(data.hashrate)}
`);
    }
    
    if (data.difficulty) {
      sections.push(`## Mining Difficulty
- Current: ${data.difficulty.current_difficulty.toExponential(2)}
- Next Adjustment: ${data.difficulty.blocks_until_adjustment} blocks (~${data.difficulty.estimated_adjustment_time})
- Est. Change: ${data.difficulty.estimated_change_percent > 0 ? '+' : ''}${data.difficulty.estimated_change_percent.toFixed(2)}%
`);
    }
    
    if (data.price) {
      sections.push(`## Bitcoin Price
- Current: $${data.price.current_price_usd.toLocaleString()}
- 24h Change: ${data.price.price_change_24h_percent > 0 ? '+' : ''}${data.price.price_change_24h_percent.toFixed(2)}%
- Market Cap: $${(data.price.market_cap_usd / 1e9).toFixed(2)}B
`);
    }
    
    if (data.blocks && data.blocks.length > 0) {
      sections.push(`## Recent Blocks (Last ${data.blocks.length})
${data.blocks.map(b => `- Block ${b.height}: ${b.pool_name} (${b.transaction_count} txs)`).join('\n')}
`);
    }
    
    sections.push(`\n*Generated: ${new Date().toLocaleString()}*`);
    
    return sections.join('\n');
  }
}
```

***

## Data Flow

### Request Flow: Simple Tool (No Parameters)

```
1. Claude Desktop: "What's the current Bitcoin network hashrate?"
   ↓
2. MCP Server receives: tools/call { name: "braiins_hashrate_stats", arguments: {} }
   ↓
3. HashrateStatsTool.execute({})
   ↓
4. apiClient.getHashrateStats()
   ├─ Check cache: /v1.0/hashrate-stats
   │  └─ Cache miss (or expired)
   ↓
5. HTTP GET https://insights.braiins.com/api/v1.0/hashrate-stats
   ├─ Headers: { User-Agent: "Braiins-Insights-MCP/1.0" }
   ├─ Timeout: 10 seconds
   ↓
6. Insights API responds:
   {
     "current_hashrate_ehs": 756.42,
     "hashrate_24h_avg_ehs": 751.18,
     "network_difficulty": 109780000000000000,
     "timestamp_utc": "2025-12-13T18:50:00Z"
   }
   ↓
7. Validate response structure (isHashrateStats type guard)
   ↓
8. Cache result (TTL: 5 minutes)
   ↓
9. Transform to markdown:
   "# 📊 Bitcoin Network Hashrate Statistics\n..."
   ↓
10. Return MCP response to Claude Desktop
   ↓
11. Claude displays formatted markdown to user
```

### Request Flow: Parameterized Tool

```
1. Claude: "Show me the last 20 blocks"
   ↓
2. MCP Server: tools/call { 
     name: "braiins_blocks", 
     arguments: { page: 1, page_size: 20 } 
   }
   ↓
3. BlocksTool.execute({ page: 1, page_size: 20 })
   ├─ Validate with Zod schema
   │  └─ BlocksInputSchema.parse(...)
   ↓
4. apiClient.getBlocks({ page: 1, page_size: 20 })
   ├─ Build cache key: "/v1.0/blocks?page=1&page_size=20"
   ├─ Cache miss
   ↓
5. HTTP GET https://insights.braiins.com/api/v1.0/blocks?page=1&page_size=20
   ↓
6. Insights API returns array of 20 blocks
   ↓
7. Cache result (TTL: 30 seconds for fast-changing data)
   ↓
8. Format as markdown table with block heights, pools, timestamps
   ↓
9. Return to Claude
```

### Request Flow: Composite Tool (Parallel Requests)

```
1. Claude: "Give me a mining overview"
   ↓
2. MCP Server: tools/call { name: "braiins_mining_overview", arguments: {} }
   ↓
3. MiningOverviewTool.execute({})
   ↓
4. Promise.allSettled([
     apiClient.getHashrateStats(),      // ~200ms
     apiClient.getDifficultyStats(),    // ~180ms
     apiClient.getPriceStats(),         // ~150ms
     apiClient.getBlocks({ page_size: 5 })  // ~220ms
   ])
   ↓ (All requests execute in parallel)
   ↓
5. Wait for all promises (max ~220ms, not 200+180+150+220=750ms)
   ↓
6. Handle partial failures:
   - If hashrate fails → Show "[Hashrate data unavailable]"
   - If blocks fail → Skip blocks section
   - Never fail entire tool if 1-2 endpoints are down
   ↓
7. Build unified markdown report with all available data
   ↓
8. Return to Claude
```

***

## Error Handling Strategy

### Error Hierarchy

```
Error (base class)
├── ValidationError
│   ├── Invalid input (wrong type, out of range)
│   └── Invalid API response (malformed JSON, missing fields)
├── InsightsApiError
│   ├── NotFoundError (404)
│   ├── ServerError (5xx)
│   └── UnknownApiError (other HTTP errors)
└── NetworkError
    ├── TimeoutError (request exceeded 10s)
    ├── ConnectionError (DNS, refused connection)
    └── AbortError (client canceled request)
```

**Note:** No `UnauthorizedError` (401) needed since Insights API is public.

### Graceful Degradation for Composite Tools

```typescript
// Composite tools should never completely fail if one endpoint is down
async execute(input: unknown): Promise<MCPResponse> {
  const results = await Promise.allSettled([
    this.apiClient.getHashrateStats(),
    this.apiClient.getDifficultyStats(),
    this.apiClient.getPriceStats()
  ]);
  
  const markdown = this.buildReport({
    hashrate: results[0].status === 'fulfilled' ? results[0].value : null,
    difficulty: results[1].status === 'fulfilled' ? results[1].value : null,
    price: results[2].status === 'fulfilled' ? results[2].value : null
  });
  
  // Add footer noting any failures
  if (results.some(r => r.status === 'rejected')) {
    markdown += '\n\n⚠️ *Some data unavailable due to API errors*';
  }
  
  return { content: [{ type: "text", text: markdown }] };
}
```

***

## Security Considerations

### 1. No Authentication = Different Threat Model

**Since Insights API is public:**
- ❌ No API key leakage risk
- ✅ Still need input validation (prevent injection attacks)
- ✅ Rate limiting to avoid abuse/DoS
- ✅ Cache to minimize server load

### 2. Input Sanitization (Same as Pool API)

```typescript
// Even though API is public, validate all inputs
const BlocksInputSchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  page_size: z.number().int().min(1).max(100).default(10),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
}).refine(
  data => !data.start_date || !data.end_date || 
         new Date(data.start_date) < new Date(data.end_date),
  { message: "start_date must be before end_date" }
);
```

### 3. Rate Limiting (Client-Side)

```typescript
// Conservative limits since we don't know server-side limits
class InsightsApiClient {
  // 30 requests per minute (half of typical public API limits)
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
  
  // But allow caching to bypass limits for repeated queries
  async get<T>(endpoint: string): Promise<T> {
    // Check cache first (doesn't count against rate limit)
    const cached = this.checkCache<T>(endpoint);
    if (cached) return cached;
    
    // Check rate limit before making request
    await this.checkRateLimit();
    
    // Make request
    return this.fetchFromAPI<T>(endpoint);
  }
}
```

***

## Performance Characteristics

### Latency Budget

```
User Query → Claude → MCP Server → Insights API → Response

Target: <2 seconds for simple queries, <5 seconds for composite

Breakdown (Simple Query):
  - MCP overhead: ~50ms
  - Validation: ~5ms
  - Cache lookup: ~2ms
  - Network (US→EU→US): ~300ms (if cache miss)
  - Insights API processing: ~150ms
  - Response formatting: ~10ms
  - Total: ~517ms (or ~67ms if cached)

Breakdown (Composite Query - 4 endpoints):
  - MCP + validation: ~55ms
  - Parallel API calls: ~400ms (longest endpoint, not sum)
  - Aggregation: ~20ms
  - Total: ~475ms (with aggressive caching)
```

### Cache Hit Rates (Expected)

```
Endpoint Type          | Expected Hit Rate | Reasoning
-----------------------|-------------------|----------------------------------
Static (halvings)      | 99%               | Data changes once per ~4 years
Slow (difficulty)      | 95%               | Updates every ~2 weeks
Medium (hashrate)      | 70%               | Updates every 5 min, TTL 5 min
Fast (blocks)          | 40%               | New blocks every ~10 min, TTL 30s
Historical (trends)    | 85%               | Rarely queried, long TTL
```

### Optimization: Prefetch Common Queries

```typescript
// Optionally prefetch commonly-used endpoints on server startup
class BraiinsInsightsMCPServer {
  async warmCache(): Promise<void> {
    logger.info("Warming cache with common queries...");
    
    const commonQueries = [
      this.apiClient.getHashrateStats(),
      this.apiClient.getDifficultyStats(),
      this.apiClient.getPriceStats(),
      this.apiClient.getHalvings()  // Static data
    ];
    
    await Promise.allSettled(commonQueries);
    
    logger.info("Cache warmed", {
      cached_endpoints: commonQueries.length
    });
  }
}
```

***

## Scalability Considerations

### Current Limitations

1. **Single Process:** One server instance per MCP client
2. **In-Memory Caching:** Cache lost on restart
3. **No Distributed Requests:** Can't share cache across multiple clients

### Future Enhancements (v2.0)

**1. Redis-Backed Caching**
```typescript
import { Redis } from 'ioredis';

class RedisCacheBackend implements CacheBackend {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
  }
}
```

**2. WebSocket Support for Real-Time Updates**
- Push notifications when new blocks are mined
- Live hashrate updates every 30 seconds
- Price alerts

**3. GraphQL Wrapper**
- Allow clients to request specific fields
- Reduce over-fetching
- Support complex queries

***

## Testing Strategy

### Test Pyramid for Insights API

```
         /\
        /  \  E2E Tests (5%)
       /────\  - Full tool execution with live API
      /      \ - Claude Desktop integration
     /────────\ 
    / Integra- \ Integration Tests (25%)
   / tion Tests \  - Tool + API client with fixtures
  /──────────────\ - Cache behavior
 /                \
/  Unit Tests (70%)\ Unit Tests (70%)
────────────────────  - Individual tools
                      - Cache logic
                      - Response transformation
                      - Input validation
```

### Test Categories

**1. Unit Tests (tests/unit/)**
```typescript
// Test individual tools in isolation
describe("HashrateStatsTool", () => {
  it("should format exahash values with 2 decimals", () => {
    const tool = new HashrateStatsTool(mockClient);
    const formatted = tool['formatHashrate'](756.42857);
    expect(formatted).toBe("756.43");
  });
});

// Test cache logic
describe("InsightsApiClient caching", () => {
  it("should return cached value if not expired", async () => {
    const client = new InsightsApiClient(config);
    
    // Prime cache
    await client.getHashrateStats();
    
    // Second call should use cache (no network request)
    const stats = await client.getHashrateStats();
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

**2. Integration Tests (tests/integration/)**
```typescript
// Test against real Insights API (marked @integration)
describe("Insights API Integration", () => {
  it("should fetch real hashrate stats from live API", async () => {
    const client = new InsightsApiClient({
      baseUrl: "https://insights.braiins.com/api"
    });
    
    const stats = await client.getHashrateStats();
    
    expect(stats).toMatchObject({
      current_hashrate_ehs: expect.any(Number),
      timestamp_utc: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/)
    });
    
    expect(stats.current_hashrate_ehs).toBeGreaterThan(0);
  }, 15000);  // 15 second timeout for real API
});
```

**3. E2E Tests (tests/e2e/)**
```typescript
// Test full MCP protocol with Claude Desktop
describe("MCP E2E", () => {
  it("should execute braiins_hashrate_stats via stdio", async () => {
    // Spawn MCP server process
    const server = spawn("node", ["dist/index.js"]);
    
    // Send MCP request
    server.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "braiins_hashrate_stats",
        arguments: {}
      }
    }) + "\n");
    
    // Wait for response
    const response = await readResponse(server.stdout);
    
    expect(response.result.content[0].text).toContain("Bitcoin Network Hashrate");
    
    server.kill();
  });
});
```

***

## Monitoring & Observability

### Metrics to Track

```typescript
interface InsightsMetrics {
  // Request metrics
  total_requests: number;
  requests_by_tool: Record<string, number>;
  average_response_time_ms: number;
  
  // Cache metrics
  cache_hit_rate: number;
  cache_size_mb: number;
  cache_evictions: number;
  
  // Error metrics
  error_rate: number;
  errors_by_type: Record<string, number>;
  
  // API health
  api_response_times: Record<string, number[]>;  // Last 100 per endpoint
  api_error_rate_by_endpoint: Record<string, number>;
}
```

### Structured Logging

```typescript
logger.info("Tool executed", {
  tool: "braiins_hashrate_stats",
  cached: true,
  cache_age_seconds: 145,
  response_size_bytes: 2048,
  duration_ms: 12
});

logger.warn("API request slow", {
  endpoint: "/v1.0/hashrate-and-difficulty-history",
  duration_ms: 3456,
  threshold_ms: 2000
});

logger.error("Tool execution failed", {
  tool: "braiins_blocks",
  error_type: "InsightsApiError",
  status_code: 500,
  endpoint: "/v1.0/blocks"
});
```

***

## Decision Log

### ADR-001: No Authentication Required

**Decision:** Do not implement API key management for Insights API

**Rationale:**
- Insights API is public (no auth documented)
- Testing confirms endpoints work without Authorization header
- Simplifies client implementation
- Reduces security surface area (no secrets to manage)

**Trade-offs:**
- Cannot track usage per user
- Rely on IP-based rate limiting (server-side)

***

### ADR-002: Aggressive Caching with Variable TTLs

**Decision:** Implement per-endpoint caching with TTLs matching data update frequency

**Rationale:**
- Many endpoints return data that changes infrequently (halvings, difficulty)
- Caching reduces load on Braiins infrastructure
- Improves response times (67ms cached vs 517ms uncached)
- Public API likely has lenient rate limits, but caching is polite

**TTL Strategy:**
```
Static data (halvings): 24 hours
Slow-changing (difficulty): 1 hour
Medium (hashrate): 5 minutes
Fast-changing (blocks): 30 seconds
```

**Trade-offs:**
- Stale data possible (but acceptable for analytics use case)
- Memory usage scales with cache size
- Need cache invalidation strategy for long-running servers

***

### ADR-003: Composite Tools for Common Workflows

**Decision:** Create high-level composite tools that aggregate multiple endpoints

**Rationale:**
- Users often ask questions that span multiple data sources
  - "What's the mining situation?" → hashrate + difficulty + price
  - "Is mining profitable?" → cost-to-mine + price + calculator
- Parallel requests reduce latency vs sequential tool calls
- Better UX (one tool call vs 3-4 separate calls)

**Implementation:**
```typescript
// Instead of:
// 1. braiins_hashrate_stats
// 2. braiins_difficulty_stats
// 3. braiins_price_stats
// (3 tool calls, ~1500ms total)

// Single tool:
braiins_mining_overview
// (1 tool call, ~500ms with parallel requests)
```

**Trade-offs:**
- More complex error handling (partial failures)
- Harder to test (more moving parts)
- Tool descriptions must be very clear about what data is included

***

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/docs)
- [Braiins Insights Dashboard](https://insights.braiins.com)
- [Braiins Insights API Documentation](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/blob/main/API.md)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

***

**Document Version:** 1.0  
**Last Updated:** December 13, 2025  
**Project:** Braiins Insights MCP Server  
**Repository:** https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server  
**Maintained By:** Technical Architecture Team  
**Review Cycle:** Quarterly or upon Insights API updates