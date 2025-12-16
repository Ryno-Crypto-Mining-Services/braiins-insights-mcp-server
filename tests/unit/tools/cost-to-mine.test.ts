/**
 * Unit tests for braiins_cost_to_mine tool
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

// Sample valid response data
const SAMPLE_COST_TO_MINE_DEFAULT: BraiinsInsightsCostToMine = {
  cost_usd: 35240.75,
  electricity_cost_kwh: 0.05,
  break_even_price_usd: 38500.5,
  margin_percent: 15.25,
};

const SAMPLE_COST_TO_MINE_LOW_ELECTRICITY: BraiinsInsightsCostToMine = {
  cost_usd: 18500.0,
  electricity_cost_kwh: 0.01,
  break_even_price_usd: 20150.0,
  margin_percent: 75.5,
};

const SAMPLE_COST_TO_MINE_HIGH_ELECTRICITY: BraiinsInsightsCostToMine = {
  cost_usd: 65000.0,
  electricity_cost_kwh: 0.25,
  break_even_price_usd: 70500.0,
  margin_percent: -8.5,
};

const SAMPLE_COST_TO_MINE_MINIMAL: BraiinsInsightsCostToMine = {
  cost_usd: 28450.25,
};

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
      expect(tool.description.length).toBeGreaterThan(20);
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('electricity_cost_kwh');
      expect(tool.inputSchema.required).toEqual([]);
    });

    it('should define electricity_cost_kwh parameter correctly', () => {
      expect(tool.inputSchema.properties.electricity_cost_kwh.type).toBe('number');
      expect(tool.inputSchema.properties.electricity_cost_kwh.minimum).toBe(0);
      expect(tool.inputSchema.properties.electricity_cost_kwh.maximum).toBe(1);
    });
  });

  describe('execute - happy path', () => {
    it('should fetch and format cost data with default parameters', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});

      expect(mockApiClient.getCostToMine).toHaveBeenCalledWith({});
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const markdown = result.content[0].text;
      expect(markdown).toContain('Cost to Mine 1 BTC');
      expect(markdown).toContain('Mining Cost Analysis');
    });

    it('should apply custom electricity cost parameter', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_LOW_ELECTRICITY);

      const result = await tool.execute({ electricity_cost_kwh: 0.01 });

      expect(mockApiClient.getCostToMine).toHaveBeenCalledWith({
        electricity_cost_kwh: 0.01,
      });
      expect(result.isError).toBe(false);

      const markdown = result.content[0].text;
      expect(markdown).toContain('Input Parameters');
      expect(markdown).toContain('$0.0100/kWh');
    });

    it('should display cost with currency formatting', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('$35,240.75'); // Cost formatted with thousands separator
    });

    it('should include break-even analysis when available', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Break-Even Analysis');
      expect(markdown).toContain('Break-Even BTC Price:');
      expect(markdown).toContain('$38,500.50');
      expect(markdown).toContain('Current Profit Margin:');
      expect(markdown).toContain('+15.25%');
    });
  });

  describe('parameter validation', () => {
    it('should accept valid electricity cost (low)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_LOW_ELECTRICITY);

      const result = await tool.execute({ electricity_cost_kwh: 0.01 });

      expect(result.isError).toBe(false);
      expect(mockApiClient.getCostToMine).toHaveBeenCalledWith({
        electricity_cost_kwh: 0.01,
      });
    });

    it('should accept valid electricity cost (mid)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({ electricity_cost_kwh: 0.05 });

      expect(result.isError).toBe(false);
    });

    it('should accept valid electricity cost (high)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_HIGH_ELECTRICITY);

      const result = await tool.execute({ electricity_cost_kwh: 0.25 });

      expect(result.isError).toBe(false);
    });

    it('should accept maximum valid electricity cost (1.0)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_HIGH_ELECTRICITY);

      const result = await tool.execute({ electricity_cost_kwh: 1.0 });

      expect(result.isError).toBe(false);
    });

    it('should accept zero electricity cost', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_LOW_ELECTRICITY);

      const result = await tool.execute({ electricity_cost_kwh: 0 });

      expect(result.isError).toBe(false);
    });

    it('should reject negative electricity cost', async () => {
      const result = await tool.execute({ electricity_cost_kwh: -0.01 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid Input Parameters');
      expect(result.content[0].text).toContain('Electricity cost cannot be negative');
    });

    it('should reject electricity cost exceeding maximum', async () => {
      const result = await tool.execute({ electricity_cost_kwh: 1.01 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid Input Parameters');
      expect(result.content[0].text).toContain('unreasonably high');
    });

    it('should handle empty input (optional parameter)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(mockApiClient.getCostToMine).toHaveBeenCalledWith({});
    });
  });

  describe('cost indicators', () => {
    it('should show low cost indicator for cheap mining', async () => {
      const lowCostData: BraiinsInsightsCostToMine = {
        cost_usd: 15000,
      };
      mockApiClient.getCostToMine.mockResolvedValue(lowCostData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅ (Low cost)');
    });

    it('should show moderate cost indicator for average mining', async () => {
      const moderateCostData: BraiinsInsightsCostToMine = {
        cost_usd: 35000,
      };
      mockApiClient.getCostToMine.mockResolvedValue(moderateCostData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ (Moderate cost)');
    });

    it('should show high cost indicator for expensive mining', async () => {
      const highCostData: BraiinsInsightsCostToMine = {
        cost_usd: 50000,
      };
      mockApiClient.getCostToMine.mockResolvedValue(highCostData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('🔶 (High cost)');
    });

    it('should show very high cost indicator for very expensive mining', async () => {
      const veryHighCostData: BraiinsInsightsCostToMine = {
        cost_usd: 70000,
      };
      mockApiClient.getCostToMine.mockResolvedValue(veryHighCostData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('🔴 (Very high cost)');
    });
  });

  describe('margin indicators', () => {
    it('should show highly profitable indicator for >50% margin', async () => {
      const highMarginData: BraiinsInsightsCostToMine = {
        cost_usd: 20000,
        margin_percent: 75.5,
        break_even_price_usd: 22000, // Need break_even_price_usd for margin to display
      };
      mockApiClient.getCostToMine.mockResolvedValue(highMarginData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅ (Highly profitable)');
    });

    it('should show profitable indicator for 20-50% margin', async () => {
      const profitableData: BraiinsInsightsCostToMine = {
        cost_usd: 30000,
        margin_percent: 35.0,
        break_even_price_usd: 32000, // Need break_even_price_usd for margin to display
      };
      mockApiClient.getCostToMine.mockResolvedValue(profitableData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('✅ (Profitable)');
    });

    it('should show marginally profitable indicator for 0-20% margin', async () => {
      const marginalData: BraiinsInsightsCostToMine = {
        cost_usd: 40000,
        margin_percent: 10.0,
        break_even_price_usd: 42000, // Need break_even_price_usd for margin to display
      };
      mockApiClient.getCostToMine.mockResolvedValue(marginalData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('⚠️ (Marginally profitable)');
    });

    it('should show unprofitable indicator for -20 to 0% margin', async () => {
      const unprofitableData: BraiinsInsightsCostToMine = {
        cost_usd: 50000,
        margin_percent: -10.0,
        break_even_price_usd: 52000, // Need break_even_price_usd for margin to display
      };
      mockApiClient.getCostToMine.mockResolvedValue(unprofitableData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('❌ (Unprofitable)');
    });

    it('should show severely unprofitable indicator for <-20% margin', async () => {
      const severelyUnprofitableData: BraiinsInsightsCostToMine = {
        cost_usd: 60000,
        margin_percent: -35.0,
        break_even_price_usd: 65000, // Need break_even_price_usd for margin to display
      };
      mockApiClient.getCostToMine.mockResolvedValue(severelyUnprofitableData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('🔴 (Severely unprofitable)');
    });
  });

  describe('execute - edge cases', () => {
    it('should handle minimal response (no break-even data)', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_MINIMAL);

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('$28,450.25');
      expect(markdown).not.toContain('Break-Even Analysis');
    });

    it('should handle zero cost (free electricity)', async () => {
      const zeroCostData: BraiinsInsightsCostToMine = {
        cost_usd: 0,
        electricity_cost_kwh: 0,
      };
      mockApiClient.getCostToMine.mockResolvedValue(zeroCostData);

      const result = await tool.execute({ electricity_cost_kwh: 0 });

      expect(result.isError).toBe(false);
      const markdown = result.content[0].text;
      expect(markdown).toContain('$0.00');
    });

    it('should handle break-even scenario (0% margin)', async () => {
      const breakEvenData: BraiinsInsightsCostToMine = {
        cost_usd: 40000,
        break_even_price_usd: 40000,
        margin_percent: 0,
      };
      mockApiClient.getCostToMine.mockResolvedValue(breakEvenData);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('break-even');
    });

    it('should display interpretation for profitable scenario', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Interpretation');
      expect(markdown).toContain('profitable');
      expect(markdown).toContain('favorable mining conditions');
    });

    it('should display interpretation for unprofitable scenario', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_HIGH_ELECTRICITY);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('Interpretation');
      expect(markdown).toContain('unprofitable');
      expect(markdown).toContain('reducing electricity costs');
    });
  });

  describe('execute - error handling', () => {
    it('should handle InsightsApiError', async () => {
      const apiError = new InsightsApiError(
        'API rate limit exceeded',
        429,
        '/v2.0/cost-to-mine'
      );
      mockApiClient.getCostToMine.mockRejectedValue(apiError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
      expect(result.content[0].text).toContain('429');
      expect(result.content[0].text).toContain('API rate limit exceeded');
    });

    it('should handle NetworkError', async () => {
      const networkError = new NetworkError('Connection timeout');
      mockApiClient.getCostToMine.mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
      expect(result.content[0].text).toContain('Connection timeout');
    });

    it('should handle ValidationError', async () => {
      const validationError = new ValidationError('Invalid response format');
      mockApiClient.getCostToMine.mockRejectedValue(validationError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation Error');
      expect(result.content[0].text).toContain('Invalid response format');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected server error');
      mockApiClient.getCostToMine.mockRejectedValue(unexpectedError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('Unexpected server error');
    });

    it('should handle non-Error exceptions', async () => {
      mockApiClient.getCostToMine.mockRejectedValue('String error');

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected Error');
      expect(result.content[0].text).toContain('String error');
    });
  });

  describe('markdown formatting', () => {
    it('should include Braiins Insights link in footer', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('[Braiins Insights Dashboard]');
      expect(markdown).toContain('https://insights.braiins.com');
    });

    it('should include calculation note in footer', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('network difficulty');
      expect(markdown).toContain('hardware efficiency');
    });

    it('should format electricity cost with 4 decimal places', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_LOW_ELECTRICITY);

      const result = await tool.execute({ electricity_cost_kwh: 0.0123 });
      const markdown = result.content[0].text;

      expect(markdown).toContain('$0.0123/kWh');
    });

    it('should include tip when break-even price is available', async () => {
      mockApiClient.getCostToMine.mockResolvedValue(SAMPLE_COST_TO_MINE_DEFAULT);

      const result = await tool.execute({});
      const markdown = result.content[0].text;

      expect(markdown).toContain('💡 **Tip:**');
      expect(markdown).toContain('BTC price must be above');
    });
  });
});
