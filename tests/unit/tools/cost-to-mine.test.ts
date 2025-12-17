/**
 * Unit tests for braiins_cost_to_mine tool
 *
 * Updated to match the actual Braiins API structure with payload/result format
 *
 * @see https://academy.braiins.com/en/mining-insights/public-api/#cost-to-mine
 */

import { jest } from '@jest/globals';
import { CostToMineTool } from '../../../src/tools/parameterized/cost-to-mine.js';
import { BraiinsInsightsCostToMine } from '../../../src/types/insights-api.js';
import {
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getCostToMine: jest.Mock } => ({
  getCostToMine: jest.fn(),
});

// Helper to create mock API response with realistic values
const createMockResponse = (
  overrides: {
    fiat_cost?: number;
    fiat_margin?: number;
    fiat_profit_daily?: number;
    fiat_break_even_electricity_price?: number;
    coin_mined_daily?: number;
    difficulty?: number;
    hardware_efficiency_j_th?: number;
    electricity_price_per_kwh?: number;
    hashrate_ths?: number;
    consumption_watts?: number;
  } = {}
): BraiinsInsightsCostToMine => ({
  payload: {
    hashrate_ths: overrides.hashrate_ths ?? 100,
    consumption_watts: overrides.consumption_watts ?? 3000,
    avg_tx_fees_coin: null,
    price: null,
    difficulty: null,
    block_reward: null,
    revenue_fees_rate: 0.02,
    profit_fees_rate: 0.0,
    income_tax_rate: 0.0,
    yearly_difficulty_change_rate: 0.02,
    yearly_price_change_rate: 0.0,
    electricity_price_per_kwh: overrides.electricity_price_per_kwh ?? 0.08,
    capex: null,
    monthly_fixed_opex: 0.0,
    period_resolution: '1m',
    periods: 24,
    timestamp: '2025-12-17T19:00:00.000000000',
    estimate_future_rewards: true,
    initial_hardware_value_fiat: 0.0,
    initial_infrastructure_value_fiat: 0.0,
    initial_fiat_holdings_fiat: 0.0,
    initial_coin_holdings_coin: 0.0,
    yearly_hardware_value_change_rate: 0.0,
    yearly_infrastructure_value_change_rate: 0.0,
    hodl_rate: 0.0,
    hodl_on_revenue_instead: false,
    discount_rate: 0.0,
    loan_amount_fiat: 0.0,
    loan_interest_rate: 0.0,
    loan_payback_periods: 0,
    loan_to_value_ratio: 0.5,
    halving_difficulty_change: 0.0,
    periods_to_halving: null,
  },
  result: {
    coin_mined_daily: overrides.coin_mined_daily ?? 0.00004174,
    difficulty: overrides.difficulty ?? 148195306640204.7,
    fiat_break_even_electricity_price: overrides.fiat_break_even_electricity_price ?? 0.05,
    fiat_cost: overrides.fiat_cost ?? 137999.5,
    fiat_margin: overrides.fiat_margin ?? -52122.5,
    fiat_profit_daily: overrides.fiat_profit_daily ?? -2.18,
    hardware_efficiency_j_th: overrides.hardware_efficiency_j_th ?? 30.0,
    fiat_cost_line: [0.0, 17249.94, 34499.87, 51749.81, 68999.75, 86249.69],
    fiat_electricity_prices: [0.0, 0.01, 0.02, 0.03, 0.04, 0.05],
    fiat_profit_area: [85877.0, 68627.06, 51377.13, 34127.19, 16877.25, -372.69],
    price: [85877.0, 85877.0, 85877.0, 85877.0, 85877.0],
    marginal_cost_to_mine_fiat: [137999.495, 138227.413, 138455.707],
    marginal_electricity_breakeven_fiat: [0.05, 0.05, 0.05],
    total_cost_to_mine_fiat: [137999.495, 138227.413, 138455.707],
    total_electricity_breakeven_fiat: [0.05, 0.05, 0.05],
  },
});

// Sample responses for different scenarios
const SAMPLE_PROFITABLE_RESPONSE = createMockResponse({
  fiat_cost: 70000.0,
  fiat_margin: 15877.0, // profitable
  fiat_profit_daily: 0.66,
  fiat_break_even_electricity_price: 0.12,
  electricity_price_per_kwh: 0.05,
});

const SAMPLE_UNPROFITABLE_RESPONSE = createMockResponse({
  fiat_cost: 137999.5,
  fiat_margin: -52122.5, // unprofitable
  fiat_profit_daily: -2.18,
  fiat_break_even_electricity_price: 0.05,
  electricity_price_per_kwh: 0.08,
});

const SAMPLE_LOW_COST_RESPONSE = createMockResponse({
  fiat_cost: 35000.0,
  fiat_margin: 50877.0,
  fiat_profit_daily: 2.12,
  fiat_break_even_electricity_price: 0.15,
  electricity_price_per_kwh: 0.02,
});

