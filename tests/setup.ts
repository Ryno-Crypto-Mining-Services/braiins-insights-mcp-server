/**
 * Jest setup file - runs before all tests
 *
 * Configure global test utilities, mocks, and environment variables
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log
  debug: jest.fn(), // Mock console.debug
  info: jest.fn(), // Mock console.info
  // Keep warn and error for debugging
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INSIGHTS_API_BASE_URL = 'https://insights.braiins.com/api';
process.env.INSIGHTS_CACHE_ENABLED = 'false'; // Disable caching in tests
process.env.INSIGHTS_RATE_LIMIT = '0'; // Disable rate limiting in tests
