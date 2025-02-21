export class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  info(message: string, ...args: any[]) {
    console.log(`[${this.context}] ${message}`, ...args)
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${this.context}] ${message}`, ...args)
  }

  error(message: string, error?: Error, ...args: any[]) {
    console.error(`[${this.context}] ${message}`, error?.message || '', ...args)
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] ${message}`, ...args)
    }
  }
} 