describe('CostToMineTool', () => {
  let tool: CostToMineTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new CostToMineTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_cost_to_mine');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('cost');
      expect(tool.description).toContain('mine');
      expect(tool.description).toContain('Bitcoin');
      expect(tool.description).toContain('hashrate');
      expect(tool.description.length).toBeGreaterThan(50);
    });

    it('should have valid input schema with required parameters', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('hashrate_ths');
      expect(tool.inputSchema.properties).toHaveProperty('consumption_watts');
      expect(tool.inputSchema.properties).toHaveProperty('electricity_price_per_kwh');
      expect(tool.inputSchema.required).toContain('hashrate_ths');
      expect(tool.inputSchema.required).toContain('consumption_watts');
      expect(tool.inputSchema.required).toContain('electricity_price_per_kwh');
    });

    it('should have optional advanced parameters', () => {
      expect(tool.inputSchema.properties).toHaveProperty('revenue_fees_rate');
      expect(tool.inputSchema.properties).toHaveProperty('yearly_difficulty_change_rate');
      expect(tool.inputSchema.properties).toHaveProperty('period_resolution');
      expect(tool.inputSchema.properties).toHaveProperty('periods');
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format cost data with required parameters', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(mockApiClient.getCostToMine).toHaveBeenCalledWith({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Cost to Mine 1 BTC');
      expect(markdown).toContain('Hardware Configuration');
      expect(markdown).toContain('Mining Cost Analysis');
    });

    it('should include hardware configuration in output', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      const markdown = result.content[0].text;
      expect(markdown).toContain('100 TH/s');
      expect(markdown).toContain('3,000 W');
      expect(markdown).toContain('$0.0500/kWh');
    });

    it('should display cost to mine with currency formatting', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('$70,000.00'); // Cost formatted with thousands separator
    });

    it('should include break-even analysis', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Break-Even Analysis');
      expect(markdown).toContain('Break-Even Electricity Price');
      expect(markdown).toContain('$0.1200/kWh'); // break-even price
    });

    it('should pass optional advanced parameters', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
        revenue_fees_rate: 0.03,
        period_resolution: '1w',
        periods: 12,
      });

      expect(mockApiClient.getCostToMine).toHaveBeenCalledWith({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
        revenue_fees_rate: 0.03,
        period_resolution: '1w',
        periods: 12,
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('parameter validation', () => {
    it('should reject missing required parameters', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid Input Parameters');
      expect(result.content[0].text).toContain('hashrate_ths');
    });

    it('should reject missing hashrate', async () => {
      const result = await tool.execute({
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('hashrate_ths');
    });

    it('should reject missing consumption_watts', async () => {
      const result = await tool.execute({
        hashrate_ths: 100,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('consumption_watts');
    });

    it('should reject negative hashrate', async () => {
      const result = await tool.execute({
        hashrate_ths: -10,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Hashrate must be positive');
    });

    it('should reject negative power consumption', async () => {
      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: -100,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Power consumption must be positive');
    });

    it('should reject negative electricity price', async () => {
      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: -0.01,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Electricity price cannot be negative');
    });

    it('should reject electricity price exceeding maximum', async () => {
      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 1.5,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('unreasonably high');
    });

    it('should accept valid electricity cost at boundary (1.0)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_UNPROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 1.0,
      });

      expect(result.isError).toBe(false);
    });

    it('should accept zero electricity cost', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_LOW_COST_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0,
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('profitability indicators', () => {
    it('should show profitable status when margin is positive', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅'); // Profit icon
      expect(markdown).toContain('profitable');
    });

    it('should show unprofitable status when margin is negative', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_UNPROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.08,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('❌'); // Loss icon
      expect(markdown).toContain('unprofitable');
    });

    it('should indicate when electricity cost is below break-even', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('below');
      expect(markdown).toContain('break-even');
    });

    it('should indicate when electricity cost is above break-even', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_UNPROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.08,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('above');
      expect(markdown).toContain('break-even');
    });
  });

  describe('cost indicators', () => {
    it('should show green indicator for low cost (<$40K)', async () => {
      const lowCost = createMockResponse({ fiat_cost: 35000 });
      mockApiClient.getCostToMine.mockResolvedValue(lowCost);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.02,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('🟢');
    });

    it('should show yellow indicator for moderate cost ($40K-$80K)', async () => {
      const moderateCost = createMockResponse({ fiat_cost: 60000 });
      mockApiClient.getCostToMine.mockResolvedValue(moderateCost);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('🟡');
    });

    it('should show orange indicator for high cost ($80K-$120K)', async () => {
      const highCost = createMockResponse({ fiat_cost: 100000 });
      mockApiClient.getCostToMine.mockResolvedValue(highCost);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.07,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('🟠');
    });

    it('should show red indicator for very high cost (>$120K)', async () => {
      const veryHighCost = createMockResponse({ fiat_cost: 140000 });
      mockApiClient.getCostToMine.mockResolvedValue(veryHighCost);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.1,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('🔴');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError('API rate limit exceeded', 429, '/v2.0/cost-to-mine');
      mockApiClient.getCostToMine.mockRejectedValue(apiError);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
      expect(result.content[0].text).toContain('API rate limit exceeded');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('Connection timeout');
      mockApiClient.getCostToMine.mockRejectedValue(networkError);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('Connection timeout');
    });

    it('should handle ValidationError', async () => {
      const validationError = new ValidationError('Invalid response format');
      mockApiClient.getCostToMine.mockRejectedValue(validationError);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Invalid response format');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected server error');
      mockApiClient.getCostToMine.mockRejectedValue(unexpectedError);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('Unexpected server error');
    });

    it('should handle non-Error exceptions', async () => {
      mockApiClient.getCostToMine.mockRejectedValue('String error');

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('String error');
    });
  });

  describe('markdown formatting', () => {
    it('should include Braiins Insights link in footer', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('[Braiins Insights Dashboard]');
      expect(markdown).toContain('https://insights.braiins.com');
    });

    it('should include timestamp from API response', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Timestamp:');
    });

    it('should include network context section', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Network Context');
      expect(markdown).toContain('Network Difficulty');
      expect(markdown).toContain('Pool Fee Rate');
    });

    it('should include interpretation section', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Interpretation');
      expect(markdown).toContain('💡 **Tip:**');
    });

    it('should display BTC mined daily', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_PROFITABLE_RESPONSE);

      const result = await tool.execute({
        hashrate_ths: 100,
        consumption_watts: 3000,
        electricity_price_per_kwh: 0.05,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('BTC Mined Daily');
      expect(markdown).toContain('BTC');
    });
  });
});
