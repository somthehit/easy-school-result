/**
 * Utility functions for handling API calls with fallbacks and error handling
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
}

/**
 * Wrapper for API calls with automatic fallback handling
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallbackValue?: T,
  options: {
    timeout?: number;
    retries?: number;
    fallbackMessage?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const { timeout = 5000, retries = 2, fallbackMessage = "Using offline data" } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await Promise.race([
        apiCall(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request timeout'));
          });
        })
      ]);

      clearTimeout(timeoutId);
      return { success: true, data: result };
    } catch (error) {
      console.warn(`API call attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries) {
        if (fallbackValue !== undefined) {
          console.info(fallbackMessage);
          return { 
            success: true, 
            data: fallbackValue, 
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Safe fetch wrapper with fallback
 */
export async function safeFetch<T>(
  url: string, 
  options?: RequestInit,
  fallbackData?: T
): Promise<ApiResponse<T>> {
  return safeApiCall(
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    fallbackData,
    { fallbackMessage: `Network unavailable, using cached data for ${url}` }
  );
}

/**
 * Local storage cache for offline functionality
 */
export class OfflineCache {
  private static prefix = 'school-app-cache-';

  static set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();
      
      if (now - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  static clear(key?: string): void {
    try {
      if (key) {
        localStorage.removeItem(this.prefix + key);
      } else {
        // Clear all cache items
        Object.keys(localStorage)
          .filter(k => k.startsWith(this.prefix))
          .forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}
