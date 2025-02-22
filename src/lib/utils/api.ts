import { NextResponse } from "next/server";
import { Logger } from './logger'

const logger = new Logger('API')

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
}

export interface ApiErrorDetails {
  code?: string
  details?: any
  [key: string]: any
}

export function createSuccessResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data
  })
}

export function createErrorResponse(
  message: string,
  code?: string,
  details?: any,
  status: number = 400
): NextResponse<ApiResponse> {
  const errorDetails: ApiErrorDetails = { code, details }
  logger.info(`API Error: ${message}`, errorDetails)
  
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details
      }
    },
    { status }
  )
}

export async function handleApiError(error: unknown): Promise<NextResponse<ApiResponse>> {
  const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten'
  const errorCode = error instanceof Error ? error.name : 'UnknownError'
  
  const errorDetails: ApiErrorDetails = { 
    code: errorCode,
    originalError: error instanceof Error ? error : undefined
  }
  logger.info('API Error Handler:', errorDetails)
  
  return createErrorResponse(errorMessage, errorCode, undefined, 500)
} 