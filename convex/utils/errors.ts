// Error handling utilities for user-friendly error messages

export interface UserError {
  message: string;
  code: string;
  details?: string;
  action?: string;
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_INACTIVE: 'AUTH_ACCOUNT_INACTIVE',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  AUTH_USERNAME_EXISTS: 'AUTH_USERNAME_EXISTS',
  
  // Booking errors
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_SERVICE_UNAVAILABLE: 'BOOKING_SERVICE_UNAVAILABLE',
  BOOKING_TIME_CONFLICT: 'BOOKING_TIME_CONFLICT',
  BOOKING_PAST_DATE: 'BOOKING_PAST_DATE',
  BOOKING_INVALID_CUSTOMER_NAME: 'BOOKING_INVALID_CUSTOMER_NAME',
  
  // Barber errors
  BARBER_NOT_FOUND: 'BARBER_NOT_FOUND',
  BARBER_PROFILE_EXISTS: 'BARBER_PROFILE_EXISTS',
  BARBER_INVALID_ROLE: 'BARBER_INVALID_ROLE',
  
  // Transaction errors
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_ALREADY_REFUNDED: 'TRANSACTION_ALREADY_REFUNDED',
  TRANSACTION_PAYMENT_FAILED: 'TRANSACTION_PAYMENT_FAILED',
  
  // Voucher errors
  VOUCHER_NOT_FOUND: 'VOUCHER_NOT_FOUND',
  VOUCHER_EXPIRED: 'VOUCHER_EXPIRED',
  VOUCHER_ALREADY_USED: 'VOUCHER_ALREADY_USED',
  VOUCHER_NOT_ASSIGNED: 'VOUCHER_NOT_ASSIGNED',
  VOUCHER_LIMIT_REACHED: 'VOUCHER_LIMIT_REACHED',
  VOUCHER_CODE_EXISTS: 'VOUCHER_CODE_EXISTS',
  
  // Product errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_SKU_EXISTS: 'PRODUCT_SKU_EXISTS',
  PRODUCT_OUT_OF_STOCK: 'PRODUCT_OUT_OF_STOCK',
  
  // Event errors
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  EVENT_FULL: 'EVENT_FULL',
  EVENT_PAST_DATE: 'EVENT_PAST_DATE',
  EVENT_REGISTRATION_CLOSED: 'EVENT_REGISTRATION_CLOSED',
  
  // Payroll errors
  PAYROLL_SETTINGS_NOT_FOUND: 'PAYROLL_SETTINGS_NOT_FOUND',
  PAYROLL_PERIOD_NOT_FOUND: 'PAYROLL_PERIOD_NOT_FOUND',
  PAYROLL_PERIOD_ALREADY_CALCULATED: 'PAYROLL_PERIOD_ALREADY_CALCULATED',
  PAYROLL_RECORD_NOT_FOUND: 'PAYROLL_RECORD_NOT_FOUND',
  PAYROLL_RECORD_ALREADY_PAID: 'PAYROLL_RECORD_ALREADY_PAID',
  PAYROLL_INVALID_COMMISSION_RATE: 'PAYROLL_INVALID_COMMISSION_RATE',
  PAYROLL_INVALID_PERIOD: 'PAYROLL_INVALID_PERIOD',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT'
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, UserError> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: {
    message: 'The email or password you entered is incorrect.',
    code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    details: 'Please check your email and password and try again.',
    action: 'Double-check your credentials or use the "Forgot Password" option if needed.'
  },
  
  [ERROR_CODES.AUTH_ACCOUNT_INACTIVE]: {
    message: 'Your account has been deactivated.',
    code: ERROR_CODES.AUTH_ACCOUNT_INACTIVE,
    details: 'This account is currently inactive and cannot be used to sign in.',
    action: 'Please contact our support team to reactivate your account.'
  },
  
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: {
    message: 'Your session has expired.',
    code: ERROR_CODES.AUTH_SESSION_EXPIRED,
    details: 'For security reasons, you need to sign in again.',
    action: 'Please sign in again to continue using the application.'
  },
  
