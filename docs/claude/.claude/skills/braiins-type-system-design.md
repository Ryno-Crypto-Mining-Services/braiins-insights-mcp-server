---
name: braiins-type-system-design
description: Design comprehensive TypeScript type systems for Braiins Insights API responses with hierarchical interfaces, JSDoc documentation, and runtime validation
version: 1.0.0
created: 2025-12-13
author: Braiins Insights MCP Team
tags: [typescript, types, api, design, validation]
---

# Braiins Type System Design Skill

## Purpose

Design comprehensive, type-safe TypeScript type systems for Braiins Insights API responses. Creates hierarchical type definitions with extensive JSDoc documentation, runtime type guards, and integration with Zod schemas for validation.

## When to Use This Skill

- ✅ Creating initial type definitions for new API endpoints
- ✅ Updating types after API discovery reveals new fields
- ✅ Designing type hierarchies for related endpoints
- ✅ Ensuring type safety across the MCP server codebase
- ✅ Documenting API response structures with JSDoc
- ✅ Creating runtime type guards for validation
- ✅ Generating Zod schemas from TypeScript interfaces

## Prerequisites

- API discovery report completed (`docs/api-discovery/{endpoint-name}.md`)
- Actual API response captured (JSON file or curl output)
- Understanding of TypeScript advanced types
- Familiarity with Braiins Insights API domain

## Core Workflow

### Phase 1: Analyze Raw API Response Structure

**Task:** Examine the actual API response to understand data structures.

**Steps:**

1. **Load API Response**
   ```bash
   # Get fresh response
   curl -s https://insights.braiins.com/api/v1.0/hashrate-stats | jq '.' > response.json
   ```

2. **Identify Field Structure**

   Analyze each field:
   - **Name:** Field key in JSON (snake_case)
   - **Type:** JavaScript type (string, number, boolean, object, array)
   - **Nullable:** Can the field be null or undefined?
   - **Format:** Specific format (ISO date, scientific notation, etc.)
   - **Range:** Acceptable value ranges (min/max)
   - **Units:** Measurement units (EH/s, USD, percentage)

3. **Document Field Analysis**
   ```markdown
   ## Field Analysis

   | Field | JSON Type | TS Type | Nullable | Format | Units | Notes |
   |-------|-----------|---------|----------|--------|-------|-------|
   | current_hashrate | number | number | No | Float | EH/s | Positive, typically 500-2000 |
   | network_difficulty | number | number | No | Integer | - | Very large number, use scientific notation |
   | timestamp_utc | string | string | No | ISO 8601 | - | Always ends with 'Z' |
   | fees_percent | number | number | No | Float | % | Range: 0-100 |
   | monthly_avg_hashrate_change_1_year | object | object | No | - | - | Nested structure |
   ```

4. **Identify Nested Structures**
   ```json
   {
     "monthly_avg_hashrate_change_1_year": {
       "relative": 0.03,
       "absolute": 29.47665536
     }
   }
   ```

   This requires a separate interface for the nested object.

### Phase 2: Design TypeScript Interfaces

**Task:** Create TypeScript interfaces that accurately represent the API response.

**Naming Convention:**
- **Response Interface:** `Braiins{EndpointName}Response` (PascalCase)
- **Nested Interfaces:** `Braiins{EndpointName}{NestedName}` (PascalCase)
- **Parameter Interface:** `Braiins{EndpointName}Params` (PascalCase)
- **Enum Types:** `{EndpointName}{FieldName}` (PascalCase)

**Example Interface Structure:**

