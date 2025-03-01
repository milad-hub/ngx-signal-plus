/**
 * Configuration options for text form inputs
 */
export interface FormTextOptions {
    /** Minimum length requirement */
    minLength?: number;
    /** Maximum length requirement */
    maxLength?: number;
    /** Debounce time in milliseconds */
    debounce?: number;
}

/**
 * Configuration options for number form inputs
 */
export interface FormNumberOptions {
    /** Minimum value allowed */
    min?: number;
    /** Maximum value allowed */
    max?: number;
    /** Debounce time in milliseconds */
    debounce?: number;
    /** Initial value */
    initial?: number;
} 