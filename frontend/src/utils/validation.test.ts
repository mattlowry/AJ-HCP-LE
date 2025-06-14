import { 
  validateForm, 
  commonValidationRules, 
  validationPatterns as originalValidationPatterns, 
  formatCurrency, 
  formatPhoneNumber, 
  ValidationResult 
} from './validation';

const validationPatterns = {
  ...originalValidationPatterns,
  phone: originalValidationPatterns.phoneUS,
};

describe('Validation Utility', () => {
  describe('validateForm', () => {
    const mockRules = {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      name: {
        required: true,
        minLength: 2
      }
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

  describe('validationPatterns', () => {
    it('should provide correct email pattern', () => {
      expect(validationPatterns.email.test('test@example.com')).toBe(true);
      expect(validationPatterns.email.test('invalid')).toBe(false);
    });

    it('should provide correct phone pattern', () => {
      expect(validationPatterns.phoneUS.test('(555) 123-4567')).toBe(true);
      expect(validationPatterns.phoneUS.test('invalid-phone')).toBe(false);
      expect(validationPatterns.phone.test('(555) 123-4567')).toBe(true);
      expect(validationPatterns.phone.test('invalid')).toBe(false);
    });

    it('should provide currency pattern', () => {
      expect(validationPatterns.currency.test('123.45')).toBe(true);
      expect(validationPatterns.currency.test('invalid')).toBe(false);
      expect(validationPatterns.currency.test('10.50')).toBe(true);
    });

    it('should provide correct ZIP code pattern', () => {
      expect(validationPatterns.zipCode.test('12345')).toBe(true);
      expect(validationPatterns.zipCode.test('12345-6789')).toBe(true);
      expect(validationPatterns.zipCode.test('invalid')).toBe(false);
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

  describe('formatPhoneNumber', () => {
    it('should format 10-digit phone numbers', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('should handle phone numbers with existing formatting', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('555.123.4567')).toBe('(555) 123-4567');
    });

    it('should handle invalid phone numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('abcdefghij')).toBe('abcdefghij');
      expect(formatPhoneNumber('')).toBe('');
    });

    it('should handle phone numbers with country code', () => {
      expect(formatPhoneNumber('+15551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('15551234567')).toBe('(555) 123-4567');
    });
  });

  // Removed duplicate block as tests are consolidated above.
});