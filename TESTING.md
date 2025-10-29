# Testing Documentation

This document describes the testing strategy and conventions used in the Gig SA platform.

## Table of Contents
- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Naming Conventions](#naming-conventions)
- [Test Categories](#test-categories)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)

## Overview

We use a comprehensive testing strategy that includes:
- **Unit tests** for pure functions and business logic
- **Integration tests** for components and context providers
- **Given-When-Then** naming pattern for all tests
- **Nested describe blocks** for hierarchical test organization

## Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: For testing React components
- **@testing-library/user-event**: For simulating user interactions
- **@testing-library/jest-dom**: Custom Jest matchers for DOM

## Running Tests

```bash
# Run tests in watch mode (for development)
npm test

# Run all tests once with coverage report
npm run test:coverage

# Run tests in CI mode (non-interactive)
npm run test:ci
```

## Test Structure

Tests are organized in the `__tests__` directory, mirroring the source code structure:

```
__tests__/
├── utils/               # Test utilities and fixtures
│   ├── test-helpers.tsx
│   └── fixtures.ts
├── lib/
│   ├── utils/           # Utility function tests
│   ├── database/        # Service layer tests
│   └── services/        # Business logic tests
├── components/          # Component tests
├── contexts/            # Context provider tests
└── hooks/               # Custom hooks tests
```

## Naming Conventions

### Given-When-Then Pattern

All tests follow the **Given-When-Then** (GWT) pattern for clarity and consistency:

```typescript
describe('FeatureName', () => {
  describe('given [initial condition]', () => {
    describe('when [action occurs]', () => {
      it('then [expected outcome]', () => {
        // Given - Setup
        const input = setupTestData()

        // When - Execute
        const result = functionUnderTest(input)

        // Then - Assert
        expect(result).toBe(expectedValue)
      })
    })
  })
})
```

### Example

```typescript
describe('calculateDistance', () => {
  describe('given two identical coordinates', () => {
    describe('when calculating distance', () => {
      it('then returns 0 kilometers', () => {
        // Given
        const coord1 = { latitude: -26.2041, longitude: 28.0473 }
        const coord2 = { latitude: -26.2041, longitude: 28.0473 }

        // When
        const distance = calculateDistance(coord1, coord2)

        // Then
        expect(distance).toBe(0)
      })
    })
  })
})
```

## Test Categories

### 1. Unit Tests

Test pure functions and isolated business logic:

```typescript
// __tests__/lib/utils/locationUtils.test.ts
describe('locationUtils', () => {
  describe('calculateDistance', () => {
    // Tests for calculateDistance function
  })

  describe('formatDistance', () => {
    // Tests for formatDistance function
  })
})
```

### 2. Integration Tests

Test components with their dependencies:

```typescript
// __tests__/components/Dashboard.test.tsx
import { renderWithProviders } from '@/__tests__/utils/test-helpers'

describe('Dashboard', () => {
  describe('given an authenticated user', () => {
    describe('when component renders', () => {
      it('then displays user dashboard', () => {
        // Test implementation
      })
    })
  })
})
```

### 3. Service Tests

Test service layer with mocked dependencies:

```typescript
// __tests__/lib/database/profileService.test.ts
describe('ProfileService', () => {
  describe('calculateProfileCompleteness', () => {
    // Tests for profile completeness calculation
  })
})
```

## Writing Tests

### Test Utilities

Use the provided test helpers in `__tests__/utils/test-helpers.tsx`:

```typescript
import {
  renderWithProviders,
  givenAnAuthenticatedUser,
  mockFirestoreDoc,
  userEvent
} from '@/__tests__/utils/test-helpers'

// Render with auth and location contexts
const { getByText } = renderWithProviders(<MyComponent />, {
  authContext: { currentUser: givenAnAuthenticatedUser() }
})
```

### Mock Data Fixtures

Use fixtures from `__tests__/utils/fixtures.ts`:

```typescript
import {
  mockOpenGig,
  mockPendingApplication,
  mockFeeConfig
} from '@/__tests__/utils/fixtures'

// Use in tests
const gig = mockOpenGig
```

### Mocking Firebase

Firebase is automatically mocked in `jest.setup.js`. For custom mock behavior:

```typescript
import { getFirestore, collection, getDocs } from 'firebase/firestore'

jest.mocked(getDocs).mockResolvedValue(mockFirestoreQuerySnapshot([
  mockGig1,
  mockGig2
]))
```

## Coverage Requirements

We aim for high test coverage with the following thresholds:

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

Coverage is automatically calculated when running `npm run test:coverage` or `npm run test:ci`.

### Priority Testing Areas

**High Priority** (must be tested):
1. Business logic calculations (profile completeness, relevance scoring)
2. Location utilities (distance calculations, filtering)
3. Payment processing
4. Security-related functions
5. Data validation

**Medium Priority** (should be tested):
1. Service layer CRUD operations
2. Context providers and state management
3. Form validation
4. Error handling

**Lower Priority** (optional):
1. UI components with minimal logic
2. Simple utility functions
3. Type definitions

## Best Practices

### 1. Descriptive Test Names

❌ **Bad**:
```typescript
it('works', () => {})
it('test user creation', () => {})
```

✅ **Good**:
```typescript
it('then creates user with correct email and password', () => {})
it('then throws error when email is invalid', () => {})
```

### 2. One Assertion Per Test

Focus each test on a single behavior:

❌ **Bad**:
```typescript
it('then handles user profile', () => {
  expect(user.email).toBe('test@example.com')
  expect(user.name).toBe('Test')
  expect(user.isVerified).toBe(true)
  expect(calculateCompleteness(user)).toBe(100)
})
```

✅ **Good**:
```typescript
describe('given a complete user profile', () => {
  it('then email matches expected value', () => {
    expect(user.email).toBe('test@example.com')
  })

  it('then profile completeness is 100%', () => {
    expect(calculateCompleteness(user)).toBe(100)
  })
})
```

### 3. Test Edge Cases

Always test boundary conditions and error cases:

```typescript
describe('given distance calculation', () => {
  it('then handles zero distance', () => {})
  it('then handles maximum distance', () => {})
  it('then handles null coordinates', () => {})
  it('then handles negative coordinates', () => {})
})
```

### 4. Arrange-Act-Assert

Structure test bodies clearly:

```typescript
it('then returns correct result', () => {
  // Arrange (Given)
  const input = setupTestData()

  // Act (When)
  const result = performAction(input)

  // Assert (Then)
  expect(result).toBe(expected)
})
```

## Examples

See the following files for complete examples:
- `__tests__/lib/utils/locationUtils.test.ts` - Pure function testing
- `__tests__/lib/database/profileService.test.ts` - Service layer testing
- `__tests__/lib/database/gigService.recommendation.test.ts` - Algorithm testing

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Follow the Given-When-Then naming pattern
3. Use nested describe blocks for organization
4. Add fixtures for reusable mock data
5. Ensure tests pass before committing
6. Aim for high coverage on critical paths

## Continuous Integration

Tests run automatically on:
- Every pull request
- Before merging to main
- On main branch commits

CI configuration will be added in a separate branch.
