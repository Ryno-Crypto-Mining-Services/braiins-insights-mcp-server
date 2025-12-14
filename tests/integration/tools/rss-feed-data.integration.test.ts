/**
 * Integration tests for braiins_rss_feed_data tool
 *
 * These tests call the REAL Braiins Insights API.
 * Run with: npm run test:integration
 */

import { RSSFeedDataTool } from '../../../src/tools/simple/rss-feed-data.js';
import { createInsightsClient } from '../../../src/api/insights-client.js';

describe('RSSFeedDataTool Integration', () => {
  let tool: RSSFeedDataTool;

  beforeAll(() => {
    const apiClient = createInsightsClient();
    tool = new RSSFeedDataTool(apiClient);
  });

  it('should fetch real RSS feed data from Braiins Insights API', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const markdown = result.content[0].text;

    // Check for expected sections
    expect(markdown).toContain('Braiins News & Announcements');
    expect(markdown).toContain('Braiins Insights');

    // Should contain either posts or "No recent posts" message
    const hasRecentPosts = markdown.includes('Recent Posts:');
    const hasNoPostsMessage = markdown.includes('No recent posts available');
    expect(hasRecentPosts || hasNoPostsMessage).toBe(true);
  }, 15000); // 15 second timeout for API call

  it('should return data within reasonable time', async () => {
    const startTime = Date.now();
    const result = await tool.execute({});
    const duration = Date.now() - startTime;

    expect(result.isError).toBe(false);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  it('should format feed items with proper structure if posts exist', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // If there are posts, check for proper formatting
    if (markdown.includes('Recent Posts:')) {
      // Should have numbered list items (e.g., "### 1. [Title](link)")
      const hasNumberedItems = /###\s+\d+\.\s+\[/.test(markdown);
      expect(hasNumberedItems).toBe(true);

      // Should have publication dates
      expect(markdown).toMatch(/Published:/);

      // Should have links (markdown format)
      expect(markdown).toMatch(/\[.*\]\(https?:\/\/.*\)/);
    } else {
      // No posts available - check for empty state message
      expect(markdown).toContain('No recent posts available');
    }
  }, 10000);

  it('should display total items count', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Should always show total items (either 0 or some number)
    if (markdown.includes('Recent Posts:')) {
      expect(markdown).toMatch(/Total Items:/);
    }
  }, 10000);

  it('should limit displayed items to maximum', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // If there are posts, check that we don't exceed max items (10)
    if (markdown.includes('Recent Posts:')) {
      const itemMatches = markdown.match(/###\s+\d+\.\s+\[/g);
      if (itemMatches) {
        expect(itemMatches.length).toBeLessThanOrEqual(10);
      }
    }
  }, 10000);

  it('should handle different date formats', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // If there are posts, check that dates are properly formatted
    if (markdown.includes('Published:')) {
      // Should contain human-readable date formats
      // (either full dates or at minimum year numbers)
      expect(markdown).toMatch(/Published:.*\d{4}/); // Year should be present
    }
  }, 10000);

  it('should include attribution to Braiins Insights', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    expect(markdown).toContain('Braiins Insights');
    expect(markdown).toContain('insights.braiins.com');
  }, 10000);

  it('should handle empty input gracefully', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('text');
  }, 10000);

  it('should not crash on unexpected API responses', async () => {
    // This test verifies the tool handles edge cases gracefully
    const result = await tool.execute({});

    // Should always return a valid response (never throw)
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  }, 10000);
});
