/**
 * Public API Surface of ngx-signal-plus
 * 
 * This file exports all public functionality of the ngx-signal-plus library.
 * Everything exported here is considered stable and follows semantic versioning.
 */

// Core Signal Creation
export {
    sp,
    spCounter,
    spToggle,
    spForm
} from './lib/utils/create';

// Signal Enhancement
export {
    enhance
} from './lib/utils/enhance';

// Core Components and Services
export { 
    spSignalBuilder,
    spSignalPlusService,
    spSignalPlusComponent
} from './lib/core';

// Models and Types
export type {
    // Core Types
    SignalPlus,
    SignalOptions,
    BuilderOptions,
    
    // Form Types
    FormTextOptions,
    FormNumberOptions,
    
    // Function Types
    Validator,
    Transform,
    ErrorHandler,
    
    // State Types
    SignalHistory,
    SignalState
} from './lib/models';

// Signal Operators
export {
    spMap,
    spFilter,
    spDebounceTime,
    spDistinctUntilChanged,
    spDelay,
    spThrottleTime,
    spSkip,
    spTake,
    spMerge,
    spCombineLatest
} from './lib/operators';

// Utilities and Presets
export {
    spValidators,
    spPresets
} from './lib/utils';

// State Management
export {
    spHistoryManager,
    spStorageManager
} from './lib/managers';

// Transactions and Batching
export {
    spTransaction,
    spBatch,
    spIsInTransaction,
    spIsInBatch,
    spIsTransactionActive,
    spGetModifiedSignals
} from './lib/utils/transactions';