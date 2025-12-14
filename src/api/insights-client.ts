/**
 * Braiins Insights Dashboard API Client
 *
 * HTTP client for interacting with the Braiins Insights public API.
 * Provides methods for fetching Bitcoin network analytics, mining statistics,
 * and profitability metrics.
 *
 * @see https://insights.braiins.com/api
 * @see /docs/api-discovery/
 */

import { BraiinsInsightsHashrateStats, isHashrateStats } from '../types/insights-api.js';

/**
 * Base URL for Braiins Insights API
 *
 * Note: The API redirects from insights.braiins.com to learn.braiins.com.
 * Using the final URL to avoid redirect overhead.
 */
const BASE_URL = 'https://insights.braiins.com/api';

/**
 * Default timeout for API requests (in milliseconds)
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * API client error class
 */
export class InsightsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = 'InsightsApiError';
  }
}

/**
 * Network error class
 */
export class NetworkError extends Error {
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly invalidData?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * API client configuration options
 */
export interface InsightsClientConfig {
  /** Base URL override */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Braiins Insights API Client
 *
 * Provides typed methods for all Braiins Insights Dashboard API endpoints.
 */
export class InsightsApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: InsightsClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? BASE_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'braiins-insights-mcp-server/0.1.0',
      ...config.headers,
    };
  }

  /**
   * Get current Bitcoin network hashrate statistics
   *
   * Endpoint: GET /v1.0/hashrate-stats
   * Cache TTL: 5 minutes (recommended)
   *
   * @returns Hashrate statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   * @throws {ValidationError} If response validation fails
   *
   * @see /docs/api-discovery/hashrate-stats.md
   */
  async getHashrateStats(): Promise<BraiinsInsightsHashrateStats> {
    const endpoint = '/v1.0/hashrate-stats';
    const data = await this.get<BraiinsInsightsHashrateStats>(endpoint);

    // Validate response structure
    if (!isHashrateStats(data)) {
      throw new ValidationError('Invalid hashrate stats response format', data);
    }

    return data;
  }

  /**
   * Generic GET request handler
   *
   * @param endpoint - API endpoint path (e.g., '/v1.0/hashrate-stats')
   * @param params - Optional query parameters
   * @returns Parsed JSON response
   */
  private async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal,
        redirect: 'follow', // Follow redirects (insights.braiins.com → learn.braiins.com)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new InsightsApiError(
          `API request failed: ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof InsightsApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError(`Request timeout after ${this.timeout}ms`, error);
        }

        throw new NetworkError(`Network request failed: ${error.message}`, error);
      }

      throw new NetworkError('Unknown network error', error as Error);
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }
}

/**
 * Create a default Insights API client instance
 *
 * @returns Configured API client
 */
export function createInsightsClient(config?: InsightsClientConfig): InsightsApiClient {
  return new InsightsApiClient(config);
}
