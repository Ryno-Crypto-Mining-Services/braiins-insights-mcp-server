/**
 * Unit tests for braiins_difficulty_stats tool
 */

import { jest } from '@jest/globals';
import { DifficultyStatsTool } from '../../../src/tools/simple/difficulty-stats.js';
import { BraiinsInsightsDifficultyStats } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getDifficultyStats: jest.Mock } => ({
  getDifficultyStats: jest.fn(),
});

// Sample valid response data matching updated API structure
const SAMPLE_DIFFICULTY_STATS: BraiinsInsightsDifficultyStats = {
  difficulty: 109780000000000000,
  block_epoch: 432,
  epoch_block_time: 598,
  estimated_adjustment: 0.00656,
  estimated_next_diff: 110500000000000000,
  estimated_adjustment_date: '2025-12-20T14:30:00Z',
  previous_adjustment: 0.0245,
  year_difficulty_change: 0.52,
  current_halving_epoch_total_difficulty_change: 0.78,
  previous_halving_epoch_total_difficulty_change: 1.25,
  average_difficulty_change_per_epoch: 0.032,
};

describe('DifficultyStatsTool', () => {
  let tool: DifficultyStatsTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new DifficultyStatsTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_difficulty_stats');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('difficulty');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format difficulty stats successfully', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});

      expect(mockApiClient.getDifficultyStats).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Network Difficulty Statistics');
    });

    it('should format current difficulty correctly', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show scientific notation
      expect(markdown).toContain('1.10e+17');
    });

    it('should format difficulty change percentage correctly', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // estimated_adjustment is 0.00656 which should be formatted as +0.66%
      expect(markdown).toContain('+0.66%');
    });

    it('should format negative difficulty change correctly', async () => {
      const statsWithNegativeChange = {
        ...SAMPLE_DIFFICULTY_STATS,
        estimated_adjustment: -0.0215,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithNegativeChange);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('-2.15%');
    });

    it('should show block epoch', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('432');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'API rate limit exceeded',
        429,
        '/v1.0/difficulty-stats'
      );
      mockApiClient.getDifficultyStats.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getDifficultyStats.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('DNS lookup failed');
    });

    it('should handle unexpected errors', async () => {
      mockApiClient.getDifficultyStats.mockRejectedValue(new Error('Unknown error'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });

    it('should handle non-Error thrown values', async () => {
      mockApiClient.getDifficultyStats.mockRejectedValue('string error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('string error');
    });
  });

  describe('edge cases', () => {
    it('should handle very large difficulty numbers', async () => {
      const statsWithLargeNumbers = {
        ...SAMPLE_DIFFICULTY_STATS,
        difficulty: 9.99999999999999e17,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithLargeNumbers);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('1.00e+18');
    });

    it('should format smaller difficulty values without scientific notation', async () => {
      const statsWithSmallDifficulty = {
        ...SAMPLE_DIFFICULTY_STATS,
        difficulty: 500000000000000,
        estimated_next_diff: 510000000000000,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithSmallDifficulty);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      // Should show formatted number without scientific notation
      expect(markdown).toContain('500,000,000,000,000');
    });
  });
});
