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

// Sample valid response data matching updated API structure
const SAMPLE_BLOCKS: BraiinsInsightsBlockData[] = [
  {
    height: 875432,
    pool: 'Foundry USA',
    timestamp: '2025-12-16T04:00:00Z',
    block_value_btc: 3.247,
    block_value_usd: 289163.45,
  },
  {
    height: 875431,
    pool: 'AntPool',
    timestamp: '2025-12-16T03:50:00Z',
    block_value_btc: 3.198,
    block_value_usd: 284812.2,
  },
  {
    height: 875430,
    pool: 'F2Pool',
    timestamp: '2025-12-16T03:40:00Z',
    block_value_btc: 3.156,
    block_value_usd: 281071.88,
  },
];

const SAMPLE_BLOCKS_PAGE_2: BraiinsInsightsBlockData[] = [
  {
    height: 875429,
    pool: 'Braiins Pool',
    timestamp: '2025-12-16T03:30:00Z',
    block_value_btc: 3.321,
    block_value_usd: 295753.89,
  },
];

const SAMPLE_BLOCKS_UNKNOWN_POOL: BraiinsInsightsBlockData[] = [
  {
    height: 875428,
    pool: '',
    timestamp: '2025-12-16T03:20:00Z',
    block_value_btc: 3.145,
    block_value_usd: 280091.45,
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
      expect(tool.description).toContain('block');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have valid input schema with limit parameter', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.required).toEqual([]);
    });

    it('should define limit parameter correctly', () => {
      expect(tool.inputSchema.properties.limit.type).toBe('number');
      expect(tool.inputSchema.properties.limit.default).toBe(10);
      expect(tool.inputSchema.properties.limit.minimum).toBe(1);
      expect(tool.inputSchema.properties.limit.maximum).toBe(100);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format blocks successfully with default parameters', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ limit: 10 });
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Recent Bitcoin Blocks');
      expect(markdown).toContain('Foundry USA');
      expect(markdown).toContain('875,432'); // Height is formatted with thousands separator
    });

    it('should apply custom limit parameter', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_PAGE_2);

      const result = await tool.execute({ limit: 20 });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ limit: 20 });
      expect(result.isError).toBe(false);
    });

    it('should include block value in BTC and USD', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Value (BTC)');
      expect(markdown).toContain('3.247'); // BTC value
    });
  });

  describe('execute - pagination', () => {
    it('should handle minimum limit (1)', async () => {
      mockApiClient.getBlocks.mockResolvedValue([SAMPLE_BLOCKS[0]]);

      const result = await tool.execute({ limit: 1 });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ limit: 1 });
      expect(result.isError).toBe(false);
    });

    it('should handle maximum limit (100)', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({ limit: 100 });

      expect(mockApiClient.getBlocks).toHaveBeenCalledWith({ limit: 100 });
      expect(result.isError).toBe(false);
    });

    it('should reject limit exceeding 100', async () => {
      const result = await tool.execute({ limit: 101 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });

    it('should reject limit less than 1', async () => {
      const result = await tool.execute({ limit: 0 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty result set', async () => {
      mockApiClient.getBlocks.mockResolvedValue([]);

      const result = await tool.execute({ limit: 50 });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('No blocks found');
    });

    it('should handle blocks with empty pool name', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS_UNKNOWN_POOL);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Unknown'); // Should show "Unknown" for empty pool
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

  describe('formatRelativeTime branches', () => {
    it('should show "Just now" for blocks mined less than 1 minute ago', async () => {
      const justNowBlock: BraiinsInsightsBlockData[] = [
        {
          height: 875433,
          pool: 'Foundry USA',
          timestamp: new Date().toISOString(),
          block_value_btc: 3.15,
          block_value_usd: 280500.0,
        },
      ];
      mockApiClient.getBlocks.mockResolvedValue(justNowBlock);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Just now');
    });

    it('should show minutes ago for blocks mined 1-59 minutes ago', async () => {
      const thirtyMinsAgo = new Date();
      thirtyMinsAgo.setMinutes(thirtyMinsAgo.getMinutes() - 30);

      const minutesAgoBlock: BraiinsInsightsBlockData[] = [
        {
          height: 875433,
          pool: 'AntPool',
          timestamp: thirtyMinsAgo.toISOString(),
          block_value_btc: 3.2,
          block_value_usd: 284952.0,
        },
      ];
      mockApiClient.getBlocks.mockResolvedValue(minutesAgoBlock);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toMatch(/\d+m ago/);
    });

    it('should show days ago for blocks mined more than 24 hours ago', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const daysAgoBlock: BraiinsInsightsBlockData[] = [
        {
          height: 875400,
          pool: 'F2Pool',
          timestamp: threeDaysAgo.toISOString(),
          block_value_btc: 3.18,
          block_value_usd: 283169.0,
        },
      ];
      mockApiClient.getBlocks.mockResolvedValue(daysAgoBlock);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toMatch(/\d+d ago/);
    });

    it('should show hours ago for blocks mined 1-23 hours ago', async () => {
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

      const hoursAgoBlock: BraiinsInsightsBlockData[] = [
        {
          height: 875433,
          pool: 'Braiins Pool',
          timestamp: fiveHoursAgo.toISOString(),
          block_value_btc: 3.22,
          block_value_usd: 286732.0,
        },
      ];
      mockApiClient.getBlocks.mockResolvedValue(hoursAgoBlock);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(result.isError).toBe(false);
      expect(markdown).toMatch(/\d+h ago/);
    });
  });

  describe('markdown formatting', () => {
    it('should format block table correctly', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('| Height');
      expect(markdown).toContain('| Pool');
      expect(markdown).toContain('Value (BTC)');
    });

    it('should include Braiins Insights link in footer', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('[Braiins Insights Dashboard]');
      expect(markdown).toContain('https://insights.braiins.com');
    });

    it('should include timestamp in footer', async () => {
      mockApiClient.getBlocks.mockResolvedValue(SAMPLE_BLOCKS);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
    });
  });
});
