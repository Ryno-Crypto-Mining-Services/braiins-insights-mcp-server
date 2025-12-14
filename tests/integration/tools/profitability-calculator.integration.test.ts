/**
 * Integration tests for braiins_profitability_calculator tool
 *
 * These tests call the REAL Braiins Insights API.
 * Run with: npm run test:integration
 */

import { ProfitabilityCalculatorTool } from '../../../src/tools/parameterized/profitability-calculator.js';
import { createInsightsClient } from '../../../src/api/insights-client.js';

describe('ProfitabilityCalculatorTool Integration', () => {
  let tool: ProfitabilityCalculatorTool;

  beforeAll(() => {
    const apiClient = createInsightsClient();
    tool = new ProfitabilityCalculatorTool(apiClient);
  });

  it('should fetch real profitability data from Braiins Insights API', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const markdown = result.content[0].text;

    // Check for expected sections
    expect(markdown).toContain('Bitcoin Mining Profitability Analysis');
    expect(markdown).toContain('Input Parameters');
    expect(markdown).toContain('Profitability Metrics');
    expect(markdown).toContain('Braiins Insights');
  }, 15000); // 15 second timeout for API call

  it('should return data within reasonable time', async () => {
    const startTime = Date.now();
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });
    const duration = Date.now() - startTime;

    expect(result.isError).toBe(false);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  }, 10000);

  it('should display input parameters correctly', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.07,
      hardware_efficiency_jth: 30,
    });

    const markdown = result.content[0].text;

    // Check that input params are shown
    expect(markdown).toMatch(/Electricity Cost:.*\$0\.0700\/kWh/);
    expect(markdown).toMatch(/Hardware Efficiency:.*30\.0 J\/TH/);
  }, 10000);

  it('should include all required profitability metrics', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Daily metrics
    expect(markdown).toMatch(/Daily Revenue:.*\$[\d.]+\/TH/);
    expect(markdown).toMatch(/Daily Electricity Cost:.*\$[\d.]+\/TH/);
    expect(markdown).toMatch(/Net Daily Profit:.*\$[\d.]+\/TH/);

    // Extended projections
    expect(markdown).toMatch(/Monthly Profit:.*\$[\d.]+\/TH/);
    expect(markdown).toMatch(/Annual Profit:.*\$[\d.]+\/TH/);
  }, 10000);

  it('should include break-even analysis', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    expect(markdown).toContain('Break-Even Analysis');
    expect(markdown).toMatch(/Break-even BTC Price:.*\$/);
    expect(markdown).toMatch(/Current BTC Price:.*\$/);
    expect(markdown).toMatch(/Break-even Hashrate:.*TH\/s/);
    expect(markdown).toMatch(/Profitability Threshold:.*\/kWh/);
  }, 10000);

  it('should show profitability indicator', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Should have either ✅ or ❌ emoji indicating profitability
    const hasProfitableIndicator = markdown.includes('✅');
    const hasUnprofitableIndicator = markdown.includes('❌');

    expect(hasProfitableIndicator || hasUnprofitableIndicator).toBe(true);
  }, 10000);

  it('should include ROI calculation when hardware_cost_usd provided', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
      hardware_cost_usd: 5000,
    });

    const markdown = result.content[0].text;

    expect(markdown).toContain('Return on Investment');
    expect(markdown).toMatch(/Hardware Cost:.*\$5,000\.00/);
    expect(markdown).toMatch(/Estimated ROI Period:.*days/);
  }, 10000);

  it('should omit ROI section when hardware_cost_usd not provided', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Should NOT have ROI section
    expect(markdown).not.toContain('Return on Investment');
  }, 10000);

  it('should validate electricity_cost_kwh parameter', async () => {
    // Negative electricity cost
    const resultNegative = await tool.execute({
      electricity_cost_kwh: -0.01,
      hardware_efficiency_jth: 25,
    });

    expect(resultNegative.isError).toBe(true);
    expect(resultNegative.content[0].text).toContain('Invalid Input Parameters');
    expect(resultNegative.content[0].text).toMatch(/cannot be negative/i);

    // Unreasonably high electricity cost
    const resultTooHigh = await tool.execute({
      electricity_cost_kwh: 2.0,
      hardware_efficiency_jth: 25,
    });

    expect(resultTooHigh.isError).toBe(true);
    expect(resultTooHigh.content[0].text).toContain('Invalid Input Parameters');
    expect(resultTooHigh.content[0].text).toMatch(/unreasonably high/i);
  }, 20000); // Longer timeout for multiple tests

  it('should validate hardware_efficiency_jth parameter', async () => {
    // Efficiency too low
    const resultTooLow = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 0.5,
    });

    expect(resultTooLow.isError).toBe(true);
    expect(resultTooLow.content[0].text).toContain('Invalid Input Parameters');
    expect(resultTooLow.content[0].text).toMatch(/at least 1/i);

    // Efficiency too high
    const resultTooHigh = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 250,
    });

    expect(resultTooHigh.isError).toBe(true);
    expect(resultTooHigh.content[0].text).toContain('Invalid Input Parameters');
    expect(resultTooHigh.content[0].text).toMatch(/unreasonably high/i);
  }, 20000); // Longer timeout for multiple tests

  it('should validate hardware_cost_usd parameter', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
      hardware_cost_usd: -1000,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid Input Parameters');
    expect(result.content[0].text).toMatch(/cannot be negative/i);
  }, 10000);

  it('should require both required parameters', async () => {
    // Missing electricity_cost_kwh
    const resultMissingElectricity = await tool.execute({
      hardware_efficiency_jth: 25,
    });

    expect(resultMissingElectricity.isError).toBe(true);

    // Missing hardware_efficiency_jth
    const resultMissingEfficiency = await tool.execute({
      electricity_cost_kwh: 0.05,
    });

    expect(resultMissingEfficiency.isError).toBe(true);
  }, 20000);

  it('should calculate realistic profitability values', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Extract daily revenue
    const revenueMatch = markdown.match(/Daily Revenue:.*\$([\d.]+)\/TH/);
    if (revenueMatch) {
      const revenue = parseFloat(revenueMatch[1]);
      expect(revenue).toBeGreaterThan(0);
      expect(revenue).toBeLessThan(1); // Sanity check: should be less than $1/TH/day
    }

    // Extract daily cost
    const costMatch = markdown.match(/Daily Electricity Cost:.*\$([\d.]+)\/TH/);
    if (costMatch) {
      const cost = parseFloat(costMatch[1]);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Sanity check: should be less than $1/TH/day
    }

    // Extract BTC price
    const priceMatch = markdown.match(/Current BTC Price:.*\$([\d,]+)/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      expect(price).toBeGreaterThan(1000); // BTC should be > $1,000
      expect(price).toBeLessThan(1000000); // BTC should be < $1,000,000 (sanity check)
    }
  }, 10000);

  it('should include network context', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    expect(markdown).toContain('Network Context');
    expect(markdown).toMatch(/Network Difficulty:/);
    expect(markdown).toMatch(/Current Market Conditions:/);
  }, 10000);

  it('should format difficulty in scientific notation', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Network difficulty should be in scientific notation (e.g., 1.10e+17)
    expect(markdown).toMatch(/Network Difficulty:.*\d+\.\d+e[+-]\d+/);
  }, 10000);

  it('should format currency values with thousands separators', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
      hardware_cost_usd: 5000,
    });

    const markdown = result.content[0].text;

    // Hardware cost should have comma separator
    expect(markdown).toMatch(/Hardware Cost:.*\$5,000\.00/);
  }, 10000);

  it('should include timestamp metadata', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Should include calculation timestamp
    expect(markdown).toMatch(/as of.*\d{4}-\d{2}-\d{2}/);
  }, 10000);

  it('should include profitability warnings', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    // Should have some kind of warning or note at the bottom
    const hasWarning =
      markdown.includes('WARNING') ||
      markdown.includes('CAUTION') ||
      markdown.includes('assume') ||
      markdown.includes('estimate');

    expect(hasWarning).toBe(true);
  }, 10000);

  it('should handle different efficiency levels correctly', async () => {
    // Test with very efficient hardware (low J/TH)
    const efficientResult = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 15, // Very efficient (e.g., Antminer S21)
    });

    expect(efficientResult.isError).toBe(false);

    // Test with less efficient hardware (high J/TH)
    const lessEfficientResult = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 50, // Less efficient (older hardware)
    });

    expect(lessEfficientResult.isError).toBe(false);

    // More efficient hardware should have higher profit (lower electricity cost)
    const efficientMarkdown = efficientResult.content[0].text;
    const lessEfficientMarkdown = lessEfficientResult.content[0].text;

    const efficientCostMatch = efficientMarkdown.match(/Daily Electricity Cost:.*\$([\d.]+)\/TH/);
    const lessEfficientCostMatch = lessEfficientMarkdown.match(
      /Daily Electricity Cost:.*\$([\d.]+)\/TH/
    );

    if (efficientCostMatch && lessEfficientCostMatch) {
      const efficientCost = parseFloat(efficientCostMatch[1]);
      const lessEfficientCost = parseFloat(lessEfficientCostMatch[1]);

      // More efficient hardware should have lower electricity cost
      expect(efficientCost).toBeLessThan(lessEfficientCost);
    }
  }, 20000);

  it('should include attribution to Braiins Insights', async () => {
    const result = await tool.execute({
      electricity_cost_kwh: 0.05,
      hardware_efficiency_jth: 25,
    });

    const markdown = result.content[0].text;

    expect(markdown).toContain('Braiins Insights');
    expect(markdown).toContain('insights.braiins.com');
  }, 10000);
});
