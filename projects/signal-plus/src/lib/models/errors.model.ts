export enum SpErrorCode {
    INIT_001 = 'INIT_001',
    VAL_001 = 'VAL_001',
    VAL_002 = 'VAL_002',
    TRX_001 = 'TRX_001',
    TRX_002 = 'TRX_002',
    STOR_001 = 'STOR_001',
    STOR_002 = 'STOR_002',
    HIST_001 = 'HIST_001',
    HIST_002 = 'HIST_002',
}

export interface SpErrorContext {
    signalName?: string;
    currentValue?: unknown;
    expectedValue?: string;
    validatorName?: string;
}

export interface SpErrorInfo {
    code: SpErrorCode;
    message: string;
    suggestion?: string;
}
