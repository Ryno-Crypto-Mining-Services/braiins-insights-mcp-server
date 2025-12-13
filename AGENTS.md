# AGENTS.md – Universal Development Standards for Braiins Insights MCP Server

## Project Overview

**Project:** Braiins Insights MCP Server  
**Purpose:** Build a Model Context Protocol (MCP) server that exposes Braiins insights statistics to AI coding assistants (Claude, Cursor, Copilot) via standardized tools.  
**Core Capability:** Fetch real-time and historical pool metrics—hashrate, worker counts, share rates, earnings, network difficulty—from the Braiins Public API and surface them as queryable MCP tools.

**Architecture Summary:**
- Node.js/TypeScript backend using MCP SDK ([modelcontextprotocol.io](https://modelcontextprotocol.io/docs/build-server))
- RESTful HTTP client with retry logic, exponential backoff, and rate limiting
- Four core MCP tools: `braiins_get_pool_stats`, `braiins_get_worker_stats`, `braiins_list_pool_groups`, `braiins_get_hashrate_history`
- Single-process server compatible with Claude Desktop and other MCP clients
- Production-ready error handling, logging, and observability

**Technology Stack:**
- Runtime: Node.js 18+ with TypeScript 5.3+
- API Client: Native `fetch` with custom retry/rate limiting
- Validation: Zod schemas for input/output validation
- Testing: Jest with >85% coverage target
- Build: esbuild or tsup for fast compilation
- Package Manager: npm or pnpm

**API Reference:**
- [Braiins Public API Documentation](https://academy.braiins.com/en/mining-insights/public-api/)
- [Braiins OpenAPI Specification](https://developer.braiins-os.com/latest/openapi.html)

***

## Code Discovery: File Structure & Naming Conventions

```
braiins-pool-mcp-server/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── types/
│   │   ├── braiins.ts              # Braiins API TypeScript interfaces
│   │   ├── mcp.ts                  # MCP tool schemas
│   │   └── errors.ts               # Custom error types
│   ├── api/
│   │   ├── client.ts               # HTTP client (fetch-based)
│   │   ├── endpoints/
│   │   │   ├── pool-stats.ts       # GET /api/pool/stats
│   │   │   ├── worker-stats.ts     # GET /api/pools/{pool}/workers
│   │   │   ├── pool-groups.ts      # GET /api/account/pool-groups
│   │   │   └── hashrate-history.ts # GET /api/pool/hashrate-history
│   │   └── auth.ts                 # API key management
│   ├── tools/
│   │   ├── pool-stats.ts           # MCP tool: braiins_get_pool_stats
│   │   ├── worker-stats.ts         # MCP tool: braiins_get_worker_stats
│   │   ├── pool-groups.ts          # MCP tool: braiins_list_pool_groups
│   │   └── hashrate-history.ts     # MCP tool: braiins_get_hashrate_history
│   ├── utils/
│   │   ├── logger.ts               # Structured logging
│   │   ├── retry.ts                # Exponential backoff logic
│   │   └── validation.ts           # Input validation (zod)
│   └── handlers/
│       └── error-handler.ts        # Centralized error handling
├── tests/
│   ├── unit/
│   │   ├── api.client.test.ts
│   │   ├── endpoints.test.ts
│   │   └── validation.test.ts
│   ├── integration/
│   │   ├── tools.test.ts           # Test tool outputs with mocked API
│   │   ├── fixtures/
│   │   │   ├── pool-stats.json     # Mock Braiins API responses
│   │   │   ├── worker-stats.json
│   │   │   └── hashrate-history.json
│   │   └── e2e.test.ts             # End-to-end MCP protocol tests
│   └── setup.ts                    # Test utilities
├── .env.example                    # Environment variables template
├── tsconfig.json                   # TypeScript strict mode
├── jest.config.js                  # Jest test runner configuration
├── .eslintrc.json                  # Code quality rules
├── package.json                    # Dependencies (mcp, fetch, zod, etc.)
├── README.md                       # Setup and usage guide
├── AGENTS.md                       # This file (universal rules)
├── CLAUDE.md                       # Claude-specific instructions
├── DEVELOPMENT_PLAN.md             # 8-day implementation roadmap
├── ARCHITECTURE.md                 # Technical system design
├── API.md                          # API endpoints and request parameters
├── TODO.md                         # Task checklist
├── MULTIAGENT_PLAN.md              # Agent coordination
└── .gitignore                      # Standard exclusions
```

**Naming Conventions:**
- **Files:** `kebab-case.ts` (e.g., `pool-stats.ts`, `error-handler.ts`)
- **Directories:** `lowercase` (e.g., `src/api/`, `tests/unit/`)
- **Classes:** `PascalCase` (e.g., `BraiinsApiClient`, `PoolStatsError`)
- **Functions:** `camelCase` (e.g., `fetchPoolStats()`, `validateWorkerName()`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `BRAIINS_API_BASE_URL`, `MAX_RETRY_ATTEMPTS`)
- **Interfaces:** `PascalCase` with optional `I` prefix (e.g., `IPoolStats`, `BraiinsPoolResponse`)
- **MCP Tools:** `snake_case` with `braiins_` prefix (e.g., `braiins_get_pool_stats`)

***

## Code Editing Standards: TypeScript & Async/Await Patterns

### TypeScript Style Guide

**Strict Compiler Settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

**Async/Await Patterns:**

✅ **Good: Explicit error handling**
```typescript
// Always use try-catch with specific error types
async function fetchPoolStats(poolName: string): Promise<PoolStats> {
  try {
    const response = await client.get<PoolStatsResponse>(
      `/api/pools/${poolName}/stats`
    );
    
    if (!response.ok) {
      throw new BraiinsApiError(
        `Pool API returned ${response.status}`,
        response.status
      );
    }
    
    return transformPoolResponse(response.data);
  } catch (error) {
    if (error instanceof BraiinsApiError) {
      logger.error(`API Error: ${error.message}`, { statusCode: error.statusCode });
      throw error;
    }
    
    if (error instanceof TypeError) {
      // Network error (connection timeout, DNS failure)
      logger.error(`Network error: ${error.message}`);
      throw new NetworkError(`Could not reach Braiins API: ${error.message}`);
    }
    
    throw new UnexpectedError(`Unexpected error fetching pool stats: ${error}`);
  }
}
```

❌ **Bad: Silent errors, swallowing exceptions**
```typescript
// DON'T: No error handling
async function fetchPoolStats(poolName: string): Promise<PoolStats> {
  const response = await client.get(`/api/pools/${poolName}/stats`);
  return response.data;
}

// DON'T: Generic catch-all
try {
  // ...
} catch (error) {
  console.log("Error occurred");
}
```

**Type Guard Patterns:**
```typescript
// Use type predicates for runtime type checking
function isPoolStats(value: unknown): value is PoolStats {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pool_name' in value &&
    'hashrate_24h' in value &&
    'active_workers' in value
  );
}

// Always validate API responses before transformation
async function fetchAndValidate(url: string): Promise<PoolStats> {
  const raw = await client.get<unknown>(url);
  
  if (!isPoolStats(raw.data)) {
    throw new ValidationError(
      `Invalid pool stats structure: ${JSON.stringify(raw.data)}`
    );
  }
  
  return raw.data;
}
```

**Retry Logic with Exponential Backoff:**
```typescript
// Centralized retry utility for API resilience
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      if (error instanceof RateLimitError) {
        const backoffMs = delayMs * Math.pow(2, attempt - 1);
        logger.warn(`Rate limited. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`);
        await sleep(backoffMs);
      } else if (isTransientError(error)) {
        const backoffMs = delayMs * Math.pow(2, attempt - 1);
        logger.warn(`Transient error: ${error.message}. Retrying in ${backoffMs}ms`);
        await sleep(backoffMs);
      } else {
        throw error; // Non-transient, fail immediately
      }
    }
  }
  throw new Error('Unreachable: retry loop should always return or throw');
}

// Usage in API client
async function fetchWithRetry(url: string) {
  return withRetry(() => client.get(url));
}
```

***

## Tool Development Guidelines: MCP Tool Naming & Schemas

### Tool Naming Convention

All MCP tools follow the pattern: `braiins_<operation>_<resource>`

| Tool Name | Operation | Resource | Purpose |
|-----------|-----------|----------|---------|
| `braiins_get_pool_stats` | GET (read-only) | `pool` | Fetch hashrate, worker count, share difficulty |
| `braiins_get_worker_stats` | GET (read-only) | `worker` | Fetch individual worker metrics |
| `braiins_list_pool_groups` | LIST (enumeration) | `pool_groups` | List mining groups/configurations |
| `braiins_get_hashrate_history` | GET (historical) | `hashrate_history` | Fetch 30-day hashrate trend |

### MCP Tool Input/Output Schemas

**braiins_get_pool_stats**
```typescript
// src/types/mcp.ts

export const PoolStatsToolSchema = {
  name: "braiins_get_pool_stats",
  description: "Fetch real-time Braiins mining pool statistics including hashrate, active workers, and earnings",
  inputSchema: {
    type: "object",
    properties: {
      pool_name: {
        type: "string",
        description: "Mining pool identifier (e.g., 'BTC' for Bitcoin, 'BCH' for Bitcoin Cash). Defaults to 'BTC' if omitted.",
        enum: ["BTC", "BCH", "BSV", "ERG", "NEXA"]
      },
      time_window: {
        type: "string",
        description: "Time period for statistics ('now', '1h', '24h', '7d'). Defaults to '24h'.",
        enum: ["now", "1h", "24h", "7d"]
      }
    },
    required: []
  }
};

// Response type matching Braiins API v1
export interface PoolStatsResponse {
  pool_name: string;
  hashrate_ph_s: number;           // Total pool hashrate in petahashes/sec
  hashrate_24h_ph_s: number;       // 24h average
  active_workers: number;
  shares_per_second: number;
  estimated_rewards_btc: number;   // 24h estimated reward
  difficulty: number;              // Network difficulty
  blocks_found_24h: number;
  pool_blocks_per_day: number;
  timestamp_utc: string;            // ISO 8601 format
}

export type PoolStatsInput = {
  pool_name?: "BTC" | "BCH" | "BSV" | "ERG" | "NEXA";
  time_window?: "now" | "1h" | "24h" | "7d";
};
```

**Input Validation with Zod:**
```typescript
// src/utils/validation.ts

import { z } from "zod";

const PoolNameSchema = z.enum(["BTC", "BCH", "BSV", "ERG", "NEXA"]);
const TimeWindowSchema = z.enum(["now", "1h", "24h", "7d"]);

export const PoolStatsInputSchema = z.object({
  pool_name: PoolNameSchema.optional().default("BTC"),
  time_window: TimeWindowSchema.optional().default("24h")
});

export function validatePoolStatsInput(input: unknown): PoolStatsInput {
  try {
    return PoolStatsInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Invalid pool stats parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`
      );
    }
    throw error;
  }
}
```

***

## Testing Strategy: Unit, Integration, Mocking

### Testing Philosophy

- **Unit Tests:** Isolated function/class tests with 100% mocked dependencies (Jest)
- **Integration Tests:** API client + endpoint combinations with fixture data
- **E2E Tests:** Full MCP tool execution against mocked Braiins API responses
- **Target Coverage:** >85% (lines of business logic, critical paths)
- **No Production Dependencies:** All tests use local fixtures (JSON files) or in-memory mocks

### Test Structure

```typescript
// tests/unit/api.client.test.ts
import { BraiinsApiClient } from "../../src/api/client";
import { BraiinsApiError, RateLimitError } from "../../src/types/errors";

