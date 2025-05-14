import type { RouteMeta as IRouteMeta } from '@vatic-core/typings';

import 'vue-router';

declare module 'vue-router' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RouteMeta extends IRouteMeta {}
}

export interface VaticAdminProAppConfigRaw {
  VITE_GLOB_API_URL: string;
}

export interface ApplicationConfig {
  apiURL: string;
}

declare global {
  interface Window {
    _VATIC_ADMIN_PRO_APP_CONF_: VaticAdminProAppConfigRaw;
  }
}
