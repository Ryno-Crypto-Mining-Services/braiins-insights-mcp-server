/**
 * Integration tests for braiins_difficulty_stats tool
 *
 * These tests call the REAL Braiins Insights API.
 * Run with: npm run test:integration
 */

import { DifficultyStatsTool } from '../../../src/tools/simple/difficulty-stats.js';
import { createInsightsClient } from '../../../src/api/insights-client.js';

describe('DifficultyStatsTool Integration', () => {
  let tool: DifficultyStatsTool;

  beforeAll(() => {
    const apiClient = createInsightsClient();
    tool = new DifficultyStatsTool(apiClient);
  });

  it('should fetch real difficulty stats from Braiins Insights API', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const markdown = result.content[0].text;

    // Check for expected sections
    expect(markdown).toContain('Bitcoin Network Difficulty Statistics');
    expect(markdown).toContain('Current Metrics');
    expect(markdown).toContain('Next Adjustment');

    // Check for data presence (values should be numbers)
    expect(markdown).toMatch(/Current Difficulty:.*\d+/);
    expect(markdown).toMatch(/Estimated Next Difficulty:.*\d+/);
    expect(markdown).toMatch(/Estimated Change:.*[+-]\d+\.\d+%/);
    expect(markdown).toMatch(/Blocks Until Adjustment:.*\d+/);

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

  it('should return valid difficulty values', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract difficulty value (should be in scientific notation)
    const difficultyMatch = markdown.match(/Current Difficulty:.*?([\d.]+e[+-]\d+)/);
    expect(difficultyMatch).toBeTruthy();

    if (difficultyMatch) {
      const difficulty = parseFloat(difficultyMatch[1]);
      expect(difficulty).toBeGreaterThan(0);
      expect(difficulty).toBeLessThan(1e20); // Sanity check: reasonable difficulty range
    }
  }, 10000);

  it('should return valid blocks until adjustment', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract blocks until adjustment
    const blocksMatch = markdown.match(/Blocks Until Adjustment:.*?([\d,]+)/);
    expect(blocksMatch).toBeTruthy();

    if (blocksMatch) {
      const blocks = parseInt(blocksMatch[1].replace(/,/g, ''), 10);
      expect(blocks).toBeGreaterThanOrEqual(0);
      expect(blocks).toBeLessThanOrEqual(2016); // Max blocks in a difficulty period
    }
  }, 10000);

  it('should return valid percentage change', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract difficulty change percentage
    const percentMatch = markdown.match(/Estimated Change:.*?([+-]\d+\.\d+)%/);
    expect(percentMatch).toBeTruthy();

    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      expect(percent).toBeGreaterThan(-50); // Sanity check: unlikely to drop >50%
      expect(percent).toBeLessThan(50); // Sanity check: unlikely to increase >50%
    }
  }, 10000);

  it('should include timestamps or dates if available', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Check if timestamps are present (optional fields)
    // At least one of these should be present in real data
    const hasEstimatedAdjustment = markdown.includes('Estimated Adjustment Time');
    const hasLastAdjustment = markdown.includes('Last Adjustment');
    const hasTimestamp = markdown.includes('Timestamp:');

    // At least one timestamp-related field should exist
    expect(hasEstimatedAdjustment || hasLastAdjustment || hasTimestamp).toBe(true);
  }, 10000);
});