describe("BraiinsApiClient", () => {
  let client: BraiinsApiClient;
  
  beforeEach(() => {
    client = new BraiinsApiClient({
      apiKey: "test-key-12345",
      baseUrl: "https://api.braiins.com",
      timeout: 5000,
      retryAttempts: 2
    });
  });

  describe("GET /api/pools/{pool}/stats", () => {
    it("should return PoolStats with hashrate and worker count", async () => {
      // Arrange: Mock fetch
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          pool_name: "BTC",
          hashrate_ph_s: 450.5,
          active_workers: 1250,
          shares_per_second: 8500.25,
          estimated_rewards_btc: 0.045,
          difficulty: 23000000000000,
          blocks_found_24h: 14,
          timestamp_utc: "2025-12-12T18:50:00Z"
        })
      });

      // Act
      const stats = await client.getPoolStats("BTC");

      // Assert
      expect(stats.pool_name).toBe("BTC");
      expect(stats.hashrate_ph_s).toBe(450.5);
      expect(stats.active_workers).toBe(1250);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.braiins.com/api/pools/BTC/stats",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Authorization": "Bearer test-key-12345"
          })
        })
      );
    });

    it("should throw BraiinsApiError on 401 Unauthorized", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
      });

      await expect(client.getPoolStats("BTC"))
        .rejects
        .toThrow(BraiinsApiError);
    });

    it("should retry on 429 Rate Limit (max 2 attempts)", async () => {
      let callCount = 0;
      
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: "Too Many Requests"
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ pool_name: "BTC", hashrate_ph_s: 100 })
        });
      });

      const stats = await client.getPoolStats("BTC");
      
      expect(stats.hashrate_ph_s).toBe(100);
      expect(callCount).toBe(2); // Retried once
    });
  });
});
```

### Integration Test with Fixtures

```typescript
// tests/integration/tools.test.ts
import { PoolStatsTool } from "../../src/tools/pool-stats";
import poolStatsFixture from "./fixtures/pool-stats.json";

