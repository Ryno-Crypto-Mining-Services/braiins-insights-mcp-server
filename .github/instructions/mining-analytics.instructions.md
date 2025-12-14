# Braiins Mining Domain Best Practices

**Location**: `.github/instructions/mining-analytics.instructions.md`

---

## Mining Domain Knowledge

### Key Concepts for LLM Integration

#### Hashrate (TH/s - Terahash per second)
- Measure of mining power
- 1 TH/s = 1 trillion hash attempts per second
- Pool hashrate = sum of all connected miners
- Network difficulty affects time to find blocks

#### Pool Metrics
- **FPPS (Full Pay Per Share)**: Pays for both block rewards and transaction fees
- **Workers**: Individual ASIC miners connected to pool
- **Payout**: Daily or weekly BTC distribution to miners
- **Block Time**: ~10 minutes average (varies with difficulty)

#### Miner Hardware (ASIC Machines)
- **Temperature**: 30-80°C normal range, >95°C risky
- **Uptime**: Percentage of time mining (target: >99%)
- **Hash boards**: Component within miner (failures reduce power)
- **Power consumption**: Measured in watts (affects ROI)

### Tool-Specific Domain Guidance

#### `get_mining_stats` Tool

Returns current pool performance snapshot:

```typescript
interface MiningStats {
  pool_id: string;
  hashrate_ths: number;           // Current total pool hashrate
  active_workers: number;         // Connected ASIC miners
  estimated_daily_revenue_btc: number;
  estimated_monthly_revenue_btc: number;
  last_block_found: Date;         // When pool found most recent block
  blocks_found_24h: number;       // Recent block history
  network_difficulty: number;     // Current Bitcoin network difficulty
  payout_frequency: "daily" | "weekly";
  next_payout: Date;
}
```

**LLM Context**: These stats change every few minutes. Multiple queries within short time might return identical values due to caching.

#### `get_miner_details` Tool

Individual ASIC status and performance:

```typescript
interface MinerDetails {
  miner_id: string;
  model: string;                  // e.g., "Antminer S19J Pro"
  manufacturer: "Bitmain" | "Whatsminer" | "Avalon" | "Other";
  status: "online" | "offline" | "error";
  temperature_celsius: number;    // Warn if >85°C
  uptime_percent: number;         // Ideal: >99%
  current_hashrate_ths: number;
  power_consumption_watts: number;
  hash_boards: {
    id: number;
    status: "active" | "disabled" | "error";
    temperature: number;
  }[];
  uptime_hours: number;           // Time since last restart
  firmware_version: string;
  pool_url: string;
  current_user: string;           // Worker name on pool
}
```

**LLM Context**: Temperature and uptime are health indicators. If offline >30 minutes, may indicate network/power issues.

#### `get_pool_analytics` Tool

Historical trends and ROI analysis:

```typescript
interface PoolAnalytics {
  pool_id: string;
  period: "1h" | "24h" | "7d" | "30d";
  average_hashrate_ths: number;
  peak_hashrate_ths: number;
  min_hashrate_ths: number;
  hashrate_volatility_percent: number;
  total_btc_earned: number;
  blocks_found: number;
  average_block_time_minutes: number;
  estimated_difficulty_next_block: number;
  payout_delays: number;         // Days between payout cycles
  revenue_trend: "increasing" | "stable" | "decreasing";
}
```

**LLM Context**: Use for trend analysis and predicting future performance.

#### `estimate_mining_roi` Tool

Calculate profitability:

```typescript
interface ROIEstimate {
  daily_btc_revenue: number;
  daily_usd_revenue: number;     // At current BTC price
  monthly_btc_revenue: number;
  monthly_usd_revenue: number;
  annual_btc_revenue: number;
  annual_usd_revenue: number;
  
  // Costs
  daily_electricity_cost: number; // Based on power consumption
  monthly_electricity_cost: number;
  annual_electricity_cost: number;
  
  // Net profit
  daily_profit_usd: number;
  monthly_profit_usd: number;
  annual_profit_usd: number;
  
  // ROI metrics
  roi_percent: number;           // Annual ROI on hardware
  payback_period_days: number;   // Time to recover hardware cost
  btc_price_breakeven: number;   // BTC price where profitability = 0
}
```

