# MCP Server Development Guidelines

**Location**: `.github/instructions/mcp-server.instructions.md`

---

## MCP-Specific Best Practices

### Tool Discovery & Registration

```typescript
// server.ts - FastMCP initialization
import { FastMCP } from "@modelcontextprotocol/sdk/server/fastmcp.js";
import * as tools from "./tools";

const mcp = new FastMCP({
  name: "braiins-insights-mcp-server",
  version: "1.0.0"
});

// Register all tools
mcp.tool("get_mining_stats", tools.getMiningStats);
mcp.tool("get_miner_details", tools.getMinerDetails);
mcp.tool("get_pool_analytics", tools.getPoolAnalytics);

// Start server
async function main() {
  await mcp.connect({
    transport: "stdio", // Standard input/output for Claude Desktop
    capabilities: ["tools", "resources"], // Enable both tools and resources
  });
}

main();
```

### Tool Lifecycle Pattern

Each tool must handle connection management per-invocation, NOT on server startup:

```typescript
@mcp.tool()
async function get_miner_details(miner_id: string): Promise<MinerDetails> {
  // ✅ Validate BEFORE connecting
  if (!isValidMinerId(miner_id)) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Invalid miner ID: ${miner_id}. Expected format: alphanumeric, 3-64 chars.`
      }]
    };
  }

  // ✅ Create connection per tool call
  const grpcClient = new BraiinsOSClient(
    process.env.BRAIINS_MINER_GRPC_HOST,
    process.env.BRAIINS_MINER_GRPC_PORT
  );

  try {
    // Add timeout protection
    const details = await Promise.race([
      grpcClient.getMinerDetails(miner_id),
      sleep(30000) // 30-second timeout
    ]);

    return {
      miner_id,
      model: details.model,
      temperature_celsius: details.temp,
      uptime_hours: details.uptime,
      current_hashrate_ths: details.hashrate,
      // ... other fields
    };
  } catch (error) {
    // ✅ Structured error response
    if (error.code === "DEADLINE_EXCEEDED") {
      return errorResponse(`Timeout querying miner ${miner_id} after 30s`);
    }
    if (error.code === "UNAUTHENTICATED") {
      return errorResponse(`Authentication failed for miner ${miner_id}`);
    }
    return errorResponse(`Failed to get miner details: ${error.message}`);
  } finally {
    grpcClient.close(); // Clean up connection
  }
}
```

### Tool Schema with Zod Validation

Always use Zod for schema definition - enables auto-schema generation and validation:

```typescript
import { z } from "zod";

const GetPoolAnalyticsInput = z.object({
  pool_id: z.string()
    .describe("Braiins Pool account ID (e.g., 'my-pool-001')")
    .min(3, "Pool ID must be at least 3 characters")
    .max(64, "Pool ID must be at most 64 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Pool ID can only contain alphanumeric, dash, and underscore"),
  
  period: z.enum(["1h", "24h", "7d", "30d"])
    .describe("Time period for analysis. Shorter periods = more detailed data.")
    .default("24h"),
  
  include_revenue: z.boolean()
    .describe("Include estimated BTC revenue calculations")
    .default(true)
});

@mcp.tool()
async function get_pool_analytics(
  input: z.infer<typeof GetPoolAnalyticsInput>
): Promise<PoolAnalytics> {
  // Zod automatically validates input
  const { pool_id, period, include_revenue } = input;
  // ... implementation
}
```

### Resource Pattern for Cached Data

Use MCP resources for data that should be cached and referenced:

```typescript
// Define resource URI pattern
@mcp.resource("mining://pool/{pool_id}/stats")
async function poolStatsResource(uri: string): Promise<ResourceContents> {
  const poolId = uri.match(/mining:\/\/pool\/([^/]+)/)?.[1];
  
  // Check cache first
  const cached = cache.get(`pool-stats:${poolId}`);
  if (cached) return { uri, mimeType: "application/json", text: cached };

  // Fetch fresh data
  const stats = await fetchPoolStats(poolId);
  const jsonStr = JSON.stringify(stats);
  
  // Cache for 5 minutes
  cache.set(`pool-stats:${poolId}`, jsonStr, 300);
  
  return { uri, mimeType: "application/json", text: jsonStr };
}
```

### Prompt Templates for Complex Workflows

Use MCP prompts to guide LLM on multi-step mining analysis:

```typescript
@mcp.prompt()
async function analyzePoolPerformance(
  pool_id: string,
  goal: "maximize_roi" | "stability" | "growth"
): Promise<PromptContents> {
  return {
    arguments: [
      {
        type: "text",
        text: `Analyze mining pool ${pool_id} for goal: ${goal}

1. Get current mining_stats to understand hashrate and worker count
2. Get pool_analytics for 30-day trend
3. Calculate estimated ROI based on current difficulty
4. Identify bottlenecks or optimization opportunities
5. Provide specific recommendations as bullet points

Return analysis as structured JSON with fields: summary, metrics, recommendations.`
      }
    ]
  };
}
```

## Connection Management

### gRPC Connection Pooling (Production)

For high-volume scenarios, implement connection pooling:

```typescript
class MinerConnectionPool {
  private connections = new Map<string, grpc.Client>();
  private maxConnections = 10;

