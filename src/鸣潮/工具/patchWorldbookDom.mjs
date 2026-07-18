/**
 * 为世界书控制 core 注入跨文档 DOM 查询 (wb$)，修复伪同层手机内 UI 不生效问题。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const corePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../shared/worldbookControl/worldbookControlCore.js');
let code = fs.readFileSync(corePath, 'utf8');

const prelude = `
// ==================== 手机 / 伪同层 DOM 上下文 ====================
function wbGetDoc() {
  const overlay = window.__WUWA_WB_PHONE_OVERLAY_EL__;
  if (overlay && overlay.ownerDocument) return overlay.ownerDocument;
  if (typeof window.__wuwaResolvePhoneOverlay === 'function') {
    try {
      const el = window.__wuwaResolvePhoneOverlay();
      if (el && el.ownerDocument) return el.ownerDocument;
    } catch (e) { /* ignore */ }
  }
  return document;
}

function wb$(selector) {
  const doc = wbGetDoc();
  if (selector == null) return $(doc);
  if (selector === 'body') return $(doc.body);
  if (selector === 'html') return $(doc.documentElement);
  if (typeof selector === 'string') {
    if (selector.charAt(0) === '#') return $(doc).find(selector);
    return $(doc).find(selector);
  }
  return $(selector);
}

function tavernInput$() {
  try {
    if (window.parent && window.parent !== window && window.parent.$) {
      const $input = window.parent.$('#send_textarea');
      if ($input.length) return $input;
    }
  } catch (e) { /* cross-origin */ }
  const $local = $('#send_textarea');
  if ($local.length) return $local;
  return wb$('#send_textarea');
}

function ensureFloatingWindow() {
  if (window.__WUWA_WB_SKIP_FLOAT__) return;
  wb$('#wb-float-monitor').remove();
  createFloatingWindow();
}

window.__WUWA_WB_ENSURE_FLOAT__ = ensureFloatingWindow;
`;

if (!code.includes('function wbGetDoc()')) {
  code = code.replace(
    "} catch (e) { console.error('Auto-import draggable failed:', e); }",
    "} catch (e) { console.error('Auto-import draggable failed:', e); }" + prelude,
  );
}

code = code.replace(
  /function wbFloatParent\(\) \{[\s\S]*?\n\}/,
  `function wbFloatParent() {
  const el = window.__WUWA_WB_PHONE_OVERLAY_EL__;
  if (el) return $(el);
  if (typeof window.__wuwaResolvePhoneOverlay === 'function') {
    try {
      const resolved = window.__wuwaResolvePhoneOverlay();
      if (resolved) return $(resolved);
    } catch (e) { /* ignore */ }
  }
  const doc = wbGetDoc();
  const overlay = doc.getElementById('mobile-phone-overlay');
  if (overlay) return $(overlay);
  return wb$('body');
}`,
);

const domSelectors = [
  ["$('#wb-", "wb$('#wb-"],
  ["$('.wb-", "wb$('.wb-"],
  ["wbwb$", 'wb$'],
];

for (const [from, to] of domSelectors) {
  code = code.split(from).join(to);
}

code = code.replace(/\$\('#send_textarea'\)/g, 'tavernInput$()');
code = code.replace(/\$\('body'\)/g, "wb$('body')");

code = code.replace(
  /function mountWorldbookPanelInPhone\(hostEl\) \{[\s\S]*?\n\}\n\nwindow\.__WUWA_WB_CREATE_PANEL__ = mountWorldbookPanelInPhone;/,
  `function mountWorldbookPanelInPhone(hostEl) {
  if (!hostEl) return;
  window.__WUWA_WB_PHONE_EMBED__ = true;
  window.__WUWA_WB_PHONE_HOST__ = hostEl;
  ensureFloatingWindow();
  createSwitcherPanel();
  const $panel = wb$('#wb-switcher-panel');
  const $host = $(hostEl);
  const $mount = $host.hasClass('wuwa-wb-phone-mount') ? $host : $host.find('.wuwa-wb-phone-mount').first();
  const target = $mount.length ? $mount : $host;
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
  wb$('#wb-switcher-list').css({ flex: '1', minHeight: '0', overflowY: 'auto' });
  wb$('#wb-switcher-close').off('click').on('click', () => {
    $panel.remove();
    if (typeof window.closeAppPanel === 'function') window.closeAppPanel();
  });
}

window.__WUWA_WB_CREATE_PANEL__ = mountWorldbookPanelInPhone;`,
);

if (code.includes('if (!window.__WUWA_WB_SKIP_FLOAT__) createFloatingWindow();')) {
  code = code.replace(
    'if (!window.__WUWA_WB_SKIP_FLOAT__) createFloatingWindow();',
    `if (!window.__WUWA_WB_SKIP_FLOAT__) {
    const bootFloat = () => {
      if (wbGetDoc().getElementById('mobile-phone-overlay') || window.__WUWA_WB_PHONE_OVERLAY_EL__) {
        ensureFloatingWindow();
        return true;
      }
      return false;
    };
    if (!bootFloat()) {
      const timer = setInterval(() => { if (bootFloat()) clearInterval(timer); }, 400);
      setTimeout(() => clearInterval(timer), 30000);
    }
  }`,
  );
}

fs.writeFileSync(corePath, code);
console.log('Patched', corePath);