describe("PoolStatsTool Integration", () => {
  let tool: PoolStatsTool;
  
  beforeEach(() => {
    // Mock BraiinsApiClient to return fixture data
    tool = new PoolStatsTool({
      apiClient: {
        getPoolStats: jest.fn().mockResolvedValue(poolStatsFixture)
      }
    });
  });

  it("should return formatted pool statistics for LLM consumption", async () => {
    const result = await tool.execute({ pool_name: "BTC", time_window: "24h" });
    
    expect(result).toMatchObject({
      content: [
        {
          type: "text",
          text: expect.stringContaining("Braiins Pool Statistics")
        }
      ]
    });
    
    // Verify human-readable formatting
    expect(result.content[0].text).toContain("Hashrate: 450.5 PH/s");
    expect(result.content[0].text).toContain("Active Workers: 1250");
  });
});
```

***

## Security Policies: API Key Management & Input Validation

### API Key Handling

**Never Hardcode Keys:**
```typescript
// ✅ GOOD: Load from environment
const apiKey = process.env.BRAIINS_API_KEY;
if (!apiKey) {
  throw new Error("BRAIINS_API_KEY environment variable not set");
}

// ❌ BAD: Hardcoded
const apiKey = "sk-live-abc123xyz789"; // NEVER DO THIS
```

**Secure Transport:**
```typescript
// All API requests must use HTTPS with bearer token
const headers = {
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "User-Agent": "Braiins-MCP-Server/1.0"
};

