import { spCollection } from './collection';

type Item = { id: string; title?: string } & Record<string, unknown>;

describe('spCollection gap behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should fall back to the initial value when persisted JSON is not an array', () => {
    localStorage.setItem('col-key', JSON.stringify({ nope: true }));
    const col = spCollection<Item>({
      idField: 'id',
      persist: 'col-key',
      initialValue: [{ id: '1' }],
    });
    expect(col.value().length).toBe(1);
  });

  it('should fall back to an empty list when persisted JSON is not an array and no initial value exists', () => {
    localStorage.setItem('col-key', JSON.stringify(5));
    const col = spCollection<Item>({ idField: 'id', persist: 'col-key' });
    expect(col.value().length).toBe(0);
  });

  it('should fall back to the initial value when persisted JSON is invalid', () => {
    localStorage.setItem('col-key', '{invalid');
    const col = spCollection<Item>({
      idField: 'id',
      persist: 'col-key',
      initialValue: [{ id: '1' }],
    });
    expect(col.value().length).toBe(1);
  });

  it('should fall back to an empty list when persisted JSON is invalid and no initial value exists', () => {
    localStorage.setItem('col-key', '{invalid');
    const col = spCollection<Item>({ idField: 'id', persist: 'col-key' });
    expect(col.value().length).toBe(0);
  });

  it('should return false when the target id no longer exists in the items array', () => {
    const col = spCollection<Item>({
      idField: 'id',
      initialValue: [{ id: '1', title: 'a' }],
    });

    expect(col.update('1', { id: '2' })).toBe(true);
    expect(col.update('1', { title: 'b' })).toBe(false);
  });

  it('should report undo and redo as unavailable without history', () => {
    const col = spCollection<Item>({ idField: 'id' });
    expect(col.canUndo()).toBe(false);
    expect(col.canRedo()).toBe(false);
  });
});
