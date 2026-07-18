/**
 * 从 cgSceneIndex.json（应先运行 scanCgIndexFromDisk.mjs）生成世界书「CG插入规范」。
 * 运行: node src/鸣潮/工具/generateCgGuide.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '../assets/cgSceneIndex.json');
const outPath = path.resolve(__dirname, '../世界书/格式/CG插入规范.txt');

const { index } = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

/** 同一文件只保留 AI 应使用的「主场景名」 */
function canonicalScenes(charName, scenes) {
  const pathToKeys = new Map();
  for (const [key, rel] of Object.entries(scenes)) {
    if (!pathToKeys.has(rel)) pathToKeys.set(rel, []);
    pathToKeys.get(rel).push(key);
  }

  const pickPrimary = keys => {
    const sorted = [...keys].sort((a, b) => a.length - b.length);
    const preferred = sorted.find(k => k === '日常')
      ?? sorted.find(k => !['默认', charName].includes(k) && !k.startsWith('('));
    if (preferred) return preferred;
    return sorted[0];
  };

  const primary = [];
  const seen = new Set();
  for (const keys of pathToKeys.values()) {
    const main = pickPrimary(keys);
    if (!seen.has(main)) {
      seen.add(main);
      primary.push(main);
    }
  }
  return primary.sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

const STANDARD_FEMALE = canonicalScenes('秧秧', index['秧秧'] ?? {});

const specialNotes = {
  多形态角色_总则:
    '已拆分子文件夹的角色：`<z>` 写带括号的形态名，`<pic>` 只写无前缀场景名。SFW 日常统一写「日常」。例：`<z>爱莉希雅（女神）<pic>手交</pic>`',
  爱莉希雅: '子角色：爱莉希雅（女神）、爱莉希雅（女仆）、爱莉希雅（小精灵）；小精灵仅「日常」',
  卡提希娅: '主形态文件夹为「卡提希娅」：`<z>卡提希娅（卡提希娅）` 或 `<z>卡提希娅`；芙露德莉斯用 `<z>卡提希娅（芙露德莉斯）`；pic 写「手交」「亲吻」等，勿加角色前缀',
  椿: '单文件夹「椿」：日常 SFW 写「日常」；红发/病娇形态 SFW 可写「红发形态」（若清单中有）',
  千咲: '单文件夹「千咲」：`<z>千咲` + `<pic>` 写磁盘文件名；厌恶线如 `(厌恶)足交`（与（厌恶）足交.mp4 对应）',
  雪漓泷: '日常形态 `<z>雪漓泷`；龙女形态 `<z>雪漓泷（龙女形态）`',
  爱弥斯: '单文件夹「爱弥斯」：`<z>爱弥斯` + `<pic>` 写磁盘文件名（日常、遂兵形态、手交…）',
  女漂泊者: '日常 SFW 写「日常」或「日常状态」（以清单为准）',
  西格莉卡: '部分场景文件名简写，清单以「女上位做爱」「正常位做爱」为准',
  弗洛洛: '无「暴露小穴」，有「被掰穴」',
};

const FORM_SPLIT_CHARS = new Set([
  '爱莉希雅（女神）',
  '爱莉希雅（女仆）',
  '爱莉希雅（小精灵）',
  '卡提希娅（芙露德莉斯）',
  '卡提希娅（卡提希娅）',
  '雪漓泷（龙女形态）',
  '千咲（厌恶）',
]);

const maleChars = Object.keys(index).filter(name => {
  const rel = Object.values(index[name])[0] ?? '';
  return rel.includes('cg/男性角色/');
});

const femaleStandard = Object.keys(index).filter(name => {
  if (maleChars.includes(name)) return false;
  if (FORM_SPLIT_CHARS.has(name)) return false;
  if (['女漂泊者', '千咲', '西格莉卡', '弗洛洛', '椿', '爱弥斯', '卡提希娅', '卡提希娅（卡提希娅）'].includes(name)) return false;
  const scenes = canonicalScenes(name, index[name]);
  return scenes.length >= 10 && (scenes.includes('日常') || scenes.includes('普通插图'));
});

let body = `---
CG插入规范:
  条目说明: |-
    【权威 CG 白名单】伪同层 GAL 的 <pic> 只能引用本条目「完整角色清单」中的场景名。
    与「GAL输出格式」冲突时，以 GAL 规则 + 本条目白名单为准。
    本条目由 assets/cg 实际文件自动生成，生成时间见 cgSceneIndex.json。
    已废弃：世界书中旧的「插画 - * [mvu_plot]」catbox 文件名列表——**禁止**再使用。

    【最简单记法】直接看 src/鸣潮/assets/cg 文件夹：
    \`<z>文件夹名<pic>该文件夹内文件名（去扩展名）</pic>\` → assets/cg/{文件夹名}/{文件名}.mp4

  硬性规则_违反则 CG 无法显示:
    - pic 标签内**只能**写本条目清单中的**场景名**（中文），禁止 URL、禁止 .mp4/.png、禁止 catbox 哈希名
    - **禁止**编造清单外场景名（如「骑乘」「深喉」「侧入」「浴室做爱」「全裸」等若不在清单中则不可用）
    - **禁止**把场景名写成「角色名/场景名」路径格式；只写场景名本身
    - 角色在 <z> 开头声明，pic 只写场景名：<z>秧秧<pic>手交</pic>台词</z>
    - 多形态角色须在 <z> 写形态子角色名：<z>爱莉希雅（女仆）<pic>口交</pic>；SFW 日常写 <pic>日常</pic>
    - 若当前角色**没有**对应场景 CG：**省略 <pic>**，仅用 <p> 旁白描写，不得伪造 pic
    - pic 必须成对闭合 </pic>，禁止 </p>
    - SFW 日常：写「日常」；NSFW 须剧情已到相应阶段，场景名与清单完全一致

  解析规则_前端如何匹配:
    - **核心**：<z> = assets/cg 下的文件夹名；<pic> = 该文件夹内媒体文件名去掉扩展名
    - 组合键：<z> 文件夹名 + <pic> 文件名 → lookupCgScene → assets/cg/{文件夹}/{文件}
    - 角色别名：写「漂泊者」时按主角性别匹配「女漂泊者」或「男漂泊者」
    - 场景简写：「日常」匹配该角色的日常类 CG（日常.mp4 / 日常状态 等）
    - 手交射精、口交射精等须用清单中的完整场景名，禁止「手交高潮」「指交」等旧名
    - 匹配失败时界面不显示 CG，**不会**自动 fallback 到其他图

  输出格式:
    正确: <z>爱莉希雅（女神）<pic>手交</pic>……</z>
    正确: <z>卡提希娅（芙露德莉斯）<pic>亲吻</pic>……</z>
    正确: <z>秧秧<pic>亲吻</pic>……</z>
    正确: <z>漂泊者<pic>日常</pic>……</z>
    正确: <z>千咲（厌恶）<pic>手交</pic>……</z>
    错误: <z>秧秧<pic>vwlogi.mp4</pic>
    错误: <z>秧秧<pic>秧秧/手交</pic>
    错误: <z>爱莉希雅<pic>女神_手交</pic>（应写 <z>爱莉希雅（女神）<pic>手交</pic>）
    错误: <z>千咲（厌恶）<pic>（厌恶）手交</pic>（pic 不要带形态前缀）
    错误: <z>未知角色<pic>日常</pic>（角色无 CG 库则勿写 pic）

  标准女角色_通用场景名参考:
    说明: 下列角色使用**与此相同或高度重合**的场景名（以各角色清单为准，少数角色有增减）
    场景列表:
${STANDARD_FEMALE.map(s => `      - ${s}`).join('\n')}

  特殊角色_命名须知:
`;

for (const [name, note] of Object.entries(specialNotes)) {
  body += `    ${name}: ${note}\n`;
}

body += `
  标准模板角色_可直接对照上述场景列表:
    说明: 与「标准女角色_通用场景名参考」场景高度重合，插入 pic 前查本表确认有无增减
    角色: ${femaleStandard.join('、')}

  男性角色_仅默认立绘:
    说明: 男性角色库仅有「默认/日常」单 CG，无亲密场景 pic；亲密互动勿写 pic 或仅用旁白
    角色: ${maleChars.join('、')}

  完整角色清单_仅可使用下列场景名:
    说明: AI 插入 <pic> 前**必须**查本表；表中没有的场景**一律禁止**输出
`;

const listed = new Set();
for (const charName of Object.keys(index).sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
  if (charName === '卡提希娅' && index['卡提希娅（卡提希娅）']) continue;
  listed.add(charName);
  const scenes = canonicalScenes(charName, index[charName]);
  body += `\n    ${charName}:\n`;
  for (const s of scenes) {
    body += `      - ${s}\n`;
  }
}

body += `
  决策流程:
    步骤1: 确认 <z> 角色名（含形态括号）是否在「完整角色清单」中
    步骤2: 确认当前剧情动作对应清单中哪一条场景名（须与清单完全一致）
    步骤3: 若步骤1或2任一失败 → 不写 <pic>
    步骤4: 输出 <z>角色<pic>场景名</pic>台词</z>

  与_MV U_协作:
    - 输出 pic 不改变 stat_data；但亲密场景仍须 replace 性爱状态/生理状态（见变量更新规则）
    - 破处场景：pic 用「破处」；须与 女性角色.{名}.基础信息.是否为处女 一致
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body, 'utf8');
console.log(`Wrote ${outPath} (${body.length} chars, ${listed.size} characters in guide)`);
