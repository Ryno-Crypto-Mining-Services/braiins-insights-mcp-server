/**
 * Unit tests for braiins_blocks tool
 */

import { jest } from '@jest/globals';
import { BlocksTool } from '../../../src/tools/parameterized/blocks.js';
import { BraiinsInsightsBlockData } from '../../../src/types/insights-api.js';
import {
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getBlocks: jest.Mock } => ({
  getBlocks: jest.fn(),
});

// Sample valid response data
const SAMPLE_BLOCKS_PAGE_1: BraiinsInsightsBlockData[] = [
  {
    height: 875432,
    hash: '00000000000000000001234567890abcdef1234567890abcdef1234567890abc',
    pool_name: 'Foundry USA',
    timestamp: '2025-12-16T04:00:00Z',
    transaction_count: 3245,
    size_mb: 1.89,
  },
  {
    height: 875431,
    hash: '00000000000000000009876543210fedcba9876543210fedcba9876543210fed',
    pool_name: 'AntPool',
    timestamp: '2025-12-16T03:50:00Z',
    transaction_count: 2987,
    size_mb: 1.76,
  },
  {
    height: 875430,
    hash: '0000000000000000000abcdef1234567890abcdef1234567890abcdef123456',
    pool_name: 'F2Pool',
    timestamp: '2025-12-16T03:40:00Z',
    transaction_count: 3101,
    size_mb: 1.82,
  },
];

const SAMPLE_BLOCKS_PAGE_2: BraiinsInsightsBlockData[] = [
  {
    height: 875429,
    hash: '0000000000000000000fedcba9876543210fedcba9876543210fedcba987654',
    pool_name: 'Braiins Pool',
    timestamp: '2025-12-16T03:30:00Z',
    transaction_count: 3456,
    size_mb: 1.95,
  },
];

const SAMPLE_BLOCKS_UNKNOWN_POOL: BraiinsInsightsBlockData[] = [
  {
    height: 875428,
    hash: '00000000000000000001111111111111111111111111111111111111111111',
    pool_name: null,
    timestamp: '2025-12-16T03:20:00Z',
    transaction_count: 2543,
    size_mb: 1.45,
  },
];

