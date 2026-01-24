/**
 * @fileoverview Utility exports for ngx-signal-plus
 */

// Managers
export {
  HistoryManager as spHistoryManager,
  StorageManager as spStorageManager
} from '../managers';

// Utilities
export { spAsync } from './async-state';
export { spCollection } from './collection';
export { spComputed } from './computed';
export { enhance as spEnhance } from './enhance';
export { spFormGroup } from './form-group';
export {
  spAnalyticsMiddleware,
  spClearMiddleware,
  spGetMiddlewareCount,
  spLoggerMiddleware,
  spRemoveMiddleware,
  spRunMiddleware,
  spRunMiddlewareError,
  spUseMiddleware
} from './middleware';
export type { MiddlewareContext, SignalMiddleware } from './middleware';
export {
  hasLocalStorage,
  isBrowser,
  safeAddEventListener,
  safeClearTimeout,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  safeSetTimeout
} from './platform';
export { presets as spPresets, validators as spValidators } from './presets';
export { spSchema, spSchemaValidator, spSchemaWithErrors } from './schema';
export type {
  SafeParseLike,
  SchemaLike,
  SchemaValidationResult,
  ZodError,
  ZodErrorIssue,
  ZodLike
} from './schema';
export {
  spBatch,
  spGetModifiedSignals,
  spIsInBatch,
  spIsInTransaction,
  spIsTransactionActive,
  spTransaction
} from './transactions';
