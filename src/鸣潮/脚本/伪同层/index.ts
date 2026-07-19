import { mountStreamingMessages } from '@util/streaming';
import { chat$, getTavernHostDocument } from '../../shared/chatHost';
import { registerCgUnlockBridge } from '../../shared/cgUnlockBridge';
import { registerHeroineGuard } from '../../shared/heroineGuard';
import { enrichLegacyPhoneStatData } from '../../shared/phoneDataBridge';
import { ensureWuWaSharedRegistered } from '../../shared/register';
import { exposeWuwaConsoleTools, registerWuwaRemountHub } from '../../shared/wuwaConsoleTools';
import { publishWuwaAssetsBase } from '../../shared/wuwaMedia';
import { HUB_FLOOR_ID } from './constants';
import { syncHubFrameSize } from './hubFrameSync';
import { chatHasWuwaGameStarted, resolveHubMountFloorId, shouldMountHub } from './messageScope';
import WuwaShell from './WuwaShell.vue';
import { hasGalBlock } from './wuwaParser';

const HUB_PREFIX = 'wuwa-pseudo-layer';
const HUB_STYLE_ID = 'wuwa-hub-stream-style';

function readFloorZeroMessage(): string {
  try {
    return getChatMessages(HUB_FLOOR_ID)[0]?.message ?? '';
  } catch {
    return '';
  }
}

function shouldAttachWuwaShell(): boolean {
  if (chatHasWuwaGameStarted()) return true;
  if (domContainsGal()) return true;
  const message = readFloorZeroMessage();
  return shouldMountHub(HUB_FLOOR_ID, message);
}

/** 扫描 DOM 中所有 assistant 楼层的 .mes_text 是否含 &lt;gal&gt;，作为流式阶段的后备检测 */
function domContainsGal(): boolean {
  try {
    const doc = getTavernHostDocument();
    const mesTexts = doc.querySelectorAll("#chat .mes[is_user='false'][is_system='false'] .mes_text");
    for (const el of mesTexts) {
      if (hasGalBlock(el.innerHTML)) return true;
    }
  } catch {
    /* DOM 未就绪，忽略 */
  }
  return false;
}

function ensureHubStreamStyles() {
  const doc = getTavernHostDocument();
  if (doc.getElementById(HUB_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = HUB_STYLE_ID;
  style.textContent = `
      .mes_streaming:has([id^="${HUB_PREFIX}-"]) {
        width: 100%;
      }
      .mes_streaming [id^="${HUB_PREFIX}-"] {
        display: block;
        width: 100%;
        margin-inline: auto;
        border: 0;
        background: transparent;
      }
    `;
  doc.head.appendChild(style);
}

function applyInitialHubFrameSize() {
  try {
    const raw = getVariables({ type: 'script', script_id: getScriptId() }) as { layout?: string };
    const layout = raw.layout === 'mobile' ? 'mobile' : 'desktop';
    syncHubFrameSize(layout);
  } catch {
    syncHubFrameSize('desktop');
  }
}

function hubMountedOnTargetFloor(): boolean {
  const id = `${HUB_PREFIX}-${resolveHubMountFloorId()}`;
  if (getTavernHostDocument().getElementById(id)) return true;
  return chat$(`#${id}`).length > 0;
}

function initPseudoLayerHub() {
  publishWuwaAssetsBase();
  ensureWuWaSharedRegistered();
  window.__WUWA_ENRICH_LEGACY_PHONE__ = enrichLegacyPhoneStatData;
  exposeWuwaConsoleTools();

  let heroine_guard_cleanups: EventOnReturn[] = [];
  let stopHub: (() => void) | null = null;

  function attachHub(force_remount = false) {
    const attach = shouldAttachWuwaShell();
    console.info('[鸣潮伪同层] attachHub', {
      attach,
      started: chatHasWuwaGameStarted(),
      force_remount,
      mount_floor: resolveHubMountFloorId(),
    });

    if (!attach) {
      stopHub?.();
      stopHub = null;
      return;
    }

    ensureHubStreamStyles();

    if (stopHub) {
      if (!force_remount && hubMountedOnTargetFloor()) return;
      stopHub();
      stopHub = null;
    }

    const { unmount } = mountStreamingMessages(() => createApp(WuwaShell).use(createPinia()), {
      host: 'iframe',
      prefix: HUB_PREFIX,
      filter: (message_id, message) => shouldMountHub(message_id, message),
    });

    stopHub = () => {
      unmount();
      stopHub = null;
    };

    console.info(
      `[鸣潮伪同层] 统一界面已挂载（第 ${resolveHubMountFloorId()} 楼；含开场 + GAL，请滚到聊天顶部查看）`,
    );
    requestAnimationFrame(() => applyInitialHubFrameSize());
  }

  function ensureHubMounted() {
    if (!shouldAttachWuwaShell()) {
      stopHub?.();
      stopHub = null;
      return;
    }
    if (!stopHub || !hubMountedOnTargetFloor()) {
      attachHub(Boolean(stopHub));
    }
  }

  function scheduleEnsureHub() {
    requestAnimationFrame(() => {
      window.setTimeout(() => ensureHubMounted(), 0);
    });
  }

  registerWuwaRemountHub(() => {
    stopHub?.();
    stopHub = null;
    attachHub(false);
  });

  ensureHubMounted();
  scheduleEnsureHub();

  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, scheduleEnsureHub);
  eventOn(tavern_events.MESSAGE_RECEIVED, scheduleEnsureHub);
  eventOn(tavern_events.STREAM_TOKEN_RECEIVED, scheduleEnsureHub);
  eventOn(tavern_events.GENERATION_ENDED, scheduleEnsureHub);
  eventOn(tavern_events.CHAT_CHANGED, scheduleEnsureHub);
  eventOn('chatLoaded', scheduleEnsureHub);

  void (async () => {
    try {
      await Promise.race([
        waitGlobalInitialized('Mvu'),
        new Promise<void>(resolve => window.setTimeout(resolve, 5000)),
      ]);
    } catch {
      /* MVU 可选 */
    }

    // 注册 heroineGuard（依赖 Mvu，必须在 Mvu 就绪后调用）
    if (typeof Mvu !== 'undefined') {
      try {
        heroine_guard_cleanups = registerHeroineGuard();
      } catch (error) {
        console.warn('[鸣潮伪同层] heroineGuard 注册失败（继续挂载界面）', error);
      }
    }

    scheduleEnsureHub();

    try {
      await import('../手机/legacyPhone.js');
      registerCgUnlockBridge();
      try {
        const { registerWorldbookPhoneBridge } = await import(
          '../../shared/worldbookControl/worldbookPhoneBridge'
        );
        await registerWorldbookPhoneBridge();
      } catch (error) {
        console.warn('[鸣潮伪同层] 世界书桥接失败', error);
      }
      scheduleEnsureHub();
    } catch (error) {
      console.error('[鸣潮伪同层] legacyPhone 加载失败（伪同层仍可用）', error);
    }
  })();

  $(window).on('pagehide', () => {
    stopHub?.();
    heroine_guard_cleanups.forEach(off => off.stop());
  });
}

$(() => {
  errorCatched(initPseudoLayerHub)();
});

declare global {
  interface Window {
    __WUWA_REMOUNT_HUB__?: () => void | boolean;
  }
}
