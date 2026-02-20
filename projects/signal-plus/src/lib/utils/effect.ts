import { Signal, computed, effect, signal } from '@angular/core';
import {
  SpEffectController,
  SpEffectOptions,
} from '../models/developer-experience.model';
import { safeClearTimeout, safeSetTimeout } from './platform';

export function spEffect(
  callback: () => void,
  options: SpEffectOptions = {},
): SpEffectController {
  const paused = signal(false);
  let timeoutId: number | undefined | null = null;

  const runCallback = (): void => {
    if (paused()) {
      return;
    }

    if (options.condition && !options.condition()) {
      return;
    }

    const debounce = options.debounce ?? 0;
    if (debounce > 0) {
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
      }

      timeoutId = safeSetTimeout(() => {
        timeoutId = null;
        if (paused()) {
          return;
        }
        if (options.condition && !options.condition()) {
          return;
        }
        callback();
      }, debounce);
      return;
    }

    callback();
  };

  const effectRef = effect(() => {
    runCallback();
  });

  return {
    pause: () => {
      paused.set(true);
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
        timeoutId = null;
      }
    },
    resume: () => {
      paused.set(false);
    },
    destroy: () => {
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
        timeoutId = null;
      }
      effectRef.destroy();
    },
    isPaused: computed(() => paused()) as Signal<boolean>,
  };
}