```typescript
/**
 * Bitcoin network hashrate statistics from Braiins Insights Dashboard.
 *
 * Endpoint: GET /v1.0/hashrate-stats
 * Authentication: None required (public endpoint)
 * Cache TTL: 5 minutes (300,000ms)
 *
 * @see https://insights.braiins.com/api/v1.0/hashrate-stats
 * @see /docs/api-discovery/hashrate-stats.md
 */
export interface BraiinsInsightsHashrateStats {
  /**
   * Current network hashrate in exahashes per second (EH/s)
   *
   * This is the reported current hashrate based on recent blocks.
   *
   * @example 1094.42
   * @unit EH/s (exahashes per second)
   * @minimum 0
   */
  current_hashrate: number;

  /**
   * Estimated current hashrate in EH/s
   *
   * This may differ from `current_hashrate` as it uses statistical estimation
   * rather than direct block measurements.
   *
   * @example 1148.46
   * @unit EH/s (exahashes per second)
   * @minimum 0
   */
  current_hashrate_estimated: number;

  /**
   * 30-day average network hashrate in EH/s
   *
   * @example 1075.4
   * @unit EH/s (exahashes per second)
   * @minimum 0
   */
  hash_rate_30: number;

  /**
   * Hash price in USD per terahash per day
   *
   * Represents how much revenue miners earn per TH/s per day.
   *
   * @example 0.038
   * @unit USD/TH/day
   * @minimum 0
   */
  hash_price: number;

  /**
   * Hash value in USD per terahash per day
   *
   * May be represented in scientific notation (e.g., 4E-7).
   * Appears to be similar or identical to `hash_price`.
   *
   * @example 0.0000004
   * @unit USD/TH/day
   */
  hash_value: number;

  /**
   * Average transaction fees per block in BTC
   *
   * @example 0.015
   * @minimum 0
   */
  avg_fees_per_block: number;

  /**
   * Transaction fees as percentage of total mining revenue
   *
   * @example 0.48 (meaning 0.48%, not 48%)
   * @unit Percentage
   * @minimum 0
   * @maximum 100
   */
  fees_percent: number;

  /**
   * Total daily network revenue in USD
   *
   * This is the total value of all block rewards + fees for the day.
   *
   * @example 40809781.01
   * @unit USD
   * @minimum 0
   */
  rev_usd: number;

  /**
   * Monthly average hashrate change over the past 1 year
   */
  monthly_avg_hashrate_change_1_year: {
    /**
     * Relative change as decimal
     *
     * @example 0.03 (meaning 3% increase)
     * @example -0.05 (meaning 5% decrease)
     */
    relative: number;

    /**
     * Absolute change in exahashes per second
     *
     * @example 29.47665536
     * @unit EH/s
     */
    absolute: number;
  };
}
```

**JSDoc Standards:**

- **Description:** Clear, concise explanation of the field
- **@example:** Realistic example value
- **@unit:** Measurement unit if applicable
- **@minimum / @maximum:** Value constraints
- **@see:** Links to related documentation
- **@deprecated:** Mark deprecated fields

### Phase 3: Create Query Parameter Types

**Task:** Define types for endpoint query parameters.

**Example:**

```typescript
/**
 * Query parameters for hashrate stats endpoint
 *
 * @see docs/api-discovery/hashrate-stats.md
 */
export interface HashrateStatsParams {
  /**
   * Page number for pagination (1-indexed)
   *
   * @default 1
   * @minimum 1
   */
  page?: number;

  /**
   * Number of items per page
   *
   * @default 10
   * @minimum 1
   * @maximum 100
   */
  page_size?: number;

  /**
   * Start date for filtering (YYYY-MM-DD)
   *
   * @example "2025-12-01"
   */
  start_date?: string;

  /**
   * End date for filtering (YYYY-MM-DD)
   *
   * @example "2025-12-13"
   */
  end_date?: string;

  /**
   * Field to sort by
   */
  sort?: 'timestamp' | 'height' | 'hashrate';

  /**
   * Sort direction
   *
   * @default "desc"
   */
  order?: 'asc' | 'desc';
}
```

**Use String Literal Unions for Enums:**

