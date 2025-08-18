/**
 * Reusable form validation utilities
 * Used across Events and Products management components
 */

// Common validation rules
export const validationRules = {
  required: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`
    }
    return null
  },

  minLength: (value, minLength, fieldName = 'Field') => {
    if (value && value.length < minLength) {
      return `${fieldName} must be at least ${minLength} characters`
    }
    return null
  },

  maxLength: (value, maxLength, fieldName = 'Field') => {
    if (value && value.length > maxLength) {
      return `${fieldName} must not exceed ${maxLength} characters`
    }
    return null
  },

  email: (value, fieldName = 'Email') => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${fieldName} must be a valid email address`
    }
    return null
  },

  url: (value, fieldName = 'URL') => {
    if (value && !/^https?:\/\/.+/.test(value)) {
      return `${fieldName} must be a valid URL starting with http:// or https://`
    }
    return null
  },

  number: (value, fieldName = 'Field') => {
    if (value && isNaN(Number(value))) {
      return `${fieldName} must be a valid number`
    }
    return null
  },

  positiveNumber: (value, fieldName = 'Field') => {
    const numValue = Number(value)
    if (value && (isNaN(numValue) || numValue < 0)) {
      return `${fieldName} must be a positive number`
    }
    return null
  },

  integer: (value, fieldName = 'Field') => {
    const numValue = Number(value)
    if (value && (isNaN(numValue) || !Number.isInteger(numValue))) {
      return `${fieldName} must be a whole number`
    }
    return null
  },

  positiveInteger: (value, fieldName = 'Field') => {
    const numValue = Number(value)
    if (value && (isNaN(numValue) || !Number.isInteger(numValue) || numValue < 0)) {
      return `${fieldName} must be a positive whole number`
    }
    return null
  },

  min: (value, minValue, fieldName = 'Field') => {
    const numValue = Number(value)
    if (value && !isNaN(numValue) && numValue < minValue) {
      return `${fieldName} must be at least ${minValue}`
    }
    return null
  },

  max: (value, maxValue, fieldName = 'Field') => {
    const numValue = Number(value)
    if (value && !isNaN(numValue) && numValue > maxValue) {
      return `${fieldName} must not exceed ${maxValue}`
    }
    return null
  },

  dateNotInPast: (value, fieldName = 'Date') => {
    if (value) {
      const inputDate = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (inputDate < today) {
        return `${fieldName} cannot be in the past`
      }
    }
    return null
  },

  unique: (value, existingValues, fieldName = 'Field') => {
    if (value && existingValues.includes(value.toLowerCase())) {
      return `${fieldName} already exists`
    }
    return null
  },

  priceGreaterThanCost: (price, cost) => {
    const priceNum = Number(price)
    const costNum = Number(cost)
    if (price && cost && !isNaN(priceNum) && !isNaN(costNum) && priceNum <= costNum) {
      return 'Price must be higher than cost'
    }
    return null
  }
}

// Validation schema builder
export class ValidationSchema {
  constructor() {
    this.rules = {}
  }

  field(fieldName) {
    this.currentField = fieldName
    this.rules[fieldName] = []
    return this
  }

  required(message) {
    this.rules[this.currentField].push({
      rule: 'required',
      message: message || `${this.currentField} is required`
    })
    return this
  }

  minLength(length, message) {
    this.rules[this.currentField].push({
      rule: 'minLength',
      params: [length],
      message: message || `${this.currentField} must be at least ${length} characters`
    })
    return this
  }

  maxLength(length, message) {
    this.rules[this.currentField].push({
      rule: 'maxLength',
      params: [length],
      message: message || `${this.currentField} must not exceed ${length} characters`
    })
    return this
  }

  email(message) {
    this.rules[this.currentField].push({
      rule: 'email',
      message: message || `${this.currentField} must be a valid email address`
    })
    return this
  }

  url(message) {
    this.rules[this.currentField].push({
      rule: 'url',
      message: message || `${this.currentField} must be a valid URL`
    })
    return this
  }

