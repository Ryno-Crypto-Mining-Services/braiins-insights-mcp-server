/**
 * Unit tests for braiins_hashrate_and_difficulty_history tool
 */

import { jest } from '@jest/globals';
import { HashrateAndDifficultyHistoryTool } from '../../../src/tools/historical/hashrate-and-difficulty-history.js';
import { BraiinsInsightsHashDiffHistory } from '../../../src/types/insights-api.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getHashrateAndDifficultyHistory: jest.Mock } => ({
  getHashrateAndDifficultyHistory: jest.fn(),
});

// Sample valid response data
const SAMPLE_HASH_DIFF_HISTORY: BraiinsInsightsHashDiffHistory[] = [
  {
    timestamp: '2025-12-15T12:00:00Z',
    hashrate_ehs: 756.42,
    difficulty: 109780000000000000,
  },
  {
    timestamp: '2025-12-14T12:00:00Z',
    hashrate_ehs: 751.18,
    difficulty: 109780000000000000,
  },
  {
    timestamp: '2025-12-13T12:00:00Z',
    hashrate_ehs: 748.95,
    difficulty: 107500000000000000,
  },
];

describe('HashrateAndDifficultyHistoryTool', () => {
  let tool: HashrateAndDifficultyHistoryTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new HashrateAndDifficultyHistoryTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_hashrate_and_difficulty_history');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('hashrate');
      expect(tool.description).toContain('difficulty');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have optional limit parameter in schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format hashrate/difficulty history successfully', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result = await tool.execute({});

      expect(mockApiClient.getHashrateAndDifficultyHistory).toHaveBeenCalledTimes(1);
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Network Hashrate & Difficulty History');
      expect(markdown).toContain('Hashrate Statistics');
      expect(markdown).toContain('Difficulty Statistics');
    });

    it('should calculate hashrate statistics correctly', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show hashrate with 2 decimal places
      expect(markdown).toContain('756.42');
      expect(markdown).toContain('Current Hashrate:');
      expect(markdown).toContain('Average Hashrate:');
      expect(markdown).toContain('Peak Hashrate:');
      expect(markdown).toContain('Lowest Hashrate:');
    });

    it('should format difficulty correctly with scientific notation', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Large difficulty should use scientific notation
      expect(markdown).toMatch(/\d\.\d+e\+\d+/i);
    });

    it('should calculate difficulty change percentage', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Period Change:');
      // Should show + or - percentage
      expect(markdown).toMatch(/[+-]\d+\.\d+%/);
    });

    it('should display time range in summary', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Time Range:');
    });

    it('should apply limit parameter correctly', async () => {
      const manyDataPoints = Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2025-12-${String(15 - (i % 15)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`,
        hashrate_ehs: 750 + i * 0.5,
        difficulty: 109780000000000000,
      }));
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(manyDataPoints);

      const result = await tool.execute({ limit: 20 });
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Data Points:** 20');
      expect(markdown).toContain('of 100 total');
    });

    it('should handle limit at boundary values', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result1 = await tool.execute({ limit: 1 });
      expect(result1.isError).toBe(false);

      const result1000 = await tool.execute({ limit: 1000 });
      expect(result1000.isError).toBe(false);
    });

    it('should ignore invalid limit values', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result1 = await tool.execute({ limit: -5 });
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute({ limit: 2000 });
      expect(result2.isError).toBe(false);
      expect(result2.content[0].text).toContain('**Data Points:** 3');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty data array', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue([]);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No Data Available');
    });

    it('should handle single data point', async () => {
      const singlePoint: BraiinsInsightsHashDiffHistory[] = [
        {
          timestamp: '2025-12-15T12:00:00Z',
          hashrate_ehs: 756.42,
          difficulty: 109780000000000000,
        },
      ];
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(singlePoint);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('**Data Points:** 1');
    });

    it('should handle null/undefined input', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(SAMPLE_HASH_DIFF_HISTORY);

      const result1 = await tool.execute(null);
      expect(result1.isError).toBe(false);

      const result2 = await tool.execute(undefined);
      expect(result2.isError).toBe(false);
    });

    it('should handle large data arrays without table overflow', async () => {
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        timestamp: `2025-12-15T${String(i % 24).padStart(2, '0')}:00:00Z`,
        hashrate_ehs: 750 + i * 0.1,
        difficulty: 109780000000000000,
      }));
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(largeDataset);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show limited rows in table
      expect(markdown).toContain('Showing 15 of 500 data points');
    });

    it('should handle difficulty of zero gracefully', async () => {
      const zeroData: BraiinsInsightsHashDiffHistory[] = [
        {
          timestamp: '2025-12-15T12:00:00Z',
          hashrate_ehs: 756.42,
          difficulty: 0,
        },
        {
          timestamp: '2025-12-14T12:00:00Z',
          hashrate_ehs: 751.18,
          difficulty: 0,
        },
      ];
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(zeroData);

      const result = await tool.execute({});

      // Should not crash on division by zero for percent change
      expect(result.isError).toBe(false);
    });

    it('should format invalid timestamps gracefully', async () => {
      const invalidTimestampData: BraiinsInsightsHashDiffHistory[] = [
        {
          timestamp: 'invalid-date',
          hashrate_ehs: 756.42,
          difficulty: 109780000000000000,
        },
      ];
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(invalidTimestampData);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      // Should show the original string if parsing fails
      expect(result.content[0].text).toContain('invalid-date');
    });

    it('should handle small difficulty values without scientific notation', async () => {
      const smallDiffData: BraiinsInsightsHashDiffHistory[] = [
        {
          timestamp: '2025-12-15T12:00:00Z',
          hashrate_ehs: 756.42,
          difficulty: 1000000000, // 1 billion - below 1e15 threshold
        },
        {
          timestamp: '2025-12-14T12:00:00Z',
          hashrate_ehs: 751.18,
          difficulty: 900000000, // 900 million
        },
      ];
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(smallDiffData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(result.isError).toBe(false);
      // Should display numbers with commas, not scientific notation
      expect(markdown).toContain('1,000,000,000');
      expect(markdown).not.toContain('1.00e+9');
    });

    it('should show negative percent change when difficulty decreases', async () => {
      const decreasingDiffData: BraiinsInsightsHashDiffHistory[] = [
        {
          timestamp: '2025-12-15T12:00:00Z',
          hashrate_ehs: 756.42,
          difficulty: 80000000000000000, // Lower than oldest
        },
        {
          timestamp: '2025-12-14T12:00:00Z',
          hashrate_ehs: 751.18,
          difficulty: 100000000000000000, // Higher
        },
      ];
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(decreasingDiffData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(result.isError).toBe(false);
      // Should show negative percent change
      expect(markdown).toContain('Period Change:');
      expect(markdown).toMatch(/-\d+\.\d+%/);
    });

    it('should handle missing hashrate with nullish coalescing', async () => {
      const dataWithDefaults: BraiinsInsightsHashDiffHistory[] = [
        {
          timestamp: '2025-12-15T12:00:00Z',
          hashrate_ehs: 0, // Edge case: zero hashrate
          difficulty: 0, // Edge case: zero difficulty
        },
      ];
      mockApiClient.getHashrateAndDifficultyHistory.mockResolvedValue(dataWithDefaults);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Current Hashrate:');
      expect(result.content[0].text).toContain('0.00');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'API rate limit exceeded',
        429,
        '/v1.0/hashrate-and-difficulty-history'
      );
      mockApiClient.getHashrateAndDifficultyHistory.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('Connection timeout');
      mockApiClient.getHashrateAndDifficultyHistory.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('Connection timeout');
    });

    it('should handle unexpected errors', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockRejectedValue(new Error('Unknown error'));

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });

    it('should handle non-Error thrown values', async () => {
      mockApiClient.getHashrateAndDifficultyHistory.mockRejectedValue('string error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('string error');
    });
  });
});
