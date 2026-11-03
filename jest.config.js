/**
 * Unit tests for pure TypeScript modules (API transport, token manager,
 * mappers). Runs on Node with the project's Babel config; no device needed.
 * Run with: npm test
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  clearMocks: true,
};
