/**
 * Unit tests for braiins_transaction_fees_history tool
 */

import { jest } from '@jest/globals';
import { TransactionFeesHistoryTool } from '../../../src/tools/historical/transaction-fees-history.js';
import { BraiinsInsightsTransactionFees } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getTransactionFeesHistory: jest.Mock } => ({
  getTransactionFeesHistory: jest.fn(),
});

// Sample valid response data
const SAMPLE_TX_FEES: BraiinsInsightsTransactionFees[] = [
  {
    date: '2025-12-15',
    avg_fee_btc: 0.00015,
  },
  {
    date: '2025-12-14',
    avg_fee_btc: 0.00012,
  },
  {
    date: '2025-12-13',
    avg_fee_btc: 0.0001,
  },
  {
    date: '2025-12-12',
    avg_fee_btc: 0.00018,
  },
];

describe('TransactionFeesHistoryTool', () => {
  let tool: TransactionFeesHistoryTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new TransactionFeesHistoryTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_transaction_fees_history');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('transaction');
      expect(tool.description).toContain('fee');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have optional limit parameter in schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format transaction fees history successfully', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result = await tool.execute({});

      expect(mockApiClient.getTransactionFeesHistory).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Transaction Fees History');
      expect(markdown).toContain('Summary Statistics');
      expect(markdown).toContain('Fee Market Context');
    });

    it('should calculate summary statistics correctly', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Current Avg Fee:');
      expect(markdown).toContain('Average Fee:');
      expect(markdown).toContain('Highest Avg Fee:');
      expect(markdown).toContain('Lowest Avg Fee:');
      expect(markdown).toContain('Period Change:');
    });

    it('should display fees in both BTC and satoshis', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should have columns for both BTC and sats
      expect(markdown).toContain('Avg Fee (BTC)');
      expect(markdown).toContain('Avg Fee (sats)');
    });

    it('should show fee market context - normal fees', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should have market context interpretation
      expect(markdown).toContain('Fee Market Context');
      expect(markdown).toMatch(/Fee market is (elevated|low|normal)/);
    });

    it('should show elevated message when fees are high', async () => {
      const highFees: BraiinsInsightsTransactionFees[] = [
        { date: '2025-12-15', avg_fee_btc: 0.001 }, // Very high
        { date: '2025-12-14', avg_fee_btc: 0.0001 },
        { date: '2025-12-13', avg_fee_btc: 0.00005 },
      ];
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(highFees);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('elevated');
    });

    it('should show low message when fees are low', async () => {
      const lowFees: BraiinsInsightsTransactionFees[] = [
        { date: '2025-12-15', avg_fee_btc: 0.00001 }, // Very low
        { date: '2025-12-14', avg_fee_btc: 0.0001 },
        { date: '2025-12-13', avg_fee_btc: 0.0002 },
      ];
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(lowFees);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('low');
    });

    it('should calculate daily change correctly in table', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should have Daily Change column
      expect(markdown).toContain('Daily Change');
      // Should show percentage changes
      expect(markdown).toMatch(/[+-]\d+\.\d+%/);
    });

    it('should apply limit parameter correctly', async () => {
      const manyDataPoints = Array.from({ length: 60 }, (_, i) => ({
        date: `2025-12-${String((i % 30) + 1).padStart(2, '0')}`,
        avg_fee_btc: 0.0001 + i * 0.00001,
      }));
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(manyDataPoints);

      const result = await tool.execute({ limit: 15 });
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Data Points:** 15');
      expect(markdown).toContain('of 60 total');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty data array', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue([]);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No Data Available');
    });

    it('should handle single data point', async () => {
      const singlePoint: BraiinsInsightsTransactionFees[] = [
        { date: '2025-12-15', avg_fee_btc: 0.00015 },
      ];
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(singlePoint);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('**Data Points:** 1');
    });

    it('should handle very small fee values with scientific notation', async () => {
      const smallFees: BraiinsInsightsTransactionFees[] = [
        { date: '2025-12-15', avg_fee_btc: 0.00000001 },
        { date: '2025-12-14', avg_fee_btc: 0.00000002 },
      ];
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(smallFees);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Very small values should use scientific notation
      expect(markdown).toMatch(/\d\.\d+e[+-]\d+/i);
    });

    it('should handle null/undefined input', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result1 = await tool.execute(null);
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute(undefined);
      expect(result2.isError).toBe(false);
    });

    it('should handle zero fee values gracefully', async () => {
      const zeroFees: BraiinsInsightsTransactionFees[] = [
        { date: '2025-12-15', avg_fee_btc: 0 },
        { date: '2025-12-14', avg_fee_btc: 0 },
      ];
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(zeroFees);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
    });

    it('should handle large data arrays without table overflow', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        avg_fee_btc: 0.0001 + i * 0.000001,
      }));
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(largeDataset);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show limited rows in table
      expect(markdown).toContain('Showing 10 of 100 data points');
    });

    it('should ignore invalid limit values', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result1 = await tool.execute({ limit: -5 });
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute({ limit: 500 });
      expect(result2.isError).toBe(false);

      const result3 = await tool.execute({ limit: 'invalid' });
      expect(result3.isError).toBe(false);
    });

    it('should show N/A for first entry daily change', async () => {
      mockApiClient.getTransactionFeesHistory.mockResolvedValue(SAMPLE_TX_FEES);

      const result = await tool.execute({ limit: 1 });
      const markdown = result.content[0].text;

      // The last entry in the table should show N/A for change
      expect(markdown).toContain('N/A');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'Internal server error',
        500,
        '/v1.0/transaction-fees-history'
      );
      mockApiClient.getTransactionFeesHistory.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('500');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('ECONNREFUSED');
      mockApiClient.getTransactionFeesHistory.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('ECONNREFUSED');
    });

    it('should handle unexpected errors', async () => {
      mockApiClient.getTransactionFeesHistory.mockRejectedValue(new Error('Unknown error'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });

    it('should handle non-Error thrown values', async () => {
      mockApiClient.getTransactionFeesHistory.mockRejectedValue('string error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('string error');
    });
  });
});
