import { SignalPlus, SignalTransactionSnapshot } from './signal-plus.model';

export interface TransactionContext {
  active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalValues: Map<SignalPlus<any>, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patchedSignals: Map<SignalPlus<any>, (value: any) => void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifiedSignals: SignalPlus<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifiedSet: Set<SignalPlus<any>>;
}

export interface BatchContext {
  active: boolean;
  flushing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signals: Set<SignalPlus<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pending: Map<SignalPlus<any>, PendingBatchNotification<any>>;
}

/**
 * A signal's latest pending notification, delivered once when the batch exits
 */
export interface PendingBatchNotification<T> {
  value: T;
  deliver: (value: T) => void;
}

/**
 * The transaction context as a scope stores it, with the rollback bookkeeping
 */
export interface ScopedTransactionContext extends TransactionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshots: Map<SignalPlus<any>, SignalTransactionSnapshot<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attemptedValues: Map<SignalPlus<any>, any>;
  startTime: Date | null;
}
