import fs from 'fs';

const j = JSON.parse(fs.readFileSync('src/契约协议/卡/战姬捕捉系统.json', 'utf8'));
const rs = j.data.extensions.regex_scripts.find(x => x.scriptName === '开局前端');
const html = rs.replaceString;
fs.writeFileSync('scripts/card-opening-html.txt', html);
const idx = html.indexOf('function getOpeningText');
console.log('getOpeningText at', idx);
if (idx >= 0) fs.writeFileSync('scripts/card-opening-getOpeningText.txt', html.slice(idx, idx + 8000));
