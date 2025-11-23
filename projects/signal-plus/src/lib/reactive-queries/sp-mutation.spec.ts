import { QueryClient, setGlobalQueryClient } from './query-client';
import { createMutation, spMutation } from './sp-mutation';

describe('spMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    setGlobalQueryClient(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should create a mutation with basic options', (done) => {
    const testData = { result: 'success' };
    const variables = { input: 'test' };
    const mutation = spMutation({
      mutationFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return testData;
      },
    });
    expect(mutation).toBeDefined();
    expect(mutation.data).toBeDefined();
    expect(mutation.isLoading).toBeDefined();
    expect(mutation.error).toBeDefined();
    expect(mutation.mutate).toBeDefined();
    expect(mutation.mutateAsync).toBeDefined();
    expect(mutation.reset).toBeDefined();
    mutation.mutate(variables).then((result) => {
      expect(result).toEqual(testData);
      expect(mutation.data()).toEqual(testData);
      expect(mutation.isLoading()).toBe(false);
      expect(mutation.isSuccess()).toBe(true);
      expect(mutation.error()).toBeNull();
      expect(mutation.variables()).toEqual(variables);
      done();
    });
  });

  it('should handle mutation errors', (done) => {
    const errorMessage = 'Mutation failed';
    const variables = { input: 'test' };
    const mutation = spMutation({
      mutationFn: async () => {
        throw new Error(errorMessage);
      },
    });
    mutation.mutate(variables).catch((error) => {
      expect(error).toEqual(new Error(errorMessage));
      expect(mutation.isError()).toBe(true);
      expect(mutation.error()).toEqual(new Error(errorMessage));
      expect(mutation.isLoading()).toBe(false);
      expect(mutation.variables()).toEqual(variables);
      done();
    });
  });

  it('should handle onSuccess callback', (done) => {
    const testData = { result: 'success' };
    const variables = { input: 'test' };
    let callbackCalled = false;
    const mutation = spMutation({
      mutationFn: async () => testData,
      onSuccess: (data, vars) => {
        callbackCalled = true;
        expect(data).toEqual(testData);
        expect(vars).toEqual(variables);
      },
    });
    mutation.mutate(variables).then(() => {
      expect(callbackCalled).toBe(true);
      done();
    });
  });

  it('should handle onError callback', (done) => {
    const errorMessage = 'Mutation failed';
    const variables = { input: 'test' };
    let callbackCalled = false;
    const mutation = spMutation({
      mutationFn: async () => {
        throw new Error(errorMessage);
      },
      onError: (error, vars) => {
        callbackCalled = true;
        expect(error).toEqual(new Error(errorMessage));
        expect(vars).toEqual(variables);
      },
    });
    mutation.mutate(variables).catch(() => {
      expect(callbackCalled).toBe(true);
      done();
    });
  });

  it('should handle onSettled callback', (done) => {
    const testData = { result: 'success' };
    const variables = { input: 'test' };
    let callbackCalled = false;
    const mutation = spMutation({
      mutationFn: async () => testData,
      onSettled: (data, error, vars) => {
        callbackCalled = true;
        expect(data).toEqual(testData);
        expect(error).toBeNull();
        expect(vars).toEqual(variables);
      },
    });
    mutation.mutate(variables).then(() => {
      expect(callbackCalled).toBe(true);
      done();
    });
  });

  it('should handle onMutate callback', (done) => {
    const testData = { result: 'success' };
    const variables = { input: 'test' };
    let mutateCalled = false;
    const mutation = spMutation({
      mutationFn: async () => testData,
      onMutate: async (vars) => {
        mutateCalled = true;
        expect(vars).toEqual(variables);
      },
    });
    mutation.mutate(variables).then(() => {
      expect(mutateCalled).toBe(true);
      done();
    });
  });

  it('should prevent concurrent mutations', (done) => {
    let callCount = 0;
    const mutation = spMutation({
      mutationFn: async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { count: callCount };
      },
    });
    const variables = { input: 'test' };
    const promise1 = mutation.mutate(variables);
    const promise2 = mutation.mutate(variables);
    expect(promise1).toBe(promise2);
    Promise.all([promise1, promise2]).then(([result1, result2]) => {
      expect(result1).toEqual({ count: 1 });
      expect(result2).toEqual({ count: 1 });
      expect(callCount).toBe(1);
      done();
    });
  });

  it('should support reset functionality', (done) => {
    const testData = { result: 'success' };
    const variables = { input: 'test' };
    const mutation = spMutation({
      mutationFn: async () => testData,
    });
    mutation.mutate(variables).then(() => {
      expect(mutation.data()).toEqual(testData);
      expect(mutation.isSuccess()).toBe(true);
      mutation.reset();
      expect(mutation.data()).toBeUndefined();
      expect(mutation.isIdle()).toBe(true);
      expect(mutation.isSuccess()).toBe(false);
      expect(mutation.error()).toBeNull();
      expect(mutation.variables()).toBeUndefined();
      done();
    });
  });

  it('should handle retry logic', (done) => {
    let attempts = 0;
    const mutation = spMutation({
      mutationFn: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return { success: true };
      },
      retry: 3,
      retryDelay: 10,
    });
    mutation.mutate({ input: 'test' }).then((result) => {
      expect(result).toEqual({ success: true });
      expect(mutation.isSuccess()).toBe(true);
      expect(attempts).toBe(3);
      done();
    });
  });

  it('should create mutation with createMutation helper', (done) => {
    const testData = { result: 'helper' };
    const variables = { input: 'test' };
    const mutation = createMutation(async () => testData, {
      retry: 2,
    });
    mutation.mutate(variables).then((result) => {
      expect(result).toEqual(testData);
      expect(mutation.isSuccess()).toBe(true);
      done();
    });
  });

  it('should handle mutate and mutateAsync as aliases', (done) => {
    const testData = { result: 'alias' };
    const variables = { input: 'test' };
    const mutation = spMutation({
      mutationFn: async () => testData,
    });
    expect(mutation.mutate).toBe(mutation.mutateAsync);
    mutation.mutateAsync(variables).then((result) => {
      expect(result).toEqual(testData);
      done();
    });
  });

  it('should handle multiple mutations sequentially', (done) => {
    let callCount = 0;
    const mutation = spMutation({
      mutationFn: async (vars: { value: number }) => {
        callCount++;
        return { count: callCount, value: vars.value };
      },
    });
    mutation
      .mutate({ value: 1 })
      .then((result1) => {
        expect(result1).toEqual({ count: 1, value: 1 });
        return mutation.mutate({ value: 2 });
      })
      .then((result2) => {
        expect(result2).toEqual({ count: 2, value: 2 });
        expect(callCount).toBe(2);
        done();
      });
  });
});
