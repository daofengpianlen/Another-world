import type { InjectionKey, Ref } from 'vue';

export interface GalFullscreenContext {
  is_fullscreen: Ref<boolean>;
  is_expanded: Ref<boolean>;
  toggle_fullscreen: () => Promise<void>;
}

export const GAL_FULLSCREEN_KEY: InjectionKey<GalFullscreenContext> = Symbol('galFullscreen');

export function is_gal_browser_fullscreen(): boolean {
  try {
    if (document.fullscreenElement) return true;
    if (window.parent !== window && window.parent.document.fullscreenElement === window.frameElement) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