  [ERROR_CODES.AUTH_EMAIL_EXISTS]: {
    message: 'An account with this email already exists.',
    code: ERROR_CODES.AUTH_EMAIL_EXISTS,
    details: 'This email address is already registered in our system.',
    action: 'Try signing in instead, or use a different email address to create a new account.'
  },
  
  [ERROR_CODES.AUTH_USERNAME_EXISTS]: {
    message: 'This username is already taken.',
    code: ERROR_CODES.AUTH_USERNAME_EXISTS,
    details: 'Someone else is already using this username.',
    action: 'Please choose a different username for your account.'
  },
  
  [ERROR_CODES.BOOKING_NOT_FOUND]: {
    message: 'Booking not found.',
    code: ERROR_CODES.BOOKING_NOT_FOUND,
    details: 'The booking you\'re looking for doesn\'t exist or may have been cancelled.',
    action: 'Please check your booking details or contact us if you believe this is an error.'
  },
  
  [ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE]: {
    message: 'Service is currently unavailable.',
    code: ERROR_CODES.BOOKING_SERVICE_UNAVAILABLE,
    details: 'The service you selected is not available for booking at this time.',
    action: 'Please choose a different service or try again later.'
  },
  
  [ERROR_CODES.BOOKING_PAST_DATE]: {
    message: 'Cannot book appointments in the past.',
    code: ERROR_CODES.BOOKING_PAST_DATE,
    details: 'The date you selected has already passed.',
    action: 'Please select a future date for your appointment.'
  },

  [ERROR_CODES.BOOKING_INVALID_CUSTOMER_NAME]: {
    message: 'Customer name is required.',
    code: ERROR_CODES.BOOKING_INVALID_CUSTOMER_NAME,
    details: 'Please provide a valid customer name for the booking.',
    action: 'Enter the customer\'s name and try again.'
  },
  
  [ERROR_CODES.BARBER_NOT_FOUND]: {
    message: 'Barber profile not found.',
    code: ERROR_CODES.BARBER_NOT_FOUND,
    details: 'The barber profile you\'re looking for doesn\'t exist.',
    action: 'Please contact an administrator to set up your barber profile.'
  },
  
  [ERROR_CODES.BARBER_PROFILE_EXISTS]: {
    message: 'Barber profile already exists.',
    code: ERROR_CODES.BARBER_PROFILE_EXISTS,
    details: 'This user already has a barber profile in the system.',
    action: 'You can update the existing profile instead of creating a new one.'
  },
  
  [ERROR_CODES.BARBER_INVALID_ROLE]: {
    message: 'User is not authorized as a barber.',
    code: ERROR_CODES.BARBER_INVALID_ROLE,
    details: 'Only users with barber role can have barber profiles.',
    action: 'Please contact an administrator to update your user role.'
  },
  
  [ERROR_CODES.TRANSACTION_NOT_FOUND]: {
    message: 'Transaction not found.',
    code: ERROR_CODES.TRANSACTION_NOT_FOUND,
    details: 'The transaction you\'re looking for doesn\'t exist in our records.',
    action: 'Please check your transaction details or contact support for assistance.'
  },
  
  [ERROR_CODES.TRANSACTION_ALREADY_REFUNDED]: {
    message: 'Transaction has already been refunded.',
    code: ERROR_CODES.TRANSACTION_ALREADY_REFUNDED,
    details: 'This transaction was previously refunded and cannot be refunded again.',
    action: 'Check your refund history or contact support if you have questions.'
  },
  
  [ERROR_CODES.VOUCHER_NOT_FOUND]: {
    message: 'Voucher not found.',
    code: ERROR_CODES.VOUCHER_NOT_FOUND,
    details: 'The voucher code you entered doesn\'t exist in our system.',
    action: 'Please check the voucher code and try again, or contact support if you need help.'
  },
  