// Never log full API key
logger.debug(`Authenticating as user: ${apiKey.substring(0, 4)}...`);
```

### Rate Limiting Implementation

Braiins Public API enforces rate limits:
- **Standard:** 60 requests/minute per API key
- **Burst:** 10 requests/second peak

**Implementation:**
```typescript
// src/api/client.ts
class BraiinsApiClient {
  private requestCounter = new Map<string, number[]>(); // timestamp tracking
  private readonly RATE_LIMIT_PER_MINUTE = 60;
  private readonly RATE_LIMIT_WINDOW_MS = 60_000;

  private async checkRateLimit(endpoint: string): Promise<void> {
    const now = Date.now();
    const recentRequests = this.requestCounter.get(endpoint) || [];
    
    // Remove old timestamps outside the window
    const activeRequests = recentRequests.filter(
      ts => now - ts < this.RATE_LIMIT_WINDOW_MS
    );
    
    if (activeRequests.length >= this.RATE_LIMIT_PER_MINUTE) {
      const oldestRequest = Math.min(...activeRequests);
      const retryAfterMs = this.RATE_LIMIT_WINDOW_MS - (now - oldestRequest) + 100;
      
      throw new RateLimitError(
        `Rate limit exceeded for ${endpoint}. Retry after ${retryAfterMs}ms`,
        retryAfterMs
      );
    }
    
    activeRequests.push(now);
    this.requestCounter.set(endpoint, activeRequests);
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<Response<T>> {
    await this.checkRateLimit(endpoint);
    
    // If API returns 429, respect Retry-After header
    const response = await fetch(this.buildUrl(endpoint), {
      ...options,
      headers: this.getHeaders(options?.headers)
    });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RateLimitError(
        "API rate limit exceeded",
        retryAfter ? parseInt(retryAfter) * 1000 : 60_000
      );
    }
    
    return response.json() as Promise<Response<T>>;
  }
}
```

### Input Sanitization & Validation

Always validate user input before passing to API:

```typescript
// src/utils/validation.ts
import { z } from "zod";

// Whitelist valid pool names (prevents injection)
const VALID_POOLS = ["BTC", "BCH", "BSV", "ERG", "NEXA"] as const;

const PoolStatsParamsSchema = z.object({
  pool_name: z.enum(VALID_POOLS).default("BTC"),
  time_window: z.enum(["now", "1h", "24h", "7d"]).default("24h")
});

