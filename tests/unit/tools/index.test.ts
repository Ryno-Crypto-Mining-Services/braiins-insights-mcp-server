/**
 * Unit tests for MCP Tool Registry
 *
 * Tests cover: getAllTools, getToolsByCategory, tool interface compliance,
 * and re-exports.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  getAllTools,
  getToolsByCategory,
  ToolCategory,
  MCPTool,
  MCPToolResponse,
  // Re-exported tools - Simple
  HashrateStatsTool,
  DifficultyStatsTool,
  PriceStatsTool,
  PoolStatsTool,
  RSSFeedDataTool,
  HalvingsTool,
  TransactionStatsTool,
  // Re-exported tools - Parameterized
  BlocksTool,
  ProfitabilityCalculatorTool,
  CostToMineTool,
  // Re-exported tools - Historical
  DailyRevenueHistoryTool,
  HashrateAndDifficultyHistoryTool,
  HashrateValueHistoryTool,
  TransactionFeesHistoryTool,
} from '../../../src/tools/index.js';
import type { InsightsApiClient } from '../../../src/api/insights-client.js';

// Create a mock API client
const createMockApiClient = (): InsightsApiClient =>
  ({
    getHashrateStats: jest.fn(),
    getDifficultyStats: jest.fn(),
    getPriceStats: jest.fn(),
    getPoolStats: jest.fn(),
    getRSSFeedData: jest.fn(),
    getHalvings: jest.fn(),
    getTransactionStats: jest.fn(),
    getBlocks: jest.fn(),
    getProfitabilityCalculator: jest.fn(),
    getCostToMine: jest.fn(),
    getBlocksByCountry: jest.fn(),
    getDailyRevenueHistory: jest.fn(),
    getHashrateAndDifficultyHistory: jest.fn(),
    getHashrateValueHistory: jest.fn(),
    getTransactionFeesHistory: jest.fn(),
    getHardwareStats: jest.fn(),
    clearCache: jest.fn(),
  }) as unknown as InsightsApiClient;

describe('MCP Tool Registry', () => {
  let mockApiClient: InsightsApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  // ============================================================================
  // ToolCategory Enum Tests
  // ============================================================================

  describe('ToolCategory enum', () => {
    it('should have Simple category', () => {
      expect(ToolCategory.Simple).toBe('simple');
    });

    it('should have Parameterized category', () => {
      expect(ToolCategory.Parameterized).toBe('parameterized');
    });

    it('should have Historical category', () => {
      expect(ToolCategory.Historical).toBe('historical');
    });

    it('should have Composite category', () => {
      expect(ToolCategory.Composite).toBe('composite');
    });

    it('should have exactly 4 categories', () => {
      const categories = Object.values(ToolCategory);
      expect(categories).toHaveLength(4);
    });
  });

  // ============================================================================
  // getAllTools Tests
  // ============================================================================

  describe('getAllTools', () => {
    it('should return an array of tools', () => {
      const tools = getAllTools(mockApiClient);
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should return 14 tools total', () => {
      const tools = getAllTools(mockApiClient);
      expect(tools).toHaveLength(14);
    });

    it('should include all simple tools', () => {
      const tools = getAllTools(mockApiClient);
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('braiins_hashrate_stats');
      expect(toolNames).toContain('braiins_difficulty_stats');
      expect(toolNames).toContain('braiins_price_stats');
      expect(toolNames).toContain('braiins_pool_stats');
      expect(toolNames).toContain('braiins_rss_feed_data');
      expect(toolNames).toContain('braiins_halvings');
      expect(toolNames).toContain('braiins_transaction_stats');
    });

    it('should include all parameterized tools', () => {
      const tools = getAllTools(mockApiClient);
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('braiins_blocks');
      expect(toolNames).toContain('braiins_profitability_calculator');
      expect(toolNames).toContain('braiins_cost_to_mine');
    });

    it('should include all historical tools', () => {
      const tools = getAllTools(mockApiClient);
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('braiins_daily_revenue_history');
      expect(toolNames).toContain('braiins_hashrate_and_difficulty_history');
      expect(toolNames).toContain('braiins_hashrate_value_history');
      expect(toolNames).toContain('braiins_transaction_fees_history');
    });

    it('should return new instances each call', () => {
      const tools1 = getAllTools(mockApiClient);
      const tools2 = getAllTools(mockApiClient);

      // Different arrays
      expect(tools1).not.toBe(tools2);

      // But same tool names
      expect(tools1.map((t) => t.name)).toEqual(tools2.map((t) => t.name));
    });
  });

  // ============================================================================
  // MCPTool Interface Compliance Tests
  // ============================================================================

  describe('MCPTool interface compliance', () => {
    it('all tools should have a name property', () => {
      const tools = getAllTools(mockApiClient);

      tools.forEach((tool) => {
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.name.startsWith('braiins_')).toBe(true);
      });
    });

    it('all tools should have a description property', () => {
      const tools = getAllTools(mockApiClient);

      tools.forEach((tool) => {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(20);
      });
    });

    it('all tools should have a valid inputSchema', () => {
      const tools = getAllTools(mockApiClient);

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(typeof tool.inputSchema.properties).toBe('object');
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });

    it('all tools should have an execute method', () => {
      const tools = getAllTools(mockApiClient);

      tools.forEach((tool) => {
        expect(typeof tool.execute).toBe('function');
      });
    });

    it('all tools should have unique names', () => {
      const tools = getAllTools(mockApiClient);
      const names = tools.map((t) => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });

  // ============================================================================
  // Simple Tools Verification Tests
  // ============================================================================

  describe('simple tools (no required parameters)', () => {
    const simpleToolNames = [
      'braiins_hashrate_stats',
      'braiins_difficulty_stats',
      'braiins_price_stats',
      'braiins_pool_stats',
      'braiins_rss_feed_data',
      'braiins_halvings',
      'braiins_transaction_stats',
    ];

    it('should have empty required array', () => {
      const tools = getAllTools(mockApiClient);
      const simpleTools = tools.filter((t) => simpleToolNames.includes(t.name));

      simpleTools.forEach((tool) => {
        expect(tool.inputSchema.required).toEqual([]);
      });
    });

    it('should have empty or minimal properties', () => {
      const tools = getAllTools(mockApiClient);
      const simpleTools = tools.filter((t) => simpleToolNames.includes(t.name));

      simpleTools.forEach((tool) => {
        const propCount = Object.keys(tool.inputSchema.properties).length;
        // Simple tools should have 0-2 optional properties at most
        expect(propCount).toBeLessThanOrEqual(2);
      });
    });
  });

  // ============================================================================
  // Parameterized Tools Verification Tests
  // ============================================================================

  describe('parameterized tools (require input)', () => {
    it('braiins_profitability_calculator should have required parameters', () => {
      const tools = getAllTools(mockApiClient);
      const profitTool = tools.find((t) => t.name === 'braiins_profitability_calculator');

      expect(profitTool).toBeDefined();
      expect(profitTool!.inputSchema.required.length).toBeGreaterThan(0);
      expect(profitTool!.inputSchema.required).toContain('electricity_cost_kwh');
      expect(profitTool!.inputSchema.required).toContain('hardware_efficiency_jth');
    });

    it('braiins_blocks should have optional pagination parameters', () => {
      const tools = getAllTools(mockApiClient);
      const blocksTool = tools.find((t) => t.name === 'braiins_blocks');

      expect(blocksTool).toBeDefined();
      const props = Object.keys(blocksTool!.inputSchema.properties);
      expect(props).toContain('page');
      expect(props).toContain('page_size');
    });

    it('braiins_cost_to_mine should have optional electricity parameter', () => {
      const tools = getAllTools(mockApiClient);
      const costTool = tools.find((t) => t.name === 'braiins_cost_to_mine');

      expect(costTool).toBeDefined();
      const props = Object.keys(costTool!.inputSchema.properties);
      expect(props).toContain('electricity_cost_kwh');
    });
  });

  // ============================================================================
  // Historical Tools Verification Tests
  // ============================================================================

  describe('historical tools (time-series data)', () => {
    const historicalToolNames = [
      'braiins_daily_revenue_history',
      'braiins_hashrate_and_difficulty_history',
      'braiins_hashrate_value_history',
      'braiins_transaction_fees_history',
    ];

    it('should have optional limit parameter', () => {
      const tools = getAllTools(mockApiClient);
      const historicalTools = tools.filter((t) => historicalToolNames.includes(t.name));

      historicalTools.forEach((tool) => {
        const props = Object.keys(tool.inputSchema.properties);
        expect(props).toContain('limit');
        expect(tool.inputSchema.required).toEqual([]);
      });
    });

    it('should have 4 historical tools', () => {
      const tools = getAllTools(mockApiClient);
      const historicalTools = tools.filter((t) => historicalToolNames.includes(t.name));
      expect(historicalTools).toHaveLength(4);
    });
  });

  // ============================================================================
  // getToolsByCategory Tests
  // ============================================================================

  describe('getToolsByCategory', () => {
    it('should return an array', () => {
      const tools = getToolsByCategory(mockApiClient, ToolCategory.Simple);
      expect(Array.isArray(tools)).toBe(true);
    });

    // Note: Current implementation returns empty array (placeholder)
    it('should return empty array for placeholder implementation', () => {
      const simpleTools = getToolsByCategory(mockApiClient, ToolCategory.Simple);
      const paramTools = getToolsByCategory(mockApiClient, ToolCategory.Parameterized);

      // Placeholder returns empty - will be updated when category detection is implemented
      expect(simpleTools).toEqual([]);
      expect(paramTools).toEqual([]);
    });
  });

  // ============================================================================
  // Re-export Tests
  // ============================================================================

  describe('re-exports', () => {
    it('should export HashrateStatsTool class', () => {
      expect(HashrateStatsTool).toBeDefined();
      const tool = new HashrateStatsTool(mockApiClient);
      expect(tool.name).toBe('braiins_hashrate_stats');
    });

    it('should export DifficultyStatsTool class', () => {
      expect(DifficultyStatsTool).toBeDefined();
      const tool = new DifficultyStatsTool(mockApiClient);
      expect(tool.name).toBe('braiins_difficulty_stats');
    });

    it('should export PriceStatsTool class', () => {
      expect(PriceStatsTool).toBeDefined();
      const tool = new PriceStatsTool(mockApiClient);
      expect(tool.name).toBe('braiins_price_stats');
    });

    it('should export PoolStatsTool class', () => {
      expect(PoolStatsTool).toBeDefined();
      const tool = new PoolStatsTool(mockApiClient);
      expect(tool.name).toBe('braiins_pool_stats');
    });

    it('should export RSSFeedDataTool class', () => {
      expect(RSSFeedDataTool).toBeDefined();
      const tool = new RSSFeedDataTool(mockApiClient);
      expect(tool.name).toBe('braiins_rss_feed_data');
    });

    it('should export HalvingsTool class', () => {
      expect(HalvingsTool).toBeDefined();
      const tool = new HalvingsTool(mockApiClient);
      expect(tool.name).toBe('braiins_halvings');
    });

    it('should export TransactionStatsTool class', () => {
      expect(TransactionStatsTool).toBeDefined();
      const tool = new TransactionStatsTool(mockApiClient);
      expect(tool.name).toBe('braiins_transaction_stats');
    });

    it('should export BlocksTool class', () => {
      expect(BlocksTool).toBeDefined();
      const tool = new BlocksTool(mockApiClient);
      expect(tool.name).toBe('braiins_blocks');
    });

    it('should export ProfitabilityCalculatorTool class', () => {
      expect(ProfitabilityCalculatorTool).toBeDefined();
      const tool = new ProfitabilityCalculatorTool(mockApiClient);
      expect(tool.name).toBe('braiins_profitability_calculator');
    });

    it('should export CostToMineTool class', () => {
      expect(CostToMineTool).toBeDefined();
      const tool = new CostToMineTool(mockApiClient);
      expect(tool.name).toBe('braiins_cost_to_mine');
    });

    it('should export DailyRevenueHistoryTool class', () => {
      expect(DailyRevenueHistoryTool).toBeDefined();
      const tool = new DailyRevenueHistoryTool(mockApiClient);
      expect(tool.name).toBe('braiins_daily_revenue_history');
    });

    it('should export HashrateAndDifficultyHistoryTool class', () => {
      expect(HashrateAndDifficultyHistoryTool).toBeDefined();
      const tool = new HashrateAndDifficultyHistoryTool(mockApiClient);
      expect(tool.name).toBe('braiins_hashrate_and_difficulty_history');
    });

    it('should export HashrateValueHistoryTool class', () => {
      expect(HashrateValueHistoryTool).toBeDefined();
      const tool = new HashrateValueHistoryTool(mockApiClient);
      expect(tool.name).toBe('braiins_hashrate_value_history');
    });

    it('should export TransactionFeesHistoryTool class', () => {
      expect(TransactionFeesHistoryTool).toBeDefined();
      const tool = new TransactionFeesHistoryTool(mockApiClient);
      expect(tool.name).toBe('braiins_transaction_fees_history');
    });
  });

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe('type exports', () => {
    it('MCPTool interface should be usable', () => {
      // Type test - if this compiles, the interface is exported correctly
      const mockTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
        execute: () => Promise.resolve({ content: [{ type: 'text', text: 'test' }] }),
      };

      expect(mockTool.name).toBe('test_tool');
    });

    it('MCPToolResponse interface should be usable', () => {
      // Type test - if this compiles, the interface is exported correctly
      const response: MCPToolResponse = {
        content: [{ type: 'text', text: 'Success' }],
        isError: false,
      };

      expect(response.content).toHaveLength(1);
      expect(response.isError).toBe(false);
    });

    it('MCPToolResponse can have isError as undefined', () => {
      const response: MCPToolResponse = {
        content: [{ type: 'text', text: 'Success' }],
      };

      expect(response.isError).toBeUndefined();
    });
  });
});