  [ERROR_CODES.VOUCHER_EXPIRED]: {
    message: 'Voucher has expired.',
    code: ERROR_CODES.VOUCHER_EXPIRED,
    details: 'This voucher is no longer valid as it has passed its expiration date.',
    action: 'Please use a different voucher or check for new promotions.'
  },
  
  [ERROR_CODES.VOUCHER_ALREADY_USED]: {
    message: 'Voucher has already been used.',
    code: ERROR_CODES.VOUCHER_ALREADY_USED,
    details: 'This voucher has already been redeemed and cannot be used again.',
    action: 'Please use a different voucher or check your account for available vouchers.'
  },
  
  [ERROR_CODES.VOUCHER_NOT_ASSIGNED]: {
    message: 'Voucher is not assigned to your account.',
    code: ERROR_CODES.VOUCHER_NOT_ASSIGNED,
    details: 'This voucher is not available for your account to use.',
    action: 'Please check your available vouchers or contact support for assistance.'
  },
  
  [ERROR_CODES.VOUCHER_LIMIT_REACHED]: {
    message: 'Voucher usage limit reached.',
    code: ERROR_CODES.VOUCHER_LIMIT_REACHED,
    details: 'This voucher has reached its maximum number of uses.',
    action: 'Please try a different voucher or check for new promotions.'
  },
  
  [ERROR_CODES.VOUCHER_CODE_EXISTS]: {
    message: 'Voucher code already exists.',
    code: ERROR_CODES.VOUCHER_CODE_EXISTS,
    details: 'A voucher with this code already exists in the system.',
    action: 'Please choose a different voucher code.'
  },
  
  [ERROR_CODES.PRODUCT_NOT_FOUND]: {
    message: 'Product not found.',
    code: ERROR_CODES.PRODUCT_NOT_FOUND,
    details: 'The product you\'re looking for doesn\'t exist or may have been discontinued.',
    action: 'Please browse our current product catalog or contact support for assistance.'
  },
  
  [ERROR_CODES.PRODUCT_SKU_EXISTS]: {
    message: 'Product SKU already exists.',
    code: ERROR_CODES.PRODUCT_SKU_EXISTS,
    details: 'A product with this SKU code already exists in the system.',
    action: 'Please use a different SKU code for this product.'
  },
  
  [ERROR_CODES.EVENT_NOT_FOUND]: {
    message: 'Event not found.',
    code: ERROR_CODES.EVENT_NOT_FOUND,
    details: 'The event you\'re looking for doesn\'t exist or may have been cancelled.',
    action: 'Please check our current events or contact us for more information.'
  },
  
  [ERROR_CODES.EVENT_FULL]: {
    message: 'Event is fully booked.',
    code: ERROR_CODES.EVENT_FULL,
    details: 'This event has reached its maximum capacity and no more registrations are available.',
    action: 'Please check for other available events or join the waiting list if available.'
  },
  
  [ERROR_CODES.EVENT_PAST_DATE]: {
    message: 'Cannot schedule events in the past.',
    code: ERROR_CODES.EVENT_PAST_DATE,
    details: 'The date you selected has already passed.',
    action: 'Please select a future date for your event.'
  },

  [ERROR_CODES.PAYROLL_SETTINGS_NOT_FOUND]: {
    message: 'Payroll settings not configured.',
    code: ERROR_CODES.PAYROLL_SETTINGS_NOT_FOUND,
    details: 'This branch does not have payroll settings configured.',
    action: 'Please configure payroll settings before proceeding with payroll operations.'
  },

  [ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND]: {
    message: 'Payroll period not found.',
    code: ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND,
    details: 'The payroll period you\'re looking for doesn\'t exist.',
    action: 'Please check the payroll period details or create a new period.'
  },

  [ERROR_CODES.PAYROLL_PERIOD_ALREADY_CALCULATED]: {
    message: 'Payroll period already calculated.',
    code: ERROR_CODES.PAYROLL_PERIOD_ALREADY_CALCULATED,
    details: 'This payroll period has already been calculated and cannot be recalculated.',
    action: 'Please create a new payroll period or view the existing calculations.'
  },

