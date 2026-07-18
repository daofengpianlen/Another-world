import { readWuwaStatData, resolveTideEditMessageId } from '../tideMvuReader';import {
  phoneTideAddForeshadow,
  phoneTideAddItem,
  phoneTideAddTrigger,
  phoneTideClearForeshadows,
  phoneTideClearTriggers,
  phoneTideDeleteForeshadow,
  phoneTideDeleteTrigger,
  phoneTideEditAffection,
  phoneTideEditForeshadow,
  phoneTideEditGoal,
  phoneTideEditNPCRover,
  phoneTideEditStoryVar,
  phoneTideEditTrigger,
  phoneTideEditUserField,
  phoneTideEditUserGender,
  phoneTideEditUserRover,
  phoneTideManageItem,
  phoneTideToggleUserSex,
} from './phoneTideMvu';
import { generatePhoneTideStatusPanel, generatePhoneTideStoryPanel } from './phoneTidePanels';

type StatData = Record<string, unknown>;

let refresh_handler: (() => void) | null = null;

function readStat(): StatData {
  /* 展示用：多源读取并合并最新消息 JSONPatch，避免 GAL 楼层占位符覆盖 AI 写入 */
  return readWuwaStatData();
}

async function handleAction(action: string, el: HTMLElement, stat: StatData) {
  switch (action) {
    case 'noop':
      return;
    case 'edit-user-field':
      await phoneTideEditUserField(stat, el.dataset.field ?? '');
      break;
    case 'edit-user-gender':
      await phoneTideEditUserGender(stat);
      break;
    case 'edit-user-rover':
      await phoneTideEditUserRover(stat);
      break;
    case 'toggle-user-sex':
      await phoneTideToggleUserSex(stat);
      break;
    case 'edit-npc-rover':
      await phoneTideEditNPCRover(stat);
      break;
    case 'edit-goal':
      await phoneTideEditGoal(stat);
      break;
    case 'edit-story-var':
      await phoneTideEditStoryVar(stat, el.dataset.key ?? '', el.dataset.label ?? '字段');
      break;
    case 'edit-affection':
      await phoneTideEditAffection(stat, el.dataset.char ?? '');
      break;
    case 'manage-item':
      await phoneTideManageItem(stat, el.dataset.item ?? '');
      break;
    case 'add-item':
      await phoneTideAddItem(stat);
      break;
    case 'add-trigger':
      await phoneTideAddTrigger(stat);
      break;
    case 'edit-trigger':
      await phoneTideEditTrigger(stat, Number(el.dataset.index));
      break;
    case 'delete-trigger':
      await phoneTideDeleteTrigger(stat, Number(el.dataset.index));
      break;
    case 'clear-triggers':
      await phoneTideClearTriggers(stat);
      break;
    case 'add-foreshadow':
      await phoneTideAddForeshadow(stat);
      break;
    case 'edit-foreshadow':
      await phoneTideEditForeshadow(stat, Number(el.dataset.index));
      break;
    case 'delete-foreshadow':
      await phoneTideDeleteForeshadow(stat, Number(el.dataset.index));
      break;
    case 'clear-foreshadows':
      await phoneTideClearForeshadows(stat);
      break;
    default:
      break;
  }
}

/** 供手机 overlay 原生事件委托调用（Hub iframe 内 jQuery document 绑不到） */
export async function handlePhoneTideClick(el: HTMLElement | null) {
  if (!el) return;
  const action = el.dataset.tideAction ?? '';
  if (!action || action === 'noop') return;
  try {
    await handleAction(action, el, readStat());
  } catch (error) {
    console.error('[鸣潮手机状态] 操作失败', error);
    if (typeof toastr !== 'undefined') {
      toastr.error(error instanceof Error ? error.message : '操作失败');
    }
  }
}

export function generateTideStatusPanelForPhone(): string {
  return generatePhoneTideStatusPanel(readStat());
}

export function generateTideStoryPanelForPhone(): string {
  return generatePhoneTideStoryPanel(readStat());
}

function mirrorBridgeToParent() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.__WUWA_GENERATE_TIDE_STATUS__ = generateTideStatusPanelForPhone;
      window.parent.__WUWA_GENERATE_TIDE_STORY__ = generateTideStoryPanelForPhone;
      window.parent.__WUWA_HANDLE_TIDE_CLICK__ = handlePhoneTideClick;
      window.parent.__WUWA_RESOLVE_TIDE_MESSAGE_ID__ = resolveTideEditMessageId;
    }
  } catch {
    /* cross-origin */
  }
}

export function registerPhoneTideBridge(on_refresh: () => void) {
  refresh_handler = on_refresh;
  window.__WUWA_GENERATE_TIDE_STATUS__ = generateTideStatusPanelForPhone;
  window.__WUWA_GENERATE_TIDE_STORY__ = generateTideStoryPanelForPhone;
  window.__WUWA_HANDLE_TIDE_CLICK__ = handlePhoneTideClick;
  window.__WUWA_RESOLVE_TIDE_MESSAGE_ID__ = resolveTideEditMessageId;
  mirrorBridgeToParent();

  document.addEventListener('wuwa-phone-tide-refresh', () => {
    refresh_handler?.();
  });
}

declare global {
  interface Window {
    fetchLatestMvuData?: (updateGlobal?: boolean) => Record<string, unknown>;
    __WUWA_GENERATE_TIDE_STATUS__?: () => string;
    __WUWA_GENERATE_TIDE_STORY__?: () => string;
    __WUWA_HANDLE_TIDE_CLICK__?: (el: HTMLElement | null) => void | Promise<void>;
    __WUWA_RESOLVE_TIDE_MESSAGE_ID__?: () => number;
  }
}
