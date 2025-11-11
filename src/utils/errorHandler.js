// Frontend error handling utilities for parsing and displaying user-friendly errors

/**
 * Extracts JSON from error message
 * @param {string} message - Raw error message
 * @returns {Object|null} Parsed JSON object or null
 */
function extractJSON(message) {
  if (!message) return null;
  
  // Find JSON object start
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return null;
  
  // Find where JSON ends (before " at " or end of string)
  const atIndex = message.indexOf(' at ', jsonStart);
  const endIndex = atIndex !== -1 ? atIndex : message.length;
  
  // Extract JSON string
  let jsonStr = message.substring(jsonStart, endIndex).trim();
  
  // Remove trailing punctuation if present
  jsonStr = jsonStr.replace(/[.,;:]$/, '');
  
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && parsed.message) {
      return parsed;
    }
  } catch (e) {
    // Try to find complete JSON by matching braces
    let braceCount = 0;
    let jsonEnd = jsonStart;
    for (let i = jsonStart; i < message.length; i++) {
      if (message[i] === '{') braceCount++;
      if (message[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd > jsonStart) {
      try {
        const parsed = JSON.parse(message.substring(jsonStart, jsonEnd));
        if (parsed && typeof parsed === 'object' && parsed.message) {
          return parsed;
        }
      } catch (e2) {
        // Failed to parse
      }
    }
  }
  
  return null;
}

/**
 * Strips Convex metadata and stack traces from error messages
 * @param {string} message - Raw error message
 * @returns {string} Clean error message
 */
function cleanConvexError(message) {
  if (!message) return '';
  
  // First, try to extract JSON error if present
  const jsonData = extractJSON(message);
  if (jsonData && jsonData.message) {
    return jsonData.message;
  }
  
  let cleaned = message;
  
  // Remove Convex metadata patterns: [CONVEX M(...)]
  cleaned = cleaned.replace(/\[CONVEX M\([^\]]+\)\]/g, '');
  
  // Remove Request ID patterns: [Request ID: ...]
  cleaned = cleaned.replace(/\[Request ID: [^\]]+\]/g, '');
  
  // Remove "Server Error Uncaught Error:" prefix (with all variations)
  // Match with flexible spacing
  cleaned = cleaned.replace(/Server\s+Error\s+Uncaught\s+Error:\s*/gi, '');
  cleaned = cleaned.replace(/Server\s+Error\s+Uncaught\s+Error\s*/gi, '');
  cleaned = cleaned.replace(/Server Error Uncaught Error:\s*/gi, '');
  cleaned = cleaned.replace(/Server Error Uncaught Error\s*/gi, '');
  cleaned = cleaned.replace(/Uncaught\s+Error:\s*/gi, '');
  cleaned = cleaned.replace(/Uncaught\s+Error\s*/gi, '');
  cleaned = cleaned.replace(/Server\s+Error:\s*/gi, '');
  cleaned = cleaned.replace(/Server\s+Error\s*/gi, '');
  
  // Remove stack traces (lines starting with "at")
  cleaned = cleaned.replace(/\s*at\s+[^\n]+/g, '');
  
  // Remove "Called by client" text
  cleaned = cleaned.replace(/\s*Called by client\s*/gi, '');
  
  // Try to extract JSON error again after cleaning (in case it was embedded)
  const jsonDataAfter = extractJSON(cleaned);
  if (jsonDataAfter && jsonDataAfter.message) {
    return jsonDataAfter.message;
  }
  
  // Clean up extra whitespace and newlines
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Remove any remaining technical prefixes
  cleaned = cleaned.replace(/^(Error|Exception|Uncaught):\s*/i, '');
  
  return cleaned;
}

/**
 * Parses error messages from Convex and extracts user-friendly information
 * @param {Error|string} error - The error object or message
 * @returns {Object} Parsed error with user-friendly properties
 */
