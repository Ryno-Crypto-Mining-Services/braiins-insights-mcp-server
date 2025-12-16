/**
 * Unit tests for braiins_hashrate_value_history tool
 */

import { jest } from '@jest/globals';
import { HashrateValueHistoryTool } from '../../../src/tools/historical/hashrate-value-history.js';
import { BraiinsInsightsHashrateValue } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getHashrateValueHistory: jest.Mock } => ({
  getHashrateValueHistory: jest.fn(),
});

// Sample valid response data
const SAMPLE_HASHRATE_VALUE: BraiinsInsightsHashrateValue[] = [
  {
    date: '2025-12-15',
    hash_value_usd_per_th_day: 0.0385,
  },
  {
    date: '2025-12-14',
    hash_value_usd_per_th_day: 0.0372,
  },
  {
    date: '2025-12-13',
    hash_value_usd_per_th_day: 0.0368,
  },
  {
    date: '2025-12-12',
    hash_value_usd_per_th_day: 0.039,
  },
];

describe('HashrateValueHistoryTool', () => {
  let tool: HashrateValueHistoryTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new HashrateValueHistoryTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_hashrate_value_history');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('hashrate');
      expect(tool.description).toContain('value');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have optional limit parameter in schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format hashrate value history successfully', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result = await tool.execute({});

      expect(mockApiClient.getHashrateValueHistory).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Hashrate Value History');
      expect(markdown).toContain('Summary Statistics');
      expect(markdown).toContain('Mining Economics Context');
    });

    it('should calculate summary statistics correctly', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Current Hash Value:');
      expect(markdown).toContain('Average Hash Value:');
      expect(markdown).toContain('Peak Hash Value:');
      expect(markdown).toContain('Lowest Hash Value:');
      expect(markdown).toContain('Period Change:');
    });

    it('should display hash value with appropriate precision', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should format as dollar values
      expect(markdown).toContain('/TH/day');
    });

    it('should show mining economics context', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should have economics interpretation
      expect(markdown).toContain('Mining Economics Context');
      expect(markdown).toMatch(/hash value (is above|is below) average/);
    });

    it('should show above average message when current > average', async () => {
      const highCurrentValue: BraiinsInsightsHashrateValue[] = [
        { date: '2025-12-15', hash_value_usd_per_th_day: 0.05 },
        { date: '2025-12-14', hash_value_usd_per_th_day: 0.03 },
        { date: '2025-12-13', hash_value_usd_per_th_day: 0.02 },
      ];
      mockApiClient.getHashrateValueHistory.mockResolvedValue(highCurrentValue);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('above average');
    });

    it('should show below average message when current < average', async () => {
      const lowCurrentValue: BraiinsInsightsHashrateValue[] = [
        { date: '2025-12-15', hash_value_usd_per_th_day: 0.02 },
        { date: '2025-12-14', hash_value_usd_per_th_day: 0.05 },
        { date: '2025-12-13', hash_value_usd_per_th_day: 0.06 },
      ];
      mockApiClient.getHashrateValueHistory.mockResolvedValue(lowCurrentValue);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('below average');
    });

    it('should calculate daily change correctly in table', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should have Daily Change column
      expect(markdown).toContain('Daily Change');
      // Should show percentage changes
      expect(markdown).toMatch(/[+-]\d+\.\d+%/);
    });

    it('should apply limit parameter correctly', async () => {
      const manyDataPoints = Array.from({ length: 50 }, (_, i) => ({
        date: `2025-12-${String(15 - i).padStart(2, '0')}`,
        hash_value_usd_per_th_day: 0.035 + i * 0.001,
      }));
      mockApiClient.getHashrateValueHistory.mockResolvedValue(manyDataPoints);

      const result = await tool.execute({ limit: 10 });
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Data Points:** 10');
      expect(markdown).toContain('of 50 total');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty data array', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue([]);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No Data Available');
    });

    it('should handle single data point', async () => {
      const singlePoint: BraiinsInsightsHashrateValue[] = [
        { date: '2025-12-15', hash_value_usd_per_th_day: 0.0385 },
      ];
      mockApiClient.getHashrateValueHistory.mockResolvedValue(singlePoint);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('**Data Points:** 1');
    });

    it('should handle very small hash values with scientific notation', async () => {
      const smallValues: BraiinsInsightsHashrateValue[] = [
        { date: '2025-12-15', hash_value_usd_per_th_day: 0.0000004 },
        { date: '2025-12-14', hash_value_usd_per_th_day: 0.0000003 },
      ];
      mockApiClient.getHashrateValueHistory.mockResolvedValue(smallValues);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Very small values should use scientific notation
      expect(markdown).toMatch(/\d\.\d+e[+-]\d+/i);
    });

    it('should handle null/undefined input', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result1 = await tool.execute(null);
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute(undefined);
      expect(result2.isError).toBe(false);
    });

    it('should handle zero values gracefully', async () => {
      const zeroValues: BraiinsInsightsHashrateValue[] = [
        { date: '2025-12-15', hash_value_usd_per_th_day: 0 },
        { date: '2025-12-14', hash_value_usd_per_th_day: 0 },
      ];
      mockApiClient.getHashrateValueHistory.mockResolvedValue(zeroValues);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
    });

    it('should handle large data arrays without table overflow', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        hash_value_usd_per_th_day: 0.03 + i * 0.0001,
      }));
      mockApiClient.getHashrateValueHistory.mockResolvedValue(largeDataset);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show limited rows in table
      expect(markdown).toContain('Showing 10 of 100 data points');
    });

    it('should ignore invalid limit values', async () => {
      mockApiClient.getHashrateValueHistory.mockResolvedValue(SAMPLE_HASHRATE_VALUE);

      const result1 = await tool.execute({ limit: -5 });
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute({ limit: 500 });
      expect(result2.isError).toBe(false);

      const result3 = await tool.execute({ limit: 'invalid' });
      expect(result3.isError).toBe(false);
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'Service unavailable',
        503,
        '/v1.0/hashrate-value-history'
      );
      mockApiClient.getHashrateValueHistory.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('503');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('Socket hang up');
      mockApiClient.getHashrateValueHistory.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('Socket hang up');
    });

    it('should handle unexpected errors', async () => {
      mockApiClient.getHashrateValueHistory.mockRejectedValue(new Error('Unknown error'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });

    it('should handle non-Error thrown values', async () => {
      mockApiClient.getHashrateValueHistory.mockRejectedValue('string error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('string error');
    });
  });
});
