/**
 * Retry wrapper for fetch() to handle ECONNRESET, network errors, and HTTP 5xx
 */

function isRetryableError(error: unknown): error is Error {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string' &&
    (error as any).name === 'TypeError' &&
    (
      (error as any).message.includes('fetch failed') ||
      (error as any).message.includes('ECONNRESET') ||
      (error as any).message.includes('ETIMEDOUT') ||
      (error as any).message.includes('ENOTFOUND') ||
      (error as any).message.includes('ECONNREFUSED') ||
      (error as any).message.includes('timeout') ||
      (error as any).message.includes('socket hang up')
    )
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number, base: number, max: number): number {
  return Math.min(base * Math.pow(2, attempt) + Math.random() * 1000, max);
}

const MAX_DELAY = 10000; // 10 seconds max delay
const FETCH_TIMEOUT = 15000; // 15 second timeout per request

export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<Response> {
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Create per-attempt timeout controller
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT);
    
    // Chain external signal with timeout signal
    const externalSignal = options.signal;
    let combinedSignal = timeoutController.signal;
    
    if (externalSignal) {
      // If external signal is already aborted, respect it immediately
      if (externalSignal.aborted) {
        clearTimeout(timeout);
        throw new DOMException('Request was aborted', 'AbortError');
      }
      
      // Create combined controller that responds to both signals
      const combinedController = new AbortController();
      
      const abortBoth = () => combinedController.abort();
      externalSignal.addEventListener('abort', abortBoth, { once: true });
      timeoutController.signal.addEventListener('abort', abortBoth, { once: true });
      
      combinedSignal = combinedController.signal;
    }
    
    try {
      const response = await fetch(url, { 
        ...options, 
        signal: combinedSignal 
      });
      
      // Retry on HTTP 5xx server errors
      if (!response.ok && [500, 502, 503, 504].includes(response.status)) {
        if (attempt === maxRetries) {
          throw new Error(`HTTP ${response.status} after ${maxRetries + 1} attempts`);
        }
        
        const backoffDelay = computeBackoff(attempt, baseDelay, MAX_DELAY);
        await delay(backoffDelay);
        continue;
      }
      
      return response; // Success!
      
    } catch (error: unknown) {
      const isLastAttempt = attempt === maxRetries;
      
      if (!isRetryableError(error) || isLastAttempt) {
        // Don't retry non-network errors or if we've exhausted retries
        throw error;
      }
      
      const backoffDelay = computeBackoff(attempt, baseDelay, MAX_DELAY);
      await delay(backoffDelay);
      
    } finally {
      clearTimeout(timeout);
    }
  }
  
  throw new Error('Max retries exceeded');
}