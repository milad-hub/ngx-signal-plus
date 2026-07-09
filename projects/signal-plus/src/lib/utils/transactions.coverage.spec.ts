import { SignalPlus } from '../models/signal-plus.model';
import {
  TransactionError,
  _patchAllSignalsInTest,
  _resetTransactionState,
  spBatch,
  spTransaction,
} from './transactions';

function makeFakeSignal(initial: number): SignalPlus<number> {
  let current = initial;
  const fake = {
    get value() {
      return current;
    },
    setValue(next: number) {
      current = next;
    },
  };
  return fake as unknown as SignalPlus<number>;
}

describe('transaction rollback gap behavior', () => {
  afterEach(() => {
    _resetTransactionState();
  });

  it('should report rollback failure when clearing pending operations throws', () => {
    spyOn(console, 'error');
    const fake = makeFakeSignal(0) as SignalPlus<number> & {
      _clearPendingOperations: () => void;
    };
    fake._clearPendingOperations = () => {
      throw new Error('clear-fail');
    };

    let caught: TransactionError | null = null;
    try {
      spTransaction(() => {
        _patchAllSignalsInTest(fake);
        fake.setValue(1);
        throw new Error('boom');
      });
    } catch (error) {
      caught = error as TransactionError;
    }

    expect(caught instanceof TransactionError).toBe(true);
    expect(caught?.rollbackSuccessful).toBe(false);
    expect(caught?.getSummary()).toContain('Rollback failed');
  });

  it('should roll back through setValue when no immediate setter exists', () => {
    const fake = makeFakeSignal(0);

    expect(() =>
      spTransaction(() => {
        _patchAllSignalsInTest(fake);
        fake.setValue(5);
        throw new Error('boom');
      }),
    ).toThrow();

    expect(fake.value).toBe(0);
  });

  it('should track signals patched during an active batch', () => {
    const fake = makeFakeSignal(0);
    const result = spBatch(() => {
      _patchAllSignalsInTest(fake);
      return 42;
    });
    expect(result).toBe(42);
  });
});
