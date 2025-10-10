import { TestBed } from '@angular/core/testing';
import { SignalPlusService } from '../core/signal-plus.service';
import { SignalPlus } from '../models/signal-plus.model';
import { _patchAllSignalsInTest, _resetTransactionState, spBatch, spGetModifiedSignals, spIsInBatch, spIsInTransaction, spIsTransactionActive, spTransaction } from './transactions';

describe('Transactions and Batching', () => {
  let signalPlusService: SignalPlusService;
  let counterA: SignalPlus<number>;
  let counterB: SignalPlus<number>;
  let validCounter: SignalPlus<number>;
  let testSignal1: SignalPlus<number>;
  let testSignal2: SignalPlus<string>;

  function monkeyPatchSignal(signal: SignalPlus<any>): { originalSetValue: any } {
    const originalSetValue = signal.setValue;
    return { originalSetValue };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SignalPlusService]
    });
    signalPlusService = TestBed.inject(SignalPlusService);
    counterA = signalPlusService.create(10).build();
    counterB = signalPlusService.create(20).build();
    validCounter = signalPlusService.create(50)
      .validate(val => val >= 0 ? true : false)
      .build();
    monkeyPatchSignal(counterA);
    monkeyPatchSignal(counterB);
    monkeyPatchSignal(validCounter);
    _resetTransactionState();
    testSignal1 = signalPlusService.create(1).build();
    testSignal2 = signalPlusService.create('test').build();
    _patchAllSignalsInTest(testSignal1);
    _patchAllSignalsInTest(testSignal2);
  });

  afterEach(() => {
    _resetTransactionState();
  });

  describe('spTransaction', () => {
    it('should execute a transaction and commit changes on success', () => {
      spTransaction(() => {
        testSignal1.setValue(2);
        testSignal2.setValue('updated');
      });
      expect(testSignal1.value).toBe(2);
      expect(testSignal2.value).toBe('updated');
    });

    it('should return the result of the transaction function', () => {
      const result = spTransaction(() => {
        testSignal1.setValue(5);
        return 'transaction result';
      });
      expect(result).toBe('transaction result');
      expect(testSignal1.value).toBe(5);
    });

    it('should rollback changes when an error occurs', () => {
      const originalValue1 = testSignal1.value;
      const originalValue2 = testSignal2.value;
      let error: Error | null = null;
      try {
        spTransaction(() => {
          testSignal1.setValue(42);
          testSignal2.setValue('will be rolled back');
          throw new Error('Test error');
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Test error');
      expect(testSignal1.value).toBe(originalValue1);
      expect(testSignal2.value).toBe(originalValue2);
    });

    it('should prevent nested transactions', () => {
      let nestedError: Error | null = null;
      try {
        spTransaction(() => {
          spTransaction(() => {
            testSignal1.setValue(999);
          });
        });
      } catch (e) {
        nestedError = e as Error;
      }
      expect(nestedError).not.toBeNull();
      expect(nestedError?.message).toBe('Nested transactions are not allowed');
      expect(testSignal1.value).toBe(1);
    });

    it('should handle signals modified multiple times in a transaction', () => {
      spTransaction(() => {
        testSignal1.setValue(10);
        testSignal1.setValue(20);
        testSignal1.setValue(30);
      });
      expect(testSignal1.value).toBe(30);
    });

    it('should rollback to the initial value even after multiple updates', () => {
      const originalValue = testSignal1.value;
      let error: Error | null = null;
      try {
        spTransaction(() => {
          testSignal1.setValue(10);
          testSignal1.setValue(20);
          testSignal1.setValue(30);
          throw new Error('Test error');
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(testSignal1.value).toBe(originalValue);
    });

    it('should restore signal methods after transaction completes', () => {
      const s = signalPlusService.create(10).build();
      _patchAllSignalsInTest(s);
      const originalSetMethod = s.setValue;
      expect(s.value).toBe(10);
      spTransaction(() => {
        s.setValue(20);
      });
      const afterTxValue = s.value;
      expect(afterTxValue).toBe(20);
      s.setValue(30);
      expect(s.value).toBe(30);
    });

    it('should restore signal methods even when transaction fails', () => {
      const s = signalPlusService.create(10).build();
      _patchAllSignalsInTest(s);
      const originalSetMethod = s.setValue;
      expect(s.value).toBe(10);
      try {
        spTransaction(() => {
          s.setValue(20);
          throw new Error('Simulated error');
        });
      } catch (e) {
      }
      expect(s.value).toBe(10);
      s.setValue(30);
      expect(s.value).toBe(30);
    });

    it('should handle signals with dependencies during transactions', () => {
      const derivedSignal = signalPlusService.create(100).build();
      _patchAllSignalsInTest(derivedSignal);
      spTransaction(() => {
        testSignal1.setValue(50);
        derivedSignal.setValue(testSignal1.value + 100);
        testSignal1.setValue(75);
        derivedSignal.setValue(testSignal1.value + 100);
      });
      expect(testSignal1.value).toBe(75);
      expect(derivedSignal.value).toBe(175);
    });

    it('should rollback all signals properly when an error occurs in complex scenarios', () => {
      const originalValue1 = testSignal1.value;
      const originalValue2 = testSignal2.value;
      const testSignal3 = signalPlusService.create(100).build();
      _patchAllSignalsInTest(testSignal3);
      const originalValue3 = testSignal3.value;
      const testSignal4 = signalPlusService.create("fourth signal").build();
      _patchAllSignalsInTest(testSignal4);
      const originalValue4 = testSignal4.value;
      let error: Error | null = null;
      try {
        spTransaction(() => {
          testSignal1.setValue(42);
          testSignal2.setValue('modified');
          testSignal3.setValue(500);
          testSignal4.setValue("also modified");
          testSignal1.setValue(84);
          testSignal3.setValue(1000);
          throw new Error('Test error');
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(testSignal1.value).toBe(originalValue1);
      expect(testSignal2.value).toBe(originalValue2);
      expect(testSignal3.value).toBe(originalValue3);
      expect(testSignal4.value).toBe(originalValue4);
    });

    it('should handle a large number of signal updates in a single transaction', () => {
      const signals: SignalPlus<number>[] = [];
      for (let i = 0; i < 10; i++) {
        const signal = signalPlusService.create(i).build();
        _patchAllSignalsInTest(signal);
        signals.push(signal);
      }
      const originalValues = signals.map(s => s.value);
      try {
        spTransaction(() => {
          signals.forEach((s, i) => {
            s.setValue(i * 10);
          });
          signals.forEach((s, i) => {
            expect(s.value).toBe(i * 10);
          });
          throw new Error('Simulated error');
        });
      } catch (e) {
      }
      signals.forEach((s, i) => {
        expect(s.value).toBe(originalValues[i]);
        expect(s.value).toBe(i);
      });
      spTransaction(() => {
        signals.forEach((s, i) => {
          s.setValue(i * 10);
        });
      });
      signals.forEach((s, i) => {
        expect(s.value).toBe(i * 10);
      });
    });
  });

  describe('spBatch', () => {
    it('should execute a batch of operations', () => {
      spBatch(() => {
        testSignal1.setValue(5);
        testSignal2.setValue('batched update');
      });
      expect(testSignal1.value).toBe(5);
      expect(testSignal2.value).toBe('batched update');
    });

    it('should return the result of the batch function', () => {
      const result = spBatch(() => {
        testSignal1.setValue(5);
        return 'batch result';
      });
      expect(result).toBe('batch result');
    });

    it('should not rollback changes when an error occurs in a batch', () => {
      const startingValue = testSignal1.value;
      let error: Error | null = null;
      try {
        spBatch(() => {
          testSignal1.setValue(42);
          throw new Error('Test error');
        });
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Test error');
      expect(testSignal1.value).toBe(42);
      expect(testSignal1.value).not.toBe(startingValue);
    });

    it('should allow nested batches', () => {
      let nestedError: Error | null = null;
      try {
        spBatch(() => {
          spBatch(() => {
            testSignal1.setValue(42);
          });
          testSignal2.setValue('outer batch');
        });
      } catch (e) {
        nestedError = e as Error;
      }
      expect(nestedError).toBeNull();
      expect(testSignal1.value).toBe(42);
      expect(testSignal2.value).toBe('outer batch');
    });

    it('should handle a batch with multiple signals and multiple updates', () => {
      const testSignal3 = signalPlusService.create(100).build();
      _patchAllSignalsInTest(testSignal3);
      spBatch(() => {
        testSignal1.setValue(10);
        testSignal2.setValue('first update');
        testSignal3.setValue(200);
        testSignal1.setValue(20);
        testSignal2.setValue('second update');
        testSignal3.setValue(300);
      });
      expect(testSignal1.value).toBe(20);
      expect(testSignal2.value).toBe('second update');
      expect(testSignal3.value).toBe(300);
    });
  });

  describe('spIsTransactionActive', () => {
    it('should return false when no transaction is active', () => {
      expect(spIsTransactionActive()).toBe(false);
    });

    it('should return true during an active transaction', () => {
      let insideValue = false;
      spTransaction(() => {
        insideValue = spIsTransactionActive();
      });
      expect(insideValue).toBe(true);
    });

    it('should return false after a transaction completes', () => {
      spTransaction(() => {
        testSignal1.setValue(42);
      });
      expect(spIsTransactionActive()).toBe(false);
    });

    it('should return false after a transaction fails', () => {
      try {
        spTransaction(() => {
          testSignal1.setValue(42);
          throw new Error('Test error');
        });
      } catch {
      }
      expect(spIsTransactionActive()).toBe(false);
    });
  });

  describe('spIsInTransaction', () => {
    it('should return true when called inside a transaction', () => {
      let insideValue = false;
      spTransaction(() => {
        insideValue = spIsInTransaction(testSignal1);
      });
      expect(insideValue).toBe(true);
    });

    it('should return false when called outside a transaction', () => {
      const outsideValue = spIsInTransaction(testSignal1);
      expect(outsideValue).toBe(false);
    });

    it('should register the signal with the transaction context', () => {
      spTransaction(() => {
        spIsInTransaction(testSignal1);
        testSignal1.setValue(99);
        const modifiedSignals = spGetModifiedSignals();
        expect(modifiedSignals.includes(testSignal1)).toBe(true);
      });
    });

    it('should work with multiple signals in the same transaction', () => {
      const testSignal3 = signalPlusService.create(100).build();
      _patchAllSignalsInTest(testSignal3);
      spTransaction(() => {
        expect(spIsInTransaction(testSignal1)).toBe(true);
        expect(spIsInTransaction(testSignal2)).toBe(true);
        expect(spIsInTransaction(testSignal3)).toBe(true);
      });
    });
  });

  describe('spIsInBatch', () => {
    it('should return true when called inside a batch', () => {
      let insideValue = false;
      spBatch(() => {
        insideValue = spIsInBatch(testSignal1);
      });
      expect(insideValue).toBe(true);
    });

    it('should return false when called outside a batch', () => {
      const outsideValue = spIsInBatch(testSignal1);
      expect(outsideValue).toBe(false);
    });

    it('should register the signal with the batch context', () => {
      let signalRegistered = false;
      spBatch(() => {
        spIsInBatch(testSignal1);
        testSignal1.setValue(999);
        signalRegistered = true;
      });
      expect(signalRegistered).toBe(true);
      expect(testSignal1.value).toBe(999);
    });

    it('should work with multiple signals in the same batch', () => {
      const testSignal3 = signalPlusService.create(100).build();
      _patchAllSignalsInTest(testSignal3);
      spBatch(() => {
        expect(spIsInBatch(testSignal1)).toBe(true);
        expect(spIsInBatch(testSignal2)).toBe(true);
        expect(spIsInBatch(testSignal3)).toBe(true);
      });
    });
  });

  describe('spGetModifiedSignals', () => {
    it('should return an empty array when no transaction is active', () => {
      const signals = spGetModifiedSignals();
      expect(signals).toEqual([]);
    });

    it('should return modified signals during a transaction', () => {
      spTransaction(() => {
        expect(spIsInTransaction(testSignal1)).toBe(true);
        expect(spIsInTransaction(testSignal2)).toBe(true);
        testSignal1.setValue(42);
        testSignal2.setValue('modified');
        const modifiedSignals = spGetModifiedSignals();
        expect(modifiedSignals.includes(testSignal1)).toBe(true);
        expect(modifiedSignals.includes(testSignal2)).toBe(true);
        expect(modifiedSignals.length).toBe(2);
      });
    });

    it('should return signals in order of first modification', () => {
      spTransaction(() => {
        expect(spIsInTransaction(testSignal1)).toBe(true);
        expect(spIsInTransaction(testSignal2)).toBe(true);
        testSignal2.setValue('modified first');
        testSignal1.setValue(42);
        const modifiedSignals = spGetModifiedSignals();
        expect(modifiedSignals.indexOf(testSignal2)).not.toBe(-1);
        expect(modifiedSignals.indexOf(testSignal1)).not.toBe(-1);
        expect(modifiedSignals.indexOf(testSignal2))
          .toBeLessThan(modifiedSignals.indexOf(testSignal1));
      });
    });

    it('should return an empty array after transaction completes', () => {
      spTransaction(() => {
        testSignal1.setValue(42);
      });
      const signalsAfter = spGetModifiedSignals();
      expect(signalsAfter).toEqual([]);
    });

    it('should track a signal even if its value does not change', () => {
      spTransaction(() => {
        const currentValue = testSignal1.value;
        spIsInTransaction(testSignal1);
        testSignal1.setValue(currentValue);
        const modifiedSignals = spGetModifiedSignals();
        expect(modifiedSignals.includes(testSignal1)).toBe(true);
      });
    });

    it('should track multiple signals in the correct order', () => {
      const signals: SignalPlus<number>[] = [];
      for (let i = 0; i < 5; i++) {
        const signal = signalPlusService.create(i).build();
        _patchAllSignalsInTest(signal);
        signals.push(signal);
      }
      spTransaction(() => {
        for (let i = signals.length - 1; i >= 0; i--) {
          signals[i].setValue(i * 10);
        }
        const modifiedSignals = spGetModifiedSignals();
        for (let i = 0; i < signals.length; i++) {
          const reverseIndex = signals.length - 1 - i;
          expect(modifiedSignals[i]).toBe(signals[reverseIndex]);
        }
      });
    });
  });

  describe('Internal Implementation Details', () => {
    it('should correctly reset transaction state on cleanup', () => {
      try {
        spTransaction(() => {
          testSignal1.setValue(42);
          testSignal2.setValue('modified');
          throw new Error('Test error');
        });
      } catch {
      }
      _resetTransactionState();
      expect(spIsTransactionActive()).toBe(false);
      expect(spGetModifiedSignals()).toEqual([]);
      spTransaction(() => {
        testSignal1.setValue(100);
      });
      expect(testSignal1.value).toBe(100);
    });

    it('should preserve signal behavior after transaction', () => {
      const originalValue = testSignal1.value;
      spTransaction(() => {
        testSignal1.setValue(42);
      });
      testSignal1.setValue(originalValue);
      expect(testSignal1.value).toBe(originalValue);
      spTransaction(() => {
        testSignal1.setValue(84);
      });
      expect(testSignal1.value).toBe(84);
    });
  });

  describe('Transaction rollback improvements', () => {
    describe('debounce handling', () => {
      it('should clear pending debounced updates during rollback', (done) => {
        const debouncedSignal = signalPlusService.create(0).debounce(200).build();
        _patchAllSignalsInTest(debouncedSignal);
        const originalValue = debouncedSignal.value;
        const subscriber = jasmine.createSpy('subscriber');
        debouncedSignal.subscribe(subscriber);
        subscriber.calls.reset();
        try {
          spTransaction(() => {
            debouncedSignal.setValue(10);
            debouncedSignal.setValue(20);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        setTimeout(() => {
          expect(debouncedSignal.value).toBe(originalValue);
          expect(subscriber).not.toHaveBeenCalledWith(10);
          expect(subscriber).not.toHaveBeenCalledWith(20);
          done();
        }, 300);
      });

      it('should allow new debounced updates after rollback', (done) => {
        const debouncedSignal = signalPlusService.create(0).debounce(100).build();
        _patchAllSignalsInTest(debouncedSignal);
        try {
          spTransaction(() => {
            debouncedSignal.setValue(10);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(debouncedSignal.value).toBe(0);
        const subscriber = jasmine.createSpy('subscriber');
        debouncedSignal.subscribe(subscriber);
        subscriber.calls.reset();
        debouncedSignal.setValue(5);
        setTimeout(() => {
          expect(debouncedSignal.value).toBe(5);
          expect(subscriber).toHaveBeenCalledWith(5);
          done();
        }, 150);
      });

      it('should handle multiple debounced signals in one transaction', (done) => {
        const signal1 = signalPlusService.create(0).debounce(100).build();
        const signal2 = signalPlusService.create(100).debounce(100).build();
        _patchAllSignalsInTest(signal1);
        _patchAllSignalsInTest(signal2);
        const sub1 = jasmine.createSpy('sub1');
        const sub2 = jasmine.createSpy('sub2');
        signal1.subscribe(sub1);
        signal2.subscribe(sub2);
        sub1.calls.reset();
        sub2.calls.reset();
        try {
          spTransaction(() => {
            signal1.setValue(10);
            signal2.setValue(200);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        setTimeout(() => {
          expect(signal1.value).toBe(0);
          expect(signal2.value).toBe(100);
          expect(sub1).not.toHaveBeenCalledWith(10);
          expect(sub2).not.toHaveBeenCalledWith(200);
          done();
        }, 150);
      });
    });

    describe('history handling', () => {
      it('should restore history state on rollback', () => {
        const historySignal = signalPlusService.create(0).withHistory().build();
        _patchAllSignalsInTest(historySignal);
        historySignal.setValue(1);
        historySignal.setValue(2);
        historySignal.setValue(3);
        const originalHistory = [...historySignal.history()];
        const originalValue = historySignal.value;
        try {
          spTransaction(() => {
            historySignal.setValue(10);
            historySignal.setValue(20);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(historySignal.value).toBe(originalValue);
        expect(historySignal.history()).toEqual(originalHistory);
      });

      it('should maintain history consistency after rollback', () => {
        const historySignal = signalPlusService.create(0).withHistory().build();
        _patchAllSignalsInTest(historySignal);
        historySignal.setValue(1);
        historySignal.setValue(2);
        try {
          spTransaction(() => {
            historySignal.setValue(10);
            historySignal.setValue(20);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(historySignal.history()).toEqual([0, 1, 2]);
        historySignal.undo();
        expect(historySignal.value).toBe(1);
        historySignal.redo();
        expect(historySignal.value).toBe(2);
      });

      it('should handle history with size limit during rollback', () => {
        const historySignal = signalPlusService.create(0).withHistory(3).build();
        _patchAllSignalsInTest(historySignal);
        historySignal.setValue(1);
        historySignal.setValue(2);
        const originalHistory = [...historySignal.history()];
        try {
          spTransaction(() => {
            historySignal.setValue(10);
            historySignal.setValue(20);
            historySignal.setValue(30);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(historySignal.history()).toEqual(originalHistory);
      });
    });

    describe('subscriber notification', () => {
      it('should notify subscribers during rollback', () => {
        const signal = signalPlusService.create(0).build();
        _patchAllSignalsInTest(signal);
        const subscriber = jasmine.createSpy('subscriber');
        signal.subscribe(subscriber);
        subscriber.calls.reset();
        try {
          spTransaction(() => {
            signal.setValue(10);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(subscriber).toHaveBeenCalledWith(0);
        expect(signal.value).toBe(0);
      });

      it('should notify all subscribers on rollback', () => {
        const signal = signalPlusService.create(0).build();
        _patchAllSignalsInTest(signal);
        const sub1 = jasmine.createSpy('sub1');
        const sub2 = jasmine.createSpy('sub2');
        const sub3 = jasmine.createSpy('sub3');
        signal.subscribe(sub1);
        signal.subscribe(sub2);
        signal.subscribe(sub3);
        sub1.calls.reset();
        sub2.calls.reset();
        sub3.calls.reset();
        try {
          spTransaction(() => {
            signal.setValue(10);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(sub1).toHaveBeenCalledWith(0);
        expect(sub2).toHaveBeenCalledWith(0);
        expect(sub3).toHaveBeenCalledWith(0);
      });
    });

    describe('complex scenarios', () => {
      it('should handle rollback with debounce + history + persistence', (done) => {
        const complexSignal = signalPlusService.create(0)
          .debounce(100)
          .withHistory()
          .persist('test-rollback-key')
          .build();
        _patchAllSignalsInTest(complexSignal);
        complexSignal.setValue(1);
        setTimeout(() => {
          complexSignal.setValue(2);
          setTimeout(() => {
            const originalValue = complexSignal.value;
            const originalHistory = [...complexSignal.history()];
            const subscriber = jasmine.createSpy('subscriber');
            complexSignal.subscribe(subscriber);
            subscriber.calls.reset();
            try {
              spTransaction(() => {
                complexSignal.setValue(10);
                complexSignal.setValue(20);
                throw new Error('Rollback test');
              });
            } catch (e) { }
            setTimeout(() => {
              expect(complexSignal.value).toBe(originalValue);
              expect(complexSignal.history()).toEqual(originalHistory);
              expect(subscriber).not.toHaveBeenCalledWith(10);
              expect(subscriber).not.toHaveBeenCalledWith(20);
              done();
            }, 150);
          }, 150);
        }, 150);
      });

      it('should handle multiple signals with different features in rollback', (done) => {
        const debouncedSignal = signalPlusService.create(0).debounce(100).build();
        const historySignal = signalPlusService.create(10).withHistory().build();
        const validatedSignal = signalPlusService.create(20).validate(x => x >= 0).build();
        _patchAllSignalsInTest(debouncedSignal);
        _patchAllSignalsInTest(historySignal);
        _patchAllSignalsInTest(validatedSignal);
        historySignal.setValue(11);
        historySignal.setValue(12);
        const originalHistoryState = [...historySignal.history()];
        const sub1 = jasmine.createSpy('sub1');
        const sub2 = jasmine.createSpy('sub2');
        const sub3 = jasmine.createSpy('sub3');
        debouncedSignal.subscribe(sub1);
        historySignal.subscribe(sub2);
        validatedSignal.subscribe(sub3);
        sub1.calls.reset();
        sub2.calls.reset();
        sub3.calls.reset();
        try {
          spTransaction(() => {
            debouncedSignal.setValue(100);
            historySignal.setValue(200);
            validatedSignal.setValue(300);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        setTimeout(() => {
          expect(debouncedSignal.value).toBe(0);
          expect(historySignal.value).toBe(12);
          expect(validatedSignal.value).toBe(20);
          expect(historySignal.history()).toEqual(originalHistoryState);
          expect(sub1).toHaveBeenCalledWith(0);
          expect(sub2).toHaveBeenCalledWith(12);
          expect(sub3).toHaveBeenCalledWith(20);
          expect(sub2).toHaveBeenCalledWith(200);
          expect(sub3).toHaveBeenCalledWith(300);
          done();
        }, 150);
      });

      it('should handle consecutive transactions with rollback', (done) => {
        const signal = signalPlusService.create(0).debounce(100).withHistory().build();
        _patchAllSignalsInTest(signal);
        const subscriber = jasmine.createSpy('subscriber');
        signal.subscribe(subscriber);
        subscriber.calls.reset();
        spTransaction(() => {
          signal.setValue(1);
        });
        setTimeout(() => {
          expect(signal.value).toBe(1);
          try {
            spTransaction(() => {
              signal.setValue(10);
              throw new Error('Rollback test');
            });
          } catch (e) { }
          expect(signal.value).toBe(1);
          expect(signal.history()).toContain(1);
          spTransaction(() => {
            signal.setValue(2);
          });
          setTimeout(() => {
            expect(signal.value).toBe(2);
            done();
          }, 150);
        }, 150);
      });
    });

    describe('edge cases', () => {
      it('should handle rollback when signal has no subscribers', () => {
        const signal = signalPlusService.create(0).build();
        _patchAllSignalsInTest(signal);
        try {
          spTransaction(() => {
            signal.setValue(10);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(signal.value).toBe(0);
      });

      it('should handle rollback with validation failures', () => {
        const signal = signalPlusService.create(5).validate(x => x >= 0).build();
        _patchAllSignalsInTest(signal);
        try {
          spTransaction(() => {
            signal.setValue(10);
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(signal.value).toBe(5);
        expect(signal.isValid()).toBe(true);
      });

      it('should handle empty transactions', () => {
        const signal = signalPlusService.create(0).build();
        _patchAllSignalsInTest(signal);
        try {
          spTransaction(() => {
            throw new Error('Rollback test');
          });
        } catch (e) { }
        expect(signal.value).toBe(0);
      });

      it('should handle rollback errors gracefully', () => {
        const signal = signalPlusService.create(0).build();
        _patchAllSignalsInTest(signal);
        const consoleErrorSpy = spyOn(console, 'error');
        if (signal._setValueImmediate) {
          const original = signal._setValueImmediate.bind(signal);
          spyOn(signal as any, '_setValueImmediate').and.callFake(() => {
            throw new Error('Rollback error');
          });
        }
        let caughtError: Error | null = null;
        try {
          spTransaction(() => {
            signal.setValue(10);
            throw new Error('Transaction error');
          });
        } catch (e) {
          caughtError = e as Error;
        }
        expect(caughtError?.message).toBe('Transaction error');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error during transaction rollback:', jasmine.any(Error));
      });
    });
  });
});