**LLM Context**: ROI varies with BTC price and network difficulty. Use for investment decisions.

## Braiins API Integration Patterns

### Braiins Pool API (REST)

```typescript
class BraiinsPoolAPI {
  constructor(private apiKey: string) {
    this.baseUrl = "https://api.braiins.com/v2";
  }

  // Authentication header
  private getHeaders(): HeadersInit {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
  }

  // Fetch pool statistics
  async getPoolStats(poolId: string): Promise<PoolStatsResponse> {
    const response = await fetch(
      `${this.baseUrl}/pools/${poolId}/stats`,
      { headers: this.getHeaders() }
    );
    return response.json();
  }

  // Get account-level data
  async getAccountData(accountId: string): Promise<AccountData> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${accountId}`,
      { headers: this.getHeaders() }
    );
    return response.json();
  }

  // Get recent payouts
  async getPayouts(poolId: string, limit = 30): Promise<Payout[]> {
    const response = await fetch(
      `${this.baseUrl}/pools/${poolId}/payouts?limit=${limit}`,
      { headers: this.getHeaders() }
    );
    const data = await response.json();
    return data.payouts;
  }
}
```

### Braiins OS API (gRPC)

Connecting to miner hardware directly:

```typescript
class BraiinsOSClient {
  private channel: grpc.Channel;
  private miner: braiins.MinerServiceClient;

  constructor(host: string, port: number) {
    this.channel = grpc.createInsecureChannel(`${host}:${port}`);
    this.miner = new braiins.MinerServiceClient(this.channel);
  }

