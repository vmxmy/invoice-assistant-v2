import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MobileInputV2 } from '../MobileInputV2';

// Mock hooks
jest.mock('../../../hooks/useKeyboardAdjustment', () => ({
  useKeyboardAdjustment: () => ({
    isVisible: false,
    height: 0,
    activeElement: null,
    viewportHeightChange: 0,
    scrollToElement: jest.fn(),
    adjustViewport: jest.fn(),
    resetViewport: jest.fn(),
    getSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
  })
}));

jest.mock('../../../hooks/useMediaQuery', () => ({
  useDeviceDetection: () => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false
  })
}));

jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (value: any) => value
}));

describe('MobileInputV2', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    label: 'Test Input'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders with basic props', () => {
      render(<MobileInputV2 {...defaultProps} />);
      
      expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('displays the correct input type', () => {
      render(<MobileInputV2 {...defaultProps} type="email" />);
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('calls onChange when input value changes', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<MobileInputV2 {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByLabelText('Test Input');
      await user.type(input, 'hello');
      
      expect(onChange).toHaveBeenCalledTimes(5);
      expect(onChange).toHaveBeenLastCalledWith('hello');
    });

    it('displays error message when provided', () => {
      render(<MobileInputV2 {...defaultProps} error="This field is required" />);
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('displays helper text when provided', () => {
      render(<MobileInputV2 {...defaultProps} helperText="Enter your email address" />);
      
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('renders password input with toggle', () => {
      render(<MobileInputV2 {...defaultProps} type="password" value="secret" />);
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toHaveAttribute('type', 'password');
      
      const toggleButton = screen.getByLabelText('显示密码');
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      
      render(<MobileInputV2 {...defaultProps} type="password" value="secret" />);
      
      const input = screen.getByLabelText('Test Input');
      const toggleButton = screen.getByLabelText('显示密码');
      
      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('handles currency type correctly', () => {
      render(<MobileInputV2 {...defaultProps} type="currency" />);
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('inputMode', 'decimal');
    });

    it('sets correct inputMode for different types', () => {
      const { rerender } = render(<MobileInputV2 {...defaultProps} type="email" />);
      expect(screen.getByLabelText('Test Input')).toHaveAttribute('inputMode', 'email');
      
      rerender(<MobileInputV2 {...defaultProps} type="tel" />);
      expect(screen.getByLabelText('Test Input')).toHaveAttribute('inputMode', 'tel');
      
      rerender(<MobileInputV2 {...defaultProps} type="number" />);
      expect(screen.getByLabelText('Test Input')).toHaveAttribute('inputMode', 'numeric');
    });
  });

  describe('Autocompletion', () => {
    const suggestions = [
      { value: 'user@gmail.com', label: 'Gmail' },
      { value: 'user@outlook.com', label: 'Outlook' }
    ];

    it('shows suggestions when input is focused and has value', async () => {
      const user = userEvent.setup();
      
      render(
        <MobileInputV2
          {...defaultProps}
          autocompleteSuggestions={suggestions}
          value="user"
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.getByText('Outlook')).toBeInTheDocument();
      });
    });

    it('filters suggestions based on input value', async () => {
      const user = userEvent.setup();
      
      render(
        <MobileInputV2
          {...defaultProps}
          autocompleteSuggestions={suggestions}
          value="gmail"
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.queryByText('Outlook')).not.toBeInTheDocument();
      });
    });

    it('selects suggestion when clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(
        <MobileInputV2
          {...defaultProps}
          onChange={onChange}
          autocompleteSuggestions={suggestions}
          value="user"
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Gmail'));
      expect(onChange).toHaveBeenCalledWith('user@gmail.com');
    });
  });

  describe('Validation', () => {
    it('shows validation states correctly', () => {
      const { rerender } = render(
        <MobileInputV2 {...defaultProps} validationState="validating" />
      );
      expect(screen.getByRole('status')).toBeInTheDocument(); // loading spinner
      
      rerender(<MobileInputV2 {...defaultProps} validationState="valid" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // check icon
      
      rerender(<MobileInputV2 {...defaultProps} validationState="invalid" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // error icon
    });

    it('calls validator function when validateOnChange is true', async () => {
      const validator = jest.fn().mockResolvedValue(null);
      const user = userEvent.setup();
      
      render(
        <MobileInputV2
          {...defaultProps}
          validator={validator}
          validateOnChange={true}
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.type(input, 'test');
      
      await waitFor(() => {
        expect(validator).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('Clear Button', () => {
    it('shows clear button when input has value', () => {
      render(<MobileInputV2 {...defaultProps} value="test" showClearButton={true} />);
      
      expect(screen.getByLabelText('清除')).toBeInTheDocument();
    });

    it('hides clear button when input is empty', () => {
      render(<MobileInputV2 {...defaultProps} value="" showClearButton={true} />);
      
      expect(screen.queryByLabelText('清除')).not.toBeInTheDocument();
    });

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(
        <MobileInputV2
          {...defaultProps}
          value="test"
          onChange={onChange}
          showClearButton={true}
        />
      );
      
      const clearButton = screen.getByLabelText('清除');
      await user.click(clearButton);
      
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles Enter key for search type', async () => {
      const onSearch = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MobileInputV2
          {...defaultProps}
          type="search"
          onSearch={onSearch}
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.type(input, 'test{enter}');
      
      expect(onSearch).toHaveBeenCalled();
    });

    it('handles Enter key for suggestion selection', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const suggestions = [
        { value: 'user@gmail.com', label: 'Gmail' }
      ];
      
      render(
        <MobileInputV2
          {...defaultProps}
          onChange={onChange}
          autocompleteSuggestions={suggestions}
          value="user"
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
      });
      
      await user.keyboard('{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenCalledWith('user@gmail.com');
    });

    it('navigates suggestions with arrow keys', async () => {
      const user = userEvent.setup();
      const suggestions = [
        { value: 'user@gmail.com', label: 'Gmail' },
        { value: 'user@outlook.com', label: 'Outlook' }
      ];
      
      render(
        <MobileInputV2
          {...defaultProps}
          autocompleteSuggestions={suggestions}
          value="user"
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Gmail')).toBeInTheDocument();
      });
      
      // Navigate down and up
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // Should highlight the first suggestion
      expect(screen.getByText('Gmail')).toHaveClass('bg-primary/10');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <MobileInputV2
          {...defaultProps}
          required={true}
          ariaLabel="Custom aria label"
          ariaDescribedBy="help-text"
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-label', 'Custom aria label');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('sets aria-invalid when there is an error', () => {
      render(<MobileInputV2 {...defaultProps} error="Invalid input" />);
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates label with input correctly', () => {
      render(<MobileInputV2 {...defaultProps} name="test-input" />);
      
      const input = screen.getByLabelText('Test Input');
      const label = screen.getByText('Test Input');
      
      expect(input).toHaveAttribute('id', 'test-input');
      expect(label).toHaveAttribute('for', 'test-input');
    });
  });

  describe('Disabled and ReadOnly States', () => {
    it('disables input when disabled prop is true', () => {
      render(<MobileInputV2 {...defaultProps} disabled={true} />);
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toBeDisabled();
    });

    it('makes input readonly when readOnly prop is true', () => {
      render(<MobileInputV2 {...defaultProps} readOnly={true} />);
      
      const input = screen.getByLabelText('Test Input');
      expect(input).toHaveAttribute('readonly');
    });

    it('hides clear button when disabled', () => {
      render(
        <MobileInputV2
          {...defaultProps}
          value="test"
          disabled={true}
          showClearButton={true}
        />
      );
      
      expect(screen.queryByLabelText('清除')).not.toBeInTheDocument();
    });
  });
});