export function validateInput(input: unknown) {
  return PoolStatsParamsSchema.parse(input);
}

// Example: Prevents path traversal and injection
const poolName = validateInput({ pool_name: "BTC" }).pool_name;
// ✅ pool_name will always be one of ["BTC", "BCH", "BSV", "ERG", "NEXA"]
// ❌ Attempts like "BTC/../admin" will be rejected by Zod
```

***

## Git Operations: Branch Strategy & Commit Messages

### Branch Strategy: Feature Branching with Protected Main

```
main (production-ready, protected)
  ├── feature/pool-stats-endpoint (→ PR → main)
  ├── feature/worker-metrics (→ PR → main)
  ├── fix/rate-limit-handling (→ PR → main)
  └── docs/api-reference (→ PR → main)
```

**Rules:**
- `main` branch is production-ready, always deployable
- All work happens on feature/fix branches
- Pull requests require:
  - ✅ CI checks passing (tests >85% coverage)
  - ✅ Code review approval (1+ maintainer)
  - ✅ No conflicts with main

### Commit Message Format

```
feat(pool-stats): add hashrate history endpoint

Implement GET /api/pool/hashrate-history to fetch 30-day hashrate
trends. Includes exponential backoff retry logic and response
caching for 5 minutes to minimize API calls.

- Fetch raw hashrate data from Braiins API
- Transform to hourly aggregates
- Validate response structure with Zod
- Add integration tests with fixture data

Related-To: #42
```

**Format:**
```
<type>(<scope>): <subject>

<body (optional)>

Related-To: #<issue-number>
Closes: #<issue-number>
Breaking-Change: <description if applicable>
```

**Types:**
- `feat` – New feature (pool stats, worker metrics)
- `fix` – Bug fix (retry logic, error handling)
- `docs` – Documentation updates
- `test` – Test additions
- `refactor` – Code restructuring (no behavior change)
- `chore` – Dependencies, configs

***

## Collaboration Patterns: Agent Handoff Protocol

### Multi-Agent Workflow

| Agent | Responsibility | Input | Output | Handoff To |
|-------|-----------------|-------|--------|-----------|
| **Architect** | System design, API client, types, error handling | Requirements, Braiins API docs | `src/types/`, `src/api/client.ts` | Builder |
| **Builder** | Implement tools, wire MCP handlers, fixtures | Architecture, type definitions | `src/tools/`, `tests/fixtures/` | Validator |
| **Validator** | Run tests, code review, integration testing | Implementation, fixtures | Test results, code review comments | Architect (for refinement) |
| **Scribe** | API documentation, README, example prompts | Complete implementation | `README.md`, usage guides | Release |

### Handoff Checklist (Architect → Builder)

- [ ] `src/types/braiins.ts` defined with all Braiins API response types
- [ ] `src/types/errors.ts` with custom error classes
- [ ] `src/api/client.ts` with retry logic and rate limiting
- [ ] `src/types/mcp.ts` with MCP tool schemas
- [ ] Test fixtures in `tests/integration/fixtures/` with mock API responses
- [ ] `ARCHITECTURE.md` documenting design decisions
- [ ] `.env.example` showing required variables

### Handoff Checklist (Builder → Validator)

- [ ] All four MCP tools implemented (`braiins_get_pool_stats`, etc.)
- [ ] Unit tests for API client (>90% coverage)
- [ ] Integration tests for each tool with mocked responses
- [ ] No hardcoded API keys or secrets
- [ ] Error messages are clear and actionable
- [ ] Logging includes request/response metadata (not secrets)
- [ ] Tool outputs formatted for LLM readability (Markdown)

***

## Summary

This document defines universal standards for all agents (Claude, Cursor, Copilot) working on the Braiins MCP server. It covers:

✅ Project structure and naming conventions  
✅ TypeScript strict mode with async/await best practices  
✅ MCP tool design with validated input schemas  
✅ Testing strategy (>85% coverage, unit + integration + fixtures)  
✅ Security (API key management, rate limiting, input validation)  
✅ Git operations (feature branches, atomic commits)  
✅ Multi-agent collaboration patterns with handoff checklists  

Proceed to `CLAUDE.md`, `DEVELOPMENT_PLAN.md`, and `ARCHITECTURE.md` for tool-specific and implementation details.

***

**Document Version:** 1.0  
**Last Updated:** December 12, 2025  
**Maintained By:** Engineering Standards Committee  
**Review Cycle:** Quarterly or upon significant platform updates
</artifact>

***

## File 2: CLAUDE.md

<artifact identifier="claude-md" type="application/vnd.ant.code" language="markdown" title="CLAUDE.md - Claude-Specific Instructions">
# CLAUDE.md – Claude Agent Configuration for Braiins Pool MCP Server

## Import Universal Standards

See `AGENTS.md` for core development standards including project overview, code structure, testing philosophy, security policies, and git operations. This document extends those standards with Claude-specific workflows and capabilities.

***

## Claude-Specific Capabilities

### Long Context (200,000 Tokens)

Claude's 200K context window enables:
- **Comprehensive codebase review** - Load entire `src/` directory + test files + API docs in single conversation
- **Complex architectural decisions** - Analyze Braiins API schema, design multi-stage retry logic, optimize request/response transformations
- **API specification analysis** - Reference [Braiins Public API Documentation](https://academy.braiins.com/en/mining-insights/public-api/) and [OpenAPI Spec](https://developer.braiins-os.com/latest/openapi.html) concurrently with implementation

**Recommended Context Loading Order:**
1. Load `AGENTS.md` + `ARCHITECTURE.md` for project context
2. Load full Braiins API schema (copy from OpenAPI URL into conversation)
3. Load `src/types/braiins.ts` for existing type definitions
4. Load specific files being modified (e.g., `src/api/client.ts` + tests)
5. Reference fixture data: `tests/integration/fixtures/pool-stats.json`

### Constitutional AI Training

Claude excels at:
- **Reasoning through edge cases** - Rate limit handling, timeout recovery, parsing malformed API responses
- **Documenting design rationale** - Writing clear architecture docs explaining WHY decisions were made
- **Error handling strategy** - Designing custom error types with actionable messages
- **Type-safe TypeScript** - Leveraging strict mode to catch bugs before runtime

***

## Claude Development Workflow

### Phase 1: System Design (Architect Role)

**Task:** Define API client architecture, error types, type system

**Claude Workflow:**
```
1. Read Braiins API documentation (academy.braiins.com)
2. Analyze current src/types/braiins.ts
3. Design BraiinsApiClient class with:
   - Retry logic (exponential backoff)
   - Rate limiting (track requests per endpoint)
   - Error transformation (API errors → custom types)
