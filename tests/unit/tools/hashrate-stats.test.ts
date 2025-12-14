/**
 * Unit tests for HashrateStatsTool
 *
 * Tests the braiins_hashrate_stats MCP tool in isolation with mocked API client.
 */

import { HashrateStatsTool } from '../../../src/tools/simple/hashrate-stats';
import { BraiinsInsightsHashrateStats } from '../../../src/types/insights-api';

/**
 * Mock API client for testing
 */
interface MockInsightsApiClient {
  getHashrateStats: jest.Mock;
}

/**
 * Custom error classes for testing
 */
class InsightsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'InsightsApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

describe('HashrateStatsTool', () => {
  let tool: HashrateStatsTool;
  let mockClient: MockInsightsApiClient;

  beforeEach(() => {
    mockClient = {
      getHashrateStats: jest.fn(),
    };

    tool = new HashrateStatsTool(mockClient as any);
  });

  describe('Metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_hashrate_stats');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('hashrate');
      expect(tool.description).toContain('network');
      expect(tool.description).toContain('Bitcoin');
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute()', () => {
    const mockStats: BraiinsInsightsHashrateStats = {
      avg_fees_per_block: 0.015,
      current_hashrate: 1094.42,
      current_hashrate_estimated: 1148.46,
      fees_percent: 0.48,
      hash_price: 0.038,
      hash_rate_30: 1075.4,
      hash_value: 4e-7,
      monthly_avg_hashrate_change_1_year: {
        relative: 0.03,
        absolute: 29.47665536,
      },
      rev_usd: 40809781.01,
    };

    it('should return formatted markdown on success', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      const response = await tool.execute({});

      expect(response.isError).toBe(false);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('1094.42 EH/s');
      expect(response.content[0].text).toContain('1148.46 EH/s');
      expect(response.content[0].text).toContain('1075.40 EH/s');
    });

    it('should format markdown with proper sections', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      const response = await tool.execute({});
      const markdown = response.content[0].text;

      expect(markdown).toContain('# 📊 Bitcoin Network Hashrate Statistics');
      expect(markdown).toContain('## Current Metrics');
      expect(markdown).toContain('## Mining Economics');
      expect(markdown).toContain('## Transaction Fees');
      expect(markdown).toContain('## 1-Year Trend');
      expect(markdown).toContain('*Data from');
    });

    it('should format large numbers correctly', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Currency formatting with thousands separators
      expect(markdown).toContain('40,809,781.01');

      // Hash price with 3 decimal places
      expect(markdown).toContain('$0.038');

      // Fees with 3 decimal places
      expect(markdown).toContain('0.015 BTC');
    });

    it('should format percent change with sign', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Positive change should have + sign
      expect(markdown).toContain('+3.00%');
    });

    it('should handle negative percent change', async () => {
      const negativeChangeStats = {
        ...mockStats,
        monthly_avg_hashrate_change_1_year: {
          relative: -0.05,
          absolute: -50,
        },
      };

      mockClient.getHashrateStats.mockResolvedValue(negativeChangeStats);

      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Negative change should have - sign
      expect(markdown).toContain('-5.00%');
    });

    it('should handle scientific notation values', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // hash_value is 4e-7, should be formatted in scientific notation
      expect(markdown).toMatch(/\$4\.\d+e-7/i);
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new InsightsApiError('Not Found', 404);
      mockClient.getHashrateStats.mockRejectedValue(apiError);

      const response = await tool.execute({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
      expect(response.content[0].text).toContain('API Error');
      expect(response.content[0].text).toContain('404');
      expect(response.content[0].text).toContain('Not Found');
    });

    it('should handle network errors gracefully', async () => {
      const netError = new NetworkError('Connection timeout');
      mockClient.getHashrateStats.mockRejectedValue(netError);

      const response = await tool.execute({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
      expect(response.content[0].text).toContain('Network Error');
      expect(response.content[0].text).toContain('Connection timeout');
      expect(response.content[0].text).toContain('internet connection');
    });

    it('should handle unknown errors gracefully', async () => {
      const unknownError = new Error('Something went wrong');
      mockClient.getHashrateStats.mockRejectedValue(unknownError);

      const response = await tool.execute({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
      expect(response.content[0].text).toContain('Unexpected Error');
      expect(response.content[0].text).toContain('Something went wrong');
    });

    it('should handle non-Error objects', async () => {
      mockClient.getHashrateStats.mockRejectedValue('String error');

      const response = await tool.execute({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
      expect(response.content[0].text).toContain('Unexpected Error');
      expect(response.content[0].text).toContain('String error');
    });

    it('should accept empty input object', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      const response = await tool.execute({});

      expect(response.isError).toBe(false);
      expect(mockClient.getHashrateStats).toHaveBeenCalledTimes(1);
    });

    it('should ignore any input parameters (no-op)', async () => {
      mockClient.getHashrateStats.mockResolvedValue(mockStats);

      // Even if parameters are passed, they should be ignored
      const response = await tool.execute({ page: 1, random: 'value' });

      expect(response.isError).toBe(false);
      expect(mockClient.getHashrateStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', async () => {
      const zeroStats: BraiinsInsightsHashrateStats = {
        avg_fees_per_block: 0,
        current_hashrate: 0,
        current_hashrate_estimated: 0,
        fees_percent: 0,
        hash_price: 0,
        hash_rate_30: 0,
        hash_value: 0,
        monthly_avg_hashrate_change_1_year: {
          relative: 0,
          absolute: 0,
        },
        rev_usd: 0,
      };

      mockClient.getHashrateStats.mockResolvedValue(zeroStats);

      const response = await tool.execute({});

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('0.00 EH/s');
      expect(response.content[0].text).toContain('$0.00');
    });

    it('should handle very large numbers', async () => {
      const largeStats: BraiinsInsightsHashrateStats = {
        avg_fees_per_block: 0.015,
        current_hashrate: 99999.99,
        current_hashrate_estimated: 99999.99,
        fees_percent: 0.48,
        hash_price: 0.038,
        hash_rate_30: 99999.99,
        hash_value: 4e-7,
        monthly_avg_hashrate_change_1_year: {
          relative: 0.03,
          absolute: 29.47665536,
        },
        rev_usd: 999999999.99,
      };

      mockClient.getHashrateStats.mockResolvedValue(largeStats);

      const response = await tool.execute({});

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('99999.99 EH/s');
      expect(response.content[0].text).toContain('999,999,999.99');
    });
  });
});
