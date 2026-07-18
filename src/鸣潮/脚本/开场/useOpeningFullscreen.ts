import type { Ref } from 'vue';
import {
  clearWuwaFullscreenHandoff,
  exitWuwaBrowserFullscreen,
  isWuwaBrowserFullscreen,
  markWuwaFullscreenHandoff,
  requestWuwaBrowserFullscreen,
} from '../../shared/wuwaFullscreenHandoff';

export function useOpeningFullscreen(shell_ref: Ref<HTMLElement | null>) {
  const is_fullscreen = ref(false);
  const is_expanded = ref(false);

  async function exit_fullscreen() {
    is_expanded.value = false;
    await exitWuwaBrowserFullscreen();
  }

  async function toggle_fullscreen() {
    if (is_fullscreen.value) {
      is_fullscreen.value = false;
      clearWuwaFullscreenHandoff();
      await exit_fullscreen();
      return;
    }

    is_fullscreen.value = true;
    const browser_ok = await requestWuwaBrowserFullscreen(shell_ref.value);
    if (browser_ok) {
      is_expanded.value = false;
      markWuwaFullscreenHandoff('browser');
      return;
    }

    is_expanded.value = true;
    markWuwaFullscreenHandoff('expanded');
  }

  function on_fullscreen_change() {
    if (isWuwaBrowserFullscreen()) {
      is_fullscreen.value = true;
      is_expanded.value = false;
      return;
    }
    if (is_expanded.value) {
      is_fullscreen.value = true;
      return;
    }
    is_fullscreen.value = false;
  }

  onMounted(() => {
    $(document).on('fullscreenchange.wuwaOpening webkitfullscreenchange.wuwaOpening', on_fullscreen_change);
    try {
      if (window.parent !== window) {
        window.parent.document.addEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.addEventListener('webkitfullscreenchange', on_fullscreen_change);
      }
    } catch {
      /* ignore */
    }
  });

  onUnmounted(() => {
    $(document).off('fullscreenchange.wuwaOpening webkitfullscreenchange.wuwaOpening');
    try {
      if (window.parent !== window) {
        window.parent.document.removeEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.removeEventListener('webkitfullscreenchange', on_fullscreen_change);
      }
    } catch {
      /* ignore */
    }

    if (is_fullscreen.value) {
      markWuwaFullscreenHandoff(is_expanded.value ? 'expanded' : 'browser');
      return;
    }

    clearWuwaFullscreenHandoff();
    void exit_fullscreen();
  });

  return { is_fullscreen, is_expanded, toggle_fullscreen };
}