  async getConnection(minerId: string): Promise<grpc.Client> {
    // Reuse existing connection if available
    if (this.connections.has(minerId)) {
      return this.connections.get(minerId)!;
    }

    // Create new connection if under limit
    if (this.connections.size < this.maxConnections) {
      const conn = new BraiinsOSClient(minerId);
      this.connections.set(minerId, conn);
      return conn;
    }

    // Wait for connection to be available
    throw new Error(`Connection pool exhausted (${this.maxConnections} max)`);
  }

  async closeConnection(minerId: string) {
    const conn = this.connections.get(minerId);
    if (conn) {
      conn.close();
      this.connections.delete(minerId);
    }
  }
}
```

### REST API Client with Retry Logic

```typescript
class BraiinsPoolAPI {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...options.headers
          }
        });

        if (response.status === 429) {
          // Rate limited - back off exponentially
          const delay = this.retryDelay * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<T>;
      } catch (error) {
        if (attempt === this.maxRetries - 1) throw error;
        await sleep(this.retryDelay);
      }
    }

    throw new Error("Max retries exceeded");
  }
}
```

## Error Response Format

Always use consistent, actionable error messages:

```typescript
interface ErrorResponse {
  isError: true;
  content: [{
    type: "text";
    text: string; // Human-readable message with next steps
  }];
}

function errorResponse(message: string): ErrorResponse {
  return {
    isError: true,
    content: [{
      type: "text",
      text: message
    }]
  };
}

// Usage
if (!miner_id) {
  return errorResponse(
    "miner_id is required. Find valid miner IDs in your Braiins Pool dashboard."
  );
}
```

## Testing MCP Tools

### Test with MCP Inspector

```bash
# Interactive tool tester
npx @modelcontextprotocol/inspector npx braiins-mcp-server

# Lists all available tools
# Shows tool descriptions
# Test tool invocation with inputs
# Inspect tool outputs and errors
```

### Unit Test Pattern

```typescript
import { getMiningStats } from "@/tools/mining-stats";
import { mockBraiinsAPI } from "@/api/__mocks__";

describe("getMiningStats", () => {
  beforeEach(() => {
    mockBraiinsAPI.reset();
  });

  it("should return mining stats for valid pool", async () => {
    mockBraiinsAPI.mockPoolStats({
      pool_id: "test-pool",
      hashrate_ths: 100,
      workers: 5,
      daily_revenue_btc: 0.025
    });

    const result = await getMiningStats("test-pool");

    expect(result.hashrate_ths).toBe(100);
    expect(result.workers).toBe(5);
  });

  it("should handle API timeout", async () => {
    mockBraiinsAPI.mockTimeout("test-pool");

    const result = await getMiningStats("test-pool");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("timeout");
  });

  it("should validate pool_id format", async () => {
    const result = await getMiningStats("invalid pool id");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Pool ID must be alphanumeric");
  });
});
```

## Rate Limiting Implementation

```typescript
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 100;
  private readonly windowMs = 60000; // 1 minute

  isAllowed(): boolean {
    const now = Date.now();
    // Remove old requests outside window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getRemainingRequests(): number {
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.windowMs;
  }
}

// Use in tools
const rateLimiter = new RateLimiter();

@mcp.tool()
async function get_mining_stats(pool_id: string) {
  if (!rateLimiter.isAllowed()) {
    const resetTime = new Date(rateLimiter.getResetTime());
    return errorResponse(
      `Rate limit exceeded. Resets at ${resetTime.toISOString()}`
    );
  }
  // ... implementation
}
```

## Logging Strategy

Use structured logging for observability:

```typescript
import { Logger } from "@/utils/logger";

const logger = new Logger("mining-stats");

@mcp.tool()
async function get_mining_stats(pool_id: string) {
  logger.info("Fetching mining stats", { pool_id });

  try {
    const api = new BraiinsPoolAPI();
    const stats = await api.getPoolStats(pool_id);
    
    logger.info("Stats fetched successfully", { 
      pool_id, 
      hashrate_ths: stats.hashrate 
    });
    
    return stats;
  } catch (error) {
    logger.error("Failed to fetch stats", { pool_id, error: error.message });
    return errorResponse(`Failed: ${error.message}`);
  }
}
```
