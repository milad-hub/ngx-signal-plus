import { computed, signal } from '@angular/core';
import { FormGroupConfig, FormGroupOptions, SignalFormGroup } from '../models/form-group.model';
import { SignalPlus } from '../models/signal-plus.model';
import { safeLocalStorageGet, safeLocalStorageSet } from './platform';

function isFormGroup(control: SignalPlus<any> | SignalFormGroup<any>): control is SignalFormGroup<any> {
  if (!control || typeof control !== 'object') {
    return false;
  }
  const c = control as any;
  if ('writable' in c || 'signal' in c) {
    return false;
  }
  return 'value' in c && typeof c.value === 'function' &&
    'setValue' in c && typeof c.setValue === 'function' &&
    'getControl' in c && typeof c.getControl === 'function';
}

function getControlValue(control: SignalPlus<any> | SignalFormGroup<any>): any {
  if (isFormGroup(control)) {
    return control.value();
  }
  return (control as SignalPlus<any>).value;
}

function getControlErrors(control: SignalPlus<any> | SignalFormGroup<any>): string[] {
  if (isFormGroup(control)) {
    const errors = control.errors();
    return Object.values(errors).flat();
  }
  const signalControl = control as SignalPlus<any>;
  return signalControl.isValid && !signalControl.isValid() ? ['Invalid'] : [];
}

function isControlValid(control: SignalPlus<any> | SignalFormGroup<any>): boolean {
  if (isFormGroup(control)) {
    return control.isValid();
  }
  return (control as SignalPlus<any>).isValid();
}

const dirtyState = new WeakMap<SignalPlus<any> | SignalFormGroup<any>, boolean>();
const touchedState = new WeakMap<SignalPlus<any> | SignalFormGroup<any>, boolean>();

function markControlTouched(control: SignalPlus<any> | SignalFormGroup<any>, touched: boolean, trigger?: ReturnType<typeof signal<number>>): void {
  if (isFormGroup(control)) {
    touched ? control.markAsTouched() : control.markAsUntouched();
  } else {
    touchedState.set(control, touched);
    trigger?.update(v => v + 1);
  }
}

function markControlDirty(control: SignalPlus<any> | SignalFormGroup<any>, dirty: boolean, trigger?: ReturnType<typeof signal<number>>): void {
  if (isFormGroup(control)) {
    dirty ? control.markAsDirty() : control.markAsPristine();
  } else {
    const signalControl = control as SignalPlus<any>;
    if (!dirty) {
      if (signalControl.reset) {
        signalControl.reset();
      } else if (signalControl.initialValue !== undefined) {
        signalControl.setValue(signalControl.initialValue);
      }
      dirtyState.delete(control);
    } else {
      dirtyState.set(control, true);
    }
    trigger?.update(v => v + 1);
  }
}

function setControlValue<T extends Record<string, any>>(control: SignalPlus<T> | SignalFormGroup<T>, value: T | Partial<T>): void {
  if (isFormGroup(control)) {
    control.patchValue(value as Partial<T>);
  } else {
    (control as SignalPlus<T>).setValue(value as T);
  }
}

function resetControl(control: SignalPlus<any> | SignalFormGroup<any>, touchedTrigger?: ReturnType<typeof signal<number>>, dirtyTrigger?: ReturnType<typeof signal<number>>): void {
  if (isFormGroup(control)) {
    control.reset();
  } else {
    const signalControl = control as SignalPlus<any>;
    if (signalControl.reset) {
      signalControl.reset();
    } else if (signalControl.initialValue !== undefined) {
      signalControl.setValue(signalControl.initialValue);
    }
  }
  markControlTouched(control, false, touchedTrigger);
  markControlDirty(control, false, dirtyTrigger);
}

/**
 * Creates a form group that manages multiple form controls together
 * 
 * @param config - Object mapping field names to controls (signals or nested form groups)
 * @param options - Optional configuration (persistence, validators)
 * @returns A SignalFormGroup instance with aggregated state and methods
 * 
 * @example
 * ```typescript
 * const loginForm = spFormGroup({
 *   email: spForm.email(''),
 *   password: spForm.text('', { minLength: 8 })
 * });
 * 
 * loginForm.isValid(); // false if password < 8 chars
 * loginForm.value(); // { email: '', password: '' }
 * ```
 */
