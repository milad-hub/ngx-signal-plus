import { HistoryManager } from './history-manager';

describe('HistoryManager', () => {
    let manager: HistoryManager<number>;

    beforeEach(() => {
        manager = new HistoryManager<number>(0);
    });

    describe('Basic Operations', () => {
        it('should initialize with correct state', () => {
            expect(manager.current).toBe(0);
            expect(manager.canUndo).toBe(false);
            expect(manager.canRedo).toBe(false);
        });

        it('should track value changes', () => {
            manager.push(1);
            manager.push(2);
            expect(manager.current).toBe(2);
            expect(manager.canUndo).toBe(true);
            expect(manager.canRedo).toBe(false);
        });

        it('should enforce history size limit', () => {
            for (let i: number = 1; i <= 55; i++) {
                manager.push(i);
            }
            while (manager.canUndo) {
                manager.undo();
            }
            expect(manager.current).toBe(5);
        });

        it('should handle duplicate values', () => {
            manager.push(1);
            manager.push(1);
            expect(manager.current).toBe(1);
            expect(manager.canUndo).toBe(true);
        });

        it('should handle maxHistory boundary exactly', () => {
            const manager: HistoryManager<number> = new HistoryManager<number>(0);
            for (let i: number = 1; i <= 50; i++) {
                manager.push(i);
            }
            expect(manager.current).toBe(50);
            manager.undo();
            expect(manager.current).toBe(49);
            expect(manager.canUndo).toBe(true);
            while (manager.canUndo) {
                manager.undo();
            }
            expect(manager.current).toBe(0);
            manager.push(51);
            expect(manager.current).toBe(51);
            manager.undo();
            expect(manager.current).toBe(0);
        });
    });

    describe('Undo/Redo Operations', () => {
        it('should handle undo operations', () => {
            manager.push(1);
            manager.push(2);
            const result: number | undefined = manager.undo();
            expect(result).toBe(1);
            expect(manager.current).toBe(1);
            expect(manager.canUndo).toBe(true);
            expect(manager.canRedo).toBe(true);
        });

        it('should handle redo operations', () => {
            manager.push(1);
            manager.push(2);
            manager.undo();
            const result: number | undefined = manager.redo();
            expect(result).toBe(2);
            expect(manager.current).toBe(2);
            expect(manager.canUndo).toBe(true);
            expect(manager.canRedo).toBe(false);
        });

        it('should handle empty undo/redo operations', () => {
            expect(manager.undo()).toBeUndefined();
            expect(manager.redo()).toBeUndefined();
            expect(manager.current).toBe(0);
        });

        it('should clear redo stack on new push', () => {
            manager.push(1);
            manager.push(2);
            manager.undo();
            manager.push(3);
            expect(manager.canRedo).toBe(false);
            expect(manager.redo()).toBeUndefined();
            expect(manager.current).toBe(3);
        });

        it('should maintain correct state after multiple undo operations', () => {
            manager.push(1);
            manager.push(2);
            manager.push(3);
            manager.undo();
            manager.undo();
            expect(manager.current).toBe(1);
            expect(manager.canUndo).toBe(true);
            expect(manager.canRedo).toBe(true);
        });
    });

    describe('Complex Operations', () => {
        it('should handle multiple undo/redo sequences', () => {
            manager.push(1);
            manager.push(2);
            manager.push(3);
            manager.undo();
            manager.undo();
            manager.redo();
            manager.push(4);
            expect(manager.current).toBe(4);
            expect(manager.canUndo).toBe(true);
            expect(manager.canRedo).toBe(false);
        });

        it('should handle object values correctly', () => {
            const objManager: HistoryManager<{ value: number }> = new HistoryManager<{ value: number }>({ value: 0 });
            objManager.push({ value: 1 });
            objManager.push({ value: 2 });
            objManager.undo();
            expect(objManager.current).toEqual({ value: 1 });
            expect(objManager.redo()).toEqual({ value: 2 });
        });

        it('should handle rapid undo/redo operations', () => {
            manager.push(1);
            manager.push(2);
            manager.push(3);
            manager.undo();
            manager.redo();
            manager.undo();
            manager.redo();
            expect(manager.current).toBe(3);
            expect(manager.canUndo).toBe(true);
            expect(manager.canRedo).toBe(false);
        });
    });

    describe('state management', () => {
        it('should enforce history limit with complex objects', () => {
            interface TestObject { value: number; data: string; }

            const manager = new HistoryManager<TestObject>({ value: 0, data: 'initial' });
            manager.push({ value: 1, data: 'first' });
            manager.push({ value: 2, data: 'second' });
            manager.push({ value: 3, data: 'third' });
            manager.push({ value: 4, data: 'fourth' });
            expect(manager.current).toEqual({ value: 4, data: 'fourth' });
            expect(manager.canUndo).toBe(true);
            const previousValue: TestObject | undefined = manager.undo();
            expect(previousValue).toEqual({ value: 3, data: 'third' });
        });

        it('should maintain state consistency with mixed data types', () => {
            interface ComplexType {
                id: number;
                values: string[];
                metadata: { [key: string]: any };
            }

            const manager = new HistoryManager<ComplexType>({
                id: 0,
                values: [],
                metadata: {}
            });
            manager.push({
                id: 1,
                values: ['a', 'b'],
                metadata: { timestamp: Date.now() }
            });
            manager.push({
                id: 2,
                values: ['c', 'd'],
                metadata: { timestamp: Date.now(), ['tags']: ['test'] }
            });
            expect(manager.current.id).toBe(2);
            expect(manager.current.values).toEqual(['c', 'd']);
            expect(manager.current.metadata['tags']).toEqual(['test']);
            manager.undo();
            expect(manager.current.id).toBe(1);
            expect(manager.current.values).toEqual(['a', 'b']);
            expect(manager.current.metadata['tags']).toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should handle invalid undo/redo operations', () => {
            const emptyManager = new HistoryManager<number>(0);
            expect(emptyManager.undo()).toBeUndefined();
            expect(emptyManager.current).toBe(0);
            expect(emptyManager.redo()).toBeUndefined();
            expect(emptyManager.current).toBe(0);
            emptyManager.push(1);
            emptyManager.undo();
            emptyManager.undo();
            expect(emptyManager.current).toBe(0);
            emptyManager.redo();
            emptyManager.redo();
            expect(emptyManager.current).toBe(1);
        });

        it('should handle undefined and null values correctly', () => {
            const nullableManager = new HistoryManager<number | null | undefined>(0);
            nullableManager.push(null);
            expect(nullableManager.current).toBeNull();
            nullableManager.push(undefined);
            expect(nullableManager.current).toBeUndefined();
            expect(nullableManager.undo()).toBeNull();
            expect(nullableManager.undo()).toBe(0);
        });
    });

    describe('type safety', () => {
        it('should maintain type safety with different data types', () => {
            const arrayManager = new HistoryManager<number[]>([]);
            const objectManager = new HistoryManager<{ key: string }>({ key: '' });
            const primitiveManager = new HistoryManager<number>(0);
            arrayManager.push([1, 2]);
            arrayManager.push([3, 4]);
            expect(arrayManager.current).toEqual([3, 4]);
            expect(arrayManager.undo()).toEqual([1, 2]);
            objectManager.push({ key: 'test1' });
            objectManager.push({ key: 'test2' });
            expect(objectManager.current.key).toBe('test2');
            expect(objectManager.undo()?.key).toBe('test1');
            primitiveManager.push(5);
            primitiveManager.push(10);
            expect(primitiveManager.current).toBe(10);
            expect(primitiveManager.undo()).toBe(5);
        });

        it('should handle nested object structures correctly', () => {
            interface NestedType {
                level1: {
                    level2: {
                        value: number;
                        array: string[];
                    };
                    data: string;
                };
            }

            const manager = new HistoryManager<NestedType>({
                level1: {
                    level2: {
                        value: 0,
                        array: []
                    },
                    data: 'initial'
                }
            });
            manager.push({
                level1: {
                    level2: {
                        value: 1,
                        array: ['a']
                    },
                    data: 'first'
                }
            });
            manager.push({
                level1: {
                    level2: {
                        value: 2,
                        array: ['a', 'b']
                    },
                    data: 'second'
                }
            });
            expect(manager.current.level1.level2.value).toBe(2);
            expect(manager.current.level1.level2.array).toEqual(['a', 'b']);
            expect(manager.current.level1.data).toBe('second');
            const previous: NestedType | undefined = manager.undo();
            expect(previous?.level1.level2.value).toBe(1);
            expect(previous?.level1.level2.array).toEqual(['a']);
            expect(previous?.level1.data).toBe('first');
        });
    });
});