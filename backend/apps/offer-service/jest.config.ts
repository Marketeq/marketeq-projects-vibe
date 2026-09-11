// apps/offer-service/jest.config.ts
// OS-31: Jest configuration — unit and integration test separation
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  // Needed for class-validator decorators (e.g. ListOffersQueryDto) to work
  // when a spec instantiates/validates a DTO directly — the full app gets
  // this for free via main.ts's early NestFactory bootstrap, but isolated
  // unit tests never go through main.ts. No existing spec in this service
  // imported a decorated DTO before, so this gap was never hit until now.
  setupFiles: ['reflect-metadata'],

  testMatch: process.env.TEST_TYPE === 'integration'
    ? ['<rootDir>/test/integration/**/*.spec.ts']
    : ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.spec.ts', '!<rootDir>/test/integration/**/*.spec.ts'],

  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@libs/auth$': '<rootDir>/../../libs/auth/src',
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
    '!src/**/*.entity.ts',
  ],
  coverageDirectory: 'coverage',

  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.app.json',
    }],
  },

  testTimeout: process.env.TEST_TYPE === 'integration' ? 30000 : 5000,
  verbose: true,
};

export default config;