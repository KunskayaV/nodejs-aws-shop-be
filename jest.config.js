module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
