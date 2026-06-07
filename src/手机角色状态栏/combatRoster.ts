import type { CombatEnemyTemplate } from './combat';

export type CombatEnemyKind = 'wild' | 'boss';
export type CombatEnemyTier = 'weak' | 'normal' | 'elite';

export interface CombatRosterEntry extends CombatEnemyTemplate {
  kind: CombatEnemyKind;
  tier?: CombatEnemyTier;
  /** 区域 Boss（每区唯一，本区野怪/NPC 四维不得超过此单位） */
  is_regional_boss?: boolean;
  chapter?: string;
  note?: string;
}

/** 11 区 × 11 档等级带（相邻区在边界等级可衔接） */
export const REGION_LEVEL_BANDS: Record<
  string,
  { min_level: number; max_level: number; label: string }
> = {
  圣光教会圣地: { min_level: 1, max_level: 5, label: '1–5' },
  艾瑟兰王城: { min_level: 5, max_level: 10, label: '5–10' },
  中立自由地带: { min_level: 11, max_level: 20, label: '11–20' },
  矮人王国废墟: { min_level: 21, max_level: 30, label: '21–30' },
  精灵古森林: { min_level: 31, max_level: 40, label: '31–40' },
  远古遗迹带: { min_level: 41, max_level: 50, label: '41–50' },
  狐族领地: { min_level: 51, max_level: 60, label: '51–60' },
  魔女隐域: { min_level: 61, max_level: 70, label: '61–70' },
  邪神葬地: { min_level: 71, max_level: 80, label: '71–80' },
  天空之门: { min_level: 81, max_level: 90, label: '81–90' },
  圣域: { min_level: 91, max_level: 100, label: '91–100' },
};

export function get_region_level_band(region_name: string) {
  return REGION_LEVEL_BANDS[region_name] ?? null;
}

export function get_regional_boss(region_name: string): CombatRosterEntry | null {
  return COMBAT_BOSSES.find(b => b.is_regional_boss && b.regions.includes(region_name)) ?? null;
}

/** 每区 1 名区域 Boss（属性上限） */
const REGIONAL_BOSSES: CombatRosterEntry[] = [
  {
    id: 'boss_church_warden',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第一章',
    name: '守夜魔像',
    regions: ['圣光教会圣地'],
    level: 5,
    能力: { 生命: 55, 力量: 12, 体魄: 9, 智慧: 10 },
    note: '教会圣地区域 Boss；召唤试炼末段或巡逻精英',
  },
  {
    id: 'boss_trial_phantom',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第四章',
    name: '试炼幻阵·铁骑残影',
    regions: ['艾瑟兰王城'],
    level: 10,
    能力: { 生命: 80, 力量: 16, 体魄: 11, 智慧: 13 },
    note: '王城区域 Boss；骑士试炼，胜后获勇者之剑',
  },
  {
    id: 'boss_free_mercenary',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第二至三章',
    name: '佣兵统领',
    regions: ['中立自由地带'],
    level: 18,
    能力: { 生命: 110, 力量: 20, 体魄: 14, 智慧: 16 },
    note: '自由地带区域 Boss',
  },
  {
    id: 'boss_lilian',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第五章',
    name: '莉莉安',
    regions: ['矮人王国废墟'],
    level: 28,
    能力: { 生命: 145, 力量: 22, 体魄: 16, 智慧: 28 },
    note: '矮人废墟区域 Boss；裂谷遭遇战',
  },
  {
    id: 'boss_shion',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第六章',
    name: '紫苑',
    regions: ['精灵古森林'],
    level: 38,
    能力: { 生命: 185, 力量: 25, 体魄: 19, 智慧: 32 },
    note: '精灵森林区域 Boss；误会战，胜后得生命之心',
  },
  {
    id: 'boss_hakuryu',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第七章',
    name: '白璃',
    regions: ['远古遗迹带'],
    level: 48,
    能力: { 生命: 220, 力量: 30, 体魄: 23, 智慧: 28 },
    note: '远古遗迹区域 Boss（属性上限）；龙族首领须单独战胜',
  },
  {
    id: 'boss_lyx',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第八章',
    name: '莱克斯',
    regions: ['狐族领地'],
    level: 58,
    能力: { 生命: 260, 力量: 34, 体魄: 26, 智慧: 27 },
    note: '狐族区域 Boss；胜后得心灵之镜',
  },
  {
    id: 'boss_elvinna',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第九章',
    name: '埃尔温娜',
    regions: ['魔女隐域'],
    level: 68,
    能力: { 生命: 300, 力量: 32, 体魄: 24, 智慧: 36 },
    note: '魔女隐域区域 Boss；试炼式交战，胜后指路邪神葬地',
  },
  {
    id: 'boss_ashu',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第十章',
    name: '亚修',
    regions: ['邪神葬地'],
    level: 78,
    能力: { 生命: 340, 力量: 40, 体魄: 30, 智慧: 34 },
    note: '邪神葬地区域 Boss；魔王本体',
  },
  {
    id: 'boss_shuren',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第十二章',
    name: '修伦',
    regions: ['天空之门'],
    level: 88,
    能力: { 生命: 380, 力量: 42, 体魄: 34, 智慧: 36 },
    note: '天空之门区域 Boss；守门战',
  },
  {
    id: 'boss_liya',
    kind: 'boss',
    is_regional_boss: true,
    chapter: '第十二章',
    name: '莉娅',
    regions: ['圣域'],
    level: 98,
    能力: { 生命: 420, 力量: 46, 体魄: 38, 智慧: 40 },
    note: '圣域区域 Boss；女神终战',
  },
];

