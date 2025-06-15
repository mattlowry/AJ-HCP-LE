import React from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateField = (value: any, rules: ValidationRule): string | null => {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'This field is required';
  }

  if (!value) return null;

  if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  if (rules.min && typeof value === 'number' && value < rules.min) {
    return `Must be at least ${rules.min}`;
  }

  if (rules.max && typeof value === 'number' && value > rules.max) {
    return `Must be no more than ${rules.max}`;
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const validateForm = (data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult => {
  const errors: Record<string, string> = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[1-9][\d]{0,15}$/,
  phoneUS: /^(\+1)?[\s-]?\(?([0-9]{3})\)?[\s-]?([0-9]{3})[\s-]?([0-9]{4})$/,
  postalCode: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  currency: /^\d+(\.\d{1,2})?$/,
  jobNumber: /^JOB-\d{4}-\d{4}$/,
  invoiceNumber: /^INV-\d{4}-\d{4}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// Helper functions to create validation rules
export const commonValidationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    custom: (value: any) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return message || 'This field is required';
      }
      return null;
    }
  }),
  
  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    custom: (value: string) => {
      if (value && value.length < length) {
        return message || `Must be at least ${length} characters`;
      }
      return null;
    }
  }),
  
  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    custom: (value: string) => {
      if (value && value.length > length) {
        return message || `Must be no more than ${length} characters`;
      }
      return null;
    }
  }),
  
  email: (message?: string): ValidationRule => ({
    pattern: validationPatterns.email,
    custom: (value: string) => {
      if (value && !validationPatterns.email.test(value)) {
        return message || 'Please enter a valid email address';
      }
      return null;
    }
  }),
  
  phone: (message?: string): ValidationRule => ({
    pattern: validationPatterns.phoneUS,
    custom: (value: string) => {
      if (value && !validationPatterns.phoneUS.test(value)) {
        return message || 'Please enter a valid phone number (e.g., (555) 123-4567)';
      }
      return null;
    }
  }),

  // Pre-defined validation rule objects
  emailRule: { 
    required: true, 
    pattern: validationPatterns.email,
    custom: (value: string) => {
      if (value && !validationPatterns.email.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  },
  phoneRule: { 
    required: true, 
    pattern: validationPatterns.phoneUS,
    custom: (value: string) => {
      if (value && !validationPatterns.phoneUS.test(value)) {
        return 'Please enter a valid phone number (e.g., (555) 123-4567)';
      }
      return null;
    }
  },
  currencyRule: {
    required: true,
    min: 0,
    custom: (value: number) => {
      if (value !== undefined && value < 0) {
        return 'Amount cannot be negative';
      }
      return null;
    }
  },
  
  // Backward compatibility aliases
  currency: {
    required: true,
    min: 0,
    custom: (value: number) => {
      if (value !== undefined && value < 0) {
        return 'Amount cannot be negative';
      }
      return null;
    }
  },
  duration: {
    required: true,
    min: 0.5,
    max: 24,
    custom: (value: number) => {
      if (value !== undefined && (value < 0.5 || value > 24)) {
        return 'Duration must be between 0.5 and 24 hours';
      }
      return null;
    }
  },
  postalCode: {
    pattern: validationPatterns.postalCode,
    custom: (value: string) => {
      if (value && !validationPatterns.postalCode.test(value) && !validationPatterns.zipCode.test(value)) {
        return 'Please enter a valid postal/zip code';
      }
      return null;
    }
  },
  strongPassword: {
    required: true,
    minLength: 8,
    pattern: validationPatterns.strongPassword,
    custom: (value: string) => {
      if (value && !validationPatterns.strongPassword.test(value)) {
        return 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character';
      }
      return null;
    }
  },
  customerName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (value && value.trim().length < 2) {
        return 'Name must be at least 2 characters';
      }
      return null;
    }
  },
  address: {
    required: true,
    minLength: 10,
    maxLength: 255,
    custom: (value: string) => {
      if (value && value.trim().length < 10) {
        return 'Please enter a complete address';
      }
      return null;
    }
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    custom: (value: string) => {
      if (value && value.trim().length < 10) {
        return 'Description must be at least 10 characters';
      }
      return null;
    }
  }
};

// Utility functions for specific validations
export const validateEmailFormat = (email: string): boolean => {
  return validationPatterns.email.test(email);
};

export const validatePhoneFormat = (phone: string): boolean => {
  return validationPatterns.phoneUS.test(phone);
};

export const validateCurrencyFormat = (amount: string): boolean => {
  return validationPatterns.currency.test(amount);
};

export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numAmount);
};

// Real-time validation hook
export const useFormValidation = (initialData: Record<string, any>, validationRules: Record<string, ValidationRule>) => {
  const [data, setData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateSingleField = (field: string, value: any) => {
    const rule = validationRules[field];
    if (!rule) return null;
    return validateField(value, rule);
  };

  const handleChange = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    if (touched[field]) {
      const error = validateSingleField(field, value);
      setErrors(prev => {
        if (error) {
          return { ...prev, [field]: error };
        } else {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateSingleField(field, data[field]);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateAll = (): boolean => {
    const result = validateForm(data, validationRules);
    setErrors(result.errors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return result.isValid;
  };

  const reset = () => {
    setData(initialData);
    setErrors({});
    setTouched({});
  };

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};