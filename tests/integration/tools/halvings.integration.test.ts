/**
 * Integration tests for braiins_halvings tool
 *
 * These tests call the REAL Braiins Insights API.
 * Run with: npm run test:integration
 */

import { HalvingsTool } from '../../../src/tools/simple/halvings.js';
import { createInsightsClient } from '../../../src/api/insights-client.js';

describe('HalvingsTool Integration', () => {
  let tool: HalvingsTool;

  beforeAll(() => {
    const apiClient = createInsightsClient();
    tool = new HalvingsTool(apiClient);
  });

  it('should fetch real halving data from Braiins Insights API', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const markdown = result.content[0].text;

    // Check for expected sections
    expect(markdown).toContain('Bitcoin Halving Schedule');
    expect(markdown).toContain('Next Halving');
    expect(markdown).toContain('Braiins Insights');
  }, 15000); // 15 second timeout for API call

  it('should return data within reasonable time', async () => {
    const startTime = Date.now();
    const result = await tool.execute({});
    const duration = Date.now() - startTime;

    expect(result.isError).toBe(false);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  it('should contain essential halving metrics', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Check for key metrics
    expect(markdown).toMatch(/Estimated Date:/);
    expect(markdown).toMatch(/Countdown:/);
    expect(markdown).toMatch(/Block Height:/);
    expect(markdown).toMatch(/Current Block Height:/);
    expect(markdown).toMatch(/Blocks Remaining:/);
    expect(markdown).toMatch(/Current Block Reward:.*BTC/);
    expect(markdown).toMatch(/Next Block Reward:.*BTC/);
  }, 10000);

  it('should return valid block reward values', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract current and next block rewards
    const currentRewardMatch = markdown.match(/Current Block Reward:\s*([\d.]+)\s*BTC/);
    const nextRewardMatch = markdown.match(/Next Block Reward:\s*([\d.]+)\s*BTC/);

    expect(currentRewardMatch).toBeTruthy();
    expect(nextRewardMatch).toBeTruthy();

    if (currentRewardMatch && nextRewardMatch) {
      const currentReward = parseFloat(currentRewardMatch[1]);
      const nextReward = parseFloat(nextRewardMatch[1]);

      // Current reward should be positive
      expect(currentReward).toBeGreaterThan(0);

      // Next reward should be half of current (halving!)
      expect(nextReward).toBeCloseTo(currentReward / 2, 4);

      // Sanity check: rewards should be within known Bitcoin reward range (0-50 BTC)
      expect(currentReward).toBeLessThanOrEqual(50);
      expect(nextReward).toBeLessThanOrEqual(25);
    }
  }, 10000);

  it('should return valid block heights', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract block heights (remove commas for parsing)
    const currentHeightMatch = markdown.match(/Current Block Height:\s*([\d,]+)/);
    const nextHeightMatch = markdown.match(/Block Height:\s*([\d,]+)/); // Next halving block height
    const blocksRemainingMatch = markdown.match(/Blocks Remaining:\s*([\d,]+)/);

    expect(currentHeightMatch).toBeTruthy();
    expect(nextHeightMatch).toBeTruthy();
    expect(blocksRemainingMatch).toBeTruthy();

    if (currentHeightMatch && nextHeightMatch && blocksRemainingMatch) {
      const currentHeight = parseInt(currentHeightMatch[1].replace(/,/g, ''), 10);
      const nextHeight = parseInt(nextHeightMatch[1].replace(/,/g, ''), 10);
      const blocksRemaining = parseInt(blocksRemainingMatch[1].replace(/,/g, ''), 10);

      // Current block height should be positive and reasonable (>0)
      expect(currentHeight).toBeGreaterThan(0);

      // Next halving block should be higher than current
      expect(nextHeight).toBeGreaterThan(currentHeight);

      // Blocks remaining should equal the difference
      expect(blocksRemaining).toBe(nextHeight - currentHeight);

      // Bitcoin halvings occur every 210,000 blocks
      // Blocks remaining should be less than 210,000
      expect(blocksRemaining).toBeLessThanOrEqual(210000);
      expect(blocksRemaining).toBeGreaterThanOrEqual(0);
    }
  }, 10000);

  it('should format countdown properly', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Countdown should be present and formatted
    const countdownMatch = markdown.match(/Countdown:\s*(.+)/);
    expect(countdownMatch).toBeTruthy();

    if (countdownMatch) {
      const countdown = countdownMatch[1].trim();

      // Should contain either time units (years/days/hours) or "already occurred"
      const hasTimeUnits = /\d+\s+(year|day|hour)/.test(countdown);
      const hasOccurred = /already occurred/i.test(countdown);

      expect(hasTimeUnits || hasOccurred).toBe(true);
    }
  }, 10000);

  it('should format dates in human-readable format', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Extract estimated date
    const dateMatch = markdown.match(/Estimated Date:\s*(.+)/);
    expect(dateMatch).toBeTruthy();

    if (dateMatch) {
      const dateString = dateMatch[1].trim();

      // Should contain month names and year
      const hasMonthName =
        /(January|February|March|April|May|June|July|August|September|October|November|December)/.test(
          dateString
        );
      const hasYear = /\d{4}/.test(dateString);

      expect(hasMonthName || hasYear).toBe(true);
    }
  }, 10000);

  it('should include historical halvings if available', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Check if historical halvings section exists
    if (markdown.includes('Historical Halvings')) {
      // Should have a table structure
      expect(markdown).toMatch(/\|\s*Halving\s*\|/);
      expect(markdown).toMatch(/\|\s*Date\s*\|/);
      expect(markdown).toMatch(/\|\s*Block Height\s*\|/);
      expect(markdown).toMatch(/\|\s*Block Reward\s*\|/);

      // Should have ordinal numbers (1st, 2nd, 3rd, etc.)
      expect(markdown).toMatch(/\d+(st|nd|rd|th)/);
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

  it('should format block heights with thousands separators', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Large block heights should have commas
    const blockHeightMatches = markdown.match(/Block Height:\s*([\d,]+)/g);
    expect(blockHeightMatches).toBeTruthy();

    if (blockHeightMatches) {
      // At least one block height should have a comma (for numbers >= 1,000)
      const hasComma = blockHeightMatches.some((match) => match.includes(','));
      expect(hasComma).toBe(true);
    }
  }, 10000);

  it('should calculate valid halving schedule', async () => {
    const result = await tool.execute({});
    const markdown = result.content[0].text;

    // Bitcoin halving schedule is deterministic
    // Next halving block heights are multiples of 210,000
    const nextHeightMatch = markdown.match(/Block Height:\s*([\d,]+)/);

    if (nextHeightMatch) {
      const nextHeight = parseInt(nextHeightMatch[1].replace(/,/g, ''), 10);

      // Next halving should be at a multiple of 210,000
      expect(nextHeight % 210000).toBe(0);
    }
  }, 10000);
});
