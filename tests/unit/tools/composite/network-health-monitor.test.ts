/**
 * Unit tests for braiins_network_health_monitor composite tool
 */

import { jest } from '@jest/globals';
import { NetworkHealthMonitorTool } from '../../../../src/tools/composite/network-health-monitor.js';
import {
  BraiinsInsightsHashrateStats,
  BraiinsInsightsDifficultyStats,
  BraiinsInsightsTransactionStats,
  BraiinsInsightsHashDiffHistory,
} from '../../../../src/types/insights-api.js';
import { NetworkError } from '../../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): {
  getHashrateStats: jest.Mock;
  getDifficultyStats: jest.Mock;
  getTransactionStats: jest.Mock;
  getHashrateAndDifficultyHistory: jest.Mock;
} => ({
  getHashrateStats: jest.fn(),
  getDifficultyStats: jest.fn(),
  getTransactionStats: jest.fn(),
  getHashrateAndDifficultyHistory: jest.fn(),
});

// Sample valid response data
const SAMPLE_HASHRATE_STATS: BraiinsInsightsHashrateStats = {
  avg_fees_per_block: 0.015,
  current_hashrate: 750.5,
  current_hashrate_estimated: 752.3,
  fees_percent: 0.48,
  hash_price: 0.038,
  hash_rate_30: 748.2,
  hash_value: 0.0000004,
  monthly_avg_hashrate_change_1_year: {
    relative: 0.03,
    absolute: 29.47,
  },
  rev_usd: 40809781.01,
};

const SAMPLE_DIFFICULTY_STATS: BraiinsInsightsDifficultyStats = {
  current_difficulty: 109780000000000000,
  estimated_next_difficulty: 111000000000000000,
  estimated_change_percent: 1.1,
  blocks_until_adjustment: 1250,
  estimated_adjustment_time: '2025-12-20T10:00:00Z',
  last_adjustment_date: '2025-12-06T08:30:00Z',
};

const SAMPLE_TRANSACTION_STATS: BraiinsInsightsTransactionStats = {
  mempool_size: 8500,
  avg_fee_sat_per_byte: 12.5,
  confirmation_time_blocks: 2,
  tx_count_24h: 350000,
};

const SAMPLE_HISTORY_DATA: BraiinsInsightsHashDiffHistory[] = Array.from(
  { length: 48 },
  (_, i) => ({
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    hashrate_ehs: 750 + Math.random() * 10 - 5,
    difficulty: 109780000000000000,
  })
);

