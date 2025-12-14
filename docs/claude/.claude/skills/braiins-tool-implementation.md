---
name: braiins-tool-implementation
description: Implement production-quality MCP tools for Braiins Insights API endpoints with input validation, response formatting, error handling, and comprehensive tests
version: 1.0.0
created: 2025-12-13
author: Braiins Insights MCP Team
tags: [mcp, tools, implementation, testing, braiins]
---

# Braiins Tool Implementation Skill

## Purpose

Implement production-quality Model Context Protocol (MCP) tools for Braiins Insights API endpoints following project patterns and best practices. Includes tool class creation, input validation with Zod, response formatting to markdown, error handling, and comprehensive test coverage.

## When to Use This Skill

- ✅ Implementing new MCP tools for Braiins Insights endpoints
- ✅ Creating simple stats tools (no parameters)
- ✅ Creating parameterized tools (with input validation)
- ✅ Creating historical data tools (time-series)
- ✅ Creating composite tools (multi-endpoint aggregators)
- ✅ Adding tests and documentation for tools

## Prerequisites

- API discovery completed (`docs/api-discovery/{endpoint-name}.md`)
- Type definitions exist (`src/types/insights-api.ts`)
- API client method implemented (`src/api/insights-client.ts`)
- Understanding of MCP protocol and tool schema

## Tool Categories

### 1. Simple Stats Tools (No Parameters)

**Characteristics:**
- No input parameters (or all optional)
- Single API endpoint call
- Returns current statistics

**Examples:**
- `braiins_hashrate_stats` - Current hashrate metrics
- `braiins_difficulty_stats` - Current difficulty metrics
- `braiins_price_stats` - Current Bitcoin price

### 2. Parameterized Tools (With Validation)

**Characteristics:**
- Required or optional input parameters
- Input validation with Zod
- Single API endpoint with query parameters

**Examples:**
- `braiins_blocks` - Get blocks with pagination
- `braiins_profitability_calculator` - Calculate profitability with user inputs
- `braiins_hardware_stats` - Get hardware stats filtered by manufacturer

### 3. Historical Data Tools (Time-Series)

**Characteristics:**
- Returns time-series data arrays
- Date range parameters
- Aggregation options

**Examples:**
- `braiins_hashrate_history` - Historical hashrate over time
- `braiins_difficulty_history` - Historical difficulty adjustments
- `braiins_revenue_history` - Daily revenue over time

### 4. Composite Tools (Multi-Endpoint)

**Characteristics:**
- Calls multiple API endpoints
- Aggregates data from multiple sources
- Provides comprehensive reports

**Examples:**
- `braiins_mining_overview` - Combines hashrate + difficulty + blocks + price
- `braiins_profitability_analysis` - Combines calculator + costs + trends
- `braiins_network_health` - Combines multiple metrics for health score

## Core Workflow

### Pattern 1: Simple Stats Tool (No Parameters)

**Use Case:** Implement a tool that returns current statistics without requiring user input.

#### Step 1: Define Tool Class

Create: `src/tools/simple/{tool-name}.ts`

```typescript
import type { InsightsApiClient } from '@/api/insights-client.js';
import type { BraiinsInsightsHashrateStats } from '@/types/insights-api.js';
import { isHashrateStats } from '@/types/insights-api.js';

/**
 * MCP tool for retrieving Bitcoin network hashrate statistics
 *
 * Endpoint: GET /v1.0/hashrate-stats
 * Category: Simple Stats
 * Parameters: None
 * Cache: 5 minutes
 *
 * @see docs/api-discovery/hashrate-stats.md
 */
export class HashrateStatsTool {
  /**
   * MCP tool name (must start with braiins_)
   */
  public readonly name = 'braiins_hashrate_stats';

  /**
   * MCP tool description (shown to LLM)
   */
  public readonly description =
    'Get current Bitcoin network hashrate statistics including current hashrate, ' +
    '30-day average, hash price, mining economics, and 1-year trend analysis.';

  /**
   * MCP tool input schema (empty object for simple tools)
   */
  public readonly inputSchema = {
    type: 'object' as const,
    properties: {},
    required: [],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param _input - Empty input object (unused)
   * @returns MCP tool response with markdown content
   */
  async execute(_input: Record<string, never>): Promise<MCPToolResponse> {
    try {
      // Call API client
      const stats = await this.apiClient.getHashrateStats();

      // Validate response
      if (!isHashrateStats(stats)) {
        return this.handleError(
          new Error('Invalid API response structure'),
          'ValidationError'
        );
      }

      // Format as markdown
      const markdown = this.formatAsMarkdown(stats);

      return {
        content: [
          {
            type: 'text',
            text: markdown,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Format API response as markdown for LLM consumption
   */
  private formatAsMarkdown(stats: BraiinsInsightsHashrateStats): string {
    return `# 📊 Bitcoin Network Hashrate Statistics

