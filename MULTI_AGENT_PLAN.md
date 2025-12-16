# Multi-Agent Plan: Phase 2.5 Composite Tools Implementation

## Project Goal
Implement 3 composite MCP tools that aggregate multiple Braiins Insights API endpoints to provide comprehensive Bitcoin mining analytics. These tools combine data from multiple simple tools to offer high-value insights.

## Current Project Status
- **Phase 2.1 (Base Tool Framework)**: ✅ Complete
- **Phase 2.2 (Simple Stats Tools)**: ✅ Complete (7 tools)
- **Phase 2.3 (Parameterized Tools)**: ✅ Complete (3 tools)
- **Phase 2.4 (Historical Data Tools)**: ✅ Complete (4 tools)
- **Phase 2.5 (Composite Tools)**: ✅ Complete (3 tools)

**Total Tools Implemented**: 17 of 17 ✅

## Parallel Execution Strategy
- **Isolation Method**: Git Worktrees
- **Agent Distribution**: 3 Builder agents (one per tool)
- **Coordination**: Shared MULTI_AGENT_PLAN.md with atomic status updates
- **Merge Strategy**: Sequential integration after validation

## Task Assignment Matrix

| Task ID | Task Description | Agent Role | Worktree Path | Branch | Status | Dependencies |
|---------|------------------|------------|---------------|--------|--------|--------------|
| C1 | Implement braiins_mining_overview tool | Builder | ../worktrees/mcp-mining-overview | feature/mcp-mining-overview | ✅ Complete | None |
| C2 | Implement braiins_profitability_deep_dive tool | Builder | ../worktrees/mcp-profitability-deep-dive | feature/mcp-profitability-deep-dive | ✅ Complete | None |
| C3 | Implement braiins_network_health_monitor tool | Builder | ../worktrees/mcp-network-health | feature/mcp-network-health | ✅ Complete | None |

**All 3 tasks can run in parallel** - no inter-task dependencies.

## Tool Implementation Standards

### Composite Tool Requirements
Each composite tool must:
1. **Call multiple API endpoints** using Promise.allSettled for graceful degradation
2. **Handle partial failures** - continue with available data if some endpoints fail
3. **Cache intelligently** - leverage existing tool caching
4. **Format comprehensive reports** - aggregate data into unified markdown
5. **Provide input parameters** for customization
6. **Include performance metrics** - log execution time for multi-endpoint calls

### Response Format Standards
- Emoji header appropriate to the tool's focus
- Summary section with key metrics
- Detailed breakdowns in tables or sections
- Status indicators for partial data availability
- Timestamp footer with data freshness info

## Agent Task Details

### C1: braiins_mining_overview (Builder)
**Purpose**: Ecosystem snapshot combining hashrate, difficulty, price, and recent blocks

**Endpoints to Aggregate**:
- `getHashrateStats()` - Network hashrate metrics
- `getDifficultyStats()` - Difficulty and adjustment info
- `getPriceStats()` - BTC price data
- `getBlocks({ page: 1, page_size: 5 })` - Recent blocks (optional)

**Input Schema**:
```typescript
{
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
}
```

**Output Sections**:
1. 📊 Network Overview (hashrate current, 24h avg, 7d avg)
2. ⛏️ Difficulty Status (current difficulty, next adjustment estimate)
3. 💰 Price Snapshot (BTC price, 24h change)
4. 🧱 Recent Blocks (table if enabled)
5. ⚠️ Data Availability Notice (if any endpoint failed)

**Files to Create**:
- `src/tools/composite/mining-overview.ts`
- `tests/unit/tools/composite/mining-overview.test.ts`

**Emoji**: 🔍

---

### C2: braiins_profitability_deep_dive (Builder)
**Purpose**: Comprehensive profitability analysis with historical context

**Endpoints to Aggregate**:
- `getProfitabilityCalculator(params)` - Mining profitability calculations
- `getCostToMine(params)` - Break-even price analysis
- `getPriceStats()` - Current BTC price for context
- `getHashrateValueHistory()` - Historical hashrate value (optional)

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    electricity_cost_kwh: {
      type: "number",
      description: "Electricity cost in USD per kWh",
      default: 0.05,
      minimum: 0,
      maximum: 1
    },
    hardware_efficiency_jth: {
      type: "number",
      description: "Hardware efficiency in joules per terahash",
      default: 25,
      minimum: 1,
      maximum: 200
    },
    include_historical: {
      type: "boolean",
      description: "Include historical hashrate value trends",
      default: false
    },
    historical_days: {
      type: "number",
      description: "Number of days of historical data to include",
      default: 30,
      minimum: 7,
      maximum: 90
    }
  },
  required: ["electricity_cost_kwh", "hardware_efficiency_jth"]
}
```

**Output Sections**:
1. ⚡ Profitability Summary
   - Daily revenue (USD and BTC)
   - Electricity cost per day
   - Net profit per day
2. 💵 Break-Even Analysis
   - Break-even BTC price
   - Current margin (profit/loss)
   - Profitability status (profitable/unprofitable)
3. 📈 Market Context
   - Current BTC price
   - Price vs break-even comparison
4. 📊 Historical Trends (if enabled)
   - Hashrate value trend summary
   - 30-day average vs current
5. 💡 Recommendations
   - Mining viability assessment

**Files to Create**:
- `src/tools/composite/profitability-deep-dive.ts`
- `tests/unit/tools/composite/profitability-deep-dive.test.ts`

**Emoji**: 💎

---

### C3: braiins_network_health_monitor (Builder)
**Purpose**: Network health indicators and anomaly detection

**Endpoints to Aggregate**:
- `getHashrateStats()` - Network hashrate metrics
- `getDifficultyStats()` - Difficulty metrics
- `getTransactionStats()` - Transaction/mempool data
- `getHashrateAndDifficultyHistory({ limit: 24 })` - Recent hashrate history for trend analysis

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    include_detailed_history: {
      type: "boolean",
      description: "Include detailed hourly hashrate history",
      default: false
    },
    history_hours: {
      type: "number",
      description: "Hours of history to analyze",
      default: 24,
      minimum: 6,
      maximum: 168
    }
  }
}
```

