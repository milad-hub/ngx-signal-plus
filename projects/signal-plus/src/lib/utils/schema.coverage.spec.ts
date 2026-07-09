import { SafeParseLike, SchemaLike } from '../models/schema.model';
import { spSchemaValidator, spSchemaWithErrors } from './schema';

describe('schema error extraction behavior', () => {
  it('should return no messages when a failed safeParse has no error object', () => {
    const schema = {
      safeParse: () => ({ success: false }),
    } as SafeParseLike<number>;

    const result = spSchemaWithErrors(schema)(1);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it('should fall back to a generic message for unknown error shapes', () => {
    const schema = {
      safeParse: () => ({ success: false, error: {} }),
    } as unknown as SafeParseLike<number>;

    const result = spSchemaWithErrors(schema)(1);
    expect(result.errors).toEqual(['Validation failed']);
  });

  it('should format errors-array entries with and without paths', () => {
    const schema = {
      safeParse: () => ({
        success: false,
        error: {
          errors: [
            { path: ['user', 'name'], message: 'required' },
            { message: 'plain failure' },
          ],
        },
      }),
    } as unknown as SafeParseLike<number>;

    const result = spSchemaWithErrors(schema)(1);
    expect(result.errors).toEqual(['user.name: required', 'plain failure']);
  });
});

describe('spSchemaValidator gap behavior', () => {
  it('should return valid for a successful safeParse in validateWithErrors', () => {
    const schema = {
      safeParse: () => ({ success: true, data: 1 }),
    } as SafeParseLike<number>;

    const result = spSchemaValidator(schema).validateWithErrors(1);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('should return valid for a successful parse in validateWithErrors', () => {
    const schema = { parse: (value: number) => value } as SchemaLike<number>;

    const result = spSchemaValidator(schema).validateWithErrors(1);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('should fall back to a generic message when parse throws a non-object', () => {
    const schema = {
      parse: () => {
        throw 'nope';
      },
    } as unknown as SchemaLike<number>;

    const result = spSchemaValidator(schema).validateWithErrors(1);
    expect(result).toEqual({ valid: false, errors: ['Validation failed'] });
  });
});
