import type { InjectionKey, Ref } from 'vue';

export interface WuwaShellFullscreenContext {
  is_fullscreen: Ref<boolean>;
  is_expanded: Ref<boolean>;
  toggle_fullscreen: () => void | Promise<void>;
}

export const WUWA_SHELL_FULLSCREEN_KEY: InjectionKey<WuwaShellFullscreenContext> = Symbol('wuwaShellFullscreen');
