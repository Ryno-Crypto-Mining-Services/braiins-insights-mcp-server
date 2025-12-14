/**
 * Jest setup file - runs before all tests
 *
 * Configure global test utilities, mocks, and environment variables
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INSIGHTS_API_BASE_URL = 'https://insights.braiins.com/api';
process.env.INSIGHTS_CACHE_ENABLED = 'false'; // Disable caching in tests
process.env.INSIGHTS_RATE_LIMIT = '0'; // Disable rate limiting in tests
