import { QueryKey } from './query-types';

export function hashQueryKey(queryKey: QueryKey | string[]): string {
  const key = Array.isArray(queryKey) ? queryKey : queryKey.key;
  return JSON.stringify(key);
}

export function isQueryKeyEqual(
  a: QueryKey | string[],
  b: QueryKey | string[],
): boolean {
  const keyA = Array.isArray(a) ? a : a.key;
  const keyB = Array.isArray(b) ? b : b.key;

  if (keyA.length !== keyB.length) return false;

  for (let i = 0; i < keyA.length; i++) {
    if (keyA[i] !== keyB[i]) return false;
  }

  return true;
}

export function createQueryKey(key: string | string[]): QueryKey {
  const keyArray = Array.isArray(key) ? key : [key];
  return { key: keyArray };
}