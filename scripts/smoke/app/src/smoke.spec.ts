import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSignalPlus, SignalPlusScope } from 'ngx-signal-plus';
import { AppComponent } from './app.component';

describe('ngx-signal-plus consumer smoke', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideSignalPlus()],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('constructs every public primitive without throwing', () => {
    expect(app.counter.value).toBe(0);
    expect(app.doubled()).toBe(2);
    expect(() => app.merged()).not.toThrow();
    expect(() => app.throttled()).not.toThrow();
    expect(() => app.skipped()).not.toThrow();
    expect(() => app.taken()).not.toThrow();
    expect(() => app.filtered()).not.toThrow();
    expect(() => app.debounced()).not.toThrow();
    expect(() => app.delayed()).not.toThrow();
    expect(() => app.distinct()).not.toThrow();
    expect(() => app.combined()).not.toThrow();
  });

  it('runs every exported operator', () => {
    expect(app.doubled()).toBe(2);
    expect(app.merged()).toBe(9);
    expect(app.throttled()).toBe(1);
    expect(app.skipped()).toBe(1);
    expect(app.taken()).toBe(1);
    expect(app.filtered()).toBe(1);
    expect(app.debounced()).toBe(1);
    expect(app.delayed()).toBe(1);
    expect(app.distinct()).toBe(1);
    expect(app.combined()).toEqual([1, 2]);

    app.source.set(3);
    fixture.detectChanges();

    expect(app.doubled()).toBe(6);
    expect(app.filtered()).toBe(3);
    expect(app.distinct()).toBe(3);
    expect(app.combined()).toEqual([3, 2]);
  });

  it('records history and undoes a write', () => {
    app.counter.setValue(5);
    expect(app.counter.value).toBe(5);
    app.counter.undo();
    expect(app.counter.value).toBe(0);
  });

  it('propagates a source change through an operator', () => {
    app.source.set(4);
    fixture.detectChanges();
    expect(app.doubled()).toBe(8);
  });

  it('propagates through the effect-backed operators', () => {
    expect(app.merged()).toBe(9);
    expect(app.throttled()).toBe(1);
    expect(app.skipped()).toBe(1);
    expect(app.taken()).toBe(1);

    app.source.set(7);
    fixture.detectChanges();

    expect(app.merged()).toBe(7);
    expect(app.skipped()).toBe(7);
    expect(app.taken()).toBe(7);
  });

  it('validates a form group', () => {
    expect(app.form.isValid()).toBe(false);
    app.form.setValue({ name: 'signal' });
    expect(app.form.isValid()).toBe(true);
  });

  it('scopes library state to the injector', () => {
    const scope = TestBed.inject(SignalPlusScope);

    expect(scope).toBeTruthy();
    expect(scope.queryClient).toBeTruthy();
    expect(app.counter._scope).toBe(scope);
  });

  it('resolves a query', async () => {
    await expectAsync(app.query.refetch()).toBeResolvedTo('ok');
    expect(app.query.data()).toBe('ok');
  });

  it('renders the library values into the template', () => {
    const text: string =
      (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('0');
    expect(text).toContain('2');
  });
});
