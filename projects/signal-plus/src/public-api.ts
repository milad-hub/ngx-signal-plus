/**
 * Public API Surface of ngx-signal-plus
 *
 * This file exports all public functionality of the ngx-signal-plus library.
 * Everything exported here is considered stable and follows semantic versioning.
 */

// Core Signal Creation
export { sp, spCounter, spForm, spToggle } from './lib/utils/create';

// Signal Enhancement
export { enhance } from './lib/utils/enhance';

// Core Components and Services
export {
  spSignalBuilder,
  spSignalPlusComponent,
  spSignalPlusService,
} from './lib/core';

// Models and Types
export type {
  AsyncStateOptions,
  SignalAsync,
} from './lib/models/async-state.model';
export type {
  BuilderOptions,
  ErrorHandler,
  FormNumberOptions,
  // Form Types
  FormTextOptions,
  // State Types
  SignalHistory,
  SignalOptions,
  // Core Types
  SignalPlus,
  SignalState,
  Transform,
  // Function Types
  Validator,
} from './lib/models';

// Signal Operators
export {
  spCombineLatest,
  spDebounceTime,
  spDelay,
  spDistinctUntilChanged,
  spFilter,
  spMap,
  spMerge,
  spSkip,
  spTake,
  spThrottleTime,
} from './lib/operators';

// Utilities and Presets
export { spAsync, spPresets, spValidators } from './lib/utils';

// State Management
export { spHistoryManager, spStorageManager } from './lib/managers';

// Transactions and Batching
export {
  spBatch,
  spGetModifiedSignals,
  spIsInBatch,
  spIsInTransaction,
  spIsTransactionActive,
  spTransaction,
} from './lib/utils/transactions';
// Form Groups
export type {
  FormGroupConfig,
  FormGroupOptions,
  FormGroupValidator,
  SignalFormGroup,
} from './lib/models/form-group.model';
export { spFormGroup } from './lib/utils/form-group';
