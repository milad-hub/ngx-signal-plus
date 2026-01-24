import { Validator } from '../models/signal-plus.model';
import {
    SafeParseLike,
    SchemaLike,
    SchemaValidationResult,
    ZodError
} from '../models/schema.model';

export type { SafeParseLike, SchemaLike, SchemaValidationResult, ZodError, ZodErrorIssue, ZodLike } from '../models/schema.model';


function extractErrorMessages(error: ZodError | { message: string } | undefined): string[] {
    if (!error) {
        return [];
    }

    if ('issues' in error && Array.isArray(error.issues)) {
        return error.issues.map((issue) => {
            const path = issue.path?.join('.') || '';
            return path ? `${path}: ${issue.message}` : issue.message;
        });
    }

    if ('errors' in error && Array.isArray(error.errors)) {
        return error.errors.map((e) => {
            const path = e.path?.join('.') || '';
            return path ? `${path}: ${e.message}` : e.message;
        });
    }

    if (error.message) {
        return [error.message];
    }

    return ['Validation failed'];
}

export function spSchema<T>(
    schema: SchemaLike<T> | SafeParseLike<T>,
): Validator<T> {
    return (value: T): boolean => {
        if ('safeParse' in schema) {
            return schema.safeParse(value).success;
        }
        try {
            schema.parse(value);
            return true;
        } catch {
            return false;
        }
    };
}

export function spSchemaWithErrors<T>(
    schema: SafeParseLike<T>,
): (value: T) => SchemaValidationResult {
    return (value: T): SchemaValidationResult => {
        const result = schema.safeParse(value);
        if (result.success) {
            return { valid: true, errors: [] };
        }
        return {
            valid: false,
            errors: extractErrorMessages(result.error),
        };
    };
}

export function spSchemaValidator<T>(schema: SchemaLike<T> | SafeParseLike<T>): {
    validate: Validator<T>;
    validateWithErrors: (value: T) => SchemaValidationResult
} {
    const validate: Validator<T> = (value: T): boolean => {
        if ('safeParse' in schema) {
            return schema.safeParse(value).success;
        }
        try {
            schema.parse(value);
            return true;
        } catch {
            return false;
        }
    };

    const validateWithErrors = (value: T): SchemaValidationResult => {
        if ('safeParse' in schema) {
            const result = schema.safeParse(value);
            if (result.success) {
                return { valid: true, errors: [] };
            }
            return { valid: false, errors: extractErrorMessages(result.error) };
        }

        try {
            schema.parse(value);
            return { valid: true, errors: [] };
        } catch (error) {
            if (error && typeof error === 'object') {
                return { valid: false, errors: extractErrorMessages(error as ZodError) };
            }
            return { valid: false, errors: ['Validation failed'] };
        }
    };

    return { validate, validateWithErrors };
}