---
name: implement-tool
description: Implement a complete MCP tool for a Braiins Insights API endpoint including tool class, input validation, response formatting, error handling, unit tests, and integration tests
version: 1.0.0
created: 2025-12-13
---

# /implement-tool Command

## Usage

```bash
/implement-tool <tool-name> [--category simple|parameterized|historical|composite]
```

## Purpose

Implement a complete MCP tool for a Braiins Insights API endpoint including tool class, input validation, response formatting, error handling, unit tests, and integration tests.

## Examples

```bash
/implement-tool braiins_hashrate_stats --category simple
/implement-tool braiins_blocks --category parameterized
/implement-tool braiins_hashrate_history --category historical
/implement-tool braiins_mining_overview --category composite
```

## Arguments

- `<tool-name>` (required): MCP tool name (must start with `braiins_`)
- `--category` (optional): Tool category (default: `simple`)
  - `simple` - No parameters, returns current stats
  - `parameterized` - Accepts input parameters with validation
  - `historical` - Returns time-series data
  - `composite` - Aggregates multiple endpoints

## What This Command Does

When you run `/implement-tool <tool-name> --category <category>`, Claude will:

1. **Load the braiins-tool-implementation skill**
   - Loads comprehensive tool implementation patterns
   - Understands MCP protocol and project conventions

2. **Gather required context**
   - Load type definitions from `src/types/insights-api.ts`
   - Load API client from `src/api/insights-client.ts`
   - Load discovery report from `docs/api-discovery/`
   - Load test fixtures from `tests/integration/fixtures/`

3. **Create tool implementation**
   - Location: `src/tools/<category>/<tool-name>.ts`
   - Implements tool class with name, description, inputSchema
   - Implements execute() method with error handling
   - Implements response formatting (markdown)
   - Adds type validation with type guards

4. **Register tool in MCP server**
   - Updates `src/index.ts`
   - Adds tool to ListTools response
   - Adds tool to CallTool handler

5. **Create unit tests**
   - Location: `tests/unit/tools/<tool-name>.test.ts`
   - Tests tool metadata (name, description, schema)
   - Tests happy path with mocked API client
   - Tests error handling scenarios
   - Tests markdown formatting

6. **Create integration tests**
   - Location: `tests/integration/tools/<tool-name>.integration.test.ts`
   - Tests against real Braiins Insights API
   - Validates response structure
   - Checks response times
   - Verifies markdown output

7. **Run tests**
   ```bash
   npm test
   npm run test:integration
   ```

8. **Update documentation**
   - Updates `README.md` with tool example
   - Updates `USAGE_GUIDE.md` with usage pattern

9. **Commit changes**
   ```bash
   git add .
   git commit -m "feat(tools): implement <tool-name> tool"
   ```

## Workflow

### Before Running Command

Ensure you have:
- ✅ API discovery completed (`/api-discover` run)
- ✅ Type definitions exist in `src/types/insights-api.ts`
- ✅ API client method implemented in `src/api/insights-client.ts`
- ✅ Test fixtures available in `tests/integration/fixtures/`

### After Running Command

You will have:
- ✅ Tool class (`src/tools/<category>/<tool-name>.ts`)
- ✅ Unit tests (`tests/unit/tools/<tool-name>.test.ts`)
- ✅ Integration tests (`tests/integration/tools/<tool-name>.integration.test.ts`)
- ✅ Updated server registration (`src/index.ts`)
- ✅ Updated documentation (`README.md`, `USAGE_GUIDE.md`)
- ✅ Passing tests
- ✅ Git commit

### Next Steps

After tool is implemented:

1. **Verify Tool Works**
   ```bash
   # Start MCP server
   npm run dev

   # Test with MCP Inspector
   npm run inspector
   ```

2. **Test in Claude Desktop**
   - Add server to Claude Desktop config
   - Test tool invocation
   - Verify markdown rendering

3. **Update USAGE_GUIDE.md**
   - Add real-world usage examples
   - Document expected outputs

