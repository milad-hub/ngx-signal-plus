import { Validator } from '../models/signal-plus.model';

export interface SchemaLike<T> {
    parse: (value: T) => T;
}

export interface SafeParseLike<T> {
    safeParse: (value: T) => { success: boolean; error?: { message: string } };
}

export function spSchema<T>(schema: SchemaLike<T> | SafeParseLike<T>): Validator<T> {
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
): (value: T) => { valid: boolean; error?: string } {
    return (value: T) => {
        const result = schema.safeParse(value);
        return {
            valid: result.success,
            error: result.error?.message,
        };
    };
}
