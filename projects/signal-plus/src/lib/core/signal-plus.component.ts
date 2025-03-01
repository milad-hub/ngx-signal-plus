/**
 * @fileoverview SignalPlus Demo Component
 * @description A standalone component that demonstrates the core features of the SignalPlus library.
 * This component serves as both documentation and a testing ground for the library's functionality.
 * 
 * Features demonstrated:
 * - Basic signal presets (counter, toggle)
 * - Form input handling with validation
 * - Persistent storage integration
 * - History tracking and undo/redo
 * - Debounced search functionality
 * 
 * @example
 * ```typescript
 * // Standalone component usage
 * @Component({
 *   imports: [SignalPlusComponent]
 * })
 * 
 * // Or in NgModule
 * @NgModule({
 *   imports: [SignalPlusComponent]
 * })
 * ```
 */

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SignalPlus } from '../models/signal-plus.model';
import { SignalPlusService } from './signal-plus.service';
import { sp, spCounter, spForm, spToggle } from '../utils/create';
import { SignalBuilder } from '../core/signal-builder';

/**
 * Demo component showcasing SignalPlus features and usage patterns.
 * Provides interactive examples of different signal types and configurations.
 */
@Component({
  selector: 'lib-signal-plus',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="signal-plus-demo">
      <h3>Signal Plus Demo</h3>
      
      <div class="counter">
        <h4>Basic Counter (Preset)</h4>
        <p>Current value: {{ counter.value }}</p>
        <p>Previous value: {{ counter.previousValue }}</p>
        <p>Is valid: {{ counter.isValid() ? 'Yes' : 'No' }}</p>
        
        <button (click)="increment()">Increment</button>
        <button (click)="decrement()">Decrement</button>
        <button (click)="counter.reset()">Reset</button>
        <button (click)="counter.undo()" [disabled]="!canUndo()">Undo</button>
      </div>

      <div class="form">
        <h4>Text Input (Simple Creation)</h4>
        <input [value]="input.value" 
               (input)="handleInput($event)"
               placeholder="Type here...">
        <p class="hint">Value updates after 300ms of inactivity</p>
      </div>

      <div class="amount">
        <h4>Amount Input (Builder Pattern)</h4>
        <p>Value: {{ amount.value }}</p>
        <input type="number" 
               [value]="amount.value"
               [class.invalid]="!amount.isValid()"
               (input)="updateAmount($event)">
        @if (!amount.isValid()) {
          <p class="error-message">Value must be between 0 and 10</p>
        }
      </div>

      <div class="toggle">
        <h4>Theme Toggle (Persistent)</h4>
        <button (click)="onThemeChange()">
          {{ darkMode.value ? 'Dark' : 'Light' }} Mode
        </button>
      </div>

      <div class="search">
        <h4>Search Input (Debounced)</h4>
        <input [value]="search.value"
               (input)="onSearch($event)"
               placeholder="Search...">
        <p class="hint">Last search: {{ search.value }}</p>
      </div>
    </div>
  `,
  styles: [`
    .signal-plus-demo {
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .counter, .form, .amount {
      margin-top: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    
    input {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 100%;
      max-width: 300px;
    }

    input:focus {
      outline: none;
      border-color: #007bff;
    }

    input.invalid {
      border-color: #dc3545;
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

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
  `]
})
export class SignalPlusComponent {
  /** Service instance for creating and managing signals */
  private readonly signalPlus: SignalPlusService = inject(SignalPlusService);

  /**
   * Basic counter with integer validation and history tracking.
   * Demonstrates the simplest usage pattern with presets.
   * Features:
   * - Integer validation
   * - History tracking for undo
   * - Reset capability
   */
  readonly counter = spCounter(0, { min: 0 });

  /**
   * Text input with debounce and persistence.
   * Shows how to handle form inputs with automatic storage.
   * Features:
   * - Debounced updates (300ms)
   * - Persistent storage
   * - Automatic value sync
   */
  readonly input = spForm.text('', { 
    minLength: 3,
    debounce: 300
  });

  /**
   * Number input with range validation.
   * Demonstrates validation and error handling.
   * Features:
   * - Range validation (0-10)
   * - Error state handling
   * - Visual feedback
   */
  readonly amount = new SignalBuilder(0)
    .validate((value: number) => value >= 0 && value <= 10)
    .onError((error: Error) => {
        console.error(error);
    })
    .build();

  /**
   * Theme toggle with persistent storage.
   * Shows how to maintain state across page reloads.
   * Features:
   * - Boolean state management
   * - Local storage persistence
   * - Immediate UI updates
   */
  readonly darkMode = spToggle(false, 'theme-mode');

  /**
   * Search field with debounce and distinct values.
   * Demonstrates time-based operations and duplicate filtering.
   * Features:
   * - Debounced input
   * - Distinct value filtering
   * - Real-time updates
   */
  readonly search = spForm.text('', {
    debounce: 300,
    minLength: 2
  });

  /**
   * Increments the counter value.
   * Uses update pattern for atomic operations.
   * Ensures thread-safe value updates.
   */
  increment(): void {
    this.counter.update((value: number) => value + 1);
  }

  /**
   * Decrements the counter value.
   * Uses update pattern for atomic operations.
   * Ensures thread-safe value updates.
   */
  decrement(): void {
    this.counter.update((value: number) => value - 1);
  }

  /**
   * Handles text input changes with type safety.
   * @param event Input event from text field
   * Automatically debounces updates and persists value.
   */
  handleInput(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.input.setValue(target.value);
  }

  /**
   * Updates amount with validation.
   * @param event Input event from number field
   * Validates range and provides error feedback.
   */
  updateAmount(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const value: number = +target.value;
    try {
        this.amount.setValue(value);
    } catch (error) {
        console.error(error);
    }
  }

  /**
   * Handles search input with debounce.
   * @param event Input event from search field
   * Provides real-time search functionality with performance optimization.
   */
  onSearch(event: Event): void {
    const value: string = (event.target as HTMLInputElement).value;
    this.search.setValue(value);
  }

  /**
   * Toggles theme mode with persistence.
   * Uses update pattern for boolean toggle.
   * Automatically persists preference to localStorage.
   */
  onThemeChange(): void {
    this.darkMode.update((value: boolean) => !value);
  }

  /**
   * Checks if undo operation is available.
   * @returns boolean indicating if undo is possible
   * Ensures undo button is disabled when no history exists.
   */
  canUndo(): boolean {
    return this.counter.history().length > 1;
  }
}