/**
 * Live-Mini HTTP Client
 *
 * Stateless HTTP client for pushing data to c123-live-server.
 * Uses native fetch with exponential backoff retry logic.
 */

import type {
  CreateEventRequest,
  CreateEventResponse,
  ListEventsResponse,
  PushXmlRequest,
  PushXmlResponse,
  PushOnCourseRequest,
  PushOnCourseResponse,
  PushResultsRequest,
  PushResultsResponse,
  TransitionStatusRequest,
  TransitionStatusResponse,
  ApiErrorResponse,
} from './types.js';

/**
 * Client configuration
 */
export interface LiveClientConfig {
  /** Server base URL (e.g., "https://live.example.com") */
  serverUrl: string;
  /** API key for authentication (optional, required for authenticated endpoints) */
  apiKey?: string;
  /** Master key for admin endpoints (optional) */
  masterKey?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Initial retry delay in ms (default: 1000) */
  initialDelayMs?: number;
  /** Maximum retry delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
}

/**
 * HTTP method type
 */
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Custom error for API errors
 */
export class LiveApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ApiErrorResponse,
  ) {
    super(message);
    this.name = 'LiveApiError';
  }
}

/**
 * Custom error for timeout
 */
export class LiveTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveTimeoutError';
  }
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Live-Mini HTTP Client
 */
export class LiveClient {
  private config: { serverUrl: string; apiKey?: string; masterKey?: string; timeout: number };
  private retryConfig: Required<RetryConfig>;

  constructor(
    config: LiveClientConfig,
    retryConfig: RetryConfig = {},
  ) {
    this.config = {
      serverUrl: config.serverUrl.replace(/\/$/, ''), // Remove trailing slash
      timeout: config.timeout ?? 10000,
    };
    if (config.apiKey) {
      this.config.apiKey = config.apiKey;
    }
    if (config.masterKey) {
      this.config.masterKey = config.masterKey;
    }
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...retryConfig,
    };
  }

  /**
   * Create a new event on live
   */
  async createEvent(request: CreateEventRequest): Promise<CreateEventResponse> {
    return this.request<CreateEventRequest, CreateEventResponse>(
      'POST',
      '/api/v1/admin/events',
      request,
      false,
      this.config.masterKey ? 'masterKey' : 'none',
    );
  }

  /**
   * Push XML export data
   */
  async pushXml(xml: string): Promise<PushXmlResponse> {
    return this.request<PushXmlRequest, PushXmlResponse>(
      'POST',
      '/api/v1/ingest/xml',
      { xml },
    );
  }

  /**
   * Push OnCourse data
   */
  async pushOnCourse(request: PushOnCourseRequest): Promise<PushOnCourseResponse> {
    return this.request<PushOnCourseRequest, PushOnCourseResponse>(
      'POST',
      '/api/v1/ingest/oncourse',
      request,
    );
  }

  /**
   * Push Results data
   */
  async pushResults(request: PushResultsRequest): Promise<PushResultsResponse> {
    return this.request<PushResultsRequest, PushResultsResponse>(
      'POST',
      '/api/v1/ingest/results',
      request,
    );
  }

  /**
   * Transition event status
   */
  async transitionStatus(
    eventId: string,
    status: TransitionStatusRequest,
  ): Promise<TransitionStatusResponse> {
    return this.request<TransitionStatusRequest, TransitionStatusResponse>(
      'PATCH',
      `/api/v1/admin/events/${eventId}/status`,
      status,
      false, // Don't retry status transitions (may cause inconsistency)
    );
  }

  /**
   * List events on the live server (admin endpoint)
   */
  async listEvents(): Promise<ListEventsResponse> {
    return this.request<undefined, ListEventsResponse>(
      'GET',
      '/api/v1/admin/events',
      undefined,
      false,
      'masterKey',
    );
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<TRequest, TResponse>(
    method: HttpMethod,
    path: string,
    body?: TRequest,
    enableRetry: boolean = true,
    authMode: 'apiKey' | 'masterKey' | 'none' = 'apiKey',
  ): Promise<TResponse> {
    const url = `${this.config.serverUrl}${path}`;
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= (enableRetry ? this.retryConfig.maxRetries : 0)) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add auth header based on mode
        if (authMode === 'masterKey' && this.config.masterKey) {
          headers['X-Master-Key'] = this.config.masterKey;
        } else if (authMode === 'apiKey' && this.config.apiKey) {
          headers['X-API-Key'] = this.config.apiKey;
        }

        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);

        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as
            | ApiErrorResponse
            | null;

          // Handle 429 Too Many Requests specially
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delayMs = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : this.calculateBackoff(attempt);

            // If we haven't exceeded max retries, wait and retry
            if (attempt < this.retryConfig.maxRetries) {
              await this.delay(delayMs);
              attempt++;
              continue;
            }
          }

          throw new LiveApiError(
            errorBody?.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorBody || undefined,
          );
        }

        // Success - parse and return
        return (await response.json()) as TResponse;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new LiveTimeoutError(
            `Request timeout after ${this.config.timeout}ms`,
          );
        }

        // Don't retry on API errors (4xx, 5xx except 429 handled above)
        if (error instanceof LiveApiError) {
          throw error;
        }

        // Network error - retry if enabled
        if (enableRetry && attempt < this.retryConfig.maxRetries) {
          const delayMs = this.calculateBackoff(attempt);
          await this.delay(delayMs);
          attempt++;
          continue;
        }

        // Max retries exceeded or retry disabled
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown error');
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay =
      this.retryConfig.initialDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
