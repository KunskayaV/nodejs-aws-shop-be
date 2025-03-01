module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
