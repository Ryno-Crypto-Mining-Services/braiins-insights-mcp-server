# Usage Examples - Braiins Insights MCP Server

Practical examples and integration patterns for using the Braiins Insights MCP Server with AI coding assistants.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Claude Desktop Examples](#claude-desktop-examples)
- [Cursor IDE Examples](#cursor-ide-examples)
- [Common Use Cases](#common-use-cases)
- [Advanced Patterns](#advanced-patterns)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

1. **Install and configure** the Braiins Insights MCP Server (see [README.md](./README.md#installation))
2. **Connect** to your AI assistant (Claude Desktop, Cursor, etc.)
3. **Verify** connection by asking: "What MCP tools are available?"

### First Query

**Ask your AI assistant:**
```
"What's the current Bitcoin network hashrate?"
```

The AI will automatically:
1. Recognize this requires network data
2. Call the `braiins_hashrate_stats` tool
3. Format the response for you

---

## Claude Desktop Examples

### Example 1: Quick Network Overview

**Query:**
```
"Give me a quick overview of the Bitcoin network right now"
```

**What Claude Does:**
1. Calls `braiins_hashrate_stats` for network metrics
2. Calls `braiins_difficulty_stats` for difficulty info
3. Synthesizes the data into a summary

**Sample Response:**
```
Based on the current Braiins Insights data:

Network Status (as of Dec 14, 2025 12:00 UTC):

Hashrate:
- Current: 756.42 EH/s
- 30-day average: 751.18 EH/s
- Year-over-year change: +12.4% (+83.5 EH/s)

Difficulty:
- Current: 1.10e+17
- Next adjustment: In 1,456 blocks (~7 days)
- Estimated change: +2.06%

The network is healthy with steady hashrate growth. Difficulty is expected
to increase slightly at the next adjustment, reflecting continued miner participation.
```

---

### Example 2: Profitability Analysis

**Query:**
```
"I'm considering buying an Antminer S19 Pro for $2,500. My electricity costs $0.06/kWh.
Is this a good investment?"
```

**What Claude Does:**
1. Identifies S19 Pro efficiency: ~29.5 J/TH (from knowledge base)
2. Calls `braiins_profitability_calculator` with:
   ```json
   {
     "electricity_cost_kwh": 0.06,
     "hardware_efficiency_jth": 29.5,
     "hardware_cost_usd": 2500
   }
   ```
3. Analyzes the profitability data
4. Provides investment recommendation

**Sample Response:**
```
Based on current market conditions, here's the analysis for your S19 Pro investment:

Profitability Analysis:
- Daily revenue: $0.0542/TH (assuming ~110 TH/s = $5.96/day)
- Electricity cost: $0.0468/TH/day (~110 TH/s = $5.15/day)
- Net daily profit: $0.0074/TH (~$0.81/day for 110 TH/s)

ROI Calculation:
- Hardware cost: $2,500
- Daily profit: $0.81
- Estimated ROI: 3,086 days (8.5 years)

Break-even Analysis:
- Current BTC price: $96,250
- Break-even price: $63,500
- Safety margin: 51.6% above break-even

Recommendation:
⚠️ CAUTION: The ROI period is quite long (8.5 years). Consider:
- BTC price may fluctuate significantly
- Network difficulty typically increases over time
- Hardware may become obsolete before ROI
- The S21 (newer model) offers better efficiency at 17.5 J/TH

At $0.06/kWh, you're profitable but margins are thin. This investment
is speculative and depends heavily on future BTC price appreciation.
```

---

### Example 3: Historical Context

**Query:**
```
"When is the next Bitcoin halving and how will it affect miners?"
```

**What Claude Does:**
1. Calls `braiins_halvings` for schedule data
2. Calls `braiins_profitability_calculator` with current params
3. Explains the halving impact

**Sample Response:**
```
Next Bitcoin Halving:

Timing:
- Estimated date: April 15, 2028 at 6:00 AM UTC
- Countdown: ~3 years, 122 days
- Block height: 1,050,000 (currently at 872,450)
- Blocks remaining: 177,550

Reward Changes:
- Current block reward: 3.125 BTC
- Post-halving reward: 1.5625 BTC
- 50% reduction in mining rewards

Impact on Miners:

Before Halving (Current):
- Daily revenue per TH: $0.0542
- At 100 TH/s: ~$5.42/day

After Halving (Estimated):
- Daily revenue per TH: ~$0.0271 (50% reduction)
- At 100 TH/s: ~$2.71/day

What This Means:
1. Revenue Cut in Half: Unless BTC price doubles, miner revenue drops 50%
2. Profitability Squeeze: Less efficient miners may become unprofitable
3. Hashrate Impact: Some miners may shut down if unprofitable
4. Difficulty Adjustment: If hashrate drops, difficulty will adjust down

Historically, BTC price has increased following halvings, but this is not
guaranteed. Miners should plan for tighter margins and ensure low electricity
costs and efficient hardware.
```

---

### Example 4: Recent Block Analysis

**Query:**
```
"Show me the last 20 blocks and tell me which pool is dominating"
```

**What Claude Does:**
1. Calls `braiins_blocks` with `{ page_size: 20 }`
2. Analyzes pool distribution in the results
3. Calculates pool percentages

**Sample Response:**
```
Last 20 Blocks (Most Recent):

Block Data Retrieved:
872,450 - Braiins (2m ago)
872,449 - Foundry USA (12m ago)
872,448 - AntPool (25m ago)
872,447 - F2Pool (38m ago)
872,446 - ViaBTC (51m ago)
... (15 more blocks)

Pool Distribution (Last 20 Blocks):
1. Foundry USA: 7 blocks (35%)
2. AntPool: 5 blocks (25%)
3. Braiins: 3 blocks (15%)
4. F2Pool: 2 blocks (10%)
5. ViaBTC: 2 blocks (10%)
6. Luxor: 1 block (5%)

Analysis:
Foundry USA is currently leading with 35% of the last 20 blocks, which
is slightly above their typical ~28% network share. This is within normal
variance for a 20-block sample. AntPool follows with 25%, also close to
their usual share.

Average Block Stats:
- Size: 1.42 MB (average)
- Transactions: 3,073 per block
- Block interval: ~10.2 minutes

No unusual patterns detected. Network is operating normally.
```

---

### Example 5: News and Updates

**Query:**
```
"What are the latest updates from Braiins?"
```

**What Claude Does:**
1. Calls `braiins_rss_feed_data`
2. Summarizes the most relevant posts

**Sample Response:**
```
Latest Braiins News and Announcements:

Recent Posts (Last 30 Days):

1. "Braiins Pool Launches Stratum V2 Support" (Dec 10, 2025)
   - Full support for the next-generation mining protocol
   - Improved efficiency, security, and decentralization
   - Read more: https://braiins.com/blog/stratum-v2-launch

2. "Bitcoin Network Hashrate Reaches New All-Time High" (Dec 8, 2025)
   - Network hashrate hit 780 EH/s
   - Analysis of continued mining investment trends
   - Read more: https://braiins.com/blog/hashrate-ath-2025

3. "November 2025 Mining Market Report" (Dec 1, 2025)
   - Monthly profitability trends
   - Hardware market analysis
   - Read more: https://braiins.com/blog/nov-2025-report

(Showing 3 of 10 recent posts)

Key Highlights:
- Stratum V2 is now production-ready on Braiins Pool
- Network continues strong growth with new ATH hashrate
- Monthly reports provide detailed profitability insights

For full news feed, visit: https://insights.braiins.com
```

---

## Cursor IDE Examples

### Example 1: Inline Mining Economics Research

**In your code editor, select a comment like:**
```typescript
// TODO: Calculate if home mining is profitable at $0.10/kWh
```

**Ask Cursor with Cmd+K:**
```
"Help me understand if home mining is viable with the selected electricity cost"
```

**Cursor's Response:**
```
Based on current network conditions from Braiins Insights:

At $0.10/kWh electricity cost with typical home mining hardware:

Antminer S19 Pro (29.5 J/TH, ~110 TH/s):
- Daily revenue: $5.96
- Daily electricity: $7.79
- Net: -$1.83/day (UNPROFITABLE ❌)

Antminer S21 (17.5 J/TH, ~200 TH/s):
- Daily revenue: $10.84
- Daily electricity: $8.40
- Net: +$2.44/day (Marginally profitable ⚠️)

Conclusion:
Home mining at $0.10/kWh is challenging. Only the most efficient hardware
(S21, ~17.5 J/TH) is marginally profitable. For sustainable home mining,
you'd need:
- Electricity < $0.07/kWh, OR
- Latest generation ASICs (S21 or better), OR
- BTC price to increase significantly

Consider industrial mining facilities with <$0.05/kWh for better margins.

Code suggestion:
```typescript
const ELECTRICITY_THRESHOLD_HOME = 0.07; // $/kWh
const MIN_EFFICIENCY_HOME = 20; // J/TH
```

---

### Example 2: Difficulty Adjustment Prediction

**Writing a difficulty prediction algorithm:**
```typescript
// Need to fetch current difficulty and estimate next adjustment
```

**Ask Cursor:**
```
"Fetch current difficulty stats and explain the next adjustment"
```

**Cursor's Response:**
```
Current Difficulty Statistics (from Braiins Insights):

- Current Difficulty: 1.10e+17 (109,780,000,000,000,000)
- Estimated Next Difficulty: 1.12e+17 (+2.06%)
- Blocks Until Adjustment: 1,456 blocks
- Estimated Time: ~7 days (Dec 21, 2025 18:30 UTC)

Here's code to work with this data:

```typescript
interface DifficultyStats {
  currentDifficulty: number;
  estimatedNextDifficulty: number;
  estimatedChange: number; // percentage
  blocksUntilAdjustment: number;
  estimatedAdjustmentTime: Date;
}

async function getCurrentDifficulty(): Promise<DifficultyStats> {
  // This would call braiins_difficulty_stats via MCP
  // For now, using latest data:
  return {
    currentDifficulty: 1.10e17,
    estimatedNextDifficulty: 1.12e17,
    estimatedChange: 2.06,
    blocksUntilAdjustment: 1456,
    estimatedAdjustmentTime: new Date('2025-12-21T18:30:00Z')
  };
}

function predictMiningRevenue(
  hashrateInTH: number,
  difficulty: number,
  btcPrice: number
): number {
  // Mining reward formula: (hashrate / network_hashrate) * block_reward * blocks_per_day
  const networkHashrate = difficulty / (2**32) * Math.pow(2,256-1); // simplified
  // ... rest of calculation
}
```

Explanation:
The +2.06% increase suggests hashrate is slightly ahead of target pace.
This means blocks are being mined slightly faster than 10 minutes on average,
triggering an upward difficulty adjustment to bring block time back to target.

---

## Common Use Cases

### Use Case 1: Daily Mining Operations

**Morning Routine Check:**
```
"Give me a morning summary: current hashrate, difficulty, recent blocks,
and any Braiins news"
```

**AI Combines Multiple Tools:**
- `braiins_hashrate_stats` → Network performance
- `braiins_difficulty_stats` → Adjustment status
- `braiins_blocks` (last 10) → Recent mining activity
- `braiins_rss_feed_data` → Latest updates

---

### Use Case 2: Investment Decision Making

**Scenario: Evaluating New Hardware Purchase**

**Query:**
```
"I'm deciding between buying 10x S19 Pro ($2,000 each) or 5x S21 ($5,500 each).
My electricity is $0.055/kWh. Which is better?"
```

**AI's Approach:**
1. Calculate profitability for each option:
   - S19 Pro: `{ electricity_cost_kwh: 0.055, hardware_efficiency_jth: 29.5, hardware_cost_usd: 20000 }`
   - S21: `{ electricity_cost_kwh: 0.055, hardware_efficiency_jth: 17.5, hardware_cost_usd: 27500 }`
2. Compare ROI, daily profit, and break-even scenarios
3. Provide recommendation based on data

---

### Use Case 3: Market Research

**Query:**
```
"What's the state of Bitcoin mining right now? Is it a good time to start?"
```

**AI Analyzes:**
- Current hashrate trends (growth = competition increasing)
- Difficulty trajectory (rising = harder to mine)
- Profitability at various electricity costs
- Upcoming halving impact (if relevant)
- Recent industry news

---

### Use Case 4: Educational Research

**Query:**
```
"Explain how Bitcoin halvings work and show me the historical schedule"
```

**AI Uses:**
- `braiins_halvings` → Gets complete halving data
- Explains the concept with real data
- Shows historical halvings table
- Predicts future impact

---

## Advanced Patterns

### Pattern 1: Comparative Analysis

**Compare Multiple Scenarios:**
```
"Compare mining profitability at these three locations:
1. Home ($0.12/kWh)
2. Data center ($0.06/kWh)
3. Hydro facility ($0.03/kWh)

Use S19 Pro efficiency for all."
```

**AI Executes:**
```javascript
// Calls profitability calculator 3 times
const scenarios = [
  { location: "Home", cost: 0.12 },
  { location: "Data Center", cost: 0.06 },
  { location: "Hydro Facility", cost: 0.03 }
];

for (const scenario of scenarios) {
  await braiins_profitability_calculator({
    electricity_cost_kwh: scenario.cost,
    hardware_efficiency_jth: 29.5
  });
}
```

**Creates Comparison Table:**
| Location | Daily Profit/TH | Monthly Profit | Profitability |
|----------|-----------------|----------------|---------------|
| Home | -$0.0326 | -$0.98 | ❌ Unprofitable |
| Data Center | +$0.0074 | +$0.22 | ⚠️ Marginal |
| Hydro Facility | +$0.0290 | +$0.87 | ✅ Profitable |

---

### Pattern 2: Time-Series Context

**Analyze Trends Over Time:**
```
"Show me blocks mined in the last 3 days and identify any patterns"
```

**AI Strategy:**
```
Day 1: braiins_blocks({ start_date: "2025-12-11", end_date: "2025-12-11", page_size: 100 })
Day 2: braiins_blocks({ start_date: "2025-12-12", end_date: "2025-12-12", page_size: 100 })
Day 3: braiins_blocks({ start_date: "2025-12-13", end_date: "2025-12-13", page_size: 100 })
```

**Analyzes:**
- Blocks per day (target: 144)
- Pool distribution changes
- Average block size trends
- Transaction count variations

---

### Pattern 3: Conditional Recommendations

**Context-Aware Advice:**
```
"Should I turn on my miners today? I have S19 Pros and electricity costs $0.08/kWh"
```

**AI Decision Tree:**
1. Check current profitability → `braiins_profitability_calculator`
2. If profitable: "Yes, run miners"
3. If marginal: Check if difficulty is about to adjust
   - If adjustment soon: Wait if increase expected
   - If adjustment far: Run miners now
4. If unprofitable: "No, wait for better conditions"

**Sample Response:**
```
Current Analysis (Dec 14, 2025):

Profitability Check:
- Net daily profit: +$0.0074/TH (~$0.81/day per S19 Pro)
- Status: Marginally profitable ⚠️

Difficulty Outlook:
- Next adjustment in 1,456 blocks (~7 days)
- Expected change: +2.06%
- Impact: Will reduce profit by ~2%

Recommendation:
✅ YES, but with caution:
- Run miners NOW for the next 7 days
- Before Dec 21 adjustment, re-evaluate
- If BTC price drops below $93,000, shut down
- Monitor for sudden hashrate spikes

Set up alerts for:
- BTC price < $93,000
- Network hashrate > 800 EH/s
- Next difficulty adjustment
```

---

### Pattern 4: Integration with Code Generation

**Generate Mining Dashboard Code:**
```
"Generate TypeScript code for a mining dashboard that fetches:
1. Current hashrate
2. Profitability at my electricity cost ($0.055/kWh)
3. Next difficulty adjustment
4. Recent blocks

Use the Braiins Insights MCP tools."
```

**AI Generates:**
```typescript
import { MCPClient } from '@modelcontextprotocol/sdk';

interface MiningDashboardData {
  hashrate: HashrateStats;
  profitability: ProfitabilityData;
  difficulty: DifficultyStats;
  recentBlocks: BlockData[];
  lastUpdated: Date;
}

class MiningDashboard {
  private mcpClient: MCPClient;
  private electricityCost = 0.055; // $/kWh
  private hardwareEfficiency = 29.5; // J/TH (S19 Pro)

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  async fetchDashboardData(): Promise<MiningDashboardData> {
    // Fetch all data in parallel
    const [hashrate, profitability, difficulty, blocks] = await Promise.all([
      this.mcpClient.callTool('braiins_hashrate_stats', {}),
      this.mcpClient.callTool('braiins_profitability_calculator', {
        electricity_cost_kwh: this.electricityCost,
        hardware_efficiency_jth: this.hardwareEfficiency
      }),
      this.mcpClient.callTool('braiins_difficulty_stats', {}),
      this.mcpClient.callTool('braiins_blocks', { page_size: 10 })
    ]);

    return {
      hashrate: this.parseHashrateResponse(hashrate),
      profitability: this.parseProfitabilityResponse(profitability),
      difficulty: this.parseDifficultyResponse(difficulty),
      recentBlocks: this.parseBlocksResponse(blocks),
      lastUpdated: new Date()
    };
  }

  async updateDashboard(): Promise<void> {
    const data = await this.fetchDashboardData();

    console.log('=== MINING DASHBOARD ===');
    console.log(`Updated: ${data.lastUpdated.toISOString()}\n`);

    console.log('Network Hashrate:', data.hashrate.current, 'EH/s');
    console.log('Your Daily Profit:', data.profitability.netDailyProfit, '$/TH');
    console.log('Next Difficulty Adj:', data.difficulty.blocksRemaining, 'blocks');
    console.log('Recent Blocks:', data.recentBlocks.length);
    console.log('========================\n');
  }

  // Helper methods for parsing responses
  private parseHashrateResponse(response: any): HashrateStats {
    // Parse markdown response to extract data
    // Implementation details...
  }

  // ... more helper methods
}

// Usage
const dashboard = new MiningDashboard(mcpClient);
setInterval(() => dashboard.updateDashboard(), 300000); // Update every 5 minutes
```

---

## Error Handling

### Handling Network Errors

**Query with Expected Error:**
```
"What's the current hashrate?"
[Network is down]
```

**AI Response:**
```
❌ I encountered an error fetching the hashrate data:

Network Error: Could not reach Braiins Insights API
Details: Connection timeout after 10 seconds

Troubleshooting:
1. Check your internet connection
2. Verify https://insights.braiins.com is accessible
3. Try again in a moment

Would you like me to try again or use cached data if available?
```

---

### Handling Invalid Parameters

**Query with Invalid Input:**
```
"Calculate profitability at $5/kWh electricity"
[Exceeds max of $1/kWh]
```

**AI Response:**
```
❌ Validation Error: The electricity cost you provided is invalid.

- electricity_cost_kwh: Electricity cost unreasonably high (>$1/kWh)

The maximum supported electricity cost is $1.00/kWh.
Did you mean $0.05/kWh instead?

Please provide:
- electricity_cost_kwh: number between 0 and 1 ($/kWh)
- hardware_efficiency_jth: number between 1 and 200 (J/TH)
```

---

### Graceful Degradation

**Partial Tool Failure:**
```
"Give me a complete mining overview"
[hashrate_stats works, difficulty_stats fails]
```

**AI Response:**
```
Here's the mining overview (partial data due to API issues):

✅ Network Hashrate (available):
- Current: 756.42 EH/s
- 30-day average: 751.18 EH/s

❌ Difficulty Statistics (temporarily unavailable):
- Could not fetch difficulty data
- Error: API returned 503 Service Unavailable

Would you like me to:
1. Try fetching difficulty stats again
2. Continue with available data
3. Wait and retry the full overview
```

---

## Best Practices

### 1. Be Specific with Queries

**❌ Vague:**
```
"Tell me about Bitcoin mining"
```

**✅ Specific:**
```
"What's the current profitability of mining with an S19 Pro at $0.07/kWh electricity?"
```

---

### 2. Combine Tools for Context

**❌ Single Tool:**
```
"What's the hashrate?"
```

**✅ Combined Context:**
```
"What's the hashrate, how does it compare to last month, and what does this mean for difficulty?"
```

---

### 3. Provide Relevant Parameters

**❌ Missing Context:**
```
"Should I buy mining hardware?"
```

**✅ Complete Context:**
```
"Should I buy a $3,000 Antminer S21 if my electricity costs $0.06/kWh and I want ROI within 2 years?"
```

---

### 4. Use Date Ranges Effectively

**❌ Unclear Timeframe:**
```
"Show me some blocks"
```

**✅ Clear Timeframe:**
```
"Show me blocks mined between December 10-13, 2025"
```

---

### 5. Iterate on Responses

**Conversation Flow:**
```
You: "What's the current hashrate?"
AI: [Returns data]
You: "How does this compare to last year?"
AI: [Explains 1-year trend from hashrate stats]
You: "Will this affect profitability?"
AI: [Calls profitability calculator with context]
```

---

### 6. Cache Awareness

**For Real-Time Data:**
```
"Show me the very latest blocks (last 5 minutes)"
→ Use braiins_blocks with no date filter
```

**For Historical Analysis:**
```
"Show me blocks from last week"
→ Use braiins_blocks with start_date/end_date
(Data is cached, faster response)
```

---

### 7. Error Recovery

**When Errors Occur:**
```
You: "Calculate profitability at $0.08/kWh"
AI: [Returns network error]
You: "Try again"
AI: [Retries the request]
```

Or:
```
You: "Use cached data if available"
AI: [Returns last successful cached response]
```

---

## Integration Examples

### Example 1: Slack Bot Integration

```typescript
// Slack bot that provides mining updates
import { App } from '@slack/bolt';
import { MCPClient } from '@modelcontextprotocol/sdk';

const app = new App({ token: process.env.SLACK_BOT_TOKEN });
const mcpClient = new MCPClient();

app.command('/mining-status', async ({ command, ack, respond }) => {
  await ack();

  try {
    const hashrate = await mcpClient.callTool('braiins_hashrate_stats', {});
    const difficulty = await mcpClient.callTool('braiins_difficulty_stats', {});

    await respond({
      text: `⛏️ Mining Status:\n\nHashrate: ${hashrate.current} EH/s\nDifficulty: ${difficulty.current}\nNext Adjustment: ${difficulty.blocksRemaining} blocks`
    });
  } catch (error) {
    await respond({ text: `❌ Error fetching data: ${error.message}` });
  }
});
```

---

### Example 2: Monitoring Dashboard

```typescript
// Web dashboard component (React)
import { useEffect, useState } from 'react';

function MiningDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Call MCP tools via AI assistant API
      const response = await fetch('/api/mining-data');
      const json = await response.json();
      setData(json);
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Mining Dashboard</h1>
      <div className="metrics">
        <MetricCard
          title="Network Hashrate"
          value={`${data.hashrate} EH/s`}
          trend={data.hashrateTrend}
        />
        <MetricCard
          title="Your Profitability"
          value={`$${data.dailyProfit}/day`}
          status={data.isProfitable ? 'success' : 'danger'}
        />
        <MetricCard
          title="Next Difficulty"
          value={`${data.difficultyChange}%`}
          countdown={`${data.blocksRemaining} blocks`}
        />
      </div>
    </div>
  );
}
```

---

### Example 3: Automated Alerts

```typescript
// Alert system for mining conditions
class MiningAlerts {
  private lastProfitability: number | null = null;

  async checkConditions() {
    const prof = await mcpClient.callTool('braiins_profitability_calculator', {
      electricity_cost_kwh: 0.08,
      hardware_efficiency_jth: 29.5
    });

    // Alert if profitability drops below threshold
    if (prof.netDailyProfit < 0.01 && this.lastProfitability >= 0.01) {
      await this.sendAlert('⚠️ Mining profitability dropped below $0.01/TH!');
    }

    // Alert if now unprofitable
    if (prof.netDailyProfit < 0 && this.lastProfitability >= 0) {
      await this.sendAlert('🚨 Mining is now UNPROFITABLE! Consider shutting down.');
    }

    this.lastProfitability = prof.netDailyProfit;
  }

  async sendAlert(message: string) {
    // Send via email, SMS, Slack, etc.
    console.log(message);
  }
}

// Run every hour
const alerts = new MiningAlerts();
setInterval(() => alerts.checkConditions(), 3600000);
```

---

## Additional Resources

- **API Reference:** [API.md](./API.md)
- **Tool Catalog:** [TOOL_CATALOG.md](./TOOL_CATALOG.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Setup Guides:**
  - [Claude Desktop](./CLAUDE.md)
  - [Cursor IDE](./COPILOT.md)

---

**Last Updated:** December 14, 2025
**Document Version:** 1.0
**Server Version:** 0.2.0
