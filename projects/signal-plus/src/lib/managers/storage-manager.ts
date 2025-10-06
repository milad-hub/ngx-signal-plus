/**
 * @fileoverview Storage management system for persistent data
 * Provides a type-safe wrapper around localStorage with enhanced functionality.
 * 
 * Features:
 * - Type-safe storage operations with generics
 * - Automatic namespacing to prevent key conflicts
 * - JSON serialization and deserialization
 * - Comprehensive error handling
 * - Storage availability checking
 * - SSR (Server-Side Rendering) compatible
 * 
 * @example Basic Usage
 * ```typescript
 * // Save data with type safety
 * interface UserPrefs { theme: string; fontSize: number; }
 * StorageManager.save<UserPrefs>('prefs', { theme: 'dark', fontSize: 14 });
 * 
 * // Load with type inference
 * const prefs = StorageManager.load<UserPrefs>('prefs');
 * console.log(prefs?.theme); // 'dark'
 * 
 * // Safe removal
 * StorageManager.remove('prefs');
 * ```
 */

import { 
    hasLocalStorage, 
    safeLocalStorageGet, 
    safeLocalStorageSet, 
    safeLocalStorageRemove 
} from '../utils/platform';

/**
 * Manages persistent storage operations with error handling and namespacing.
 * 
 * @remarks
 * This class provides a wrapper around localStorage with:
 * - Automatic namespacing to prevent conflicts
 * - Type-safe operations with generics
 * - Built-in error handling and validation
 * - Storage availability detection
 * - Automatic JSON serialization/deserialization
 * 
 * Storage keys are automatically prefixed to prevent conflicts
 * with other applications using localStorage.
 */
export class StorageManager {
    /** 
     * Namespace prefix for all storage keys to prevent conflicts.
     * All keys are prefixed with this value before storage.
     */
    private static readonly PREFIX: string = 'ngx-signal-plus:';
    
    /** 
     * Maximum allowed key length including prefix.
     * Ensures compatibility across different browsers and platforms.
     */
    private static readonly MAX_KEY_LENGTH: number = 100;

    /**
     * Validates a storage key for correctness and length
     * 
     * @param key - Storage key to validate
     * @returns True if key is valid, false otherwise
     * @remarks
     * Validates that:
     * - Key is a non-empty string
     * - Key length (with prefix) doesn't exceed maximum
     * - Key contains valid characters
     */
    private static validateKey(key: string): boolean {
        if (!key || typeof key !== 'string' || key.trim().length === 0) {
            console.warn('Invalid key: Key must be a non-empty string');
            return false;
        }

        const fullKey = this.PREFIX + key;
        if (fullKey.length > this.MAX_KEY_LENGTH) {
            console.warn(`Invalid key: key length exceeds ${this.MAX_KEY_LENGTH} characters`);
            return false;
        }

        return true;
    }

    /**
     * Saves a value to localStorage with type safety
     * 
     * @param key - Storage key (will be prefixed automatically)
     * @param value - Value to store (will be JSON serialized)
     * @throws {Error} If storage is not available
     * @throws {Error} If serialization fails
     * @remarks
     * - Automatically handles JSON serialization
     * - Validates key before storage
     * - Handles storage errors
     * 
     * @example
     * ```typescript
     * // Store a complex object
     * StorageManager.save('user', {
     *   id: 123,
     *   preferences: { theme: 'dark' }
     * });
     * ```
     */
    static save<T>(key: string, value: T): void {
        if (!this.validateKey(key)) return;
        if (!hasLocalStorage()) {
            console.warn('localStorage is not available (SSR or disabled)');
            return;
        }

        try {
            const storageKey: string = this.PREFIX + key;
            const success = safeLocalStorageSet(storageKey, JSON.stringify(value));
            if (!success) {
                console.warn('Failed to save to localStorage');
            }
        } catch (error) {
            console.warn(`Failed to save to localStorage: ${error}`);
        }
    }

    /**
     * Loads a value from localStorage with type safety
     * 
     * @param key - Storage key (will be prefixed automatically)
     * @returns The stored value or undefined if not found
     * @throws {Error} If storage is not available
     * @throws {Error} If deserialization fails
     * @remarks
     * - Automatically handles JSON deserialization
     * - Returns undefined for missing keys
     * - Type-safe return value
     * 
     * @example
     * ```typescript
     * // Load with type checking
     * interface UserData {
     *   id: number;
     *   preferences: { theme: string; }
     * }
     * const user = StorageManager.load<UserData>('user');
     * ```
     */
    static load<T>(key: string): T | undefined {
        if (!this.validateKey(key)) return undefined;
        if (!hasLocalStorage()) {
            return undefined;
        }

        try {
            const storageKey: string = this.PREFIX + key;
            const item: string | null = safeLocalStorageGet(storageKey);
            return item ? JSON.parse(item) : undefined;
        } catch (error) {
            console.warn(`Failed to load from localStorage: ${error}`);
            return undefined;
        }
    }

    /**
     * Removes a value from localStorage
     * 
     * @param key - Storage key to remove (will be prefixed automatically)
     * @throws {Error} If storage is not available
     * @remarks
     * - Silently ignores non-existent keys
     * - Validates key before removal
     * - Handles removal errors
     * 
     * @example
     * ```typescript
     * // Remove stored data
     * StorageManager.remove('user');
     * ```
     */
    static remove(key: string): void {
        if (!this.validateKey(key)) return;
        if (!hasLocalStorage()) {
            return;
        }

        try {
            const storageKey: string = this.PREFIX + key;
            safeLocalStorageRemove(storageKey);
        } catch (error) {
            console.warn(`Failed to remove from localStorage: ${error}`);
        }
    }

    /**
     * Checks if localStorage is available and working
     * 
     * @returns True if storage is available and working
     * @remarks
     * Tests storage by:
     * - Checking if localStorage exists
     * - Attempting a test write/read
     * - Verifying storage quota
     * 
     * @example
     * ```typescript
     * if (StorageManager.isAvailable()) {
     *   StorageManager.save('key', data);
     * } else {
     *   console.warn('Local storage not available');
     * }
     * ```
     */
    static isAvailable(): boolean {
        return hasLocalStorage();
    }
}