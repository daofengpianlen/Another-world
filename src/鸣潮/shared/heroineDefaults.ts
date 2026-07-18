/** 浪潮状态栏 / 小爱手机 共用的女性角色默认结构 */
export function createDefaultHeroineEntry(name: string, partial?: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    基础信息: {
      角色名字: name,
      身高: '等待AI填入',
      罩杯: '等待AI填入',
      外貌: '等待AI填入',
      是否为处女: true,
    },
    是否在场: 'true',
    声痕位置: '等待AI填入',
    当前穿着: {
      上装: '等待AI填入',
      下装: '等待AI填入',
      饰品: '等待AI填入',
      其它: '等待AI填入',
    },
    好感度: 10,
    额外信息: {
      角色称号: '等待AI填入',
      内心想法: '等待AI填入',
    },
    特写: [],
    物品: '等待AI填入',
    性爱状态: {
      是否正在性爱: false,
      高潮进度: 0,
      高潮计数: 0,
      _高潮次数上限: 5,
    },
    生理状态: {
      阴道润滑: '等待AI填入',
      乳头状态: '等待AI填入',
      阴蒂状态: '等待AI填入',
      子宫状态: '等待AI填入',
      是否怀孕: false,
    },
    私密资料: {
      性交次数: 0,
      性伴侣数: 0,
      性爱经验: '等待AI填入',
      偏爱玩法: '等待AI填入',
      持久痕迹: '等待AI填入',
      性爱日志: [],
    },
  };

  if (!partial) return base;

  return _.merge({}, base, partial);
}

/** 解析开场面板「开局见到的角色」：秧秧、炽霞 / 秧秧 炽霞 等 */
export function parseTargetCharacterNames(raw: string): string[] {
  return raw
    .split(/[、,，/|+＋\n]+/)
    .map(name => name.trim())
    .filter(Boolean);
}

/** 最小可显示结构（仅好感+在场，AI 可后续 replace 补全） */
export function createMinimalHeroineEntry(name: string): Record<string, unknown> {
  return {
    好感度: 10,
    是否在场: 'true',
    基础信息: { 角色名字: name },
    额外信息: { 内心想法: '等待AI填入' },
  };
}
