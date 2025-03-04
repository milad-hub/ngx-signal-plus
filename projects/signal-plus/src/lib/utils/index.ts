/**
 * @fileoverview Utility exports for ngx-signal-plus
 */

// Managers
export { HistoryManager as spHistoryManager, StorageManager as spStorageManager } from '../managers';

// Utilities
export { enhance as spEnhance } from './enhance';
export { presets as spPresets, validators as spValidators } from './presets';
export { 
  spTransaction, 
  spBatch, 
  spIsInTransaction, 
  spIsInBatch,
  spGetModifiedSignals,
  spIsTransactionActive
} from './transactions';