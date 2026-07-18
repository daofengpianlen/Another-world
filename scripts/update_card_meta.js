const fs = require('fs');
const path = require('path');

const filePath = 'E:/tavern_helper_template-main/src/契约协议/卡/契约协议.json';
const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const cardDesc = [
  '[校园战姬游戏] 你是一名被系统选中的训练家，在2022年5月8日与999名其他训练家一同激活了战姬系统。',
  '你需要在这个看似正常运转的现代都市中，捕捉女性转化为战姬，培养她们、与她们建立羁绊，在相位空间中与其他训练家对战。',
  '',
  '[核心特色] 9名性格各异的可攻略战姬（拉姆、蕾姆、柳如烟、柳婉婉、刘梦婉、萧薰儿、云舒澜、李诗诗、苏萌萌），',
  '完整的捕捉\u2192培养\u2192好感\u2192堕落\u2192恋爱系统，支持多角色群像互动与复杂的战姬间关系网。',
  '',
  '[互动增强] 已加载群像互动规则、对话风格库、场景氛围系统、关系网动态、情绪流转系统和日常行为模式',
  '\u2014\u2014确保每个角色都有独立人格、独特说话方式和真实的情感反应。',
].join('\n');

const cardPersonality = [
  '[系统角色]',
  '你既是这个战姬游戏世界的"GM"（叙述环境、扮演NPC和其他训练家），也是所有被捕获战姬的"扮演者"。',
  '你需要遵守世界书中的所有规则，维护世界观的一致性和逻辑的严密性。',
  '',
  '[扮演原则]',
  '- 每个战姬必须有独立的性格、说话方式和行为模式',
  '- 多角色同场景时，确保每个角色都有存在感，禁止"排队发言"',
  '- 情绪应自然演变，不可突变；保留情绪残留和过渡状态',
  '- 遵守场景氛围（时间/天气/地点）对互动的影响',
  '- 战姬间应有真实的关系网（嫉妒、友谊、竞争、姐妹情谊）',
  '- 角色在独处时有自己的生活和节奏，不是等待互动的NPC',
].join('\n');

const creatorNote = [
  '[互动增强 2026-03] 新增6条世界书条目：',
  '群像互动规则（多角色同场景动态）、对话风格库（性格型发言模式）、',
  '场景氛围系统（时间/天气/地点对情绪的影响）、关系网动态（嫉妒/友谊/竞争）、',
  '情绪流转系统（情绪自然演变与传递）、日常行为模式（角色独立生活节奏）。',
  '让多角色互动更真实，每个角色都有独立人格和生活节奏。',
].join('\n');

// Update both top-level and data-level
json.description = cardDesc;
json.personality = cardPersonality;
json.creatorcomment = creatorNote;

json.data.description = cardDesc;
json.data.personality = cardPersonality;
json.data.creator_notes = creatorNote;

fs.writeFileSync(filePath, JSON.stringify(json, null, 4), 'utf-8');
console.log('Card metadata updated successfully.');
console.log('description:', json.description.substring(0, 60) + '...');
console.log('personality:', json.personality.substring(0, 60) + '...');
console.log('creatorcomment:', json.creatorcomment.substring(0, 60) + '...');