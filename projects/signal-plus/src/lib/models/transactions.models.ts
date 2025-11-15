import { SignalPlus } from './signal-plus.model';

export interface TransactionContext {
  active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalValues: Map<SignalPlus<any>, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patchedSignals: Map<SignalPlus<any>, (value: any) => void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifiedSignals: SignalPlus<any>[];
}

export interface BatchContext {
  active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signals: Set<SignalPlus<any>>;
}
