// Backend-wide Jest config. Previously missing entirely — `npx jest` ran
// with zero configuration, so ts-jest (already an installed dependency)
// was never wired in and every *.spec.ts file failed to parse with
// "Cannot use import statement outside a module", regardless of service.
// Confirmed this was pre-existing and repo-wide, not specific to any one
// service, before adding this file. Standard NestJS/ts-jest shape — no
// per-service or business logic here.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    // isolatedModules skips full program type-checking during the test
    // transform (transpile-only, like ts-node's equivalent flag) — type
    // correctness is already verified separately via `tsc --noEmit`, and
    // without this a 48-spec-file run took upwards of 10+ minutes.
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};