  // Get detailed miner status
  async getMinerDetails(minerId: string): Promise<MinerStatus> {
    return new Promise((resolve, reject) => {
      this.miner.getMinerDetails(
        { uid: minerId },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });
  }

  // Get hash board status
  async getHashboards(minerId: string): Promise<HashboardStatus[]> {
    return new Promise((resolve, reject) => {
      this.miner.getHashboards(
        { uid: minerId },
        (err, response) => {
          if (err) reject(err);
          else resolve(response.hashboards);
        }
      );
    });
  }

  // Get performance statistics
  async getMinerStats(minerId: string): Promise<MinerStats> {
    return new Promise((resolve, reject) => {
      this.miner.getMinerStats(
        { uid: minerId },
        (err, response) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });
  }

  close() {
    this.channel.close();
  }
}
```

## Common Mining Analytics Workflows

### Workflow 1: Daily Health Check

```typescript
async function performDailyHealthCheck(poolId: string, minerIds: string[]) {
  // 1. Get pool statistics
  const poolStats = await get_mining_stats(poolId);
  
  // 2. Check individual miner health
  const minerStatuses = await Promise.all(
    minerIds.map(id => get_miner_details(id))
  );
  
  // 3. Identify issues
  const issues = [];
  
  // Check pool-level issues
  if (poolStats.active_workers < 10) {
    issues.push(`⚠️ Low worker count: ${poolStats.active_workers}`);
  }
  
  // Check miner-level issues
  for (const miner of minerStatuses) {
    if (miner.status === "offline") {
      issues.push(`❌ Miner ${miner.miner_id} is OFFLINE`);
    } else if (miner.temperature_celsius > 85) {
      issues.push(`⚠️ Miner ${miner.miner_id} overheating: ${miner.temperature_celsius}°C`);
    } else if (miner.uptime_percent < 95) {
      issues.push(`⚠️ Miner ${miner.miner_id} uptime low: ${miner.uptime_percent}%`);
    }
  }
  
  return {
    timestamp: new Date(),
    pool_stats: poolStats,
    miner_statuses: minerStatuses,
    issues
  };
}
```

### Workflow 2: ROI Optimization

```typescript
async function analyzeROI(poolId: string, electricityRateUsd: number) {
  // 1. Get current statistics
  const stats = await get_mining_stats(poolId);
  const analytics = await get_pool_analytics(poolId, "30d");
  
  // 2. Estimate ROI
  const roi = await estimate_mining_roi({
    pool_id: poolId,
    electricity_rate_per_kwh: electricityRateUsd,
    period: "annual"
  });
  
  // 3. Provide recommendations
  const recommendations = [];
  
  if (roi.roi_percent < 10) {
    recommendations.push("⚠️ Low ROI. Consider:");
    recommendations.push("- Reducing hardware costs (upgrade or consolidate)");
    recommendations.push("- Finding cheaper electricity source");
    recommendations.push("- Switching to ASIC model with better efficiency");
  }
  
  if (analytics.revenue_trend === "decreasing") {
    recommendations.push("📉 Revenue declining. Possible causes:");
    recommendations.push("- Network difficulty increased");
    recommendations.push("- Pool performance degraded");
    recommendations.push("- Hardware efficiency issues");
  }
  
  return {
    current_roi: roi,
    monthly_profit_usd: roi.monthly_profit_usd,
    payback_period_days: roi.payback_period_days,
    recommendations
  };
}
```

### Workflow 3: Capacity Planning

```typescript
async function planCapacityExpansion(
  poolId: string,
  targetMonthlyRevenueBtc: number
) {
  // 1. Get current capacity
  const currentStats = await get_mining_stats(poolId);
  const currentRevenue = currentStats.estimated_monthly_revenue_btc;
  
  // 2. Calculate expansion needed
  const expansionFactor = targetMonthlyRevenueBtc / currentRevenue;
  const additionalHashrateThs = 
    currentStats.hashrate_ths * (expansionFactor - 1);
  
  // 3. Estimate additional hardware needed
  // Assuming Antminer S19 Pro (110 TH/s, 1500W)
  const s19ProHashrate = 110;
  const additionalMiners = Math.ceil(
    additionalHashrateThs / s19ProHashrate
  );
  
  return {
    current_hashrate_ths: currentStats.hashrate_ths,
    target_hashrate_ths: 
      currentStats.hashrate_ths * expansionFactor,
    additional_hashrate_needed_ths: additionalHashrateThs,
    additional_miners_needed: additionalMiners,
    estimated_additional_power_watts: 
      additionalMiners * 1500,
    roi_estimate: await estimate_mining_roi({
      pool_id: poolId,
      additional_hardware_count: additionalMiners
    })
  };
}
```

## Data Interpretation Guide

### Understanding Temperature

- **30-50°C**: Excellent (room-cooled or high ambient)
- **50-70°C**: Normal (typical indoor operation)
- **70-85°C**: Warm (monitor but acceptable)
- **85-95°C**: Hot (thermal stress, reduce efficiency)
- **>95°C**: Critical (shutdown risk, immediate action needed)

### Interpreting Uptime

- **>99%**: Excellent (no downtime)
- **95-99%**: Good (minor maintenance windows)
- **90-95%**: Fair (requires attention)
- **<90%**: Poor (significant reliability issues)

### Network Difficulty Trends

- Difficulty increases ~every 2 weeks (Bitcoin adjustment)
- Higher difficulty = more computational work = lower reward rate
- Plan for ~3% monthly difficulty increase in bull markets
- Use historical analytics to predict future payback periods

## Caching Strategy

Mine analytics change frequently but not constantly:

```typescript
// Cache TTL (time-to-live) recommendations
const CACHE_TTL = {
  mining_stats: 60,        // 1 minute (updates frequently)
  miner_details: 300,      // 5 minutes (mostly stable)
  pool_analytics: 3600,    // 1 hour (historical data)
  roi_estimate: 3600       // 1 hour (based on stable factors)
};
```

Most queries within 1 minute will return cached results. Inform LLM of this limitation.
