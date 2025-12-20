/**
 * MCP Tool: braiins_rss_feed_data
 *
 * Fetches recent Braiins blog posts and announcements from the RSS feed data API.
 * Displays recent posts with titles, publication dates, links, and summaries.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v1.0/rss-feed-data
 */

import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * RSS feed item structure (simplified for initial implementation)
 */
interface RSSFeedItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  creator?: string;
  categories?: string[];
}

/**
 * RSS Feed Data Tool
 *
 * Simple stats tool that fetches recent Braiins blog posts and announcements
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class RSSFeedDataTool {
  /** MCP tool name */
  readonly name = 'braiins_rss_feed_data';

  /** Tool description shown to LLM */
  readonly description =
    'Get recent Braiins blog posts, announcements, and news from the Braiins Insights RSS feed. ' +
    'Returns titles, publication dates, links, and summaries of the latest content.';

  /** JSON schema for tool inputs (no parameters) */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  };

  /** Maximum number of items to display */
  private readonly MAX_ITEMS = 10;

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param _input - No input parameters expected (empty object)
   * @returns MCP response with formatted markdown
   */
  async execute(_input: unknown): Promise<MCPToolResponse> {
    try {
      // Fetch data from API
      const feedData = await this.fetchRSSFeed();

      // Format as markdown
      const markdown = this.formatAsMarkdown(feedData);

      return {
        content: [
          {
            type: 'text',
            text: markdown,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch RSS feed data from the API
   *
   * Note: Using raw get method since getRSSFeedData doesn't exist yet in client
   */
  private async fetchRSSFeed(): Promise<{ items: RSSFeedItem[] }> {
    // For now, we'll call the endpoint directly
    // This will be updated once the client method is added
    const endpoint = '/v1.0/rss-feed-data';

    try {
      // Access the private get method via type assertion (temporary workaround)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const client = this.apiClient as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const data = await client.get(endpoint);

      // Validate basic structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid RSS feed response format');
      }

      // Handle different possible response formats
      if (Array.isArray(data)) {
        // If response is directly an array of items
        return { items: data as RSSFeedItem[] };
      } else if (data && typeof data === 'object' && 'items' in data) {
        // If response has items property
        return data as { items: RSSFeedItem[] };
      } else {
        // Unknown format
        throw new Error('Unexpected RSS feed data structure');
      }
    } catch (error) {
      if (error instanceof InsightsApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to fetch RSS feed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Format RSS feed data as markdown for LLM consumption
   */
  private formatAsMarkdown(feedData: { items: RSSFeedItem[] }): string {
    const items = feedData.items || [];

    if (items.length === 0) {
      return `
# 📰 Braiins News & Announcements

**No recent posts available at this time.**

---

*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*
      `.trim();
    }

    // Sort items by date (newest first)
    const sortedItems = this.sortByDate(items);

    // Limit to MAX_ITEMS
    const displayItems = sortedItems.slice(0, this.MAX_ITEMS);

    // Build markdown sections
    const sections = ['# 📰 Braiins News & Announcements', '', '**Recent Posts:**', ''];

    displayItems.forEach((item, index) => {
      sections.push(...this.formatFeedItem(item, index + 1));
      sections.push(''); // Empty line between items
    });

    sections.push('---');
    sections.push('');
    sections.push(`**Total Items:** ${displayItems.length}`);

    if (items.length > this.MAX_ITEMS) {
      sections.push(`(Showing ${this.MAX_ITEMS} of ${items.length} total posts)`);
    }

    sections.push('');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
  }

  /**
   * Format a single feed item as markdown
   */
  private formatFeedItem(item: RSSFeedItem, index: number): string[] {
    const lines: string[] = [];

    // Title as header with link
    lines.push(`### ${index}. [${item.title}](${item.link})`);

    // Publication date
    const formattedDate = this.formatPublicationDate(item.pubDate);
    lines.push(`- **Published:** ${formattedDate}`);

    // Creator if available
    if (item.creator) {
      lines.push(`- **Author:** ${item.creator}`);
    }

    // Categories if available
    if (item.categories && item.categories.length > 0) {
      lines.push(`- **Topics:** ${item.categories.join(', ')}`);
    }

    // Description/summary if available
    if (item.description) {
      const truncatedDescription = this.truncateSummary(item.description, 200);
      lines.push('');
      lines.push(truncatedDescription);
    }

    return lines;
  }

  /**
   * Sort feed items by publication date (newest first)
   */
  private sortByDate(items: RSSFeedItem[]): RSSFeedItem[] {
    return [...items].sort((a, b) => {
      try {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA; // Newest first
      } catch {
        return 0; // Keep original order if dates are invalid
      }
    });
  }

  /**
   * Format publication date in human-readable format
   */
  private formatPublicationDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return dateString; // Return original string if parsing fails
    }
  }

  /**
   * Truncate summary text to maximum length
   */
  private truncateSummary(text: string, maxLength: number): string {
    // Remove HTML tags if present - loop until stable to handle nested/malformed tags
    // This prevents bypass attacks like "<<script>script>" which would leave "<script>" after one pass
    let cleanText = text;
    let previousText: string;
    do {
      previousText = cleanText;
      cleanText = cleanText.replace(/<[^>]*>/g, '');
    } while (cleanText !== previousText);
    cleanText = cleanText.trim();

    if (cleanText.length <= maxLength) {
      return cleanText;
    }

    // Truncate at word boundary
    const truncated = cleanText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Handle errors and return MCP error response
   */
  private handleError(error: unknown): MCPToolResponse {
    if (error instanceof InsightsApiError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **API Error**: ${error.message}\n\nStatus: ${error.statusCode}\n\nPlease try again later or check the Braiins Insights API status.`,
          },
        ],
        isError: true,
      };
    }

    if (error instanceof NetworkError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Network Error**: Could not reach Braiins Insights API\n\nDetails: ${error.message}\n\nPlease check your internet connection.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `❌ **Unexpected Error**: ${error instanceof Error ? error.message : String(error)}\n\nPlease report this issue if it persists.`,
        },
      ],
      isError: true,
    };
  }
}
