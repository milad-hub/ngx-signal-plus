import { spSchema, spSchemaWithErrors } from './schema';

describe('Schema Validation', () => {
    describe('spSchema', () => {
        it('should return true for valid value with parse method', () => {
            const mockSchema = {
                parse: (value: number) => {
                    if (value < 0) throw new Error('Must be positive');
                    return value;
                },
            };
            const validator = spSchema(mockSchema);
            expect(validator(5)).toBe(true);
        });

        it('should return false for invalid value with parse method', () => {
            const mockSchema = {
                parse: (value: number) => {
                    if (value < 0) throw new Error('Must be positive');
                    return value;
                },
            };
            const validator = spSchema(mockSchema);
            expect(validator(-1)).toBe(false);
        });

        it('should work with safeParse method', () => {
            const mockSchema = {
                safeParse: (value: string) => ({
                    success: value.length >= 3,
                }),
            };
            const validator = spSchema(mockSchema);
            expect(validator('abc')).toBe(true);
            expect(validator('ab')).toBe(false);
        });

        it('should work with object schema', () => {
            const mockSchema = {
                parse: (value: { name: string; age: number }) => {
                    if (!value.name || value.age < 0) throw new Error('Invalid');
                    return value;
                },
            };
            const validator = spSchema(mockSchema);
            expect(validator({ name: 'John', age: 25 })).toBe(true);
            expect(validator({ name: '', age: 25 })).toBe(false);
        });
    });

    describe('spSchemaWithErrors', () => {
        it('should return valid true for valid value', () => {
            const mockSchema = {
                safeParse: (value: number) => ({
                    success: value > 0,
                }),
            };
            const validator = spSchemaWithErrors(mockSchema);
            const result = validator(5);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return valid false and error for invalid value', () => {
            const mockSchema = {
                safeParse: (value: number) => ({
                    success: value > 0,
                    error: value <= 0 ? { message: 'Must be positive' } : undefined,
                }),
            };
            const validator = spSchemaWithErrors(mockSchema);
            const result = validator(-1);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Must be positive');
        });
    });
});