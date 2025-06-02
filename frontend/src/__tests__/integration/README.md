# Integration Testing for AJ Long Electric FSM

This directory contains comprehensive integration tests for the Field Service Management system. These tests verify end-to-end workflows and component interactions.

## Test Structure

### Test Files

- **CustomerWorkflow.integration.test.tsx** - Customer management workflows including CRUD operations, property management, and navigation flows
- **JobManagement.integration.test.tsx** - Job creation, scheduling, material selection, and status management workflows  
- **InventoryIntegration.integration.test.tsx** - Inventory management, stock adjustments, and job-inventory integration
- **AuthenticationFlow.integration.test.tsx** - User authentication, registration, profile management, and role-based access control

### Key Workflows Tested

#### Customer Management
- Customer list navigation and filtering
- Customer detail view with property management
- Adding, editing, and deleting customer properties
- Form validation and error handling
- Navigation between customer list and detail views

#### Job Management
- Job creation with customer and property selection
- Material selection with markup calculation
- Job status workflow management
- Integration with inventory for material tracking
- Calendar-based job scheduling
- Validation of required fields and business rules

#### Inventory Integration
- Inventory item management and categorization
- Stock level monitoring and reorder alerts
- Material selection in job creation
- Markup calculation by price tiers (50%, 40%, 35%, 30%, 25%, 20%)
- Stock adjustment workflows
- Integration with job material requirements

#### Authentication & Authorization
- User login and registration flows
- Profile management and password changes
- Role-based feature access (admin vs technician)
- Session management and token handling
- Error recovery and network failure handling

## Running Integration Tests

### Available Commands

```bash
# Run all integration tests
npm run test:integration

# Run integration tests in watch mode
npm run test:integration:watch

# Run integration tests with coverage report
npm run test:integration:coverage

# Run all tests (unit + integration)
npm run test:all
```

### Test Configuration

Integration tests use a separate Jest configuration (`jest.integration.config.js`) with:
- Longer timeout (15 seconds) for complex workflows
- Integration-specific setup and teardown
- Coverage thresholds appropriate for integration testing
- Enhanced mocking for external dependencies

## Test Patterns and Best Practices

### Mock Strategy
- **API Services**: Comprehensive mocking of all API endpoints
- **Authentication**: Mock localStorage and token management
- **Navigation**: Mock react-router-dom for route testing
- **External Libraries**: Mock Material-UI components as needed

### Test Structure
Each test follows the AAA pattern:
- **Arrange**: Set up mocks and initial state
- **Act**: Perform user interactions
- **Assert**: Verify expected outcomes and API calls

### Error Testing
All workflows include error handling tests:
- Network failures
- API errors (400, 401, 500 status codes)
- Validation errors
- Session timeouts

### Data Flow Testing
Tests verify complete data flows:
1. User interaction triggers API calls
2. Loading states are shown appropriately
3. Success/error states are handled correctly
4. UI updates reflect backend changes
5. Navigation occurs as expected

## Key Business Logic Tests

### Material Markup System
Tests verify the tiered markup calculation:
- $0-$25: 50% markup
- $25.01-$50: 40% markup
- $50.01-$100: 35% markup
- $100.01-$250: 30% markup
- $250.01-$500: 25% markup
- $500+: 20% markup

### Property Management
Tests ensure proper electrical property tracking:
- Panel location and type information
- Special access instructions
- Multiple properties per customer
- Property selection in job creation

### Job Status Workflow
Tests verify proper job state transitions:
- scheduled → in_progress → completed
- Technician assignment workflows
- Customer notifications (mocked)

### Inventory Integration
Tests confirm inventory-job integration:
- Material availability checking
- Stock deduction on job creation
- Reorder level monitoring
- Category-based filtering

## Debugging Integration Tests

### Common Issues
1. **Timeout Errors**: Increase timeout in test files for slow operations
2. **Mock Issues**: Ensure all API calls are properly mocked
3. **State Management**: Verify authentication context is properly set up
4. **Navigation**: Check that useNavigate mock is configured correctly

### Debugging Tips
- Use `screen.debug()` to see current DOM state
- Add `await waitFor(() => {})` for async operations
- Check mock call history with `expect(mockFn).toHaveBeenCalledWith()`
- Use Jest's `--verbose` flag for detailed test output

## Coverage Goals

Integration tests aim for:
- 60%+ line coverage across tested workflows
- Complete happy path coverage for all major features
- Error scenario coverage for critical workflows
- Cross-component interaction verification

## Maintenance

### Adding New Tests
1. Create test file with `.integration.test.tsx` suffix
2. Follow existing patterns for mock setup
3. Include both success and error scenarios
4. Test complete user workflows, not isolated components

### Updating Tests
When adding new features:
1. Update relevant integration tests
2. Add new workflow tests for major features
3. Update mocks to match new API contracts
4. Verify test coverage remains adequate

## Dependencies

Integration tests rely on:
- React Testing Library for DOM interaction
- Jest for test framework and mocking
- Mock API responses that match backend contracts
- Material-UI component mocking for consistent rendering