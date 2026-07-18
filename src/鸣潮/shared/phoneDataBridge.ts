import { mergeHeroinesPreferGalFloor, syncContactAffectionFromHeroine } from './heroineMerge';
import { mergeHeroinesIntoStatData } from './statDataMerge';
import type { StatData } from './tideMvuReader';

const PLACEHOLDER_TEXT = '等待AI填入';

function isPlaceholder(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  return text === '' || text === PLACEHOLDER_TEXT;
}

function pickText(value: unknown): string {
  return isPlaceholder(value) ? '' : String(value);
}

function isTruthyPresent(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function pickPrivateCount(value: unknown): number | undefined {
  if (value === undefined || value === null || isPlaceholder(value)) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/** MVU「生理状态」→ legacy contact.physiological（手机详情 🩺 区块） */
export function mapMvuPhysiologicalToLegacy(phys: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!phys || typeof phys !== 'object') return {};
  const result: Record<string, unknown> = {};
  const vaginal = pickText(phys.阴道润滑);
  if (vaginal) result.vaginal_lubrication = vaginal;
  const nipple = pickText(phys.乳头状态);
  if (nipple) result.nipple = nipple;
  const clitoris = pickText(phys.阴蒂状态);
  if (clitoris) result.clitoris = clitoris;
  const uterus = pickText(phys.子宫状态);
  if (uterus) result.uterus = uterus;
  if (phys.是否怀孕 !== undefined && phys.是否怀孕 !== null && !isPlaceholder(phys.是否怀孕)) {
    const p = phys.是否怀孕;
    result.pregnancy =
      p === true || p === 'true' || p === 1 || p === '1' || p === '是' || p === '已怀孕';
  }
  return result;
}

function parseWear(entry: Record<string, unknown>): Record<string, string> {
  const wear = entry.当前穿着;
  if (typeof wear === 'string') return { top: wear };
  if (wear && typeof wear === 'object') {
    const w = wear as Record<string, unknown>;
    return {
      top: String(w.上装 ?? ''),
      bottom: String(w.下装 ?? ''),
      accessories: String(w.饰品 ?? ''),
      other: String(w.其它 ?? ''),
    };
  }
  return {};
}

/** 鸣潮 MVU「女性角色」→ 小爱手机 legacy「contact」 */
export function heroineEntryToLegacyContact(
  name: string,
  entry: Record<string, unknown>,
  stat: StatData,
): Record<string, unknown> {
  const base = (entry.基础信息 as Record<string, unknown>) ?? {};
  const extra = (entry.额外信息 as Record<string, unknown>) ?? {};
  const privateData = (entry.私密资料 as Record<string, unknown>) ?? {};
  const sexStatus = (entry.性爱状态 as Record<string, unknown>) ?? {};
  const physiological = mapMvuPhysiologicalToLegacy(entry.生理状态 as Record<string, unknown> | undefined);
  const wear = parseWear(entry);
  const displayName = pickText(base.角色名字) || name;
  const isVirgin = base.是否为处女;
  const virgin =
    isVirgin === true || isVirgin === 'true' ? true : isVirgin === false || isVirgin === 'false' ? false : undefined;

  const lastingMarks = pickText(privateData.持久痕迹);
  const sexLog = Array.isArray(privateData.性爱日志)
    ? privateData.性爱日志
        .map(entry => {
          if (typeof entry === 'string') return pickText(entry);
          if (entry && typeof entry === 'object') {
            return pickText((entry as Record<string, unknown>).内容 ?? (entry as Record<string, unknown>).记录);
          }
          return '';
        })
        .filter(Boolean)
    : [];

  return {
    end_flag: 'active',
    basic_info: {
      name: displayName,
      phone: `friend_${name}`,
    },
    relationship: {
      affection: Number(entry.好感度 ?? 0),
      sexual_desire: Number(entry.性欲 ?? 0),
    },
    appearance: {
      height: pickText(base.身高),
      body_type: pickText(base.罩杯),
      hair_color: '',
      description: pickText(base.外貌),
    },
    clothing: {
      top: pickText(wear.top),
      bottom: pickText(wear.bottom),
      accessories: pickText(wear.accessories),
      other: pickText(wear.other),
    },
    location_info: {
      is_nearby: isTruthyPresent(entry.是否在场),
      current_location: stat.所在地点 ? pickText(stat.所在地点) : '',
    },
    sexual_experience: {
      virgin,
      sex_count: pickPrivateCount(privateData.性交次数) ?? 0,
      partner_count: pickPrivateCount(privateData.性伴侣数) ?? 0,
      important_experiences: privateData.性爱经验 && !isPlaceholder(privateData.性爱经验)
        ? [String(privateData.性爱经验)]
        : [],
      fetishes: privateData.偏爱玩法 && !isPlaceholder(privateData.偏爱玩法)
        ? [String(privateData.偏爱玩法)]
        : [],
      lasting_marks: lastingMarks,
      sex_log: sexLog,
    },
    extra_info: {
      title: pickText(extra.角色称号),
      inner_thought: pickText(extra.内心想法),
    },
    closeups: Array.isArray(entry.特写)
      ? entry.特写
          .map(item => {
            if (!item || typeof item !== 'object') return null;
            const row = item as Record<string, unknown>;
            const part = pickText(row.部位);
            const desc = pickText(row.描写);
            if (!part && !desc) return null;
            return { part, desc };
          })
          .filter((item): item is { part: string; desc: string } => item !== null)
      : [],
    carry_item: pickText(entry.物品),
    mark_location: pickText(entry.声痕位置),
    sex_status: {
      having_sex: sexStatus.是否正在性爱 === true || sexStatus.是否正在性爱 === 'true',
      climax_progress: Number(sexStatus.高潮进度 ?? 0),
      climax_count: Number(sexStatus.高潮计数 ?? 0),
      climax_limit: Number(sexStatus._高潮次数上限 ?? 5),
    },
    physiological,
    interaction_records: pickText(extra.内心想法),
  };
}

/** 合并 AI 写入的 legacy contact 与由 女性角色 推导的 contact（AI contact 优先） */
export function mergeLegacyContactEntry(
  name: string,
  heroineEntry: Record<string, unknown> | undefined,
  nativeContact: Record<string, unknown> | undefined,
  stat: StatData,
): Record<string, unknown> {
  const built =
    heroineEntry && Object.keys(heroineEntry).length
      ? heroineEntryToLegacyContact(name, heroineEntry, stat)
      : {};
  if (nativeContact && typeof nativeContact === 'object') {
    const merged = _.merge({}, built, nativeContact) as Record<string, unknown>;
    if (built.sexual_experience && typeof built.sexual_experience === 'object') {
      const builtSex = built.sexual_experience as Record<string, unknown>;
      const mergedSex = ((merged.sexual_experience as Record<string, unknown>) ?? {}) as Record<string, unknown>;
      merged.sexual_experience = {
        ...mergedSex,
        ...builtSex,
        sex_count: builtSex.sex_count,
        partner_count: builtSex.partner_count,
      };
    }
    const aff = Number(heroineEntry?.好感度);
    if (!Number.isNaN(aff)) {
      return syncContactAffectionFromHeroine(merged, heroineEntry);
    }
    return merged;
  }
  return built;
}

/** 从 stat 构建好友列表/详情用的合并 contact 表 */
export function buildMergedContactMap(stat: StatData): Record<string, Record<string, unknown>> {
  const heroines = (stat.女性角色 as Record<string, Record<string, unknown>> | undefined) ?? {};
  const native = (stat.contact as Record<string, Record<string, unknown>> | undefined) ?? {};
  const names = new Set([...Object.keys(heroines), ...Object.keys(native)]);
  const result: Record<string, Record<string, unknown>> = {};

  for (const name of names) {
    const merged = mergeLegacyContactEntry(name, heroines[name], native[name], stat);
    if (Object.keys(merged).length) result[name] = merged;
  }

  return result;
}

/**
 * 将鸣潮 stat_data 补全为 legacy 手机可读结构（contact / world_info）。
 * @param floor0 可选：合并 0 楼女性角色，避免 latest 楼缺键
 */
export function enrichLegacyPhoneStatData(stat: StatData, floor0?: StatData): StatData {
  if (!stat || typeof stat !== 'object') return {};

  const merged = floor0 ? mergeHeroinesIntoStatData(stat, floor0) : { ...stat };
  const result: StatData = { ...merged };

  const mergedContact = buildMergedContactMap(merged);
  if (Object.keys(mergedContact).length) {
    result.contact = mergedContact;
  }

  const world_info = (result.world_info as Record<string, unknown> | undefined) ?? {};
  result.world_info = {
    ...world_info,
    time: {
      ...((world_info.time as Record<string, unknown>) ?? {}),
      current_time: merged.当前时间 ?? (world_info.time as Record<string, unknown>)?.current_time ?? '',
    },
    location: {
      ...((world_info.location as Record<string, unknown>) ?? {}),
      current_location: merged.所在地点 ?? (world_info.location as Record<string, unknown>)?.current_location ?? '',
    },
    environment: (world_info.environment as Record<string, unknown>) ?? {},
  };

  return result;
}
