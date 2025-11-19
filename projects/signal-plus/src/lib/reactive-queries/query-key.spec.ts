import { createQueryKey, hashQueryKey, isQueryKeyEqual } from './query-key';

describe('QueryKey utilities', () => {
  describe('hashQueryKey', () => {
    it('should hash array query key', () => {
      const key = ['users', '1'];
      const hash = hashQueryKey(key);
      expect(hash).toBe('["users","1"]');
    });

    it('should hash object query key', () => {
      const key = { key: ['users', '1'] };
      const hash = hashQueryKey(key);
      expect(hash).toBe('["users","1"]');
    });

    it('should hash empty array', () => {
      const key: string[] = [];
      const hash = hashQueryKey(key);
      expect(hash).toBe('[]');
    });

    it('should hash complex keys', () => {
      const key = ['users', '1', 'posts'];
      const hash = hashQueryKey(key);
      expect(hash).toBe('["users","1","posts"]');
    });
  });

  describe('isQueryKeyEqual', () => {
    it('should return true for identical array keys', () => {
      const key1 = ['users', '1'];
      const key2 = ['users', '1'];
      expect(isQueryKeyEqual(key1, key2)).toBe(true);
    });

    it('should return false for different array keys', () => {
      const key1 = ['users', '1'];
      const key2 = ['users', '2'];
      expect(isQueryKeyEqual(key1, key2)).toBe(false);
    });

    it('should return false for different length keys', () => {
      const key1 = ['users', '1'];
      const key2 = ['users'];
      expect(isQueryKeyEqual(key1, key2)).toBe(false);
    });

    it('should handle empty arrays', () => {
      const key1: string[] = [];
      const key2: string[] = [];
      expect(isQueryKeyEqual(key1, key2)).toBe(true);
    });

    it('should handle object query keys', () => {
      const key1 = { key: ['users', '1'] };
      const key2 = { key: ['users', '1'] };
      expect(isQueryKeyEqual(key1, key2)).toBe(true);
    });

    it('should handle mixed array and object keys', () => {
      const key1 = ['users', '1'];
      const key2 = { key: ['users', '1'] };
      expect(isQueryKeyEqual(key1, key2)).toBe(true);
    });

    it('should return false for different object keys', () => {
      const key1 = { key: ['users', '1'] };
      const key2 = { key: ['users', '2'] };
      expect(isQueryKeyEqual(key1, key2)).toBe(false);
    });
  });

  describe('createQueryKey', () => {
    it('should create query key from string', () => {
      const key = 'users';
      const queryKey = createQueryKey(key);
      expect(queryKey).toEqual({ key: ['users'] });
    });

    it('should create query key from string array', () => {
      const key = ['users', '1', 'posts'];
      const queryKey = createQueryKey(key);
      expect(queryKey).toEqual({ key: ['users', '1', 'posts'] });
    });

    it('should handle empty array', () => {
      const key: string[] = [];
      const queryKey = createQueryKey(key);
      expect(queryKey).toEqual({ key: [] });
    });

    it('should handle single item array', () => {
      const key = ['single'];
      const queryKey = createQueryKey(key);
      expect(queryKey).toEqual({ key: ['single'] });
    });
  });
});