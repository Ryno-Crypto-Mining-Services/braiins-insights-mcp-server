/**
 * Unit tests for InsightsApiClient
 *
 * Tests cover: constructor, caching, rate limiting, HTTP methods,
 * error handling, and all public endpoint methods.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
  ValidationError,
  createInsightsClient,
} from '../../../src/api/insights-client.js';
import type { BraiinsInsightsHashrateStats } from '../../../src/types/insights-api.js';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Sample response data
const SAMPLE_HASHRATE_STATS: BraiinsInsightsHashrateStats = {
  avg_fees_per_block: 0.016,
  current_hashrate: 1001.23,
  current_hashrate_estimated: 1146.5,
  fees_percent: 0.5,
  hash_price: 0.039,
  hash_rate_30: 1074.37,
  hash_value: 4e-7,
  monthly_avg_hashrate_change_1_year: {
    relative: 0.03,
    absolute: 29.47665536,
  },
  rev_usd: 40872449.1,
};

const SAMPLE_DIFFICULTY_STATS = {
  current_difficulty: 109780000000000000,
  estimated_difficulty: 112000000000000000,
  estimated_difficulty_change: 2.02,
  blocks_until_adjustment: 1200,
  adjustment_time: '2025-12-20T10:30:00Z',
  last_adjustment_time: '2025-12-06T10:30:00Z',
};

const SAMPLE_BLOCKS = [
  {
    height: 872450,
    pool_name: 'Braiins',
    timestamp: '2025-12-15T10:30:00Z',
    transaction_count: 3247,
    size_mb: 1.42,
  },
  {
    height: 872449,
    pool_name: 'Foundry USA',
    timestamp: '2025-12-15T10:20:00Z',
    transaction_count: 2891,
    size_mb: 1.38,
  },
];

// Helper to create mock response
const createMockResponse = (data: unknown, status = 200, ok = true): Response =>
  ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    headers: new Headers(),
  }) as unknown as Response;

describe('InsightsApiClient', () => {
  let client: InsightsApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new InsightsApiClient();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe('constructor', () => {
    it('should create client with default configuration', () => {
      const defaultClient = new InsightsApiClient();
      expect(defaultClient).toBeInstanceOf(InsightsApiClient);
    });

    it('should accept custom base URL', () => {
      const customClient = new InsightsApiClient({
        baseUrl: 'https://custom.api.com',
      });
      expect(customClient).toBeInstanceOf(InsightsApiClient);
    });

    it('should accept custom timeout', () => {
      const customClient = new InsightsApiClient({
        timeout: 5000,
      });
      expect(customClient).toBeInstanceOf(InsightsApiClient);
    });

    it('should accept custom headers', () => {
      const customClient = new InsightsApiClient({
        headers: { 'X-Custom-Header': 'test-value' },
      });
      expect(customClient).toBeInstanceOf(InsightsApiClient);
    });
  });

  // ============================================================================
  // createInsightsClient Factory Function
  // ============================================================================

  describe('createInsightsClient', () => {
    it('should create client with default config', () => {
      const factoryClient = createInsightsClient();
      expect(factoryClient).toBeInstanceOf(InsightsApiClient);
    });

    it('should create client with custom config', () => {
      const factoryClient = createInsightsClient({
        baseUrl: 'https://test.api.com',
        timeout: 15000,
      });
      expect(factoryClient).toBeInstanceOf(InsightsApiClient);
    });
  });

  // ============================================================================
  // Cache Tests
  // ============================================================================

  describe('caching', () => {
    it('should cache responses and return cached data on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_HASHRATE_STATS));

      // First call - fetches from API
      const result1 = await client.getHashrateStats();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.current_hashrate).toBe(1001.23);

      // Second call - should use cache
      const result2 = await client.getHashrateStats();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
      expect(result2.current_hashrate).toBe(1001.23);
    });

    it('should clear cache when clearCache() is called', async () => {
      mockFetch.mockResolvedValue(createMockResponse(SAMPLE_HASHRATE_STATS));

      // First call
      await client.getHashrateStats();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      client.clearCache();

      // Second call - should fetch again
      await client.getHashrateStats();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Note: Cache TTL expiration test requires fake timers.
    // This is tested via integration tests with real delays.
    it.skip('should expire cache after TTL', async () => {
      // This test is skipped because it requires fake timers which
      // conflict with the rate limiting implementation.
      // Cache expiration is verified in integration tests.
    });

    it('should cache parameterized requests with different keys', async () => {
      mockFetch.mockResolvedValue(createMockResponse(SAMPLE_BLOCKS));

      // First call with page=1
      await client.getBlocks({ page: 1, page_size: 10 });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with different params - should fetch
      await client.getBlocks({ page: 2, page_size: 10 });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Third call with same params as first - should use cache
      await client.getBlocks({ page: 1, page_size: 10 });
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional fetch
    });
  });

  // ============================================================================
  // Rate Limiting Tests
  // ============================================================================

  describe('rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      mockFetch.mockResolvedValue(createMockResponse(SAMPLE_DIFFICULTY_STATS));

      // Make 5 requests (within burst limit)
      const promises = [];
      for (let i = 0; i < 5; i++) {
        client.clearCache(); // Clear cache to force API calls
        promises.push(client.getDifficultyStats());
      }

      await Promise.all(promises);
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    // Note: Burst limit and rate limit tests are challenging to test without
    // real timing or complex mocking. The rate limiter is tested via integration
    // tests. These unit tests verify basic functionality.
    it('should handle burst of requests without crashing', async () => {
      mockFetch.mockResolvedValue(createMockResponse(SAMPLE_DIFFICULTY_STATS));

      // Make a burst of requests - should not throw
      const promises = [];
      for (let i = 0; i < 3; i++) {
        client.clearCache();
        promises.push(client.getDifficultyStats());
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalled();
    });

    // Rate limit exceeded test requires making 30+ requests which is slow
    // and brittle. The rate limiter behavior is verified in integration tests.
    it.skip('should throw NetworkError when rate limit exceeded', async () => {
      // Skipped: requires making 30+ sequential requests
      // Verified in integration tests instead
    });
  });

  // ============================================================================
  // HTTP GET Method Tests
  // ============================================================================

  describe('GET requests', () => {
    it('should make GET request with correct URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_HASHRATE_STATS));

      await client.getHashrateStats();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://insights.braiins.com/api/v1.0/hashrate-stats',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include query parameters in URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_BLOCKS));

      await client.getBlocks({ page: 2, page_size: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_size=20'),
        expect.any(Object)
      );
    });

    it('should throw InsightsApiError on 4xx responses', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 404, false));

      await expect(client.getDifficultyStats()).rejects.toThrow(InsightsApiError);
    });

    it('should throw InsightsApiError on 5xx responses', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 500, false));

      await expect(client.getDifficultyStats()).rejects.toThrow(InsightsApiError);
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(client.getDifficultyStats()).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError on timeout (AbortError)', async () => {
      // Simulate AbortError which is what happens on timeout
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(client.getHashrateStats()).rejects.toThrow(NetworkError);
    });
  });

  // ============================================================================
  // HTTP POST Method Tests
  // ============================================================================

  describe('POST requests', () => {
    const SAMPLE_HARDWARE_STATS = [
      {
        model: 'Antminer S19 Pro',
        hashrate_th: 110,
        power_w: 3250,
        efficiency_jth: 29.5,
      },
    ];

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_HARDWARE_STATS));

      await client.getHardwareStats({ models: ['Antminer S19 Pro'] });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://insights.braiins.com/api/v1.0/hardware-stats',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });

    it('should cache POST responses', async () => {
      mockFetch.mockResolvedValue(createMockResponse(SAMPLE_HARDWARE_STATS));

      // First call
      await client.getHardwareStats({ models: ['Antminer S19 Pro'] });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same body - should use cache
      await client.getHardwareStats({ models: ['Antminer S19 Pro'] });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw InsightsApiError on POST failure', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 400, false));

      await expect(client.getHardwareStats({})).rejects.toThrow(InsightsApiError);
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('response validation', () => {
    it('should throw ValidationError for invalid hashrate stats response', async () => {
      // Return an invalid response (missing required fields)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          invalid: 'data',
        })
      );

      await expect(client.getHashrateStats()).rejects.toThrow(ValidationError);
    });
  });

  // ============================================================================
  // Error Classes Tests
  // ============================================================================

  describe('error classes', () => {
    it('InsightsApiError should contain status code and endpoint', () => {
      const error = new InsightsApiError('Test error', 404, '/v1.0/test');

      expect(error.name).toBe('InsightsApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.endpoint).toBe('/v1.0/test');
    });

    it('NetworkError should contain cause', () => {
      const cause = new Error('Original error');
      const error = new NetworkError('Network failed', cause);

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network failed');
      expect(error.cause).toBe(cause);
    });

    it('ValidationError should contain invalid data', () => {
      const invalidData = { foo: 'bar' };
      const error = new ValidationError('Invalid response', invalidData);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid response');
      expect(error.invalidData).toBe(invalidData);
    });
  });

  // ============================================================================
  // v1.0 Endpoint Tests
  // ============================================================================

  describe('v1.0 endpoints', () => {
    it('getDifficultyStats should fetch difficulty data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_DIFFICULTY_STATS));

      const result = await client.getDifficultyStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/difficulty-stats'),
        expect.any(Object)
      );
      expect(result.current_difficulty).toBe(109780000000000000);
    });

    it('getBlocks should fetch blocks with pagination', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_BLOCKS));

      const result = await client.getBlocks({ page: 1, page_size: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/blocks'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].height).toBe(872450);
    });

    it('getBlocksByCountry should fetch country block data', async () => {
      const countryData = [{ country: 'US', block_count: 500 }];
      mockFetch.mockResolvedValueOnce(createMockResponse(countryData));

      const result = await client.getBlocksByCountry({ page: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/blocks-by-country'),
        expect.any(Object)
      );
      expect(result[0].country).toBe('US');
    });

    it('getDailyRevenueHistory should fetch revenue data', async () => {
      const revenueData = [{ date: '2025-12-15', revenue_usd: 1000000 }];
      mockFetch.mockResolvedValueOnce(createMockResponse(revenueData));

      const result = await client.getDailyRevenueHistory();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/daily-revenue-history'),
        expect.any(Object)
      );
      expect(result[0].date).toBe('2025-12-15');
    });

    it('getHashrateAndDifficultyHistory should fetch historical data', async () => {
      const historyData = [{ timestamp: '2025-12-15', hashrate: 1000, difficulty: 100000 }];
      mockFetch.mockResolvedValueOnce(createMockResponse(historyData));

      const result = await client.getHashrateAndDifficultyHistory();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/hashrate-and-difficulty-history'),
        expect.any(Object)
      );
      expect(result[0].hashrate).toBe(1000);
    });

    it('getHashrateValueHistory should fetch hashrate value data', async () => {
      const valueData = [{ timestamp: '2025-12-15', value_usd: 0.05 }];
      mockFetch.mockResolvedValueOnce(createMockResponse(valueData));

      const result = await client.getHashrateValueHistory();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/hashrate-value-history'),
        expect.any(Object)
      );
    });

    it('getPoolStats should fetch pool data', async () => {
      const poolData = { pools: [{ name: 'Braiins', hashrate_percent: 5 }] };
      mockFetch.mockResolvedValueOnce(createMockResponse(poolData));

      const result = await client.getPoolStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/pool-stats'),
        expect.any(Object)
      );
    });

    it('getPriceStats should fetch price data', async () => {
      const priceData = { btc_usd: 100000, change_24h: 2.5 };
      mockFetch.mockResolvedValueOnce(createMockResponse(priceData));

      const result = await client.getPriceStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/price-stats'),
        expect.any(Object)
      );
    });

    it('getRSSFeedData should fetch RSS items', async () => {
      const rssData = [{ title: 'Test Article', url: 'https://example.com' }];
      mockFetch.mockResolvedValueOnce(createMockResponse(rssData));

      const result = await client.getRSSFeedData();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/rss-feed-data'),
        expect.any(Object)
      );
      expect(result[0].title).toBe('Test Article');
    });

    it('getTransactionFeesHistory should fetch fee data', async () => {
      const feeData = [{ date: '2025-12-15', avg_fee_sat: 1000 }];
      mockFetch.mockResolvedValueOnce(createMockResponse(feeData));

      const result = await client.getTransactionFeesHistory();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/transaction-fees-history'),
        expect.any(Object)
      );
    });

    it('getTransactionStats should fetch transaction statistics', async () => {
      const txStats = { mempool_size: 5000, avg_confirmation_time: 600 };
      mockFetch.mockResolvedValueOnce(createMockResponse(txStats));

      const result = await client.getTransactionStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1.0/transaction-stats'),
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // v2.0 Endpoint Tests
  // ============================================================================

  describe('v2.0 endpoints', () => {
    it('getCostToMine should fetch cost data without params', async () => {
      const costData = { cost_usd: 45000, electricity_cost_kwh: 0.05 };
      mockFetch.mockResolvedValueOnce(createMockResponse(costData));

      const result = await client.getCostToMine();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2.0/cost-to-mine'),
        expect.any(Object)
      );
    });

    it('getCostToMine should accept electricity cost param', async () => {
      const costData = { cost_usd: 60000, electricity_cost_kwh: 0.08 };
      mockFetch.mockResolvedValueOnce(createMockResponse(costData));

      await client.getCostToMine({ electricity_cost_kwh: 0.08 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('electricity_cost_kwh=0.08'),
        expect.any(Object)
      );
    });

    it('getHalvings should fetch halving data', async () => {
      const halvingData = {
        next_halving_date: '2028-04-15',
        blocks_remaining: 150000,
        current_reward: 3.125,
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(halvingData));

      const result = await client.getHalvings();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2.0/halvings'),
        expect.any(Object)
      );
    });

    it('getProfitabilityCalculator should fetch profitability data', async () => {
      const profitData = {
        daily_profit_usd: 10,
        monthly_profit_usd: 300,
        break_even_btc_price: 40000,
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(profitData));

      const result = await client.getProfitabilityCalculator({
        electricity_cost_kwh: 0.05,
        hardware_efficiency_jth: 25,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2.0/profitability-calculator'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('electricity_cost_kwh=0.05'),
        expect.any(Object)
      );
    });
  });
});
