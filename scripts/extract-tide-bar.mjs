import fs from 'fs';
import path from 'path';

const jsonPath = path.join('src', '鸣潮', '参考脚本', 'regex-[美化]mvu浪潮状态栏_0305.json');
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let s = j.replaceString.trim();
if (s.startsWith('```')) {
  s = s.replace(/^```\n?/, '').replace(/\n?```$/, '');
}

const dir = path.join('src', '鸣潮', 'shared', 'tideBar');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'tideBarDocument.html'), s);
console.log('extracted bytes:', s.length);
