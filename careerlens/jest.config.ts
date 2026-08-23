import type { Config } from 'jest'

/**
 * Unit, integration and component tests.
 *
 * The default environment stays `node`, which is right for the pure logic layer
 * and for the API-route tests. Component tests opt into a DOM per file with a
 * `@jest-environment jsdom` docblock rather than the whole suite paying for one
 * — the logic tests are the majority and none of them touch a DOM.
 *
 * End-to-end tests are Playwright's and live in `e2e/`, ignored here: they drive
 * a real browser against a running server, which is a different thing from a
 * test runner and should not be started by `npm test`.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/'],
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
