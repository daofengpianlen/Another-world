const BoolStringSchema = z
  .union([z.boolean(), z.string(), z.number()])
  .transform(v => (v === true || v === 'true' || v === 1 || v === '1' ? 'true' : 'false'))
  .prefault('false');

const SexStatusSchema = z
  .object({
    是否正在性爱: z.union([z.boolean(), z.string()]).prefault(false),
    高潮进度: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
    高潮计数: z.coerce.number().transform(v => _.clamp(v, 0, 999)).prefault(0),
    _高潮次数上限: z.coerce.number().transform(v => _.clamp(v, 1, 99)).prefault(5),
  })
  .prefault({});

const WearSchema = z
  .object({
    上装: z.string().prefault('等待AI填入'),
    下装: z.string().prefault('等待AI填入'),
    饰品: z.string().prefault('等待AI填入'),
    其它: z.string().prefault('等待AI填入'),
  })
  .prefault({});

const HeroineBaseInfoSchema = z
  .object({
    角色名字: z.string().prefault(''),
    身高: z.string().prefault('等待AI填入'),
    罩杯: z.string().prefault('等待AI填入'),
    外貌: z.string().prefault('等待AI填入'),
    是否为处女: z.union([z.boolean(), z.string()]).prefault(true),
  })
  .prefault({});

const HeroineExtraSchema = z
  .object({
    角色称号: z.string().prefault('等待AI填入'),
    内心想法: z.string().prefault('等待AI填入'),
  })
  .prefault({});

const HeroinePrivateSchema = z
  .object({
    性交次数: z.coerce.number().transform(v => _.clamp(v, 0, 9999)).prefault(0),
    性伴侣数: z.coerce.number().transform(v => _.clamp(v, 0, 999)).prefault(0),
    性爱经验: z.string().prefault('等待AI填入'),
    偏爱玩法: z.string().prefault('等待AI填入'),
    持久痕迹: z.string().prefault('等待AI填入'),
    性爱日志: z
      .array(
        z
          .object({
            时间: z.string().prefault(''),
            内容: z.string().prefault(''),
            结果: z.string().prefault(''),
          })
          .prefault({}),
      )
      .prefault([]),
  })
  .prefault({});

const FeatureSchema = z
  .object({
    部位: z.string().prefault(''),
    描写: z.string().prefault(''),
  })
  .prefault({});

const PhysiologicalSchema = z
  .object({
    阴道润滑: z.string().prefault('等待AI填入'),
    乳头状态: z.string().prefault('等待AI填入'),
    阴蒂状态: z.string().prefault('等待AI填入'),
    子宫状态: z.string().prefault('等待AI填入'),
    是否怀孕: z.union([z.boolean(), z.string()]).prefault(false),
  })
  .prefault({});

const HeroineEntrySchema = z
  .object({
    基础信息: HeroineBaseInfoSchema,
    是否在场: BoolStringSchema,
    声痕位置: z.string().prefault('等待AI填入'),
    当前穿着: z.union([z.string(), WearSchema]).transform(v => (typeof v === 'string' ? v : v)),
    好感度: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
    性欲: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(0),
    额外信息: HeroineExtraSchema,
    特写: z.array(FeatureSchema).prefault([]),
    物品: z.string().prefault('等待AI填入'),
    性爱状态: SexStatusSchema,
    生理状态: PhysiologicalSchema,
    私密资料: HeroinePrivateSchema,
  })
  .prefault({});

const InventoryItemSchema = z
  .object({
    数量: z.coerce.number().transform(v => _.clamp(v, 0, 9999)).prefault(1),
    描述: z.string().prefault(''),
    类型: z.string().prefault('杂物'),
  })
  .prefault({});

const ProtagonistSchema = z
  .object({
    是否是漂泊者: z.union([z.boolean(), z.string()]).prefault(true),
    性别: z.string().prefault('男'),
    身份与额外设定: z.string().prefault(''),
    当前状态: z.string().prefault(''),
    当前穿着: z.union([z.string(), WearSchema]).prefault(''),
    性爱状态: SexStatusSchema,
    物品栏: z.record(z.string(), InventoryItemSchema).prefault({}),
  })
  .prefault({});

const TriggerSchema = z
  .object({
    事件类别: z.string().prefault('事件'),
    事件简述: z.string().prefault(''),
    状态: z.string().prefault('待触发'),
    事件计时: z.string().prefault(''),
  })
  .prefault({});

const ForeshadowSchema = z
  .object({
    伏笔内容: z.string().prefault(''),
    指向的预期结果: z.string().prefault(''),
  })
  .prefault({});

export const Schema = z
  .object({
    当前时间: z.string().prefault(''),
    所在地点: z.string().prefault(''),
    剧情显示: z.string().prefault(''),
    是否为后日谈: BoolStringSchema,

    当前长期目标: z.string().prefault(''),
    当前演绎事件: z.string().prefault(''),
    当前演绎事件节点: z.string().prefault(''),
    即将进行的下一个事件节点: z.string().prefault(''),
    已完成的上一个事件: z.string().prefault(''),
    已完成的上一个事件节点: z.string().prefault(''),
    章节终止条件: z.string().prefault(''),

    主角信息: ProtagonistSchema,
    NPC漂泊者: z
      .object({
        是否存在: z.union([z.boolean(), z.string()]).prefault(false),
        性别: z.string().prefault('女'),
      })
      .prefault({}),

    女性角色: z.record(z.string(), HeroineEntrySchema).prefault({}),

    /** 角色卡 legacy：已知名单（string / 数组 / 对象均可） */
    _已知角色名单: z
      .union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())])
      .optional(),
    /** 角色卡 legacy：当前现场女性角色显示 */
    _现场女性角色显示: z
      .union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())])
      .optional(),

    剧情触发器: z.array(TriggerSchema).prefault([]),
    伏笔: z.array(ForeshadowSchema).prefault([]),

    _storyState: z
      .object({
        majorVerIdx: z.coerce.number().prefault(0),
        partIdx: z.coerce.number().prefault(0),
        isPostScript: z.union([z.boolean(), z.string()]).prefault(false),
        _anchorVer: z.string().prefault('1.0'),
      })
      .prefault({}),

    指令: z
      .object({
        推进剧情: z.unknown().prefault(null),
        跳转版本: z.unknown().prefault(null),
        修改后日谈模式为: z.unknown().prefault(null),
      })
      .prefault({}),
  })
  .prefault({});

export type WuwaStatSchema = z.output<typeof Schema>;
