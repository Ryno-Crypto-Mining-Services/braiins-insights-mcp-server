/**
 * Integration tests for braiins_blocks tool
 *
 * These tests call the REAL Braiins Insights API.
 * Run with: npm run test:integration
 */

import { BlocksTool } from '../../../src/tools/parameterized/blocks.js';
import { createInsightsClient } from '../../../src/api/insights-client.js';

describe('BlocksTool Integration', () => {
  let tool: BlocksTool;

  beforeAll(() => {
    const apiClient = createInsightsClient();
    tool = new BlocksTool(apiClient);
  });

  it('should fetch real blocks data from Braiins Insights API with default params', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const markdown = result.content[0].text;

    // Check for expected sections
    expect(markdown).toContain('Recent Bitcoin Blocks');
    expect(markdown).toContain('Braiins Insights');
  }, 15000); // 15 second timeout for API call

  it('should return data within reasonable time', async () => {
    const startTime = Date.now();
    const result = await tool.execute({});
    const duration = Date.now() - startTime;

    expect(result.isError).toBe(false);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  it('should contain block table with required columns', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Check for table headers
    expect(markdown).toMatch(/\|\s*Height\s*\|/);
    expect(markdown).toMatch(/\|\s*Pool\s*\|/);
    expect(markdown).toMatch(/\|\s*Timestamp\s*\|/);
    expect(markdown).toMatch(/\|\s*Transactions\s*\|/);
    expect(markdown).toMatch(/\|\s*Size\s*\|/);
    expect(markdown).toMatch(/\|\s*Hash/);
  }, 10000);

  it('should display valid block data', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract first data row from table (skip header and separator)
    const rows = markdown.split('\n').filter((line) => line.trim().startsWith('|'));
    const dataRows = rows.slice(2); // Skip header and separator

    if (dataRows.length > 0) {
      const firstRow = dataRows[0];

      // Should contain numeric block height
      expect(firstRow).toMatch(/\|\s*[\d,]+\s*\|/);

      // Should contain pool name (non-empty string)
      expect(firstRow).toMatch(/\|\s*\w+/);

      // Should contain timestamp (relative time format like "2m ago" or "1h ago")
      expect(firstRow).toMatch(/(Just now|\d+[mhd]\s+ago)/);

      // Should contain transaction count
      expect(firstRow).toMatch(/\|\s*[\d,]+\s*\|/);

      // Should contain size in MB
      expect(firstRow).toMatch(/\d+\.\d+\s*MB/);

      // Should contain block hash
      expect(firstRow).toMatch(/`[a-f0-9]+\.{3}[a-f0-9]+`/);
    }
  }, 10000);

  it('should respect page parameter', async () => {
    const result = await tool.execute({ page: 1, page_size: 5 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Should show page number in filters
    expect(markdown).toMatch(/Page:\s*1/);
    expect(markdown).toMatch(/Page Size:\s*5/);
  }, 10000);

  it('should limit results according to page_size', async () => {
    const result = await tool.execute({ page: 1, page_size: 3 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Count data rows in table
    const rows = markdown.split('\n').filter((line) => line.trim().startsWith('|'));
    const dataRows = rows.slice(2); // Skip header and separator

    // Should not exceed page_size (3)
    expect(dataRows.length).toBeLessThanOrEqual(3);

    // Should show correct page size in filters
    expect(markdown).toMatch(/Page Size:\s*3/);
  }, 10000);

  it('should validate page parameter bounds', async () => {
    const result = await tool.execute({ page: 0 }); // Invalid: page must be >= 1

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Validation Error');
    expect(result.content[0].text).toMatch(/page.*at least 1/i);
  }, 10000);

  it('should validate page_size parameter bounds', async () => {
    const resultTooSmall = await tool.execute({ page_size: 0 }); // Invalid: page_size must be >= 1
    expect(resultTooSmall.isError).toBe(true);
    expect(resultTooSmall.content[0].text).toContain('Validation Error');
    expect(resultTooSmall.content[0].text).toMatch(/page_size.*at least 1/i);

    const resultTooBig = await tool.execute({ page_size: 101 }); // Invalid: page_size must be <= 100
    expect(resultTooBig.isError).toBe(true);
    expect(resultTooBig.content[0].text).toContain('Validation Error');
    expect(resultTooBig.content[0].text).toMatch(/page_size.*cannot exceed 100/i);
  }, 20000); // Longer timeout for multiple API calls

  it('should handle date filtering with start_date', async () => {
    const result = await tool.execute({
      page: 1,
      page_size: 5,
      start_date: '2025-01-01',
    });

    expect(result.isError).toBe(false);
    const markdown = result.content[0].text;

    // Should show date filter in output
    expect(markdown).toMatch(/Start Date:\s*2025-01-01/);
  }, 10000);

  it('should handle date filtering with end_date', async () => {
    const result = await tool.execute({
      page: 1,
      page_size: 5,
      end_date: '2025-12-31',
    });

    expect(result.isError).toBe(false);
    const markdown = result.content[0].text;

    // Should show date filter in output
    expect(markdown).toMatch(/End Date:\s*2025-12-31/);
  }, 10000);

  it('should validate date format', async () => {
    const result = await tool.execute({
      start_date: 'invalid-date',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Validation Error');
    expect(result.content[0].text).toMatch(/YYYY-MM-DD/);
  }, 10000);

  it('should validate date range order', async () => {
    const result = await tool.execute({
      start_date: '2025-12-31',
      end_date: '2025-01-01', // End before start - invalid!
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Validation Error');
    expect(result.content[0].text).toMatch(/start_date.*before.*end_date/i);
  }, 10000);

  it('should display summary statistics', async () => {
    const result = await tool.execute({ page_size: 5 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Should contain summary section
    expect(markdown).toMatch(/Summary:/);
    expect(markdown).toMatch(/Total Blocks Displayed:/);
    expect(markdown).toMatch(/Average Block Size:.*MB/);
    expect(markdown).toMatch(/Average Transactions\/Block:/);
  }, 10000);

  it('should format block heights with thousands separators', async () => {
    const result = await tool.execute({ page_size: 5 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Block heights should have commas (e.g., 876,543)
    expect(markdown).toMatch(/\|\s*[\d,]{7,}\s*\|/); // At least 7 digits with commas
  }, 10000);

  it('should format relative timestamps', async () => {
    const result = await tool.execute({ page_size: 5 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Should contain relative time formats
    const hasRelativeTime =
      /Just now/.test(markdown) ||
      /\d+m ago/.test(markdown) ||
      /\d+h ago/.test(markdown) ||
      /\d+d ago/.test(markdown);

    expect(hasRelativeTime).toBe(true);
  }, 10000);

  it('should truncate block hashes', async () => {
    const result = await tool.execute({ page_size: 5 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Block hashes should be truncated (e.g., `0000000000...abc123`)
    expect(markdown).toMatch(/`[a-f0-9]+\.{3}[a-f0-9]+`/);
  }, 10000);

  it('should handle empty results gracefully', async () => {
    // Request a very old date range that likely has no blocks
    const result = await tool.execute({
      start_date: '2008-01-01',
      end_date: '2008-01-02', // Before Bitcoin existed
    });

    expect(result.isError).toBe(false);
    const markdown = result.content[0].text;

    // Should show "No blocks found" or similar message
    expect(markdown).toMatch(/No blocks found|No blocks/i);
  }, 10000);

  it('should include attribution to Braiins Insights', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    expect(markdown).toContain('Braiins Insights');
    expect(markdown).toContain('insights.braiins.com');
  }, 10000);

  it('should include timestamp metadata', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Should include ISO timestamp
    expect(markdown).toMatch(/Timestamp:.*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  }, 10000);

  it('should calculate valid summary statistics', async () => {
    const result = await tool.execute({ page_size: 10 });
    const markdown = result.content[0].text;

    expect(result.isError).toBe(false);

    // Extract summary values
    const avgSizeMatch = markdown.match(/Average Block Size:\s*([\d.]+)\s*MB/);
    const avgTxMatch = markdown.match(/Average Transactions\/Block:\s*([\d,]+)/);

    if (avgSizeMatch) {
      const avgSize = parseFloat(avgSizeMatch[1]);
      expect(avgSize).toBeGreaterThan(0);
      expect(avgSize).toBeLessThan(10); // Sanity check: blocks are typically < 10 MB
    }

    if (avgTxMatch) {
      const avgTx = parseInt(avgTxMatch[1].replace(/,/g, ''), 10);
      expect(avgTx).toBeGreaterThan(0);
      expect(avgTx).toBeLessThan(100000); // Sanity check: reasonable tx count
    }
  }, 10000);
});
