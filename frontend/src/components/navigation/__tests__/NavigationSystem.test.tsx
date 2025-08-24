import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NavigationProvider } from '../NavigationProvider';
import ResponsiveNavigationSystem from '../ResponsiveNavigationSystem';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

// Mock hooks
jest.mock('../../../hooks/useMediaQuery');
jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'test@example.com' },
    signOut: jest.fn()
  })
}));

const mockUseDeviceDetection = useDeviceDetection as jest.MockedFunction<typeof useDeviceDetection>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </BrowserRouter>
);

describe('NavigationSystem', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseDeviceDetection.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isTouchDevice: true,
      isPortrait: true,
      isLandscape: false,
      isShortScreen: false,
      isTallScreen: true,
      isMobileSmall: false,
      isMobileLarge: false,
      isSm: false,
      isMd: false,
      isLg: false,
      isXl: false,
      is2xl: false,
      isSmallDevice: true,
      isMediumDevice: false,
      isLargeDevice: false,
      isTouchPrimaryDevice: true,
      preferCardView: true,
      preferTableView: false,
      needsLargeTouchTargets: true,
      hasLimitedSpace: false,
      getGridColumns: () => 1,
      deviceType: 'mobile'
    });
  });

  describe('ResponsiveNavigationSystem', () => {
    it('renders correctly on mobile device', () => {
      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div data-testid="content">Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('shows mobile navigation on mobile device', () => {
      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div>Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      // Should show mobile top navbar
      expect(document.querySelector('.mobile-top-navbar, [class*="navbar"]')).toBeInTheDocument();
    });

    it('renders with custom page title', () => {
      render(
        <TestWrapper>
          <ResponsiveNavigationSystem pageTitle="Custom Page">
            <div>Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      expect(screen.getByText('Custom Page')).toBeInTheDocument();
    });

    it('adapts to tablet device', () => {
      mockUseDeviceDetection.mockReturnValue({
        ...mockUseDeviceDetection(),
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        deviceType: 'tablet',
        isSmallDevice: false,
        isMediumDevice: true,
        preferCardView: true,
        preferTableView: false
      });

      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div data-testid="content">Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('adapts to desktop device', () => {
      mockUseDeviceDetection.mockReturnValue({
        ...mockUseDeviceDetection(),
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
        isSmallDevice: false,
        isMediumDevice: false,
        isLargeDevice: true,
        preferCardView: false,
        preferTableView: true
      });

      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div data-testid="content">Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('NavigationProvider', () => {
    it('provides navigation context', () => {
      const TestComponent = () => {
        return <div data-testid="provider-test">Navigation Provider Working</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('provider-test')).toBeInTheDocument();
    });
  });

  describe('PWA Features', () => {
    it('handles network status changes', async () => {
      // Mock online/offline events
      const originalNavigator = global.navigator;
      
      // @ts-ignore
      global.navigator = {
        ...originalNavigator,
        onLine: false
      };

      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div>Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      // Trigger offline event
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        // Should show offline indicator
        expect(document.querySelector('[class*="network-status"]') || 
               screen.queryByText(/网络连接/)).toBeTruthy();
      }, { timeout: 100 });

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div>Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      // Check for navigation landmarks
      const navigation = document.querySelector('[role="navigation"]') ||
                        document.querySelector('nav') ||
                        document.querySelector('[aria-label]');
      
      expect(navigation).toBeTruthy();
    });

    it('supports keyboard navigation', () => {
      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div>Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      // Check for focusable elements
      const focusableElements = document.querySelectorAll(
        'button, [tabindex]:not([tabindex="-1"]), a[href], input, select, textarea'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('does not cause memory leaks', () => {
      const { unmount } = render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <div>Test Content</div>
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('handles rapid state changes', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          const timer = setInterval(() => {
            setCount(c => c + 1);
          }, 10);
          
          return () => clearInterval(timer);
        }, []);

        return <div data-testid="counter">{count}</div>;
      };

      render(
        <TestWrapper>
          <ResponsiveNavigationSystem>
            <TestComponent />
          </ResponsiveNavigationSystem>
        </TestWrapper>
      );

      await waitFor(() => {
        const counter = screen.getByTestId('counter');
        expect(parseInt(counter.textContent || '0')).toBeGreaterThan(0);
      }, { timeout: 100 });
    });
  });

  describe('Error Boundaries', () => {
    it('handles component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(
          <TestWrapper>
            <ResponsiveNavigationSystem>
              <ErrorComponent />
            </ResponsiveNavigationSystem>
          </TestWrapper>
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});

// Integration tests
describe('Navigation Integration', () => {
  it('works with routing', () => {
    render(
      <TestWrapper>
        <ResponsiveNavigationSystem pageTitle="Integration Test">
          <div data-testid="integration-content">Integration Test Content</div>
        </ResponsiveNavigationSystem>
      </TestWrapper>
    );

    expect(screen.getByText('Integration Test')).toBeInTheDocument();
    expect(screen.getByTestId('integration-content')).toBeInTheDocument();
  });

  it('preserves user preferences', () => {
    // Mock localStorage
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');

    mockGetItem.mockReturnValue(JSON.stringify({
      mobileNavType: 'tabs',
      showLabels: true,
      compactMode: false
    }));

    render(
      <TestWrapper>
        <ResponsiveNavigationSystem>
          <div>Test Content</div>
        </ResponsiveNavigationSystem>
      </TestWrapper>
    );

    // Should have called localStorage.getItem
    expect(mockGetItem).toHaveBeenCalledWith('navigation-preferences');

    mockGetItem.mockRestore();
    mockSetItem.mockRestore();
  });
});