/** 主线额外 Boss（同区但弱于区域 Boss 上限） */
const STORY_BOSSES: CombatRosterEntry[] = [
  {
    id: 'boss_hiyoru',
    kind: 'boss',
    chapter: '第七章',
    name: '绯夜',
    regions: ['远古遗迹带'],
    level: 46,
    能力: { 生命: 210, 力量: 27, 体魄: 21, 智慧: 27 },
    note: '血族首领；数值不得超过同区 Boss 白璃，须单独战胜',
  },
];

export const COMBAT_BOSSES: CombatRosterEntry[] = [...REGIONAL_BOSSES, ...STORY_BOSSES];

/** 区域野怪（等级与四维均低于本区区域 Boss） */
export const COMBAT_WILD_ENEMIES: CombatRosterEntry[] = [
  // 圣光教会圣地 1–5 | Boss 守夜魔像 Lv5 55/12/9/10
  {
    id: 'wild_slime',
    kind: 'wild',
    tier: 'weak',
    name: '史莱姆',
    regions: ['圣光教会圣地'],
    level: 1,
    能力: { 生命: 35, 力量: 7, 体魄: 4, 智慧: 5 },
  },
  {
    id: 'wild_church_trainee',
    kind: 'wild',
    tier: 'normal',
    name: '教会见习',
    regions: ['圣光教会圣地'],
    level: 3,
    能力: { 生命: 42, 力量: 8, 体魄: 6, 智慧: 8 },
  },
  {
    id: 'wild_church_acolyte',
    kind: 'wild',
    tier: 'elite',
    name: '教会侍从',
    regions: ['圣光教会圣地'],
    level: 4,
    能力: { 生命: 48, 力量: 10, 体魄: 7, 智慧: 9 },
  },

  // 艾瑟兰王城 5–10 | Boss 铁骑残影 Lv10 80/16/11/13
  {
    id: 'wild_city_patrol',
    kind: 'wild',
    tier: 'weak',
    name: '城卫巡逻队',
    regions: ['艾瑟兰王城'],
    level: 5,
    能力: { 生命: 55, 力量: 11, 体魄: 8, 智慧: 9 },
  },
  {
    id: 'wild_bandit',
    kind: 'wild',
    tier: 'normal',
    name: '流浪盗匪',
    regions: ['艾瑟兰王城', '中立自由地带'],
    level: 7,
    能力: { 生命: 65, 力量: 13, 体魄: 9, 智慧: 10 },
  },
  {
    id: 'wild_squire',
    kind: 'wild',
    tier: 'elite',
    name: '骑士学徒',
    regions: ['艾瑟兰王城'],
    level: 9,
    能力: { 生命: 75, 力量: 15, 体魄: 10, 智慧: 12 },
  },

  // 中立自由地带 11–20 | Boss 佣兵统领 Lv18
  {
    id: 'wild_slave_hunter',
    kind: 'wild',
    tier: 'weak',
    name: '奴隶猎人',
    regions: ['中立自由地带'],
    level: 11,
    能力: { 生命: 75, 力量: 14, 体魄: 10, 智慧: 11 },
  },
  {
    id: 'wild_mercenary',
    kind: 'wild',
    tier: 'normal',
    name: '自由佣兵',
    regions: ['中立自由地带'],
    level: 14,
    能力: { 生命: 88, 力量: 16, 体魄: 11, 智慧: 13 },
  },
  {
    id: 'wild_fox_scout',
    kind: 'wild',
    tier: 'elite',
    name: '狐族斥候',
    regions: ['中立自由地带'],
    level: 17,
    能力: { 生命: 100, 力量: 18, 体魄: 12, 智慧: 15 },
  },

  // 矮人王国废墟 21–30 | Boss 莉莉安 Lv28
  {
    id: 'wild_rust_rat',
    kind: 'wild',
    tier: 'weak',
    name: '铁锈鼠群',
    regions: ['矮人王国废墟'],
    level: 21,
    能力: { 生命: 95, 力量: 16, 体魄: 10, 智慧: 8 },
  },
  {
    id: 'wild_iron_puppet',
    kind: 'wild',
    tier: 'normal',
    name: '铁锈傀儡',
    regions: ['矮人王国废墟'],
    level: 24,
    能力: { 生命: 110, 力量: 18, 体魄: 13, 智慧: 10 },
  },
  {
    id: 'wild_skyfall_wraith',
    kind: 'wild',
    tier: 'elite',
    name: '天罚残影',
    regions: ['矮人王国废墟'],
    level: 27,
    能力: { 生命: 130, 力量: 20, 体魄: 14, 智慧: 12 },
  },

  // 精灵古森林 31–40 | Boss 紫苑 Lv38
  {
    id: 'wild_forest_wolf',
    kind: 'wild',
    tier: 'weak',
    name: '森狼',
    regions: ['精灵古森林'],
    level: 31,
    能力: { 生命: 120, 力量: 18, 体魄: 12, 智慧: 14 },
  },
  {
    id: 'wild_maze_sprite',
    kind: 'wild',
    tier: 'normal',
    name: '迷障精灵',
    regions: ['精灵古森林'],
    level: 34,
    能力: { 生命: 135, 力量: 20, 体魄: 14, 智慧: 18 },
  },
  {
    id: 'wild_chaos_spore',
    kind: 'wild',
    tier: 'elite',
    name: '混沌孢兽',
    regions: ['精灵古森林'],
    level: 37,
    能力: { 生命: 165, 力量: 23, 体魄: 17, 智慧: 16 },
  },

  // 远古遗迹带 41–50 | Boss 白璃 Lv48
  {
    id: 'wild_relic_raider',
    kind: 'wild',
    tier: 'weak',
    name: '遗迹盗猎者',
    regions: ['远古遗迹带'],
    level: 41,
    能力: { 生命: 150, 力量: 22, 体魄: 14, 智慧: 16 },
  },
  {
    id: 'wild_dragon_sentinel',
    kind: 'wild',
    tier: 'normal',
    name: '龙裔哨兵',
    regions: ['远古遗迹带'],
    level: 44,
    能力: { 生命: 170, 力量: 24, 体魄: 16, 智慧: 18 },
  },
  {
    id: 'wild_vampire_servant',
    kind: 'wild',
    tier: 'elite',
    name: '血族仆从',
    regions: ['远古遗迹带'],
    level: 47,
    能力: { 生命: 200, 力量: 26, 体魄: 18, 智慧: 22 },
  },

  // 狐族领地 51–60 | Boss 莱克斯 Lv58
  {
    id: 'wild_fox_enforcer',
    kind: 'wild',
    tier: 'weak',
    name: '狐族执法者',
    regions: ['狐族领地'],
    level: 51,
    能力: { 生命: 180, 力量: 26, 体魄: 18, 智慧: 20 },
  },
  {
    id: 'wild_lyx_soldier',
    kind: 'wild',
    tier: 'normal',
    name: '莱克斯亲兵',
    regions: ['狐族领地'],
    level: 54,
    能力: { 生命: 210, 力量: 29, 体魄: 21, 智慧: 22 },
  },
  {
    id: 'wild_demonized_kitsune',
    kind: 'wild',
    tier: 'elite',
    name: '魔化狐妖',
    regions: ['狐族领地'],
    level: 57,
    能力: { 生命: 240, 力量: 32, 体魄: 23, 智慧: 24 },
  },

  // 魔女隐域 61–70 | Boss 埃尔温娜 Lv68
  {
    id: 'wild_tower_golem',
    kind: 'wild',
    tier: 'weak',
    name: '塔灵魔像',
    regions: ['魔女隐域'],
    level: 61,
    能力: { 生命: 220, 力量: 28, 体魄: 22, 智慧: 14 },
  },
  {
    id: 'wild_academy_construct',
    kind: 'wild',
    tier: 'normal',
    name: '学院构装体',
    regions: ['魔女隐域'],
    level: 64,
    能力: { 生命: 250, 力量: 30, 体魄: 23, 智慧: 16 },
  },
  {
    id: 'wild_grimoire_wraith',
    kind: 'wild',
    tier: 'elite',
    name: '禁书怨灵',
    regions: ['魔女隐域'],
    level: 67,
    能力: { 生命: 280, 力量: 31, 体魄: 22, 智慧: 28 },
  },

  // 邪神葬地 71–80 | Boss 亚修 Lv78
  {
    id: 'wild_grave_horror',
    kind: 'wild',
    tier: 'weak',
    name: '葬地魔物',
    regions: ['邪神葬地'],
    level: 71,
    能力: { 生命: 260, 力量: 32, 体魄: 20, 智慧: 16 },
  },
  {
    id: 'wild_demon_knight',
    kind: 'wild',
    tier: 'normal',
    name: '魔族骑士',
    regions: ['邪神葬地'],
    level: 74,
    能力: { 生命: 290, 力量: 35, 体魄: 24, 智慧: 20 },
  },
  {
    id: 'wild_seal_echo',
    kind: 'wild',
    tier: 'elite',
    name: '封印残响',
    regions: ['邪神葬地'],
    level: 77,
    能力: { 生命: 320, 力量: 38, 体魄: 27, 智慧: 24 },
  },

  // 天空之门 81–90 | Boss 修伦 Lv88
  {
    id: 'wild_inquisitor',
    kind: 'wild',
    tier: 'weak',
    name: '圣光审判官',
    regions: ['天空之门'],
    level: 81,
    能力: { 生命: 300, 力量: 36, 体魄: 28, 智慧: 26 },
  },
  {
    id: 'wild_realm_attendant',
    kind: 'wild',
    tier: 'normal',
    name: '界域眷族',
    regions: ['天空之门'],
    level: 84,
    能力: { 生命: 330, 力量: 38, 体魄: 30, 智慧: 28 },
  },
  {
    id: 'wild_light_construct',
    kind: 'wild',
    tier: 'elite',
    name: '圣光构装',
    regions: ['天空之门'],
    level: 87,
    能力: { 生命: 360, 力量: 40, 体魄: 32, 智慧: 30 },
  },

  // 圣域 91–100 | Boss 莉娅 Lv98
  {
    id: 'wild_seraph_shard',
    kind: 'wild',
    tier: 'weak',
    name: '圣光使徒',
    regions: ['圣域'],
    level: 91,
    能力: { 生命: 340, 力量: 40, 体魄: 32, 智慧: 30 },
  },
  {
    id: 'wild_faith_afterimage',
    kind: 'wild',
    tier: 'elite',
    name: '信仰残影',
    regions: ['圣域'],
    level: 95,
    能力: { 生命: 380, 力量: 43, 体魄: 34, 智慧: 34 },
  },
];

