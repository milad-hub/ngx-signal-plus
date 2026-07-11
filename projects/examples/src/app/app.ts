import { Component, computed, signal } from '@angular/core';
import {
  enhance,
  createDependentQuery,
  formatSpError,
  spAll,
  sp,
  spAny,
  spAsync,
  spBatch,
  spCombine,
  spCombineLatest,
  spCollection,
  spComputed,
  spCounter,
  spCreateError,
  spDebounceTime,
  spDebug,
  spDelay,
  spDistinctUntilChanged,
  spEffect,
  spFilter,
  spForm,
  spFormGroup,
  spGetMiddlewareCount,
  spGetModifiedSignals,
  spInfiniteQuery,
  spIsInBatch,
  spIsInTransaction,
  spIsTransactionActive,
  spLoggerMiddleware,
  spMap,
  spMerge,
  spMonitor,
  spMutation,
  spPresets,
  spQuery,
  spSchema,
  spSchemaValidator,
  spSchemaWithErrors,
  spSkip,
  spStorageManager,
  spTake,
  spThrottleTime,
  spTransaction,
  spToggle,
  spUseMiddleware,
  spValidators,
} from 'signal-plus';
import type { SpErrorCode } from 'signal-plus';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.component.css',
})
export class App {
  public readonly counter = sp(0)
    .validate((value) => value >= 0)
    .persist('examples-counter')
    .withHistory(20)
    .build();
  public readonly doubled = computed(() => this.counter.value * 2);
  public readonly todos = spCollection<{
    id: string;
    title: string;
    completed: boolean;
  }>({
    idField: 'id',
    initialValue: [],
    persist: 'examples-todos',
    withHistory: true,
  });
  public readonly activeTodos = computed(() =>
    this.todos.value().filter((todo) => !todo.completed),
  );
  public readonly completedTodos = computed(() =>
    this.todos.value().filter((todo) => todo.completed),
  );
  public readonly todoFilter = signal<'all' | 'active' | 'completed'>('all');
  public readonly filteredTodos = computed(() => {
    if (this.todoFilter() === 'active') return this.activeTodos();
    if (this.todoFilter() === 'completed') return this.completedTodos();
    return this.todos.value();
  });
  public readonly name = sp('')
    .validate((value) => value.trim().length > 0)
    .build();
  public readonly email = sp('')
    .validate((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
    .build();
  public readonly age = sp(18)
    .validate((value) => value >= 18 && value <= 120)
    .build();
  public readonly profile = spFormGroup({
    name: this.name,
    email: this.email,
    age: this.age,
  });
  public readonly formMessage = signal('');
  public readonly editor = sp('Draft settings').withHistory(10).build();
  public readonly asyncMessage = spAsync({
    initialValue: 'Not loaded',
    fetcher: () => this._delay('Loaded from a deterministic local mock'),
    cacheTime: 5_000,
  });
  public readonly query = spQuery<string>({
    queryKey: ['examples', 'message'],
    queryFn: () => this._delay('Query result from a deterministic local mock'),
    retry: 1,
  });
  public readonly mutation = spMutation<string, string>({
    mutationFn: (message) => this._delay(message),
  });
  public readonly cart = sp<
    { id: string; name: string; price: number; quantity: number }[]
  >([])
    .persist('examples-cart')
    .build();
  public readonly cartCount = computed(() =>
    this.cart.value.reduce((total, item) => total + item.quantity, 0),
  );
  public readonly cartSubtotal = computed(() =>
    this.cart.value.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    ),
  );
  public readonly nativeSource = signal(1);
  public readonly enhancedNative = enhance(this.nativeSource)
    .withHistory(5)
    .build();
  public readonly combined = spCombine(
    [this.nativeSource],
    (value) => value * 2,
  );
  public readonly allPositive = spAll([
    computed(() => this.counter.value >= 0),
  ]);
  public readonly derivedCounter = spComputed(() => this.counter.value * 3);
  public readonly infiniteQuery = spInfiniteQuery<number, number>({
    queryKey: ['examples', 'pages'],
    initialPageParam: 1,
    queryFn: async (page) => page,
    getNextPageParam: (page) => (page < 3 ? page + 1 : undefined),
  });
  public readonly dependentQuery = createDependentQuery(
    ['examples', 'dependent'],
    () => this._delay(`Dependent value ${this.nativeSource()}`),
    [this.nativeSource],
  );
  public readonly featureToggle = spToggle(false, 'examples-feature-toggle');
  public readonly schemaCheck = spSchemaValidator<{ name: string }>({
    safeParse: (value) =>
      value.name.length > 0
        ? { success: true, data: value }
        : { success: false, error: { message: 'Name is required' } },
  });
  public readonly effectController = spEffect(() => this.counter.value);
  public readonly searchTerm = signal('');
  public readonly debouncedSearch = spDistinctUntilChanged<string>()(
    spDebounceTime<string>(300)(this.searchTerm),
  );
  public readonly shoutedSearch = spMap((value: string) =>
    value.toUpperCase(),
  )(this.debouncedSearch);
  public readonly longSearch = spFilter((value: string) => value.length >= 3)(
    this.searchTerm,
  );
  public readonly pulse = signal(0);
  public readonly throttledPulse = spThrottleTime<number>(1_000)(this.pulse);
  public readonly delayedPulse = spDelay<number>(600)(this.pulse);
  public readonly pulseAfterTwo = spSkip<number>(2)(this.pulse);
  public readonly firstThreePulses = spTake<number>(3)(this.pulse);
  public readonly mergedStreams = spMerge(this.pulse, this.nativeSource);
  public readonly latestPair = spCombineLatest([this.pulse, this.nativeSource]);
  public readonly anyActive = spAny([
    computed(() => this.pulse() > 0),
    computed(() => this.counter.value > 0),
  ]);
  public readonly boundedCounter = spCounter(5, { min: 0, max: 10 });
  public readonly username = spForm.text('', { minLength: 3, maxLength: 12 });
  public readonly contactEmail = spForm.email('');
  public readonly searchPreset = spPresets.searchField().build();
  public readonly score = sp(50)
    .validate(spValidators.number.range(0, 100))
    .withHistory(5)
    .build();
  public readonly scoreSchemaValid = spSchema<number>({
    safeParse: (value) =>
      Number.isFinite(value)
        ? { success: true, data: value }
        : { success: false, error: { message: 'Score must be a number' } },
  });
  public readonly usernameSchema = spSchemaWithErrors<{ name: string }>({
    safeParse: (value) =>
      value.name.trim().length >= 3
        ? { success: true, data: value }
        : {
            success: false,
            error: { message: 'Name must be at least 3 characters' },
          },
  });
  public readonly errorReport = signal('');
  public readonly transactionInfo = signal('');
  public readonly storageInfo = signal('');

  constructor() {
    spDebug.trackSignal('examples-counter', this.counter.value);
    spMonitor.trackSignal('examples-counter');
    spUseMiddleware(spLoggerMiddleware('[examples]'));
  }

  public changeCounter(change: number): void {
    this.counter.setValue(this.counter.value + change);
    spDebug.recordUpdate('examples-counter', this.counter.value);
    spMonitor.recordUpdate('examples-counter', 1);
  }

  public addTodo(title: string): void {
    if (title.trim()) {
      this.todos.add({
        id: crypto.randomUUID(),
        title: title.trim(),
        completed: false,
      });
    }
  }

  public updateProfile(name: string, email: string, age: number): void {
    try {
      spTransaction(() => {
        this.name.setValue(name);
        this.email.setValue(email);
        this.age.setValue(age);
      });
      this.formMessage.set('Profile submitted.');
    } catch (error) {
      this.formMessage.set(
        error instanceof Error ? error.message : 'Invalid form values.',
      );
    }
  }

  public editTodo(id: string, title: string): void {
    if (title.trim()) this.todos.update(id, { title: title.trim() });
  }

  public addCartItem(): void {
    spBatch(() => {
      this.cart.setValue([
        ...this.cart.value,
        { id: crypto.randomUUID(), name: 'Notebook', price: 8, quantity: 1 },
      ]);
    });
  }

  public updateCartQuantity(id: string, change: number): void {
    this.cart.setValue(
      this.cart.value
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + change } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  public incrementNativeSource(): void {
    this.nativeSource.update((value) => value + 1);
  }

  public sendPulse(): void {
    this.pulse.update((value) => value + 1);
  }

  public setUsername(value: string): void {
    try {
      this.username.setValue(value);
    } catch {
      // Validators throw on invalid input; keep the last valid value.
    }
  }

  public setContactEmail(value: string): void {
    try {
      this.contactEmail.setValue(value);
    } catch {
      // Validators throw on invalid input; keep the last valid value.
    }
  }

  public bumpBounded(change: number): void {
    try {
      this.boundedCounter.setValue(this.boundedCounter.value + change);
      this.errorReport.set('');
    } catch (error) {
      const spError = spCreateError(
        'VAL_001' as SpErrorCode,
        { currentValue: this.boundedCounter.value },
        error instanceof Error ? error.message : 'Validation failed',
      );
      this.errorReport.set(
        formatSpError(
          spError.code,
          spError.message,
          spError.context,
          spError.suggestion,
        ),
      );
    }
  }

  public runIntrospectedTransaction(): void {
    spTransaction(() => {
      this.counter.setValue(this.counter.value + 1);
      this.transactionInfo.set(
        `transactionActive: ${spIsTransactionActive()} | counter in transaction: ${spIsInTransaction(this.counter)} | inBatch: ${spIsInBatch()} | modified signals: ${spGetModifiedSignals().length} | middleware count: ${spGetMiddlewareCount()}`,
      );
    });
  }

  public saveSnapshot(): void {
    spStorageManager.save('examples-snapshot', {
      counter: this.counter.value,
      savedAt: new Date().toISOString(),
    });
    this.storageInfo.set('Snapshot saved to localStorage.');
  }

  public loadSnapshot(): void {
    const snapshot = spStorageManager.load<{
      counter: number;
      savedAt: string;
    }>('examples-snapshot');
    this.storageInfo.set(
      snapshot
        ? `Loaded counter ${snapshot.counter}, saved ${snapshot.savedAt}`
        : 'No snapshot found yet.',
    );
  }

  public debugState(): string {
    return JSON.stringify(spDebug.exportState());
  }

  public monitorState(): string {
    return String(spMonitor.exportMetrics('json'));
  }

  private _delay(value: string): Promise<string> {
    return new Promise((resolve) => setTimeout(() => resolve(value), 250));
  }
}
