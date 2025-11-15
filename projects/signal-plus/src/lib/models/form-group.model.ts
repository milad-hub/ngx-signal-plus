import { Signal } from '@angular/core';
import { SignalPlus } from './signal-plus.model';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormGroupValidator<T = any> = (values: T) => boolean | string;

export interface FormGroupOptions {
  persistKey?: string;
  validators?: FormGroupValidator[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormGroupConfig<T extends Record<string, any>> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: SignalPlus<T[K]> | SignalFormGroup<any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SignalFormGroup<T extends Record<string, any>> {
  value: Signal<T>;
  isValid: Signal<boolean>;
  isDirty: Signal<boolean>;
  isTouched: Signal<boolean>;
  errors: Signal<Record<string, string[]>>;

  setValue(value: Partial<T>): void;
  patchValue(value: Partial<T>): void;
  reset(): void;
  markAsTouched(): void;
  markAsUntouched(): void;
  markAsDirty(): void;
  markAsPristine(): void;
  submit(): T | null;
  validate(): boolean;

  get<K extends keyof T>(field: K): T[K];
  getControl<K extends keyof T>(
    field: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): SignalPlus<any> | SignalFormGroup<any>;
}
