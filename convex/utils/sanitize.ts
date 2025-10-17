/**
 * Sanitize and validate input strings
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .substring(0, 255); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9@._-]/g, '') // Keep only valid email characters
    .substring(0, 254); // Email length limit
}

/**
 * Sanitize username
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }
  
  return username
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '') // Keep only alphanumeric, dots, underscores, hyphens
    .substring(0, 50); // Username length limit
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }
  
  return phone
    .trim()
    .replace(/[^0-9+()-]/g, '') // Keep only valid phone characters
    .substring(0, 20); // Phone length limit
}

/**
 * Sanitize address
 */
export function sanitizeAddress(address: string): string {
  if (typeof address !== 'string') {
    return '';
  }
  
  return address
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 500); // Address length limit
}

/**
 * Validate and sanitize role
 */
export function sanitizeRole(role: string): string {
  const validRoles = ['staff', 'customer', 'admin', 'barber', 'super_admin', 'branch_admin'];
  
  if (typeof role !== 'string' || !validRoles.includes(role)) {
    return 'customer'; // Default to customer if invalid
  }
  
  return role;
}

/**
 * Check if a string contains only safe characters
 */
export function isSafeString(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /<style/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
}
