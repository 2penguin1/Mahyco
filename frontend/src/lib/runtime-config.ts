export interface AppConfig {
  API_URL: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

function readRuntime(): Partial<AppConfig> {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }
  return {};
}

function readBuild(): Partial<AppConfig> {
  return {
    API_URL: import.meta.env.VITE_API_URL,
  };
}

const runtime = readRuntime();
const build = readBuild();

export const appConfig: AppConfig = {
  API_URL: runtime.API_URL || build.API_URL || 'http://127.0.0.1:8000/api',
};