**Output Sections**:
1. 🏥 Network Health Score (0-100)
   - Based on hashrate stability, mempool health, block times
   - Color-coded status (🟢 Healthy / 🟡 Caution / 🔴 Concern)
2. ⛏️ Mining Activity
   - Current vs average hashrate
   - Hashrate stability indicator
   - Recent trend (up/down/stable)
3. 📊 Mempool Status
   - Pending transactions
   - Average fee rate
   - Congestion level
4. ⏱️ Block Production
   - Average block time vs target (10 min)
   - Blocks in last hour
5. 🚨 Alerts (if any)
   - Hashrate drop > 5%
   - Mempool congestion
   - Block time deviation

**Health Score Calculation**:
```typescript
// Hashrate stability (40 points)
const hashrateScore = calculateHashrateStability(current, avg24h, avg7d);

// Mempool health (30 points)
const mempoolScore = calculateMempoolHealth(pendingTxs, avgFee);

// Block production (30 points)
const blockScore = calculateBlockProduction(avgBlockTime, blocksLastHour);

const totalScore = hashrateScore + mempoolScore + blockScore;
```

**Files to Create**:
- `src/tools/composite/network-health-monitor.ts`
- `tests/unit/tools/composite/network-health-monitor.test.ts`

**Emoji**: 🏥

---

## Success Criteria
- [x] All 3 composite tools implemented
- [x] Each tool calls multiple endpoints in parallel (Promise.allSettled)
- [x] Graceful degradation on partial endpoint failures
- [x] Comprehensive unit tests with mocked API responses
- [x] Type definitions complete (no `any` types)
- [x] Markdown output is well-formatted and informative
- [x] Response time < 3 seconds with caching
- [x] Tools registered in src/tools/index.ts
- [x] TypeScript compilation passes
- [x] All tests pass (496 tests total, 493 passed, 3 skipped)

## Communication Protocol
- **Status Updates**: Agents update Status column atomically
- **Blockers**: Add to "Notes and Blockers" section below
- **Questions**: Prefix with `[QUESTION - C{ID}]`
- **Commits**: Use format `feat(composite): add braiins_{tool_name} tool`

## Merge Strategy
1. Each tool merged individually after validation
2. Run full test suite after each merge
3. Update DEVELOPMENT_PLAN.md Phase 2.5 status after completion
4. Create PR summary with all 3 composite tools

## Files to Update After Completion
- `src/tools/index.ts` - Export new composite tools
- `src/tools/composite/index.ts` - Create barrel export file
- `DEVELOPMENT_PLAN.md` - Mark Phase 2.5 complete
- `README.md` - Update tool count and add composite tool documentation

## Notes and Blockers
<!-- Agents: Add status updates, questions, and blockers here -->

**2025-12-16 - Phase 2.5 Started**
- Orchestrator: Claude Opus 4.5
- Total Tasks: 3
- Estimated Duration: 45-60 minutes (parallel execution)
- Status: Creating composite tools directory and spawning agents

**2025-12-16 - Phase 2.5 Completed**
- All 3 composite tools implemented and tested
- Test fix: Converted profitability-deep-dive.test.ts from vitest to jest
- Integration: Updated src/tools/index.ts to register all composite tools
- Final test results: 19 suites, 496 tests (493 passed, 3 skipped)
- Tools now available: braiins_mining_overview, braiins_profitability_deep_dive, braiins_network_health_monitor

---

## Orchestrator Checklist
- [x] Create composite tools directory structure
- [x] Create src/tools/composite/index.ts barrel file
- [x] Create git worktrees for C1-C3
- [x] Spawn 3 Builder agents in parallel
- [x] Monitor agent completion
- [x] Review and validate each tool
- [x] Merge to main
- [x] Update project documentation
- [ ] Cleanup worktrees

---

**Document Version**: 2.0
**Last Updated**: 2025-12-16
**Phase**: 2.5 Composite Tools
**Previous Version**: T0-T11 Implementation (Archived)
