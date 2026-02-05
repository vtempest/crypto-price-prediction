/**
 * Test setup file for Vitest
 * This file runs before all test files
 */

import { beforeAll, afterEach, afterAll } from 'vitest'

// Setup before all tests
beforeAll(() => {
  // Set test environment variables if needed
  process.env.NODE_ENV = 'test'
})

// Cleanup after each test
afterEach(() => {
  // Clear all mocks after each test
  // This is automatically done by Vitest when using vi.clearAllMocks()
  // but we include it here as a reminder
})

// Cleanup after all tests
afterAll(() => {
  // Any global cleanup
})
