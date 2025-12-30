import { QueryKey } from './query-types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hashQueryKey(queryKey: QueryKey | any[]): string {
  const key = Array.isArray(queryKey) ? queryKey : queryKey.key;
  return JSON.stringify(key, (_, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = value[key];
            return sorted;
          },
          {} as Record<string, unknown>,
        );
    }
    return value;
  });
}

export function isQueryKeyEqual(
  a: QueryKey | unknown[],
  b: QueryKey | unknown[],
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
