import { bootstrapApplication } from '@angular/platform-browser';
import { provideSignalPlus } from 'ngx-signal-plus';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [provideSignalPlus()],
}).catch((error: unknown) => {
  console.error(error);
});
