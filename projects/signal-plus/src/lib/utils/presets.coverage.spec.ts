import { presets } from './presets';

describe('presets gap behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should default persistentToggle initial value to false', () => {
    const toggle = presets
      .persistentToggle(undefined, 'coverage-toggle-key')
      .build();
    expect(toggle.value).toBe(false);
    toggle.destroy();
  });
});