describe('BlocksTool', () => {
  let tool: BlocksTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new BlocksTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_blocks');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('blocks');
      expect(tool.description).toContain('pagination');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('page');
      expect(tool.inputSchema.properties).toHaveProperty('page_size');
      expect(tool.inputSchema.properties).toHaveProperty('start_date');
      expect(tool.inputSchema.properties).toHaveProperty('end_date');
      expect(tool.inputSchema.required).toEqual([]);
    });

    it('should define pagination parameters correctly', () => {
      expect(tool.inputSchema.properties.page.type).toBe('number');
      expect(tool.inputSchema.properties.page.default).toBe(1);
      expect(tool.inputSchema.properties.page.minimum).toBe(1);

      expect(tool.inputSchema.properties.page_size.type).toBe('number');
      expect(tool.inputSchema.properties.page_size.default).toBe(10);
      expect(tool.inputSchema.properties.page_size.minimum).toBe(1);
      expect(tool.inputSchema.properties.page_size.maximum).toBe(100);
    });

    it('should define date filter parameters with patterns', () => {
      expect(tool.inputSchema.properties.start_date.pattern).toBe('^\\d{4}-\\d{2}-\\d{2}$');
      expect(tool.inputSchema.properties.end_date.pattern).toBe('^\\d{4}-\\d{2}-\\d{2}$');
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format blocks successfully with default parameters', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
      });
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Recent Bitcoin Blocks');
      expect(markdown).toContain('Foundry USA');
      expect(markdown).toContain('875,432'); // Height is formatted with thousands separator
    });

    it('should apply custom pagination parameters', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_2);

      const result = await tool.execute({ page: 2, page_size: 20 });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 2,
        page_size: 20,
      });
      expect(result.isError).toBe(false);
    });

    it('should include filter information in output', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({ page: 3, page_size: 5 });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Filters Applied:');
      expect(markdown).toContain('Page: 3');
      expect(markdown).toContain('Page Size: 5');
    });

    it('should display block summary statistics', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Summary:');
      expect(markdown).toContain('Total Blocks Displayed: 3');
      expect(markdown).toContain('Average Block Size:');
      expect(markdown).toContain('Average Transactions/Block:');
    });
  });

  describe('execute - pagination', () => {
    it('should handle minimum page size (1)', async () => {
      mockApiClient.getBlocks.mockResolvedValue([SAMPLE_BLOCKS_PAGE_1[0]]);

      const result = await tool.execute({ page: 1, page_size: 1 });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 1,
        page_size: 1,
      });
      expect(result.isError).toBe(false);
    });

    it('should handle maximum page size (100)', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({ page: 1, page_size: 100 });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 1,
        page_size: 100,
      });
      expect(result.isError).toBe(false);
    });

    it('should reject page size exceeding 100', async () => {
      const result = await tool.execute({ page: 1, page_size: 101 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Page size cannot exceed 100');
    });

    it('should reject page size less than 1', async () => {
      const result = await tool.execute({ page: 1, page_size: 0 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Page size must be at least 1');
    });

    it('should reject page number less than 1', async () => {
      const result = await tool.execute({ page: 0, page_size: 10 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Page number must be at least 1');
    });
  });

  describe('execute - date filtering', () => {
    it('should apply start_date filter', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({
        page: 1,
        page_size: 10,
        start_date: '2025-12-01',
      });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        start_date: '2025-12-01',
      });
      expect(result.isError).toBe(false);

      const markdown = result.content[0].text;
      expect(markdown).toContain('Start Date: 2025-12-01');
    });

    it('should apply end_date filter', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({
        page: 1,
        page_size: 10,
        end_date: '2025-12-16',
      });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        end_date: '2025-12-16',
      });
      expect(result.isError).toBe(false);

      const markdown = result.content[0].text;
      expect(markdown).toContain('End Date: 2025-12-16');
    });

    it('should apply both start_date and end_date filters', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({
        start_date: '2025-12-01',
        end_date: '2025-12-16',
      });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        start_date: '2025-12-01',
        end_date: '2025-12-16',
      });
      expect(result.isError).toBe(false);
    });

    it('should reject invalid date format (start_date)', async () => {
      const result = await tool.execute({
        start_date: '2025/12/01', // Wrong format (should be YYYY-MM-DD)
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('YYYY-MM-DD format');
    });

    it('should reject invalid date format (end_date)', async () => {
      const result = await tool.execute({
        end_date: '12-16-2025', // Wrong format (should be YYYY-MM-DD)
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });

    it('should reject start_date after end_date', async () => {
      const result = await tool.execute({
        start_date: '2025-12-16',
        end_date: '2025-12-01',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('start_date must be before or equal to end_date');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty result set', async () => {
      mockApiClient.getBlocks.mockResolvedValue([]);

      const result = await tool.execute({ page: 999 });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('No blocks found');
      expect(markdown).toContain('Page: 999');
    });

    it('should handle empty result set with date filters', async () => {
      mockApiClient.getBlocks.mockResolvedValue([]);

      const result = await tool.execute({
        start_date: '2020-01-01',
        end_date: '2020-01-02',
      });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('No blocks found');
      expect(markdown).toContain('between 2020-01-01 and 2020-01-02');
    });

    it('should handle blocks with null pool_name', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_UNKNOWN_POOL);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Unknown'); // Should show "Unknown" for null pool_name
    });

    it('should handle blocks with short hash', async () => {
      const shortHashBlock: BraiinsInsightsBlockData[] = [
        {
          height: 875427,
          hash: 'short',
          pool_name: 'Test Pool',
          timestamp: '2025-12-16T03:10:00Z',
          transaction_count: 2000,
          size_mb: 1.5,
        },
      ];
      mockApiClient.getBlocks.mockResolvedValue(shortHashBlock);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('short'); // Short hash should be displayed as-is
    });

    it('should format large block hashes correctly', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      // Should contain shortened hash format (first 10 + ... + last 6 characters)
      expect(markdown).toMatch(/`0{10,}\.\.\.[a-f0-9]{6}`/);
    });

    it('should calculate correct average statistics', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Average size: (1.89 + 1.76 + 1.82) / 3 = 1.82
      expect(markdown).toContain('Average Block Size: 1.82 MB');

      // Average tx count: (3245 + 2987 + 3101) / 3 = 3111
      expect(markdown).toContain('Average Transactions/Block: 3111');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API rate limit exceeded', 429, '/v1.0/blocks');
      mockApiClient.getBlocks.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
      expect(result.content[0].text).toContain('API rate limit exceeded');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('DNS lookup failed');
      mockApiClient.getBlocks.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('DNS lookup failed');
    });

    it('should handle ValidationError', async () => {
      const validationError = new ValidationError(
        'Response validation failed: missing required field "height"'
      );
      mockApiClient.getBlocks.mockRejectedValue(validationError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Response Validation Error');
      expect(result.content[0].text).toContain('missing required field');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected internal error');
      mockApiClient.getBlocks.mockRejectedValue(unexpectedError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('Unexpected internal error');
    });

    it('should handle non-Error exceptions', async () => {
      mockApiClient.getBlocks.mockRejectedValue('String error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('String error');
    });
  });

  describe('markdown formatting', () => {
    it('should format block table correctly', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain(
        '| Height  | Pool        | Timestamp    | Transactions | Size    | Hash (short) |'
      );
      expect(markdown).toContain(
        '|---------|-------------|--------------|--------------|---------|--------------|'
      );
      expect(markdown).toMatch(/\| 875,432 \|/); // Numbers should be formatted with commas
    });

    it('should include Braiins Insights link in footer', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('[Braiins Insights Dashboard]');
      expect(markdown).toContain('https://insights.braiins.com');
    });

    it('should include timestamp in footer', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Timestamp:');
      expect(markdown).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
    });

    it('should format transaction counts with thousands separator', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_1);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('3,245'); // Transaction count formatted
      expect(markdown).toContain('2,987');
      expect(markdown).toContain('3,101');
    });
  });
});
