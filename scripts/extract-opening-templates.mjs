import fs from 'fs';

const html = fs.readFileSync('scripts/card-opening-html.txt', 'utf8');
const ids = ['student', 'worker', 'neet', 'delinquent'];
const dir = 'src/契约协议/脚本/开场/templates';
fs.mkdirSync(dir, { recursive: true });

for (const id of ids) {
  const re = new RegExp(`<template id="opening-${id}">([\\s\\S]*?)</template>`);
  const m = html.match(re);
  if (!m) {
    console.error('missing', id);
    process.exit(1);
  }
  fs.writeFileSync(`${dir}/${id}.md`, m[1].trim());
  console.log(id, m[1].trim().length);
}
