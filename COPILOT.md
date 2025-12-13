# Braiins Insights MCP Server - Universal Agent Instructions

## Project Overview

**Braiins Insights MCP Server** is a Model Context Protocol (MCP) server that provides AI-powered access to mining pool analytics, hardware monitoring, and operational intelligence from the Braiins ecosystem.

### Core Purpose
Enable LLM-powered applications to query real-time mining statistics, pool performance metrics, and miner hardware status through a standardized MCP interface.

### Tech Stack
- **Language**: TypeScript (Node.js 18+)
- **Framework**: FastMCP (`@modelcontextprotocol/sdk`)
- **External APIs**: 
  - Braiins Pool API (REST) - mining pool analytics
  - Braiins OS Public API (gRPC) - miner hardware details
- **Transport**: STDIO (standard input/output for Claude Desktop)
- **Database**: In-memory cache (optional Redis for production)

## Project Structure

```
src/
├── server.ts              # MCP server entry point & FastMCP initialization
├── tools/                 # MCP tool implementations (6-8 tools total)
│   ├── mining-stats.ts    # Pool hashrate, workers, revenue metrics
│   ├── miner-details.ts   # Individual miner status, temperature, uptime
│   ├── pool-analytics.ts  # Historical performance, APY, payout analysis
│   └── error-handling.ts  # Structured error responses
├── api/                   # External API clients
│   ├── braiins-pool-api.ts      # REST client with auth
│   ├── braiins-os-api.ts        # gRPC client for hardware queries
│   └── rate-limiter.ts          # API rate limiting (max 100 req/min)
├── types/                 # TypeScript interfaces
│   ├── mining.ts          # Mining domain types
│   ├── mcp.ts             # MCP schema types
│   └── api.ts             # External API response types
└── utils/
    ├── cache.ts           # Response caching strategy
    └── validation.ts      # Input sanitization
```

## Code Quality Standards

### TypeScript & Node.js
- **Strict Mode**: `strict: true` in tsconfig.json - NO `any` types
- **Naming Convention**: camelCase for functions/variables, PascalCase for classes/types
- **Imports**: Absolute imports via `@/` alias, group externals → internals → types
- **Comments**: Explain WHY, not WHAT. Document API contract expectations

### Async Patterns
```typescript
// ✅ Use async/await for MCP tools
@mcp.tool()
async function get_mining_stats(pool_id: string): Promise<MiningStats> {
  return await api.fetchPoolStats(pool_id);
}

// ✅ Connection per tool call, NOT on server startup
async function get_miner_details(miner_id: string) {
  const grpcConn = await connectToMiner(miner_id); // per call
  try { 
    return await grpcConn.GetMinerStatus(); 
  } finally { 
    grpcConn.close(); 
  }
}
```

### Error Handling
```typescript
// ✅ Return structured error responses
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Failed to fetch miner stats for ID 'invalid-id'. Error: Miner not found on Braiins Pool. Verify miner_id matches pool account."
  }]
}

// ✅ Validate inputs BEFORE API calls
if (!miner_id || miner_id.length < 3) {
  return errorResponse("miner_id must be 3+ characters");
}
```

## MCP Tool Design

### Tool Naming & Descriptions
Use action-oriented names that LLMs can understand:

| Tool | Description (for Claude) | Returns |
|------|--------------------------|---------|
| `get_mining_stats` | Fetch current pool hashrate, workers online, estimated BTC revenue, network difficulty | JSON: { hashrate_ths, workers_count, daily_btc } |
| `get_miner_details` | Get individual ASIC status including hardware model, temperature, uptime, current work | JSON: { miner_model, temp_c, uptime_hours, work_status } |
| `get_pool_analytics` | Analyze historical pool performance over selected timeframe | JSON: { avg_hashrate, total_revenue, blocks_found, payout_delays } |
| `estimate_mining_roi` | Calculate estimated ROI based on current difficulty and power cost | JSON: { monthly_btc, electricity_cost, roi_percent } |

### Input Validation
```typescript
// ✅ Validate and document expectations
const PoolIdSchema = z.object({
  pool_id: z.string()
    .describe("Braiins Pool account ID (found in pool settings)")
    .min(3).max(64),
  time_period: z.enum(["1h", "24h", "7d", "30d"])
    .describe("Lookback period for statistics")
    .default("24h")
});
```

### Resource Naming (for MCP resources)
Use parameterized URIs for cached data:
```
mining://pool/{pool_id}/stats
mining://miner/{miner_id}/status
mining://pool/{pool_id}/history/{period}
```

## Security & Environment

