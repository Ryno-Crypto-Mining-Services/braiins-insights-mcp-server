/**
 * Unit tests for braiins_transaction_stats tool
 */

import { jest } from '@jest/globals';
import { TransactionStatsTool } from '../../../src/tools/simple/transaction-stats.js';
import { BraiinsInsightsTransactionStats } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getTransactionStats: jest.Mock } => ({
  getTransactionStats: jest.fn(),
});

// Sample valid response data
const SAMPLE_TX_STATS: BraiinsInsightsTransactionStats = {
  mempool_size: 12500,
  avg_fee_sat_per_byte: 15.5,
  confirmation_time_blocks: 2,
  tx_count_24h: 350000,
};

const SAMPLE_TX_STATS_LOW_CONGESTION: BraiinsInsightsTransactionStats = {
  mempool_size: 2000,
  avg_fee_sat_per_byte: 3.2,
  confirmation_time_blocks: 1,
  tx_count_24h: 280000,
};

const SAMPLE_TX_STATS_HIGH_CONGESTION: BraiinsInsightsTransactionStats = {
  mempool_size: 120000,
  avg_fee_sat_per_byte: 75.8,
  confirmation_time_blocks: 6,
  tx_count_24h: 400000,
};

describe('TransactionStatsTool', () => {
  let tool: TransactionStatsTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new TransactionStatsTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_transaction_stats');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('transaction');
      expect(tool.description).toContain('mempool');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format transaction stats successfully', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});

      expect(mockApiClient.getTransactionStats).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Transaction Statistics');
      expect(markdown).toContain('Mempool Metrics');
    });

    it('should display mempool size with thousands separator', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('12,500'); // Mempool size formatted
    });

    it('should display average fee with 2 decimals', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('15.50 sat/vB');
    });

    it('should display confirmation time in blocks and minutes', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('~2 blocks');
      expect(markdown).toContain('~20 minutes');
    });

    it('should display 24h transaction count when available', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Network Activity (24h)');
      expect(markdown).toContain('350,000'); // tx count formatted
    });

    it('should calculate average tx per block', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // 350000 / 144 ≈ 2431
      expect(markdown).toContain('**Average Tx/Block:** 2431');
    });
  });

  describe('mempool congestion indicators', () => {
    it('should show low congestion indicator for small mempool', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS_LOW_CONGESTION);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅ (Low congestion)');
    });

    it('should show moderate congestion indicator for medium mempool', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ (Moderate congestion)');
    });

    it('should show very high congestion indicator for large mempool', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS_HIGH_CONGESTION);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('🔴 (Very high congestion)');
    });
  });

  describe('fee level indicators', () => {
    it('should show low fees indicator for cheap fees', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS_LOW_CONGESTION);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅ (Low fees)');
    });

    it('should show moderate fees indicator for average fees', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ (Moderate fees)');
    });

    it('should show very high fees indicator for expensive fees', async () => {
      mockApiClient.getTransactionStats.mockResolvedValue(SAMPLE_TX_STATS_HIGH_CONGESTION);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('🔴 (Very high fees)');
    });
  });

  describe('confirmation time formatting', () => {
    it('should format short confirmation time in minutes', async () => {
      const statsShortConfirmation: BraiinsInsightsTransactionStats = {
        ...SAMPLE_TX_STATS,
        confirmation_time_blocks: 3,
      };
      mockApiClient.getTransactionStats.mockResolvedValue(statsShortConfirmation);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('~3 blocks');
      expect(markdown).toContain('~30 minutes');
    });

    it('should format long confirmation time in hours', async () => {
      const statsLongConfirmation: BraiinsInsightsTransactionStats = {
        ...SAMPLE_TX_STATS,
        confirmation_time_blocks: 12,
      };
      mockApiClient.getTransactionStats.mockResolvedValue(statsLongConfirmation);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('~12 blocks');
      expect(markdown).toContain('~2.0 hours');
    });

    it('should handle missing confirmation_time_blocks', async () => {
      const statsNoConfirmation: BraiinsInsightsTransactionStats = {
        mempool_size: 12500,
        avg_fee_sat_per_byte: 15.5,
        tx_count_24h: 350000,
      };
      mockApiClient.getTransactionStats.mockResolvedValue(statsNoConfirmation);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).not.toContain('Estimated Confirmation Time:');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle missing tx_count_24h', async () => {
      const statsNoTxCount: BraiinsInsightsTransactionStats = {
        mempool_size: 12500,
        avg_fee_sat_per_byte: 15.5,
        confirmation_time_blocks: 2,
      };
      mockApiClient.getTransactionStats.mockResolvedValue(statsNoTxCount);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).not.toContain('Network Activity (24h)');
    });

    it('should handle minimal transaction stats', async () => {
      const minimalStats: BraiinsInsightsTransactionStats = {
        mempool_size: 1000,
        avg_fee_sat_per_byte: 1.5,
      };
      mockApiClient.getTransactionStats.mockResolvedValue(minimalStats);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('**Mempool Size:** 1,000');
      expect(markdown).toContain('1.50 sat/vB');
    });

    it('should handle very large transaction counts', async () => {
      const statsLargeTxCount: BraiinsInsightsTransactionStats = {
        mempool_size: 12500,
        avg_fee_sat_per_byte: 15.5,
        tx_count_24h: 1250000,
      };
      mockApiClient.getTransactionStats.mockResolvedValue(statsLargeTxCount);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('1,250,000'); // Formatted with commas
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API rate limit exceeded', 429, '/v1.0/transaction-stats');
      mockApiClient.getTransactionStats.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getTransactionStats.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('DNS lookup failed');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockApiClient.getTransactionStats.mockRejectedValue(unexpectedError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });
  });
});