## Current Metrics

- **Current Hashrate:** ${stats.current_hashrate.toFixed(2)} EH/s
- **Estimated Hashrate:** ${stats.current_hashrate_estimated.toFixed(2)} EH/s
- **30-Day Average:** ${stats.hash_rate_30.toFixed(2)} EH/s

## Mining Economics

- **Hash Price:** $${stats.hash_price.toFixed(4)} per TH/day
- **Hash Value:** $${stats.hash_value.toFixed(7)} per TH/day
- **Daily Network Revenue:** $${stats.rev_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}

## Transaction Fees

- **Average Fees per Block:** ${stats.avg_fees_per_block.toFixed(4)} BTC
- **Fees as % of Revenue:** ${stats.fees_percent.toFixed(2)}%

## 1-Year Trend

- **Relative Change:** ${(stats.monthly_avg_hashrate_change_1_year.relative * 100).toFixed(2)}%
- **Absolute Change:** ${stats.monthly_avg_hashrate_change_1_year.absolute.toFixed(2)} EH/s

---
*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*
`;
  }

  /**
   * Handle errors and return user-friendly error response
   */
  private handleError(error: unknown, errorType?: string): MCPToolResponse {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    const type = errorType || (error instanceof Error ? error.name : 'UnexpectedError');

    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error:** ${type}\n\n${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * MCP tool response type
 */
interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError: boolean;
}
```

#### Step 2: Register Tool in Server

Update: `src/index.ts`

```typescript
import { HashrateStatsTool } from './tools/simple/hashrate-stats.js';

// ... existing code ...

// Create tool instances
const hashrateStatsTool = new HashrateStatsTool(apiClient);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: hashrateStatsTool.name,
      description: hashrateStatsTool.description,
      inputSchema: hashrateStatsTool.inputSchema,
    },
    // ... other tools
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'braiins_hashrate_stats':
      return await hashrateStatsTool.execute(args as never);
    // ... other tools
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

#### Step 3: Create Unit Tests

Create: `tests/unit/tools/hashrate-stats.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { HashrateStatsTool } from '@/tools/simple/hashrate-stats.js';
import type { InsightsApiClient } from '@/api/insights-client.js';
import type { BraiinsInsightsHashrateStats } from '@/types/insights-api.js';

