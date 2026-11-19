import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const appEnv = process.env.APP_ENV ?? process.env.EAS_BUILD_PROFILE ?? 'development';
const isProduction = appEnv === 'production';
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';

function assertHttps(url: string | undefined): void {
  if (!url) {
    throw new Error(
      'EXPO_PUBLIC_API_URL es obligatoria en producción. Defínela como variable de entorno de EAS (environment "production").',
    );
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error(`EXPO_PUBLIC_API_URL debe usar https en producción (recibido: ${url}).`);
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (isProduction) {
    assertHttps(process.env.EXPO_PUBLIC_API_URL);
    if (process.env.EXPO_PUBLIC_SOCKET_URL) assertHttps(process.env.EXPO_PUBLIC_SOCKET_URL);
  }

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      const options = plugin[1] as { android?: Record<string, unknown>; ios?: Record<string, unknown> };
      return [
        'expo-build-properties',
        {
          ...options,
          android: { ...options.android, usesCleartextTraffic: !isProduction },
        },
      ] as const;
    }
    return plugin;
  });

  return {
    ...config,
    name: config.name ?? 'Maminco',
    slug: config.slug ?? 'maminco',
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: !isProduction },
      },
    },
    android: {
      ...config.android,
      ...(existsSync(googleServicesFile) ? { googleServicesFile } : {}),
    },
    plugins: plugins as ExpoConfig['plugins'],
    extra: {
      ...config.extra,
      appEnv,
      eas: {
        ...config.extra?.eas,
        projectId: config.extra?.eas?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
    },
  };
};
