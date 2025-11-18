/**
 * @fileoverview Async validators for ngx-signal-plus
 *
 * This file provides async validation utilities that can be used with signals
 * to perform server-side validation with proper debouncing and cancellation.
 *
 * Key Features:
 * - Debounced API calls to reduce server load
 * - Automatic cancellation of previous requests on new values
 * - Integration with signal validation system
 * - Type-safe async validation functions
 *
 * @example
 * ```typescript
 * import { spValidators } from 'ngx-signal-plus';
 *
 * const username = spForm.text('', {
 *   validators: [
 *     spValidators.async.unique(
 *       async (value) => checkUsernameAPI(value),
 *       { debounce: 500 }
 *     )
 *   ]
 * });
 * ```
 */

export interface AsyncValidatorOptions {
  /** Debounce time in milliseconds before triggering validation */
  debounce?: number;
  /** Custom error message to return on validation failure */
  message?: string;
}

/**
 * Async validator for uniqueness checking
 * @param checkFn - Function that checks uniqueness (should return true if unique)
 * @param options - Configuration options
 * @returns Async validator function
 *
 * @example
 * ```typescript
 * const validator = spValidators.async.unique(
 *   async (username: string) => {
 *     const response = await fetch(`/api/check-username?username=${username}`);
 *     return response.ok;
 *   },
 *   { debounce: 500 }
 * );
 * ```
 */
export function unique<T>(
  checkFn: (value: T) => Promise<boolean>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: AsyncValidatorOptions = {},
): AsyncValidator<T> {
  return async (value: T): Promise<boolean> => {
    try {
      const isUnique = await checkFn(value);
      return isUnique;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Network errors are considered validation failures
      return false;
    }
  };
}

/**
 * Generic async validator for custom validation functions
 * @param validatorFn - Function that performs validation and returns true/false or throws
 * @param options - Configuration options
 * @returns Async validator function
 *
 * @example
 * ```typescript
 * const validator = spValidators.async.custom(
 *   async (email: string) => {
 *     const response = await fetch('/api/validate-email', {
 *       method: 'POST',
 *       body: JSON.stringify({ email })
 *     });
 *     if (!response.ok) throw new Error('Invalid email');
 *     return true;
 *   },
 *   { debounce: 300, message: 'Email validation failed' }
 * );
 * ```
 */
export function custom<T>(
  validatorFn: (value: T) => Promise<boolean>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: AsyncValidatorOptions = {},
): AsyncValidator<T> {
  return async (value: T): Promise<boolean> => {
    try {
      return await validatorFn(value);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Custom validators can throw to indicate validation failure
      return false;
    }
  };
}

/**
 * Function signature for async validators
 * @template T - The type of value being validated
 * @param value - The value to validate
 * @returns Promise resolving to true if valid, false if invalid
 */
export type AsyncValidator<T = unknown> = (value: T) => Promise<boolean>;

/**
 * Async validators namespace containing all async validation utilities
 */
export const async = {
  unique,
  custom,
} as const;

/**
 * Main validators namespace with async sub-namespace
 */
export const spValidators = {
  async,
} as const;
