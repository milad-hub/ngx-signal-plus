/**
 * @fileoverview Public API surface of ngx-signal-plus
 */

// Core functionality
export { SignalPlusService } from './lib/signal-plus.service';
export { SignalPlusComponent } from './lib/signal-plus.component';

// Models and interfaces
export type { SignalOptions, SignalPlus, SignalHistory, SignalState } from './lib/models/signal-plus.model';

// Operators with prefixed names to avoid conflicts
export {
    map as spMap,
    filter as spFilter,
    debounceTime as spDebounceTime,
    distinctUntilChanged as spDistinctUntilChanged,
    delay as spDelay,
    throttleTime as spThrottleTime,
    skip as spSkip,
    take as spTake,
    merge as spMerge,
    type SignalOperator
} from './lib/operators/signal-operators';

// Utilities with prefixed names
export {
    signalWithHistory as spWithHistory,
    persistentSignal as spPersistent,
    memoized as spMemoized,
    batchSignal as spBatch,
    validatedSignal as spValidated,
    asyncSignal as spAsync,
    cleanupSignal as spCleanup,
    debouncedSignal as spDebounced,
    throttledSignal as spThrottled
} from './lib/utils/signal-utils';

// Managers
export { HistoryManager } from './lib/managers/history-manager';