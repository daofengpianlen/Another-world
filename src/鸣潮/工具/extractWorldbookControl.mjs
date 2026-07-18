/**
 * 从 鸣潮线上.json 或指定 JSON 提取世界书控制脚本，生成 phone 可嵌入版本。
 * node src/鸣潮/工具/extractWorldbookControl.mjs [json路径]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultJson = path.resolve(__dirname, '../卡/鸣潮线上.json');
const srcJson = process.argv[2] ? path.resolve(process.argv[2]) : defaultJson;
const outPath = path.resolve(__dirname, '../shared/worldbookControl/worldbookControlCore.js');

function extractContent(jsonText) {
  const data = JSON.parse(jsonText);
  if (typeof data.content === 'string') return data.content;
  const walk = node => {
    if (!node || typeof node !== 'object') return null;
    if (node.name?.includes('世界书控制') && typeof node.content === 'string') return node.content;
    for (const v of Object.values(node)) {
      const found = walk(v);
      if (found) return found;
    }
    return null;
  };
  return walk(data);
}

let code = extractContent(fs.readFileSync(srcJson, 'utf8'));
if (!code) throw new Error('未找到世界书控制脚本 content');

code = code.replace(
  'function createFloatingWindow() {',
  `function wbFloatParent() {
  const el = window.__WUWA_WB_PHONE_OVERLAY_EL__;
  if (el) return $(el);
  return $('body');
}
function createFloatingWindow() {`,
);

code = code.replace(
  "$('body').append(html);\n  refreshFloatingWindowContent();",
  'wbFloatParent().append(html);\n  refreshFloatingWindowContent();',
);

code = code.replace(
  "$('body').append(html);\n  $('#wb-switcher-close')",
  `$('body').append(html);
  $('#wb-switcher-close')`,
);

code = code.replace(
  `$(() => {
  loadSettings();
  if (typeof appendInexistentScriptButtons === 'function') {
    appendInexistentScriptButtons([{ name: SWITCHER_CONFIG.buttonName, visible: true }]);
    
    eventOn(getButtonEvent(SWITCHER_CONFIG.buttonName), () => {
        const panel = $('#wb-switcher-panel');
        if (panel.length > 0) {
            panel.remove();
        } else {
            createSwitcherPanel();
        }
    });
  }
  
  createFloatingWindow();`,
  `function mountWorldbookPanelInPhone(hostEl) {
  if (!hostEl) return;
  window.__WUWA_WB_PHONE_EMBED__ = true;
  window.__WUWA_WB_PHONE_HOST__ = hostEl;
  createSwitcherPanel();
  const $panel = $('#wb-switcher-panel');
  const $mount = $(hostEl).hasClass('wuwa-wb-phone-mount') ? $(hostEl) : $(hostEl).find('.wuwa-wb-phone-mount').first();
  const target = $mount.length ? $mount : $(hostEl);
  $panel.detach().appendTo(target);
  $panel.addClass('wb-switcher-panel--phone').css({
    position: 'relative',
    top: 'auto',
    left: 'auto',
    transform: 'none',
    width: '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    height: '100%',
    minHeight: '0',
    zIndex: 'auto',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
  });
  $('#wb-switcher-list').css({ flex: '1', minHeight: '0', overflowY: 'auto' });
  $('#wb-switcher-close').off('click').on('click', () => {
    $panel.remove();
    if (typeof window.closeAppPanel === 'function') window.closeAppPanel();
  });
}

window.__WUWA_WB_CREATE_PANEL__ = mountWorldbookPanelInPhone;

$(() => {
  loadSettings();
  if (!window.__WUWA_WB_PHONE_EMBED__ && typeof appendInexistentScriptButtons === 'function') {
    appendInexistentScriptButtons([{ name: SWITCHER_CONFIG.buttonName, visible: true }]);
    eventOn(getButtonEvent(SWITCHER_CONFIG.buttonName), () => {
        const panel = $('#wb-switcher-panel');
        if (panel.length > 0) panel.remove();
        else createSwitcherPanel();
    });
  }
  if (!window.__WUWA_WB_SKIP_FLOAT__) createFloatingWindow();`,
);

code = code.replace(
  'function refreshUIIfOpen() { if ($(\'#wb-switcher-panel\').is(\':visible\')) loadDataAndRender(); }',
  `function refreshUIIfOpen() {
  const $panel = $('#wb-switcher-panel');
  if ($panel.length && ($panel.is(':visible') || $panel.closest('#phone-app-body').length)) loadDataAndRender();
}`,
);

const header = `/** WuWa 世界书控制 v4.0.3 — 由 extractWorldbookControl.mjs 生成，勿手改 */\n`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + code, 'utf8');
console.log('Wrote', outPath, `(${code.length} chars)`);
