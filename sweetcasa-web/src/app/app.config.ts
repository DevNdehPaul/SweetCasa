import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes as any,
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({scrollPositionRestoration:'top'})
    ),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
