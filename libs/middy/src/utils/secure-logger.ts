/**
 * Secure logging utility that filters sensitive data before logging
 * Prevents credential exposure in CloudWatch logs
 */

/**
 * Common sensitive field patterns to filter out
 */
const SENSITIVE_FIELD_PATTERNS = [
  // Authentication related
  /^(authorization|auth|bearer|api[-_]?key|access[-_]?token|refresh[-_]?token)$/i,
  /^(x-api-key|x-auth-token|x-access-token)$/i,
  
  // Credentials  
  /^(password|pass|pwd|secret|private[-_]?key|signing[-_]?key)$/i,
  /^(client[-_]?secret|key)$/i,
  
  // QuantConnect specific
  /^(userid|user[-_]?id|algorithmid|algorithm[-_]?id)$/i,
  /^(projectid|project[-_]?id|organizationid|organization[-_]?id)$/i,
  
  // Financial/Trading data
  /^(account|balance|equity|cash|holdings?)$/i,
  /^(position|order|trade|portfolio)$/i,
  
  // Common PII patterns
  /^(email|phone|ssn|credit[-_]?card|card[-_]?number)$/i,
  /^(address|zip|postal[-_]?code|birth[-_]?date|dob)$/i,
]

/**
 * Common sensitive value patterns to redact
 */
const SENSITIVE_VALUE_PATTERNS = [
  // JWT tokens
  /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/,
  
  // API keys (mixed alphanumeric with reasonable length, not just repeated chars)
  /^[a-fA-F0-9]{32,128}$/,
  /^[A-Za-z0-9+/]{24,128}={0,2}$/,
  
  // Common credential formats (prefixed keys)
  /^(sk|pk|ak|key|api)_[a-zA-Z0-9]{15,}$/i,
  
  // Mixed case alphanumeric strings that look like keys (not repeated single character)
  /^(?=.*[A-Z])(?=.*[a-z])[A-Za-z0-9]{20,64}$/,
  /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{20,64}$/,
  
  // Email addresses
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Credit card numbers
  /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  
  // UUIDs (common in APIs as identifiers)
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
]

/**
 * Check if a field name is sensitive based on patterns
 */
const isSensitiveField = (fieldName: string): boolean => {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName))
}

/**
 * Check if a value is sensitive based on patterns
 */
const isSensitiveValue = (value: string): boolean => {
  return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value))
}

/**
 * Redact sensitive string values
 */
const redactString = (value: string, fieldName?: string): string => {
  // Only apply sensitive value patterns, not length-based redaction for individual strings
  if (isSensitiveValue(value)) {
    return '[REDACTED]'
  }
  
  return value
}

/**
 * Recursively filter an object to remove sensitive data
 */
const filterSensitiveData = (obj: any, maxDepth = 5, currentDepth = 0, fieldName?: string): any => {
  // Prevent infinite recursion
  if (currentDepth > maxDepth) {
    return '[MAX_DEPTH_EXCEEDED]'
  }
  
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    // Check if this string is in a sensitive field or very long in a sensitive context
    if (fieldName && isSensitiveField(fieldName) && obj.length > 100) {
      return '[REDACTED_LONG_STRING:' + obj.length + 'chars]'
    }
    return redactString(obj, fieldName)
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterSensitiveData(item, maxDepth, currentDepth + 1, fieldName))
  }
  
  if (typeof obj === 'object') {
    const filtered: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveField(key)) {
        // For sensitive fields, check if it's a sensitive value first
        if (typeof value === 'string' && isSensitiveValue(value)) {
          filtered[key] = '[REDACTED]'
        } else if (typeof value === 'string' && value.length > 100) {
          filtered[key] = '[REDACTED_LONG_STRING:' + value.length + 'chars]'
        } else {
          filtered[key] = '[REDACTED]'
        }
      } else {
        filtered[key] = filterSensitiveData(value, maxDepth, currentDepth + 1, key)
      }
    }
    
    return filtered
  }
  
  return obj
}

/**
 * Enhanced logging interface with automatic sensitive data filtering
 */
export class SecureLogger {
  /**
   * Log information with automatic sensitive data filtering
   */
  static info(message: string, data?: any): void {
    const sanitizedData = data ? filterSensitiveData(data) : undefined
    console.log(message, sanitizedData)
  }
  
  /**
   * Log warnings with automatic sensitive data filtering
   */
  static warn(message: string, data?: any): void {
    const sanitizedData = data ? filterSensitiveData(data) : undefined
    console.warn(message, sanitizedData)
  }
  
  /**
   * Log errors with automatic sensitive data filtering
   */
  static error(message: string, data?: any): void {
    const sanitizedData = data ? filterSensitiveData(data) : undefined
    console.error(message, sanitizedData)
  }
  
  /**
   * Log debug information with automatic sensitive data filtering
   */
  static debug(message: string, data?: any): void {
    const sanitizedData = data ? filterSensitiveData(data) : undefined
    console.debug(message, sanitizedData)
  }
  
  /**
   * Filter sensitive data from an object (useful for manual filtering)
   */
  static filterSensitive(data: any): any {
    return filterSensitiveData(data)
  }
}

/**
 * Default export for convenience
 */
export default SecureLogger