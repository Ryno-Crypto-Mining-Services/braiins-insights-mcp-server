/**
 * Unit tests for braiins_hashrate_stats tool
 */

import { jest } from '@jest/globals';
import { HashrateStatsTool } from '../../../src/tools/simple/hashrate-stats.js';
import { BraiinsInsightsHashrateStats } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = () => ({
  getHashrateStats: jest.fn(),
});

// Sample valid response data
const SAMPLE_HASHRATE_STATS: BraiinsInsightsHashrateStats = {
  avg_fees_per_block: 0.016,
  current_hashrate: 1001.23,
  current_hashrate_estimated: 1146.5,
  fees_percent: 0.5,
  hash_price: 0.039,
  hash_rate_30: 1074.37,
  hash_value: 4e-7,
  monthly_avg_hashrate_change_1_year: {
    relative: 0.03,
    absolute: 29.47665536,
  },
  rev_usd: 40872449.1,
};

describe('HashrateStatsTool', () => {
  let tool: HashrateStatsTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new HashrateStatsTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_hashrate_stats');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('hashrate');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format hashrate stats successfully', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);

      const result = await tool.execute({});

      expect(mockApiClient.getHashrateStats).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Network Hashrate Statistics');
      expect(markdown).toContain('1001.23');
      expect(markdown).toContain('1146.50');
      expect(markdown).toContain('1074.37');
    });

    it('should format hash price correctly', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('$0.039');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API rate limit exceeded', 429, '/v1.0/hashrate-stats');
      mockApiClient.getHashrateStats.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getHashrateStats.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
    });
  });
});
