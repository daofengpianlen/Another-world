import fs from 'fs';

const srcPath =
  'C:/Users/26919/.cursor/projects/e-tavern-helper-template-main/agent-tools/3de9c0da-3ac2-4f8c-9684-6f77e9fff920.txt';
const outPath = 'e:/tavern_helper_template-main/src/契约协议/脚本/手机/covenantPhoneSkin.scss';

const src = fs.readFileSync(srcPath, 'utf8');
const start = src.indexOf('.status-bar-overlay');
const endIdx = src.indexOf('@keyframes phone-enter');
const cssBlock = src.slice(start, endIdx).trim();

function indentBlock(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : pad + line))
    .join('\n');
}

const overrides = `// Fatria 性斗学园 StatusBar.vue — 1:1 样式（scoped 到契约协议手机）
#mobile-phone-overlay.covenant-phone-ui {
  background: transparent !important;
  backdrop-filter: none !important;
  pointer-events: none !important;
  display: none;
  align-items: center !important;
  justify-content: center !important;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)) !important;

  &.active {
    display: flex !important;
    pointer-events: none !important;
  }

  &.pinned {
    pointer-events: none !important;
  }

  .mobile-phone-frame.phone-device {
    position: relative !important;
    width: min(404px, calc(100vw - 24px)) !important;
    height: min(762px, calc(100vh - 24px)) !important;
    max-width: none !important;
    aspect-ratio: unset !important;
    padding: 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
    pointer-events: auto !important;
    animation: phone-enter 0.22s cubic-bezier(0.2, 0.9, 0.2, 1) !important;
  }

  .mobile-status-bar {
    display: none !important;
  }

  .mobile-content {
    position: relative !important;
    flex: 1 !important;
    min-height: 0 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    padding: 0 !important;
  }

  .mobile-phone-screen.phone-screen {
    width: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
    display: block !important;
    flex: unset !important;
    background: transparent !important;
    background-image: none !important;
  }

  #phone-detail-panel.app-detail-panel {
    position: absolute !important;
    inset: 0 !important;
    z-index: 25 !important;
    width: 100% !important;
    height: 100% !important;
    background: transparent !important;
    display: none !important;
    flex-direction: column !important;
    animation: none !important;

    &.active {
      display: flex !important;
    }
  }

  #phone-detail-panel .app-header {
    display: none !important;
  }

  .chat-panel {
    position: absolute !important;
    inset: 0 !important;
    z-index: 30 !important;
  }

  .app-icon-bg,
  .app-pages-container,
  .app-pages-wrapper,
  .page-indicators,
  .app-row {
    display: none !important;
  }

  .phone-app,
  .dock-app {
    border: 0 !important;
    background: transparent !important;
    cursor: pointer !important;
    padding: 0 !important;
  }

  /* Fatria 原样式（StatusBar.vue） */
${indentBlock(cssBlock, 2)}
}
`;

const keyframes = `
@keyframes phone-enter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;

const covenantPanels = `
#mobile-phone-overlay.covenant-phone-ui {
  .app-body.app-body--covenant-map,
  .app-body.app-body--covenant-shop {
    padding: 0 !important;
    overflow: hidden !important;
  }

  .status-content,
  .app-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .status-content-flush,
  .app-body.app-body--covenant-map,
  .app-body.app-body--covenant-shop {
    overflow: hidden;
    padding-bottom: 0;
  }
}
`;

fs.writeFileSync(outPath, overrides + keyframes + covenantPanels);
console.log('written', fs.statSync(outPath).size, 'bytes');
