# Multi-Agent Plan: Complete MCP Tool Suite Implementation

## Project Goal
Implement all 9 Priority P0 MCP tools for the Braiins Insights API, enabling Claude Desktop and other MCP clients to query Bitcoin network analytics, mining statistics, and profitability metrics.

## Parallel Execution Strategy
- **Isolation Method**: Git Worktrees
- **Agent Distribution**: 11 agents across 12 independent tasks
- **Coordination**: Shared MULTI_AGENT_PLAN.md with atomic status updates
- **Merge Strategy**: Sequential integration - Simple tools first, then Parameterized tools, then validation

## Task Assignment Matrix

| Task ID | Task Description | Agent Role | Worktree Path | Branch | Parallel Group | Status | Dependencies |
|---------|------------------|------------|---------------|--------|----------------|--------|--------------|
| T0 | Verify API client completeness and add missing endpoints | Validator | ../worktrees/mcp-api-client-verify | feature/mcp-tools-api-verify | Pre | Completed | - |
| T1 | Implement braiins_difficulty_stats tool | Builder | ../worktrees/mcp-difficulty-stats | feature/mcp-difficulty-stats | A | Not Started | T0 |
| T2 | Implement braiins_price_stats tool | Builder | ../worktrees/mcp-price-stats | feature/mcp-price-stats | A | Not Started | T0 |
| T3 | Implement braiins_transaction_stats tool | Builder | ../worktrees/mcp-transaction-stats | feature/mcp-transaction-stats | A | Not Started | T0 |
| T4 | Implement braiins_pool_stats tool | Builder | ../worktrees/mcp-pool-stats | feature/mcp-pool-stats | A | Not Started | T0 |
| T5 | Implement braiins_rss_feed_data tool | Builder | ../worktrees/mcp-rss-feed | feature/mcp-rss-feed | A | Not Started | T0 |
| T6 | Implement braiins_halvings tool | Builder | ../worktrees/mcp-halvings | feature/mcp-halvings | A | Not Started | T0 |
| T7 | Implement braiins_blocks tool (with pagination) | Builder | ../worktrees/mcp-blocks | feature/mcp-blocks | B | Not Started | T0 |
| T8 | Implement braiins_profitability_calculator tool | Builder | ../worktrees/mcp-profitability-calc | feature/mcp-profitability-calc | B | Not Started | T0 |
| T9 | Implement braiins_cost_to_mine tool | Builder | ../worktrees/mcp-cost-to-mine | feature/mcp-cost-to-mine | B | Not Started | T0 |
| T10 | Integration testing for all 9 new tools | Validator | ../worktrees/mcp-integration-tests | feature/mcp-integration-tests | C | Not Started | T1-T9 |
| T11 | Update documentation (README.md, API usage examples) | Scribe | ../worktrees/mcp-docs-update | feature/mcp-docs-update | C | Not Started | T1-T9 |

**Parallel Groups**:
- **Group Pre**: API client verification (1 agent) - MUST complete before others start
- **Group A**: Simple stats tools (6 agents in parallel) - T1-T6
- **Group B**: Parameterized tools (3 agents in parallel) - T7-T9
- **Group C**: Validation and documentation (2 agents in parallel) - T10-T11

## Tool Implementation Standards

### Simple Stats Tools (T1-T6)
Each tool must implement:
1. **Class extending BaseTool** (if BaseTool exists, otherwise standalone)
2. **Input Schema**: Empty object (no parameters)
3. **Execute Method**:
   - Fetch data from InsightsApiClient
   - Transform to markdown format
   - Handle errors gracefully
4. **Response Format**: Markdown with:
   - Emoji header (📊, 💰, 🧱, etc.)
   - Key metrics in bullet points or tables
   - Timestamp footer
5. **Unit Tests**: Mock API client, test formatting
6. **Integration Test Fixture**: Real API response in JSON

### Parameterized Tools (T7-T9)
Each tool must implement:
1. **Input Schema**: Zod validation schema
2. **Parameter Validation**: Use Zod.parse() with helpful error messages
3. **Optional Parameters**: Provide sensible defaults
4. **Response Handling**:
   - Handle empty results gracefully
   - Paginated responses (T7)
   - Calculation inputs (T8, T9)
5. **Unit Tests**: Test validation edge cases
6. **Integration Tests**: Test with various parameter combinations

## Success Criteria
- [x] API client verified complete (T0)
- [ ] All 6 simple stats tools implemented and tested (T1-T6)
- [ ] All 3 parameterized tools implemented and tested (T7-T9)
- [ ] Integration tests passing for all 9 tools (T10)
- [ ] Documentation updated with usage examples (T11)
- [ ] No TypeScript compilation errors
- [ ] All tests passing (unit + integration)
- [ ] Code review completed
- [ ] Final merge to main branch successful

## Communication Protocol
- **Status Updates**: Agents update this file's Status column atomically using Edit tool
- **Blockers**: Add comments in "Notes and Blockers" section below
- **Questions**: Prefix with `[QUESTION - T{ID}]` for orchestrator review
- **Handoffs**: Document completion artifacts in respective task rows
- **Commits**: Use format `[{ROLE}] T{ID}: {brief description}`