4. Create error type hierarchy
   - BraiinsApiError (base)
   - RateLimitError (429 responses)
   - ValidationError (malformed responses)
   - NetworkError (timeout/DNS)
5. Generate ARCHITECTURE.md with design decisions
```

**Claude Prompting:**
```
Load these files into context:
- https://developer.braiins-os.com/latest/openapi.html (OpenAPI spec)
- src/types/braiins.ts (existing types)
- AGENTS.md (project standards)

Then design the BraiinsApiClient class with:
1. Constructor accepting { apiKey, baseUrl, timeout, retryAttempts }
2. Private method checkRateLimit() tracking requests per endpoint
3. Public get<T>() method with automatic retry on transient errors
4. Error transformation: API 401 → UnauthorizedError, 429 → RateLimitError
5. All Braiins API endpoints from the OpenAPI spec

Provide complete TypeScript implementation with JSDoc comments.
```

### Phase 2: Tool Implementation (Builder Role - with Claude Assistance)

**Task:** Implement MCP tools that consume the API client

**Claude Workflow:**
```
1. Load src/types/braiins.ts (type system from Phase 1)
2. Load src/types/mcp.ts (MCP tool schemas)
3. Load src/api/client.ts (API client from Phase 1)
4. For each tool (braiins_get_pool_stats, etc.):
   a. Understand Braiins API endpoint
   b. Implement validation with Zod schema
   c. Call BraiinsApiClient.get() with retry
   d. Transform response for LLM readability (markdown)
   e. Generate test fixture (JSON)
5. Create integration tests with mocked client
```

**Claude Prompting:**
```
Implement the braiins_get_pool_stats MCP tool:

Requirements:
- Input: { pool_name?: "BTC"|"BCH"|"BSV"|"ERG"|"NEXA", time_window?: "now"|"1h"|"24h"|"7d" }
- Validate with Zod (see utils/validation.ts example)
- Call BraiinsApiClient.getPoolStats(poolName)
- Return MCP response with:
  * content[0].type = "text"
  * content[0].text = human-readable markdown with:
    - Pool name, hashrate (PH/s), worker count, rewards, difficulty
    - Formatted as a markdown table for readability
