/**
 * Unit tests for braiins_pool_stats tool
 */

import { jest } from '@jest/globals';
import { PoolStatsTool } from '../../../src/tools/simple/pool-stats.js';
import { BraiinsInsightsPoolStats } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getPoolStats: jest.Mock } => ({
  getPoolStats: jest.fn(),
});

// Sample valid response data
const SAMPLE_POOL_STATS: BraiinsInsightsPoolStats = {
  pools: [
    {
      name: 'Foundry USA',
      hashrate_percent: 28.5,
      hashrate_effective: 214.5,
      blocks_mined: {
        '1d': { absolute: 41, relative: 28.5 },
        '1w': { absolute: 288, relative: 28.8 },
      },
    },
    {
      name: 'AntPool',
      hashrate_percent: 18.2,
      hashrate_effective: 137.0,
      blocks_mined: {
        '1d': { absolute: 26, relative: 18.1 },
        '1w': { absolute: 182, relative: 18.2 },
      },
    },
    {
      name: 'F2Pool',
      hashrate_percent: 14.8,
      hashrate_effective: 111.4,
      blocks_mined: {
        '1d': { absolute: 21, relative: 14.6 },
        '1w': { absolute: 148, relative: 14.8 },
      },
    },
    {
      name: 'Braiins Pool',
      hashrate_percent: 8.3,
      hashrate_effective: 62.5,
      blocks_mined: {
        '1d': { absolute: 12, relative: 8.3 },
        '1w': { absolute: 83, relative: 8.3 },
      },
    },
    {
      name: 'ViaBTC',
      hashrate_percent: 7.1,
      hashrate_effective: 53.5,
      blocks_mined: {
        '1d': { absolute: 10, relative: 6.9 },
        '1w': { absolute: 71, relative: 7.1 },
      },
    },
  ],
  timestamp: '2025-12-16T04:00:00Z',
};

describe('PoolStatsTool', () => {
  let tool: PoolStatsTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new PoolStatsTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_pool_stats');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('pool');
      expect(tool.description).toContain('distribution');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format pool stats successfully', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});

      expect(mockApiClient.getPoolStats).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Mining Pool Statistics');
      expect(markdown).toContain('Decentralization Metrics');
    });

    it('should display pools sorted by hashrate', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // First pool should be Foundry USA (highest hashrate)
      const foundryIndex = markdown.indexOf('Foundry USA');
      const antpoolIndex = markdown.indexOf('AntPool');
      const f2poolIndex = markdown.indexOf('F2Pool');

      expect(foundryIndex).toBeLessThan(antpoolIndex);
      expect(antpoolIndex).toBeLessThan(f2poolIndex);
    });

    it('should format hashrate with 2 decimals', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toMatch(/214\.50/); // Foundry USA hashrate
      expect(markdown).toMatch(/137\.00/); // AntPool hashrate
    });

    it('should display pool table with correct headers', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('| Rank | Pool Name | Hashrate (EH/s) | Network % | Blocks (24h) | Blocks (1w) |');
      expect(markdown).toContain('|------|-----------|-----------------|-----------|--------------|-------------|');
    });

    it('should calculate decentralization metrics', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Total Pools Tracked:** 5');
      expect(markdown).toContain('**Top 3 Pools Control:**');
      expect(markdown).toContain('**Top 5 Pools Control:**');
    });

    it('should display distribution analysis', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Distribution Analysis');
      expect(markdown).toContain('Large Pools (>10%):');
      expect(markdown).toContain('Medium Pools (5-10%):');
      expect(markdown).toContain('Small Pools (<5%):');
    });

    it('should include timestamp if provided', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Last updated:');
      expect(markdown).toContain('2025-12-16T04:00:00Z');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty pools array', async () => {
      mockApiClient.getPoolStats.mockResolvedValue({ pools: [], timestamp: '2025-12-16T04:00:00Z' });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('No pool data available');
    });

    it('should handle pools with missing blocks_mined data', async () => {
      const poolsWithMissingData: BraiinsInsightsPoolStats = {
        pools: [
          {
            name: 'Test Pool',
            hashrate_percent: 10.0,
            hashrate_effective: 75.0,
            blocks_mined: {},
          },
        ],
      };
      mockApiClient.getPoolStats.mockResolvedValue(poolsWithMissingData);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Test Pool');
      expect(markdown).toContain('| 1 | Test Pool | 75.00');
    });

    it('should limit pool table to top 15 pools', async () => {
      const manyPools: BraiinsInsightsPoolStats = {
        pools: Array.from({ length: 20 }, (_, i) => ({
          name: `Pool ${i + 1}`,
          hashrate_percent: 5.0,
          hashrate_effective: 37.5,
          blocks_mined: {
            '1d': { absolute: 7 },
            '1w': { absolute: 50 },
          },
        })),
      };
      mockApiClient.getPoolStats.mockResolvedValue(manyPools);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Showing top 15 of 20 total pools');
      // Should only show 15 pools in table
      const poolRows = markdown.match(/\| \d+ \| Pool/g);
      expect(poolRows?.length).toBe(15);
    });

    it('should handle pools without timestamp', async () => {
      const poolsWithoutTimestamp: BraiinsInsightsPoolStats = {
        pools: SAMPLE_POOL_STATS.pools,
      };
      mockApiClient.getPoolStats.mockResolvedValue(poolsWithoutTimestamp);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).not.toContain('Last updated:');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API rate limit exceeded', 429, '/v1.0/pool-stats');
      mockApiClient.getPoolStats.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getPoolStats.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('DNS lookup failed');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockApiClient.getPoolStats.mockRejectedValue(unexpectedError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });
  });

  describe('concentration calculations', () => {
    it('should calculate correct top 3 pool concentration', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Top 3: Foundry (214.5) + AntPool (137.0) + F2Pool (111.4) = 462.9
      // Total: 214.5 + 137.0 + 111.4 + 62.5 + 53.5 = 578.9
      // Percentage: (462.9 / 578.9) * 100 ≈ 79.96%
      expect(markdown).toContain('**Top 3 Pools Control:** 79.96% of network');
    });

    it('should calculate correct top 5 pool concentration', async () => {
      mockApiClient.getPoolStats.mockResolvedValue(SAMPLE_POOL_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Top 5 is all pools = 100%
      expect(markdown).toContain('**Top 5 Pools Control:** 100.00% of network');
    });
  });
});