  positiveNumber(message) {
    this.rules[this.currentField].push({
      rule: 'positiveNumber',
      message: message || `${this.currentField} must be a positive number`
    })
    return this
  }

  positiveInteger(message) {
    this.rules[this.currentField].push({
      rule: 'positiveInteger',
      message: message || `${this.currentField} must be a positive whole number`
    })
    return this
  }

  min(value, message) {
    this.rules[this.currentField].push({
      rule: 'min',
      params: [value],
      message: message || `${this.currentField} must be at least ${value}`
    })
    return this
  }

  dateNotInPast(message) {
    this.rules[this.currentField].push({
      rule: 'dateNotInPast',
      message: message || `${this.currentField} cannot be in the past`
    })
    return this
  }

  custom(validatorFn, message) {
    this.rules[this.currentField].push({
      rule: 'custom',
      validator: validatorFn,
      message: message || `${this.currentField} is invalid`
    })
    return this
  }

  validate(data, context = {}) {
    const errors = {}

    for (const [fieldName, fieldRules] of Object.entries(this.rules)) {
      const value = data[fieldName]
      
      for (const rule of fieldRules) {
        let error = null

        if (rule.rule === 'custom') {
          error = rule.validator(value, data, context)
          if (error) {
            error = rule.message
          }
        } else if (validationRules[rule.rule]) {
          const params = rule.params || []
          error = validationRules[rule.rule](value, ...params, fieldName)
        }

        if (error) {
          errors[fieldName] = rule.message || error
          break // Stop at first error for this field
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// Pre-built validation schemas for common use cases
export const eventValidationSchema = new ValidationSchema()
  .field('title')
    .required()
    .minLength(3, 'Event title must be at least 3 characters')
    .maxLength(100, 'Event title must not exceed 100 characters')
  .field('description')
    .required()
    .minLength(10, 'Description must be at least 10 characters')
    .maxLength(500, 'Description must not exceed 500 characters')
  .field('date')
    .required()
    .dateNotInPast()
  .field('time')
    .required()
  .field('location')
    .required()
    .minLength(3, 'Location must be at least 3 characters')
  .field('maxAttendees')
    .required()
    .positiveInteger()
    .min(1, 'Maximum attendees must be at least 1')
  .field('price')
    .positiveNumber()

export const productValidationSchema = new ValidationSchema()
  .field('name')
    .required()
    .minLength(2, 'Product name must be at least 2 characters')
    .maxLength(100, 'Product name must not exceed 100 characters')
  .field('description')
    .required()
    .minLength(10, 'Description must be at least 10 characters')
    .maxLength(500, 'Description must not exceed 500 characters')
  .field('price')
    .required()
    .positiveNumber()
  .field('cost')
    .required()
    .positiveNumber()
  .field('brand')
    .required()
    .minLength(2, 'Brand must be at least 2 characters')
  .field('sku')
    .required()
    .minLength(3, 'SKU must be at least 3 characters')
  .field('stock')
    .required()
    .positiveInteger()
  .field('minStock')
    .required()
    .positiveInteger()
  .field('imageUrl')
    .url()

// Utility functions
export const validateField = (value, rules, fieldName) => {
  for (const rule of rules) {
    const error = validationRules[rule.name]?.(value, ...rule.params || [], fieldName)
    if (error) {
      return error
    }
  }
  return null
}

export const validateForm = (data, schema) => {
  return schema.validate(data)
}

// Helper for real-time validation
export const createFieldValidator = (schema) => {
  return (fieldName, value, allData = {}) => {
    const fieldRules = schema.rules[fieldName]
    if (!fieldRules) return null

    const tempData = { ...allData, [fieldName]: value }
    const result = schema.validate(tempData)
    return result.errors[fieldName] || null
  }
}

export default {
  validationRules,
  ValidationSchema,
  eventValidationSchema,
  productValidationSchema,
  validateField,
  validateForm,
  createFieldValidator
}