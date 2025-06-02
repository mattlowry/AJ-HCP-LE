import { 
  validateForm, 
  commonValidationRules, 
  validationPatterns, 
  formatCurrency, 
  formatPhone, 
  ValidationResult 
} from './validation';

describe('Validation Utility', () => {
  describe('validateForm', () => {
    const mockRules = {
      email: [
        { 
          validator: (value: string) => value.includes('@'), 
          message: 'Email must contain @' 
        },
        { 
          validator: (value: string) => value.length > 5, 
          message: 'Email must be longer than 5 characters' 
        }
      ],
      name: [
        { 
          validator: (value: string) => value.trim().length > 0, 
          message: 'Name is required' 
        }
      ]
    };

    it('should return valid result when all validations pass', () => {
      const data = { email: 'test@example.com', name: 'John Doe' };
      const result = validateForm(data, mockRules);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return validation errors when validations fail', () => {
      const data = { email: 'invalid', name: '' };
      const result = validateForm(data, mockRules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('Email must contain @');
      expect(result.errors.name).toContain('Name is required');
    });

    it('should return multiple errors for a single field', () => {
      const data = { email: 'test', name: 'John' };
      const result = validateForm(data, mockRules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toHaveLength(2);
      expect(result.errors.email).toContain('Email must contain @');
      expect(result.errors.email).toContain('Email must be longer than 5 characters');
    });

    it('should handle missing fields gracefully', () => {
      const data = { email: 'test@example.com' };
      const result = validateForm(data, mockRules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('Name is required');
    });

    it('should handle empty validation rules', () => {
      const data = { email: 'test@example.com' };
      const result = validateForm(data, {});
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('commonValidationRules', () => {
    describe('required', () => {
      it('should pass for non-empty strings', () => {
        const rule = commonValidationRules.required('Field is required');
        expect(rule.validator('test')).toBe(true);
        expect(rule.validator('   test   ')).toBe(true);
      });

      it('should fail for empty or whitespace strings', () => {
        const rule = commonValidationRules.required('Field is required');
        expect(rule.validator('')).toBe(false);
        expect(rule.validator('   ')).toBe(false);
        expect(rule.validator(null as any)).toBe(false);
        expect(rule.validator(undefined as any)).toBe(false);
      });
    });

    describe('email', () => {
      it('should pass for valid email addresses', () => {
        const rule = commonValidationRules.email();
        expect(rule.validator('test@example.com')).toBe(true);
        expect(rule.validator('user.name+tag@domain.co.uk')).toBe(true);
        expect(rule.validator('firstname-lastname@example.org')).toBe(true);
      });

      it('should fail for invalid email addresses', () => {
        const rule = commonValidationRules.email();
        expect(rule.validator('invalid')).toBe(false);
        expect(rule.validator('test@')).toBe(false);
        expect(rule.validator('@example.com')).toBe(false);
        expect(rule.validator('test.example.com')).toBe(false);
      });
    });

    describe('phone', () => {
      it('should pass for valid phone numbers', () => {
        const rule = commonValidationRules.phone();
        expect(rule.validator('(555) 123-4567')).toBe(true);
        expect(rule.validator('555-123-4567')).toBe(true);
        expect(rule.validator('555.123.4567')).toBe(true);
        expect(rule.validator('5551234567')).toBe(true);
        expect(rule.validator('+1 (555) 123-4567')).toBe(true);
      });

      it('should fail for invalid phone numbers', () => {
        const rule = commonValidationRules.phone();
        expect(rule.validator('123')).toBe(false);
        expect(rule.validator('abc-def-ghij')).toBe(false);
        expect(rule.validator('')).toBe(false);
      });
    });

    describe('minLength', () => {
      it('should pass for strings meeting minimum length', () => {
        const rule = commonValidationRules.minLength(5);
        expect(rule.validator('12345')).toBe(true);
        expect(rule.validator('123456')).toBe(true);
      });

      it('should fail for strings below minimum length', () => {
        const rule = commonValidationRules.minLength(5);
        expect(rule.validator('1234')).toBe(false);
        expect(rule.validator('')).toBe(false);
      });
    });

    describe('maxLength', () => {
      it('should pass for strings within maximum length', () => {
        const rule = commonValidationRules.maxLength(10);
        expect(rule.validator('12345')).toBe(true);
        expect(rule.validator('1234567890')).toBe(true);
      });

      it('should fail for strings exceeding maximum length', () => {
        const rule = commonValidationRules.maxLength(10);
        expect(rule.validator('12345678901')).toBe(false);
      });
    });

    describe('pattern', () => {
      it('should pass for strings matching pattern', () => {
        const rule = commonValidationRules.pattern(/^[A-Z]+$/, 'Must be uppercase letters');
        expect(rule.validator('HELLO')).toBe(true);
        expect(rule.validator('ABC')).toBe(true);
      });

      it('should fail for strings not matching pattern', () => {
        const rule = commonValidationRules.pattern(/^[A-Z]+$/, 'Must be uppercase letters');
        expect(rule.validator('hello')).toBe(false);
        expect(rule.validator('Hello')).toBe(false);
        expect(rule.validator('123')).toBe(false);
      });
    });

    describe('currency', () => {
      it('should pass for valid currency amounts', () => {
        const rule = commonValidationRules.currency();
        expect(rule.validator('10.50')).toBe(true);
        expect(rule.validator('1000')).toBe(true);
        expect(rule.validator('0.99')).toBe(true);
        expect(rule.validator('999999.99')).toBe(true);
      });

      it('should fail for invalid currency amounts', () => {
        const rule = commonValidationRules.currency();
        expect(rule.validator('10.999')).toBe(false);
        expect(rule.validator('abc')).toBe(false);
        expect(rule.validator('-10')).toBe(false);
        expect(rule.validator('')).toBe(false);
      });
    });

    describe('zipCode', () => {
      it('should pass for valid ZIP codes', () => {
        const rule = commonValidationRules.zipCode();
        expect(rule.validator('12345')).toBe(true);
        expect(rule.validator('12345-6789')).toBe(true);
      });

      it('should fail for invalid ZIP codes', () => {
        const rule = commonValidationRules.zipCode();
        expect(rule.validator('1234')).toBe(false);
        expect(rule.validator('123456')).toBe(false);
        expect(rule.validator('abcde')).toBe(false);
        expect(rule.validator('')).toBe(false);
      });
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as currency', () => {
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(999999.99)).toBe('$999,999.99');
    });

    it('should handle edge cases', () => {
      expect(formatCurrency(null as any)).toBe('$0.00');
      expect(formatCurrency(undefined as any)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });
  });

  describe('formatPhone', () => {
    it('should format 10-digit phone numbers', () => {
      expect(formatPhone('5551234567')).toBe('(555) 123-4567');
      expect(formatPhone('1234567890')).toBe('(123) 456-7890');
    });

    it('should handle phone numbers with existing formatting', () => {
      expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatPhone('555-123-4567')).toBe('(555) 123-4567');
      expect(formatPhone('555.123.4567')).toBe('(555) 123-4567');
    });

    it('should handle invalid phone numbers', () => {
      expect(formatPhone('123')).toBe('123');
      expect(formatPhone('abcdefghij')).toBe('abcdefghij');
      expect(formatPhone('')).toBe('');
    });

    it('should handle phone numbers with country code', () => {
      expect(formatPhone('+15551234567')).toBe('(555) 123-4567');
      expect(formatPhone('15551234567')).toBe('(555) 123-4567');
    });
  });

  describe('validationPatterns', () => {
    it('should provide correct email pattern', () => {
      expect(validationPatterns.email.test('test@example.com')).toBe(true);
      expect(validationPatterns.email.test('invalid')).toBe(false);
    });

    it('should provide correct phone pattern', () => {
      expect(validationPatterns.phone.test('(555) 123-4567')).toBe(true);
      expect(validationPatterns.phone.test('invalid')).toBe(false);
    });

    it('should provide correct currency pattern', () => {
      expect(validationPatterns.currency.test('10.50')).toBe(true);
      expect(validationPatterns.currency.test('invalid')).toBe(false);
    });

    it('should provide correct ZIP code pattern', () => {
      expect(validationPatterns.zipCode.test('12345')).toBe(true);
      expect(validationPatterns.zipCode.test('12345-6789')).toBe(true);
      expect(validationPatterns.zipCode.test('invalid')).toBe(false);
    });
  });
});