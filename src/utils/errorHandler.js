// Frontend error handling utilities for parsing and displaying user-friendly errors

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
      // Try to parse JSON error message
      if (error.includes('{"message"')) {
        const jsonMatch = error.match(/\{"message".*?\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          errorMessage = errorData.message || 'An error occurred';
          errorCode = errorData.code || 'UNKNOWN_ERROR';
          errorDetails = errorData.details || '';
          errorAction = errorData.action || '';
        } else {
          errorMessage = error;
        }
      } else {
        errorMessage = error;
      }
    } else if (error?.message) {
      // Handle Error objects
      const message = error.message;
      if (message.includes('{"message"')) {
        const jsonMatch = message.match(/\{"message".*?\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          errorMessage = errorData.message || 'An error occurred';
          errorCode = errorData.code || 'UNKNOWN_ERROR';
          errorDetails = errorData.details || '';
          errorAction = errorData.action || '';
        } else {
          errorMessage = message;
        }
      } else {
        errorMessage = message;
      }
    } else {
      errorMessage = 'An unexpected error occurred';
    }
  } catch (parseError) {
    // Fallback if JSON parsing fails
    errorMessage = error?.message || error || 'An unexpected error occurred';
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
 * @param {Error|string} error - The error to format
 * @returns {Object} Formatted error object
 */
export function formatErrorForDisplay(error) {
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