- Handle errors:
  * ValidationError → explain which param is invalid
  * RateLimitError → suggest retry time
  * BraiinsApiError → include HTTP status code

Provide full TypeScript implementation with error handling.
```

### Phase 3: Testing & Validation (Validator Role - with Claude Review)

**Task:** Verify implementation quality, test coverage, error handling

**Claude Workflow:**
```
1. Load complete implementation (src/tools/, src/api/, src/types/)
2. Load test files (tests/unit/, tests/integration/)
3. Analyze coverage:
   - Are all error paths tested?
   - Do fixtures cover happy path + edge cases?
   - Is rate limiting tested with mock timers?
4. Identify gaps:
   - Missing test for 401 Unauthorized
   - No test for malformed JSON response
   - Rate limit retry not tested
5. Generate missing tests + fixtures
6. Review error messages for clarity
7. Verify no hardcoded secrets in logs
```

**Claude Prompting:**
```
Review this test file for gaps:
[paste tests/unit/api.client.test.ts]

Coverage checklist:
1. Happy path: 200 OK with valid response ✅
2. HTTP errors: 401, 429, 500 ✅
3. Network errors: timeout, DNS failure ❓
4. Rate limiting: 429 retry logic ✅
5. Malformed response: invalid JSON ❓
6. Retry exhaustion: max attempts exceeded ❓

Generate missing test cases with full implementation.
```

***

## Tool Permissions & Restrictions

### Allowed Operations

Claude can:
- ✅ Read Braiins API documentation
- ✅ Generate TypeScript code (types, classes, functions)
- ✅ Design error handling strategies
- ✅ Write unit + integration tests with mocked APIs
- ✅ Create fixture data (JSON responses)
- ✅ Generate documentation (ARCHITECTURE.md, README.md)
- ✅ Review code for security issues (hardcoded secrets, injection)
- ✅ Analyze test coverage and identify gaps

### Restricted Operations

Claude cannot:
- ❌ Call actual Braiins API (no real credentials)
- ❌ Deploy to production
- ❌ Modify package.json without approval
- ❌ Merge code to main branch
- ❌ Commit directly (builder/validator performs commit)

***

## Claude-Specific Development Commands

```bash
# All commands run in src/ directory with Node.js 18+

# Development: Watch TypeScript compilation + nodemon
npm run dev

# Build: Compile TypeScript to dist/
npm run build

# Type-check: Run TypeScript compiler without emitting
npm run type-check

# Lint: Check code style with ESLint
npm run lint

# Test: Run Jest with coverage
npm run test
npm run test:coverage

# Test watch: Re-run tests on file changes
npm run test:watch

# MCP Inspector: Test server with interactive protocol
npm run inspector
# Opens http://localhost:3000 for testing tools

# Validate: Check MCP schema compliance
npm run validate

# Format: Auto-fix code style with Prettier
npm run format
```

***

## Context Management for Claude Sessions

### Initial Context Setup

**Session 1: Architecture & API Client (Architect Role)**

Load into context window:
1. `AGENTS.md` (project overview, 4 KB)
2. OpenAPI spec from https://developer.braiins-os.com/latest/openapi.html (copy endpoints section, ~5 KB)
3. `ARCHITECTURE.md` template from TODO.md (2 KB)
4. `src/types/braiins.ts` (existing types, 3 KB)
5. Total: ~14 KB of 200K context = room for long reasoning

**Prompt:**
```
You are the Architect for the Braiins Pool MCP Server.

Read these files to understand the project:
[AGENTS.md content]
[OpenAPI spec endpoints]

Task: Design the BraiinsApiClient class with:
1. Retry logic for transient errors
2. Rate limiting enforcement
3. Error transformation to custom types
4. All Braiins endpoints from the spec

