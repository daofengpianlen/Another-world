import type { Schema } from './schema';

export type StatChangeKind = 'gain' | 'loss';

export interface StatChangeNotice {
  id: string;
  kind: StatChangeKind;
  text: string;
}

const ABILITY_LABELS = ['生命', '力量', '体魄', '智慧'] as const;

function push_delta(
  out: Omit<StatChangeNotice, 'id'>[],
  label: string,
  prev: number,
  next: number,
) {
  if (prev === next) return;
  const delta = next - prev;
  const kind: StatChangeKind = delta >= 0 ? 'gain' : 'loss';
  const sign = delta > 0 ? '+' : '';
  out.push({ kind, text: `${label} ${sign}${delta}` });
}

function diff_hero(prev: Schema['主角'], next: Schema['主角'], out: Omit<StatChangeNotice, 'id'>[]) {
  push_delta(out, '等级', prev.等级, next.等级);
  push_delta(out, '经验', prev.经验, next.经验);
  push_delta(out, '金币', prev.金币, next.金币);

  for (const key of ABILITY_LABELS) {
    push_delta(out, key, prev.能力[key], next.能力[key]);
  }
}

function diff_inventory(
  prev: Schema['背包'],
  next: Schema['背包'],
  out: Omit<StatChangeNotice, 'id'>[],
) {
  const prev_names = new Set(Object.keys(prev));
  const next_names = new Set(Object.keys(next));

  for (const name of next_names) {
    if (!prev_names.has(name)) {
      const qty = next[name]?.数量 ?? 1;
      out.push({
        kind: 'gain',
        text: qty > 1 ? `获得 ${name} ×${qty}` : `获得 ${name}`,
      });
      continue;
    }

    const p = prev[name]?.数量 ?? 1;
    const n = next[name]?.数量 ?? 1;
    if (p !== n) {
      const delta = n - p;
      const kind: StatChangeKind = delta >= 0 ? 'gain' : 'loss';
      const sign = delta > 0 ? '+' : '';
      out.push({ kind, text: `${name} ${sign}${delta}` });
    }
  }

  for (const name of prev_names) {
    if (!next_names.has(name)) {
      out.push({ kind: 'loss', text: `失去 ${name}` });
    }
  }
}

function diff_npcs(
  prev: Schema['邂逅名录'],
  next: Schema['邂逅名录'],
  out: Omit<StatChangeNotice, 'id'>[],
) {
  const prev_names = new Set(Object.keys(prev));
  const next_names = new Set(Object.keys(next));

  for (const name of next_names) {
    const p = prev[name];
    const n = next[name];
    if (!p) {
      out.push({ kind: 'gain', text: `结识 ${name}` });
      continue;
    }
    if (!n) continue;

    push_delta(out, `${name} 好感度`, p.好感度, n.好感度);
    push_delta(out, `${name} 性欲`, p.性欲, n.性欲);
    push_delta(out, `${name} 等级`, p.等级, n.等级);

    for (const key of ABILITY_LABELS) {
      push_delta(out, `${name} ${key}`, p.能力[key], n.能力[key]);
    }
  }
}

/** 对比两次 MVU stat_data，生成浮动提示条目（不含 id） */
export function diff_stat_data(prev: Schema, next: Schema): Omit<StatChangeNotice, 'id'>[] {
  const out: Omit<StatChangeNotice, 'id'>[] = [];
  diff_hero(prev.主角, next.主角, out);
  diff_inventory(prev.背包, next.背包, out);
  diff_npcs(prev.邂逅名录, next.邂逅名录, out);
  return out;
}
