/**
 * Unit tests for braiins_rss_feed_data tool
 */

import { jest } from '@jest/globals';
import { RSSFeedDataTool } from '../../../src/tools/simple/rss-feed-data.js';
import { InsightsApiError, NetworkError } from '../../../src/api/insights-client.js';

// Mock RSS feed item structure
interface RSSFeedItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  creator?: string;
  categories?: string[];
}

// Mock API client with private get method
const createMockApiClient = () => ({
  get: jest.fn(),
});

// Sample valid RSS feed items
const SAMPLE_RSS_ITEMS: RSSFeedItem[] = [
  {
    title: 'Bitcoin Mining Difficulty Reaches All-Time High',
    link: 'https://braiins.com/blog/bitcoin-mining-difficulty-ath',
    pubDate: '2025-12-13T14:30:00Z',
    description:
      'The Bitcoin network difficulty adjustment reached a new all-time high as hashrate continues to grow.',
    creator: 'Braiins Team',
    categories: ['Bitcoin', 'Mining', 'Difficulty'],
  },
  {
    title: 'Braiins Pool Surpasses 5% Network Hashrate',
    link: 'https://braiins.com/blog/pool-milestone-5-percent',
    pubDate: '2025-12-10T10:15:00Z',
    description: 'Braiins Pool achieves significant milestone in global hashrate distribution.',
    creator: 'Braiins Team',
    categories: ['Mining', 'Pool', 'Milestone'],
  },
  {
    title: 'Understanding Bitcoin Halvings: A Complete Guide',
    link: 'https://braiins.com/blog/bitcoin-halving-guide',
    pubDate: '2025-12-05T08:00:00Z',
    description:
      'Comprehensive guide to Bitcoin halvings, including historical data and future projections.',
    creator: 'Braiins Research',
    categories: ['Bitcoin', 'Education', 'Halving'],
  },
];

describe('RSSFeedDataTool', () => {
  let tool: RSSFeedDataTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new RSSFeedDataTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_rss_feed_data');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('RSS');
      expect(tool.description).toContain('blog');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have empty input schema (no parameters)', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toEqual({});
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format RSS feed items successfully', async () => {
      mockApiClient.get.mockResolvedValue({ items: SAMPLE_RSS_ITEMS });

      const result = await tool.execute({});

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/v1.0/rss-feed-data');
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('📰 Braiins News & Announcements');
      expect(markdown).toContain('Bitcoin Mining Difficulty Reaches All-Time High');
      expect(markdown).toContain('Braiins Pool Surpasses 5% Network Hashrate');
      expect(markdown).toContain('Understanding Bitcoin Halvings: A Complete Guide');
    });

    it('should include links in markdown format', async () => {
      mockApiClient.get.mockResolvedValue({ items: SAMPLE_RSS_ITEMS });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toMatch(/\[.*\]\(https:\/\/braiins\.com\/blog\/.+\)/);
    });

    it('should format publication dates in human-readable format', async () => {
      mockApiClient.get.mockResolvedValue({ items: SAMPLE_RSS_ITEMS });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should contain formatted date (December 13, 2025)
      expect(markdown).toMatch(/\*\*Published:\*\*/);
      expect(markdown).toMatch(/December|Dec/i);
      expect(markdown).toMatch(/2025/);
    });

    it('should include authors when available', async () => {
      mockApiClient.get.mockResolvedValue({ items: SAMPLE_RSS_ITEMS });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Author:** Braiins Team');
    });

    it('should include categories when available', async () => {
      mockApiClient.get.mockResolvedValue({ items: SAMPLE_RSS_ITEMS });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Topics:**');
      expect(markdown).toContain('Bitcoin');
      expect(markdown).toContain('Mining');
    });

    it('should truncate long descriptions', async () => {
      const longDescription = 'A'.repeat(300); // 300 character description
      const itemsWithLongDesc = [
        {
          ...SAMPLE_RSS_ITEMS[0],
          description: longDescription,
        },
      ];

      mockApiClient.get.mockResolvedValue({ items: itemsWithLongDesc });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should be truncated with ellipsis
      expect(markdown).toContain('...');
      // Should not contain the full 300 characters
      expect(markdown.length).toBeLessThan(longDescription.length + 500);
    });
  });

  describe('execute - sorting and limiting', () => {
    it('should sort items by date (newest first)', async () => {
      // Items are already in correct order in SAMPLE_RSS_ITEMS
      mockApiClient.get.mockResolvedValue({ items: SAMPLE_RSS_ITEMS });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Newest item (Dec 13) should appear before older items
      const difficultyIndex = markdown.indexOf('Bitcoin Mining Difficulty');
      const poolIndex = markdown.indexOf('Braiins Pool Surpasses');
      const halvingIndex = markdown.indexOf('Understanding Bitcoin Halvings');

      expect(difficultyIndex).toBeLessThan(poolIndex);
      expect(poolIndex).toBeLessThan(halvingIndex);
    });

    it('should limit display to 10 items max', async () => {
      // Create 15 items
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        title: `Post ${i + 1}`,
        link: `https://braiins.com/blog/post-${i + 1}`,
        pubDate: new Date(Date.now() - i * 86400000).toISOString(), // Each day older
        description: `Description for post ${i + 1}`,
      }));

      mockApiClient.get.mockResolvedValue({ items: manyItems });

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      // Should show "Showing 10 of 15 total posts"
      expect(markdown).toContain('10 of 15');
      expect(markdown).toContain('Post 1');
      expect(markdown).toContain('Post 10');
      expect(markdown).not.toContain('Post 11'); // Should not show 11th item
    });
  });

  describe('execute - edge cases', () => {
    it('should handle empty feed gracefully', async () => {
      mockApiClient.get.mockResolvedValue({ items: [] });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('No recent posts available');
    });

    it('should handle API response as array (without items wrapper)', async () => {
      mockApiClient.get.mockResolvedValue(SAMPLE_RSS_ITEMS);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Mining Difficulty');
    });

    it('should handle items without optional fields', async () => {
      const minimalItems = [
        {
          title: 'Minimal Post',
          link: 'https://braiins.com/blog/minimal',
          pubDate: '2025-12-14T12:00:00Z',
          // No description, creator, or categories
        },
      ];

      mockApiClient.get.mockResolvedValue({ items: minimalItems });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('Minimal Post');
      expect(markdown).not.toContain('**Author:**');
      expect(markdown).not.toContain('**Topics:**');
    });

    it('should handle invalid date formats gracefully', async () => {
      const itemsWithBadDate = [
        {
          title: 'Post with bad date',
          link: 'https://braiins.com/blog/bad-date',
          pubDate: 'invalid-date-format',
        },
      ];

      mockApiClient.get.mockResolvedValue({ items: itemsWithBadDate });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      // Should still show the post, using original date string
      expect(markdown).toContain('Post with bad date');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API unavailable', 503, '/v1.0/rss-feed-data');
      mockApiClient.get.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('503');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('Connection timeout');
      mockApiClient.get.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('Connection timeout');
    });

    it('should handle unexpected response format', async () => {
      mockApiClient.get.mockResolvedValue({ unexpected: 'format' });

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should handle null response', async () => {
      mockApiClient.get.mockResolvedValue(null);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });
});
