import { hideFloatingPhoneTrigger } from './phoneHubMount';
import { registerCgUnlockBridge } from '../../shared/cgUnlockBridge';
import { enrichLegacyPhoneStatData } from '../../shared/phoneDataBridge';
import { registerPhoneTideBridge } from '../../shared/phoneTide/phoneTideBridge';
import { extractFullStatFromMessagePatch, readCumulativeMessagePatch, readWuwaStatData } from '../../shared/tideMvuReader';
import { mergeHeroinesPreferGalFloor, syncContactAffectionFromHeroine } from '../../shared/heroineMerge';
import { publishWuwaAssetsBase } from '../../shared/wuwaMedia';

declare global {
  interface Window {
    __WUWA_ENRICH_LEGACY_PHONE__?: (stat: Record<string, unknown>, floor0?: Record<string, unknown>) => Record<string, unknown>;
    __WUWA_READ_STAT_DATA__?: () => Record<string, unknown>;
    __WUWA_EXTRACT_PATCH_STAT__?: (message: string) => Record<string, unknown>;
    __WUWA_READ_CUMULATIVE_PATCH__?: () => Record<string, unknown>;
    __WUWA_MERGE_HEROINES_FLOOR__?: (
      primary: Record<string, Record<string, unknown>>,
      floor0: Record<string, Record<string, unknown>>,
    ) => Record<string, Record<string, unknown>>;
    __WUWA_SYNC_CONTACT_AFF__?: (
      contact: Record<string, unknown>,
      heroine: Record<string, unknown>,
    ) => Record<string, unknown>;
  }
}

$(async () => {
  publishWuwaAssetsBase();
  window.__WUWA_ENRICH_LEGACY_PHONE__ = enrichLegacyPhoneStatData;
  window.__WUWA_READ_STAT_DATA__ = readWuwaStatData;
  window.__WUWA_EXTRACT_PATCH_STAT__ = extractFullStatFromMessagePatch;
  window.__WUWA_READ_CUMULATIVE_PATCH__ = readCumulativeMessagePatch;
  window.__WUWA_MERGE_HEROINES_FLOOR__ = mergeHeroinesPreferGalFloor;
  window.__WUWA_SYNC_CONTACT_AFF__ = syncContactAffectionFromHeroine;

  await Promise.race([
    waitGlobalInitialized('Mvu'),
    new Promise<void>(resolve => setTimeout(resolve, 5000)),
  ]);

  await import('./legacyPhone.js');

  registerCgUnlockBridge();

  registerPhoneTideBridge(() => {
    window.__WUWA_REFRESH_TIDE_PHONE_PANEL__?.();
  });

  const { registerWorldbookPhoneBridge } = await import('../../shared/worldbookControl/worldbookPhoneBridge');
  await registerWorldbookPhoneBridge();

  hideFloatingPhoneTrigger();

  const icon_timer = window.setInterval(() => {
    hideFloatingPhoneTrigger();
    const overlay = document.getElementById('mobile-phone-overlay');
    if (overlay) window.clearInterval(icon_timer);
  }, 500);

  console.info('[鸣潮手机] 已加载（独立模式：悬浮球入口；伪同层已内置完整手机）');

  $(window).on('pagehide', () => {
    window.clearInterval(icon_timer);
  });
});

declare global {
  interface Window {
    __WUWA_REFRESH_TIDE_PHONE_PANEL__?: () => void;
  }
}
