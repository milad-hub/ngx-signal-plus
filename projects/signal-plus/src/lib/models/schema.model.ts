export interface SchemaLike<T> {
    parse: (value: T) => T;
}

export interface ZodErrorIssue {
    message: string;
    path?: (string | number)[];
    code?: string;
}

export interface ZodError {
    message: string;
    issues?: ZodErrorIssue[];
    errors?: ZodErrorIssue[];
}

export interface SafeParseLike<T> {
    safeParse: (value: T) => {
        success: boolean;
        error?: ZodError | { message: string };
        data?: T;
    };
}

export interface ZodLike<T> extends SchemaLike<T>, SafeParseLike<T> { }

export interface SchemaValidationResult {
    valid: boolean;
    errors: string[];
}
