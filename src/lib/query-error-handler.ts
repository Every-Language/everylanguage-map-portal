import type { SupabaseError } from '../shared/hooks/query/base-hooks'

// Error types for different categories
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

// Processed error interface
export interface ProcessedError {
  type: ErrorType
  title: string
  message: string
  details?: string
  code?: string
  retryable: boolean
  reportable: boolean
}

// Map Supabase error codes to error types
const errorCodeMap: Record<string, ErrorType> = {
  // Authentication errors
  '401': ErrorType.AUTHENTICATION,
  'PGRST301': ErrorType.AUTHENTICATION,
  'PGRST302': ErrorType.AUTHENTICATION,
  
  // Authorization errors  
  '403': ErrorType.AUTHORIZATION,
  'PGRST201': ErrorType.AUTHORIZATION,
  
  // Not found errors
  '404': ErrorType.NOT_FOUND,
  'PGRST116': ErrorType.NOT_FOUND,
  
  // Validation errors
  '400': ErrorType.VALIDATION,
  'PGRST102': ErrorType.VALIDATION,
  'PGRST103': ErrorType.VALIDATION,
  
  // Server errors
  '500': ErrorType.SERVER,
  '502': ErrorType.SERVER,
  '503': ErrorType.SERVER,
  '504': ErrorType.SERVER,
  'PGRST000': ErrorType.SERVER,
  'PGRST001': ErrorType.SERVER,
}

// Process a Supabase error into a user-friendly format
export function processQueryError(error: unknown): ProcessedError {
  // Handle SupabaseError
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as SupabaseError
    const errorType = supabaseError.code ? errorCodeMap[supabaseError.code] || ErrorType.UNKNOWN : ErrorType.UNKNOWN
    
    return {
      type: errorType,
      title: getErrorTitle(errorType),
      message: getErrorMessage(errorType, supabaseError.message),
      details: supabaseError.details,
      code: supabaseError.code,
      retryable: isRetryable(errorType),
      reportable: isReportable(errorType),
    }
  }
  
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      retryable: true,
      reportable: false,
    }
  }
  
  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  return {
    type: ErrorType.UNKNOWN,
    title: 'Unexpected Error',
    message: errorMessage,
    retryable: false,
    reportable: true,
  }
}

// Get user-friendly error titles
function getErrorTitle(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Connection Problem'
    case ErrorType.AUTHENTICATION:
      return 'Authentication Required'
    case ErrorType.AUTHORIZATION:
      return 'Access Denied'
    case ErrorType.VALIDATION:
      return 'Invalid Input'
    case ErrorType.NOT_FOUND:
      return 'Not Found'
    case ErrorType.SERVER:
      return 'Server Error'
    default:
      return 'Error'
  }
}

// Get user-friendly error messages
function getErrorMessage(errorType: ErrorType, originalMessage: string): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Please check your internet connection and try again.'
    case ErrorType.AUTHENTICATION:
      return 'You need to sign in to access this feature.'
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.'
    case ErrorType.VALIDATION:
      return 'Please check your input and try again.'
    case ErrorType.NOT_FOUND:
      return 'The requested resource could not be found.'
    case ErrorType.SERVER:
      return 'A server error occurred. Please try again later.'
    default:
      return originalMessage || 'An unexpected error occurred.'
  }
}

// Check if an error type is retryable
function isRetryable(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.SERVER,
  ].includes(errorType)
}

// Check if an error type should be reported
function isReportable(errorType: ErrorType): boolean {
  return [
    ErrorType.SERVER,
    ErrorType.UNKNOWN,
  ].includes(errorType)
}

// Global error handler for React Query
export function handleGlobalQueryError(error: unknown): void {
  const processedError = processQueryError(error)
  
  // Log error for debugging
  console.error('Query error:', processedError)
  
  // Report error if necessary
  if (processedError.reportable) {
    reportError(processedError)
  }
  
  // Show user notification
  showErrorNotification(processedError)
}

// Placeholder for error reporting service
function reportError(error: ProcessedError): void {
  // TODO: Integrate with error reporting service (e.g., Sentry)
  console.error('Reportable error:', error)
}

// Placeholder for error notification system
function showErrorNotification(error: ProcessedError): void {
  // TODO: Integrate with notification system
  console.warn('Error notification:', error.title, error.message)
} 