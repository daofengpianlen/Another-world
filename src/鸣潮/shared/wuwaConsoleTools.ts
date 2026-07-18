import { ensureHeroinesAfterCardLogic, extractHeroinesFromMessagePatch } from './heroineGuard';
import { enrichLegacyPhoneStatData } from './phoneDataBridge';
import { repairFloorZeroHeroines } from './statDataCompat';
import { getMvuApi } from './wuwaTavern';

function parseManualNames(input?: string | string[]): string[] | undefined {
  if (input === undefined || input === null) return undefined;
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  return input
    .split(/[、,，/|+＋\s]+/)
    .map(name => name.trim())
    .filter(Boolean);
}

function hasGalInText(message: string): boolean {
  const body = message.replace(/<UpdateVariable>[\s\S]*$/i, '').trim();
  return /<gal>[\s\S]*?<\/gal>/i.test(body);
}

function scanHubDom() {
  const docs = [document];
  try {
    if (window.parent && window.parent.document) docs.push(window.parent.document);
  } catch {
    /* cross-origin */
  }
  const hubs: Element[] = [];
  const openings: Element[] = [];
  for (const doc of docs) {
    hubs.push(...doc.querySelectorAll('[id^="wuwa-pseudo-layer-"]'));
    openings.push(...doc.querySelectorAll('[id^="wuwa-opening-"]'));
  }
  return {
    hub_iframe_count: hubs.length,
    hub_iframe_ids: hubs.map(el => el.id),
    opening_iframe_count: openings.length,
    opening_iframe_ids: openings.map(el => el.id),
  };
}

let remount_hub_fn: (() => void) | null = null;

/** 伪同层脚本注册 remount；exposeWuwaConsoleTools 会把它挂到主页面 window */
export function registerWuwaRemountHub(fn: () => void) {
  remount_hub_fn = fn;
  const invoke = () => {
    if (!remount_hub_fn) {
      console.warn('[鸣潮] 伪同层脚本尚未就绪，请确认已启用「鸣潮伪同层」脚本并刷新页面');
      return false;
    }
    remount_hub_fn();
    return true;
  };

  const attachRemount = (target: Window & typeof globalThis) => {
    target.__WUWA_REMOUNT_HUB__ = invoke;
  };

  attachRemount(globalThis as Window & typeof globalThis);
  try {
    if (window.parent && window.parent !== window) {
      attachRemount(window.parent as Window & typeof globalThis);
    }
  } catch {
    /* cross-origin */
  }
  try {
    if (window.top && window.top !== window) {
      attachRemount(window.top as Window & typeof globalThis);
    }
  } catch {
    /* cross-origin */
  }
}

function scanChatFromSillyTavern() {
  const chat = (window as { SillyTavern?: { chat?: Array<{ is_user?: boolean; mes?: string }> } }).SillyTavern?.chat;
  if (!Array.isArray(chat)) return null;
  return chat.map((row, index) => ({
    id: index,
    role: row.is_user ? 'user' : 'assistant',
    hasGal: !row.is_user && hasGalInText(row.mes ?? ''),
    preview: (row.mes ?? '').slice(0, 80).replace(/\s+/g, ' '),
  }));
}

