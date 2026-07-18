/**
 * 将仓库世界书 / 脚本同步到 src/鸣潮/卡/鸣潮线上.json
 * 运行: node src/鸣潮/卡/sync-card.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wuwaRoot = path.resolve(__dirname, '..');
const cardPath = path.resolve(__dirname, '鸣潮线上.json');

function readText(rel) {
  return fs.readFileSync(path.resolve(wuwaRoot, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(readText(rel));
}

function upsertEntry(entries, commentMatch, content, patch = {}) {
  let entry = entries.find(e => e.comment && commentMatch(e.comment));
  if (!entry) {
    const maxId = entries.reduce((m, e) => Math.max(m, e.id ?? 0), 0);
    entry = {
      id: maxId + 1,
      keys: [],
      secondary_keys: [],
      comment: patch.comment ?? commentMatch.toString(),
      content: '',
      constant: patch.constant ?? true,
      selective: false,
      insertion_order: patch.insertion_order ?? 405,
      enabled: patch.enabled ?? true,
      position: 'after_char',
      use_regex: true,
      extensions: {
        position: 4,
        exclude_recursion: true,
        display_index: patch.display_index ?? 356,
        probability: 100,
        useProbability: true,
        depth: patch.depth ?? 0,
        selectiveLogic: 0,
        outlet_name: '',
        group: '',
        group_override: false,
        group_weight: 100,
        prevent_recursion: true,
        delay_until_recursion: false,
        scan_depth: null,
        match_whole_words: null,
        use_group_scoring: false,
        case_sensitive: null,
        automation_id: '',
        role: 0,
        vectorized: false,
        sticky: null,
        cooldown: null,
        delay: null,
        match_persona_description: false,
        match_character_description: false,
        match_character_personality: false,
        match_character_depth_prompt: false,
        match_scenario: false,
        match_creator_notes: false,
        triggers: [],
        ignore_budget: patch.ignore_budget ?? true,
      },
    };
    entries.push(entry);
    console.log(`+ 新建条目: ${entry.comment}`);
  }
  entry.content = content;
  Object.assign(entry, patch);
  console.log(`✓ 更新条目: ${entry.comment}`);
  return entry;
}

// --- main ---
execSync('node src/鸣潮/工具/scanCgIndexFromDisk.mjs && node src/鸣潮/工具/generateCgGuide.mjs', { stdio: 'inherit', cwd: path.resolve(wuwaRoot, '../..') });

const card = readJson('卡/鸣潮线上.json');
const entries = card.data.character_book.entries;
const scripts = card.data.extensions.tavern_helper.scripts;

// 1. 鸣潮变量结构脚本
const varScript = readJson('导入到酒馆中/脚本-鸣潮变量结构.json');
if (!scripts.some(s => s.name === '鸣潮变量结构')) {
  scripts.splice(1, 0, varScript);
  console.log('+ 添加脚本: 鸣潮变量结构');
} else {
  const idx = scripts.findIndex(s => s.name === '鸣潮变量结构');
  scripts[idx] = { ...scripts[idx], ...varScript, enabled: true };
  console.log('✓ 更新脚本: 鸣潮变量结构');
}

// 2. post_history_instructions
card.data.post_history_instructions =
  '【系统】每条含 <gal> 的剧情回复必须在 <StatusPlaceHolderImpl/> 之后输出完整 <UpdateVariable>。漂泊者与 stat_data.女性角色 在 GAL 中只能 <z>，禁止 <other>/<j>；仅未入库次要路人用 <other>；同一角色禁止混用标签。插入 CG 时 <pic> 只能使用世界书「CG插入规范」白名单中的场景名，禁止 catbox/URL/编造场景名。';

// 3. 世界书条目同步
const fileMap = [
  { match: c => c.includes('[mvu_update]变量格式强调'), file: '世界书/格式/MVU格式要求.txt' },
  { match: c => c.includes('[mvu_update]变量更新规则'), file: '世界书/变量/变量更新规则.yaml' },
  { match: c => c.includes('[mvu_update]变量输出格式') || c.includes('变量输出格式'), file: '世界书/变量/变量输出格式.yaml' },
  { match: c => c.includes('变量列表'), file: '世界书/变量/变量列表.txt' },
  { match: c => c === '格式要求', file: '世界书/格式/GAL输出格式.txt' },
  { match: c => c.includes('[initvar]'), file: '世界书/变量/initvar-线上卡后日谈.yaml' },
];

for (const { match, file } of fileMap) {
  upsertEntry(entries, match, readText(file));
}

// 变量列表条目改名
const listEntry = entries.find(e => e.comment?.includes('变量列表'));
if (listEntry && !listEntry.comment.includes('[mvu_update]')) {
  listEntry.comment = '[mvu_update]变量列表';
  console.log('✓ 重命名: [mvu_update]变量列表');
}

// 4. CG 插入规范（新生成文件）
upsertEntry(
  entries,
  c => c.includes('CG插入规范'),
  readText('世界书/格式/CG插入规范.txt'),
  { comment: '[mvu_gal]CG插入规范', insertion_order: 403, display_index: 354 },
);

// 5. 示例条目
const examples = [
  { comment: '[mvu_example]完整首楼回复示例', file: '世界书/示例/完整首楼回复示例.txt', order: 406 },
  { comment: '[mvu_example]小爱界面完整输出示例', file: '世界书/示例/小爱界面完整输出示例.txt', order: 407 },
  { comment: '[mvu_example]日常亲密场景完整输出示例', file: '世界书/示例/日常亲密场景完整输出示例.txt', order: 408 },
];
for (const ex of examples) {
  upsertEntry(entries, c => c.includes(ex.comment.replace('[mvu_example]', '')), readText(ex.file), {
    comment: ex.comment,
    insertion_order: ex.order,
    display_index: 350 + ex.order - 400,
    enabled: true,
    constant: true,
    depth: 0,
  });
}

// 6. 禁用旧插画 catbox 条目（与 GAL 冲突）
for (const e of entries) {
  if (e.comment?.includes('插画 - ') && e.comment.includes('[mvu_plot]')) {
    e.enabled = false;
    console.log(`✓ 禁用冲突条目: ${e.comment}`);
  }
}

// 7. MVU格式要求 内补充 CG 条目引用（若尚未包含）
const mvuEntry = entries.find(e => e.comment?.includes('变量格式强调'));
if (mvuEntry && !mvuEntry.content.includes('CG插入规范')) {
  mvuEntry.content = mvuEntry.content.replace(
    '    - "GAL输出格式" → 伪同层标签与 pic 规则',
    '    - "GAL输出格式" → 伪同层标签与 pic 规则\n    - "[mvu_gal]CG插入规范" → 各角色可用 CG 场景名白名单（禁止编造）',
  );
  console.log('✓ MVU格式要求 补充 CG 条目引用');
}

fs.writeFileSync(cardPath, JSON.stringify(card, null, 4), 'utf8');
console.log(`\nDone → ${cardPath}`);
