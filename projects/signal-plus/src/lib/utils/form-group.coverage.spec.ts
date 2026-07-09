import { SignalPlus } from '../models/signal-plus.model';
import { sp } from './create';
import { spFormGroup } from './form-group';

function makeBareControl<T>(initial: T): SignalPlus<T> {
  let current = initial;
  return {
    get value() {
      return current;
    },
    setValue(next: T) {
      current = next;
    },
    isValid: () => true,
    initialValue: initial,
  } as unknown as SignalPlus<T>;
}

describe('spFormGroup nested group behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function makeNested() {
    const child = spFormGroup({
      name: sp('x')
        .validate((value: string) => value.length > 0)
        .build(),
    });
    const parent = spFormGroup({ profile: child, age: sp(1).build() });
    return { child, parent };
  }

  it('should read nested group values', () => {
    const { parent } = makeNested();
    expect(parent.value().profile).toEqual({ name: 'x' });
    expect(parent.isValid()).toBe(true);
  });

  it('should flatten nested group errors', () => {
    const child = spFormGroup({
      name: sp('')
        .validate((value: string) => value.length > 0)
        .build(),
    });
    const parent = spFormGroup({ profile: child });

    expect(parent.errors()['profile']).toEqual(['Invalid']);
    expect(parent.isValid()).toBe(false);
  });

  it('should propagate touched marks through nested groups', () => {
    const { child, parent } = makeNested();

    parent.markAsTouched();
    expect(parent.isTouched()).toBe(true);
    expect(child.isTouched()).toBe(true);

    parent.markAsUntouched();
    expect(parent.isTouched()).toBe(false);
  });

  it('should propagate dirty marks through nested groups', () => {
    const { child, parent } = makeNested();

    parent.markAsDirty();
    expect(parent.isDirty()).toBe(true);
    expect(child.isDirty()).toBe(true);

    parent.markAsPristine();
    expect(parent.isDirty()).toBe(false);
  });

  it('should patch nested groups through setValue', () => {
    const { child, parent } = makeNested();
    parent.setValue({ profile: { name: 'updated' } } as never);
    expect(child.value().name).toBe('updated');
  });

  it('should reset nested groups', () => {
    const { child, parent } = makeNested();
    (child.getControl('name') as SignalPlus<string>).setValue('changed');
    parent.reset();
    expect(child.value().name).toBe('x');
  });

  it('should include dirty and touched state from nested groups', () => {
    const { child, parent } = makeNested();
    child.markAsDirty();
    child.markAsTouched();
    expect(parent.isDirty()).toBe(true);
    expect(parent.isTouched()).toBe(true);
  });
});

describe('spFormGroup edge control behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should reset bare controls through their initial value', () => {
    const bare = makeBareControl('a');
    const group = spFormGroup({ field: bare } as never);

    group.setValue({ field: 'b' } as never);
    expect(bare.value).toBe('b');

    group.reset();
    expect(bare.value).toBe('a');

    group.markAsDirty();
    expect(group.isDirty()).toBe(true);

    group.markAsPristine();
    expect(bare.value).toBe('a');
  });

  it('should treat non-object entries as simple controls', () => {
    const group = spFormGroup({ broken: 0 } as never);
    expect((group.value() as { broken: unknown }).broken).toBeUndefined();
    expect(group.errors()).toEqual({});
  });

  it('should use a generic message for boolean group validator failures', () => {
    const group = spFormGroup(
      { name: sp('x').build() },
      { validators: [() => false] },
    );
    expect(group.errors()['_group']).toEqual(['Validation failed']);
  });

  it('should fall back to reference comparison for non-serializable values', () => {
    interface Circular {
      self?: Circular;
    }
    const circular: Circular = {};
    circular.self = circular;

    const bare = makeBareControl(circular);
    const group = spFormGroup({ blob: bare } as never);
    expect(group.isDirty()).toBe(false);
  });

  it('should persist current and initial values on setValue and reset', () => {
    const group = spFormGroup(
      { name: sp('x').build() },
      { persistKey: 'fg-key' },
    );

    group.setValue({ name: 'y' } as never);
    expect(localStorage.getItem('fg-key')).toContain('y');

    group.reset();
    expect(localStorage.getItem('fg-key')).toContain('x');
  });
});
