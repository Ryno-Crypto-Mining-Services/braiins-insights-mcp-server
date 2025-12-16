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

// Sample valid response data
const SAMPLE_DIFFICULTY_STATS: BraiinsInsightsDifficultyStats = {
  current_difficulty: 109780000000000000,
  estimated_next_difficulty: 110500000000000000,
  estimated_change_percent: 0.656,
  blocks_until_adjustment: 1234,
  estimated_adjustment_time: '2025-12-20T14:30:00Z',
  last_adjustment_date: '2025-12-06T10:15:00Z',
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
      expect(markdown).toContain('Current Metrics');
      expect(markdown).toContain('Next Adjustment');
    });

    it('should format current difficulty correctly', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show scientific notation and formatted number
      expect(markdown).toContain('1.10e+17');
      expect(markdown).toMatch(/109,780,000,000,000,000/);
    });

    it('should format difficulty change percentage correctly', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('+0.66%');
    });

    it('should format negative difficulty change correctly', async () => {
      const statsWithNegativeChange = {
        ...SAMPLE_DIFFICULTY_STATS,
        estimated_change_percent: -2.15,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithNegativeChange);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('-2.15%');
    });

    it('should format blocks until adjustment with commas', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('1,234');
    });

    it('should format dates as human-readable', async () => {
      mockApiClient.getDifficultyStats.mockResolvedValue(SAMPLE_DIFFICULTY_STATS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should convert ISO 8601 to UTC/GMT string
      expect(markdown).toMatch(/Estimated Adjustment Time:.*(UTC|GMT)/);
      expect(markdown).toMatch(/Last Adjustment:.*(UTC|GMT)/);
    });

    it('should handle optional fields gracefully', async () => {
      const minimalStats: BraiinsInsightsDifficultyStats = {
        current_difficulty: 109780000000000000,
        estimated_next_difficulty: 110500000000000000,
        estimated_change_percent: 0.656,
        blocks_until_adjustment: 1234,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(minimalStats);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Current Difficulty');
      expect(markdown).toContain('Blocks Until Adjustment');
    });

    it('should handle missing estimated fields', async () => {
      // Test the else branches when estimated fields are undefined
      const statsWithoutEstimates: BraiinsInsightsDifficultyStats = {
        current_difficulty: 109780000000000000,
        blocks_until_adjustment: 1234,
        // estimated_next_difficulty is undefined
        // estimated_change_percent is undefined
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithoutEstimates);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Current Difficulty');
      expect(markdown).not.toContain('Estimated Next Difficulty');
      expect(markdown).not.toContain('Estimated Change');
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
        current_difficulty: 9.99999999999999e17,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithLargeNumbers);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('1.00e+18');
    });

    it('should format smaller difficulty values without scientific notation', async () => {
      // Test the else branch of formatDifficulty (value < 1e15)
      const statsWithSmallDifficulty = {
        ...SAMPLE_DIFFICULTY_STATS,
        current_difficulty: 500000000000000, // 5e14, below 1e15 threshold
        estimated_next_difficulty: 510000000000000,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithSmallDifficulty);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      // Should show formatted number without scientific notation
      expect(markdown).toContain('500,000,000,000,000');
      expect(markdown).not.toContain('e+14');
    });

    it('should handle zero blocks until adjustment', async () => {
      const statsWithZeroBlocks = {
        ...SAMPLE_DIFFICULTY_STATS,
        blocks_until_adjustment: 0,
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithZeroBlocks);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('0');
    });

    it('should handle invalid date formats gracefully', async () => {
      const statsWithInvalidDate = {
        ...SAMPLE_DIFFICULTY_STATS,
        estimated_adjustment_time: 'invalid-date',
      };
      mockApiClient.getDifficultyStats.mockResolvedValue(statsWithInvalidDate);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      // Should display "Invalid Date" when parsing fails
      expect(markdown).toContain('Invalid Date');
    });
  });
});
