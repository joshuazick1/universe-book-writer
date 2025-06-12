/**
 * Basic Frontend Test
 * Simple test to verify the test infrastructure is working
 */

import { describe, it, expect } from '@jest/globals';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './utils';

// Simple test component
function TestComponent() {
  return <div data-testid="test-component">Test Component</div>;
}

describe('Basic Frontend Test Infrastructure', () => {
  describe('Test Utilities', () => {
    it('should render a basic component', () => {
      renderWithProviders(<TestComponent />);
      
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    it('should render with router context', () => {
      renderWithProviders(<TestComponent />);
      
      // Should render without errors (router context is available)
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });
  });

  describe('Test Environment', () => {
    it('should have Jest globals available', () => {
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
    });

    it('should have testing library utilities available', () => {
      expect(screen).toBeDefined();
      expect(renderWithProviders).toBeDefined();
    });

    it('should support JSX syntax', () => {
      const element = <div>JSX works</div>;
      expect(element.type).toBe('div');
      expect(element.props.children).toBe('JSX works');
    });
  });

  describe('Mock Utilities', () => {
    it('should support basic mocking', () => {
      const mockFn = jest.fn();
      mockFn('test');
      
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });    it('should have mock user data available', () => {
      const { mockUser, mockAdminUser, validCredentials } = require('./utils');
      
      expect(mockUser).toBeDefined();
      expect(mockUser.email).toBe('test@example.com');
      expect(mockAdminUser).toBeDefined();
      expect(mockAdminUser.role).toBe('admin');
      expect(validCredentials).toBeDefined();
      expect(validCredentials.email).toBe('test@example.com');
    });
  });
});
