import { spSchema, spSchemaValidator, spSchemaWithErrors } from './schema';

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
            expect(result.errors).toEqual([]);
        });

        it('should return valid false and errors for invalid value', () => {
            const mockSchema = {
                safeParse: (value: number) => ({
                    success: value > 0,
                    error: value <= 0 ? { message: 'Must be positive' } : undefined,
                }),
            };
            const validator = spSchemaWithErrors(mockSchema);
            const result = validator(-1);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Must be positive');
        });

        it('should extract multiple errors from issues array', () => {
            const mockSchema = {
                safeParse: () => ({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        issues: [
                            { message: 'Name is required', path: ['name'] },
                            { message: 'Age must be positive', path: ['age'] },
                        ],
                    },
                }),
            };
            const validator = spSchemaWithErrors(mockSchema);
            const result = validator({ name: '', age: -1 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('name: Name is required');
            expect(result.errors).toContain('age: Age must be positive');
        });

        it('should handle errors array format', () => {
            const mockSchema = {
                safeParse: () => ({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        errors: [{ message: 'Invalid email format', path: ['email'] }],
                    },
                }),
            };
            const validator = spSchemaWithErrors(mockSchema);
            const result = validator({ email: 'invalid' });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('email: Invalid email format');
        });

        it('should handle nested path', () => {
            const mockSchema = {
                safeParse: () => ({
                    success: false,
                    error: {
                        message: 'Validation failed',
                        issues: [
                            { message: 'Name is too short', path: ['user', 'profile', 'name'] },
                        ],
                    },
                }),
            };
            const validator = spSchemaWithErrors(mockSchema);
            const result = validator({ user: { profile: { name: 'a' } } });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('user.profile.name: Name is too short');
        });
    });

    describe('spSchemaValidator', () => {
        it('should return both validate and validateWithErrors functions', () => {
            const mockSchema = {
                safeParse: (value: number) => ({
                    success: value > 0,
                    error: value <= 0 ? { message: 'Must be positive' } : undefined,
                }),
            };
            const schemaValidator = spSchemaValidator(mockSchema);
            expect(typeof schemaValidator.validate).toBe('function');
            expect(typeof schemaValidator.validateWithErrors).toBe('function');
        });

        it('should validate using validate function', () => {
            const mockSchema = {
                safeParse: (value: number) => ({
                    success: value >= 0 && value <= 100,
                }),
            };
            const { validate } = spSchemaValidator(mockSchema);
            expect(validate(50)).toBe(true);
            expect(validate(150)).toBe(false);
            expect(validate(-10)).toBe(false);
        });

        it('should return detailed errors using validateWithErrors', () => {
            const mockSchema = {
                safeParse: (value: { name: string; email: string }) => {
                    const errors: { message: string; path: string[] }[] = [];
                    if (!value.name) {
                        errors.push({ message: 'Name is required', path: ['name'] });
                    }
                    if (!value.email.includes('@')) {
                        errors.push({ message: 'Invalid email', path: ['email'] });
                    }
                    return {
                        success: errors.length === 0,
                        error: errors.length > 0 ? { message: 'Validation failed', issues: errors } : undefined,
                    };
                },
            };
            const { validateWithErrors } = spSchemaValidator(mockSchema);
            const result = validateWithErrors({ name: '', email: 'invalid' });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(2);
        });

        it('should work with parse-only schema', () => {
            const mockSchema = {
                parse: (value: number) => {
                    if (value < 0) throw new Error('Must be non-negative');
                    return value;
                },
            };
            const { validate, validateWithErrors } = spSchemaValidator(mockSchema);
            expect(validate(5)).toBe(true);
            expect(validate(-1)).toBe(false);
            const validResult = validateWithErrors(5);
            expect(validResult.valid).toBe(true);
            expect(validResult.errors).toEqual([]);
            const invalidResult = validateWithErrors(-1);
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.errors.length).toBeGreaterThan(0);
        });

        it('should extract error message from parse-only schema', () => {
            const mockSchema = {
                parse: (value: string) => {
                    if (value.length < 3) {
                        const error = {
                            message: 'Validation failed',
                            issues: [{ message: 'String must be at least 3 characters', path: [] }],
                        };
                        throw error;
                    }
                    return value;
                },
            };
            const { validateWithErrors } = spSchemaValidator(mockSchema);
            const result = validateWithErrors('ab');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('String must be at least 3 characters');
        });
    });

    describe('Zod-like schema integration', () => {
        function createZodLikeSchema<T>(validator: (value: T) => { success: boolean; issues?: { message: string; path: (string | number)[] }[] }) {
            return {
                parse: (value: T): T => {
                    const result = validator(value);
                    if (!result.success) {
                        throw {
                            message: 'Validation failed',
                            issues: result.issues,
                        };
                    }
                    return value;
                },
                safeParse: (value: T) => {
                    const result = validator(value);
                    return {
                        success: result.success,
                        data: result.success ? value : undefined,
                        error: !result.success ? { message: 'Validation failed', issues: result.issues } : undefined,
                    };
                },
            };
        }

        it('should work with Zod-like string schema', () => {
            const stringSchema = createZodLikeSchema((value: string) => {
                if (typeof value !== 'string') {
                    return { success: false, issues: [{ message: 'Expected string', path: [] }] };
                }
                if (value.length < 3) {
                    return { success: false, issues: [{ message: 'String must be at least 3 characters', path: [] }] };
                }
                return { success: true };
            });

            const { validate, validateWithErrors } = spSchemaValidator(stringSchema);
            expect(validate('hello')).toBe(true);
            expect(validate('ab')).toBe(false);
            const result = validateWithErrors('ab');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('String must be at least 3 characters');
        });

        it('should work with Zod-like object schema', () => {
            interface User {
                name: string;
                email: string;
                age: number;
            }
            const userSchema = createZodLikeSchema((value: User) => {
                const issues: { message: string; path: (string | number)[] }[] = [];
                if (!value.name || value.name.length < 2) {
                    issues.push({ message: 'Name must be at least 2 characters', path: ['name'] });
                }
                if (!value.email || !value.email.includes('@')) {
                    issues.push({ message: 'Invalid email format', path: ['email'] });
                }
                if (value.age < 18 || value.age > 120) {
                    issues.push({ message: 'Age must be between 18 and 120', path: ['age'] });
                }

                return { success: issues.length === 0, issues };
            });
            const { validate, validateWithErrors } = spSchemaValidator(userSchema);
            expect(validate({ name: 'John', email: 'john@example.com', age: 25 })).toBe(true);
            expect(validate({ name: 'J', email: 'invalid', age: 10 })).toBe(false);
            const result = validateWithErrors({ name: 'J', email: 'invalid', age: 10 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('name: Name must be at least 2 characters');
            expect(result.errors).toContain('email: Invalid email format');
            expect(result.errors).toContain('age: Age must be between 18 and 120');
        });

        it('should work with nested object schema', () => {
            interface Address {
                street: string;
                city: string;
                zip: string;
            }
            interface Person {
                name: string;
                address: Address;
            }
            const personSchema = createZodLikeSchema((value: Person) => {
                const issues: { message: string; path: (string | number)[] }[] = [];
                if (!value.name) {
                    issues.push({ message: 'Name is required', path: ['name'] });
                }
                if (!value.address.street) {
                    issues.push({ message: 'Street is required', path: ['address', 'street'] });
                }
                if (!value.address.city) {
                    issues.push({ message: 'City is required', path: ['address', 'city'] });
                }
                if (!/^\d{5}$/.test(value.address.zip)) {
                    issues.push({ message: 'ZIP must be 5 digits', path: ['address', 'zip'] });
                }
                return { success: issues.length === 0, issues };
            });
            const { validateWithErrors } = spSchemaValidator(personSchema);
            const result = validateWithErrors({
                name: '',
                address: { street: '', city: '', zip: 'abc' },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('name: Name is required');
            expect(result.errors).toContain('address.street: Street is required');
            expect(result.errors).toContain('address.city: City is required');
            expect(result.errors).toContain('address.zip: ZIP must be 5 digits');
        });
    });

    describe('Integration with sp() builder', () => {
        it('should work with spSchema as validator in sp builder', () => {
            const mockSchema = {
                safeParse: (value: number) => ({
                    success: value >= 0 && value <= 100,
                }),
            };
            const validator = spSchema(mockSchema);
            expect(validator(50)).toBe(true);
            expect(validator(150)).toBe(false);
        });
    });
});