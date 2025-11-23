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

  describe('hashQueryKey - Deterministic Hashing', () => {
    it('should produce same hash for objects with same keys in different order', () => {
      const key1 = ['user', { id: 1, name: 'John', age: 30 }];
      const key2 = ['user', { age: 30, name: 'John', id: 1 }];
      const key3 = ['user', { name: 'John', id: 1, age: 30 }];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      const hash3 = hashQueryKey(key3);
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1).toBe(hash3);
    });

    it('should produce different hash for objects with different values', () => {
      const key1 = ['user', { id: 1, name: 'John' }];
      const key2 = ['user', { id: 2, name: 'John' }];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested objects with different key orders', () => {
      const key1 = [
        'user',
        {
          profile: { age: 30, name: 'John' },
          settings: { theme: 'dark', lang: 'en' },
        },
      ];
      const key2 = [
        'user',
        {
          settings: { lang: 'en', theme: 'dark' },
          profile: { name: 'John', age: 30 },
        },
      ];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).toBe(hash2);
    });

    it('should handle arrays within objects', () => {
      const key1 = ['search', { filters: ['active', 'verified'], sort: 'asc' }];
      const key2 = ['search', { sort: 'asc', filters: ['active', 'verified'] }];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).toBe(hash2);
    });

    it('should differentiate between different nested structures', () => {
      const key1 = ['user', { data: { x: 1, y: 2 } }];
      const key2 = ['user', { data: { x: 2, y: 1 } }];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle complex mixed arrays and objects', () => {
      const key1 = [
        'posts',
        { page: 1, limit: 10 },
        ['tag1', 'tag2'],
        { author: { id: 5, verified: true } },
      ];
      const key2 = [
        'posts',
        { limit: 10, page: 1 },
        ['tag1', 'tag2'],
        { author: { verified: true, id: 5 } },
      ];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).toBe(hash2);
    });

    it('should maintain array order sensitivity', () => {
      const key1 = ['search', ['tag1', 'tag2']];
      const key2 = ['search', ['tag2', 'tag1']];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle null and undefined in objects', () => {
      const key1 = ['data', { a: null, b: undefined, c: 'value' }];
      const key2 = ['data', { c: 'value', b: undefined, a: null }];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).toBe(hash2);
    });

    it('should handle empty objects consistently', () => {
      const key1 = ['test', {}];
      const key2 = ['test', {}];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).toBe(hash2);
      expect(hash1).toBe('["test",{}]');
    });

    it('should handle objects with numeric keys', () => {
      const key1 = ['data', { 1: 'one', 2: 'two', 3: 'three' }];
      const key2 = ['data', { 3: 'three', 1: 'one', 2: 'two' }];
      const hash1 = hashQueryKey(key1);
      const hash2 = hashQueryKey(key2);
      expect(hash1).toBe(hash2);
    });
  });
});
