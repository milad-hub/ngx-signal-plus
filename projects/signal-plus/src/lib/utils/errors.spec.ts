import { SpErrorCode } from '../models/errors.model';
import { SpError, SP_ERRORS, spCreateError, formatSpError } from './errors';

describe('Error Utilities', () => {
    describe('SP_ERRORS catalog', () => {
        it('should have all error codes defined', () => {
            const errorCodes = Object.values(SpErrorCode);
            errorCodes.forEach((code) => {
                expect(SP_ERRORS[code]).toBeDefined();
                expect(SP_ERRORS[code].code).toBe(code);
                expect(SP_ERRORS[code].message).toBeTruthy();
            });
        });

        it('should have suggestions for all errors', () => {
            Object.values(SP_ERRORS).forEach((errorInfo) => {
                expect(errorInfo.suggestion).toBeTruthy();
            });
        });
    });

    describe('SpError class', () => {
        it('should create error with code and default message', () => {
            const error = new SpError(SpErrorCode.INIT_001);
            expect(error.code).toBe(SpErrorCode.INIT_001);
            expect(error.message).toContain('[SP-INIT_001]');
            expect(error.message).toContain('Initial value cannot be undefined');
            expect(error.name).toBe('SpError');
        });

        it('should include context in error message', () => {
            const error = new SpError(SpErrorCode.VAL_001, {
                signalName: 'userEmail',
                currentValue: 'invalid',
                validatorName: 'Email format',
            });
            expect(error.message).toContain("Signal: 'userEmail'");
            expect(error.message).toContain('Validator: Email format');
            expect(error.message).toContain('Current value: "invalid"');
        });

        it('should include suggestion in error message', () => {
            const error = new SpError(SpErrorCode.TRX_001);
            expect(error.message).toContain('Suggestion:');
            expect(error.suggestion).toBe(SP_ERRORS[SpErrorCode.TRX_001].suggestion);
        });

        it('should allow custom message override', () => {
            const customMessage = 'Custom error message';
            const error = new SpError(SpErrorCode.VAL_001, undefined, customMessage);
            expect(error.message).toContain(customMessage);
            expect(error.message).toContain('[SP-VAL_001]');
        });

        it('should store context for programmatic access', () => {
            const context = { signalName: 'counter', currentValue: -5 };
            const error = new SpError(SpErrorCode.VAL_001, context);
            expect(error.context).toEqual(context);
        });
    });

    describe('spCreateError', () => {
        it('should create SpError instance', () => {
            const error = spCreateError(SpErrorCode.STOR_001);
            expect(error).toBeInstanceOf(SpError);
            expect(error.code).toBe(SpErrorCode.STOR_001);
        });

        it('should pass context to error', () => {
            const error = spCreateError(SpErrorCode.VAL_002, {
                signalName: 'email',
                currentValue: 'not-an-email',
            });
            expect(error.context?.signalName).toBe('email');
            expect(error.context?.currentValue).toBe('not-an-email');
        });

        it('should pass custom message to error', () => {
            const error = spCreateError(SpErrorCode.HIST_001, undefined, 'No undo available');
            expect(error.message).toContain('No undo available');
        });
    });

    describe('formatSpError', () => {
        it('should format basic error message', () => {
            const result = formatSpError(SpErrorCode.INIT_001, 'Test message');
            expect(result).toBe('[SP-INIT_001] Test message');
        });

        it('should include signal name in formatted message', () => {
            const result = formatSpError(SpErrorCode.VAL_001, 'Validation failed', {
                signalName: 'counter',
            });
            expect(result).toContain("[SP-VAL_001]");
            expect(result).toContain("Signal: 'counter'");
        });

        it('should include all context fields', () => {
            const result = formatSpError(SpErrorCode.VAL_001, 'Validation failed', {
                signalName: 'age',
                validatorName: 'Range check',
                currentValue: -5,
                expectedValue: 'Positive number',
            });
            expect(result).toContain("Signal: 'age'");
            expect(result).toContain('Validator: Range check');
            expect(result).toContain('Current value: -5');
            expect(result).toContain('Expected: Positive number');
        });

        it('should include suggestion when provided', () => {
            const result = formatSpError(
                SpErrorCode.TRX_001,
                'Nested transactions error',
                undefined,
                'Complete current transaction first'
            );
            expect(result).toContain('Suggestion: Complete current transaction first');
        });

        it('should handle undefined context gracefully', () => {
            const result = formatSpError(SpErrorCode.STOR_002, 'Load failed', undefined, 'Check key');
            expect(result).toBe('[SP-STOR_002] Load failed\n  Suggestion: Check key');
        });
    });

    describe('Error codes', () => {
        it('should have INIT error codes', () => {
            expect(SpErrorCode.INIT_001).toBe('INIT_001');
        });

        it('should have VAL error codes', () => {
            expect(SpErrorCode.VAL_001).toBe('VAL_001');
            expect(SpErrorCode.VAL_002).toBe('VAL_002');
        });

        it('should have TRX error codes', () => {
            expect(SpErrorCode.TRX_001).toBe('TRX_001');
            expect(SpErrorCode.TRX_002).toBe('TRX_002');
        });

        it('should have STOR error codes', () => {
            expect(SpErrorCode.STOR_001).toBe('STOR_001');
            expect(SpErrorCode.STOR_002).toBe('STOR_002');
        });

        it('should have HIST error codes', () => {
            expect(SpErrorCode.HIST_001).toBe('HIST_001');
            expect(SpErrorCode.HIST_002).toBe('HIST_002');
        });
    });
});
