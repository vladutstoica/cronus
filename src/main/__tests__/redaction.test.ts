import { describe, it, expect } from 'vitest';
import { redactSensitiveContent, redactContent } from '../redaction';

describe('Redaction', () => {
  describe('redactSensitiveContent', () => {
    it('should return empty string as-is', () => {
      expect(redactSensitiveContent('')).toBe('');
    });

    it('should return whitespace-only string as-is', () => {
      expect(redactSensitiveContent('   ')).toBe('   ');
    });

    it('should return non-sensitive content unchanged', () => {
      const content = 'Hello, this is a normal text without any secrets.';
      expect(redactSensitiveContent(content)).toBe(content);
    });

    describe('passwords', () => {
      it('should redact password=value patterns', () => {
        const result = redactSensitiveContent('password=mysecret123');
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('mysecret123');
      });

      it('should redact password: value patterns', () => {
        const result = redactSensitiveContent('password: mysecret123');
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('mysecret123');
      });

      it('should redact pwd=value patterns', () => {
        const result = redactSensitiveContent('pwd=mysecret');
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('mysecret');
      });

      it('should redact "My password is X" patterns', () => {
        const result = redactSensitiveContent('My password is hunter2');
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('hunter2');
      });
    });

    describe('API keys and tokens', () => {
      it('should redact API key patterns', () => {
        const result = redactSensitiveContent('API key: sk-abc123def456');
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('abc123def456');
      });

      it('should redact Stripe-style keys (sk_)', () => {
        const result = redactSensitiveContent(
          'Using key sk_live_abc123xyz',
        );
        expect(result).toContain('sk_[REDACTED]');
        expect(result).not.toContain('live_abc123xyz');
      });

      it('should redact Stripe-style publishable keys (pk_)', () => {
        const result = redactSensitiveContent(
          'pk_test_abcdefghijklmnop',
        );
        expect(result).toContain('pk_[REDACTED]');
        expect(result).not.toContain('test_abcdefghijklmnop');
      });

      it('should redact secret token patterns', () => {
        const result = redactSensitiveContent('token: abc123xyz789');
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('abc123xyz789');
      });

      it('should redact client_secret patterns', () => {
        const result = redactSensitiveContent(
          'client_secret=my_secret_value',
        );
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('my_secret_value');
      });
    });

    describe('JWT tokens', () => {
      it('should redact JWT tokens when standalone', () => {
        const jwt =
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        const result = redactSensitiveContent(`Found ${jwt} in logs`);
        expect(result).toContain('[REDACTED_JWT]');
        expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      });

      it('should redact JWT via generic token pattern when prefixed with Token:', () => {
        // NOTE: "Token: <jwt>" is caught by the generic token regex before the
        // JWT-specific regex can match. This documents the actual behavior.
        const jwt =
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        const result = redactSensitiveContent(`Token: ${jwt}`);
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      });
    });

    describe('authorization headers', () => {
      it('should redact Bearer tokens', () => {
        const result = redactSensitiveContent(
          'Authorization: Bearer abc123def456ghi789',
        );
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('abc123def456ghi789');
      });

      it('should redact Basic auth tokens', () => {
        const result = redactSensitiveContent(
          'Authorization: Basic dXNlcjpwYXNz',
        );
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('dXNlcjpwYXNz');
      });

      it('should redact authorization in JSON-like format', () => {
        const result = redactSensitiveContent(
          '{ authorization: "Bearer abc123" }',
        );
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('abc123');
      });
    });

    describe('database connection strings', () => {
      it('should redact MongoDB connection passwords', () => {
        const result = redactSensitiveContent(
          'mongodb://admin:s3cretPassword@localhost:27017/mydb',
        );
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('s3cretPassword');
      });

      it('should redact PostgreSQL connection passwords', () => {
        const result = redactSensitiveContent(
          'postgresql://user:mypassword@host:5432/db',
        );
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('mypassword');
      });
    });

    describe('credit cards', () => {
      it('should redact credit card numbers with spaces', () => {
        const result = redactSensitiveContent(
          'Card: 4111 1111 1111 1111',
        );
        expect(result).toContain('[REDACTED_CC]');
        expect(result).not.toContain('4111 1111 1111 1111');
      });

      it('should redact credit card numbers with dashes', () => {
        const result = redactSensitiveContent(
          'Card: 4111-1111-1111-1111',
        );
        expect(result).toContain('[REDACTED_CC]');
        expect(result).not.toContain('4111-1111-1111-1111');
      });
    });

    describe('phone numbers', () => {
      it('should redact US phone numbers', () => {
        const result = redactSensitiveContent('Call me at (555) 123-4567');
        expect(result).toContain('[REDACTED_PHONE]');
        expect(result).not.toContain('555');
        expect(result).not.toContain('4567');
      });

      it('should redact phone numbers with +1 prefix', () => {
        const result = redactSensitiveContent('Phone: +1-555-123-4567');
        expect(result).toContain('[REDACTED_PHONE]');
        expect(result).not.toContain('4567');
      });

      it('should redact phone numbers with dots', () => {
        const result = redactSensitiveContent('Phone: 555.123.4567');
        expect(result).toContain('[REDACTED_PHONE]');
        expect(result).not.toContain('4567');
      });
    });

    describe('multiple sensitive items', () => {
      it('should redact multiple types in the same text', () => {
        const content =
          'password: secret123, card 4111 1111 1111 1111, call (555) 123-4567';
        const result = redactSensitiveContent(content);
        expect(result).not.toContain('secret123');
        expect(result).toContain('[REDACTED_CC]');
        expect(result).toContain('[REDACTED_PHONE]');
      });
    });
  });

  describe('redactContent alias', () => {
    it('should be the same function as redactSensitiveContent', () => {
      expect(redactContent).toBe(redactSensitiveContent);
    });
  });
});
