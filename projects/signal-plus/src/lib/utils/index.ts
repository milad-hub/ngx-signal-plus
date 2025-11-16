/**
 * @fileoverview Utility exports for ngx-signal-plus
 */

// Managers
export {
  HistoryManager as spHistoryManager,
  StorageManager as spStorageManager,
} from '../managers';

// Utilities
export { spAsync } from './async-state';
export { enhance as spEnhance } from './enhance';
export { spFormGroup } from './form-group';
export {
  hasLocalStorage,
  isBrowser,
  safeAddEventListener,
  safeClearTimeout,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  safeSetTimeout,
} from './platform';
export { presets as spPresets, validators as spValidators } from './presets';
export {
  spBatch,
  spGetModifiedSignals,
  spIsInBatch,
  spIsInTransaction,
  spIsTransactionActive,
  spTransaction,
} from './transactions';
