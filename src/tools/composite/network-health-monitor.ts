/**
 * MCP Composite Tool: braiins_network_health_monitor
 *
 * Aggregates multiple Braiins Insights API endpoints to provide comprehensive
 * network health indicators and anomaly detection with calculated health score.
 *
 * Combines:
 * - Hashrate stats (network hashrate metrics)
 * - Difficulty stats (difficulty metrics)
 * - Transaction stats (mempool data)
 * - Hashrate and difficulty history (trend analysis)
 *
 * @category Composite Tool
 * @see https://insights.braiins.com
 */

import {
  BraiinsInsightsHashrateStats,
  BraiinsInsightsDifficultyStats,
  BraiinsInsightsTransactionStats,
  BraiinsInsightsHashDiffHistory,
} from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Input parameters for network health monitor
 */
interface NetworkHealthMonitorInput {
  /** Include detailed hourly hashrate history */
  include_detailed_history?: boolean;
  /** Hours of history to analyze */
  history_hours?: number;
}

/**
 * Health score components
 */
interface HealthScoreBreakdown {
  /** Hashrate stability score (0-40) */
  hashrate: number;
  /** Mempool health score (0-30) */
  mempool: number;
  /** Block production score (0-30) */
  blockProduction: number;
  /** Total health score (0-100) */
  total: number;
}

/**
 * Alert types
 */
interface Alert {
  /** Alert severity level */
  severity: 'warning' | 'critical';
  /** Alert message */
  message: string;
}

/**
 * Network Health Monitor Tool
 *
 * Composite tool that aggregates multiple endpoints to provide network health indicators
 * and calculated health score with anomaly detection.
 */
export class NetworkHealthMonitorTool {
  /** MCP tool name */
  readonly name = 'braiins_network_health_monitor';

  /** Tool description shown to LLM */
  readonly description =
    'Monitor Bitcoin network health with comprehensive indicators including hashrate stability, ' +
    'mempool congestion, and block production timing. Returns a 0-100 health score with alerts ' +
    'for any detected anomalies.';