```typescript
// ✅ Good: String literal union (type-safe and serializable)
export type SortField = 'timestamp' | 'height' | 'hashrate';
export type SortOrder = 'asc' | 'desc';

// ❌ Bad: Enum (less flexible)
export enum SortField {
  Timestamp = 'timestamp',
  Height = 'height',
  Hashrate = 'hashrate'
}
```

### Phase 4: Create Runtime Type Guards

**Task:** Implement type guards for runtime validation.

**Purpose:**
- Validate API responses at runtime
- Provide type narrowing in TypeScript
- Catch API contract violations early

**Type Guard Pattern:**

```typescript
/**
 * Type guard to validate if an object is a valid BraiinsInsightsHashrateStats
 *
 * @param obj - Object to validate
 * @returns True if object matches BraiinsInsightsHashrateStats structure
 *
 * @example
 * ```typescript
 * const data = await fetch('/api/v1.0/hashrate-stats');
 * if (isHashrateStats(data)) {
 *   console.log(data.current_hashrate); // Type-safe access
 * } else {
 *   throw new Error('Invalid API response');
 * }
 * ```
 */
export function isHashrateStats(obj: unknown): obj is BraiinsInsightsHashrateStats {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const stats = obj as Record<string, unknown>;

  return (
    typeof stats['current_hashrate'] === 'number' &&
    typeof stats['current_hashrate_estimated'] === 'number' &&
    typeof stats['hash_rate_30'] === 'number' &&
    typeof stats['hash_price'] === 'number' &&
    typeof stats['hash_value'] === 'number' &&
    typeof stats['avg_fees_per_block'] === 'number' &&
    typeof stats['fees_percent'] === 'number' &&
    typeof stats['rev_usd'] === 'number' &&
    typeof stats['monthly_avg_hashrate_change_1_year'] === 'object' &&
    stats['monthly_avg_hashrate_change_1_year'] !== null &&
    typeof (stats['monthly_avg_hashrate_change_1_year'] as Record<string, unknown>)['relative'] === 'number' &&
    typeof (stats['monthly_avg_hashrate_change_1_year'] as Record<string, unknown>)['absolute'] === 'number'
  );
}
```

**Type Guard Best Practices:**

1. **Check for null and typeof first**
   ```typescript
   if (typeof obj !== 'object' || obj === null) {
     return false;
   }
   ```

2. **Cast to Record for property access**
   ```typescript
   const stats = obj as Record<string, unknown>;
   ```

3. **Check all required fields**
   ```typescript
   return (
     typeof stats['field1'] === 'number' &&
     typeof stats['field2'] === 'string'
   );
   ```

4. **Handle nested objects**
   ```typescript
   typeof stats['nested'] === 'object' &&
   stats['nested'] !== null &&
   typeof (stats['nested'] as Record<string, unknown>)['field'] === 'number'
   ```

### Phase 5: Create Zod Schemas (Optional)

**Task:** Generate Zod schemas for runtime validation with detailed error messages.

**When to Use Zod:**
- Validating user input (MCP tool parameters)
- Parsing external data with detailed error messages
- When you need schema-based validation

**Zod Schema Pattern:**

```typescript
import { z } from 'zod';

/**
 * Zod schema for HashrateStatsParams validation
 *
 * Provides runtime validation with detailed error messages
 */
export const HashrateStatsParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(10),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  sort: z.enum(['timestamp', 'height', 'hashrate']).optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Infer TypeScript type from Zod schema
 *
 * This ensures the TypeScript type stays in sync with the Zod schema
 */
export type HashrateStatsParams = z.infer<typeof HashrateStatsParamsSchema>;

/**
 * Zod schema for BraiinsInsightsHashrateStats response validation
 */
export const BraiinsInsightsHashrateStatsSchema = z.object({
  current_hashrate: z.number().min(0),
  current_hashrate_estimated: z.number().min(0),
  hash_rate_30: z.number().min(0),
  hash_price: z.number().min(0),
  hash_value: z.number(),
  avg_fees_per_block: z.number().min(0),
  fees_percent: z.number().min(0).max(100),
  rev_usd: z.number().min(0),
  monthly_avg_hashrate_change_1_year: z.object({
    relative: z.number(),
    absolute: z.number(),
  }),
});

/**
 * Validate and parse API response
 *
 * @throws ZodError if validation fails
 */
export function parseHashrateStats(data: unknown): BraiinsInsightsHashrateStats {
  return BraiinsInsightsHashrateStatsSchema.parse(data);
}
```