## Command Expansion

This command expands to:

```markdown
Load the braiins-tool-implementation skill from docs/claude/.claude/skills/braiins-tool-implementation.md

Implement the <tool-name> MCP tool following the <category> pattern.

**Context:**
- Tool Name: <tool-name>
- Category: <category>
- Project: Braiins Insights MCP Server

**Required Files to Load:**
1. Type definitions: src/types/insights-api.ts
2. API client: src/api/insights-client.ts
3. Discovery report: docs/api-discovery/<endpoint-name>.md
4. Test fixtures: tests/integration/fixtures/<endpoint-name>.json

**Implementation Steps:**

### Step 1: Create Tool Class
- Location: src/tools/<category>/<tool-name>.ts
- Define tool metadata (name, description, inputSchema)
- Implement execute() method
- Add response formatting method
- Add error handling method

### Step 2: Register Tool in Server
- Update: src/index.ts
- Add tool instance creation
- Register in ListTools handler
- Add to CallTool switch statement

### Step 3: Create Unit Tests
- Location: tests/unit/tools/<tool-name>.test.ts
- Test tool metadata
- Test happy path with mocked API
- Test error scenarios
- Test markdown formatting
- Target: >90% coverage

### Step 4: Create Integration Tests
- Location: tests/integration/tools/<tool-name>.integration.test.ts
- Test against real API
- Validate response structure
- Check response times
- Verify markdown output

### Step 5: Run Tests
```bash
npm test
npm run test:integration
```

### Step 6: Update Documentation
- Update README.md with tool example
- Update USAGE_GUIDE.md with usage patterns

### Step 7: Commit Changes
```bash
git add .
git commit -m "feat(tools): implement <tool-name> tool

- Add <tool-name> tool in <category> category
- Implement input validation with Zod
- Format response as LLM-friendly markdown
- Add comprehensive unit and integration tests
- Update server registration and documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Tool Pattern:**

Follow the <category> pattern from the skill:
- `simple`: Pattern 1 (no parameters)
- `parameterized`: Pattern 2 (with Zod validation)
- `historical`: Pattern 2 + time-series formatting
- `composite`: Pattern 3 (multi-endpoint)

**Deliverables Checklist:**
- [ ] Tool class created
- [ ] Input schema defined (Zod if parameterized)
- [ ] execute() method implements error handling
- [ ] Response formatted as markdown
- [ ] Type validation with type guards
- [ ] Tool registered in src/index.ts
- [ ] Unit tests created (>90% coverage)
- [ ] Integration tests created
- [ ] Tests pass
- [ ] README.md updated
- [ ] USAGE_GUIDE.md updated
- [ ] Changes committed

Begin the implementation now.
```

## Category-Specific Patterns

### Simple Tools (No Parameters)

**Characteristics:**
- Empty input schema
- Single API call
- Returns current statistics

**Example:**
```bash
/implement-tool braiins_hashrate_stats --category simple
```

**Generated Files:**
- `src/tools/simple/hashrate-stats.ts`
- `tests/unit/tools/hashrate-stats.test.ts`
- `tests/integration/tools/hashrate-stats.integration.test.ts`

### Parameterized Tools (With Validation)

**Characteristics:**
- Zod input schema
- Parameter validation
- Query parameters passed to API

**Example:**
```bash
/implement-tool braiins_blocks --category parameterized
```

**Generated Files:**
- `src/tools/parameterized/blocks.ts`
- `tests/unit/tools/blocks.test.ts`
- `tests/integration/tools/blocks.integration.test.ts`

**Input Schema Example:**
```typescript
const BlocksInputSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(10),
  pool: z.string().optional(),
});
```

### Historical Tools (Time-Series)

**Characteristics:**
- Date range parameters
- Array responses
- Time-series formatting (charts or tables)

**Example:**
```bash
/implement-tool braiins_hashrate_history --category historical
```

**Generated Files:**
- `src/tools/historical/hashrate-history.ts`
- `tests/unit/tools/hashrate-history.test.ts`
- `tests/integration/tools/hashrate-history.integration.test.ts`

**Response Format:**
- ASCII charts for trends
- Tables for detailed data
- Summary statistics

### Composite Tools (Multi-Endpoint)

**Characteristics:**
- Calls multiple API endpoints
- Parallel requests with Promise.allSettled
- Graceful degradation for partial failures

**Example:**
```bash
/implement-tool braiins_mining_overview --category composite
```

**Generated Files:**
- `src/tools/composite/mining-overview.ts`
- `tests/unit/tools/mining-overview.test.ts`
- `tests/integration/tools/mining-overview.integration.test.ts`

**Implementation Pattern:**
```typescript
const [hashrate, difficulty, blocks] = await Promise.allSettled([
  this.apiClient.getHashrateStats(),
  this.apiClient.getDifficultyStats(),
  this.apiClient.getBlocks(),
]);