  [ERROR_CODES.PAYROLL_RECORD_NOT_FOUND]: {
    message: 'Payroll record not found.',
    code: ERROR_CODES.PAYROLL_RECORD_NOT_FOUND,
    details: 'The payroll record you\'re looking for doesn\'t exist.',
    action: 'Please check the payroll record details or generate new payroll records.'
  },

  [ERROR_CODES.PAYROLL_RECORD_ALREADY_PAID]: {
    message: 'Payroll record already paid.',
    code: ERROR_CODES.PAYROLL_RECORD_ALREADY_PAID,
    details: 'This payroll record has already been marked as paid.',
    action: 'No further action is required for this payment.'
  },

  [ERROR_CODES.PAYROLL_INVALID_COMMISSION_RATE]: {
    message: 'Invalid commission rate.',
    code: ERROR_CODES.PAYROLL_INVALID_COMMISSION_RATE,
    details: 'Commission rate must be between 0 and 100 percent.',
    action: 'Please enter a valid commission rate between 0% and 100%.'
  },

  [ERROR_CODES.INVALID_INPUT]: {
    message: 'Invalid input provided.',
    code: ERROR_CODES.INVALID_INPUT,
    details: 'The input you provided is not valid.',
    action: 'Please check your input and try again.'
  }
};

/**
 * Creates a user-friendly error with consistent formatting
 * @param code - Error code from ERROR_CODES
 * @param customMessage - Optional custom message to override default
 * @param customDetails - Optional custom details to override default
 * @returns UserError object
 */
export function createUserError(
  code: string,
  customMessage?: string,
  customDetails?: string
): UserError {
  const defaultError = ERROR_MESSAGES[code];
  
  if (!defaultError) {
    return {
      message: customMessage || 'An unexpected error occurred.',
      code: ERROR_CODES.OPERATION_FAILED,
      details: customDetails || 'Please try again or contact support if the problem persists.',
      action: 'Please try again later or contact our support team for assistance.'
    };
  }
  
  return {
    ...defaultError,
    message: customMessage || defaultError.message,
    details: customDetails || defaultError.details
  };
}

/**
 * Throws a user-friendly error
 * @param code - Error code from ERROR_CODES
 * @param customMessage - Optional custom message
 * @param customDetails - Optional custom details
 */
export function throwUserError(
  code: string,
  customMessage?: string,
  customDetails?: string
): never {
  const error = createUserError(code, customMessage, customDetails);
  throw new Error(JSON.stringify(error));
}

/**
 * Validates if an error is a user error
 * @param error - Error to check
 * @returns boolean
 */
export function isUserError(error: any): error is UserError {
  try {
    if (typeof error === 'string') {
      const parsed = JSON.parse(error);
      return parsed.code && parsed.message;
    }
    return error.code && error.message;
  } catch {
    return false;
  }
}

/**
 * Parses an error message to extract user error information
 * @param error - Error to parse
 * @returns UserError object
 */
export function parseUserError(error: any): UserError {
  try {
    if (typeof error === 'string') {
      const parsed = JSON.parse(error);
      if (parsed.code && parsed.message) {
        return parsed;
      }
    }
    
    if (error.code && error.message) {
      return error;
    }
  } catch {
    // Fall through to default error
  }
  
  return {
    message: error?.message || 'An unexpected error occurred.',
    code: ERROR_CODES.OPERATION_FAILED,
    details: 'Please try again or contact support if the problem persists.',
    action: 'Please try again later or contact our support team for assistance.'
  };
}

/**
 * Validates input parameters and throws user-friendly errors
 * @param validations - Array of validation objects
 */
export function validateInput(validations: Array<{
  condition: boolean;
  code: string;
  message?: string;
  details?: string;
}>): void {
  for (const validation of validations) {
    if (validation.condition) {
      throwUserError(validation.code, validation.message, validation.details);
    }
  }
}