## Merge Strategy
1. **Phase 1**: Merge T0 (API client verification) to main
2. **Phase 2**: Merge T1-T6 (simple tools) individually after validation
3. **Phase 3**: Merge T7-T9 (parameterized tools) individually after validation
4. **Phase 4**: Merge T10 (integration tests) and T11 (docs) together
5. **Final**: Create pull request for complete feature

## Agent Task Details

### T0: API Client Verification (Validator)
**Deliverables**:
- Review `src/api/insights-client.ts` for completeness
- Verify all 14 endpoint methods exist:
  - v1.0: hashrate-stats, difficulty-stats, blocks, blocks-by-country, daily-revenue-history, hashrate-and-difficulty-history, hashrate-value-history, pool-stats, price-stats, rss-feed-data, transaction-fees-history, transaction-stats
  - v2.0: cost-to-mine, halvings, profitability-calculator
  - POST: hardware-stats
- Add any missing endpoint methods
- Verify caching and rate limiting are implemented
- Run existing tests to ensure no regressions
- Commit message: `[Validator] T0: Verify API client completeness`

### T1-T6: Simple Stats Tools (Builder)
**Pattern**: Copy from `src/tools/hashrate-stats.ts` (reference implementation)

**T1: difficulty-stats**
- Endpoint: `/v1.0/difficulty-stats`
- Display: Current difficulty, next adjustment estimate, blocks until adjustment
- Emoji: ⛏️

**T2: price-stats**
- Endpoint: `/v1.0/price-stats`
- Display: Current BTC price, 24h change, market cap, volume
- Emoji: 💰

**T3: transaction-stats**
- Endpoint: `/v1.0/transaction-stats`
- Display: Mempool size, avg fee, confirmation times, tx count
- Emoji: 🔄

**T4: pool-stats**
- Endpoint: `/v1.0/pool-stats`
- Display: Pool distribution table (pool name, hashrate %, blocks found)
- Emoji: 🏊

**T5: rss-feed-data**
- Endpoint: `/v1.0/rss-feed-data`
- Display: Recent Braiins blog posts/announcements (title, date, link)
- Emoji: 📰

**T6: halvings**
- Endpoint: `/v2.0/halvings`
- Display: Next halving date, countdown, block height, reward change
- Emoji: ⏳

### T7-T9: Parameterized Tools (Builder)

**T7: blocks**
- Endpoint: `/v1.0/blocks?page={page}&page_size={page_size}`
- Input Schema: `{ page?: number, page_size?: number, start_date?: string, end_date?: string }`
- Validation: Zod schema with defaults (page=1, page_size=10)
- Display: Table with block height, pool, timestamp, tx count, size
- Emoji: 🧱

**T8: profitability-calculator**
- Endpoint: `/v2.0/profitability-calculator?electricity_cost_kwh={cost}&hardware_efficiency_jth={efficiency}`
- Input Schema: `{ electricity_cost_kwh: number, hardware_efficiency_jth: number, hardware_cost_usd?: number }`
- Validation: Cost >= 0, efficiency > 0
- Display: Daily revenue, electricity cost, net profit, ROI estimate
- Emoji: ⚡

**T9: cost-to-mine**
- Endpoint: `/v2.0/cost-to-mine?electricity_cost_kwh={cost}`
- Input Schema: `{ electricity_cost_kwh?: number }`
- Validation: Cost >= 0 if provided
- Display: Break-even price, current margin, profitability threshold
- Emoji: 💵

### T10: Integration Testing (Validator)
**Deliverables**:
- Create `tests/integration/all-tools.integration.test.ts`
- Test each tool with live Insights API
- Verify response formats match expectations
- Test error handling (network errors, malformed responses)
- Performance check: All tools < 2 seconds response time
- Generate coverage report
- Commit message: `[Validator] T10: Add integration tests for 9 new tools`

### T11: Documentation Update (Scribe)
**Deliverables**:
- Update `README.md`:
  - Mark all 10 tools as ✅ IMPLEMENTED
  - Add usage examples for each new tool
  - Update tool count (1 → 10 implemented)
- Create `docs/USAGE_GUIDE.md`:
  - Example queries for each tool
  - Parameter explanations
  - Common use cases
- Update `DEVELOPMENT_PLAN.md`:
  - Mark Phase 2.2 as ✅ Complete
  - Mark Phase 2.3 as ✅ Complete
- Commit message: `[Scribe] T11: Update documentation for 9 new tools`

## Notes and Blockers
<!-- Agents: Add status updates, questions, and blockers here -->

**2025-12-14 - Orchestration Started**
- Orchestrator: Claude Sonnet 4.5
- Total Tasks: 12
- Estimated Duration: 90-120 minutes
- Status: Awaiting worktree creation and agent spawn

---

## Orchestrator Checklist
- [ ] Create git worktrees for all 12 tasks
- [ ] Copy shared config to each worktree (AGENTS.md, CLAUDE.md, .env.example)
- [ ] Spawn agent for T0 (blocking task)
- [ ] Monitor T0 completion
- [ ] Spawn agents for T1-T6 (parallel group A)
- [ ] Spawn agents for T7-T9 (parallel group B)
- [ ] Monitor T1-T9 completion
- [ ] Spawn agents for T10-T11 (parallel group C)
- [ ] Review all completed work
- [ ] Integrate and merge to main
- [ ] Cleanup worktrees
- [ ] Archive orchestration artifacts
