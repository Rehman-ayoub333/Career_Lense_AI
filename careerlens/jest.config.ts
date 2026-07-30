import type { Config } from 'jest'

/**
 * Unit tests for the pure logic layer.
 *
 * Scope is deliberate: sanitisation, JSON recovery, rate limiting, scoring,
 * validation guards and history persistence. These are the modules where a
 * regression is silent — a broken sanitiser or a mis-parsed model response
 * produces plausible-looking output rather than a crash — which makes them
 * exactly the code worth pinning down.
 *
 * Components and routes are covered by type checking and the production build;
 * adding a DOM test runner would mean new dependencies for a thinner return.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // The app targets the bundler's module resolution; tests run in Node.
          module: 'commonjs',
          moduleResolution: 'node',
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  clearMocks: true,
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/**/index.ts'],
}

export default config
