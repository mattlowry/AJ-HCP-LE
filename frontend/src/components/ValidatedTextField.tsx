import React from 'react';
import { TextField, TextFieldProps, InputAdornment } from '@mui/material';
import { validateField, ValidationRule, formatPhoneNumber, formatCurrency } from '../utils/validation';

interface ValidatedTextFieldProps extends Omit<TextFieldProps, 'error'> {
  validationRules?: ValidationRule;
  onValidationChange?: (field: string, isValid: boolean, error?: string) => void;
  fieldName?: string;
  formatType?: 'phone' | 'currency' | 'none';
  showValidationIcon?: boolean;
}

const ValidatedTextField: React.FC<ValidatedTextFieldProps> = ({
  validationRules,
  onValidationChange,
  fieldName = '',
  formatType = 'none',
  showValidationIcon = false,
  value,
  onChange,
  onBlur,
  ...textFieldProps
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  const validateValue = React.useCallback((val: any) => {
    if (!validationRules) return null;
    return validateField(val, validationRules);
  }, [validationRules]);

  const formatValue = (val: string, type: string): string => {
    switch (type) {
      case 'phone':
        return formatPhoneNumber(val);
      case 'currency':
        // Only format on blur, not during typing
        return val;
      default:
        return val;
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;
    
    // Apply real-time formatting for some types
    if (formatType === 'phone') {
      newValue = formatValue(newValue, formatType);
      event.target.value = newValue;
    }

    // Validate if field has been touched
    if (touched) {
      const validationError = validateValue(newValue);
      setError(validationError);
      
      if (onValidationChange && fieldName) {
        onValidationChange(fieldName, !validationError, validationError || undefined);
      }
    }

    if (onChange) {
      onChange(event);
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    
    let newValue = event.target.value;
    
    // Apply formatting on blur
    if (formatType === 'currency' && newValue) {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        newValue = numValue.toFixed(2);
        event.target.value = newValue;
      }
    }

    const validationError = validateValue(newValue);
    setError(validationError);
    
    if (onValidationChange && fieldName) {
      onValidationChange(fieldName, !validationError, validationError || undefined);
    }

    if (onBlur) {
      onBlur(event);
    }
  };

  const getInputAdornment = () => {
    if (formatType === 'currency') {
      return {
        startAdornment: <InputAdornment position="start">$</InputAdornment>
      };
    }
    
    if (showValidationIcon && touched) {
      return {
        endAdornment: (
          <InputAdornment position="end">
            {error ? '❌' : '✅'}
          </InputAdornment>
        )
      };
    }
    
    return {};
  };

  return (
    <TextField
      {...textFieldProps}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      error={touched && !!error}
      helperText={touched && error ? error : textFieldProps.helperText}
      InputProps={{
        ...textFieldProps.InputProps,
        ...getInputAdornment()
      }}
    />
  );
};

export default ValidatedTextField;