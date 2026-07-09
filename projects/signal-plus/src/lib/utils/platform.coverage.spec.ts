import {
  _setServerModeForTesting,
  hasLocalStorage,
  isBrowser,
  safeAddEventListener,
  safeClearTimeout,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  safeSetTimeout,
} from './platform';

describe('platform server-mode behavior', () => {
  afterEach(() => {
    _setServerModeForTesting(false);
  });

  it('should report non-browser environment when server mode is forced', () => {
    _setServerModeForTesting(true);
    expect(isBrowser()).toBe(false);
    expect(hasLocalStorage()).toBe(false);
  });

  it('should return null from safeLocalStorageGet outside the browser', () => {
    _setServerModeForTesting(true);
    expect(safeLocalStorageGet('any-key')).toBeNull();
  });

  it('should return false from safeLocalStorageSet outside the browser', () => {
    _setServerModeForTesting(true);
    expect(safeLocalStorageSet('any-key', 'value')).toBe(false);
  });

  it('should return false from safeLocalStorageRemove outside the browser', () => {
    _setServerModeForTesting(true);
    expect(safeLocalStorageRemove('any-key')).toBe(false);
  });

  it('should return undefined from safeSetTimeout outside the browser', () => {
    _setServerModeForTesting(true);
    const callback = jasmine.createSpy('callback');
    expect(safeSetTimeout(callback, 0)).toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should ignore safeClearTimeout outside the browser', () => {
    _setServerModeForTesting(true);
    expect(() => safeClearTimeout(123)).not.toThrow();
  });

  it('should return a no-op cleanup from safeAddEventListener outside the browser', () => {
    _setServerModeForTesting(true);
    const cleanup = safeAddEventListener('storage', () => undefined);
    expect(() => cleanup()).not.toThrow();
  });
});

describe('platform storage error behavior', () => {
  it('should return null when localStorage.getItem throws', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('denied');
    expect(safeLocalStorageGet('key')).toBeNull();
  });

  it('should return false when localStorage.removeItem throws for real keys', () => {
    spyOn(Storage.prototype, 'removeItem').and.callFake((key: string) => {
      if (key !== '__ngx_signal_plus_test__') {
        throw new Error('denied');
      }
    });
    expect(safeLocalStorageRemove('key')).toBe(false);
  });
});
