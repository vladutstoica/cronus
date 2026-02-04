import { describe, it, expect } from 'vitest';
import { redactSensitiveContent, redactContent } from '../redaction';

describe('redactSensitiveContent', () => {
  describe('credit card redaction', () => {
    it('should redact Visa card numbers', () => {
      expect(redactSensitiveContent('Card: 4111-1111-1111-1111')).toContain('[REDACTED_CC]');
      expect(redactSensitiveContent('Card: 4111 1111 1111 1111')).toContain('[REDACTED_CC]');
      expect(redactSensitiveContent('Card: 4111111111111111')).toContain('[REDACTED_CC]');
    });

    it('should redact Mastercard numbers', () => {
      expect(redactSensitiveContent('Card: 5500-0000-0000-0004')).toContain('[REDACTED_CC]');
      expect(redactSensitiveContent('Card: 2221-0012-3456-7890')).toContain('[REDACTED_CC]');
    });

    it('should redact Amex card numbers', () => {
      // Amex contiguous digits (15-digit)
      expect(redactSensitiveContent('Card: 340000000000009')).toContain('[REDACTED_CC]');
      // Amex with 4-4-4-3 grouping
      expect(redactSensitiveContent('Card: 3782-8224-6310-005')).toContain('[REDACTED_CC]');
    });

    it('should redact Discover card numbers', () => {
      expect(redactSensitiveContent('Card: 6011-0000-0000-0004')).toContain('[REDACTED_CC]');
      expect(redactSensitiveContent('Card: 6500-0000-0000-0002')).toContain('[REDACTED_CC]');
    });

    it('should NOT redact timestamps', () => {
      const result = redactSensitiveContent('Logged at 2024-01-15 14:30:00');
      expect(result).not.toContain('[REDACTED_CC]');
      expect(result).toContain('2024-01-15 14:30:00');
    });

    it('should NOT redact random 16-digit numbers that are not card numbers', () => {
      const result = redactSensitiveContent('ID: 1234567890123456');
      expect(result).not.toContain('[REDACTED_CC]');
    });

    it('should NOT redact phone numbers as credit cards', () => {
      // Phone numbers start with different prefixes
      const result = redactSensitiveContent('Call 8005551234');
      expect(result).not.toContain('[REDACTED_CC]');
    });
  });

  describe('SSN redaction', () => {
    it('should redact SSN patterns', () => {
      expect(redactSensitiveContent('SSN: 123-45-6789')).toContain('[REDACTED_SSN]');
    });

    it('should redact SSN in middle of text', () => {
      const result = redactSensitiveContent('My SSN is 456-78-9012 and more text');
      expect(result).toContain('[REDACTED_SSN]');
      expect(result).not.toContain('456-78-9012');
    });

    it('should NOT redact date-like patterns with wrong format', () => {
      // Dates use YYYY-MM-DD format which is different from SSN's XXX-XX-XXXX
      const result = redactSensitiveContent('Date: 2024-01-15');
      expect(result).not.toContain('[REDACTED_SSN]');
    });
  });

  describe('password redaction', () => {
    it('should redact password patterns', () => {
      expect(redactSensitiveContent('password: mySecret123')).toContain('[REDACTED]');
      expect(redactSensitiveContent('pwd=hunter2')).toContain('[REDACTED]');
    });
  });

  describe('API key redaction', () => {
    it('should redact Stripe-style keys', () => {
      expect(redactSensitiveContent('sk_live_abc123xyz')).toContain('[REDACTED]');
      expect(redactSensitiveContent('pk_test_abc123xyz')).toContain('[REDACTED]');
    });

    it('should redact API key patterns', () => {
      expect(redactSensitiveContent('API key: my-secret-key-123')).toContain('[REDACTED]');
    });
  });

  describe('JWT redaction', () => {
    it('should redact JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456';
      expect(redactSensitiveContent(jwt)).toContain('[REDACTED_JWT]');
    });
  });

  describe('Bearer/Basic token redaction', () => {
    it('should redact Bearer tokens', () => {
      expect(redactSensitiveContent('Bearer abc123token')).toContain('[REDACTED]');
    });

    it('should redact Basic auth', () => {
      expect(redactSensitiveContent('Basic dXNlcjpwYXNz')).toContain('[REDACTED]');
    });
  });

  describe('phone number redaction', () => {
    it('should redact US phone numbers', () => {
      expect(redactSensitiveContent('Call (555) 123-4567')).toContain('[REDACTED_PHONE]');
      expect(redactSensitiveContent('Phone: 555-123-4567')).toContain('[REDACTED_PHONE]');
      expect(redactSensitiveContent('Tel: +1-555-123-4567')).toContain('[REDACTED_PHONE]');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(redactSensitiveContent('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(redactSensitiveContent('   ')).toBe('   ');
    });

    it('should handle text with no sensitive content', () => {
      const text = 'Just a normal sentence about coding';
      expect(redactSensitiveContent(text)).toBe(text);
    });

    it('should handle multiple sensitive items in one string', () => {
      const text = 'password: secret123 and card 4111-1111-1111-1111';
      const result = redactSensitiveContent(text);
      expect(result).toContain('[REDACTED]');
      expect(result).toContain('[REDACTED_CC]');
    });

    it('should redact database connection strings', () => {
      const text = 'mongodb://admin:secretpass@localhost:27017/db';
      expect(redactSensitiveContent(text)).toContain('[REDACTED]');
      expect(redactSensitiveContent(text)).not.toContain('secretpass');
    });
  });

  describe('redactContent alias', () => {
    it('should be the same function as redactSensitiveContent', () => {
      expect(redactContent).toBe(redactSensitiveContent);
    });
  });
});
