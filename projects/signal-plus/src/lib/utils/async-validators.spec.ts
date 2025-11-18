import { spValidators } from './async-validators';
import { sp } from './create';
import { spForm } from './create';
import { fakeAsync, tick } from '@angular/core/testing';

describe('spValidators', () => {
  describe('async namespace', () => {
    it('should export unique and custom functions', () => {
      expect(spValidators.async.unique).toBeDefined();
      expect(spValidators.async.custom).toBeDefined();
      expect(typeof spValidators.async.unique).toBe('function');
      expect(typeof spValidators.async.custom).toBe('function');
    });
  });

  describe('unique validator', () => {
    it('should return true when check function returns true', async () => {
      const validator = spValidators.async.unique(async (value: string) => {
        return value === 'unique';
      });
      const result = await validator('unique');
      expect(result).toBe(true);
    });

    it('should return false when check function returns false', async () => {
      const validator = spValidators.async.unique(async (value: string) => {
        return value === 'unique';
      });
      const result = await validator('duplicate');
      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const validator = spValidators.async.unique(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (value: string) => {
          throw new Error('Network error');
        },
      );

      const result = await validator('test');
      expect(result).toBe(false);
    });
  });

  describe('custom validator', () => {
    it('should return true when validator function returns true', async () => {
      const validator = spValidators.async.custom(async (value: string) => {
        return value.length > 3;
      });
      const result = await validator('valid');
      expect(result).toBe(true);
    });

    it('should return false when validator function returns false', async () => {
      const validator = spValidators.async.custom(async (value: string) => {
        return value.length > 3;
      });
      const result = await validator('no');
      expect(result).toBe(false);
    });

    it('should handle thrown errors as validation failures', async () => {
      const validator = spValidators.async.custom(async (value: string) => {
        if (value === 'error') {
          throw new Error('Custom validation error');
        }
        return true;
      });
      const validResult = await validator('valid');
      expect(validResult).toBe(true);
      const errorResult = await validator('error');
      expect(errorResult).toBe(false);
    });
  });

  describe('integration with SignalBuilder', () => {
    it('should integrate async validators with signal validation', fakeAsync(async () => {
      const signal = sp('')
        .validateAsync(
          spValidators.async.custom(async (value: string) => {
            return value.length >= 3;
          }),
        )
        .build();
      expect(signal.isValidating()).toBe(false);
      expect(signal.asyncErrors()).toEqual([]);
      signal.setValue('hi');
      tick(100);
      expect(signal.isValidating()).toBe(false);
      expect(signal.asyncErrors().length).toBe(1);
      expect(signal.asyncErrors()[0]).toBe('Async validation failed');
      signal.setValue('hello');
      tick(100);
      expect(signal.isValidating()).toBe(false);
      expect(signal.asyncErrors()).toEqual([]);
    }));

    it('should handle multiple async validators', fakeAsync(async () => {
      const signal = sp('')
        .validateAsync(
          spValidators.async.custom(async (value: string) => {
            return value.length >= 3;
          }),
        )
        .validateAsync(
          spValidators.async.custom(async (value: string) => {
            return !value.includes('bad');
          }),
        )
        .build();
      signal.setValue('bad');
      tick(100);
      expect(signal.asyncErrors().length).toBe(1);
      expect(signal.asyncErrors()).toContain('Async validation failed');
    }));

    it('should debounce async validation', fakeAsync(async () => {
      let callCount = 0;
      const signal = sp('')
        .debounce(200)
        .validateAsync(
          spValidators.async.custom(async (value: string) => {
            callCount++;
            return value.length >= 3;
          }),
        )
        .build();
      signal.setValue('a');
      signal.setValue('ab');
      signal.setValue('abc');
      tick(250);
      expect(callCount).toBe(1);
      expect(signal.asyncErrors()).toEqual([]);
    }));

    it('should cancel previous validation on rapid changes', fakeAsync(async () => {
      let callCount = 0;
      const signal = sp('')
        .debounce(50)
        .validateAsync(async (value: string) => {
          callCount++;
          await new Promise((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const timeout = setTimeout(() => resolve(undefined), 100);
          });
          return value === 'final';
        })
        .build();
      signal.setValue('first');
      tick(50);
      signal.setValue('final');
      tick(200);
      expect(callCount).toBe(2);
      expect(signal.asyncErrors()).toEqual([]);
    }));

    it('should handle async validator errors gracefully', fakeAsync(async () => {
      const signal = sp('')
        .validateAsync(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          async (value: string) => {
            throw new Error('Server error');
          },
        )
        .build();
      signal.setValue('test');
      tick(100);
      expect(signal.asyncErrors().length).toBe(1);
      expect(signal.asyncErrors()[0]).toBe('Server error');
    }));

    it('should work with sync validators', fakeAsync(async () => {
      const signal = sp('')
        .validate((value) => value.length > 0) 
        .validateAsync(
          spValidators.async.custom(async (value: string) => {
            return value.length >= 3;
          }),
        )
        .build();
      signal.setValue('hi');
      tick(100);
      expect(signal.isValid()).toBe(true); 
      expect(signal.asyncErrors().length).toBe(1); 
      signal.setValue('hello');
      tick(100);
      expect(signal.isValid()).toBe(true);
      expect(signal.asyncErrors()).toEqual([]);
    }));
  });

  describe('integration with spForm', () => {
    it('should support async validators in spForm.text', fakeAsync(async () => {
      const username = spForm.text('', {
        asyncValidators: [
          spValidators.async.unique(async (value: string) => {
            return value !== 'taken';
          }),
        ],
      });
      username.setValue('available');
      tick(100);
      expect(username.isValidating()).toBe(false);
      expect(username.asyncErrors()).toEqual([]);
      username.setValue('taken');
      tick(100);
      expect(username.asyncErrors().length).toBe(1);
    }));

    it('should support async validators in spForm.email', fakeAsync(async () => {
      const email = spForm.email('', {
        asyncValidators: [
          spValidators.async.custom(async (value: string) => {
            return !value.includes('spam');
          }),
        ],
      });
      email.setValue('valid@example.com');
      tick(100);
      expect(email.asyncErrors()).toEqual([]);
      email.setValue('spam@example.com');
      tick(100);
      expect(email.asyncErrors().length).toBe(1);
    }));

    it('should support async validators in spForm.number', fakeAsync(async () => {
      const age = spForm.number({
        asyncValidators: [
          spValidators.async.custom(async (value: number) => {
            return value >= 18;
          }),
        ],
      });
      age.setValue(25);
      tick(100);
      expect(age.asyncErrors()).toEqual([]);
      age.setValue(15);
      tick(100);
      expect(age.asyncErrors().length).toBe(1);
    }));
  });

  describe('real-world scenarios', () => {
    it('should handle username availability checking', fakeAsync(async () => {
      const checkUsername = async (username: string): Promise<boolean> => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return !['admin', 'root', 'test'].includes(username);
      };
      const username = spForm.text('', {
        minLength: 3,
        asyncValidators: [spValidators.async.unique(checkUsername)],
      });
      username.setValue('john_doe');
      tick(100);
      expect(username.asyncErrors()).toEqual([]);
      username.setValue('admin');
      tick(100);
      expect(username.asyncErrors().length).toBe(1);
    }));

    it('should handle email domain validation', fakeAsync(async () => {
      const validateEmailDomain = async (email: string): Promise<boolean> => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const domain = email.split('@')[1];
        return ['gmail.com', 'yahoo.com', 'outlook.com'].includes(domain);
      };
      const email = spForm.email('', {
        asyncValidators: [spValidators.async.custom(validateEmailDomain)],
      });
      email.setValue('user@gmail.com');
      tick(100);
      expect(email.asyncErrors()).toEqual([]);
      email.setValue('user@invalid.com');
      tick(100);
      expect(email.asyncErrors().length).toBe(1);
    }));

    it('should handle credit card validation', fakeAsync(async () => {
      const validateCreditCard = async (number: string): Promise<boolean> => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const digits = number.replace(/\s/g, '');
        let sum = 0;
        let shouldDouble = false;
        for (let i = digits.length - 1; i >= 0; i--) {
          let digit = parseInt(digits[i], 10);
          if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
          shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
      };
      const cardNumber = spForm.text('', {
        asyncValidators: [spValidators.async.custom(validateCreditCard)],
      });
      cardNumber.setValue('4111111111111111');
      tick(100);
      expect(cardNumber.asyncErrors()).toEqual([]);
      cardNumber.setValue('1234567890123456');
      tick(100);
      expect(cardNumber.asyncErrors().length).toBe(1);
    }));
  });
});
