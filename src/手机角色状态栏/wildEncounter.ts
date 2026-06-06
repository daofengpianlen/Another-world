import type { GalBattleData } from './galParser';
import {
  pick_wild_enemy,
  type CombatEnemyTier,
  type CombatRosterEntry,
} from './combatRoster';
import { is_valid_map_region, read_current_region } from './regionState';
import { useCombatStore } from './combatStore';

export function roster_entry_to_battle(
  entry: CombatRosterEntry,
  desc?: string,
): GalBattleData {
  return {
    name: entry.name,
    level: entry.level,
    能力: { ...entry.能力 },
    region: entry.regions[0] ?? '未知',
    desc: desc ?? `${entry.name} 从阴影中现身！`,
  };
}

export function request_wild_encounter(region_name: string): boolean {
  if (!is_valid_map_region(region_name)) {
    toastr.error('未知区域');
    return false;
  }

  const combat = useCombatStore();
  if (combat.active) {
    toastr.warning('战斗进行中，无法遇敌');
    return false;
  }
  if (combat.has_encounter_offer) {
    toastr.warning('请先处理当前遭遇');
    return false;
  }

  const entry = pick_wild_enemy(region_name);
  if (!entry) {
    toastr.error(`${region_name} 暂无野怪数据`);
    return false;
  }

  const battle = roster_entry_to_battle(entry);
  combat.try_offer_encounter(`wild:${region_name}:${Date.now()}`, battle, {
    source: 'wild',
    tier: entry.tier,
  });
  console.info('[野外] 遭遇', { region: region_name, enemy: entry.name, tier: entry.tier });
  return true;
}

export function request_wild_encounter_at_current_location(): boolean {
  return request_wild_encounter(read_current_region());
}

export type { CombatEnemyTier };
