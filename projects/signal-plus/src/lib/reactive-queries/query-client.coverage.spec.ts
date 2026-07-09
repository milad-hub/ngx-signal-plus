import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import {
  QueryClient,
  getGlobalQueryClient,
  setGlobalQueryClient,
} from './query-client';

describe('QueryClient gap behavior', () => {
  it('should serve seeded data through the synthetic query function', fakeAsync(() => {
    const client = new QueryClient();
    client.setQueryData(['seed'], 5);

    client.refetchQueries(['seed']);
    flushMicrotasks();

    expect(client.getQueryData(['seed'])).toBe(5);
  }));

  it('should invalidate all queries through resetQueries', () => {
    const client = new QueryClient();
    client.setQueryData(['a'], 1);

    client.resetQueries();
    expect(client.getQueryState(['a'])?.isStale).toBe(true);
  });

  it('should merge default options', () => {
    const client = new QueryClient();
    client.setDefaultOptions({ staleTime: 123 });
    expect(client.getDefaultOptions().staleTime).toBe(123);
  });

  it('should cancel all queries when no key is given', () => {
    const client = new QueryClient();
    client.setQueryData(['c1'], 1);
    client.setQueryData(['c2'], 2);
    expect(() => client.cancelQueries()).not.toThrow();
  });

  it('should create the global client on first access', () => {
    const previous = getGlobalQueryClient();
    setGlobalQueryClient(null as never);

    const created = getGlobalQueryClient();
    expect(created instanceof QueryClient).toBe(true);

    setGlobalQueryClient(previous);
  });
});