Provide src/api/client.ts with full implementation.
```

### Session 2: Tool Implementation (Builder Role - Claude Assists)

Load into context:
1. `AGENTS.md` (1 KB)
2. `src/types/braiins.ts` (3 KB)
3. `src/api/client.ts` from Session 1 (5 KB)
4. `src/types/mcp.ts` (2 KB)
5. One tool specification (e.g., braiins_get_pool_stats)
6. Example fixture data (1 KB)
7. Total: ~12 KB, leaving 188K for code generation

### Session 3: Testing & Validation (Validator Role)

Load into context:
1. All implementation files (src/, ~20 KB)
2. Test fixtures (tests/integration/fixtures/, ~8 KB)
3. Existing test file (tests/unit/api.client.test.ts, ~6 KB)
4. Coverage report output (if available, ~2 KB)
5. Total: ~36 KB, leaving 164K for detailed analysis

***

## Common Claude Workflows

### Workflow 1: "Explain How This Works"

**Prompt:**
```
Load src/api/client.ts and src/tools/pool-stats.ts

Walk me through the execution flow when an LLM calls braiins_get_pool_stats with pool_name="BTC":

1. What validation happens?
2. How is the HTTP request built?
3. What happens if the API returns 429?
4. How is the response transformed for LLM readability?
5. What errors could be thrown at each step?

Provide a detailed step-by-step explanation with code references.
```

### Workflow 2: "Find Security Issues"

**Prompt:**
```
Load src/api/client.ts and src/types/errors.ts

Audit for security issues:
1. Are API keys ever logged or exposed?
2. Is input validated before passing to API?
3. Are error messages safe to display (no internal details)?
4. Is the retry logic vulnerable to timing attacks?
5. Could an attacker inject malicious data via response JSON?

List each issue with severity (Critical/High/Medium) and remediation.
```

### Workflow 3: "Generate Tests"

**Prompt:**
```
Load src/api/client.ts and tests/integration/fixtures/pool-stats.json

Generate integration tests for the scenario:
"API returns 429 Too Many Requests, then succeeds on retry"

Requirements:
- Use Jest with mocked fetch
- Simulate first call returns 429
- Simulate second call returns 200 with pool-stats.json
- Verify client retries automatically
- Verify result matches expected structure

Provide complete test code with comments.
```

***

## Quality Validation Checklist (Claude Review)

Before handoff to next agent, Claude should verify:

- [ ] **Types:** All Braiins API responses have TypeScript interfaces (src/types/braiins.ts)
- [ ] **Errors:** Custom error classes with constructors that accept status codes and messages
- [ ] **Retry Logic:** Exponential backoff for 429/5xx errors, immediate fail for 4xx
- [ ] **Rate Limiting:** Requests tracked per endpoint, RateLimitError thrown if exceeded
- [ ] **Validation:** All MCP tool inputs validated with Zod schemas
- [ ] **Tests:** >85% coverage of src/, all error paths tested
- [ ] **Fixtures:** Mock API responses match Braiins OpenAPI schema exactly
- [ ] **Logging:** API keys never logged (only first 4 chars), request/response metadata included
- [ ] **Security:** No hardcoded secrets, environment variables used for config
- [ ] **Documentation:** Architecture decisions explained in comments and ARCHITECTURE.md

***

## Claude-Specific Anti-Patterns to Avoid

❌ **Overengineering:** Don't design for "future extensibility" to all possible mining pools—focus on Braiins only.

❌ **Ignoring Type Safety:** Don't use `any` type; if API returns unexpected structure, validate with type guard.

❌ **Silent Failures:** Don't catch errors without logging; every error must include context (URL, response status, retry count).

❌ **Circular Dependencies:** Don't have tools import other tools; use the API client as single source of truth.

❌ **Hardcoded Timeouts:** Timeouts should be configurable in BraiinsApiClient constructor, not magic numbers.

***

## Resources & Documentation

- **MCP Best Practices:** [modelcontextprotocol.io/docs](https://modelcontextprotocol.io/docs/best-practices/)
- **Braiins API:** [developer.braiins-os.com](https://developer.braiins-os.com/latest/openapi.html)
- **Zod Validation:** [zod.dev](https://zod.dev/)
- **TypeScript Handbook:** [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **MCP Servers (Reference):** [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)

***

## Next Steps

1. **If starting new:** Begin with `DEVELOPMENT_PLAN.md` Phase 1 (Project Setup)
2. **If architecting:** Start with creating `src/types/braiins.ts` + `src/api/client.ts`
3. **If implementing tools:** Use this session as builder with `CLAUDE.md` Workflow 2
4. **If debugging:** Load test files + implementation into context, use "Explain How This Works" workflow

Share output with @builder and @validator for review before merging to main.

***

**Document Version:** 1.0  
**Last Updated:** December 12, 2025  
**Maintained By:** Claude Development Team  
**Review Cycle:** Monthly or upon significant Claude platform updates