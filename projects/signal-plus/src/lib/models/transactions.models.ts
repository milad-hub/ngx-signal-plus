import { SignalPlus } from './signal-plus.model';

export interface TransactionContext {
  active: boolean;
  originalValues: Map<SignalPlus<any>, any>;
  patchedSignals: Map<SignalPlus<any>, (value: any) => void>;
  modifiedSignals: SignalPlus<any>[];
}

export interface BatchContext {
  active: boolean;
  signals: Set<SignalPlus<any>>;
} 