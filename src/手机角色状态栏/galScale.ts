import { GAL_DESIGN_HEIGHT, GAL_DESIGN_WIDTH } from './media';

/** 根据可用区域计算 UI 等比缩放（设计稿 960×712） */
export function compute_gal_ui_scale(
  available_width: number,
  available_height: number,
  fill_viewport: boolean,
): number {
  if (available_width <= 0) return 1;
  const width_scale = available_width / GAL_DESIGN_WIDTH;
  if (!fill_viewport) {
    return Math.min(1, width_scale);
  }
  if (available_height <= 0) return width_scale;
  const height_scale = available_height / GAL_DESIGN_HEIGHT;
  return Math.min(width_scale, height_scale);
}

/** 酒馆 iframe 内优先对 iframe 元素请求全屏，否则退回 shell */
export function resolve_gal_fullscreen_target(shell: HTMLElement): HTMLElement {
  if (window.frameElement instanceof HTMLElement) {
    return window.frameElement;
  }
  return shell;
}