/** 挂载到主页面 window，供 F12 控制台调用 */
export function exposeWuwaConsoleTools() {
  const repair = async (input?: string | string[]) => {
    const manual = parseManualNames(input);
    const written = await repairFloorZeroHeroines(manual);
    console.info('[鸣潮] __WUWA_REPAIR_HEROINES__ 完成:', written);
    return written;
  };

  const force_guard_latest = async () => {
    await waitGlobalInitialized('Mvu');
    const MvuApi = getMvuApi();
    const variables = MvuApi.getMvuData({ type: 'message', message_id: 'latest' }) ?? { stat_data: {} };
    const before = MvuApi.getMvuData({ type: 'message', message_id: -2 }) ?? { stat_data: {} };
    let message = '';
    try {
      const msgs = getChatMessages(-1);
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') message = last.message ?? '';
    } catch {
      /* ignore */
    }
    const ok = ensureHeroinesAfterCardLogic(variables, before, message);
    if (ok) {
      await MvuApi.replaceMvuData(variables, { type: 'message', message_id: 'latest' });
      await MvuApi.replaceMvuData(variables, { type: 'message', message_id: 0 });
    }
    const names = Object.keys(extractHeroinesFromMessagePatch(message));
    console.info('[鸣潮] __WUWA_FORCE_GUARD__', ok, Object.keys((variables.stat_data?.女性角色 as object) ?? {}), names);
    return variables.stat_data?.女性角色;
  };

  /** 在主页面 F12 诊断伪同层是否应显示（getChatMessages 仅在脚本 iframe 内可用） */
  const debug_hub = () => {
    const from_st = scanChatFromSillyTavern();
    const gal_rows = from_st?.filter(r => r.hasGal) ?? [];
    const latest_gal = gal_rows.at(-1) ?? null;
    const dom = scanHubDom();
    const report = {
      chat_has_gal: gal_rows.length > 0,
      gal_floors: gal_rows,
      latest_gal_floor: latest_gal?.id ?? null,
      hub_mount_floor: 0,
      dom,
      remount_ready: Boolean(remount_hub_fn),
      pseudo_layer_note: 'iframe 固定在第 0 楼；有 gal 时内容来自最新 gal 楼，请滚到聊天最顶部',
      hint: !gal_rows.length
        ? '尚无含 <gal> 的 assistant 楼层；请确认开场已生成或消息格式正确'
        : dom.hub_iframe_count === 0
          ? remount_hub_fn
            ? '第 0 楼应有伪同层但未找到 iframe：执行 __WUWA_REMOUNT_HUB__()，并滚到聊天顶部'
            : '未检测到「鸣潮伪同层」脚本（请启用并刷新），不是只有「鸣潮开场」'
          : `已挂载: ${dom.hub_iframe_ids.join(', ') || '无'} — 请滚到第 0 楼查看`,
    };
    console.info('[鸣潮] __WUWA_DEBUG_HUB__', report);
    return report;
  };

  const attach = (target: Window & typeof globalThis) => {
    target.__WUWA_REPAIR_HEROINES__ = repair;
    target.__WUWA_FORCE_GUARD__ = force_guard_latest;
    target.__WUWA_DEBUG_HUB__ = debug_hub;
    if (!target.__WUWA_REMOUNT_HUB__ && remount_hub_fn) {
      target.__WUWA_REMOUNT_HUB__ = () => {
        remount_hub_fn?.();
      };
    }
  };

  attach(globalThis as Window & typeof globalThis);
  try {
    if (window.parent && window.parent !== window) {
      attach(window.parent as Window & typeof globalThis);
      (window.parent as Window & typeof globalThis).__WUWA_ENRICH_LEGACY_PHONE__ = enrichLegacyPhoneStatData;
    }
  } catch {
    /* cross-origin */
  }
  try {
    if (window.top && window.top !== window) {
      attach(window.top as Window & typeof globalThis);
      (window.top as Window & typeof globalThis).__WUWA_ENRICH_LEGACY_PHONE__ = enrichLegacyPhoneStatData;
      (window.top as Window & typeof globalThis).__WUWA_DEBUG_HUB__ = debug_hub;
    }
  } catch {
    /* cross-origin */
  }
}

declare global {
  interface Window {
    __WUWA_REPAIR_HEROINES__?: (input?: string | string[]) => Promise<string[]>;
    __WUWA_FORCE_GUARD__?: () => Promise<unknown>;
    __WUWA_DEBUG_HUB__?: () => {
      chat_has_gal: boolean;
      gal_floors: Array<{ id: number; role: string; hasGal: boolean; preview: string }>;
      latest_gal_floor: number | null;
      hub_mount_floor?: number;
      remount_ready?: boolean;
      dom: ReturnType<typeof scanHubDom>;
      hint: string;
    };
    __WUWA_REMOUNT_HUB__?: () => void | boolean;
  }
}
