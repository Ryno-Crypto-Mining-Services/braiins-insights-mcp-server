# GitHub Copilot Configuration for Braiins Insights MCP Server

**Location**: `.github/copilot-instructions.md`

---

## Project Overview

Braiins Insights MCP Server provides AI agents direct access to mining pool analytics and hardware monitoring through the Model Context Protocol.

## Tech Stack

- **Runtime**: Node.js 18+ (LTS)
- **Language**: TypeScript with strict mode
- **Framework**: FastMCP from @modelcontextprotocol/sdk
- **External APIs**: Braiins Pool API (REST), Braiins OS Public API (gRPC)
- **Testing**: Jest for unit tests, mocked APIs for integration tests
- **CI/CD**: GitHub Actions

## File Structure Guide

- `src/server.ts` - FastMCP server initialization and tool registration
- `src/tools/` - MCP tool implementations (6-8 tools for mining analytics)
- `src/api/` - Braiins API client wrappers with authentication
- `src/types/` - TypeScript domain interfaces
- `tests/` - Unit and integration test suites
- `.env.example` - Environment variable template (copy to .env before running)

## Code Quality Standards

### Strict TypeScript
- No `any` types - use explicit types or `unknown` with type guards
- Enable strict mode in tsconfig.json at all times
- Interfaces for all function parameters and return types
- Enums for fixed option sets (e.g., time periods: "1h", "24h", "7d")

### Naming Conventions
- Functions: `camelCase` (get_mining_stats, calculateROI)
- Classes/Types: `PascalCase` (MiningStats, BraiinsPoolClient)
- Constants: `UPPER_SNAKE_CASE` (API_BASE_URL, MAX_RETRIES)
- Private methods: `_prefix` (e.g., _validateInput)

### Imports Organization
```typescript
// 1. External dependencies
import { FastMCP } from "@modelcontextprotocol/sdk";

// 2. Internal modules
import { BraiinsPoolAPI } from "@/api/braiins-pool-api";
import { validatePoolId } from "@/utils/validation";

// 3. Types
import type { MiningStats, PoolAnalytics } from "@/types";
```

## MCP Tool Development

### Tool Design Principles
- **Single Responsibility**: Each tool does ONE thing well
- **Self-Documenting**: Descriptions written for AI comprehension, not internal notes
- **Resilient**: Handle API failures gracefully with informative errors
- **Validated**: Sanitize all user inputs before processing

### Required Elements for Each Tool

```typescript
@mcp.tool()
async function get_mining_stats(
  pool_id: string,
  /** Lookback period: "1h", "24h", "7d", or "30d" */
  period: "1h" | "24h" | "7d" | "30d" = "24h"
): Promise<MiningStats> {
  // 1. Validate inputs
  if (!pool_id || pool_id.length < 3) {
    return errorResponse("pool_id must be at least 3 characters");
  }

  // 2. Connect per call (not on startup)
  const api = new BraiinsPoolAPI(process.env.BRAIINS_POOL_API_KEY);

  // 3. Execute with timeout
  try {
    const stats = await api.getPoolStats(pool_id, period);
    return stats; // Return structured JSON
  } catch (error) {
    return errorResponse(`Failed to fetch stats: ${error.message}`);
  }
}
```

### Tool Descriptions (Critical for LLM Understanding)
Write as if explaining to someone who knows NOTHING about Bitcoin mining:

❌ BAD: "Get pool stats"
✅ GOOD: "Fetch current mining pool performance metrics including total hashrate (TH/s), number of active workers, estimated daily Bitcoin earnings, and network difficulty. Returns latest 24-hour average by default."

## Error Handling Strategy

### Always Use Structured Responses
```typescript
// ✅ Correct error response format
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Miner 'invalid-id' not found on Braiins Pool. Check your pool dashboard for valid miner IDs (format: alphanumeric, 3-64 characters)."
  }]
}
```

### Graceful Degradation
- Return partial results if timeout occurs
- Cache stale data when APIs are unavailable
- Never throw unhandled exceptions to MCP client

## Testing Requirements

### Unit Test Coverage: 80% Minimum
```typescript
describe("get_mining_stats", () => {
  it("should fetch stats for valid pool_id", async () => {
    // Test with mock API
  });

  it("should reject invalid pool_id", async () => {
    // Test error handling
  });

  it("should handle API timeout gracefully", async () => {
    // Test timeout behavior
  });
});
```

### Integration Tests
- Test full MCP request/response cycle
- Mock Braiins APIs (no external calls in CI)
- Verify gRPC connection handling
- Test rate limiting behavior

### Run Tests Locally
```bash
npm test                    # All tests with coverage
npm run test:watch         # Watch mode during development
npm run test:integration   # Integration suite only
```

## Security & Environment

### Secrets Management
- Store API keys in `.env` (git-ignored)
- Required variables:
  - `BRAIINS_POOL_API_KEY` - REST API authentication
  - `BRAIINS_MINER_GRPC_PORT` - Hardware API port
- Check .gitignore includes `.env`, `.env.local`, `*.pem`, `*.key`

### Input Validation
```typescript
// Validate pool IDs before API calls
const poolIdRegex = /^[a-zA-Z0-9_-]{3,64}$/;
if (!poolIdRegex.test(pool_id)) {
  return errorResponse("Invalid pool_id format");
}

// Sanitize temperature ranges (ASIC hardware limits)
if (temp > 150 || temp < 0) {
  return errorResponse("Temperature out of acceptable range");
}
```

### API Rate Limiting
- Implement max 100 requests/minute per API key
- Add retry logic with exponential backoff
- Document rate limits in tool descriptions

## Debugging Tips

### Local Development
```bash
# Test with MCP Inspector (interactive tool tester)
npx @modelcontextprotocol/inspector npx braiins-mcp-server

# Enable debug logging
DEBUG=mcp:* npm run dev

# Verify tool schemas are correct
curl -X GET http://localhost:3000/tools
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Tools not appearing in Claude | Restart Claude Desktop, check MCP server logs |
| API timeout errors | Increase timeout, check network connectivity |
| "Invalid credentials" | Verify BRAIINS_POOL_API_KEY in .env |
| gRPC connection errors | Check BRAIINS_MINER_GRPC_PORT is accessible |

## Deployment

### Docker Build
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
```

### Environment Variables Required at Runtime
```env
# Braiins API
BRAIINS_POOL_API_KEY=sk_prod_xxxxx
BRAIINS_POOL_API_URL=https://api.braiins.com/v2
BRAIINS_MINER_GRPC_HOST=miner.local
BRAIINS_MINER_GRPC_PORT=50051

# Optional
LOG_LEVEL=info
CACHE_TTL_SECONDS=300
NODE_ENV=production
```

## Best Practices Checklist

### Before Submitting PR
- [ ] Run `npm run lint` and fix all warnings
- [ ] Run `npm run type-check` (no TypeScript errors)
- [ ] Run `npm test` and verify >80% coverage
- [ ] Test tools locally with MCP Inspector
- [ ] Update tool descriptions if behavior changed
- [ ] No hardcoded API keys or credentials
- [ ] Error messages are clear and actionable

### Code Review Focus Areas
- Input validation (all parameters sanitized)
- Error handling (no unhandled promise rejections)
- Type safety (no `any` types, strict mode enabled)
- Test coverage (>80% for new code)
- Documentation (tool descriptions are LLM-friendly)

## References

- [MCP Specification](https://modelcontextprotocol.io/docs)
- [FastMCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Braiins Pool API](https://api.braiins.com)
- [Braiins OS Public API](https://github.com/braiins/bos-plus-api)
