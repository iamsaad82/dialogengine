import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function withAuth(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      const session = await getServerSession(authConfig)

      if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 })
      }

      if (session.user.role !== "ADMIN") {
        return new NextResponse("Forbidden", { status: 403 })
      }

      return handler(request)
    } catch (error) {
      console.error('Auth Error:', error)
      return new NextResponse("Internal Server Error", { status: 500 })
    }
  }
}

export function withErrorHandler(handler: (request?: Request) => Promise<Response>) {
  return async (request?: Request) => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('API Error:', error)

      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation Error',
            details: error.errors
          },
          { status: 400 }
        )
      }

      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            error: error.message,
            data: error.data
          },
          { status: error.statusCode }
        )
      }

      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}

export function rateLimit(limit: number, windowMs: number = 60000) {
  const requests = new Map<string, number[]>()

  return function rateLimitMiddleware(handler: (request?: Request) => Promise<Response>) {
    return async (request?: Request) => {
      const ip = request?.headers.get('x-forwarded-for') || 'unknown'
      const now = Date.now()

      const timestamps = requests.get(ip) || []
      const windowStart = now - windowMs

      const recentRequests = timestamps.filter(time => time > windowStart)

      if (recentRequests.length >= limit) {
        return NextResponse.json(
          { error: 'Too Many Requests' },
          { status: 429 }
        )
      }

      recentRequests.push(now)
      requests.set(ip, recentRequests)

      return withErrorHandler(() => handler(request))()
    }
  }
}

export function validateRequest<T>(schema: any, data: unknown): T {
  try {
    return schema.parse(data) as T
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError('Validation Error', 400, error.errors)
    }
    throw error
  }
} 