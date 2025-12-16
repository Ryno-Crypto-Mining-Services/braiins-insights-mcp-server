/**
 * Unit tests for braiins_profitability_calculator tool
 */

import { jest } from '@jest/globals';
import { ProfitabilityCalculatorTool } from '../../../src/tools/parameterized/profitability-calculator.js';
import { BraiinsInsightsProfitability } from '../../../src/types/profitability.js';
import {
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../../src/api/insights-client.js';

// Mock API client
const createMockApiClient = (): { getProfitabilityCalculator: jest.Mock } => ({
  getProfitabilityCalculator: jest.fn(),
});

// Sample valid response data
const SAMPLE_PROFITABLE: BraiinsInsightsProfitability = {
  daily_revenue_per_th: 0.0875,
  daily_electricity_cost_per_th: 0.0324,
  net_daily_profit_per_th: 0.0551,
  monthly_profit_per_th: 1.653,
  annual_profit_per_th: 20.11,
  breakeven_btc_price: 35240.5,
  btc_price_usd: 45000.0,
  breakeven_hashrate_ths: 125.5,
  profitability_threshold_kwh: 0.0875,
  network_difficulty: 109780000000000000,
  timestamp: '2025-12-16T05:00:00Z',
  roi_days: 365,
};

const SAMPLE_UNPROFITABLE: BraiinsInsightsProfitability = {
  daily_revenue_per_th: 0.0324,
  daily_electricity_cost_per_th: 0.0875,
  net_daily_profit_per_th: -0.0551,
  monthly_profit_per_th: -1.653,
  annual_profit_per_th: -20.11,
  breakeven_btc_price: 65000.0,
  btc_price_usd: 45000.0,
  breakeven_hashrate_ths: 275.8,
  profitability_threshold_kwh: 0.0324,
  network_difficulty: 109780000000000000,
  timestamp: '2025-12-16T05:00:00Z',
};

const SAMPLE_WITH_ROI: BraiinsInsightsProfitability = {
  daily_revenue_per_th: 0.0875,
  daily_electricity_cost_per_th: 0.0324,
  net_daily_profit_per_th: 0.0551,
  monthly_profit_per_th: 1.653,
  annual_profit_per_th: 20.11,
  breakeven_btc_price: 35240.5,
  btc_price_usd: 45000.0,
  breakeven_hashrate_ths: 125.5,
  profitability_threshold_kwh: 0.0875,
  network_difficulty: 109780000000000000,
  timestamp: '2025-12-16T05:00:00Z',
  roi_days: 547, // ~1.5 years
};

describe('ProfitabilityCalculatorTool', () => {
  let tool: ProfitabilityCalculatorTool;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    tool = new ProfitabilityCalculatorTool(mockApiClient as any);
  });

  describe('metadata', () => {
    it('should have correct tool name', () => {
      expect(tool.name).toBe('braiins_profitability_calculator');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('profitability');
      expect(tool.description).toContain('electricity cost');
      expect(tool.description).toContain('hardware efficiency');
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have valid input schema with required parameters', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('electricity_cost_kwh');
      expect(tool.inputSchema.properties).toHaveProperty('hardware_efficiency_jth');
      expect(tool.inputSchema.properties).toHaveProperty('hardware_cost_usd');
      expect(tool.inputSchema.required).toEqual([
        'electricity_cost_kwh',
        'hardware_efficiency_jth',
      ]);
    });

    it('should define electricity_cost_kwh parameter correctly', () => {
      expect(tool.inputSchema.properties.electricity_cost_kwh.type).toBe('number');
      expect(tool.inputSchema.properties.electricity_cost_kwh.minimum).toBe(0);
      expect(tool.inputSchema.properties.electricity_cost_kwh.maximum).toBe(1);
    });

    it('should define hardware_efficiency_jth parameter correctly', () => {
      expect(tool.inputSchema.properties.hardware_efficiency_jth.type).toBe('number');
      expect(tool.inputSchema.properties.hardware_efficiency_jth.minimum).toBe(1);
      expect(tool.inputSchema.properties.hardware_efficiency_jth.maximum).toBe(200);
      expect(tool.inputSchema.properties.hardware_efficiency_jth.description).toContain('J/TH');
    });

    it('should define hardware_cost_usd as optional parameter', () => {
      expect(tool.inputSchema.properties.hardware_cost_usd.type).toBe('number');
      expect(tool.inputSchema.properties.hardware_cost_usd.minimum).toBe(0);
      expect(tool.inputSchema.required).not.toContain('hardware_cost_usd');
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format profitability data with required parameters', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(mockApiClient.getProfitabilityCalculator).toHaveBeenCalledWith({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        hardware_cost_usd: undefined,
      });
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Bitcoin Mining Profitability Analysis');
      expect(markdown).toContain('Input Parameters');
    });

    it('should include hardware cost if provided', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_WITH_ROI);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        hardware_cost_usd: 3000,
      });

      expect(mockApiClient.getProfitabilityCalculator).toHaveBeenCalledWith({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        hardware_cost_usd: 3000,
      });

      const markdown = result.content[0].text;
      expect(markdown).toContain('$3,000.00');
      expect(markdown).toContain('Return on Investment');
    });

    it('should display profitability metrics', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Daily Revenue:');
      expect(markdown).toContain('Daily Electricity Cost:');
      expect(markdown).toContain('Net Daily Profit:');
      expect(markdown).toContain('Monthly Profit:');
      expect(markdown).toContain('Annual Profit:');
    });

    it('should display break-even analysis', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Break-Even Analysis');
      expect(markdown).toContain('Break-even BTC Price:');
      expect(markdown).toContain('Current BTC Price:');
      expect(markdown).toContain('Break-even Hashrate:');
      expect(markdown).toContain('Profitability Threshold:');
    });
  });

  describe('parameter validation', () => {
    it('should accept valid low electricity cost', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.01,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(false);
    });

    it('should accept valid high electricity cost', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_UNPROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.25,
        hardware_efficiency_jth: 50,
      });

      expect(result.isError).toBe(false);
    });

    it('should accept valid modern hardware efficiency (low J/TH)', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 17.5, // S21 efficiency
      });

      expect(result.isError).toBe(false);
    });

    it('should accept valid older hardware efficiency (high J/TH)', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_UNPROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 100, // Older hardware
      });

      expect(result.isError).toBe(false);
    });

    it('should reject missing electricity_cost_kwh', async () => {
      const result = await tool.execute({
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid Input Parameters');
      expect(result.content[0].text).toContain('Required');
    });

    it('should reject missing hardware_efficiency_jth', async () => {
      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid Input Parameters');
      expect(result.content[0].text).toContain('Required');
    });

    it('should reject negative electricity cost', async () => {
      const result = await tool.execute({
        electricity_cost_kwh: -0.01,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Electricity cost cannot be negative');
    });

    it('should reject electricity cost exceeding maximum', async () => {
      const result = await tool.execute({
        electricity_cost_kwh: 1.5,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('unreasonably high');
    });

    it('should reject hardware efficiency below minimum', async () => {
      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 0.5,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Hardware efficiency must be at least 1');
    });

    it('should reject hardware efficiency exceeding maximum', async () => {
      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 250,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('unreasonably high');
    });

    it('should reject negative hardware cost', async () => {
      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        hardware_cost_usd: -100,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Hardware cost cannot be negative');
    });
  });

  describe('profitability scenarios', () => {
    it('should show profitable indicators for positive profits', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅'); // Profit indicator
      expect(markdown).toContain('+$'); // Positive profit prefix
    });

    it('should show unprofitable indicators for negative profits', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_UNPROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.25,
        hardware_efficiency_jth: 50,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('❌'); // Unprofitable indicator
      expect(markdown).toContain('WARNING: Mining is currently unprofitable');
    });

    it('should calculate ROI when hardware cost provided', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_WITH_ROI);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        hardware_cost_usd: 3000,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Return on Investment');
      expect(markdown).toContain('547 days'); // ROI period
      expect(markdown).toContain('1.5'); // ROI in years (547 / 365 ≈ 1.50)
    });

    it('should omit ROI section when hardware cost not provided', async () => {
      const profitWithoutROI: BraiinsInsightsProfitability = {
        ...SAMPLE_PROFITABLE,
        roi_days: undefined,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(profitWithoutROI);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).not.toContain('Return on Investment');
      expect(markdown).not.toContain('ROI Period');
    });
  });

  describe('market condition indicators', () => {
    it('should show "Excellent" condition for high profit margins', async () => {
      const highProfitData: BraiinsInsightsProfitability = {
        ...SAMPLE_PROFITABLE,
        net_daily_profit_per_th: 0.08,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(highProfitData);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Excellent - High profit margins');
    });

    it('should show "Good" condition for healthy profit margins', async () => {
      const goodProfitData: BraiinsInsightsProfitability = {
        ...SAMPLE_PROFITABLE,
        net_daily_profit_per_th: 0.035,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(goodProfitData);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Good - Healthy profit margins');
    });

    it('should show "Fair" condition for slim profit margins', async () => {
      const slimProfitData: BraiinsInsightsProfitability = {
        ...SAMPLE_PROFITABLE,
        net_daily_profit_per_th: 0.01,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(slimProfitData);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Fair - Slim profit margins');
    });

    it('should show "Poor" condition for operating at loss', async () => {
      const smallLossData: BraiinsInsightsProfitability = {
        ...SAMPLE_UNPROFITABLE,
        net_daily_profit_per_th: -0.01,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(smallLossData);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Poor - Operating at a loss');
    });

    it('should show "Critical" condition for significant losses', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_UNPROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.25,
        hardware_efficiency_jth: 50,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('Critical - Significant losses');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle zero electricity cost (free energy)', async () => {
      const freeElectricityData: BraiinsInsightsProfitability = {
        ...SAMPLE_PROFITABLE,
        daily_electricity_cost_per_th: 0,
        net_daily_profit_per_th: 0.0875,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(freeElectricityData);

      const result = await tool.execute({
        electricity_cost_kwh: 0,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('$0.0000/kWh');
    });

    it('should handle maximum valid electricity cost', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_UNPROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 1.0,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(false);
    });

    it('should handle most efficient hardware (minimum J/TH)', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 1,
      });

      expect(result.isError).toBe(false);
    });

    it('should handle least efficient hardware (maximum J/TH)', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_UNPROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 200,
      });

      expect(result.isError).toBe(false);
    });

    it('should display warning for thin profit margins', async () => {
      const thinMarginData: BraiinsInsightsProfitability = {
        ...SAMPLE_PROFITABLE,
        net_daily_profit_per_th: 0.005,
      };
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(thinMarginData);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('CAUTION: Profit margins are very thin');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'API rate limit exceeded',
        429,
        '/v2.0/profitability-calculator'
      );
      mockApiClient.getProfitabilityCalculator.mockRejectedValue(apiError);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('Connection timeout');
      mockApiClient.getProfitabilityCalculator.mockRejectedValue(networkError);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('Connection timeout');
    });

    it('should handle ValidationError', async () => {
      const validationError = new ValidationError('Invalid response format');
      mockApiClient.getProfitabilityCalculator.mockRejectedValue(validationError);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockApiClient.getProfitabilityCalculator.mockRejectedValue(unexpectedError);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });

    it('should handle non-Error exceptions', async () => {
      mockApiClient.getProfitabilityCalculator.mockRejectedValue('String error');

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
    });
  });

  describe('markdown formatting', () => {
    it('should include Braiins Insights link in footer', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('[Braiins Insights Dashboard]');
      expect(markdown).toContain('https://insights.braiins.com');
    });

    it('should include timestamp in footer', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('2025-12-16T05:00:00Z');
    });

    it('should format BTC price with thousands separator', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('$45,000.00'); // Current BTC price formatted
      expect(markdown).toContain('$35,240.50'); // Break-even price formatted
    });

    it('should format network difficulty in scientific notation', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });
      const markdown = result.content[0].text;

      expect(markdown).toMatch(/1\.\d{2}e\+17/); // Scientific notation
    });

    it('should format electricity cost with 4 decimal places', async () => {
      mockApiClient.getProfitabilityCalculator.mockResolvedValue(SAMPLE_PROFITABLE);

      const result = await tool.execute({
        electricity_cost_kwh: 0.0523,
        hardware_efficiency_jth: 25.3,
      });
      const markdown = result.content[0].text;

      expect(markdown).toContain('$0.0523/kWh');
      expect(markdown).toContain('25.3 J/TH');
    });
  });
});
