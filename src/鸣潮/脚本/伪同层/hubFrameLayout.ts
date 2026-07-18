import type { HubLayoutMode } from './hubSettingsStore';

export type HubFrameProfile = {
  maxWidth: number;
  maxHeight: number;
  aspectWidth: number;
  aspectHeight: number;
  aspectRatio: string;
};

/** 手机版：窄屏竖屏比例（375:737） */
const MOBILE_FRAME = {
  maxWidth: 440,
  aspectWidth: 375,
  aspectHeight: 737,
} as const;

/** 电脑版：宽屏横向比例（960:768，适合大头像横排气泡） */
const DESKTOP_FRAME = {
  maxWidth: 960,
  aspectWidth: 960,
  aspectHeight: 768,
} as const;

function buildProfile(frame: { maxWidth: number; aspectWidth: number; aspectHeight: number }): HubFrameProfile {
  const maxHeight = Math.round((frame.maxWidth * frame.aspectHeight) / frame.aspectWidth);
  return {
    maxWidth: frame.maxWidth,
    maxHeight,
    aspectWidth: frame.aspectWidth,
    aspectHeight: frame.aspectHeight,
    aspectRatio: `${frame.aspectWidth} / ${frame.aspectHeight}`,
  };
}

export function resolveHubFrameProfile(layout: HubLayoutMode): HubFrameProfile {
  return buildProfile(layout === 'mobile' ? MOBILE_FRAME : DESKTOP_FRAME);
}
