/**
 * Integration tests for braiins_hashrate_stats tool
 *
 * These tests call the REAL Braiins Insights API.
 * Run with: npm run test:integration
 */

import { HashrateStatsTool } from '../../../src/tools/simple/hashrate-stats.js';
import { createInsightsClient } from '../../../src/api/insights-client.js';

describe('HashrateStatsTool Integration', () => {
  let tool: HashrateStatsTool;

  beforeAll(() => {
    const apiClient = createInsightsClient();
    tool = new HashrateStatsTool(apiClient);
  });

  it('should fetch real hashrate stats from Braiins Insights API', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const markdown = result.content[0].text;

    // Check for expected sections
    expect(markdown).toContain('Bitcoin Network Hashrate Statistics');
    expect(markdown).toContain('Current Metrics');
    expect(markdown).toContain('Mining Economics');
    expect(markdown).toContain('Transaction Fees');
    expect(markdown).toContain('1-Year Trend');

    // Check for data presence (values should be numbers)
    expect(markdown).toMatch(/Current Hashrate:.*\d+.*EH\/s/);
    expect(markdown).toMatch(/Estimated Hashrate:.*\d+.*EH\/s/);
    expect(markdown).toMatch(/30-Day Average:.*\d+.*EH\/s/);
    expect(markdown).toMatch(/Hash Price:.*\$\d+/);
    expect(markdown).toMatch(/Daily Network Revenue:.*\$[\d,]+/);
    expect(markdown).toMatch(/Average Fees per Block:.*\d+.*BTC/);

    // Check attribution
    expect(markdown).toContain('Braiins Insights');
  }, 15000); // 15 second timeout for API call

  it('should return data within reasonable time', async () => {
    const startTime = Date.now();
    const result = await tool.execute({});
    const duration = Date.now() - startTime;

    expect(result.isError).toBe(false);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  it('should return valid hashrate values', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract hashrate values (should be positive numbers in EH/s range)
    const hashrateMatch = markdown.match(/Current Hashrate:.*?([\d,]+\.\d+).*?EH\/s/);
    expect(hashrateMatch).toBeTruthy();

    if (hashrateMatch) {
      const hashrate = parseFloat(hashrateMatch[1].replace(/,/g, ''));
      expect(hashrate).toBeGreaterThan(0);
      expect(hashrate).toBeLessThan(10000); // Sanity check: less than 10,000 EH/s
    }
  }, 10000);

  it('should return valid revenue values', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract revenue value
    const revenueMatch = markdown.match(/Daily Network Revenue:.*?\$([\d,]+\.\d+)/);
    expect(revenueMatch).toBeTruthy();

    if (revenueMatch) {
      const revenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
      expect(revenue).toBeGreaterThan(0);
      expect(revenue).toBeLessThan(1000000000); // Sanity check: less than 1 billion USD/day
    }
  }, 10000);
});
