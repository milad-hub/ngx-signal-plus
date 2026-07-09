import { _setServerModeForTesting } from '../utils/platform';
import { StorageManager } from './storage-manager';

describe('StorageManager gap behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    _setServerModeForTesting(false);
    localStorage.clear();
  });

  it('should log an error when the storage write is rejected', () => {
    const errorSpy = spyOn(console, 'error');
    spyOn(Storage.prototype, 'setItem').and.callFake((key: string) => {
      if (key !== '__ngx_signal_plus_test__') {
        throw new Error('quota');
      }
    });

    StorageManager.save('key', { a: 1 });
    expect(errorSpy).toHaveBeenCalledWith('Failed to save to localStorage');
  });

  it('should warn and skip saving outside the browser', () => {
    const warnSpy = spyOn(console, 'warn');
    _setServerModeForTesting(true);

    StorageManager.save('key', 1);
    expect(warnSpy).toHaveBeenCalledWith(
      'localStorage is not available (SSR or disabled)',
    );
  });

  it('should return undefined when loading with an invalid key', () => {
    spyOn(console, 'warn');
    expect(StorageManager.load('')).toBeUndefined();
  });

  it('should return undefined when loading outside the browser', () => {
    _setServerModeForTesting(true);
    expect(StorageManager.load('key')).toBeUndefined();
  });

  it('should skip removal for an invalid key', () => {
    const warnSpy = spyOn(console, 'warn');
    StorageManager.remove('');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should skip removal outside the browser', () => {
    localStorage.setItem('ngx-signal-plus:key', '1');
    _setServerModeForTesting(true);
    StorageManager.remove('key');
    _setServerModeForTesting(false);
    expect(localStorage.getItem('ngx-signal-plus:key')).toBe('1');
  });
});
