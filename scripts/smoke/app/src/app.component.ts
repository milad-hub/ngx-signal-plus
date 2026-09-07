import { Component, Signal, WritableSignal, signal } from '@angular/core';
import {
  QueryResult,
  SignalFormGroup,
  SignalPlus,
  sp,
  spCombineLatest,
  spDebounceTime,
  spDelay,
  spDistinctUntilChanged,
  spFilter,
  spFormGroup,
  spMap,
  spMerge,
  spQuery,
  spSkip,
  spTake,
  spThrottleTime,
} from 'ngx-signal-plus';

export interface SmokeForm {
  name: string;
  age: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <p id="counter">{{ counter.value }}</p>
    <p id="doubled">{{ doubled() }}</p>
    <p id="merged">{{ merged() }}</p>
    <p id="throttled">{{ throttled() }}</p>
    <p id="skipped">{{ skipped() }}</p>
    <p id="taken">{{ taken() }}</p>
    <p id="filtered">{{ filtered() }}</p>
    <p id="debounced">{{ debounced() }}</p>
    <p id="delayed">{{ delayed() }}</p>
    <p id="distinct">{{ distinct() }}</p>
    <p id="combined">{{ combined().join(',') }}</p>
    <p id="form-valid">{{ form.isValid() }}</p>
    <p id="query">{{ query.data() }}</p>
  `,
})
export class AppComponent {
  readonly source: WritableSignal<number> = signal(1);

  readonly counter: SignalPlus<number> = sp(0)
    .withHistory()
    .validate((value: number) => value >= 0)
    .build();

  readonly doubled: Signal<number> = spMap<number, number>(
    (value: number) => value * 2,
  )(this.source);

  readonly merged: Signal<number> = spMerge(this.source, signal(9));

  readonly throttled: Signal<number> = spThrottleTime<number>(20)(this.source);

  readonly skipped: Signal<number> = spSkip<number>(1)(this.source);

  readonly taken: Signal<number> = spTake<number>(2)(this.source);

  readonly filtered: Signal<number> = spFilter<number>((value: number) => value > 0)(
    this.source,
  );

  readonly debounced: Signal<number> = spDebounceTime<number>(10)(this.source);

  readonly delayed: Signal<number> = spDelay<number>(10)(this.source);

  readonly distinct: Signal<number> = spDistinctUntilChanged<number>()(
    this.source,
  );

  readonly combined: Signal<number[]> = spCombineLatest<number>([
    this.source,
    signal(2),
  ]);

  readonly form: SignalFormGroup<SmokeForm> = spFormGroup<SmokeForm>({
    name: sp('')
      .validate((value: string) => value.length > 0)
      .build(),
    age: sp(21).build(),
  });

  readonly query: QueryResult<string> = spQuery<string>({
    queryKey: ['smoke'],
    queryFn: () => Promise.resolve('ok'),
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
