export function redactSensitiveContent(content: string): string {
  if (!content || content.trim() === '') {
    return content
  }

  try {
    let redacted = content

    // Passwords (various formats)
    redacted = redacted.replace(
      /(password|passwd|pwd)\s*[:=]\s*["']?(\S+)["']?/gi,
      '$1: [REDACTED]'
    )
    redacted = redacted.replace(
      /(My\s+)?password\s+is\s+["']?(\S+)["']?/gi,
      '$1password is [REDACTED]'
    )

    // Database connection strings with passwords
    redacted = redacted.replace(
      /(mongodb|postgresql|mysql):\/\/[^:]+:([^@]+)@/gi,
      '$1://$1:[REDACTED]@'
    )

    // API keys and tokens
    redacted = redacted.replace(/(API\s+)?key\s*[:=]\s*["']?(\S+)["']?/gi, '$1key: [REDACTED]')
    redacted = redacted.replace(/(sk_|pk_)([a-zA-Z0-9]+)/g, '$1[REDACTED]')

    // JWT tokens - more comprehensive pattern
    redacted = redacted.replace(
      /(eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/g,
      '[REDACTED_JWT]'
    )

    // Authorization headers - handles JSON-like format with curly braces
    redacted = redacted.replace(
      /\{\s*authorization\s*:\s*"([^"]+)"\s*\}/g,
      '{ authorization: "[REDACTED]" }'
    )
    redacted = redacted.replace(
      /\{\s*authorization\s*:\s*'([^']+)'\s*\}/g,
      "{ authorization: '[REDACTED]' }"
    )
    redacted = redacted.replace(
      /\{\s*authorization\s*:\s*(\S+)\s*\}/g,
      '{ authorization: [REDACTED] }'
    )

    // Also handle standalone authorization patterns
    redacted = redacted.replace(/(authorization)\s*:\s*"([^"]+)"/g, '$1: "[REDACTED]"')
    redacted = redacted.replace(/(authorization)\s*:\s*'([^']+)'/g, "$1: '[REDACTED]'")
    redacted = redacted.replace(/(authorization)\s*:\s*(\S+)/g, '$1: [REDACTED]')

    // Handle Basic/Bearer tokens
    redacted = redacted.replace(/(Basic|Bearer)\s+([A-Za-z0-9+/=]+)/g, '$1 [REDACTED]')

    // Secret tokens and client secrets
    redacted = redacted.replace(
      /(Secret\s+)?token\s*[:=]\s*["']?(\S+)["']?/gi,
      '$1token: [REDACTED]'
    )
    redacted = redacted.replace(
      /(client_secret|client_secret)\s*[:=]\s*["']?(\S+)["']?/gi,
      '$1: [REDACTED]'
    )

    // Credit cards
    redacted = redacted.replace(/(\d{4}[-\s]?){4}/g, '[REDACTED_CC]')

    // Phone numbers (but preserve email addresses)
    redacted = redacted.replace(
      /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
      '[REDACTED_PHONE]'
    )

    return redacted
  } catch (error) {
    console.error('❌ Error redacting content:', error)
    return content
  }
}

export const redactContent = redactSensitiveContent
