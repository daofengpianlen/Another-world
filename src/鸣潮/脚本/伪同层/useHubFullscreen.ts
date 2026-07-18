import type { Ref } from 'vue';
import {
  clearWuwaFullscreenHandoff,
  consumeWuwaFullscreenHandoff,
  exitWuwaBrowserFullscreen,
  getWuwaFullscreenHandoff,
  isWuwaBrowserFullscreen,
  markWuwaFullscreenHandoff,
  requestWuwaBrowserFullscreen,
} from '../../shared/wuwaFullscreenHandoff';

export function useHubFullscreen(shell_ref: Ref<HTMLElement | null>) {
  const is_fullscreen = ref(false);
  const is_expanded = ref(false);
  let handoff_restore_timer: number | null = null;

  function syncFullscreenUiState() {
    if (is_expanded.value || isWuwaBrowserFullscreen()) {
      is_fullscreen.value = true;
      return;
    }
    is_fullscreen.value = false;
  }

  async function exit_fullscreen() {
    is_expanded.value = false;
    is_fullscreen.value = false;
    await exitWuwaBrowserFullscreen();
  }

  async function enter_fullscreen() {
    is_fullscreen.value = true;
    is_expanded.value = true;

    const browser_ok = await requestWuwaBrowserFullscreen(shell_ref.value);
    if (browser_ok) {
      is_expanded.value = false;
      syncFullscreenUiState();
      return;
    }

    is_expanded.value = true;
    syncFullscreenUiState();
  }

  async function toggle_fullscreen() {
    if (is_fullscreen.value) {
      clearHandoffRestoreTimer();
      clearWuwaFullscreenHandoff();
      await exit_fullscreen();
      return;
    }

    markWuwaFullscreenHandoff('browser');
    await enter_fullscreen();
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

  function clearHandoffRestoreTimer() {
    if (handoff_restore_timer !== null) {
      window.clearTimeout(handoff_restore_timer);
      handoff_restore_timer = null;
    }
  }

  async function restoreFullscreenHandoff(force_mode?: 'expanded' | 'browser') {
    const mode = force_mode ?? consumeWuwaFullscreenHandoff() ?? getWuwaFullscreenHandoff();
    if (!mode) return false;

    await enter_fullscreen();
    syncFullscreenUiState();

    if (isWuwaBrowserFullscreen() || is_expanded.value) {
      clearWuwaFullscreenHandoff();
      return true;
    }

    markWuwaFullscreenHandoff(mode);
    return false;
  }

  function scheduleHandoffRestore() {
    clearHandoffRestoreTimer();

    const delays = [0, 120, 400];
    let attempt_index = 0;

    const run = async () => {
      if (!getWuwaFullscreenHandoff() && !is_fullscreen.value) return;

      const ok = await restoreFullscreenHandoff();
      if (ok) return;

      attempt_index += 1;
      if (attempt_index >= delays.length) return;

      handoff_restore_timer = window.setTimeout(() => {
        handoff_restore_timer = null;
        void run();
      }, delays[attempt_index]);
    };

    void nextTick(() => {
      void run();
    });
  }

  onMounted(() => {
    $(document).on('fullscreenchange.wuwaHub webkitfullscreenchange.wuwaHub', on_fullscreen_change);
    try {
      if (window.parent !== window) {
        window.parent.document.addEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.addEventListener('webkitfullscreenchange', on_fullscreen_change);
      }
    } catch {
      /* ignore */
    }

    scheduleHandoffRestore();
  });

  onUnmounted(() => {
    clearHandoffRestoreTimer();
    $(document).off('fullscreenchange.wuwaHub webkitfullscreenchange.wuwaHub');
    try {
      if (window.parent !== window) {
        window.parent.document.removeEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.removeEventListener('webkitfullscreenchange', on_fullscreen_change);
      }
    } catch {
      /* ignore */
    }
    void exit_fullscreen();
  });

  return { is_fullscreen, is_expanded, toggle_fullscreen };
}