### Phase 6: Design Type Hierarchies

**Task:** Create type hierarchies for related endpoints.

**Pattern: Base Types for Common Fields**

```typescript
/**
 * Base interface for all Braiins Insights API responses
 */
export interface BraiinsInsightsBaseResponse {
  /**
   * Timestamp when the data was generated (ISO 8601)
   */
  timestamp_utc?: string;
}

/**
 * Base interface for paginated responses
 */
export interface BraiinsInsightsPaginatedResponse<T> extends BraiinsInsightsBaseResponse {
  /**
   * Array of items for the current page
   */
  items: T[];

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  page_size: number;

  /**
   * Total number of pages
   */
  total_pages: number;
}

/**
 * Base interface for time-series data points
 */
export interface BraiinsInsightsTimeSeriesPoint {
  /**
   * Timestamp of the data point (ISO 8601)
   */
  timestamp: string;

  /**
   * Value at this timestamp
   */
  value: number;
}

/**
 * Hashrate and difficulty history response
 */
export interface BraiinsInsightsHashrateHistory extends BraiinsInsightsBaseResponse {
  /**
   * Historical hashrate data points
   */
  hashrate: BraiinsInsightsTimeSeriesPoint[];

  /**
   * Historical difficulty data points
   */
  difficulty: BraiinsInsightsTimeSeriesPoint[];
}
```

**Pattern: Union Types for Variant Responses**

```typescript
/**
 * Block data can be in different formats depending on query
 */
export type BraiinsInsightsBlockResponse =
  | BraiinsInsightsBlockSummary
  | BraiinsInsightsBlockDetailed;

export interface BraiinsInsightsBlockSummary {
  type: 'summary';
  height: number;
  hash: string;
  timestamp: string;
}

export interface BraiinsInsightsBlockDetailed {
  type: 'detailed';
  height: number;
  hash: string;
  timestamp: string;
  transactions: Array<{
    txid: string;
    size: number;
  }>;
  miner: string;
}
```

### Phase 7: Document Type System

**Task:** Create comprehensive documentation for the type system.

**Create: `src/types/README.md`**

```markdown
# Braiins Insights API Type System

## Overview

This directory contains TypeScript type definitions for all Braiins Insights Dashboard API endpoints.

## Type Naming Conventions

- **Response Types:** `Braiins{EndpointName}Response`
- **Parameter Types:** `Braiins{EndpointName}Params`
- **Nested Types:** `Braiins{EndpointName}{NestedName}`
- **Enum Types:** `{EndpointName}{FieldName}`

## Type Categories

### Response Types (`insights-api.ts`)
- BraiinsInsightsHashrateStats
- BraiinsInsightsDifficultyStats
- BraiinsInsightsBlockData
- [17 total endpoint types]

### Parameter Types (`insights-params.ts`)
- HashrateStatsParams
- DifficultyStatsParams
- BlocksParams
- [17 total parameter types]

### Utility Types (`insights-utils.ts`)
- BraiinsInsightsBaseResponse
- BraiinsInsightsPaginatedResponse<T>
- BraiinsInsightsTimeSeriesPoint
- BraiinsInsightsError

## Usage Examples

### Type-Safe API Client

```typescript
import type { BraiinsInsightsHashrateStats, HashrateStatsParams } from '@/types';