export function parseError(error) {
  let errorMessage = '';
  let errorCode = '';
  let errorDetails = '';
  let errorAction = '';

  try {
    // Handle different error formats
    if (typeof error === 'string') {
      // Clean Convex metadata first
      const cleaned = cleanConvexError(error);
      
      // Try to parse JSON error message
      if (cleaned.includes('{"message"')) {
        const jsonMatch = cleaned.match(/\{[\s\S]*"message"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[0]);
            errorMessage = errorData.message || 'An error occurred';
            errorCode = errorData.code || 'UNKNOWN_ERROR';
            errorDetails = errorData.details || '';
            errorAction = errorData.action || '';
          } catch (e) {
            errorMessage = cleaned;
          }
        } else {
          errorMessage = cleaned;
        }
      } else {
        errorMessage = cleaned;
      }
    } else if (error?.message) {
      // Handle Error objects
      const message = error.message;
      
      // Clean Convex metadata first
      const cleaned = cleanConvexError(message);
      
      // Try to parse JSON error message
      if (cleaned.includes('{"message"')) {
        const jsonMatch = cleaned.match(/\{[\s\S]*"message"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[0]);
            errorMessage = errorData.message || 'An error occurred';
            errorCode = errorData.code || 'UNKNOWN_ERROR';
            errorDetails = errorData.details || '';
            errorAction = errorData.action || '';
          } catch (e) {
            errorMessage = cleaned;
          }
        } else {
          errorMessage = cleaned;
        }
      } else {
        errorMessage = cleaned;
      }
    } else {
      errorMessage = 'An unexpected error occurred';
    }
  } catch (parseError) {
    // Fallback if JSON parsing fails
    const rawMessage = error?.message || error || 'An unexpected error occurred';
    errorMessage = cleanConvexError(rawMessage) || 'An unexpected error occurred';
  }

  return {
    message: errorMessage,
    code: errorCode,
    details: errorDetails,
    action: errorAction,
    isUserError: !!(errorCode && errorDetails)
  };
}

/**
 * Formats error for display in UI components
 * @param {Error|string|Object} error - The error to format (can be string, Error, or object with message/details/action)
 * @returns {Object} Formatted error object
 */
export function formatErrorForDisplay(error) {
  // Handle structured error objects
  if (error && typeof error === 'object' && !(error instanceof Error)) {
    if (error.message || error.details || error.action) {
      return {
        title: 'Error',
        message: error.message || 'An error occurred',
        details: error.details || '',
        action: error.action || '',
        type: getErrorType(error.code || ''),
        code: error.code || ''
      };
    }
  }
  
  const parsed = parseError(error);
  
  return {
    title: parsed.isUserError ? 'Error' : 'Something went wrong',
    message: parsed.message,
    details: parsed.details,
    action: parsed.action,
    type: getErrorType(parsed.code),
    code: parsed.code
  };
}

/**
 * Determines error type for styling purposes
 * @param {string} code - Error code
 * @returns {string} Error type
 */
function getErrorType(code) {
  if (code.includes('AUTH_')) return 'auth';
  if (code.includes('BOOKING_')) return 'booking';
  if (code.includes('VOUCHER_')) return 'voucher';
  if (code.includes('TRANSACTION_')) return 'transaction';
  if (code.includes('PRODUCT_')) return 'product';
  if (code.includes('EVENT_')) return 'event';
  if (code.includes('PERMISSION_')) return 'permission';
  return 'general';
}

/**
 * Gets appropriate icon for error type
 * @param {string} type - Error type
 * @returns {string} Icon name
 */
export function getErrorIcon(type) {
  switch (type) {
    case 'auth': return 'Lock';
    case 'booking': return 'Calendar';
    case 'voucher': return 'Gift';
    case 'transaction': return 'CreditCard';
    case 'product': return 'Package';
    case 'event': return 'Calendar';
    case 'permission': return 'Shield';
    default: return 'AlertCircle';
  }
}

/**
 * Gets appropriate color scheme for error type
 * @param {string} type - Error type
 * @returns {Object} Color scheme
 */
export function getErrorColors(type) {
  switch (type) {
    case 'auth':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-800',
        message: 'text-red-700',
        button: 'bg-red-600 hover:bg-red-700'
      };
    case 'booking':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-800',
        message: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700'
      };
    case 'voucher':
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-800',
        message: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700'
      };
    case 'transaction':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-800',
        message: 'text-green-700',
        button: 'bg-green-600 hover:bg-green-700'
      };
    default:
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-800',
        message: 'text-red-700',
        button: 'bg-red-600 hover:bg-red-700'
      };
  }
}

/**
 * Logs error for debugging purposes
 * @param {Error|string} error - The error to log
 * @param {string} context - Context where error occurred
 */
export function logError(error, context = 'Unknown') {
  const parsed = parseError(error);
  console.error(`[${context}] Error:`, {
    message: parsed.message,
    code: parsed.code,
    details: parsed.details,
    originalError: error
  });
}