// Handle partial failures gracefully
const report = this.buildReport({
  hashrate: hashrate.status === 'fulfilled' ? hashrate.value : null,
  difficulty: difficulty.status === 'fulfilled' ? difficulty.value : null,
  blocks: blocks.status === 'fulfilled' ? blocks.value : null,
});
```

## Common Use Cases

### Use Case 1: Complete Tool Implementation Flow

```bash
# 1. Discover API endpoint
/api-discover /v1.0/hashrate-stats

# 2. Implement API client method (manual)
# Edit src/api/insights-client.ts

# 3. Implement MCP tool
/implement-tool braiins_hashrate_stats --category simple

# 4. Test tool
npm test
npm run test:integration

# 5. Test in MCP Inspector
npm run inspector
```

### Use Case 2: Batch Implementation

```bash
# Implement multiple related tools
/implement-tool braiins_hashrate_stats --category simple
/implement-tool braiins_difficulty_stats --category simple
/implement-tool braiins_price_stats --category simple

# Then create composite tool
/implement-tool braiins_mining_overview --category composite
```

### Use Case 3: Update Existing Tool

```bash
# Re-run to update implementation
/implement-tool braiins_blocks --category parameterized

# Review changes
git diff src/tools/parameterized/blocks.ts
```

## Troubleshooting

### Issue: Tests Fail After Implementation

**Symptom:**
```
FAIL tests/unit/tools/hashrate-stats.test.ts
```

**Solution:**
1. Check mock API client matches real client interface
2. Verify test fixtures have correct structure
3. Run tests individually: `npm test -- hashrate-stats.test.ts`

### Issue: Type Errors in Tool Class

**Symptom:**
```
Type 'unknown' is not assignable to type 'BraiinsInsightsHashrateStats'
```

**Solution:**
1. Ensure type definitions are imported correctly
2. Use type guards for runtime validation
3. Run type check: `npm run type-check`

### Issue: Tool Not Showing in MCP Inspector

**Symptom:**
Tool doesn't appear in ListTools response

**Solution:**
1. Verify tool is registered in `src/index.ts`
2. Check tool name matches in switch statement
3. Restart MCP server
4. Check server logs for errors

## Quality Checklist

Before completing implementation:

- [ ] Tool name starts with `braiins_`
- [ ] Description is clear and helpful (>20 characters)
- [ ] Input schema is valid JSON Schema
- [ ] execute() method has try-catch
- [ ] Response is formatted as markdown
- [ ] Type validation with type guards
- [ ] Unit tests achieve >90% coverage
- [ ] Integration tests call real API
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] README.md updated
- [ ] Committed with conventional commit message

## Related Commands

- `/api-discover` - Discover API before implementing tool
- `/test-all` - Run all tests
- `/lint-fixes` - Fix linting issues
- `/docs` - Update documentation

## Version History

- **v1.0.0** (2025-12-13): Initial command creation

---

**Command Created:** 2025-12-13
**Maintained By:** Braiins Insights MCP Team
