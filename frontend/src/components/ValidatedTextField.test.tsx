import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValidatedTextField from './ValidatedTextField';
import { commonValidationRules } from '../utils/validation';

describe('ValidatedTextField', () => {
  const defaultProps = {
    label: 'Test Field',
    value: '',
    onChange: jest.fn(),
    validationRules: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    render(<ValidatedTextField {...defaultProps} />);
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
  });

  it('should display the current value', () => {
    render(<ValidatedTextField {...defaultProps} value="test value" />);
    const input = screen.getByDisplayValue('test value');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when value changes', async () => {
    const mockOnChange = jest.fn();
    
    render(<ValidatedTextField {...defaultProps} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText('Test Field');
    await userEvent.type(input, 'new value');
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should show validation error when validation fails', async () => {
    const validationRules = [
      commonValidationRules.required('This field is required'),
      commonValidationRules.minLength(5, 'Must be at least 5 characters')
    ];

    render(
      <ValidatedTextField 
        {...defaultProps} 
        value="ab"
        validationRules={validationRules}
      />
    );

    // Trigger validation by blurring the field
    const input = screen.getByLabelText('Test Field');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Must be at least 5 characters')).toBeInTheDocument();
    });
  });

  it('should show required field indicator when field is required', () => {
    const validationRules = [
      commonValidationRules.required('This field is required')
    ];

    render(
      <ValidatedTextField 
        {...defaultProps} 
        validationRules={validationRules}
        required
      />
    );

    expect(screen.getByLabelText('Test Field *')).toBeInTheDocument();
  });

  it('should clear validation errors when field becomes valid', async () => {
    const validationRules = [
      commonValidationRules.minLength(5, 'Must be at least 5 characters')
    ];

    const { rerender } = render(
      <ValidatedTextField 
        {...defaultProps} 
        value="ab"
        validationRules={validationRules}
      />
    );

    // Trigger validation
    const input = screen.getByLabelText('Test Field');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Must be at least 5 characters')).toBeInTheDocument();
    });

    // Make field valid
    rerender(
      <ValidatedTextField 
        {...defaultProps} 
        value="valid input"
        validationRules={validationRules}
      />
    );

    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.queryByText('Must be at least 5 characters')).not.toBeInTheDocument();
    });
  });

  it('should format currency when formatType is currency', async () => {
    const mockOnChange = jest.fn();

    render(
      <ValidatedTextField 
        {...defaultProps} 
        formatType="currency"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Test Field');
    await userEvent.type(input, '1000');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('$1,000.00'));
    });
  });

  it('should format phone when formatType is phone', async () => {
    const mockOnChange = jest.fn();

    render(
      <ValidatedTextField 
        {...defaultProps} 
        formatType="phone"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByLabelText('Test Field');
    await userEvent.type(input, '5551234567');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('(555) 123-4567');
    });
  });

  it('should show multiple validation errors', async () => {
    const validationRules = [
      commonValidationRules.required('This field is required'),
      commonValidationRules.email('Must be a valid email'),
      commonValidationRules.minLength(10, 'Must be at least 10 characters')
    ];

    render(
      <ValidatedTextField 
        {...defaultProps} 
        value="bad"
        validationRules={validationRules}
      />
    );

    const input = screen.getByLabelText('Test Field');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Must be a valid email')).toBeInTheDocument();
      expect(screen.getByText('Must be at least 10 characters')).toBeInTheDocument();
    });
  });

  it('should handle disabled state', () => {
    render(<ValidatedTextField {...defaultProps} disabled />);
    const input = screen.getByLabelText('Test Field');
    expect(input).toBeDisabled();
  });

  it('should handle multiline text area', () => {
    render(<ValidatedTextField {...defaultProps} multiline rows={4} />);
    const textarea = screen.getByLabelText('Test Field');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should show helper text when provided', () => {
    render(<ValidatedTextField {...defaultProps} helperText="This is helper text" />);
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('should prioritize validation errors over helper text', async () => {
    const validationRules = [
      commonValidationRules.required('This field is required')
    ];

    render(
      <ValidatedTextField 
        {...defaultProps} 
        value=""
        validationRules={validationRules}
        helperText="This is helper text"
      />
    );

    const input = screen.getByLabelText('Test Field');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.queryByText('This is helper text')).not.toBeInTheDocument();
    });
  });

  it('should handle email validation correctly', async () => {
    const validationRules = [
      commonValidationRules.email('Must be a valid email')
    ];

    render(
      <ValidatedTextField 
        {...defaultProps} 
        value="invalid-email"
        validationRules={validationRules}
      />
    );

    const input = screen.getByLabelText('Test Field');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Must be a valid email')).toBeInTheDocument();
    });
  });

  it('should handle phone validation correctly', async () => {
    const validationRules = [
      commonValidationRules.phone('Must be a valid phone number')
    ];

    render(
      <ValidatedTextField 
        {...defaultProps} 
        value="invalid-phone"
        validationRules={validationRules}
      />
    );

    const input = screen.getByLabelText('Test Field');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Must be a valid phone number')).toBeInTheDocument();
    });
  });
});