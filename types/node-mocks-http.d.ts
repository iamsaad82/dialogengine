declare module 'node-mocks-http' {
  interface MockRequest {
    method?: string;
    url?: string;
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
  }

  interface MockResponse {
    status: number;
    json: () => any;
  }

  interface MockOptions extends MockRequest {
    session?: Record<string, any>;
  }

  interface MockResult {
    req: Request;
    res: MockResponse;
  }

  export function createMocks(options?: MockOptions): MockResult;
} 