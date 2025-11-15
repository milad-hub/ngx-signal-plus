import { TestBed } from '@angular/core/testing';
import { spForm } from './create';
import { spFormGroup } from './form-group';

describe('spFormGroup', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
  });

  describe('basic functionality', () => {
    it('should create form group with multiple fields', () => {
      const email = spForm.text('', { minLength: 3 });
      const password = spForm.text('', { minLength: 8 });
      const form = spFormGroup({
        email,
        password
      });
      expect(form.value()).toEqual({ email: '', password: '' });
      expect(form.isValid()).toBe(false);
      expect(form.isDirty()).toBe(false);
      expect(form.isTouched()).toBe(false);
    });

    it('should aggregate values from all fields', () => {
      const email = spForm.text('test@example.com');
      const age = spForm.number({ initial: 25 });
      const form = spFormGroup({
        email,
        age
      });
      expect(form.value()).toEqual({ email: 'test@example.com', age: 25 });
    });

    it('should compute isValid from all fields', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('', { minLength: 8 });
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isValid()).toBe(false);
      password.setValue('password123');
      expect(form.isValid()).toBe(true);
    });

    it('should compute isDirty when any field changes', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isDirty()).toBe(false);
      email.setValue('new@example.com');
      expect(form.isDirty()).toBe(true);
    });

    it('should compute isTouched when any field touched', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isTouched()).toBe(false);
      form.markAsTouched();
      expect(form.isTouched()).toBe(true);
    });
  });

  describe('setValue and patchValue', () => {
    it('should set all field values with setValue', () => {
      const email = spForm.text('');
      const password = spForm.text('');
      const form = spFormGroup({
        email,
        password
      });
      form.setValue({ email: 'test@example.com', password: 'password123' });
      expect(form.value()).toEqual({ email: 'test@example.com', password: 'password123' });
      expect(email.value).toBe('test@example.com');
      expect(password.value).toBe('password123');
    });

    it('should partially update with patchValue', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      form.patchValue({ email: 'new@example.com' });
      expect(form.value()).toEqual({ email: 'new@example.com', password: 'password123' });
      expect(email.value).toBe('new@example.com');
      expect(password.value).toBe('password123');
    });

    it('should maintain type safety', () => {
      const email = spForm.text('');
      const age = spForm.number({ initial: 0 });
      const form = spFormGroup({
        email,
        age
      });
      form.setValue({ email: 'test@example.com', age: 25 });
      expect(typeof form.value().email).toBe('string');
      expect(typeof form.value().age).toBe('number');
    });
  });

  describe('reset', () => {
    it('should reset all fields to initial values', () => {
      const email = spForm.text('initial@example.com');
      const password = spForm.text('initial123');
      const form = spFormGroup({
        email,
        password
      });
      form.setValue({ email: 'changed@example.com', password: 'changed123' });
      form.reset();
      expect(form.value()).toEqual({ email: 'initial@example.com', password: 'initial123' });
    });

    it('should reset dirty and touched state', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      form.setValue({ email: 'new@example.com', password: 'newpassword123' });
      form.markAsTouched();
      expect(form.isDirty()).toBe(true);
      expect(form.isTouched()).toBe(true);
      form.reset();
      expect(form.isDirty()).toBe(false);
      expect(form.isTouched()).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate all fields', () => {
      const email = spForm.text('', { minLength: 3 });
      const password = spForm.text('', { minLength: 8 });
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isValid()).toBe(false);
      email.setValue('test@example.com');
      expect(form.isValid()).toBe(false);
      password.setValue('password123');
      expect(form.isValid()).toBe(true);
    });

    it('should run group-level validators', () => {
      const password = spForm.text('password123');
      const confirmPassword = spForm.text('password123');
      const form = spFormGroup({
        password,
        confirmPassword
      }, {
        validators: [
          (values: { password: string; confirmPassword: string }) =>
            values.password === values.confirmPassword || 'Passwords must match'
        ]
      });
      expect(form.isValid()).toBe(true);
      confirmPassword.setValue('different');
      expect(form.isValid()).toBe(false);
      const errors = form.errors();
      expect(errors['_group']).toBeDefined();
      expect(errors['_group']).toContain('Passwords must match');
    });

    it('should collect all errors', () => {
      const email = spForm.text('', { minLength: 3 });
      const password = spForm.text('', { minLength: 8 });
      const form = spFormGroup({
        email,
        password
      });
      form.validate();
      const errors = form.errors();
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should support cross-field validation', () => {
      const startDate = spForm.text('2024-01-01');
      const endDate = spForm.text('2024-01-02');
      const form = spFormGroup({
        startDate,
        endDate
      }, {
        validators: [
          (values: { startDate: string; endDate: string }) =>
            values.startDate <= values.endDate || 'End date must be after start date'
        ]
      });
      expect(form.isValid()).toBe(true);
      endDate.setValue('2023-12-31');
      expect(form.isValid()).toBe(false);
    });
  });

  describe('nested forms', () => {
    it('should support nested form groups', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const credentials = spFormGroup({
        email,
        password
      });
      const name = spForm.text('John Doe');
      const profile = spFormGroup({
        name
      });
      const form = spFormGroup({
        credentials,
        profile
      });
      expect(form.value()).toEqual({
        credentials: { email: 'test@example.com', password: 'password123' },
        profile: { name: 'John Doe' }
      });
    });

    it('should aggregate nested values', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const credentials = spFormGroup({
        email,
        password
      });
      const form = spFormGroup({
        credentials
      });
      const formValue = form.value() as { credentials: { email: string; password: string } };
      expect(formValue.credentials.email).toBe('test@example.com');
      expect(formValue.credentials.password).toBe('password123');
    });

    it('should validate nested forms', () => {
      const email = spForm.text('', { minLength: 3 });
      const password = spForm.text('', { minLength: 8 });
      const credentials = spFormGroup({
        email,
        password
      });
      const form = spFormGroup({
        credentials
      });
      expect(form.isValid()).toBe(false);
      email.setValue('test@example.com');
      password.setValue('password123');
      expect(form.isValid()).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist entire form state', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      }, {
        persistKey: 'test-form'
      });
      form.setValue({ email: 'saved@example.com', password: 'saved123' });
      const stored = localStorage.getItem('test-form');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.email).toBe('saved@example.com');
    });

    it('should restore form state on load', () => {
      localStorage.setItem('test-form', JSON.stringify({ email: 'restored@example.com', password: 'restored123' }));
      const email = spForm.text('');
      const password = spForm.text('');
      const form = spFormGroup({
        email,
        password
      }, {
        persistKey: 'test-form'
      });
      expect(form.value().email).toBe('restored@example.com');
      expect(form.value().password).toBe('restored123');
    });
  });

  describe('submit', () => {
    it('should return values when valid', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      const result = form.submit();
      expect(result).toEqual({ email: 'test@example.com', password: 'password123' });
    });

    it('should return null when invalid', () => {
      const email = spForm.text('', { minLength: 3 });
      const password = spForm.text('', { minLength: 8 });
      const form = spFormGroup({
        email,
        password
      });
      const result = form.submit();
      expect(result).toBeNull();
    });

    it('should mark all fields as touched on submit', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isTouched()).toBe(false);
      form.submit();
      expect(form.isTouched()).toBe(true);
    });
  });

  describe('get and getControl', () => {
    it('should get field value', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.get('email')).toBe('test@example.com');
      expect(form.get('password')).toBe('password123');
    });

    it('should get control reference', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      const emailControl = form.getControl('email');
      expect(emailControl).toBe(email);
      (emailControl as any).setValue('new@example.com');
      expect(form.get('email')).toBe('new@example.com');
    });
  });

  describe('markAs methods', () => {
    it('should mark as touched', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isTouched()).toBe(false);
      form.markAsTouched();
      expect(form.isTouched()).toBe(true);
    });

    it('should mark as untouched', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      form.markAsTouched();
      expect(form.isTouched()).toBe(true);
      form.markAsUntouched();
      expect(form.isTouched()).toBe(false);
    });

    it('should mark as dirty', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      form.markAsDirty();
      expect(form.isDirty()).toBe(true);
    });

    it('should mark as pristine', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      email.setValue('new@example.com');
      expect(form.isDirty()).toBe(true);
      form.markAsPristine();
      expect(form.isDirty()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate and return result', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.validate()).toBe(true);
    });

    it('should mark as touched when validating', () => {
      const email = spForm.text('test@example.com');
      const password = spForm.text('password123');
      const form = spFormGroup({
        email,
        password
      });
      expect(form.isTouched()).toBe(false);
      form.validate();
      expect(form.isTouched()).toBe(true);
    });
  });
});

