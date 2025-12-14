/**
 * Central type exports for Braiins Insights MCP Server
 *
 * Re-exports all type definitions for convenient importing.
 */

// API response types
export type { BraiinsInsightsHashrateStats } from './insights-api.js';

export { isHashrateStats } from './insights-api.js';

// Additional types will be added in Phase 2:
// - BraiinsInsightsDifficultyStats
// - BraiinsInsightsBlockData
// - BraiinsInsightsProfitability
// - etc.