export const COMBAT_ENEMIES: CombatEnemyTemplate[] = [...COMBAT_WILD_ENEMIES, ...COMBAT_BOSSES];

const BOSS_NAME_ALIASES: Record<string, string> = {
  试炼幻阵: '试炼幻阵·铁骑残影',
  铁骑残影: '试炼幻阵·铁骑残影',
  '魔王护法·紫苑': '紫苑',
  魔王护法紫苑: '紫苑',
  '四天王·莱克斯': '莱克斯',
  四天王莱克斯: '莱克斯',
  '四天王·埃尔温娜': '埃尔温娜',
  四天王埃尔温娜: '埃尔温娜',
  '教会圣骑士·修伦': '修伦',
  教会圣骑士修伦: '修伦',
  修伦: '修伦',
  魔王: '亚修',
  '魔王·亚修': '亚修',
  亚修: '亚修',
  女神: '莉娅',
  '女神·莉娅': '莉娅',
  龙族首领: '白璃',
  血族首领: '绯夜',
};

function normalize_boss_name(name: string): string {
  const trimmed = name.trim();
  return BOSS_NAME_ALIASES[trimmed] ?? trimmed;
}

export function list_wild_enemies(region_name: string): CombatRosterEntry[] {
  const band = REGION_LEVEL_BANDS[region_name];
  return COMBAT_WILD_ENEMIES.filter(e => {
    if (!e.regions.includes(region_name)) return false;
    if (!band) return true;
    return e.level >= band.min_level && e.level <= band.max_level;
  });
}

