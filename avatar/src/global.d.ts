export {};

declare global {
  interface Window {
    acquireVsCodeApi?: () => {
      postMessage(message: unknown): void;
    };
    __SATI_AVATAR_MODEL_URL__?: string;
  }

  interface ImportMetaEnv {
    readonly VITE_AVATAR_MODEL_URL?: string;
  }
}
