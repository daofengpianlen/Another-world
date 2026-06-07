import { useResizeObserver } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';
import { computed, nextTick, ref, watch } from 'vue';
import { compute_gal_ui_scale, resolve_gal_fullscreen_target } from './galScale';

/** 跨开局 / 主界面切换保持全屏状态 */
export const useGalFullscreenStore = defineStore('gal_fullscreen', () => {
  const is_fullscreen = ref(false);
  const is_expanded = ref(false);
  return { is_fullscreen, is_expanded };
});

export function useGalFullscreen(shell_ref: Ref<HTMLElement | null>) {
  const store = useGalFullscreenStore();
  const { is_fullscreen, is_expanded } = storeToRefs(store);
  const ui_scale = ref(1);

  const is_native_fullscreen = computed(
    () => !!shell_ref.value && document.fullscreenElement === shell_ref.value,
  );

  function is_parent_iframe_fullscreen(): boolean {
    try {
      if (window.parent === window) return false;
      return window.parent.document.fullscreenElement === window.frameElement;
    } catch {
      return false;
    }
  }

  function is_browser_fullscreen(): boolean {
    return is_native_fullscreen.value || is_parent_iframe_fullscreen();
  }

  const inner_scale_style = computed(() => ({
    zoom: ui_scale.value,
  }));

  function sync_ui_scale() {
    const shell = shell_ref.value;
    if (!shell) return;
    const fill_viewport = is_fullscreen.value;
    ui_scale.value = compute_gal_ui_scale(shell.clientWidth, shell.clientHeight, fill_viewport);
  }

  async function exit_any_fullscreen() {
    is_expanded.value = false;

    const tasks: Promise<void>[] = [];
    if (document.fullscreenElement) {
      tasks.push(
        document.exitFullscreen().then(() => undefined).catch(error => {
          console.warn('[GAL] 退出 iframe 内全屏失败', error);
        }),
      );
    }

    try {
      if (window.parent !== window && window.parent.document.fullscreenElement) {
        tasks.push(
          window.parent.document.exitFullscreen().then(() => undefined).catch(error => {
            console.warn('[GAL] 退出父页面全屏失败', error);
          }),
        );
      }
    } catch (error) {
      console.warn('[GAL] 无法访问父页面 document', error);
    }

    if (tasks.length) await Promise.all(tasks);
    await nextTick();
    sync_ui_scale();
  }

  async function enter_fullscreen() {
    const shell = shell_ref.value;
    if (!shell) {
      is_fullscreen.value = false;
      return;
    }

    const target = resolve_gal_fullscreen_target(shell);

    try {
      await target.requestFullscreen();
      await nextTick();
      sync_ui_scale();
      if (is_browser_fullscreen()) {
        is_expanded.value = false;
        console.info('[GAL] 全屏已启用', { scale: ui_scale.value, target: target.tagName });
        return;
      }
    } catch (error) {
      console.info('[GAL] 浏览器全屏不可用，使用页面内全屏', error);
    }

    is_expanded.value = true;
    await nextTick();
    sync_ui_scale();
    console.info('[GAL] 页面内全屏', { scale: ui_scale.value });
  }

  async function toggle_fullscreen() {
    if (is_fullscreen.value) {
      is_fullscreen.value = false;
      await exit_any_fullscreen();
      return;
    }

    is_fullscreen.value = true;
    await enter_fullscreen();

    if (!is_expanded.value && !is_browser_fullscreen()) {
      is_fullscreen.value = false;
      sync_ui_scale();
    }
  }

  function on_fullscreen_change() {
    if (is_browser_fullscreen()) {
      is_fullscreen.value = true;
      is_expanded.value = false;
      nextTick(sync_ui_scale);
      return;
    }

    if (is_expanded.value) {
      is_fullscreen.value = true;
      nextTick(sync_ui_scale);
      return;
    }

    is_fullscreen.value = false;
    nextTick(sync_ui_scale);
  }

  function on_keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !is_fullscreen.value) return;
    if (is_browser_fullscreen()) return;
    is_fullscreen.value = false;
    is_expanded.value = false;
    nextTick(sync_ui_scale);
  }

  function bind_fullscreen_listeners() {
    $(document).on('fullscreenchange webkitfullscreenchange', on_fullscreen_change);
    $(window).on('resize', sync_ui_scale);
    try {
      if (window.parent !== window) {
        window.parent.document.addEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.addEventListener('webkitfullscreenchange', on_fullscreen_change);
        window.parent.addEventListener('resize', sync_ui_scale);
      }
    } catch (error) {
      console.warn('[GAL] 无法监听父页面全屏事件', error);
    }
  }

  function unbind_fullscreen_listeners() {
    $(document).off('fullscreenchange webkitfullscreenchange', on_fullscreen_change);
    $(window).off('resize', sync_ui_scale);
    try {
      if (window.parent !== window) {
        window.parent.document.removeEventListener('fullscreenchange', on_fullscreen_change);
        window.parent.document.removeEventListener('webkitfullscreenchange', on_fullscreen_change);
        window.parent.removeEventListener('resize', sync_ui_scale);
      }
    } catch {
      /* ignore */
    }
  }

  async function restore_fullscreen_after_mount() {
    await nextTick();
    if (is_browser_fullscreen()) {
      is_fullscreen.value = true;
      is_expanded.value = false;
      sync_ui_scale();
      return;
    }
    if (!is_fullscreen.value) {
      sync_ui_scale();
      return;
    }
    if (is_expanded.value) {
      sync_ui_scale();
      return;
    }
    await enter_fullscreen();
  }

  function mount() {
    bind_fullscreen_listeners();
    $(document).on('keydown', on_keydown);
    void restore_fullscreen_after_mount();
  }

  function unmount() {
    unbind_fullscreen_listeners();
    $(document).off('keydown', on_keydown);
  }

  useResizeObserver(shell_ref, () => {
    sync_ui_scale();
  });

  watch(is_fullscreen, () => {
    nextTick(sync_ui_scale);
  });

  return {
    is_fullscreen,
    is_expanded,
    inner_scale_style,
    toggle_fullscreen,
    mount,
    unmount,
  };
}
