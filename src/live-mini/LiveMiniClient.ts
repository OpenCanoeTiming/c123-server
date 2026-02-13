/**
 * Live-Mini HTTP Client
 *
 * Stateless HTTP client for pushing data to c123-live-mini-server.
 * Uses native fetch with exponential backoff retry logic.
 */

import type {
  CreateEventRequest,
  CreateEventResponse,
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
export interface LiveMiniClientConfig {
  /** Server base URL (e.g., "https://live.example.com") */
  serverUrl: string;
  /** API key for authentication */
  apiKey: string;
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
export class LiveMiniApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ApiErrorResponse,
  ) {
    super(message);
    this.name = 'LiveMiniApiError';
  }
}

/**
 * Custom error for timeout
 */
export class LiveMiniTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveMiniTimeoutError';
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
export class LiveMiniClient {
  private config: Required<LiveMiniClientConfig>;
  private retryConfig: Required<RetryConfig>;

  constructor(
    config: LiveMiniClientConfig,
    retryConfig: RetryConfig = {},
  ) {
    this.config = {
      serverUrl: config.serverUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey,
      timeout: config.timeout ?? 10000,
    };
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...retryConfig,
    };
  }

  /**
   * Create a new event on live-mini
   */
  async createEvent(request: CreateEventRequest): Promise<CreateEventResponse> {
    return this.request<CreateEventRequest, CreateEventResponse>(
      'POST',
      '/api/v1/admin/events',
      request,
      false, // Don't retry event creation (409 conflict if retry)
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
   * Make HTTP request with retry logic
   */
  private async request<TRequest, TResponse>(
    method: HttpMethod,
    path: string,
    body?: TRequest,
    enableRetry: boolean = true,
  ): Promise<TResponse> {
    const url = `${this.config.serverUrl}${path}`;
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= (enableRetry ? this.retryConfig.maxRetries : 0)) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
          },
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

          throw new LiveMiniApiError(
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
          throw new LiveMiniTimeoutError(
            `Request timeout after ${this.config.timeout}ms`,
          );
        }

        // Don't retry on API errors (4xx, 5xx except 429 handled above)
        if (error instanceof LiveMiniApiError) {
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
