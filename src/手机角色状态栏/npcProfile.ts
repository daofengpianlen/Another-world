import type { Schema } from './schema';

export type NpcEntry = Schema['邂逅名录'][string];

const EMPTY = '—';

function display_text(value: unknown, fallback = '无'): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export function format_virgin_label(value: unknown): string {
  if (typeof value === 'boolean') return value ? '✓ 是' : '✗ 否';
  const text = String(value ?? '').trim();
  if (/^(是|true|yes|y|1|处女)$/i.test(text)) return '✓ 是';
  if (/^(否|false|no|n|0|非处女|不是)$/i.test(text)) return '✗ 否';
  return text || EMPTY;
}

export function format_count_suffix(value: unknown, suffix: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return display_text(value);
  return `${n}${suffix}`;
}

export interface NpcStatusRow {
  label: string;
  value: string;
  prefix?: string;
}

export interface NpcStatusSection {
  icon: string;
  title: string;
  rows: NpcStatusRow[];
  bullets?: string[];
}

export function build_npc_status_sections(npc: NpcEntry): NpcStatusSection[] {
  const appearance = npc.外观特征 ?? {};
  const clothing = npc.当前服装 ?? {};
  const sex = npc.性经验档案 ?? {};
  const physiology = npc.生理状态 ?? {};
  const interaction = npc.互动记录 ?? {};

  const sections: NpcStatusSection[] = [
    {
      icon: '👤',
      title: '外观特征',
      rows: [
        { label: '身高', value: display_text(appearance.身高) },
        { label: '体型', value: display_text(appearance.体型) },
        { label: '发色', value: display_text(appearance.发色) },
        { label: '发型', value: display_text(appearance.发型) },
        { label: '瞳色', value: display_text(appearance.瞳色) },
      ],
    },
    {
      icon: '👗',
      title: '当前服装',
      rows: [
        { label: '上装', value: display_text(clothing.上装), prefix: '👔' },
        { label: '下装', value: display_text(clothing.下装), prefix: '👖' },
        { label: '内衣', value: display_text(clothing.内衣), prefix: '👙' },
        { label: '内裤', value: display_text(clothing.内裤), prefix: '👙' },
        { label: '袜子', value: display_text(clothing.袜子), prefix: '🧦' },
        { label: '鞋子', value: display_text(clothing.鞋子), prefix: '👠' },
      ],
    },
    {
      icon: '💋',
      title: '性经验',
      rows: [
        { label: '处女', value: format_virgin_label(sex.处女) },
        { label: '性交次数', value: format_count_suffix(sex.性交次数, '次') },
        { label: '性伴侣数', value: format_count_suffix(sex.性伴侣数, '人') },
        { label: '初次对象', value: display_text(sex.初次对象) },
        { label: '后庭经验', value: display_text(sex.后庭经验) },
        { label: '口交经验', value: display_text(sex.口交经验) },
      ],
    },
    {
      icon: '🩺',
      title: '生理状态',
      rows: [
        { label: '阴道润滑', value: display_text(physiology.阴道润滑) },
        { label: '乳头状态', value: display_text(physiology.乳头状态) },
        { label: '阴蒂状态', value: display_text(physiology.阴蒂状态) },
        { label: '子宫状态', value: display_text(physiology.子宫状态) },
        { label: '怀孕状态', value: display_text(physiology.怀孕状态, '未怀孕') },
      ],
    },
  ];

  const events = [...(interaction.难忘事件 ?? [])];
  if (!events.length && npc.近期性经历?.trim()) {
    events.push(npc.近期性经历.trim());
  }

  sections.push({
    icon: '📖',
    title: '互动记录',
    rows: [{ label: '难忘事件', value: '', prefix: '📝' }],
    bullets: events.length ? events : ['暂无记录'],
  });

  return sections;
}

export function npc_has_structured_profile(npc: NpcEntry): boolean {
  const sections = build_npc_status_sections(npc);
  return sections.some(section =>
    section.rows.some(row => row.value && row.value !== '无' && row.value !== EMPTY) ||
    (section.bullets?.length ?? 0) > 0,
  );
}
