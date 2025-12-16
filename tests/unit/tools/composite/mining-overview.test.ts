/**
 * Unit tests for braiins_mining_overview composite tool
 */

import { jest } from '@jest/globals';
import { MiningOverviewTool } from '../../../../src/tools/composite/mining-overview.js';
import {
  BraiinsInsightsHashrateStats,
  BraiinsInsightsDifficultyStats,
  BraiinsInsightsPriceStats,
  BraiinsInsightsBlockData,
} from '../../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): {
  getHashrateStats: jest.Mock;
  getDifficultyStats: jest.Mock;
  getPriceStats: jest.Mock;
  getBlocks: jest.Mock;
} => ({
  getHashrateStats: jest.fn(),
  getDifficultyStats: jest.fn(),
  getPriceStats: jest.fn(),
  getBlocks: jest.fn(),
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

const SAMPLE_DIFFICULTY_STATS: BraiinsInsightsDifficultyStats = {
  current_difficulty: 109780000000000000,
  estimated_next_difficulty: 110000000000000000,
  estimated_change_percent: 0.2,
  blocks_until_adjustment: 1024,
  estimated_adjustment_time: '2025-12-20T12:00:00Z',
  last_adjustment_date: '2025-12-06T08:30:00Z',
};

const SAMPLE_PRICE_STATS: BraiinsInsightsPriceStats = {
  current_price_usd: 106500.75,
  price_change_24h_percent: 2.5,
  market_cap_usd: 2100000000000,
  volume_24h_usd: 45000000000,
};

const SAMPLE_BLOCKS: BraiinsInsightsBlockData[] = [
  {
    height: 870000,
    pool_name: 'Braiins Pool',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    transaction_count: 3500,
    size_mb: 1.8,
    hash: '0000000000000000000123456789abcdef',
    reward: 3.125,
    fees: 0.015,
  },
  {
    height: 869999,
    pool_name: 'Foundry USA',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    transaction_count: 3200,
    size_mb: 1.6,
    hash: '0000000000000000000abcdef123456789',
    reward: 3.125,
    fees: 0.012,
  },
  {
    height: 869998,
    pool_name: 'AntPool',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
    transaction_count: 3800,
    size_mb: 2.0,
    hash: '000000000000000000fedcba987654321',
    reward: 3.125,
    fees: 0.018,
  },
];

describe('MiningOverviewTool', () => {
  let tool: MiningOverviewTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new MiningOverviewTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_mining_overview');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('ecosystem overview');
      expect(tool.description).toContain('hashrate');
      expect(tool.description).toContain('difficulty');
      expect(tool.description).toContain('price');
      expect(tool.description.length).toBeGreaterThan(50);
    });

    it('should have correct input schema with defaults', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.include_recent_blocks).toBeDefined();
      expect(tool.inputSchema.properties.include_recent_blocks.default).toBe(true);
      expect(tool.inputSchema.properties.block_count).toBeDefined();
      expect(tool.inputSchema.properties.block_count.default).toBe(5);
      expect(tool.inputSchema.properties.block_count.minimum).toBe(1);
      expect(tool.inputSchema.properties.block_count.maximum).toBe(20);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format complete mining overview with all endpoints', async () => {
      // Mock all endpoints to succeed
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({ include_recent_blocks: true, block_count: 5 });

      // Verify all endpoints were called
      expect(mockApiClient.getHashrateStats).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getDifficultyStats).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getPriceStats).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ page: 1, page_size: 5 });

      // Verify response structure
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;

      // Verify all sections are present
      expect(markdown).toContain('🔍 Bitcoin Mining Ecosystem Overview');
      expect(markdown).toContain('📊 Network Overview');
      expect(markdown).toContain('⛏️ Difficulty Status');
      expect(markdown).toContain('💰 Price Snapshot');
      expect(markdown).toContain('🧱 Recent Blocks');

      // Verify hashrate data
      expect(markdown).toContain('1001.23 EH/s');
      expect(markdown).toContain('1146.50 EH/s');
      expect(markdown).toContain('1074.37 EH/s');

      // Verify difficulty data
      expect(markdown).toContain('1,024');

      // Verify price data
      expect(markdown).toContain('106,500.75');
      expect(markdown).toContain('+2.50%');

      // Verify blocks data
      expect(markdown).toContain('870,000');
      expect(markdown).toContain('Braiins Pool');
    });

    it('should use default parameters when none provided', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ page: 1, page_size: 5 });
    });

    it('should exclude blocks when include_recent_blocks is false', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);

      const result = await tool.execute({ include_recent_blocks: false });

      expect(result.isError).toBe(false);
      expect(mockApiClient.getBlocks).not.toHaveBeenCalled();

      const markdown = result.content[0].text;
      expect(markdown).not.toContain('🧱 Recent Blocks');
    });

    it('should respect custom block_count parameter', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS.slice(0, 10));

      const result = await tool.execute({ include_recent_blocks: true, block_count: 10 });

      expect(result.isError).toBe(false);
      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ page: 1, page_size: 10 });
    });
  });

  describe('execute - partial failures (graceful degradation)', () => {
    it('should handle hashrate endpoint failure', async () => {
      mockApiClient.getHashrateStats.mockRejectedValue(
        new NetworkError('Hashrate endpoint timeout')
      );
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      // Should show unavailable message for hashrate
      expect(markdown).toContain('⚠️ *Network hashrate data unavailable*');

      // Should still show other sections
      expect(markdown).toContain('⛏️ Difficulty Status');
      expect(markdown).toContain('💰 Price Snapshot');
      expect(markdown).toContain('🧱 Recent Blocks');

      // Should include data availability notice
      expect(markdown).toContain('⚠️ Data Availability Notice');
      expect(markdown).toContain('Hashrate data could not be retrieved');
    });

    it('should handle difficulty endpoint failure', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockRejectedValue(
        new InsightsApiError('API rate limit exceeded', 429)
      );
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ *Difficulty data unavailable*');
      expect(markdown).toContain('Difficulty data could not be retrieved');
    });

    it('should handle price endpoint failure', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockRejectedValue(new Error('Unexpected error'));
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ *Price data unavailable*');
      expect(markdown).toContain('Price data could not be retrieved');
    });

    it('should handle blocks endpoint failure', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockRejectedValue(new NetworkError('Connection refused'));

      const result = await tool.execute({ include_recent_blocks: true });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ *Recent blocks data unavailable*');
      expect(markdown).toContain('Recent blocks data could not be retrieved');
    });

    it('should handle multiple endpoint failures', async () => {
      mockApiClient.getHashrateStats.mockRejectedValue(new NetworkError('Timeout'));
      mockApiClient.getDifficultyStats.mockRejectedValue(new NetworkError('Timeout'));
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      // Should show unavailable for both hashrate and difficulty
      expect(markdown).toContain('⚠️ *Network hashrate data unavailable*');
      expect(markdown).toContain('⚠️ *Difficulty data unavailable*');

      // Should include both warnings
      expect(markdown).toContain('Hashrate data could not be retrieved');
      expect(markdown).toContain('Difficulty data could not be retrieved');

      // Should still show available data
      expect(markdown).toContain('💰 Price Snapshot');
      expect(markdown).toContain('106,500.75');
    });

    it('should handle empty blocks array', async () => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue([]);

      const result = await tool.execute({ include_recent_blocks: true });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      expect(markdown).toContain('🧱 Recent Blocks');
      expect(markdown).toContain('*No recent blocks available*');
    });
  });

  describe('execute - complete failure', () => {
    it('should return error if all endpoints fail', async () => {
      mockApiClient.getHashrateStats.mockRejectedValue(new NetworkError('All endpoints down'));
      mockApiClient.getDifficultyStats.mockRejectedValue(new NetworkError('All endpoints down'));
      mockApiClient.getPriceStats.mockRejectedValue(new NetworkError('All endpoints down'));
      mockApiClient.getBlocks.mockRejectedValue(new NetworkError('All endpoints down'));

      const result = await tool.execute({});

      // Should still succeed but show all warnings
      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ *Network hashrate data unavailable*');
      expect(markdown).toContain('⚠️ *Difficulty data unavailable*');
      expect(markdown).toContain('⚠️ *Price data unavailable*');
      expect(markdown).toContain('⚠️ Data Availability Notice');
    });
  });

  describe('execute - validation errors', () => {
    it('should handle invalid block_count (too low)', async () => {
      const result = await tool.execute({ block_count: 0 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Block count must be at least 1');
    });

    it('should handle invalid block_count (too high)', async () => {
      const result = await tool.execute({ block_count: 21 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Block count cannot exceed 20');
    });

    it('should handle invalid block_count (not integer)', async () => {
      const result = await tool.execute({ block_count: 5.5 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });

    it('should handle invalid include_recent_blocks type', async () => {
      const result = await tool.execute({ include_recent_blocks: 'yes' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });
  });

  describe('formatting methods', () => {
    beforeEach(() => {
      mockApiClient.getHashrateStats.mockResolvedValue(SAMPLE_HASHRATE_STATS);
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);
      mockApiClient.getPriceStats.mockResolvedValue(SAMPLE_PRICE_STATS);
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);
    });

    it('should format difficulty with scientific notation for large values', async () => {
      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show scientific notation for large difficulty
      expect(markdown).toMatch(/1\.10e\+17/);
    });

    it('should format negative price change with down indicator', async () => {
      const priceWithNegativeChange: BraiinsInsightsPriceStats = {
        ...SAMPLE_PRICE_STATS,
        price_change_24h_percent: -3.5,
      };
      mockApiClient.getPriceStats.mockResolvedValue(priceWithNegativeChange);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('📉');
      expect(markdown).toContain('-3.50%');
    });

    it('should format zero price change with neutral indicator', async () => {
      const priceWithZeroChange: BraiinsInsightsPriceStats = {
        ...SAMPLE_PRICE_STATS,
        price_change_24h_percent: 0,
      };
      mockApiClient.getPriceStats.mockResolvedValue(priceWithZeroChange);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('➡️');
      expect(markdown).toContain('+0.00%');
    });

    it('should format relative time correctly for recent blocks', async () => {
      const result = await tool.execute({ include_recent_blocks: true });
      const markdown = result.content[0].text;

      // Should show relative time like "5m ago", "15m ago"
      expect(markdown).toMatch(/\d+m ago/);
    });

    it('should handle optional difficulty fields gracefully', async () => {
      const minimalDifficulty: BraiinsInsightsDifficultyStats = {
        current_difficulty: 109780000000000000,
        blocks_until_adjustment: 1024,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(minimalDifficulty);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('⛏️ Difficulty Status');
      expect(markdown).toContain('1,024');
      expect(markdown).not.toContain('Estimated Next Difficulty');
    });
  });
});