describe('HashrateStatsTool', () => {
  let mockApiClient: jest.Mocked<InsightsApiClient>;
  let tool: HashrateStatsTool;

  const mockStats: BraiinsInsightsHashrateStats = {
    current_hashrate: 1094.42,
    current_hashrate_estimated: 1148.46,
    hash_rate_30: 1075.4,
    hash_price: 0.038,
    hash_value: 0.0000004,
    avg_fees_per_block: 0.015,
    fees_percent: 0.48,
    rev_usd: 40809781.01,
    monthly_avg_hashrate_change_1_year: {
      relative: 0.03,
      absolute: 29.47665536,
    },
  };

  beforeEach(() => {
    mockApiClient = {
      getHashrateStats: vi.fn().mockResolvedValue(mockStats),
    } as unknown as jest.Mocked<InsightsApiClient>;

    tool = new HashrateStatsTool(mockApiClient);
  });

  describe('Tool Metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('braiins_hashrate_stats');
    });

    it('should have description', () => {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema', () => {
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute()', () => {
    it('should fetch hashrate stats and return markdown', async () => {
      const response = await tool.execute({});

      expect(response.isError).toBe(false);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('# 📊 Bitcoin Network Hashrate Statistics');
      expect(response.content[0].text).toContain('1094.42 EH/s');
      expect(mockApiClient.getHashrateStats).toHaveBeenCalledTimes(1);
    });

    it('should format percentages correctly', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      expect(markdown).toContain('3.00%'); // 1-year trend
      expect(markdown).toContain('0.48%'); // fees percent
    });

    it('should format currency correctly', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      expect(markdown).toContain('$40,809,781.01'); // revenue with commas
      expect(markdown).toContain('$0.0380'); // hash price
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.getHashrateStats = vi
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      const response = await tool.execute({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
      expect(response.content[0].text).toContain('Network timeout');
    });

    it('should handle invalid API response', async () => {
      mockApiClient.getHashrateStats = vi.fn().mockResolvedValue({ invalid: 'data' });

      const response = await tool.execute({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('ValidationError');
    });
  });
});
```

#### Step 4: Create Integration Tests

Create: `tests/integration/tools/hashrate-stats.integration.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { HashrateStatsTool } from '@/tools/simple/hashrate-stats.js';
import { InsightsApiClient } from '@/api/insights-client.js';

describe('HashrateStatsTool Integration', () => {
  const apiClient = new InsightsApiClient({
    baseUrl: 'https://insights.braiins.com/api',
    timeout: 10000,
  });

  const tool = new HashrateStatsTool(apiClient);

  it('should fetch real hashrate stats from Insights API', async () => {
    const response = await tool.execute({});

    expect(response.isError).toBe(false);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');

    const markdown = response.content[0].text;

    // Verify markdown structure
    expect(markdown).toContain('# 📊 Bitcoin Network Hashrate Statistics');
    expect(markdown).toContain('## Current Metrics');
    expect(markdown).toContain('## Mining Economics');
    expect(markdown).toContain('EH/s');

    // Verify data is numeric and reasonable
    expect(markdown).toMatch(/Current Hashrate:\*\* [\d,]+\.\d+ EH\/s/);
    expect(markdown).toMatch(/Daily Network Revenue:\*\* \$[\d,]+\.\d+/);
  }, 15000); // 15 second timeout
});
```

### Pattern 2: Parameterized Tool (With Validation)

**Use Case:** Implement a tool that accepts user input parameters with validation.

#### Step 1: Define Zod Input Schema

Create: `src/tools/parameterized/{tool-name}.ts`

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Zod schema for blocks tool input validation
 */
const BlocksInputSchema = z.object({
  page: z.number().int().min(1).optional().default(1).describe('Page number (1-indexed)'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe('Number of blocks per page'),
  pool: z.string().optional().describe('Filter by pool name (e.g., "braiins")'),
  sort: z.enum(['height', 'timestamp', 'size']).optional().describe('Field to sort by'),
  order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),
});

/**
 * Infer TypeScript type from Zod schema
 */
type BlocksInput = z.infer<typeof BlocksInputSchema>;

/**
 * MCP tool for retrieving Bitcoin blocks with filtering
 */
export class BlocksTool {
  public readonly name = 'braiins_blocks';

  public readonly description =
    'Get Bitcoin blocks with optional filtering by pool, pagination, and sorting. ' +
    'Returns block height, hash, timestamp, size, and pool information.';

  /**
   * MCP input schema (generated from Zod schema)
   */
  public readonly inputSchema = zodToJsonSchema(BlocksInputSchema, 'BlocksInput');

  constructor(private readonly apiClient: InsightsApiClient) {}

  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate input with Zod
      const validatedInput = BlocksInputSchema.parse(input);

      // Call API with validated parameters
      const blocks = await this.apiClient.getBlocks(validatedInput);

      // Format as markdown
      const markdown = this.formatAsTable(blocks, validatedInput);

      return {
        content: [{ type: 'text', text: markdown }],
        isError: false,
      };
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return this.handleValidationError(error);
      }

      return this.handleError(error);
    }
  }

  /**
   * Format blocks as markdown table
   */
  private formatAsTable(blocks: Block[], input: BlocksInput): string {
    const header = `# 🧱 Bitcoin Blocks

**Page:** ${input.page} | **Page Size:** ${input.page_size}${input.pool ? ` | **Pool:** ${input.pool}` : ''}

`;

    if (blocks.length === 0) {
      return header + '*No blocks found matching the criteria.*';
    }

    const table = `
| Height | Hash | Timestamp | Size | Pool |
|--------|------|-----------|------|------|
${blocks.map((block) => `| ${block.height} | \`${block.hash.substring(0, 16)}...\` | ${block.timestamp} | ${block.size} bytes | ${block.pool || 'Unknown'} |`).join('\n')}
`;

    return header + table + '\n\n---\n*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*';
  }

  /**
   * Handle Zod validation errors
   */
  private handleValidationError(error: z.ZodError): MCPToolResponse {
    const issues = error.issues.map((issue) => `- **${issue.path.join('.')}:** ${issue.message}`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `❌ **Input Validation Error**\n\n${issues}`,
        },
      ],
      isError: true,
    };
  }

  private handleError(error: unknown): MCPToolResponse {
    // ... same as Pattern 1
  }
}
```

### Pattern 3: Composite Tool (Multi-Endpoint)

**Use Case:** Implement a tool that aggregates data from multiple API endpoints.

```typescript
/**
 * MCP tool for comprehensive mining overview
 *
 * Combines data from:
 * - /v1.0/hashrate-stats
 * - /v1.0/difficulty-stats
 * - /v1.0/blocks
 * - /v1.0/price-stats
 */
export class MiningOverviewTool {
  public readonly name = 'braiins_mining_overview';

  public readonly description =
    'Get comprehensive Bitcoin mining ecosystem overview including hashrate, ' +
    'difficulty, recent blocks, and price metrics in a single report.';

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      include_blocks: {
        type: 'boolean',
        description: 'Include recent block data',
        default: true,
      },
      block_count: {
        type: 'number',
        description: 'Number of recent blocks to include',
        default: 10,
        minimum: 1,
        maximum: 100,
      },
    },
    required: [],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  async execute(input: { include_blocks?: boolean; block_count?: number }): Promise<MCPToolResponse> {
    try {
      // Call multiple endpoints in parallel
      const [hashrateStats, difficultyStats, priceStats, blocks] = await Promise.allSettled([
        this.apiClient.getHashrateStats(),
        this.apiClient.getDifficultyStats(),
        this.apiClient.getPriceStats(),
        input.include_blocks
          ? this.apiClient.getBlocks({ page_size: input.block_count || 10 })
          : Promise.resolve([]),
      ]);

      // Build report with graceful degradation
      const markdown = this.buildReport({
        hashrate: hashrateStats.status === 'fulfilled' ? hashrateStats.value : null,
        difficulty: difficultyStats.status === 'fulfilled' ? difficultyStats.value : null,
        price: priceStats.status === 'fulfilled' ? priceStats.value : null,
        blocks: blocks.status === 'fulfilled' ? blocks.value : null,
      });

      return {
        content: [{ type: 'text', text: markdown }],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Build comprehensive report with graceful degradation for missing data
   */
  private buildReport(data: {
    hashrate: HashrateStats | null;
    difficulty: DifficultyStats | null;
    price: PriceStats | null;
    blocks: Block[] | null;
  }): string {
    let report = '# ⛏️ Bitcoin Mining Overview\n\n';

    // Hashrate section
    if (data.hashrate) {
      report += `## Network Hashrate\n\n`;
      report += `- **Current:** ${data.hashrate.current_hashrate.toFixed(2)} EH/s\n`;
      report += `- **30-Day Avg:** ${data.hashrate.hash_rate_30.toFixed(2)} EH/s\n\n`;
    } else {
      report += `## Network Hashrate\n\n*Data unavailable*\n\n`;
    }

    // Difficulty section
    if (data.difficulty) {
      report += `## Network Difficulty\n\n`;
      report += `- **Current:** ${data.difficulty.current_difficulty.toExponential(2)}\n`;
      report += `- **Next Adjustment:** ${data.difficulty.next_adjustment_date}\n\n`;
    } else {
      report += `## Network Difficulty\n\n*Data unavailable*\n\n`;
    }

    // Price section
    if (data.price) {
      report += `## Bitcoin Price\n\n`;
      report += `- **Current:** $${data.price.current_price.toLocaleString()}\n`;
      report += `- **24h Change:** ${data.price.change_24h > 0 ? '+' : ''}${data.price.change_24h.toFixed(2)}%\n\n`;
    } else {
      report += `## Bitcoin Price\n\n*Data unavailable*\n\n`;
    }

    // Blocks section
    if (data.blocks && data.blocks.length > 0) {
      report += `## Recent Blocks\n\n`;
      report += `${data.blocks.length} most recent blocks:\n\n`;
      data.blocks.forEach((block) => {
        report += `- **Block ${block.height}** - ${block.pool || 'Unknown Pool'}\n`;
      });
      report += '\n';
    }

    report += '---\n*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*';

    return report;
  }

  private handleError(error: unknown): MCPToolResponse {
    // ... same as Pattern 1
  }
}
```

## Testing Strategy

### Unit Test Coverage Requirements

Aim for >90% coverage with these test categories:

1. **Tool Metadata Tests**
   - Name is correct format (`braiins_*`)
   - Description exists and is helpful
   - Input schema is valid JSON Schema

2. **Happy Path Tests**
   - Valid input returns expected output
   - Markdown formatting is correct
   - All data fields are present

3. **Error Handling Tests**
   - Network errors return error response
   - Invalid API responses detected
   - Validation errors formatted correctly

4. **Edge Case Tests**
   - Empty result arrays
   - Null/undefined fields
   - Very large numbers
   - Special characters in strings

### Integration Test Requirements

1. **Real API Calls**
   - Call actual Braiins Insights API
   - Verify response structure
   - Check response times

2. **Response Validation**
   - Validate against type definitions
   - Check markdown formatting
   - Verify data reasonableness

3. **Rate Limiting**
   - Test behavior under rapid requests
   - Verify graceful degradation

## Deliverables Checklist

For each tool implementation, verify:

- [ ] Tool class created in appropriate category directory
- [ ] Input schema defined (Zod for parameterized tools)
- [ ] execute() method implements error handling
- [ ] Response formatted as markdown (LLM-friendly)
- [ ] Type validation with type guards
- [ ] Tool registered in src/index.ts
- [ ] Unit tests created (>90% coverage)
- [ ] Integration tests created
- [ ] Tests pass: `npm test`
- [ ] README.md updated with tool example
- [ ] USAGE_GUIDE.md updated with usage pattern

## Best Practices

### 1. Consistent Error Handling

```typescript
private handleError(error: unknown, context?: string): MCPToolResponse {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const name = error instanceof Error ? error.name : 'UnexpectedError';

  return {
    content: [{
      type: 'text',
      text: `❌ **${name}**${context ? ` (${context})` : ''}\n\n${message}`
    }],
    isError: true
  };
}
```

### 2. LLM-Friendly Markdown

```typescript
// ✅ Good: Clear structure with headers and formatting
`# 📊 Title

## Section 1
- **Label:** Value
- **Label:** Value

## Section 2
| Col1 | Col2 |
|------|------|
| Val1 | Val2 |`

// ❌ Bad: No structure, hard to parse
`Hashrate: 1094.42, Difficulty: 109780000000000000, Price: $98000`
```

### 3. Graceful Degradation for Composite Tools

```typescript
// ✅ Good: Show partial data if some endpoints fail
const [result1, result2] = await Promise.allSettled([call1(), call2()]);

if (result1.status === 'fulfilled') {
  // Use result1.value
} else {
  // Show "Data unavailable" message
}
```

### 4. Validate Before Formatting

```typescript
// ✅ Good: Validate first
const stats = await this.apiClient.getStats();
if (!isHashrateStats(stats)) {
  return this.handleError(new Error('Invalid response'));
}
const markdown = this.formatAsMarkdown(stats);

// ❌ Bad: Format without validation
const stats = await this.apiClient.getStats();
const markdown = this.formatAsMarkdown(stats); // May crash if invalid
```

## Version History

- **v1.0.0** (2025-12-13): Initial skill creation

## Maintenance

Update this skill when:
- New tool patterns discovered
- MCP protocol updates
- Testing patterns evolve
- Error handling improvements identified

---

**Skill Created:** 2025-12-13
**Last Updated:** 2025-12-13
**Maintained By:** Braiins Insights MCP Team