  /** JSON schema for tool inputs */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      include_detailed_history: {
        type: 'boolean',
        description: 'Include detailed hourly hashrate history',
        default: false,
      },
      history_hours: {
        type: 'number',
        description: 'Hours of history to analyze',
        default: 24,
        minimum: 6,
        maximum: 168,
      },
    },
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Optional parameters for detailed history
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Parse input
      const params = this.parseInput(input);

      // Fetch data from multiple endpoints in parallel with graceful degradation
      const results = await Promise.allSettled([
        this.apiClient.getHashrateStats(),
        this.apiClient.getDifficultyStats(),
        this.apiClient.getTransactionStats(),
        params.include_detailed_history ? this.apiClient.getHashrateAndDifficultyHistory() : null,
      ]);

      // Extract successful results
      const hashrateStats = results[0].status === 'fulfilled' ? results[0].value : null;
      const difficultyStats = results[1].status === 'fulfilled' ? results[1].value : null;
      const transactionStats = results[2].status === 'fulfilled' ? results[2].value : null;
      const historyData =
        results[3].status === 'fulfilled' && results[3].value !== null ? results[3].value : null;

      // Check if we have critical data
      if (!hashrateStats && !difficultyStats && !transactionStats) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ **Network Health Monitor Unavailable**\n\nUnable to fetch data from any endpoint. Please try again later.',
            },
          ],
          isError: true,
        };
      }

      // Calculate health score with available data
      const healthScore = this.calculateHealthScore(
        hashrateStats,
        transactionStats,
        difficultyStats,
        historyData
      );

      // Generate alerts
      const alerts = this.generateAlerts(
        hashrateStats,
        transactionStats,
        difficultyStats,
        historyData
      );

      // Format as markdown
      const markdown = this.formatAsMarkdown(
        hashrateStats,
        difficultyStats,
        transactionStats,
        historyData,
        healthScore,
        alerts,
        params
      );

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
   * Parse and validate input parameters
   */
  private parseInput(input: unknown): NetworkHealthMonitorInput {
    const params: NetworkHealthMonitorInput = {
      include_detailed_history: false,
      history_hours: 24,
    };

    if (!input || typeof input !== 'object') {
      return params;
    }

    const inputObj = input as Record<string, unknown>;

    if (typeof inputObj['include_detailed_history'] === 'boolean') {
      params.include_detailed_history = inputObj['include_detailed_history'];
    }

    if (typeof inputObj['history_hours'] === 'number') {
      const hours = inputObj['history_hours'];
      if (hours >= 6 && hours <= 168) {
        params.history_hours = Math.floor(hours);
      }
    }

    return params;
  }

  /**
   * Calculate hashrate stability score (0-40 points)
   *
   * Compares current hashrate to 24h and 7d averages.
   * Scores higher when current is within 5% of averages.
   */
  private calculateHashrateStability(
    hashrateStats: BraiinsInsightsHashrateStats | null,
    historyData: BraiinsInsightsHashDiffHistory[] | null
  ): number {
    if (!hashrateStats) {
      return 0; // No data, no score
    }

    const current = hashrateStats.current_hashrate;
    const avg30d = hashrateStats.hash_rate_30;

    // Calculate deviation from 30-day average
    const deviationPercent = Math.abs((current - avg30d) / avg30d) * 100;

    let score = 40;

    // Penalize based on deviation
    if (deviationPercent > 15) {
      score -= 25; // Critical deviation
    } else if (deviationPercent > 10) {
      score -= 15; // High deviation
    } else if (deviationPercent > 5) {
      score -= 10; // Moderate deviation
    } else if (deviationPercent > 2) {
      score -= 5; // Slight deviation
    }

    // Bonus points for trend analysis if history available
    if (historyData && historyData.length >= 24) {
      const recentHashrates = historyData.slice(0, 24).map((d) => d.hashrate_ehs);
      const avgRecent = recentHashrates.reduce((a, b) => a + b, 0) / recentHashrates.length;
      const recentDeviation = Math.abs((current - avgRecent) / avgRecent) * 100;

      if (recentDeviation < 2) {
        score = Math.min(40, score + 5); // Bonus for stability
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate mempool health score (0-30 points)
   *
   * Lower score when mempool is congested (high tx count, high fees).
   */
  private calculateMempoolHealth(transactionStats: BraiinsInsightsTransactionStats | null): number {
    if (!transactionStats) {
      return 0; // No data, no score
    }

    let score = 30;

    const { mempool_size, avg_fee_sat_per_byte } = transactionStats;

    // Penalize based on mempool size
    if (mempool_size > 100000) {
      score -= 15; // Very high congestion
    } else if (mempool_size > 50000) {
      score -= 10; // High congestion
    } else if (mempool_size > 20000) {
      score -= 5; // Moderate congestion
    } else if (mempool_size > 10000) {
      score -= 2; // Slight congestion
    }

    // Penalize based on fee level
    if (avg_fee_sat_per_byte > 100) {
      score -= 10; // Extremely high fees
    } else if (avg_fee_sat_per_byte > 50) {
      score -= 8; // Very high fees
    } else if (avg_fee_sat_per_byte > 20) {
      score -= 5; // High fees
    } else if (avg_fee_sat_per_byte > 10) {
      score -= 2; // Moderate fees
    }

    return Math.max(0, score);
  }

  /**
   * Calculate block production score (0-30 points)
   *
   * Score based on average block time deviation from 10 min target.
   * Uses blocks until next difficulty adjustment as a proxy.
   */
  private calculateBlockProduction(difficultyStats: BraiinsInsightsDifficultyStats | null): number {
    if (!difficultyStats) {
      return 15; // No data, give neutral score
    }

    let score = 30;

    const { blocks_until_adjustment } = difficultyStats;

    // Difficulty adjusts every 2016 blocks (~2 weeks)
    // If blocks_until_adjustment is far from expected (~1000-2016), timing is off

    // If we're way ahead or behind schedule, penalize
    if (blocks_until_adjustment > 1900) {
      // Just adjusted, blocks coming slower than 10 min
      score -= 10;
    } else if (blocks_until_adjustment < 100) {
      // About to adjust, check if it's early
      if (difficultyStats.estimated_change_percent !== undefined) {
        const changePercent = difficultyStats.estimated_change_percent;
        if (Math.abs(changePercent) > 10) {
          score -= 10; // Large adjustment needed
        } else if (Math.abs(changePercent) > 5) {
          score -= 5; // Moderate adjustment
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate overall health score with breakdown
   */
  private calculateHealthScore(
    hashrateStats: BraiinsInsightsHashrateStats | null,
    transactionStats: BraiinsInsightsTransactionStats | null,
    difficultyStats: BraiinsInsightsDifficultyStats | null,
    historyData: BraiinsInsightsHashDiffHistory[] | null
  ): HealthScoreBreakdown {
    const hashrateScore = this.calculateHashrateStability(hashrateStats, historyData);
    const mempoolScore = this.calculateMempoolHealth(transactionStats);
    const blockProductionScore = this.calculateBlockProduction(difficultyStats);

    return {
      hashrate: hashrateScore,
      mempool: mempoolScore,
      blockProduction: blockProductionScore,
      total: hashrateScore + mempoolScore + blockProductionScore,
    };
  }

  /**
   * Generate alerts based on anomaly detection
   */
  private generateAlerts(
    hashrateStats: BraiinsInsightsHashrateStats | null,
    transactionStats: BraiinsInsightsTransactionStats | null,
    difficultyStats: BraiinsInsightsDifficultyStats | null,
    _historyData: BraiinsInsightsHashDiffHistory[] | null
  ): Alert[] {
    const alerts: Alert[] = [];

    // Check hashrate drop
    if (hashrateStats) {
      const current = hashrateStats.current_hashrate;
      const avg30d = hashrateStats.hash_rate_30;
      const dropPercent = ((avg30d - current) / avg30d) * 100;

      if (dropPercent > 10) {
        alerts.push({
          severity: 'critical',
          message: `Hashrate dropped ${dropPercent.toFixed(1)}% below 30-day average`,
        });
      } else if (dropPercent > 5) {
        alerts.push({
          severity: 'warning',
          message: `Hashrate is ${dropPercent.toFixed(1)}% below 30-day average`,
        });
      }
    }

    // Check mempool congestion
    if (transactionStats) {
      if (transactionStats.mempool_size > 100000) {
        alerts.push({
          severity: 'critical',
          message: `Severe mempool congestion: ${transactionStats.mempool_size.toLocaleString()} pending transactions`,
        });
      } else if (transactionStats.mempool_size > 50000) {
        alerts.push({
          severity: 'warning',
          message: `High mempool congestion: ${transactionStats.mempool_size.toLocaleString()} pending transactions`,
        });
      }

      if (transactionStats.avg_fee_sat_per_byte > 100) {
        alerts.push({
          severity: 'critical',
          message: `Extremely high transaction fees: ${transactionStats.avg_fee_sat_per_byte.toFixed(0)} sat/vB`,
        });
      } else if (transactionStats.avg_fee_sat_per_byte > 50) {
        alerts.push({
          severity: 'warning',
          message: `High transaction fees: ${transactionStats.avg_fee_sat_per_byte.toFixed(0)} sat/vB`,
        });
      }
    }

    // Check block time deviation
    if (difficultyStats?.estimated_change_percent !== undefined) {
      const changePercent = difficultyStats.estimated_change_percent;
      if (Math.abs(changePercent) > 15) {
        alerts.push({
          severity: 'warning',
          message: `Significant difficulty adjustment expected: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
        });
      }
    }

    return alerts;
  }

  /**
   * Format network health data as markdown
   */
  private formatAsMarkdown(
    hashrateStats: BraiinsInsightsHashrateStats | null,
    difficultyStats: BraiinsInsightsDifficultyStats | null,
    transactionStats: BraiinsInsightsTransactionStats | null,
    historyData: BraiinsInsightsHashDiffHistory[] | null,
    healthScore: HealthScoreBreakdown,
    alerts: Alert[],
    params: NetworkHealthMonitorInput
  ): string {
    const sections: string[] = [];

    // Header
    sections.push('# 🏥 Bitcoin Network Health Monitor\n');

    // Health Score
    sections.push('## Network Health Score\n');
    const statusIcon = this.getHealthStatusIcon(healthScore.total);
    const statusText = this.getHealthStatusText(healthScore.total);
    sections.push(`### ${statusIcon} Overall: ${healthScore.total}/100 - ${statusText}\n`);

    sections.push('**Score Breakdown:**');
    sections.push(`- Hashrate Stability: ${healthScore.hashrate}/40`);
    sections.push(`- Mempool Health: ${healthScore.mempool}/30`);
    sections.push(`- Block Production: ${healthScore.blockProduction}/30`);

    // Alerts (if any)
    if (alerts.length > 0) {
      sections.push('\n## 🚨 Alerts\n');
      for (const alert of alerts) {
        const icon = alert.severity === 'critical' ? '🔴' : '⚠️';
        sections.push(`${icon} **${alert.severity.toUpperCase()}:** ${alert.message}`);
      }
    } else {
      sections.push('\n## ✅ No Alerts\n');
      sections.push('Network operating within normal parameters.');
    }

    // Mining Activity
    if (hashrateStats) {
      sections.push('\n## ⛏️ Mining Activity\n');
      sections.push(`- **Current Hashrate:** ${hashrateStats.current_hashrate.toFixed(2)} EH/s`);
      sections.push(`- **30-Day Average:** ${hashrateStats.hash_rate_30.toFixed(2)} EH/s`);

      const deviationPercent =
        ((hashrateStats.current_hashrate - hashrateStats.hash_rate_30) /
          hashrateStats.hash_rate_30) *
        100;
      const trend = this.getTrendIndicator(deviationPercent);
      sections.push(`- **Trend:** ${trend}`);
      sections.push(
        `- **Stability:** ${deviationPercent >= 0 ? '+' : ''}${deviationPercent.toFixed(2)}% from average`
      );
    } else {
      sections.push('\n## ⛏️ Mining Activity\n');
      sections.push('*Data unavailable*');
    }

    // Mempool Status
    if (transactionStats) {
      sections.push('\n## 📊 Mempool Status\n');
      sections.push(
        `- **Pending Transactions:** ${transactionStats.mempool_size.toLocaleString()}`
      );
      sections.push(
        `- **Average Fee Rate:** ${transactionStats.avg_fee_sat_per_byte.toFixed(2)} sat/vB`
      );

      const congestionLevel = this.getCongestionLevel(transactionStats.mempool_size);
      sections.push(`- **Congestion Level:** ${congestionLevel}`);

      if (transactionStats.confirmation_time_blocks !== undefined) {
        const minutes = transactionStats.confirmation_time_blocks * 10;
        sections.push(
          `- **Est. Confirmation Time:** ~${transactionStats.confirmation_time_blocks} blocks (~${minutes} min)`
        );
      }
    } else {
      sections.push('\n## 📊 Mempool Status\n');
      sections.push('*Data unavailable*');
    }

    // Block Production
    if (difficultyStats) {
      sections.push('\n## ⏱️ Block Production\n');
      sections.push(
        `- **Blocks Until Adjustment:** ${difficultyStats.blocks_until_adjustment.toLocaleString()}`
      );

      if (difficultyStats.estimated_change_percent !== undefined) {
        const change = difficultyStats.estimated_change_percent;
        sections.push(
          `- **Expected Difficulty Change:** ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
        );

        const avgBlockTime = this.estimateAverageBlockTime(change);
        sections.push(`- **Estimated Avg Block Time:** ~${avgBlockTime.toFixed(1)} minutes`);
      }

      if (difficultyStats.estimated_adjustment_time) {
        const adjustmentDate = new Date(difficultyStats.estimated_adjustment_time);
        sections.push(
          `- **Next Adjustment:** ${adjustmentDate.toUTCString()} (${this.getTimeUntil(adjustmentDate)})`
        );
      }
    } else {
      sections.push('\n## ⏱️ Block Production\n');
      sections.push('*Data unavailable*');
    }

    // Historical Trend Analysis (if included)
    if (params.include_detailed_history && historyData && historyData.length > 0) {
      sections.push('\n## 📈 Historical Trend Analysis\n');

      const hoursToAnalyze = Math.min(params.history_hours ?? 24, historyData.length);
      const recentData = historyData.slice(0, hoursToAnalyze);

      const hashrates = recentData.map((d) => d.hashrate_ehs);
      const avgHashrate = hashrates.reduce((a, b) => a + b, 0) / hashrates.length;
      const maxHashrate = Math.max(...hashrates);
      const minHashrate = Math.min(...hashrates);

      sections.push(`- **Analysis Period:** Last ${hoursToAnalyze} hours`);
      sections.push(`- **Average Hashrate:** ${avgHashrate.toFixed(2)} EH/s`);
      sections.push(`- **Peak Hashrate:** ${maxHashrate.toFixed(2)} EH/s`);
      sections.push(`- **Lowest Hashrate:** ${minHashrate.toFixed(2)} EH/s`);
      sections.push(
        `- **Volatility:** ${(((maxHashrate - minHashrate) / avgHashrate) * 100).toFixed(2)}%`
      );
    }

    // Data Quality Note
    const missingEndpoints: string[] = [];
    if (!hashrateStats) {
      missingEndpoints.push('Hashrate Stats');
    }
    if (!difficultyStats) {
      missingEndpoints.push('Difficulty Stats');
    }
    if (!transactionStats) {
      missingEndpoints.push('Transaction Stats');
    }

    if (missingEndpoints.length > 0) {
      sections.push('\n## ⚠️ Data Quality Note\n');
      sections.push(
        `Some endpoints were unavailable: ${missingEndpoints.join(', ')}. ` +
          `Health score calculated with reduced confidence.`
      );
    }

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
  }

  /**
   * Get health status icon based on score
   */
  private getHealthStatusIcon(score: number): string {
    if (score >= 80) {
      return '🟢';
    }
    if (score >= 50) {
      return '🟡';
    }
    return '🔴';
  }

  /**
   * Get health status text based on score
   */
  private getHealthStatusText(score: number): string {
    if (score >= 80) {
      return 'Healthy';
    }
    if (score >= 50) {
      return 'Caution';
    }
    return 'Concern';
  }

  /**
   * Get trend indicator based on deviation
   */
  private getTrendIndicator(deviationPercent: number): string {
    if (deviationPercent > 5) {
      return '📈 Increasing';
    }
    if (deviationPercent < -5) {
      return '📉 Decreasing';
    }
    return '➡️ Stable';
  }

  /**
   * Get congestion level description
   */
  private getCongestionLevel(mempoolSize: number): string {
    if (mempoolSize < 5000) {
      return '🟢 Low';
    }
    if (mempoolSize < 20000) {
      return '🟡 Moderate';
    }
    if (mempoolSize < 50000) {
      return '🟠 High';
    }
    if (mempoolSize < 100000) {
      return '🔶 Very High';
    }
    return '🔴 Severe';
  }

  /**
   * Estimate average block time from difficulty change
   */
  private estimateAverageBlockTime(difficultyChangePercent: number): number {
    // If difficulty is increasing, blocks were coming faster
    // If difficulty is decreasing, blocks were coming slower
    const targetBlockTime = 10; // minutes
    const estimatedBlockTime = targetBlockTime / (1 + difficultyChangePercent / 100);
    return estimatedBlockTime;
  }

  /**
   * Get human-readable time until a future date
   */
  private getTimeUntil(futureDate: Date): string {
    const now = new Date();
    const diffMs = futureDate.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Past';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `~${diffDays}d ${diffHours}h`;
    }
    return `~${diffHours}h`;
  }

  /**
   * Handle errors and return MCP error response
   */
  private handleError(error: unknown): MCPToolResponse {
    if (error instanceof InsightsApiError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **API Error**: ${error.message}\n\nStatus: ${error.statusCode}\n\nPlease try again later or check the Braiins Insights API status.`,
          },
        ],
        isError: true,
      };
    }

    if (error instanceof NetworkError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Network Error**: Could not reach Braiins Insights API\n\nDetails: ${error.message}\n\nPlease check your internet connection.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `❌ **Unexpected Error**: ${error instanceof Error ? error.message : String(error)}\n\nPlease report this issue if it persists.`,
        },
      ],
      isError: true,
    };
  }
}