export function list_bosses(region_name?: string): CombatRosterEntry[] {
  if (!region_name) return [...COMBAT_BOSSES];
  return COMBAT_BOSSES.filter(e => e.regions.includes(region_name));
}

export function pick_wild_enemy(region_name: string): CombatRosterEntry | null {
  const pool = list_wild_enemies(region_name);
  if (!pool.length) return null;
  return pool[_.random(0, pool.length - 1)];
}

/** @deprecated 请用 pick_wild_enemy */
export function pick_combat_enemy(region_name: string): CombatEnemyTemplate | null {
  return pick_wild_enemy(region_name);
}

export function find_boss_template(name: string): CombatRosterEntry | null {
  const canonical = normalize_boss_name(name);
  return (
    COMBAT_BOSSES.find(
      b => b.name === canonical || b.name === name.trim() || b.id.includes(canonical),
    ) ?? null
  );
}

export function format_battle_tag(entry: CombatRosterEntry, desc?: string): string {
  const region = entry.regions[0] ?? '未知';
  const { name, level, 能力 } = entry;
  const body = desc?.trim() ? `>${desc.trim()}</battle>` : ' />';
  const open = `<battle name="${name}" level="${level}" 生命="${能力.生命}" 力量="${能力.力量}" 体魄="${能力.体魄}" 智慧="${能力.智慧}" region="${region}"`;
  return body.startsWith(' />') ? `${open} />` : `${open}${body}`;
}
