import { spCollection } from './collection';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

describe('spCollection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should create collection with empty array', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      expect(todos.value()).toEqual([]);
      expect(todos.count()).toBe(0);
      expect(todos.isEmpty()).toBe(true);
    });

    it('should create collection with initial values', () => {
      const initialTodos: Todo[] = [
        { id: '1', title: 'Todo 1', completed: false },
        { id: '2', title: 'Todo 2', completed: true },
      ];
      const todos = spCollection<Todo>({
        idField: 'id',
        initialValue: initialTodos,
      });
      expect(todos.value()).toEqual(initialTodos);
      expect(todos.count()).toBe(2);
      expect(todos.isEmpty()).toBe(false);
    });

    it('should load from localStorage when persist key is provided', () => {
      const storedTodos: Todo[] = [
        { id: '1', title: 'Stored', completed: false },
      ];
      localStorage.setItem('todos-key', JSON.stringify(storedTodos));
      const todos = spCollection<Todo>({
        idField: 'id',
        persist: 'todos-key',
      });
      expect(todos.value()).toEqual(storedTodos);
      expect(todos.count()).toBe(1);
    });

    it('should use initialValue when localStorage is empty', () => {
      const initialTodos: Todo[] = [
        { id: '1', title: 'Initial', completed: false },
      ];
      const todos = spCollection<Todo>({
        idField: 'id',
        initialValue: initialTodos,
        persist: 'todos-key',
      });
      expect(todos.value()).toEqual(initialTodos);
    });
  });

  describe('CRUD operations', () => {
    let todos: ReturnType<typeof spCollection<Todo>>;

    beforeEach(() => {
      todos = spCollection<Todo>({
        idField: 'id',
      });
    });

    describe('add', () => {
      it('should add single item', () => {
        const todo: Todo = { id: '1', title: 'New Todo', completed: false };
        todos.add(todo);
        expect(todos.count()).toBe(1);
        expect(todos.findById('1')).toEqual(todo);
        expect(todos.value()).toContain(todo);
      });

      it('should not add duplicate IDs', () => {
        const todo1: Todo = { id: '1', title: 'Todo 1', completed: false };
        const todo2: Todo = { id: '1', title: 'Todo 2', completed: true };
        todos.add(todo1);
        todos.add(todo2);
        expect(todos.count()).toBe(1);
        expect(todos.findById('1')).toEqual(todo1);
      });

      it('should add multiple items', () => {
        const todo1: Todo = { id: '1', title: 'Todo 1', completed: false };
        const todo2: Todo = { id: '2', title: 'Todo 2', completed: false };
        todos.addMany([todo1, todo2]);
        expect(todos.count()).toBe(2);
        expect(todos.findById('1')).toEqual(todo1);
        expect(todos.findById('2')).toEqual(todo2);
      });

      it('should skip duplicates when adding many', () => {
        const todo1: Todo = { id: '1', title: 'Todo 1', completed: false };
        const todo2: Todo = { id: '2', title: 'Todo 2', completed: false };
        const todo3: Todo = { id: '1', title: 'Duplicate', completed: true };
        todos.add(todo1);
        todos.addMany([todo2, todo3]);
        expect(todos.count()).toBe(2);
        expect(todos.findById('1')).toEqual(todo1);
      });
    });

    describe('update', () => {
      beforeEach(() => {
        todos.add({ id: '1', title: 'Original', completed: false });
      });

      it('should update existing item', () => {
        const updated = todos.update('1', {
          title: 'Updated',
          completed: true,
        });
        expect(updated).toBe(true);
        expect(todos.findById('1')).toEqual({
          id: '1',
          title: 'Updated',
          completed: true,
        });
      });

      it('should return false for non-existent ID', () => {
        const updated = todos.update('999', { title: 'Updated' });
        expect(updated).toBe(false);
        expect(todos.count()).toBe(1);
      });

      it('should update multiple items', () => {
        todos.add({ id: '2', title: 'Todo 2', completed: false });
        todos.add({ id: '3', title: 'Todo 3', completed: false });
        const updatedCount = todos.updateMany([
          { id: '1', changes: { completed: true } },
          { id: '2', changes: { title: 'Updated 2' } },
          { id: '999', changes: { title: 'Not Found' } },
        ]);
        expect(updatedCount).toBe(2);
        expect(todos.findById('1')?.completed).toBe(true);
        expect(todos.findById('2')?.title).toBe('Updated 2');
        expect(todos.findById('3')?.title).toBe('Todo 3');
      });
    });

    describe('remove', () => {
      beforeEach(() => {
        todos.add({ id: '1', title: 'Todo 1', completed: false });
        todos.add({ id: '2', title: 'Todo 2', completed: false });
        todos.add({ id: '3', title: 'Todo 3', completed: false });
      });

      it('should remove item by ID', () => {
        const removed = todos.remove('2');
        expect(removed).toBe(true);
        expect(todos.count()).toBe(2);
        expect(todos.findById('2')).toBeUndefined();
        expect(todos.findById('1')).toBeDefined();
        expect(todos.findById('3')).toBeDefined();
      });

      it('should return false for non-existent ID', () => {
        const removed = todos.remove('999');
        expect(removed).toBe(false);
        expect(todos.count()).toBe(3);
      });

      it('should remove multiple items', () => {
        const removedCount = todos.removeMany(['1', '3', '999']);
        expect(removedCount).toBe(2);
        expect(todos.count()).toBe(1);
        expect(todos.findById('2')).toBeDefined();
        expect(todos.findById('1')).toBeUndefined();
        expect(todos.findById('3')).toBeUndefined();
      });
    });

    describe('clear', () => {
      beforeEach(() => {
        todos.add({ id: '1', title: 'Todo 1', completed: false });
        todos.add({ id: '2', title: 'Todo 2', completed: false });
      });

      it('should clear all items', () => {
        todos.clear();
        expect(todos.count()).toBe(0);
        expect(todos.isEmpty()).toBe(true);
        expect(todos.value()).toEqual([]);
      });
    });
  });

  describe('query operations', () => {
    let todos: ReturnType<typeof spCollection<Todo>>;

    beforeEach(() => {
      todos = spCollection<Todo>({
        idField: 'id',
        initialValue: [
          { id: '1', title: 'Todo 1', completed: false },
          { id: '2', title: 'Todo 2', completed: true },
          { id: '3', title: 'Todo 3', completed: false },
        ],
      });
    });

    describe('findById', () => {
      it('should find item by ID', () => {
        const todo = todos.findById('2');
        expect(todo).toEqual({ id: '2', title: 'Todo 2', completed: true });
      });

      it('should return undefined for non-existent ID', () => {
        const todo = todos.findById('999');
        expect(todo).toBeUndefined();
      });
    });

    describe('filter', () => {
      it('should filter items by predicate', () => {
        const completed = todos.filter((todo) => todo.completed);
        expect(completed.length).toBe(1);
        expect(completed[0].id).toBe('2');
      });

      it('should return empty array when no matches', () => {
        const result = todos.filter((todo) => todo.title.includes('None'));
        expect(result).toEqual([]);
      });
    });

    describe('find', () => {
      it('should find first matching item', () => {
        const todo = todos.find((item) => item.completed);
        expect(todo).toEqual({ id: '2', title: 'Todo 2', completed: true });
      });

      it('should return undefined when no match', () => {
        const todo = todos.find((item) => item.title.includes('None'));
        expect(todo).toBeUndefined();
      });
    });

    describe('some', () => {
      it('should return true when any item matches', () => {
        expect(todos.some((todo) => todo.completed)).toBe(true);
      });

      it('should return false when no items match', () => {
        expect(todos.some((todo) => todo.title.includes('None'))).toBe(false);
      });
    });

    describe('every', () => {
      it('should return true when all items match', () => {
        const allTodos = spCollection<Todo>({
          idField: 'id',
          initialValue: [
            { id: '1', title: 'Todo 1', completed: true },
            { id: '2', title: 'Todo 2', completed: true },
          ],
        });
        expect(allTodos.every((todo) => todo.completed)).toBe(true);
      });

      it('should return false when any item does not match', () => {
        expect(todos.every((todo) => todo.completed)).toBe(false);
      });
    });
  });

  describe('transform operations', () => {
    let todos: ReturnType<typeof spCollection<Todo>>;

    beforeEach(() => {
      todos = spCollection<Todo>({
        idField: 'id',
        initialValue: [
          { id: '3', title: 'Todo 3', completed: false },
          { id: '1', title: 'Todo 1', completed: true },
          { id: '2', title: 'Todo 2', completed: false },
        ],
      });
    });

    describe('sort', () => {
      it('should sort items', () => {
        const sorted = todos.sort((a, b) => a.id.localeCompare(b.id));
        expect(sorted[0].id).toBe('1');
        expect(sorted[1].id).toBe('2');
        expect(sorted[2].id).toBe('3');
      });

      it('should not mutate original array', () => {
        const original = todos.value();
        todos.sort((a, b) => a.id.localeCompare(b.id));
        expect(todos.value()).toEqual(original);
      });
    });

    describe('map', () => {
      it('should map items to new array', () => {
        const titles = todos.map((todo) => todo.title);
        expect(titles).toEqual(['Todo 3', 'Todo 1', 'Todo 2']);
      });

      it('should include index in map function', () => {
        const indexed = todos.map((todo, index) => `${index}:${todo.id}`);
        expect(indexed).toEqual(['0:3', '1:1', '2:2']);
      });
    });

    describe('reduce', () => {
      it('should reduce items to single value', () => {
        const totalCompleted = todos.reduce(
          (acc, todo) => acc + (todo.completed ? 1 : 0),
          0,
        );
        expect(totalCompleted).toBe(1);
      });

      it('should work with different accumulator types', () => {
        const titles = todos.reduce((acc, todo) => acc + todo.title + ', ', '');
        expect(titles).toBe('Todo 3, Todo 1, Todo 2, ');
      });
    });
  });

  describe('history operations', () => {
    let todos: ReturnType<typeof spCollection<Todo>>;

    beforeEach(() => {
      todos = spCollection<Todo>({
        idField: 'id',
        withHistory: true,
      });
    });

    it('should support undo operation', () => {
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      todos.add({ id: '2', title: 'Todo 2', completed: false });
      expect(todos.count()).toBe(2);
      expect(todos.canUndo()).toBe(true);
      const undone = todos.undo();
      expect(undone).toBe(true);
      expect(todos.count()).toBe(1);
    });

    it('should support redo operation', () => {
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      todos.add({ id: '2', title: 'Todo 2', completed: false });
      todos.undo();
      expect(todos.canRedo()).toBe(true);
      const redone = todos.redo();
      expect(redone).toBe(true);
      expect(todos.count()).toBe(2);
    });

    it('should return false when undo is not available', () => {
      expect(todos.canUndo()).toBe(false);
      expect(todos.undo()).toBe(false);
    });

    it('should return false when redo is not available', () => {
      expect(todos.canRedo()).toBe(false);
      expect(todos.redo()).toBe(false);
    });

    it('should track history through multiple operations', () => {
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      todos.add({ id: '2', title: 'Todo 2', completed: false });
      todos.update('1', { completed: true });
      todos.remove('2');
      expect(todos.count()).toBe(1);
      expect(todos.findById('1')?.completed).toBe(true);
      todos.undo();
      expect(todos.count()).toBe(2);
      expect(todos.findById('1')?.completed).toBe(true);
      todos.undo();
      expect(todos.count()).toBe(2);
      expect(todos.findById('1')?.completed).toBe(false);
      todos.undo();
      expect(todos.count()).toBe(1);
    });
  });

  describe('persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should persist to localStorage', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
        persist: 'todos-key',
      });
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      todos.add({ id: '2', title: 'Todo 2', completed: false });
      const stored = JSON.parse(localStorage.getItem('todos-key') || '[]');
      expect(stored.length).toBe(2);
    });

    it('should load from localStorage on initialization', () => {
      const initialTodos: Todo[] = [
        { id: '1', title: 'Stored', completed: false },
      ];
      localStorage.setItem('todos-key', JSON.stringify(initialTodos));
      const todos = spCollection<Todo>({
        idField: 'id',
        persist: 'todos-key',
      });
      expect(todos.value()).toEqual(initialTodos);
    });

    it('should update localStorage on changes', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
        persist: 'todos-key',
      });
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      todos.update('1', { completed: true });
      todos.remove('1');
      const stored = JSON.parse(localStorage.getItem('todos-key') || '[]');
      expect(stored).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle numeric IDs', () => {
      const users = spCollection<User>({
        idField: 'id',
      });
      users.add({ id: 1, name: 'User 1', email: 'user1@test.com' });
      users.add({ id: 2, name: 'User 2', email: 'user2@test.com' });
      expect(users.findById(1)?.name).toBe('User 1');
      expect(users.update(1, { name: 'Updated' })).toBe(true);
      expect(users.remove(2)).toBe(true);
    });

    it('should handle large collections', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      const items: Todo[] = [];
      for (let i = 0; i < 1000; i++) {
        items.push({
          id: `todo-${i}`,
          title: `Todo ${i}`,
          completed: i % 2 === 0,
        });
      }
      todos.addMany(items);
      expect(todos.count()).toBe(1000);
      expect(todos.findById('todo-500')).toBeDefined();
      expect(todos.filter((t) => t.completed).length).toBe(500);
    });

    it('should handle empty operations gracefully', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      expect(todos.update('1', { title: 'Test' })).toBe(false);
      expect(todos.remove('1')).toBe(false);
      expect(todos.removeMany(['1', '2'])).toBe(0);
      expect(todos.updateMany([{ id: '1', changes: {} }])).toBe(0);
    });

    it('should maintain order of insertion', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      todos.add({ id: '1', title: 'First', completed: false });
      todos.add({ id: '2', title: 'Second', completed: false });
      todos.add({ id: '3', title: 'Third', completed: false });
      const values = todos.value();
      expect(values[0].id).toBe('1');
      expect(values[1].id).toBe('2');
      expect(values[2].id).toBe('3');
    });

    it('should handle partial updates correctly', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      todos.add({
        id: '1',
        title: 'Original',
        completed: false,
      });
      todos.update('1', { completed: true });
      const updated = todos.findById('1');
      expect(updated?.title).toBe('Original');
      expect(updated?.completed).toBe(true);
    });
  });

  describe('reactive signals', () => {
    it('should update count signal when items change', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      expect(todos.count()).toBe(0);
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      expect(todos.count()).toBe(1);
      todos.add({ id: '2', title: 'Todo 2', completed: false });
      expect(todos.count()).toBe(2);
      todos.remove('1');
      expect(todos.count()).toBe(1);
    });

    it('should update isEmpty signal', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      expect(todos.isEmpty()).toBe(true);
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      expect(todos.isEmpty()).toBe(false);
      todos.clear();
      expect(todos.isEmpty()).toBe(true);
    });

    it('should update value signal reactively', () => {
      const todos = spCollection<Todo>({
        idField: 'id',
      });
      const initialValue = todos.value();
      expect(initialValue).toEqual([]);
      todos.add({ id: '1', title: 'Todo 1', completed: false });
      const newValue = todos.value();
      expect(newValue.length).toBe(1);
      expect(newValue[0].id).toBe('1');
    });
  });
});
