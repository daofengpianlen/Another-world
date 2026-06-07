import { AbilitySchema, migrate_raw_ability } from './ability';

const NpcAppearanceSchema = z
  .object({
    身高: z.string().prefault(''),
    体型: z.string().prefault(''),
    发色: z.string().prefault(''),
    发型: z.string().prefault(''),
    瞳色: z.string().prefault(''),
  })
  .prefault({});

const NpcClothingSchema = z
  .object({
    上装: z.string().prefault('无'),
    下装: z.string().prefault('无'),
    内衣: z.string().prefault('无'),
    内裤: z.string().prefault('无'),
    袜子: z.string().prefault('无'),
    鞋子: z.string().prefault('无'),
  })
  .prefault({});

const NpcSexProfileSchema = z
  .object({
    处女: z.union([z.boolean(), z.string(), z.number()]).prefault('是'),
    性交次数: z.coerce.number().transform(v => _.clamp(v, 0, 99999)).prefault(0),
    性伴侣数: z.coerce.number().transform(v => _.clamp(v, 0, 9999)).prefault(0),
    初次对象: z.string().prefault(''),
    后庭经验: z.string().prefault('无'),
    口交经验: z.string().prefault('无'),
  })
  .prefault({});

const NpcPhysiologySchema = z
  .object({
    阴道润滑: z.string().prefault(''),
    乳头状态: z.string().prefault(''),
    阴蒂状态: z.string().prefault(''),
    子宫状态: z.string().prefault(''),
    怀孕状态: z.string().prefault('未怀孕'),
  })
  .prefault({});

const NpcInteractionSchema = z
  .object({
    难忘事件: z
      .preprocess(
        val => {
          if (Array.isArray(val)) return val.map(String).filter(s => s.trim());
          if (typeof val === 'string' && val.trim()) {
            return val
              .split(/\n+/)
              .map(line => line.replace(/^[-•·]\s*/, '').trim())
              .filter(Boolean);
          }
          return [];
        },
        z.array(z.string()),
      )
      .prefault([]),
  })
  .prefault({});

function migrate_raw_npc(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw };
  if ('性经验' in out && !('性欲' in out)) {
    out.性欲 = out.性经验;
  }
  return out;
}

const DEFAULT_HERO = {
  头像: '',
  姓名: '旅人',
  性别: '未知',
  性格: '',
  外貌: '',
  身份: '冒险者',
  等级: 1,
  经验: 0,
  金币: 0,
  能力: migrate_raw_ability({}),
} as const;

function default_hero() {
  return {
    ...DEFAULT_HERO,
    能力: migrate_raw_ability({ 生命: 100, 力量: 10, 体魄: 10, 智慧: 5 }),
  };
}

const NpcCoreSchema = z.object({
  性别: z.string().prefault('未知'),
  身份: z.string().prefault(''),
  等级: z.coerce.number().transform(v => _.clamp(v, 1, 100)).prefault(1),
  能力: AbilitySchema,
  外貌穿着: z.string().prefault(''),
  内心想法: z.string().prefault(''),
  位置: z.string().prefault('未知'),
  好感度: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
  /** 0~100 摘要；详细见 性经验档案 */
  性欲: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
  近期性经历: z.string().prefault(''),
  外观特征: NpcAppearanceSchema,
  当前服装: NpcClothingSchema,
  性经验档案: NpcSexProfileSchema,
  生理状态: NpcPhysiologySchema,
  互动记录: NpcInteractionSchema,
});

const NpcSchema = z
  .preprocess(
    raw => migrate_raw_npc((raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>),
    NpcCoreSchema,
  )
  .prefault({});

export const Schema = z
  .object({
    主角: z
      .object({
        头像: z.string().prefault(''),
        姓名: z.string().prefault('旅人'),
        性别: z.string().prefault('未知'),
        性格: z.string().prefault(''),
        外貌: z.string().prefault(''),
        身份: z.string().prefault('冒险者'),
        等级: z.coerce.number().transform(v => _.clamp(v, 1, 100)).prefault(1),
        经验: z.coerce.number().transform(v => _.clamp(v, 0, 999999)).prefault(0),
        金币: z.coerce.number().transform(v => _.clamp(v, 0, 9999999)).prefault(0),
        能力: AbilitySchema,
      })
      .prefault(default_hero),
    背包: z
      .record(
        z.string().describe('物品名'),
        z
          .object({
            描述: z.string().prefault(''),
            数量: z.coerce.number().prefault(1),
          })
          .prefault({}),
      )
      .prefault({})
      .transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0)),
    邂逅名录: z.record(z.string().describe('NPC名'), NpcSchema).prefault({}),
    已解锁CG: z.record(z.string().describe('角色名'), z.array(z.string()).prefault([])).prefault({}),
  })
  .prefault({});

export type Schema = z.output<typeof Schema>;

/** 将 MVU stat_data 与默认值深度合并后再解析，避免部分字段缺失导致 Zod 报错 */
export function parseStatData(raw: unknown): Schema {
  const base = Schema.parse({ 主角: default_hero() });
  const merged = _.mergeWith({}, base, raw && typeof raw === 'object' ? raw : {}, (obj, src) =>
    src === undefined ? obj : undefined,
  );
  const hero_raw = merged.主角 && typeof merged.主角 === 'object' ? merged.主角 : {};
  merged.主角 = {
    ...default_hero(),
    ...hero_raw,
    能力: migrate_raw_ability(
      (hero_raw.能力 && typeof hero_raw.能力 === 'object' ? hero_raw.能力 : {}) as Record<string, unknown>,
    ),
  };
  return Schema.parse(merged);
}

/** 空 stat_data 的安全默认值（供 store 初始化） */
export function emptyStatData(): Schema {
  return parseStatData({});
}
