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

  it('keeps the enhanced signal and its native source in sync both ways', () => {
    const app = createApp();

    app.nativeSource.set(4);
    expect(app.enhancedNative.value).toBe(4);

    app.enhancedNative.setValue(9);
    expect(app.nativeSource()).toBe(9);
  });

  it('notifies cart subscribers once per batched add', () => {
    const app = createApp();
    const seen: number[] = [];
    app.cart.subscribe((items) => seen.push(items.length));
    seen.length = 0;

    app.addCartItem();

    expect(seen.length).toBe(1);
    expect(app.cartCount()).toBeGreaterThan(0);
  });

  it('restores every field when a profile transaction fails', () => {
    const app = createApp();
    const name = app.name.value;
    const email = app.email.value;
    const age = app.age.value;

    app.updateProfile('Valid Name', 'not-an-email', 30);

    expect(app.name.value).toBe(name);
    expect(app.email.value).toBe(email);
    expect(app.age.value).toBe(age);
  });

  it('reports the counter as tracked once written in a transaction', () => {
    const app = createApp();

    app.runIntrospectedTransaction();

    expect(app.transactionInfo()).toContain('counter in transaction: true');
    expect(app.transactionInfo()).toContain('modified signals: 1');
  });

  it('loads deterministic async state', async () => {
    const app = createApp();

    await app.asyncMessage.refetch();

    expect(app.asyncMessage.data()).toBe(
      'Loaded from a deterministic local mock',
    );
  });
});
