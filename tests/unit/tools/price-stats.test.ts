/**
 * Unit tests for braiins_price_stats tool
 */

import { jest } from '@jest/globals';
import { PriceStatsTool } from '../../../src/tools/simple/price-stats.js';
import { BraiinsInsightsPriceStats } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getPriceStats: jest.Mock } => ({
  getPriceStats: jest.fn(),
});

// Sample valid response data
const SAMPLE_PRICE_STATS: BraiinsInsightsPriceStats = {
  current_price_usd: 89163.0,
  price_change_24h_percent: -1.15,
  market_cap_usd: 1750000000000,
  volume_24h_usd: 45000000000,
};

const SAMPLE_PRICE_STATS_POSITIVE: BraiinsInsightsPriceStats = {
  current_price_usd: 45000.5,
  price_change_24h_percent: 2.34,
  market_cap_usd: 880000000000,
  volume_24h_usd: 35000000000,
};

const SAMPLE_PRICE_STATS_ZERO: BraiinsInsightsPriceStats = {
  current_price_usd: 50000.0,
  price_change_24h_percent: 0,
  market_cap_usd: 980000000000,
};

describe('PriceStatsTool', () => {
  let tool: PriceStatsTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new PriceStatsTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_price_stats');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('price');
      expect(tool.description).toContain('Bitcoin');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format price stats successfully', async () => {
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);

      const result = await tool.execute({});

      expect(mockApiClient.getPriceStats).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Price Statistics');
      expect(markdown).toContain('$89,163.00');
      expect(markdown).toContain('-1.15%');
    });

    it('should format currency with thousands separators', async () => {
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should have comma separator for thousands
      expect(markdown).toContain('$89,163.00');
    });

    it('should display positive price change with + prefix', async () => {
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS_POSITIVE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('+2.34%');
      expect(markdown).toContain('📈'); // Upward trend indicator
    });

    it('should display negative price change with - prefix', async () => {
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('-1.15%');
      expect(markdown).toContain('📉'); // Downward trend indicator
    });

    it('should handle zero price change', async () => {
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS_ZERO);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('+0.00%');
      expect(markdown).toContain('➡️'); // No change indicator
    });

    it('should format timestamp to human-readable format', async () => {
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should contain formatted date (e.g., "Sat, 14 Dec 2025")
      expect(markdown).toMatch(/\w{3},\s+\d{1,2}\s+\w{3}\s+\d{4}/);
    });
  });

  describe('execute - edge cases', () => {
    it('should handle very large price values', async () => {
      const largePrice: BraiinsInsightsPriceStats = {
        current_price_usd: 1234567.89,
        price_change_24h_percent: 5.67,
        market_cap_usd: 24000000000000,
      };
      mockApiClient.getPriceStats.mockResolvedValue(largePrice);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('$1,234,567.89');
    });

    it('should handle very small price changes', async () => {
      const smallChange: BraiinsInsightsPriceStats = {
        current_price_usd: 50000.0,
        price_change_24h_percent: 0.01,
        market_cap_usd: 980000000000,
      };
      mockApiClient.getPriceStats.mockResolvedValue(smallChange);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('+0.01%');
    });

    it('should handle large negative price changes', async () => {
      const largeNegative: BraiinsInsightsPriceStats = {
        current_price_usd: 30000.0,
        price_change_24h_percent: -15.5,
        market_cap_usd: 588000000000,
      };
      mockApiClient.getPriceStats.mockResolvedValue(largeNegative);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('-15.50%');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API rate limit exceeded', 429, '/v1.0/price-stats');
      mockApiClient.getPriceStats.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getPriceStats.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unknown error occurred');
      mockApiClient.getPriceStats.mockRejectedValue(unexpectedError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('Unknown error occurred');
    });

    it('should handle non-Error objects', async () => {
      mockApiClient.getPriceStats.mockRejectedValue('String error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('String error');
    });
  });
});