export function spFormGroup<T extends Record<string, any>>(
  config: FormGroupConfig<T>,
  options?: FormGroupOptions
): SignalFormGroup<T> {
  const controls = config;
  const controlKeys = Object.keys(controls) as Array<keyof T>;

  const touchedTrigger = signal(0);
  const dirtyTrigger = signal(0);

  const initialValues = {} as T;
  controlKeys.forEach(key => {
    initialValues[key] = getControlValue(controls[key as keyof FormGroupConfig<T>]);
  });

  const persistedData = options?.persistKey ? safeLocalStorageGet(options.persistKey) : null;
  if (persistedData) {
    try {
      const parsed = JSON.parse(persistedData);
      controlKeys.forEach(key => {
        if (parsed[key] !== undefined) {
          setControlValue(controls[key as keyof FormGroupConfig<T>], parsed[key]);
        }
      });
    } catch {
    }
  }

  const value = computed(() => {
    const result = {} as T;
    controlKeys.forEach(key => {
      const control = controls[key as keyof FormGroupConfig<T>];
      result[key] = isFormGroup(control)
        ? control.value()
        : (control as SignalPlus<any>).value;
    });
    return result;
  });

  const isValid = computed(() => {
    const allControlsValid = controlKeys.every(key =>
      isControlValid(controls[key as keyof FormGroupConfig<T>])
    );
    if (!allControlsValid) {
      return false;
    }

    if (options?.validators && options.validators.length > 0) {
      const currentValue = value();
      return options.validators.every(validator => {
        const result = validator(currentValue);
        return result === true || result === '';
      });
    }

    return true;
  });

  const isDirty = computed(() => {
    dirtyTrigger();
    const currentValue = value();

    return controlKeys.some(key => {
      const control = controls[key as keyof FormGroupConfig<T>];

      if (isFormGroup(control)) {
        return control.isDirty();
      }

      if (dirtyState.has(control)) {
        return dirtyState.get(control) || false;
      }

      const currentVal = currentValue[key];
      const initialVal = initialValues[key];
      try {
        return JSON.stringify(currentVal) !== JSON.stringify(initialVal);
      } catch {
        return currentVal !== initialVal;
      }
    });
  });

  const isTouched = computed(() => {
    touchedTrigger();
    return controlKeys.some(key => {
      const control = controls[key as keyof FormGroupConfig<T>];
      if (isFormGroup(control)) {
        return control.isTouched();
      }
      return touchedState.get(control) || false;
    });
  });

  const errors = computed(() => {
    const result: Record<string, string[]> = {};

    controlKeys.forEach(key => {
      const controlErrors = getControlErrors(controls[key as keyof FormGroupConfig<T>]);
      if (controlErrors.length > 0) {
        result[String(key)] = controlErrors;
      }
    });

    if (options?.validators && options.validators.length > 0) {
      const currentValue = value();
      options.validators.forEach(validator => {
        const validatorResult = validator(currentValue);
        if (validatorResult !== true && validatorResult !== '') {
          const errorMessage = typeof validatorResult === 'string' ? validatorResult : 'Validation failed';
          if (!result['_group']) {
            result['_group'] = [];
          }
          result['_group'].push(errorMessage);
        }
      });
    }

    return result;
  });

  function setValue(newValue: Partial<T>): void {
    controlKeys.forEach(key => {
      if (newValue[key] !== undefined) {
        setControlValue(controls[key as keyof FormGroupConfig<T>], newValue[key]!);
      }
    });
    if (options?.persistKey) {
      safeLocalStorageSet(options.persistKey, JSON.stringify(value()));
    }
  }

  function patchValue(newValue: Partial<T>): void {
    setValue(newValue);
  }

  function reset(): void {
    controlKeys.forEach(key => {
      resetControl(controls[key as keyof FormGroupConfig<T>], touchedTrigger, dirtyTrigger);
    });
    if (options?.persistKey) {
      safeLocalStorageSet(options.persistKey, JSON.stringify(initialValues));
    }
  }

  function markAsTouched(): void {
    controlKeys.forEach(key => {
      markControlTouched(controls[key as keyof FormGroupConfig<T>], true, touchedTrigger);
    });
  }

  function markAsUntouched(): void {
    controlKeys.forEach(key => {
      markControlTouched(controls[key as keyof FormGroupConfig<T>], false, touchedTrigger);
    });
  }

  function markAsDirty(): void {
    controlKeys.forEach(key => {
      markControlDirty(controls[key as keyof FormGroupConfig<T>], true, dirtyTrigger);
    });
  }

  function markAsPristine(): void {
    controlKeys.forEach(key => {
      markControlDirty(controls[key as keyof FormGroupConfig<T>], false, dirtyTrigger);
    });
  }

  function submit(): T | null {
    markAsTouched();
    return isValid() ? value() : null;
  }

  function validate(): boolean {
    markAsTouched();
    return isValid();
  }

  function get<K extends keyof T>(field: K): T[K] {
    return getControlValue(controls[field as keyof FormGroupConfig<T>]);
  }

  function getControl<K extends keyof T>(field: K): SignalPlus<any> | SignalFormGroup<any> {
    return controls[field as keyof FormGroupConfig<T>];
  }

  return {
    value,
    isValid,
    isDirty,
    isTouched,
    errors,
    setValue,
    patchValue,
    reset,
    markAsTouched,
    markAsUntouched,
    markAsDirty,
    markAsPristine,
    submit,
    validate,
    get,
    getControl
  };
}