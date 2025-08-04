// Unified error handling for Edge Function
import { corsHeaders } from './utils/cors.ts';
export var ErrorCode;
(function(ErrorCode) {
  ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
  ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
  ErrorCode["NOT_FOUND"] = "NOT_FOUND";
  ErrorCode["BACKEND_ERROR"] = "BACKEND_ERROR";
  ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ErrorCode || (ErrorCode = {}));
export class ApiError extends Error {
  code;
  statusCode;
  details;
  constructor(message, code, statusCode = 400, details){
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}
export function handleError(error) {
  console.error('Error occurred:', error);
  // Handle known API errors
  if (error instanceof ApiError) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: error.statusCode
    });
  }
  // Handle backend API errors
  if (error instanceof Error && error.name === 'BackendApiError') {
    const backendError = error;
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: ErrorCode.BACKEND_ERROR,
        message: backendError.message,
        details: backendError.details
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: backendError.statusCode || 500
    });
  }
  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  return new Response(JSON.stringify({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: message
    }
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status: 500
  });
}
