/**
 * @fileoverview Platform detection utilities for SSR compatibility
 * @description Provides utilities to check if code is running in a browser environment
 * 
 * This is critical for Server-Side Rendering (SSR) compatibility with Angular Universal.
 * Browser APIs like window, localStorage, and document are not available during SSR.
 * 
 * @example
 * ```typescript
 * import { isBrowser } from './platform';
 * 
 * if (isBrowser()) {
 *   localStorage.setItem('key', 'value');
 * }
 * ```
 */

/**
 * Checks if the code is running in a browser environment
 * 
 * @returns True if running in browser, false otherwise (e.g., Node.js/SSR)
 * 
 * @remarks
 * This function checks for the existence of browser-specific global objects.
 * It's safe to call during SSR as it doesn't attempt to access these objects,
 * only checks for their existence.
 * 
 * Use this before accessing any browser-specific APIs:
 * - window
 * - localStorage
 * - sessionStorage
 * - document
 * - navigator
 * 
 * @example Basic Usage
 * ```typescript
 * if (isBrowser()) {
 *   const stored = localStorage.getItem('key');
 * }
 * ```
 * 
 * @example With Angular Universal
 * ```typescript
 * // This code works in both SSR and browser
 * const value = isBrowser() 
 *   ? localStorage.getItem('theme')
 *   : 'default';
 * ```
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.document !== 'undefined';
}

/**
 * Checks if localStorage is available
 * 
 * @returns True if localStorage is available and working
 * 
 * @remarks
 * This checks not only for browser environment but also:
 * - localStorage API existence
 * - localStorage is not disabled by user settings
 * - localStorage is not in private/incognito mode with quota exceeded
 * 
 * @example Safe Storage Access
 * ```typescript
 * if (hasLocalStorage()) {
 *   localStorage.setItem('key', 'value');
 * } else {
 *   // Fallback to memory storage
 * }
 * ```
 */
export function hasLocalStorage(): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    const testKey = '__ngx_signal_plus_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely gets a value from localStorage
 * 
 * @param key Storage key
 * @returns Stored value or null if not available/not in browser
 * 
 * @remarks
 * This is a convenience wrapper that handles SSR gracefully.
 * Returns null when localStorage is not available instead of throwing.
 * 
 * @example
 * ```typescript
 * const theme = safeLocalStorageGet('theme') ?? 'light';
 * ```
 */
export function safeLocalStorageGet(key: string): string | null {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely sets a value in localStorage
 * 
 * @param key Storage key
 * @param value Value to store
 * @returns True if successful, false otherwise
 * 
 * @remarks
 * This is a convenience wrapper that handles SSR gracefully.
 * Returns false when localStorage is not available instead of throwing.
 * 
 * **Error Handling:**
 * - Returns `false` for any error (QuotaExceededError, SecurityError, etc.)
 * - Silently handles failures without throwing
 * - Safe to call in SSR and browser environments
 * 
 * **Common Failure Scenarios:**
 * - Storage quota exceeded (browser limit reached)
 * - Private/incognito mode with disabled storage
 * - SecurityError in cross-origin contexts
 * - SSR environment (no localStorage)
 * 
 * @example
 * ```typescript
 * const success = safeLocalStorageSet('theme', 'dark');
 * if (!success) {
 *   console.warn('Could not persist theme');
 * }
 * ```
 * 
 * @example Handling Quota Exceeded
 * ```typescript
 * const success = safeLocalStorageSet('large-data', JSON.stringify(data));
 * if (!success) {
 *   // Fallback: use memory storage or clear old data
 * }
 * ```
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (!hasLocalStorage()) {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Silently handle all localStorage errors:
    // - QuotaExceededError: Storage limit reached
    // - SecurityError: Access denied
    // - Other errors: Invalid state, etc.
    return false;
  }
}

/**
 * Safely removes a value from localStorage
 * 
 * @param key Storage key to remove
 * @returns True if successful, false otherwise
 * 
 * @example
 * ```typescript
 * safeLocalStorageRemove('temp-data');
 * ```
 */
export function safeLocalStorageRemove(key: string): boolean {
  if (!hasLocalStorage()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe wrapper for setTimeout that works in SSR
 * 
 * @param callback Function to execute
 * @param ms Delay in milliseconds
 * @returns Timeout ID (number in browser, undefined in SSR)
 * 
 * @remarks
 * In SSR environment, returns undefined and doesn't execute callback.
 * This prevents errors during SSR while maintaining browser functionality.
 * 
 * @example
 * ```typescript
 * const timeoutId = safeSetTimeout(() => {
 *   console.log('Executed in browser only');
 * }, 1000);
 * 
 * if (timeoutId) {
 *   clearTimeout(timeoutId);
 * }
 * ```
 */
export function safeSetTimeout(callback: () => void, ms: number): number | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  return window.setTimeout(callback, ms) as number;
}

/**
 * Safe wrapper for clearTimeout that works in SSR
 * 
 * @param timeoutId Timeout ID to clear
 * 
 * @example
 * ```typescript
 * const id = safeSetTimeout(() => {...}, 1000);
 * safeClearTimeout(id);
 * ```
 */
export function safeClearTimeout(timeoutId: number | undefined): void {
  if (!isBrowser() || timeoutId === undefined) {
    return;
  }

  window.clearTimeout(timeoutId);
}

/**
 * Safe wrapper for addEventListener that works in SSR
 * 
 * @param event Event name
 * @param handler Event handler function
 * @returns Cleanup function, or no-op function in SSR
 * 
 * @example
 * ```typescript
 * const cleanup = safeAddEventListener('storage', (event) => {
 *   console.log('Storage changed', event);
 * });
 * 
 * // Later...
 * cleanup();
 * ```
 */
export function safeAddEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (this: Window, ev: WindowEventMap[K]) => any
): () => void {
  if (!isBrowser()) {
    return () => { }; // No-op cleanup function
  }

  window.addEventListener(event, handler);

  return () => {
    window.removeEventListener(event, handler);
  };
}

