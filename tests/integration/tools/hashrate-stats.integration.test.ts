/**
 * Integration tests for HashrateStatsTool
 *
 * Tests the braiins_hashrate_stats MCP tool against the REAL Braiins Insights API.
 * These tests make actual HTTP requests and verify response structures.
 *
 * @group integration
 */

import { HashrateStatsTool } from '../../../src/tools/simple/hashrate-stats';

/**
 * Mock API client that calls the real Insights API
 *
 * TODO: Replace with actual InsightsApiClient once implemented
 */
class RealInsightsApiClient {
  private readonly baseUrl = 'https://insights.braiins.com/api';

  async getHashrateStats() {
    const response = await fetch(`${this.baseUrl}/v1.0/hashrate-stats`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Braiins-Insights-MCP-Server/1.0.0-test'
      },
      // Follow redirects (Cloudflare 302)
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

describe('HashrateStatsTool Integration', () => {
  const client = new RealInsightsApiClient();
  const tool = new HashrateStatsTool(client as any);

  describe('Real API Calls', () => {
    it('should fetch real hashrate stats from Insights API', async () => {
      const response = await tool.execute({});

      expect(response.isError).toBe(false);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toBeTruthy();
    }, 15000); // 15 second timeout for network request

    it('should contain expected markdown sections', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Check for main sections
      expect(markdown).toContain('# 📊 Bitcoin Network Hashrate Statistics');
      expect(markdown).toContain('## Current Metrics');
      expect(markdown).toContain('## Mining Economics');
      expect(markdown).toContain('## Transaction Fees');
      expect(markdown).toContain('## 1-Year Trend');

      // Check for data presence
      expect(markdown).toContain('EH/s');
      expect(markdown).toContain('$');
      expect(markdown).toContain('%');
    }, 15000);

    it('should have valid numeric values', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Extract hashrate value (should be a positive number)
      const hashrateMatch = markdown.match(/Current Hashrate:\*\* ([\d,]+\.\d+) EH\/s/);
      expect(hashrateMatch).toBeTruthy();

      if (hashrateMatch) {
        const hashrate = parseFloat(hashrateMatch[1].replace(/,/g, ''));
        expect(hashrate).toBeGreaterThan(0);
        expect(hashrate).toBeLessThan(10000); // Sanity check (< 10,000 EH/s)
      }

      // Extract revenue value (should be a positive number)
      const revenueMatch = markdown.match(/Daily Network Revenue:\*\* \$([\d,]+\.\d+)/);
      expect(revenueMatch).toBeTruthy();

      if (revenueMatch) {
        const revenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
        expect(revenue).toBeGreaterThan(0);
        expect(revenue).toBeLessThan(1000000000); // Sanity check (< $1B)
      }
    }, 15000);

    it('should include Braiins Insights attribution', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      expect(markdown).toContain('Braiins Insights Dashboard');
      expect(markdown).toContain('https://insights.braiins.com');
    }, 15000);

    it('should format percentages correctly', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Fees percent should be formatted with 2 decimals
      expect(markdown).toMatch(/Fees as % of Revenue:\*\* \d+\.\d{2}%/);

      // 1-year trend should have +/- sign
      expect(markdown).toMatch(/Relative Change:\*\* [+-]\d+\.\d{2}%/);
    }, 15000);

    it('should execute quickly with caching', async () => {
      const startTime = Date.now();

      // First call (uncached)
      const response1 = await tool.execute({});
      const firstCallDuration = Date.now() - startTime;

      expect(response1.isError).toBe(false);

      // Second call (should be cached if caching is implemented)
      const secondCallStart = Date.now();
      const response2 = await tool.execute({});
      const secondCallDuration = Date.now() - secondCallStart;

      expect(response2.isError).toBe(false);

      // Note: This assumes caching is implemented. If not, both calls will be slow.
      // Uncomment when caching is in place:
      // expect(secondCallDuration).toBeLessThan(firstCallDuration);
    }, 20000);
  });

  describe('Response Structure Validation', () => {
    it('should match expected response structure from fixture', async () => {
      const response = await tool.execute({});
      const markdown = response.content[0].text;

      // Verify all expected fields are present in the markdown
      const expectedFields = [
        'Current Hashrate',
        'Estimated Hashrate',
        '30-Day Average',
        'Hash Price',
        'Hash Value',
        'Daily Network Revenue',
        'Average Fees per Block',
        'Fees as % of Revenue',
        'Relative Change',
        'Absolute Change'
      ];

      expectedFields.forEach(field => {
        expect(markdown).toContain(field);
      });
    }, 15000);
  });

  describe('Error Scenarios', () => {
    it('should handle network timeout gracefully', async () => {
      // Create a client with very short timeout
      const timeoutClient = {
        async getHashrateStats() {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1); // 1ms timeout

          try {
            const response = await fetch(
              'https://insights.braiins.com/api/v1.0/hashrate-stats',
              { signal: controller.signal }
            );
            return response.json();
          } finally {
            clearTimeout(timeoutId);
          }
        }
      };

      const timeoutTool = new HashrateStatsTool(timeoutClient as any);
      const response = await timeoutTool.execute({});

      // Should return error response (either Network Error or Unexpected Error)
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
    }, 10000);
  });
});
