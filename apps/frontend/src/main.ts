import { bootstrapApplication } from '@angular/platform-browser';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeEsCl);

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    { provide: LOCALE_ID, useValue: 'es-CL' },
  ],
}).catch((err) => console.error(err));
