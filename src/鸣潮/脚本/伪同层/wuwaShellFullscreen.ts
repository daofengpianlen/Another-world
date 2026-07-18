import type { Ref } from 'vue';
import {
  exitWuwaBrowserFullscreen,
  isWuwaBrowserFullscreen,
  requestWuwaBrowserFullscreen,
} from '../../shared/wuwaFullscreenHandoff';

export type WuwaShellFullscreenOptions = {
  on_layout_change?: (active: boolean) => void;
};

/** 伪同层统一 iframe 内全屏（开场 + GAL 共用，无需 handoff） */
export function useWuwaShellFullscreen(
  shell_ref: Ref<HTMLElement | null>,
  options: WuwaShellFullscreenOptions = {},
) {
  const is_fullscreen = ref(false);
  const is_expanded = ref(false);

  function notifyLayout(active: boolean) {
    options.on_layout_change?.(active);
    requestAnimationFrame(() => options.on_layout_change?.(active));
    window.setTimeout(() => options.on_layout_change?.(active), 120);
    window.setTimeout(() => options.on_layout_change?.(active), 320);
  }

  async function exit_fullscreen() {
    is_expanded.value = false;
    is_fullscreen.value = false;
    await exitWuwaBrowserFullscreen();
    notifyLayout(false);
  }

  async function enter_fullscreen() {
    is_fullscreen.value = true;
    is_expanded.value = true;
    notifyLayout(true);

    try {
      await requestWuwaBrowserFullscreen(shell_ref.value);
    } catch {
      /* 云酒馆可能禁止原生全屏，保留 expanded 铺满视口 */
    }

    if (!isWuwaBrowserFullscreen()) {
      is_expanded.value = true;
    }

    is_fullscreen.value = true;
    notifyLayout(true);
  }

  async function toggle_fullscreen() {
    if (is_fullscreen.value) {
      await exit_fullscreen();
      return;
    }
    await enter_fullscreen();
  }

  function on_fullscreen_change() {
    if (isWuwaBrowserFullscreen()) {
      is_fullscreen.value = true;
      is_expanded.value = true;
      notifyLayout(true);
      return;
    }
    if (is_expanded.value) {
      is_fullscreen.value = true;
      notifyLayout(true);
      return;
    }
    is_fullscreen.value = false;
    notifyLayout(false);
  }

  function bindFullscreenListeners() {
    $(document).on('fullscreenchange.wuwaShell webkitfullscreenchange.wuwaShell', on_fullscreen_change);
    try {
      if (window.parent !== window) {
        window.parent.document.addEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.addEventListener('webkitfullscreenchange', on_fullscreen_change);
      }
    } catch {
      /* ignore */
    }
  }

  function unbindFullscreenListeners() {
    $(document).off('fullscreenchange.wuwaShell webkitfullscreenchange.wuwaShell');
    try {
      if (window.parent !== window) {
        window.parent.document.removeEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.removeEventListener('webkitfullscreenchange', on_fullscreen_change);
      }
    } catch {
      /* ignore */
    }
  }

  onMounted(bindFullscreenListeners);
  onUnmounted(() => {
    unbindFullscreenListeners();
    void exit_fullscreen();
  });

  return { is_fullscreen, is_expanded, toggle_fullscreen };
}
