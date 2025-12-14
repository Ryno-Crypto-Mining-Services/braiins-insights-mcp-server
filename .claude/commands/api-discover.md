---
name: api-discover
description: Systematically discover undocumented parameters for Braiins Insights API endpoints, test variations, and generate comprehensive documentation with type definitions and test fixtures
version: 1.0.0
created: 2025-12-13
---

# /api-discover Command

## Usage

```bash
/api-discover <endpoint-path>
```

## Purpose

Systematically discover undocumented parameters for Braiins Insights API endpoints, test variations, and generate comprehensive documentation with type definitions and test fixtures.

## Examples

```bash
/api-discover /v1.0/blocks
/api-discover /v1.0/hashrate-stats
/api-discover /v2.0/profitability-calculator
/api-discover /v1.0/pool-stats
```

## What This Command Does

When you run `/api-discover <endpoint-path>`, Claude will:

1. **Load the braiins-api-discovery skill**
   - Loads comprehensive API discovery workflow
   - Understands Braiins Insights API patterns

2. **Test baseline endpoint**
   ```bash
   curl -s https://insights.braiins.com/api<endpoint-path>
   ```
   - Captures default response
   - Analyzes response structure
   - Identifies all fields and types

3. **Test parameter variations systematically**
   - Pagination: `?page=1&page_size=10`
   - Date filtering: `?start_date=2025-12-01&end_date=2025-12-13`
   - Sorting: `?sort=timestamp&order=desc`
   - Filtering: `?pool=braiins&country=US`
   - Documents which parameters are supported

4. **Test edge cases**
   - Invalid parameter values
   - Boundary conditions
   - Rate limiting behavior
   - Error responses

5. **Create discovery report**
   - Location: `docs/api-discovery/<endpoint-name>.md`
   - Contains: Parameter documentation, response structure, edge cases
   - Includes: Sample requests and responses

6. **Update type definitions**
   - Location: `src/types/insights-api.ts`
   - Creates TypeScript interfaces for response
   - Creates parameter type definitions

7. **Generate test fixtures**
   - Location: `tests/integration/fixtures/<endpoint-name>.json`
   - Contains actual API responses
   - Includes edge case examples

8. **Update API.md**
   - Adds discovered parameters to endpoint documentation
   - Links to discovery report

## Workflow

### Before Running Command

Ensure you have:
- ✅ Network connection (calls real API)
- ✅ Node.js 18+ installed
- ✅ curl and jq available (for testing)
- ✅ Endpoint path from API.md

### After Running Command

You will have:
- ✅ Discovery report (`docs/api-discovery/<endpoint-name>.md`)
- ✅ Type definitions (`src/types/insights-api.ts` updated)
- ✅ Test fixtures (`tests/integration/fixtures/<endpoint-name>.json`)
- ✅ Updated API.md

### Next Steps

After discovery is complete:

1. **Review Discovery Report**
   ```bash
   cat docs/api-discovery/<endpoint-name>.md
   ```
   - Verify parameter discovery
   - Check response structure
   - Review edge cases

2. **Implement API Client Method**
   ```bash
   # Edit src/api/insights-client.ts
   # Add method for this endpoint
   ```

3. **Implement MCP Tool**
   ```bash
   /implement-tool braiins_<endpoint-name> --category <simple|parameterized|historical|composite>
   ```

## Command Expansion

This command expands to:

```markdown
Load the braiins-api-discovery skill from docs/claude/.claude/skills/braiins-api-discovery.md

Follow the systematic workflow to discover parameters for the <endpoint-path> endpoint.

**Context:**
- Endpoint: <endpoint-path>
- Base URL: https://insights.braiins.com/api
- Project: Braiins Insights MCP Server

**Steps to Execute:**

1. **Phase 1: Baseline Endpoint Testing**
   - Test endpoint with no parameters
   - Capture and analyze response structure
   - Document response format and fields
   - Save response as baseline-response.json

2. **Phase 2: Systematic Parameter Discovery**
   - Test pagination parameters (page, page_size, limit, offset)
   - Test date filtering (start_date, end_date, days, hours)
   - Test sorting (sort, order, order_by, sort_by)
   - Test domain-specific filters (pool, country, min/max values)
   - Document which parameters are supported

3. **Phase 3: Edge Case and Error Testing**
   - Test invalid parameter values
   - Test missing required parameters
   - Test conflicting parameters
   - Test rate limiting behavior
   - Analyze response headers

4. **Phase 4: Documentation and Fixture Generation**
   - Create discovery report (docs/api-discovery/<endpoint-name>.md)
   - Generate test fixtures (tests/integration/fixtures/<endpoint-name>.json)
   - Update type definitions (src/types/insights-api.ts)
   - Update API.md with discovered parameters

**Deliverables:**
- [ ] Discovery report with parameter documentation
- [ ] Test fixtures from actual API responses
- [ ] TypeScript type definitions
- [ ] Updated API.md
- [ ] Edge case documentation
- [ ] Rate limiting and caching recommendations

**Tips:**
- Use jq for JSON analysis: `curl -s URL | jq '.'`
- Test parameters individually before combinations
- Document non-support (what does NOT work)
- Capture actual responses, not hand-crafted examples
- Note Cloudflare behavior (redirects, rate limiting)

Begin the discovery process now.
```

## Common Use Cases

### Use Case 1: Before Implementing a New Tool

```bash
# 1. Check API.md for endpoint path
cat API.md | grep -A5 "blocks"

# 2. Run discovery
/api-discover /v1.0/blocks

# 3. Review discovery report
cat docs/api-discovery/blocks.md

# 4. Implement tool
/implement-tool braiins_blocks --category parameterized
```

### Use Case 2: Validating Existing Type Definitions

```bash
# Re-discover to validate types are current
/api-discover /v1.0/hashrate-stats

# Compare new discovery with existing types
diff docs/api-discovery/hashrate-stats.md src/types/insights-api.ts
```

### Use Case 3: Exploring New API Versions

```bash
# Discover v2.0 endpoint
/api-discover /v2.0/cost-to-mine

# Compare with v1.0 if exists
diff docs/api-discovery/cost-to-mine-v1.md docs/api-discovery/cost-to-mine-v2.md
```

## Troubleshooting

### Issue: API Returns 302 Redirect

**Symptom:**
```bash
curl https://insights.braiins.com/api/v1.0/hashrate-stats
# Returns HTML instead of JSON
```

**Solution:**
```bash
# Use -L flag to follow redirects
curl -L https://insights.braiins.com/api/v1.0/hashrate-stats
```

### Issue: Rate Limit Exceeded

**Symptom:**
```
HTTP 429 Too Many Requests
```

**Solution:**
- Add delays between requests (minimum 1 second)
- Test parameter variations sequentially, not in parallel

### Issue: Unexpected Response Format

**Symptom:**
Response structure differs from API.md

**Solution:**
- Test with and without parameters
- Document conditional response formats in discovery report

## Related Commands

- `/implement-tool` - Implement MCP tool after discovery
- `/test-all` - Run all tests including integration tests
- `/docs` - Update documentation after discovery

## Version History

- **v1.0.0** (2025-12-13): Initial command creation

---

**Command Created:** 2025-12-13
**Maintained By:** Braiins Insights MCP Team
