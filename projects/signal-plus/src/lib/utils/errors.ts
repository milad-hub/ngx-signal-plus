import { SpErrorCode, SpErrorContext, SpErrorInfo } from '../models/errors.model';

export const SP_ERRORS: Record<SpErrorCode, SpErrorInfo> = {
    [SpErrorCode.INIT_001]: {
        code: SpErrorCode.INIT_001,
        message: 'Initial value cannot be undefined',
        suggestion: 'Provide a defined initial value when creating a signal',
    },
    [SpErrorCode.VAL_001]: {
        code: SpErrorCode.VAL_001,
        message: 'Validation failed',
        suggestion: 'Check the value against the validator requirements',
    },
    [SpErrorCode.VAL_002]: {
        code: SpErrorCode.VAL_002,
        message: 'Invalid email format',
        suggestion: 'Ensure the email includes "@" and a valid domain (e.g., user@example.com)',
    },
    [SpErrorCode.TRX_001]: {
        code: SpErrorCode.TRX_001,
        message: 'Nested transactions are not allowed',
        suggestion: 'Complete the current transaction before starting a new one',
    },
    [SpErrorCode.TRX_002]: {
        code: SpErrorCode.TRX_002,
        message: 'Transaction rollback failed',
        suggestion: 'Check that all signals in the transaction support rollback',
    },
    [SpErrorCode.STOR_001]: {
        code: SpErrorCode.STOR_001,
        message: 'Failed to save to storage',
        suggestion: 'Check storage quota and browser permissions',
    },
    [SpErrorCode.STOR_002]: {
        code: SpErrorCode.STOR_002,
        message: 'Failed to load from storage',
        suggestion: 'Verify the storage key exists and data is valid JSON',
    },
    [SpErrorCode.HIST_001]: {
        code: SpErrorCode.HIST_001,
        message: 'Cannot undo - no history available',
        suggestion: 'Ensure history is enabled and changes have been made',
    },
    [SpErrorCode.HIST_002]: {
        code: SpErrorCode.HIST_002,
        message: 'Cannot redo - no future states available',
        suggestion: 'Redo is only available after an undo operation',
    },
};

export class SpError extends Error {
    readonly code: SpErrorCode;
    readonly context?: SpErrorContext;
    readonly suggestion?: string;

    constructor(code: SpErrorCode, context?: SpErrorContext, customMessage?: string) {
        const errorInfo = SP_ERRORS[code];
        const message = customMessage || errorInfo.message;
        const formattedMessage = formatSpError(code, message, context, errorInfo.suggestion);

        super(formattedMessage);
        this.name = 'SpError';
        this.code = code;
        this.context = context;
        this.suggestion = errorInfo.suggestion;
    }
}

export function formatSpError(
    code: SpErrorCode,
    message: string,
    context?: SpErrorContext,
    suggestion?: string
): string {
    let result = `[SP-${code}] ${message}`;

    if (context) {
        if (context.signalName) {
            result += `\n  Signal: '${context.signalName}'`;
        }
        if (context.validatorName) {
            result += `\n  Validator: ${context.validatorName}`;
        }
        if (context.currentValue !== undefined) {
            result += `\n  Current value: ${JSON.stringify(context.currentValue)}`;
        }
        if (context.expectedValue) {
            result += `\n  Expected: ${context.expectedValue}`;
        }
    }

    if (suggestion) {
        result += `\n  Suggestion: ${suggestion}`;
    }

    return result;
}

export function spCreateError(
    code: SpErrorCode,
    context?: SpErrorContext,
    customMessage?: string
): SpError {
    return new SpError(code, context, customMessage);
}