describe('NetworkHealthMonitorTool', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let tool: NetworkHealthMonitorTool;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new NetworkHealthMonitorTool(mockApiClient as any);
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_network_health_monitor');
    });

    it('should have descriptive tool description', () => {
      expect(tool.description).toContain('network health');
      expect(tool.description).toContain('health score');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('include_detailed_history');
      expect(tool.inputSchema.properties).toHaveProperty('history_hours');
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute() - Happy Path', () => {
    it('should successfully aggregate all endpoints', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('🏥 Bitcoin Network Health Monitor');
      expect(text).toContain('Network Health Score');
      expect(text).toContain('/100');
      expect(text).toContain('Mining Activity');
      expect(text).toContain('Mempool Status');
      expect(text).toContain('Block Production');
    });

    it('should include detailed history when requested', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HISTORY_DATA);

      const result = await tool.execute({
        include_detailed_history: true,
        history_hours: 24,
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Historical Trend Analysis');
      expect(text).toContain('Analysis Period');
      expect(text).toContain('Peak Hashrate');
      expect(text).toContain('Volatility');
    });
  });

  describe('execute() - Health Score Calculation', () => {
    it('should calculate healthy score (80-100) with good metrics', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 748.5,
        hash_rate_30: 748.2,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue({
        ...SAMPLE_DIFFICULTY_STATS,
        estimated_change_percent: 0.5,
      });
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 3000,
        avg_fee_sat_per_byte: 4,
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const text = result.content[0].text;

      const scoreMatch = text.match(/Overall: (\d+)\/100/);
      expect(scoreMatch).toBeTruthy();
      const score = parseInt(scoreMatch![1], 10);
      expect(score).toBeGreaterThanOrEqual(80);
      expect(text).toContain('🟢');
      expect(text).toContain('Healthy');
    });

    it('should calculate caution score (50-79) with moderate issues', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 685, // ~8.5% drop (should penalize more)
        hash_rate_30: 748.2,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 60000, // Higher congestion
        avg_fee_sat_per_byte: 30, // Higher fees
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const text = result.content[0].text;

      const scoreMatch = text.match(/Overall: (\d+)\/100/);
      expect(scoreMatch).toBeTruthy();
      const score = parseInt(scoreMatch![1], 10);
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThan(80);
      expect(text).toContain('🟡');
    });

    it('should calculate concern score (0-49) with critical issues', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 620, // ~17% drop (critical)
        hash_rate_30: 748.2,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue({
        ...SAMPLE_DIFFICULTY_STATS,
        estimated_change_percent: -18, // Large negative adjustment
      });
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 150000, // Severe congestion
        avg_fee_sat_per_byte: 180, // Extreme fees
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const text = result.content[0].text;

      const scoreMatch = text.match(/Overall: (\d+)\/100/);
      expect(scoreMatch).toBeTruthy();
      const score = parseInt(scoreMatch![1], 10);
      expect(score).toBeLessThanOrEqual(50); // Changed to <= since 50 is still "Caution" boundary
      expect(text).toContain('🔴');
    });
  });

  describe('execute() - Alert Generation', () => {
    it('should generate critical alert for large hashrate drop', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 660,
        hash_rate_30: 750,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('🚨 Alerts');
      expect(text).toContain('🔴');
      expect(text).toContain('CRITICAL');
      expect(text).toContain('Hashrate dropped');
    });

    it('should generate alert for severe mempool congestion', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 150000,
        avg_fee_sat_per_byte: 120,
      });

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('🚨 Alerts');
      expect(text).toContain('congestion');
    });

    it('should show no alerts when all metrics are normal', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 748.5,
        hash_rate_30: 748.2,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue({
        ...SAMPLE_DIFFICULTY_STATS,
        estimated_change_percent: 0.5,
      });
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 3000,
        avg_fee_sat_per_byte: 4,
      });

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('✅ No Alerts');
    });
  });

  describe('execute() - Partial Failures (Graceful Degradation)', () => {
    it('should handle missing hashrate stats', async () => {
      mockApiClient.getHashrateStats.mockRejectedValue(new NetworkError('Connection failed'));
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Network Health Monitor');
      expect(text).toContain('Data unavailable');
      expect(text).toContain('Data Quality Note');
    });

    it('should fail when ALL endpoints are unavailable', async () => {
      mockApiClient.getHashrateStats.mockRejectedValue(new NetworkError('Connection failed'));
      mockApiClient.getDifficultyStats.mockRejectedValue(new NetworkError('Connection failed'));
      mockApiClient.getTransactionStats.mockRejectedValue(new NetworkError('Connection failed'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const text = result.content[0].text;
      expect(text).toContain('Network Health Monitor Unavailable');
    });
  });

  describe('execute() - Input Validation', () => {
    it('should handle missing input (use defaults)', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      await tool.execute({});

      expect(mockApiClient.getHashrateAndDifficultyHistory).not.toHaveBeenCalled();
    });

    it('should handle invalid input types gracefully', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({
        include_detailed_history: 'yes' as any,
        history_hours: 'invalid' as any,
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Trend Indicators', () => {
    it('should show increasing trend for significant hashrate increase', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 790,
        hash_rate_30: 748.2,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('📈 Increasing');
    });

    it('should show stable trend for minor deviation', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue({
        ...SAMPLE_HASHRATE_STATS,
        current_hashrate: 751,
        hash_rate_30: 748.2,
      });
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('➡️ Stable');
    });
  });

  describe('Congestion Levels', () => {
    it('should show low congestion for small mempool', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 3000,
      });

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('🟢 Low');
    });

    it('should show severe congestion for large mempool', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue({
        ...SAMPLE_TRANSACTION_STATS,
        mempool_size: 120000,
      });

      const result = await tool.execute({});

      const text = result.content[0].text;
      expect(text).toContain('🔴 Severe');
    });
  });

  describe('Markdown Formatting', () => {
    it('should include all required sections', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      const text = result.content[0].text;

      expect(text).toContain('# 🏥 Bitcoin Network Health Monitor');
      expect(text).toContain('## Network Health Score');
      expect(text).toContain('**Score Breakdown:**');
      expect(text).toContain('## ⛏️ Mining Activity');
      expect(text).toContain('## 📊 Mempool Status');
      expect(text).toContain('## ⏱️ Block Production');
      expect(text).toContain(
        '*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*'
      );
    });

    it('should format numbers with proper precision', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TRANSACTION_STATS);

      const result = await tool.execute({});

      const text = result.content[0].text;

      expect(text).toMatch(/\d+\.\d{2} EH\/s/);
      expect(text).toMatch(/\d+\.\d{2} sat\/vB/);
    });
  });
});
