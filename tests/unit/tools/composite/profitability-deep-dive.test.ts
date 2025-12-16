/**
 * Unit tests for braiins_profitability_deep_dive composite tool
 *
 * Tests comprehensive profitability analysis with multiple endpoints
 * including graceful degradation on partial failures.
 */

import { jest } from '@jest/globals';
import { ProfitabilityDeepDiveTool } from '../../../../src/tools/composite/profitability-deep-dive.js';
import { NetworkError } from '../../../../src/api/insights-client.js';
import type { BraiinsInsightsProfitability } from '../../../../src/types/profitability.js';
import type {
  BraiinsInsightsCostToMine,
  BraiinsInsightsPriceStats,
  BraiinsInsightsHashrateValue,
} from '../../../../src/types/insights-api.js';

// Create mock API client type
interface MockApiClient {
  getProfitabilityCalculator: jest.Mock;
  getCostToMine: jest.Mock;
  getPriceStats: jest.Mock;
  getHashrateValueHistory: jest.Mock;
}

const createMockApiClient = (): MockApiClient => ({
  getProfitabilityCalculator: jest.fn(),
  getCostToMine: jest.fn(),
  getPriceStats: jest.fn(),
  getHashrateValueHistory: jest.fn(),
});

describe('ProfitabilityDeepDiveTool', () => {
  let tool: ProfitabilityDeepDiveTool;
  let mockClient: MockApiClient;

  // Mock data
  const mockProfitabilityData: BraiinsInsightsProfitability = {
    daily_revenue_per_th: 0.045,
    daily_electricity_cost_per_th: 0.012,
    net_daily_profit_per_th: 0.033,
    monthly_profit_per_th: 0.99,
    annual_profit_per_th: 12.045,
    btc_price_usd: 96500,
    network_difficulty: 109780000000000000,
    breakeven_btc_price: 45000,
    breakeven_hashrate_ths: 100,
    profitability_threshold_kwh: 0.15,
    timestamp: '2025-12-14T10:30:00Z',
  };

  const mockCostToMineData: BraiinsInsightsCostToMine = {
    cost_usd: 42000,
    electricity_cost_kwh: 0.05,
    break_even_price_usd: 45000,
    margin_percent: 56.5,
  };

  const mockPriceStatsData: BraiinsInsightsPriceStats = {
    current_price_usd: 96500,
    price_change_24h_percent: 3.2,
    market_cap_usd: 1900000000000,
    volume_24h_usd: 45000000000,
  };

  const mockHistoricalData: BraiinsInsightsHashrateValue[] = [
    { date: '2025-11-14', hash_value_usd_per_th_day: 0.000035 },
    { date: '2025-11-21', hash_value_usd_per_th_day: 0.000038 },
    { date: '2025-11-28', hash_value_usd_per_th_day: 0.00004 },
    { date: '2025-12-05', hash_value_usd_per_th_day: 0.000042 },
    { date: '2025-12-12', hash_value_usd_per_th_day: 0.000045 },
  ];

  beforeEach(() => {
    mockClient = createMockApiClient();
    tool = new ProfitabilityDeepDiveTool(mockClient as unknown);
  });

  describe('Tool Metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('braiins_profitability_deep_dive');
    });

    it('should have comprehensive description', () => {
      expect(tool.description).toContain('profitability analysis');
      expect(tool.description).toContain('calculator');
      expect(tool.description).toContain('cost-to-mine');
      expect(tool.description).toContain('historical');
    });

    it('should require electricity_cost_kwh and hardware_efficiency_jth', () => {
      expect(tool.inputSchema.required).toEqual([
        'electricity_cost_kwh',
        'hardware_efficiency_jth',
      ]);
    });

    it('should have optional include_historical and historical_days parameters', () => {
      expect(tool.inputSchema.properties.include_historical).toBeDefined();
      expect(tool.inputSchema.properties.historical_days).toBeDefined();
      expect(tool.inputSchema.properties.include_historical.default).toBe(false);
      expect(tool.inputSchema.properties.historical_days.default).toBe(30);
    });
  });

  describe('Input Validation', () => {
    it('should reject missing electricity_cost_kwh', async () => {
      const input = {
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Invalid Input Parameters');
      expect(response.content[0].text).toContain('electricity_cost_kwh');
    });

    it('should reject missing hardware_efficiency_jth', async () => {
      const input = {
        electricity_cost_kwh: 0.05,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Invalid Input Parameters');
      expect(response.content[0].text).toContain('hardware_efficiency_jth');
    });

    it('should reject negative electricity cost', async () => {
      const input = {
        electricity_cost_kwh: -0.01,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('cannot be negative');
    });

    it('should reject electricity cost above 1 USD/kWh', async () => {
      const input = {
        electricity_cost_kwh: 1.5,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('unreasonably high');
    });

    it('should reject hardware efficiency below 1 J/TH', async () => {
      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 0.5,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('at least 1 J/TH');
    });

    it('should reject hardware efficiency above 200 J/TH', async () => {
      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 250,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('unreasonably high');
    });

    it('should reject historical_days below 7', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: true,
        historical_days: 5,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('minimum 7 days');
    });

    it('should reject historical_days above 90', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: true,
        historical_days: 100,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('maximum 90 days');
    });
  });

  describe('Happy Path - All Endpoints Success', () => {
    it('should return comprehensive analysis when all endpoints succeed', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('💎 Deep Dive Profitability Analysis');
      expect(response.content[0].text).toContain('⚡ Profitability Summary');
      expect(response.content[0].text).toContain('💵 Break-Even Analysis');
      expect(response.content[0].text).toContain('📈 Market Context');
      expect(response.content[0].text).toContain('💡 Recommendations');

      // Verify input parameters shown
      expect(response.content[0].text).toContain('$0.0500/kWh');
      expect(response.content[0].text).toContain('25.0 J/TH');

      // Verify profitability metrics
      expect(response.content[0].text).toContain('$0.0450/TH');
      expect(response.content[0].text).toContain('$0.0120/TH');
      expect(response.content[0].text).toContain('+$0.0330/TH');
    });

    it('should include historical trends when requested', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);
      mockClient.getHashrateValueHistory.mockResolvedValue(mockHistoricalData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: true,
        historical_days: 30,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('📊 Historical Trends');
      expect(response.content[0].text).toContain('Hashrate Value Trends');
      expect(response.content[0].text).toContain('30-Day Average');
      expect(response.content[0].text).toContain('Trend Analysis');
    });

    it('should show profitable status when mining is profitable', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('✅');
      expect(response.content[0].text).toContain('Profitable');
      expect(response.content[0].text).toContain('Mining Viability');
    });

    it('should show unprofitable status when mining is not profitable', async () => {
      const unprofitableData: BraiinsInsightsProfitability = {
        ...mockProfitabilityData,
        net_daily_profit_per_th: -0.01,
        monthly_profit_per_th: -0.3,
        annual_profit_per_th: -3.65,
      };

      mockClient.getProfitabilityCalculator.mockResolvedValue(unprofitableData);
      mockClient.getCostToMine.mockResolvedValue({
        ...mockCostToMineData,
        margin_percent: -15,
      });
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);

      const input = {
        electricity_cost_kwh: 0.15,
        hardware_efficiency_jth: 35,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('❌');
      expect(response.content[0].text).toContain('Unprofitable');
      expect(response.content[0].text).toContain('Not Recommended');
    });
  });

  describe('Partial Failure Scenarios', () => {
    it('should continue when cost-to-mine endpoint fails', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockRejectedValue(new NetworkError('Connection timeout'));
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('💎 Deep Dive Profitability Analysis');
      expect(response.content[0].text).toContain('⚠️ Data Availability Warnings');
      expect(response.content[0].text).toContain('Cost-to-mine data unavailable');
    });

    it('should continue when price-stats endpoint fails', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockRejectedValue(new Error('API unavailable'));

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('💎 Deep Dive Profitability Analysis');
      expect(response.content[0].text).toContain('⚠️ Data Availability Warnings');
      expect(response.content[0].text).toContain('Market price data unavailable');
    });

    it('should continue when historical data endpoint fails', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);
      mockClient.getHashrateValueHistory.mockRejectedValue(new NetworkError('Timeout'));

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: true,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('💎 Deep Dive Profitability Analysis');
      expect(response.content[0].text).toContain('⚠️ Data Availability Warnings');
      expect(response.content[0].text).toContain('Historical data unavailable');
    });

    it('should handle multiple partial failures gracefully', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockRejectedValue(new NetworkError('Timeout'));
      mockClient.getPriceStats.mockRejectedValue(new Error('API error'));

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('💎 Deep Dive Profitability Analysis');
      expect(response.content[0].text).toContain('⚠️ Data Availability Warnings');
      expect(response.content[0].text).toContain('Cost-to-mine data unavailable');
      expect(response.content[0].text).toContain('Market price data unavailable');
    });
  });

  describe('Complete Failure Scenarios', () => {
    it('should fail when profitability calculator endpoint fails', async () => {
      mockClient.getProfitabilityCalculator.mockRejectedValue(
        new Error('Profitability API unavailable')
      );

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Failed to fetch profitability data');
    });

    it('should handle network errors', async () => {
      mockClient.getProfitabilityCalculator.mockRejectedValue(
        new NetworkError('Connection refused')
      );

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('❌');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty historical data array', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);
      mockClient.getHashrateValueHistory.mockResolvedValue([]);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: true,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('📊 Historical Trends');
      expect(response.content[0].text).toContain('No historical data available');
    });

    it('should handle zero profit margin', async () => {
      const breakEvenData: BraiinsInsightsProfitability = {
        ...mockProfitabilityData,
        net_daily_profit_per_th: 0,
        monthly_profit_per_th: 0,
        annual_profit_per_th: 0,
        btc_price_usd: 45000,
        breakeven_btc_price: 45000,
      };

      mockClient.getProfitabilityCalculator.mockResolvedValue(breakEvenData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('$0.0000/TH');
    });

    it('should handle very high profit margins', async () => {
      const highProfitData: BraiinsInsightsProfitability = {
        ...mockProfitabilityData,
        net_daily_profit_per_th: 0.15,
        monthly_profit_per_th: 4.5,
        annual_profit_per_th: 54.75,
      };

      mockClient.getProfitabilityCalculator.mockResolvedValue(highProfitData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);
      mockClient.getPriceStats.mockResolvedValue(mockPriceStatsData);

      const input = {
        electricity_cost_kwh: 0.02,
        hardware_efficiency_jth: 17.5,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('Highly Profitable');
      expect(response.content[0].text).toContain('Excellent');
    });

    it('should handle boundary values for electricity cost', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);

      const input = {
        electricity_cost_kwh: 0, // Minimum
        hardware_efficiency_jth: 25,
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('$0.0000/kWh');
    });

    it('should handle boundary values for hardware efficiency', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 1, // Minimum
      };

      const response = await tool.execute(input);

      expect(response.isError).toBe(false);
      expect(response.content[0].text).toContain('1.0 J/TH');
    });
  });

  describe('API Client Integration', () => {
    it('should call getProfitabilityCalculator with correct parameters', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);

      const input = {
        electricity_cost_kwh: 0.08,
        hardware_efficiency_jth: 29.5,
      };

      await tool.execute(input);

      expect(mockClient.getProfitabilityCalculator).toHaveBeenCalledWith({
        electricity_cost_kwh: 0.08,
        hardware_efficiency_jth: 29.5,
      });
    });

    it('should call getCostToMine with electricity cost', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getCostToMine.mockResolvedValue(mockCostToMineData);

      const input = {
        electricity_cost_kwh: 0.08,
        hardware_efficiency_jth: 29.5,
      };

      await tool.execute(input);

      expect(mockClient.getCostToMine).toHaveBeenCalledWith({
        electricity_cost_kwh: 0.08,
      });
    });

    it('should call getHashrateValueHistory when include_historical is true', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);
      mockClient.getHashrateValueHistory.mockResolvedValue(mockHistoricalData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: true,
      };

      await tool.execute(input);

      expect(mockClient.getHashrateValueHistory).toHaveBeenCalled();
    });

    it('should not call getHashrateValueHistory when include_historical is false', async () => {
      mockClient.getProfitabilityCalculator.mockResolvedValue(mockProfitabilityData);

      const input = {
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
        include_historical: false,
      };

      await tool.execute(input);

      expect(mockClient.getHashrateValueHistory).not.toHaveBeenCalled();
    });
  });
});
