/**
 * Unit tests for braiins_daily_revenue_history tool
 */

import { jest } from '@jest/globals';
import { DailyRevenueHistoryTool } from '../../../src/tools/historical/daily-revenue-history.js';
import { BraiinsInsightsDailyRevenue } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getDailyRevenueHistory: jest.Mock } => ({
  getDailyRevenueHistory: jest.fn(),
});

// Sample valid response data
const SAMPLE_DAILY_REVENUE: BraiinsInsightsDailyRevenue[] = [
  {
    date: '2025-12-15',
    revenue_usd: 41000000,
    block_rewards_btc: 450,
    fees_btc: 15,
  },
  {
    date: '2025-12-14',
    revenue_usd: 40500000,
    block_rewards_btc: 450,
    fees_btc: 12,
  },
  {
    date: '2025-12-13',
    revenue_usd: 39800000,
    block_rewards_btc: 450,
    fees_btc: 10,
  },
];

describe('DailyRevenueHistoryTool', () => {
  let tool: DailyRevenueHistoryTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new DailyRevenueHistoryTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_daily_revenue_history');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('daily');
      expect(tool.description).toContain('revenue');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have optional limit parameter in schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format daily revenue history successfully', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result = await tool.execute({});

      expect(mockApiClient.getDailyRevenueHistory).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Mining Daily Revenue History');
      expect(markdown).toContain('Summary Statistics');
      expect(markdown).toContain('Recent Daily Revenue');
    });

    it('should calculate and display summary statistics', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Data Points:**');
      expect(markdown).toContain('Average Daily Revenue:');
      expect(markdown).toContain('Highest Daily Revenue:');
      expect(markdown).toContain('Lowest Daily Revenue:');
    });

    it('should display date range in summary', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Date Range:');
      expect(markdown).toContain('2025-12-13');
      expect(markdown).toContain('2025-12-15');
    });

    it('should format revenue in USD correctly', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show formatted currency with commas
      expect(markdown).toMatch(/\$[\d,]+\.\d{2}/);
    });

    it('should display BTC revenue when available', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show BTC with ₿ symbol
      expect(markdown).toContain('₿');
    });

    it('should apply limit parameter correctly', async () => {
      const manyDataPoints = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-12-${String(15 - i).padStart(2, '0')}`,
        revenue_usd: 40000000 + i * 100000,
        block_rewards_btc: 450,
        fees_btc: 10 + i,
      }));
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(manyDataPoints);

      const result = await tool.execute({ limit: 5 });
      const markdown = result.content[0].text;

      // Summary should show limited data points
      expect(markdown).toContain('**Data Points:** 5');
      expect(markdown).toContain('of 30 total');
    });

    it('should handle limit at boundary values', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result1 = await tool.execute({ limit: 1 });
      expect(result1.isError).toBe(false);
      expect(result1.content[0].text).toContain('**Data Points:** 1');

      const result365 = await tool.execute({ limit: 365 });
      expect(result365.isError).toBe(false);
    });

    it('should ignore invalid limit values', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      // Invalid limit (negative) should be ignored
      const result1 = await tool.execute({ limit: -5 });
      expect(result1.isError).toBe(false);
      expect(result1.content[0].text).toContain('**Data Points:** 3');

      // Invalid limit (too high) should be ignored
      const result2 = await tool.execute({ limit: 500 });
      expect(result2.isError).toBe(false);
      expect(result2.content[0].text).toContain('**Data Points:** 3');

      // Invalid limit type should be ignored
      const result3 = await tool.execute({ limit: 'abc' });
      expect(result3.isError).toBe(false);
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty data array', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue([]);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No Data Available');
    });

    it('should handle missing BTC fields gracefully', async () => {
      const dataWithoutBtc: BraiinsInsightsDailyRevenue[] = [
        {
          date: '2025-12-15',
          revenue_usd: 41000000,
          // block_rewards_btc and fees_btc are undefined
        },
      ];
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(dataWithoutBtc);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('N/A');
    });

    it('should handle null/undefined input', async () => {
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(SAMPLE_DAILY_REVENUE);

      const result1 = await tool.execute(null);
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute(undefined);
      expect(result2.isError).toBe(false);
    });

    it('should handle large data arrays without table overflow', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        revenue_usd: 40000000 + i * 10000,
        block_rewards_btc: 450,
        fees_btc: 10,
      }));
      mockApiClient.getDailyRevenueHistory.mockResolvedValue(largeDataset);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show limited rows in table
      expect(markdown).toContain('Showing 10 of 100 data points');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'API rate limit exceeded',
        429,
        '/v1.0/daily-revenue-history'
      );
      mockApiClient.getDailyRevenueHistory.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getDailyRevenueHistory.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('DNS lookup failed');
    });

    it('should handle unexpected errors', async () => {
      mockApiClient.getDailyRevenueHistory.mockRejectedValue(new Error('Unknown error'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });

    it('should handle non-Error thrown values', async () => {
      mockApiClient.getDailyRevenueHistory.mockRejectedValue('string error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('string error');
    });
  });
});