async function getHashrateStats(params?: HashrateStatsParams): Promise<BraiinsInsightsHashrateStats> {
  const response = await fetch('/api/v1.0/hashrate-stats', { params });
  return response.json();
}
```

### Runtime Validation

```typescript
import { isHashrateStats } from '@/types';

const data = await fetch('/api/v1.0/hashrate-stats');
if (isHashrateStats(data)) {
  console.log(data.current_hashrate); // Type-safe
} else {
  throw new Error('Invalid response');
}
```

### Zod Validation

```typescript
import { HashrateStatsParamsSchema } from '@/types';

const params = HashrateStatsParamsSchema.parse({
  page: 1,
  page_size: 10,
});
```

## Type Safety Guarantees

- ✅ All API responses have corresponding TypeScript interfaces
- ✅ All query parameters have type definitions
- ✅ Runtime type guards for validation
- ✅ Zod schemas for detailed error messages
- ✅ JSDoc documentation for IntelliSense
```

## Deliverables Checklist

After designing types for an endpoint, verify:

- [ ] Response interface created with JSDoc documentation
- [ ] Parameter interface created (if endpoint has parameters)
- [ ] Type guard function implemented
- [ ] Zod schema created (if validation needed)
- [ ] Types exported from `src/types/index.ts`
- [ ] Type hierarchy follows project conventions
- [ ] Example usage documented
- [ ] Integration tests use these types

## Best Practices

### 1. Prefer Interfaces Over Types

```typescript
// ✅ Good: Interface (can be extended)
export interface BraiinsInsightsHashrateStats {
  current_hashrate: number;
}

// ❌ Avoid: Type alias (harder to extend)
export type BraiinsInsightsHashrateStats = {
  current_hashrate: number;
};
```

### 2. Use Optional Properties for Nullable Fields

```typescript
// ✅ Good: Optional property
export interface Response {
  timestamp?: string; // May be undefined
}

// ❌ Avoid: Explicit null union (verbose)
export interface Response {
  timestamp: string | null | undefined;
}
```

### 3. Document Units and Constraints

```typescript
/**
 * Current network hashrate
 *
 * @unit EH/s (exahashes per second)
 * @minimum 0
 * @example 1094.42
 */
current_hashrate: number;
```

### 4. Use Branded Types for Domain Values

```typescript
// For values that need extra type safety
export type BlockHeight = number & { readonly __brand: 'BlockHeight' };
export type BlockHash = string & { readonly __brand: 'BlockHash' };

export interface Block {
  height: BlockHeight;
  hash: BlockHash;
}
```

### 5. Keep Types Close to API Reality

```typescript
// ✅ Good: Matches API field names
export interface Response {
  current_hashrate: number; // API uses snake_case
}

// ❌ Avoid: Transforming field names
export interface Response {
  currentHashrate: number; // Don't convert to camelCase
}
```

## Handling Large Numbers

Bitcoin metrics involve very large numbers. Document representation:

```typescript
/**
 * Network difficulty (very large integer)
 *
 * Example: 109780000000000000
 * Display: Use scientific notation (1.10e+17)
 *
 * @minimum 0
 */
network_difficulty: number;
```

## Handling Percentages

Document percentage representation (decimal vs integer):

```typescript
/**
 * Fees as percentage of revenue
 *
 * IMPORTANT: Value is decimal, not integer
 * API returns: 0.48 (meaning 0.48%, not 48%)
 *
 * @unit Percentage (decimal)
 * @minimum 0
 * @maximum 100
 */
fees_percent: number;
```

## Version History

- **v1.0.0** (2025-12-13): Initial skill creation

## Maintenance

Update this skill when:
- New TypeScript features provide better type safety
- Zod version updates change patterns
- New type patterns discovered
- Project type conventions evolve

---

**Skill Created:** 2025-12-13
**Last Updated:** 2025-12-13
**Maintained By:** Braiins Insights MCP Team
