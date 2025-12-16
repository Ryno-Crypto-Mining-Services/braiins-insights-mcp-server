/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@tools/(.*)$': '<rootDir>/src/tools/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/types/**/*.ts', // Type definitions and validators tested separately
  ],
  // Coverage thresholds for Phase 1 (tools only, API client in Phase 2)
  // Tool-specific thresholds ensure high quality for MCP tool implementations
  coverageThreshold: {
    // Simple, parameterized, and historical tools - high thresholds
    './src/tools/simple/**/*.ts': {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    './src/tools/parameterized/**/*.ts': {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    './src/tools/historical/**/*.ts': {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    // Composite tools - lower thresholds due to complex partial failure handling
    // Promise.allSettled patterns and graceful degradation have many edge case branches
    './src/tools/composite/**/*.ts': {
      branches: 70,
      functions: 95,
      lines: 85,
      statements: 85,
    },
    // Tool registry index
    './src/tools/index.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Global thresholds reflect current Phase 1 state (API client not yet fully tested)
    global: {
      branches: 65,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
};
