import { calculateStoryLogic } from './storyLogic';
import type { StatData } from './tideMvuReader';

/** 将 stat 数组字段规范为数组（兼容错误解析出的 { "-": item }） */
export function coerceStatArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;
  if ('-' in obj) {
    const rest = { ...obj };
    const minus = rest['-'];
    delete rest['-'];
    const indexed = Object.keys(rest)
      .filter(k => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map(k => rest[k]);
    return minus !== undefined ? [...indexed, minus] : indexed;
  }
  return [];
}

/** 与 initvar.yaml 对齐的 stat_data 骨架（开场面板会覆盖部分字段） */
export const WUWA_STAT_DEFAULTS: StatData = {
  当前时间: '',
  所在地点: '',
  剧情显示: '',
  是否为后日谈: 'false',
  当前长期目标: '寻找丢失的记忆，跟随指引前往今州城。',
  当前演绎事件: '',
  当前演绎事件节点: '',
  即将进行的下一个事件节点: '',
  已完成的上一个事件: '',
  已完成的上一个事件节点: '',
  章节终止条件: '',
  主角信息: {
    是否是漂泊者: true,
    性别: '男',
    身份与额外设定: '寻找归途与失落记忆，且背负着文明火种与救世使命的漂泊者。',
    当前状态: '刚苏醒，轻微失忆感',
    当前穿着: '',
    物品栏: {},
  },
  NPC漂泊者: {
    是否存在: false,
    性别: '女',
  },
  女性角色: {},
  剧情触发器: [],
  伏笔: [],
  _storyState: {
    majorVerIdx: 0,
    partIdx: 0,
    isPostScript: false,
    _anchorVer: '1.0',
  },
  指令: {
    推进剧情: null,
    跳转版本: null,
    修改后日谈模式为: null,
  },
};

/** 合并默认值 + 同步剧情显示，保证界面始终有可展示结构 */
export function normalizeWuwaStatData(partial: StatData | null | undefined): StatData {
  const merged = _.merge({}, WUWA_STAT_DEFAULTS, partial ?? {}) as StatData;
  merged.主角信息 = _.merge({}, WUWA_STAT_DEFAULTS.主角信息, partial?.主角信息 ?? {});
  merged.NPC漂泊者 = _.merge({}, WUWA_STAT_DEFAULTS.NPC漂泊者, partial?.NPC漂泊者 ?? {});
  merged._storyState = _.merge({}, WUWA_STAT_DEFAULTS._storyState, partial?._storyState ?? {});
  merged.指令 = _.merge({}, WUWA_STAT_DEFAULTS.指令, partial?.指令 ?? {});
  if (!Array.isArray(merged.剧情触发器)) merged.剧情触发器 = coerceStatArray(merged.剧情触发器);
  if (!Array.isArray(merged.伏笔)) merged.伏笔 = coerceStatArray(merged.伏笔);
  if (!merged.女性角色 || typeof merged.女性角色 !== 'object') merged.女性角色 = {};
  return calculateStoryLogic(merged);
}
