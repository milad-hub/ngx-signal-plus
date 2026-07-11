import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('examples application logic', () => {
  const createApp = (): App => TestBed.runInInjectionContext(() => new App());

  it('rejects a counter value below zero', () => {
    const app = createApp();

    expect(() => app.counter.setValue(-1)).toThrow();
  });

  it('updates todo collections', () => {
    const app = createApp();

    app.addTodo('Write an example');

    expect(app.todos.count()).toBeGreaterThan(0);
  });

  it('tracks cart totals', () => {
    const app = createApp();

    app.addCartItem();

    expect(app.cartCount()).toBeGreaterThan(0);
    expect(app.cartSubtotal()).toBeGreaterThan(0);
  });

  it('loads deterministic async state', async () => {
    const app = createApp();

    await app.asyncMessage.refetch();

    expect(app.asyncMessage.data()).toBe(
      'Loaded from a deterministic local mock',
    );
  });
});
