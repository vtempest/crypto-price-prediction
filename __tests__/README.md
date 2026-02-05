# Test Suite

This directory contains comprehensive unit tests for the Polymarket price history functions.

## Test Structure

```
__tests__/
├── api/
│   └── prices.test.ts          # Tests for fetchPriceHistory
├── sync/
│   └── syncPriceHistory.test.ts # Tests for syncPriceHistory
├── utils/
│   └── mockFactories.ts        # Mock data factories and helpers
├── setup.ts                     # Global test setup
└── README.md                    # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test prices.test.ts
```

## Test Coverage

The test suite covers:

### `fetchPriceHistory` Tests
- ✅ Successful API calls with various parameters
- ✅ Error handling (400, 404, 500 errors)
- ✅ URL construction and query parameters
- ✅ Network failures and timeouts
- ✅ Response data validation
- ✅ Edge cases (special characters, large datasets)

### `syncPriceHistory` Tests
- ✅ Successful synchronization with default and custom options
- ✅ Data flow from fetch to save
- ✅ Error propagation from fetch and save operations
- ✅ Return value validation
- ✅ Edge cases (empty data, special tokens, large datasets)
- ✅ Options handling

## Mock Factories

The `mockFactories.ts` file provides utilities for creating test data:

### `createMockPriceHistory(numPoints, options)`
Creates a mock price history with a specified number of points.

```typescript
const mockData = createMockPriceHistory(10, {
  startTimestamp: 1700000000,
  intervalSeconds: 900, // 15 minutes
  startPrice: 0.5,
  priceIncrement: 0.01,
})
```

### `createMockPriceHistoryWithRandomWalk(numPoints, options)`
Creates a mock price history with random walk prices (useful for testing realistic scenarios).

```typescript
const mockData = createMockPriceHistoryWithRandomWalk(100, {
  startPrice: 0.5,
  volatility: 0.05,
})
```

### `createMockFetchResponse(data, options)`
Creates a mock fetch Response object for testing.

```typescript
const response = createMockFetchResponse(
  { history: [...] },
  { ok: true, status: 200 }
)
```

### `createMockErrorResponse(status, errorMessage)`
Creates a mock error response.

```typescript
const errorResponse = createMockErrorResponse(400, 'Invalid token ID')
```

## Writing New Tests

When adding new tests:

1. **Follow the existing structure**: Group related tests in `describe` blocks
2. **Use mock factories**: Reuse the mock factories in `mockFactories.ts`
3. **Clear mocks**: Always use `beforeEach` to clear mocks
4. **Test edge cases**: Include tests for boundary conditions
5. **Document complex tests**: Add comments explaining non-obvious test logic

### Example Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { yourFunction } from '../your-module'

describe('yourFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful cases', () => {
    it('should handle basic case', async () => {
      // Arrange
      const input = 'test'

      // Act
      const result = await yourFunction(input)

      // Assert
      expect(result).toBe('expected')
    })
  })

  describe('error handling', () => {
    it('should throw error on invalid input', async () => {
      await expect(yourFunction('')).rejects.toThrow('Invalid input')
    })
  })
})
```

## Continuous Integration

Tests should pass before merging any pull request. The CI pipeline runs:

1. All unit tests
2. Coverage report generation
3. Linting (if configured)

## Troubleshooting

### Tests failing locally but passing in CI
- Check Node.js version matches CI environment
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for environment-specific issues

### Mock not being called
- Ensure mocks are set up before the function is imported
- Check that `vi.clearAllMocks()` is in `beforeEach`
- Verify the mock path matches the import path exactly

### Type errors in tests
- Ensure `@types` packages are installed
- Check that TypeScript configuration includes test files
- Use type assertions when necessary: `as unknown as Type`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mock Service Worker](https://mswjs.io/) - For more complex API mocking
