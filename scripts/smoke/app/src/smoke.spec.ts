import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('ngx-signal-plus consumer smoke', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
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

  it('validates a form group', () => {
    expect(app.form.isValid()).toBe(false);
    app.form.setValue({ name: 'signal' });
    expect(app.form.isValid()).toBe(true);
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