### Secrets Management
- ✅ Use `.env` (git-ignored) for credentials:
  - `BRAIINS_POOL_API_KEY` - REST API token
  - `BRAIINS_MINER_GRPC_PORT` - Hardware API gRPC port
  - `BRAIINS_MINER_PASSWORD` - Miner login password (if needed)
- ❌ NEVER hardcode API keys, miner IDs, or credentials
- ✅ Validate credentials at first use, NOT server startup (allows tool listing without valid config)

### Input Sanitization
- Validate pool IDs against regex: `^[a-zA-Z0-9_-]{3,64}$`
- Sanitize temperature sensors to expected ranges (0-150°C)
- Rate limit: max 100 requests/min per API key
- Timeout: 30 seconds for gRPC, 10 seconds for REST calls

## Testing Requirements

### Unit Tests (>80% coverage)
```typescript
describe('get_mining_stats', () => {
  it('should return hashrate for valid pool_id', async () => {
    const result = await get_mining_stats('my-pool');
    expect(result.hashrate_ths).toBeGreaterThan(0);
  });

  it('should handle invalid pool_id gracefully', async () => {
    const result = await get_mining_stats('INVALID');
    expect(result.isError).toBe(true);
  });
});
```

### Integration Tests
- Test full MCP request/response cycle with FastMCP test harness
- Mock Braiins APIs to avoid dependency on external services
- Verify gRPC connection handling under load

### Test Execution
```bash
npm test                    # Run all tests
npm run test:coverage      # Coverage report (aim for 80%+)
npm run test:integration   # Integration suite only
```

## Development Workflow

### Creating a New Tool
1. **Define the tool** in `src/tools/` with FastMCP decorator:
```typescript
@mcp.tool()
async function get_pool_revenue(pool_id: string) {
  // Implementation
}
```
2. **Add input validation** using Zod schema
3. **Write unit tests** covering success and error cases
4. **Document in markdown** with example usage
5. **Test with MCP Inspector**: `npx @modelcontextprotocol/inspector npx braiins-mcp-server`

### Debugging
- Use `DEBUG=mcp:*` environment variable
- MCP Inspector provides interactive tool testing
- Log API request/response payloads for troubleshooting

## Best Practices

### ✅ DO
- Write tool descriptions assuming LLM knows NOTHING about mining
- Include example pool/miner IDs in tool descriptions
- Return partial data when APIs timeout (graceful degradation)
- Cache frequently-accessed data (stats valid for 5-10 minutes)
- Document API rate limits and retry behavior
- Test error states: invalid IDs, timeouts, permission errors

### ❌ DON'T
- Create generic tools like "query_api" or "fetch_data"
- Assume LLMs understand Braiins abbreviations (explain them)
- Skip error handling for external API calls
- Hardcode timeouts or retry counts
- Mix domain logic with MCP protocol code
- Commit .env files with real credentials

## Deployment

### Docker Containerization
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
```

### Health Checks
- Implement `/health` endpoint for HTTP transports
- Verify Braiins API connectivity on startup
- Return 503 if APIs unreachable

### Environment Variables Required
```env
# Braiins API Credentials
BRAIINS_POOL_API_KEY=your_api_key_here
BRAIINS_POOL_API_URL=https://api.braiins.com/v2
BRAIINS_MINER_GRPC_HOST=miner.local
BRAIINS_MINER_GRPC_PORT=50051

# Optional
LOG_LEVEL=info
CACHE_TTL_SECONDS=300
MAX_RETRIES=3
```

## CI/CD Pipeline

### Pre-commit Validation
```bash
npm run lint              # ESLint + TypeScript strict mode
npm run type-check       # Full type checking
npm run format:check     # Prettier format validation
```

### GitHub Actions Checks
- Lint, type-check, test suite (>80% coverage)
- Security scanning (npm audit, no hardcoded secrets)
- Build Docker image
- Integration test with mock APIs

## Common Patterns

### Querying Multiple Miners in Parallel
```typescript
async function get_all_miner_status(miner_ids: string[]): Promise<MinerStatus[]> {
  const promises = miner_ids.map(id => get_miner_details(id));
  return Promise.all(promises); // Parallel execution
}
```

### Handling Missing or Invalid Miner
```typescript
// Always return structured error response
const result = await api.getMinerStatus(miner_id);
if (!result.exists) {
  return errorResponse(
    `Miner '${miner_id}' not found. Check pool dashboard for valid miner IDs.`
  );
}
```

## References

- [Braiins Pool API Docs](https://braiins.com/pool)
- [Braiins OS Public API](https://github.com/braiins/bos-plus-api)
- [MCP Specification](https://modelcontextprotocol.io)
- [FastMCP Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
