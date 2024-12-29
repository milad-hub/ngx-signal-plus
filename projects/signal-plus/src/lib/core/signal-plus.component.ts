/**
 * @fileoverview Signal Plus Component
 * @description Demo component showcasing signal operator usage
 * 
 * @package ngx-signal-plus
 * @version 1.0.0
 */

import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, Injector, OnDestroy, OnInit, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';
import { SignalPlus } from '../models/signal-plus.model';
import { debounceTime } from '../operators/signal-operators';
import { SignalPlusService } from './signal-plus.service';

/**
 * Demo component that showcases various features of the signal plus
 * including basic counter functionality, derived signals, and history management.
 * 
 * @example
 * ```html
 * <lib-signal-plus></lib-signal-plus>
 * ```
 */
@Component({
  selector: 'lib-signal-plus',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (counter(); as count) {
      <div class="signal-plus-demo">
        <h3>Signal Plus Demo</h3>
        
        <div class="counter">
          <h4>Basic Counter</h4>
          <p>Current value: {{ count.value }}</p>
          <p>Previous value: {{ count.previousValue }}</p>
          <p>Is valid: {{ count.isValid() ? 'Yes' : 'No' }}</p>
          <p>Has changed: {{ count.hasChanged() ? 'Yes' : 'No' }}</p>
          
          <button (click)="increment()">Increment</button>
          <button (click)="decrement()">Decrement</button>
          <button (click)="count.reset()">Reset</button>
          <button (click)="count.undo()" [disabled]="!canUndo()">Undo</button>
          <button (click)="count.redo()" [disabled]="!canRedo()">Redo</button>
        </div>

        <div class="derived">
          <h4>Derived Values</h4>
          @if (doubled(); as d) {
            <p>Doubled: {{ d.value }}</p>
          }
          @if (debounced(); as db) {
            <p>Debounced: {{ db?.value }}</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .signal-plus-demo {
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .counter, .derived {
      margin-top: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    
    button {
      margin-right: 0.5rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
      cursor: pointer;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class SignalPlusComponent implements OnInit, OnDestroy {
  private readonly signalPlus: SignalPlusService = inject(SignalPlusService);
  private readonly injector: Injector = inject(Injector);

  // Create base signals
  private readonly counter$: WritableSignal<SignalPlus<number> | null> = signal<SignalPlus<number> | null>(null);
  private readonly doubled$: WritableSignal<number> = signal<number>(0);
  private readonly debounced$: WritableSignal<number> = signal<number>(0);

  // Create computed views
  readonly counter: Signal<SignalPlus<number> | null> = computed(() => this.counter$());
  readonly doubled: Signal<{ value: number }> = computed(() => ({ value: this.doubled$() }));
  readonly debounced: Signal<{ value: number }> = computed(() => ({ value: this.debounced$() }));

  constructor() {
    // Initialize effects in constructor
    this.initializeEffects();
  }

  private initializeEffects(): void {
    runInInjectionContext(this.injector, () => {
      // Set up doubled effect
      effect(() => {
        const plus: SignalPlus<number> | null = this.counter$();
        const value: number = plus?.value ?? 0;
        this.doubled$.set(value * 2);
      });

      // Create a source signal for the counter value
      const counterValue: Signal<number> = computed<number>(() => this.counter$()?.value ?? 0);

      // Create and subscribe to debounced signal
      const debouncedSignal: Signal<number> = debounceTime<number>(500)(counterValue);
      effect(() => {
        this.debounced$.set(debouncedSignal());
      });
    });
  }

  ngOnInit(): void {
    try {
      runInInjectionContext(this.injector, () => {
        const plus: SignalPlus<number> = this.signalPlus.create({
          initialValue: 0,
          storageKey: 'demo-counter',
          persist: true,
          validators: [value => value >= 0 && value <= 10],
          transform: value => Math.round(value)
        });

        this.counter$.set(plus);
      });
    } catch (error) {
      console.error('Failed to initialize signal plus:', error);
      this.counter$.set(null);
    }
  }

  increment(): void {
    const plus: SignalPlus<number> | null = this.counter();
    if (plus && plus.value < 10) {
      plus.update(value => Math.min(value + 1, 10));
    }
  }

  decrement(): void {
    const plus: SignalPlus<number> | null = this.counter();
    if (plus && plus.value > 0) {
      plus.update(value => Math.max(value - 1, 0));
    }
  }

  canUndo(): boolean {
    const history: number[] | undefined = this.counter()?.history();
    return history ? history.length > 1 : false;
  }

  canRedo(): boolean {
    const counter: SignalPlus<number> | null = this.counter();
    if (!counter) return false;

    const history: number[] = counter.history();
    return history.length > 0 && counter.hasChanged();
  }

  ngOnDestroy(): void {
    this.counter$.set(null);
  }
}
