const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  collectCoverageFrom: [
    'lib/database/gigService.ts',
    'lib/database/messagingService.ts',
    'lib/database/profileService.ts',
    'lib/database/fileService.ts',
    'lib/database/reviewService.ts',
    'lib/utils/locationUtils.ts',
    'lib/services/documentStorageService.ts',
    'lib/services/simpleIdVerification.ts',
    'lib/services/ocrService.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
  ],
  testMatch: [
    '**/tests/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // TODO: Increase coverage thresholds to 80% as more tests are added
  // Current thresholds are set based on existing test coverage
  // Target: branches: 80, functions: 80, lines: 80, statements: 80
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 35,
      statements: 35,
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    'tests/utils/fixtures.ts',
    'tests/utils/test-helpers.tsx',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
