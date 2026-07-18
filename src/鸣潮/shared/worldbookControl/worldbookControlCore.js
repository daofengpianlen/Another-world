/** WuWa 世界书控制 v4.0.3 — 由 extractWorldbookControl.mjs 生成，勿手改 */
/**
 * @name WuWa 世界书控制 (变量驱动+梗概版)
 * @description v4.0.3 集成角色Pro/Lite、剧情(✍️)、梗概(🎬️)控制。优化了过渡期扫描和悬浮窗显示。
 * @version 4.0.3
 */

// jQuery UI Draggable：酒馆助手脚本 iframe 的 iframe_srcdoc 已加载 jquery-ui.min.js
if (typeof $.fn?.draggable === 'undefined') {
  console.warn('[鸣潮世界书] jQuery UI draggable 不可用，悬浮窗拖动可能失效');
}
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


// ==================== 配置 ====================
const SWITCHER_CONFIG = {
  buttonName: '🌊 WuWa 世界书控制',
  storageKey: 'wuwa_wb_v4_0_settings',
  scanDepth: 5, 
  colors: {
    pro: '#48bb78', lite: '#4299e1', 
    storyOn: '#ed8936', storyActive: '#ecc94b', 
    summaryOn: '#9f7aea', summaryActive: '#d6bcfa', // 🎬 新增颜色
    inactive: '#4a5568',
    bg: '#1a202c', border: '#2d3748', tabActive: '#2b6cb0', tabInactive: 'transparent', floatBg: 'rgba(0, 0, 0, 0.85)',
    virgin: '#f687b3', nonVirgin: '#9f7aea'
  }
};

let SWITCHER_STATE = { autoMode: true, floatVisible: true, floatPos: { top: '80px', left: '20px' } };

// ==================== 核心工具 ====================

// [MODIFIED] 增强：读取更广泛的上下文变量，以覆盖过渡期
async function getFullContextVar() {
    try {
        let vars = null;
        if (window.TavernHelper && typeof TavernHelper.getVariables === 'function') {
            vars = await TavernHelper.getVariables({ type: 'message', message_id: -1 });
        } else if (typeof getAllVariables === 'function') {
            vars = getAllVariables();
        }

        if (vars && vars.stat_data) {
            const display = _.get(vars, 'stat_data.剧情显示', '');
            const trans = _.get(vars, 'stat_data._trans_prompt', ''); // 过渡提示词
            const next = _.get(vars, 'stat_data.即将进行的下一个事件节点', ''); // 预扫描节点
            // 将所有可能触发世界书的文本拼在一起进行扫描
            return `${display}\n${trans}\n${next}`;
        }
    } catch(e) {}
    return '';
}

function getCoreName(entryName) {
  if (!entryName) return '';
  let clean = entryName.replace(/\[\s*(pro|lite)\s*\]/gi, '');
  clean = clean.replace(/[^\u4e00-\u9fa5a-zA-Z0-9.]/g, '');
  return clean;
}

function getEntryType(entryName) {
  if (/\[\s*pro\s*\]/i.test(entryName)) return 'pro';
  if (/\[\s*lite\s*\]/i.test(entryName)) return 'lite';
  return 'other';
}

// 触发判断逻辑
function checkStoryActivation(entry, scanText) {
    if (!entry.enabled) return false;
    const strategy = entry.strategy;
    if (!strategy) return false;
    
    // 蓝灯（常驻）：只要启用就视为激活
    if (strategy.type === 'constant') return true;
    
    // 绿灯（关键词）：检查 scanText (包含剧情标题、过渡词、下一节点)
    if (strategy.type === 'selective') {
        const keys = strategy.keys || [];
        if (keys.length === 0) return false;
        const textLower = scanText.toLowerCase();
        return keys.some(key => {
            if (typeof key === 'string') return textLower.includes(key.toLowerCase());
            return false;
        });
    }
    return false;
}

async function scanAndPairEntries() {
  try {
    let bookNames = [];
    try {
      const charBooks = getCharWorldbookNames('current');
      if (charBooks && charBooks.primary) bookNames.push(charBooks.primary);
    } catch (e) { console.warn('无法获取角色世界书:', e); }
    if (bookNames.length === 0) return { success: false, message: '未检测到绑定世界书' };

    const targetBook = bookNames[0];
    const entries = await getWorldbook(targetBook);
    if (!entries || entries.length === 0) return { success: false, message: '世界书为空' };

    // [新增] 拉取全局置顶列表
    let pinnedChars = [];
    try {
        const globals = await getVariables({ type: 'global' });
        if (globals && Array.isArray(globals.wuwa_pinned_chars)) {
            pinnedChars = globals.wuwa_pinned_chars;
        }
    } catch(e) {}

    const pairs = {}; 
    const stories = [];
    const summaries = [];

    entries.forEach(entry => {
      if (entry.name.includes('✍️')) {
        stories.push({ uid: entry.uid, name: entry.name, enabled: entry.enabled, bookName: targetBook, strategy: entry.strategy });
        return;
      }
      if (entry.name.includes('🎬️')) {
        summaries.push({ uid: entry.uid, name: entry.name, enabled: entry.enabled, bookName: targetBook, strategy: entry.strategy });
        return;
      }

      const type = getEntryType(entry.name);
      if (type === 'other') return;
      const coreName = getCoreName(entry.name);
      if (!coreName) return;
      
      if (!pairs[coreName]) {
        pairs[coreName] = { 
          displayName: entry.name.replace(/\[\s*(pro|lite)\s*\]/gi, '').trim(),
          coreKey: coreName, 
          bookName: targetBook,
          isPinned: pinnedChars.includes(coreName), // [新增] 注入置顶状态
          pinIndex: pinnedChars.indexOf(coreName),  // [新增] 注入置顶权重
          _proContent: '',
          _liteContent: ''
        };
      }
      
      if (type === 'pro') { 
          pairs[coreName].proUid = entry.uid; 
          pairs[coreName].proEnabled = entry.enabled; 
          pairs[coreName]._proContent = entry.content || '';
      }
      else { 
          pairs[coreName].liteUid = entry.uid; 
          pairs[coreName].liteEnabled = entry.enabled; 
          pairs[coreName]._liteContent = entry.content || '';
      }
    });

    let processedPairs = Object.values(pairs).map(pair => {
        if (pair.proUid && pair.liteUid) {
            const proHasKey = pair._proContent.includes('处女');
            const liteHasKey = pair._liteContent.includes('处女');
            if (proHasKey && liteHasKey) {
                pair.virginModifiable = true;
                const isNonVirgin = pair._proContent.includes('非处女');
                pair.isVirgin = !isNonVirgin;
            } else {
                pair.virginModifiable = false;
            }
        }
        delete pair._proContent;
        delete pair._liteContent;
        return pair;
    });

    // ========== 排序逻辑 (Z -> A 混入置顶干预) ==========
    processedPairs.sort((a, b) => {
        if (a.isPinned && b.isPinned) return a.pinIndex - b.pinIndex; // 都在置顶里，越靠前(LIFO)排越前
        if (a.isPinned && !b.isPinned) return -1; // a置顶，排前面
        if (!a.isPinned && b.isPinned) return 1;  // b置顶，排前面
        return b.displayName.localeCompare(a.displayName, 'zh-CN'); // 回退拼音排序
    });
    
    stories.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
    summaries.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
    // =======================================

    return { success: true, bookName: targetBook, pairs: processedPairs, stories: stories, summaries: summaries };
  } catch (error) { return { success: false, message: error.message }; }
}

async function applyChanges(bookName, targetOps, silent = false) {
  if (!targetOps || targetOps.length === 0) return;
  const uidMap = {}; targetOps.forEach(op => uidMap[op.uid] = op.enable);
  try {
    await updateWorldbookWith(bookName, (entries) => entries.map(e => uidMap.hasOwnProperty(e.uid) ? { ...e, enabled: uidMap[e.uid] } : e), { render: 'immediate' });
    setTimeout(() => { refreshFloatingWindowContent(); refreshUIIfOpen(); }, 300);
    if (!silent) toastr.info(`已更新 ${targetOps.length} 项条目状态`);
  } catch (e) { toastr.error('更新失败: ' + e.message); }
}

async function toggleStrategy(bookName, uid) {
    try {
        await updateWorldbookWith(bookName, (entries) => entries.map(e => {
            if (e.uid !== uid) return e;
            const currentType = e.strategy?.type || 'selective';
            const newType = currentType === 'constant' ? 'selective' : 'constant';
            return { ...e, strategy: { ...e.strategy, type: newType } };
        }), { render: 'immediate' });
        toastr.success('触发策略已切换');
        setTimeout(() => { loadDataAndRender(); refreshFloatingWindowContent(); }, 100);
    } catch (e) {
        toastr.error('策略切换失败: ' + e.message);
    }
}

async function applyVirginUpdate(bookName, targetPairs, setVirgin) {
    if (!targetPairs || targetPairs.length === 0) return;
    const targetUids = new Set();
    targetPairs.forEach(p => {
        if (p.proUid) targetUids.add(p.proUid);
        if (p.liteUid) targetUids.add(p.liteUid);
    });
    try {
        await updateWorldbookWith(bookName, (entries) => {
            return entries.map(entry => {
                if (!targetUids.has(entry.uid)) return entry;
                let content = entry.content || '';
                const hasNonVirgin = content.includes('非处女');
                const hasVirgin = /(?<!非)处女/.test(content);
                let newContent = content;
                if (setVirgin) {
                    if (hasNonVirgin) newContent = newContent.replace(/非处女/g, '处女');
                } else {
                    if (hasVirgin) newContent = newContent.replace(/(?<!非)处女/g, '非处女');
                }
                if (newContent !== content) return { ...entry, content: newContent };
                return entry;
            });
        }, { render: 'immediate' });
        toastr.success(setVirgin ? '已更新为：处女 🌸' : '已更新为：非处女 👠');
        loadDataAndRender();
    } catch (e) { toastr.error('设定更新失败: ' + e.message); }
}

// 【新增函数：置顶状态切换逻辑】
async function togglePinStatus(coreKey) {
  try {
      let globals = await getVariables({ type: 'global' }) || {};
      let pinned = globals.wuwa_pinned_chars || [];
      if (!Array.isArray(pinned)) pinned = [];

      const idx = pinned.indexOf(coreKey);
      if (idx > -1) {
          pinned.splice(idx, 1); // 存在则移除（取消置顶）
          toastr.success('已取消置顶');
      } else {
          pinned.unshift(coreKey); // LIFO后进先出：插入到数组头部
          toastr.success('已置顶角色');
      }
      
      await insertOrAssignVariables({ wuwa_pinned_chars: pinned }, { type: 'global' });
      
      // 触发界面刷新与逻辑权重重算
      await loadDataAndRender();
      if (SWITCHER_STATE.autoMode) masterLoop();
  } catch (e) {
      toastr.error('置顶状态更新失败: ' + e.message);
  }
}


// ==================== 逻辑层 ====================

function shouldAbortChange(localData, ops) {
  const currentProCount = localData.pairs.filter(p => p.proEnabled).length;
  if (currentProCount === 0) return false;
  let nextProCount = currentProCount;
  const changes = {};
  ops.forEach(op => { changes[op.uid] = op.enable; });
  localData.pairs.forEach(p => {
    if (p.proUid && changes.hasOwnProperty(p.proUid)) {
      const willBeEnabled = changes[p.proUid];
      const isCurrentlyEnabled = p.proEnabled;
      if (isCurrentlyEnabled && !willBeEnabled) nextProCount--;
      else if (!isCurrentlyEnabled && willBeEnabled) nextProCount++;
    }
  });
  if (nextProCount === 0) {
    console.log(`[WuWa Logic] 🛡️ 拦截生效：检测到所有Pro角色即将离场，已忽略。`);
    return true;
  }
  return false;
}

async function logicScanContext(localData) {
  if (!window.TavernHelper) return;
  try {
      let maxProCount = 3;
      try {
          const globals = await getVariables({ type: 'global' });
          if (globals && globals.wuwa_max_pro_count !== undefined) {
              maxProCount = parseInt(globals.wuwa_max_pro_count, 10);
          }
      } catch(e) {}

      const vars = await TavernHelper.getVariables({ type: 'message', message_id: -1 });
      const femaleChars = _.get(vars, 'stat_data.女性角色') || {};
      const galNames = await getLatestGalCharacterNames();
      const plainInput = window.__WUWA_WB_PENDING_INPUT__ || '';
      const ops = [];
      const presentCharsList = []; 
      const absentCharsList = [];  

      localData.pairs.forEach(char => {
          const charName = char.coreKey;
          let charData = femaleChars[charName];
          if (!charData) {
             const fuzzyKey = Object.keys(femaleChars).find(key => key.includes(charName) || charName.includes(key));
             if (fuzzyKey) charData = femaleChars[fuzzyKey];
          }
          
          let isPresent = false;
          let affinity = 40; 
          
          if (charData) {
              isPresent = _.get(charData, '是否在场', false);
              if (typeof isPresent === 'string') {
                    const lower = isPresent.toLowerCase();
                    isPresent = (lower === 'true' || lower === 'yes' || lower === '1');
              }
              affinity = Number(_.get(charData, '好感度', 40)) || 40;
          }

          // GAL 正在出场或玩家输入提到 → 视为在场，注入 Pro 人设
          if (charMatchesSceneHint(charName, char.displayName, galNames, plainInput)) {
              isPresent = true;
          }
          
          // [新增] 将之前提取的置顶信息直接带入排序节点
          const charInfo = { char, isPresent, affinity, isPinned: char.isPinned, pinIndex: char.pinIndex };
          if (isPresent) {
              presentCharsList.push(charInfo);
          } else {
              absentCharsList.push(charInfo);
          }
      });

      // 3. [修改] 对在场角色进行干预式排序
      presentCharsList.sort((a, b) => {
          if (a.isPinned && b.isPinned) return a.pinIndex - b.pinIndex; // 置顶打架：后进先出，小索引优先
          if (a.isPinned && !b.isPinned) return -1; // A置顶：无条件第一
          if (!a.isPinned && b.isPinned) return 1;  // B置顶：无条件第一
          return b.affinity - a.affinity; // 凡人打架：比拼好感度
      });

      // 4. 根据设定的最大数量分配 Pro 和 Lite
      const proChars = presentCharsList.slice(0, maxProCount);
      const liteChars = presentCharsList.slice(maxProCount).concat(absentCharsList);

      proChars.forEach(info => {
          const char = info.char;
          if (!char.proEnabled && char.proUid) ops.push({ uid: char.proUid, enable: true });
          if (char.liteEnabled && char.liteUid) ops.push({ uid: char.liteUid, enable: false });
      });

      liteChars.forEach(info => {
          const char = info.char;
          if (!char.liteEnabled && char.liteUid) ops.push({ uid: char.liteUid, enable: true });
          if (char.proEnabled && char.proUid) ops.push({ uid: char.proUid, enable: false });
      });

      if (ops.length > 0) {
          if (shouldAbortChange(localData, ops)) return;
          console.log('[WuWa Loop] Variable Change Detected (Context):', ops.length, '条更新 (已应用Pro上限过滤)');
          await applyChanges(localData.pairs[0].bookName, ops, true); 
      }
  } catch (error) { console.error('[WuWa Logic] Variable scan error:', error); }
}

let lastInputMemory = '';
async function logicScanInput(localData) {
    const $input = tavernInput$();
    const val = $input.val();
    if (!val || typeof val !== 'string' || !val.includes('[系统指令：生成开场剧情]')) {
        if (lastInputMemory !== '' && (!val || val.trim() === '')) lastInputMemory = '';
        return false;
    }
    const charMatch = val.match(/5\.\s*互动角色：(.*?)\n/);
    if (charMatch && charMatch[1]) {
        const targetStr = charMatch[1].trim();
        if (targetStr === lastInputMemory || targetStr === '暂无' || !targetStr) return true; 
        lastInputMemory = targetStr;
        const targets = targetStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
        const ops = [];
        localData.pairs.forEach(p => {
            const isTarget = targets.some(t => p.displayName.includes(t) || p.coreKey.includes(t));
            if (isTarget) {
                if (p.proUid) ops.push({ uid: p.proUid, enable: true });
                if (p.liteUid) ops.push({ uid: p.liteUid, enable: false });
            } else {
                if (p.liteUid) ops.push({ uid: p.liteUid, enable: true });
                if (p.proUid) ops.push({ uid: p.proUid, enable: false });
            }
        });
        if (ops.length > 0) {
            if (shouldAbortChange(localData, ops)) return true; 
            await applyChanges(localData.pairs[0].bookName, ops, true); 
        }
        return true;
    }
    return false;
}

// ==================== [新增] 飞讯全局状态扫描 ====================
async function logicScanFeixun(localData) {
    let fxShared = null;
    // 多路探测：尝试从所有可能挂载的全局作用域中捕获 FeixunShared
    const scopes = [
        typeof globalThis !== 'undefined' ? globalThis : null,
        typeof window !== 'undefined' ? window : null,
        typeof top !== 'undefined' ? top : null,
        typeof parent !== 'undefined' ? parent : null,
        (typeof window !== 'undefined' && window.parent) ? window.parent : null
    ];
    
    for (let scope of scopes) {
        if (scope && scope.FeixunShared) {
            fxShared = scope.FeixunShared;
            break;
        }
    }

    // 如果捕获到了飞讯数据且当前有正在进行的聊天
    if (fxShared && fxShared.currentChat && fxShared.currentChat.trim() !== "") {
        const targetStr = fxShared.currentChat; // 可能是单人 "秧秧"，也可能是群聊 "秧秧,炽霞"
        const ops = [];

        localData.pairs.forEach(p => {
            // 只要飞讯聊天对象字符串中包含角色的名字或核心键值，就视为需要激活 Pro
            const isTarget = targetStr.includes(p.coreKey) || targetStr.includes(p.displayName);
            if (isTarget) {
                if (!p.proEnabled && p.proUid) ops.push({ uid: p.proUid, enable: true });
                if (p.liteEnabled && p.liteUid) ops.push({ uid: p.liteUid, enable: false });
            } else {
                if (!p.liteEnabled && p.liteUid) ops.push({ uid: p.liteUid, enable: true });
                if (p.proEnabled && p.proUid) ops.push({ uid: p.proUid, enable: false });
            }
        });

        if (ops.length > 0) {
            if (shouldAbortChange(localData, ops)) return true; // 拦截全灭
            console.log('[WuWa Logic] 📱 飞讯终端接管控制权，目标:', targetStr);
            await applyChanges(localData.pairs[0].bookName, ops, true); 
        }
        return true; // 返回 true 告诉主循环：飞讯已接管，无需继续原版扫描
    }
    
    return false; // 返回 false 告诉主循环：飞讯处于空闲状态，继续常规扫描
}

/** 从 GAL 内文提取 <z> 角色名 */
function extractNamesFromGalText(galInner) {
  const names = new Set();
  if (!galInner) return names;
  const re = /<z>\s*([^<]+)/gi;
  let m;
  while ((m = re.exec(galInner)) !== null) {
    const n = (m[1] || '').trim();
    if (n && n !== '角色') names.add(n);
  }
  return names;
}

async function getLatestGalCharacterNames() {
  try {
    const TH = window.TavernHelper;
    if (!TH?.getChatMessages) return new Set();
    const messages = TH.getChatMessages('0-{{lastMessageId}}');
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;
      const body = msg.message ?? '';
      if (!/<gal>/i.test(body)) continue;
      const galInner = body.match(/<gal>([\s\S]*?)<\/gal>/i)?.[1] ?? '';
      return extractNamesFromGalText(galInner);
    }
  } catch (e) {
    console.warn('[WuWa Logic] 读取 GAL 角色失败', e);
  }
  return new Set();
}

function charMatchesSceneHint(charName, displayName, hintNames, plainInput) {
  const core = charName || '';
  const label = displayName || core;
  for (const hint of hintNames) {
    if (!hint) continue;
    if (hint === core || hint === label) return true;
    if (label.includes(hint) || hint.includes(core)) return true;
    if (core && (hint.includes(core) || core.includes(hint.replace(/（.+）$/, '')))) return true;
  }
  if (plainInput) {
    if (plainInput.includes(core) || plainInput.includes(label)) return true;
    const shortLabel = label.replace(/\[\s*(pro|lite)\s*\]/gi, '').trim();
    if (shortLabel && plainInput.includes(shortLabel)) return true;
  }
  return false;
}

// ==================== 全局心跳 (Master Loop) ====================
let masterLoopTimer = null;
let lastActiveStoryIds = '';

async function runWorldbookAutoSyncCore() {
  let data = currentData;
  if (!data.pairs || data.pairs.length === 0) {
      const scanRes = await scanAndPairEntries();
      if (scanRes.success) {
          currentData = { pairs: scanRes.pairs, stories: scanRes.stories, summaries: scanRes.summaries };
          data = currentData;
      } else return;
  }

  // 优先级 1：飞讯终端强力接管
  const fxOverride = await logicScanFeixun(data);
  
  if (!fxOverride) {
      // 优先级 2：如果在飞讯无目标的情况下，扫描开场剧情指令
      const inputOverride = await logicScanInput(data);
      if (!inputOverride) {
          // 优先级 3：MVU 是否在场 + 最新 GAL/玩家输入 提到的角色 → Pro
          await logicScanContext(data);
      }
  }

  // 剧情和梗概的悬浮窗扫描逻辑 (保持不变)
  try {
      const scanText = await getFullContextVar();
      const activeStories = data.stories.filter(s => s.enabled && checkStoryActivation(s, scanText));
      const activeSummaries = data.summaries.filter(s => s.enabled && checkStoryActivation(s, scanText));
      
      const currentActiveIds = [
          ...activeStories.map(s => s.uid),
          ...activeSummaries.map(s => s.uid)
      ].sort().join(',');
      
      if (currentActiveIds !== lastActiveStoryIds) {
          lastActiveStoryIds = currentActiveIds;
          refreshFloatingWindowContent();
          refreshUIIfOpen();
      }
  } catch (e) { console.error('Loop check failed', e); }
}

async function masterLoop() {
  if (!SWITCHER_STATE.autoMode) return;
  await runWorldbookAutoSyncCore();
}

/** 伪同层 generate 前立即同步世界书（确保刚出场的角色 Pro 条目已打开） */
async function syncWorldbookBeforeGenerate(plainInput) {
  if (!SWITCHER_STATE.autoMode) return;
  window.__WUWA_WB_PENDING_INPUT__ = plainInput || '';
  try {
    await runWorldbookAutoSyncCore();
    console.info('[WuWa Logic] 已按 GAL/输入同步世界书角色条目');
  } finally {
    window.__WUWA_WB_PENDING_INPUT__ = '';
  }
}

window.__WUWA_WB_SYNC_BEFORE_GENERATE__ = syncWorldbookBeforeGenerate;

// ==================== UI & 悬浮窗 ====================

function wbFloatParent() {
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
}
function createFloatingWindow() {
  wb$('#wb-float-monitor').remove();
  const autoIcon = SWITCHER_STATE.autoMode ? '🔄' : '⏸️';
  const autoTitle = SWITCHER_STATE.autoMode ? '自动模式: ON' : '自动模式: OFF';
  
  const html = `
    <div id='wb-float-monitor' style='position:fixed;top:${SWITCHER_STATE.floatPos.top};left:${SWITCHER_STATE.floatPos.left};width:180px;background:${SWITCHER_CONFIG.colors.floatBg};border:1px solid ${SWITCHER_CONFIG.colors.border};border-radius:8px;z-index:10001;display:${SWITCHER_STATE.floatVisible ? 'block' : 'none'};color:white;font-family:sans-serif;font-size:12px;box-shadow:0 4px 10px rgba(0,0,0,0.5);overflow:hidden;user-select:none;'>
      <div id='wb-float-header' style='background:rgba(0,0,0,0.5);padding:6px;cursor:move;font-weight:bold;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;touch-action:none;'>
        <div style="display:flex;align-items:center;gap:5px;pointer-events:none;">
            <span>📡 实时监控</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
            <span id='wb-float-auto-toggle' style='cursor:pointer;opacity:1;font-size:14px;' title='${autoTitle}'>${autoIcon}</span>
            <span id='wb-float-close' style='cursor:pointer;opacity:0.8;font-size:16px;' title='关闭'>✕</span>
        </div>
      </div>
      <div id='wb-float-list' style='padding:5px;max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;'></div>
    </div>`;
  wbFloatParent().append(html);
  refreshFloatingWindowContent();
  
  const $floatWin = wb$('#wb-float-monitor');
  let isDragging = false;

  if (typeof $floatWin.draggable === 'function') {
      $floatWin.draggable({
          handle: '#wb-float-header',
          containment: 'window',
          start: function() { isDragging = true; },
          stop: function(event, ui) {
              SWITCHER_STATE.floatPos = { top: ui.position.top + 'px', left: ui.position.left + 'px' };
              saveSettings();
              setTimeout(() => { isDragging = false; }, 100);
          }
      });
  }

  wb$('#wb-float-auto-toggle').on('click', function(e) {
      if (isDragging) return;
      e.stopPropagation(); e.preventDefault(); 
      SWITCHER_STATE.autoMode = !SWITCHER_STATE.autoMode;
      saveSettings();
      $(this).text(SWITCHER_STATE.autoMode ? '🔄' : '⏸️');
      $(this).attr('title', SWITCHER_STATE.autoMode ? '自动模式: ON' : '自动模式: OFF');
      const mainBtn = wb$('#wb-toggle-auto');
      if(mainBtn.length) {
          mainBtn.text(SWITCHER_STATE.autoMode ? '🔄 自动控制: ON' : '🔄 自动控制: OFF');
          mainBtn.css('background', SWITCHER_STATE.autoMode ? SWITCHER_CONFIG.colors.pro : SWITCHER_CONFIG.colors.inactive);
      }
      toastr.info(SWITCHER_STATE.autoMode ? '自动模式已开启' : '自动模式已暂停');
      if(SWITCHER_STATE.autoMode) masterLoop(); 
  });

  wb$('#wb-float-close').on('click', function(e) {
      if (isDragging) return;
      e.stopPropagation(); e.preventDefault();
      SWITCHER_STATE.floatVisible = false;
      saveSettings();
      wb$('#wb-float-monitor').hide();
      wb$('#wb-toggle-float').text('👁️ 显示悬浮');
  });
}

// [MODIFIED] 悬浮窗显示逻辑优化
async function refreshFloatingWindowContent() {
  const res = await scanAndPairEntries();
  if (res.success) {
    currentData = { pairs: res.pairs, stories: res.stories, summaries: res.summaries };
    
    // 1. Pro 角色列表
    const proList = res.pairs.filter(p => p.proEnabled);
    
    // 2. 扫描激活项
    const scanText = await getFullContextVar();
    const activeStories = res.stories.filter(s => s.enabled && checkStoryActivation(s, scanText));
    const activeSummaries = res.summaries.filter(s => s.enabled && checkStoryActivation(s, scanText));

    const listEl = wb$('#wb-float-list').empty();
    
    // Pro 显示逻辑：超过5个折叠
    if (proList.length > 0) {
        listEl.append(`<div style='font-size:10px;color:#718096;font-weight:bold;'>🟢 Active Pro (${proList.length})</div>`);
        const MAX_SHOW = 5;
        const showList = proList.slice(0, MAX_SHOW);
        showList.forEach(p => listEl.append(`<div style='padding:2px 4px;background:rgba(72,187,120,0.2);border-radius:3px;color:#9ae6b4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;'>${p.displayName}</div>`));
        
        if (proList.length > MAX_SHOW) {
            listEl.append(`<div style='padding:2px 4px;color:#718096;font-size:10px;font-style:italic;'>+ ${proList.length - MAX_SHOW} more...</div>`);
        }
    } else {
        listEl.append(`<div style='font-size:10px;color:#718096;text-align:center;padding:5px;'>无 Pro 角色</div>`);
    }

    // 剧情显示逻辑：有激活才显示标题
    if (activeStories.length > 0) {
        listEl.append(`<div style='font-size:10px;color:#718096;font-weight:bold;margin-top:5px;'>✍️ Active Story (${activeStories.length})</div>`);
        activeStories.forEach(s => {
            const isConstant = s.strategy?.type === 'constant';
            const color = isConstant ? '#63b3ed' : '#ecc94b'; 
            const bg = isConstant ? 'rgba(99,179,237,0.2)' : 'rgba(236,201,75,0.2)';
            const icon = isConstant ? '🔵' : '⚡';
            listEl.append(`<div style='padding:2px 4px;background:${bg};border-radius:3px;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;'>${icon} ${s.name.replace('✍️','').trim()}</div>`);
        });
    }
    
    // [NEW] 梗概显示逻辑
    if (activeSummaries.length > 0) {
        listEl.append(`<div style='font-size:10px;color:#718096;font-weight:bold;margin-top:5px;'>🎬 Active Summary (${activeSummaries.length})</div>`);
        activeSummaries.forEach(s => {
            const isConstant = s.strategy?.type === 'constant';
            const color = isConstant ? '#63b3ed' : '#d6bcfa'; 
            const bg = isConstant ? 'rgba(99,179,237,0.2)' : 'rgba(159,122,234,0.2)';
            const icon = isConstant ? '🔵' : '⚡';
            listEl.append(`<div style='padding:2px 4px;background:${bg};border-radius:3px;color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;'>${icon} ${s.name.replace('🎬️','').trim()}</div>`);
        });
    }
  }
}

function createSwitcherPanel() {
  wb$('#wb-switcher-panel').remove();
  // [修改] 精简按钮文案，应对手机屏幕
  const autoBtnText = SWITCHER_STATE.autoMode ? '🔄 自动: ON' : '🔄 自动: OFF';
  const autoBtnColor = SWITCHER_STATE.autoMode ? SWITCHER_CONFIG.colors.pro : SWITCHER_CONFIG.colors.inactive;

  const html = `
    <div id='wb-switcher-panel' style='position:fixed;top:5%;left:50%;transform:translateX(-50%);width:400px;max-width:90vw;max-height:90vh;background:${SWITCHER_CONFIG.colors.bg};border:1px solid ${SWITCHER_CONFIG.colors.border};border-radius:10px;z-index:9999;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:sans-serif;color:#e2e8f0;'>
      <div style='padding:15px;border-bottom:1px solid ${SWITCHER_CONFIG.colors.border};display:flex;justify-content:space-between;align-items:center;'>
        <h3 style='margin:0;font-size:16px;font-weight:bold;'>WuWa 世界书控制</h3>
        <button id='wb-switcher-close' style='background:transparent;border:none;color:#a0aec0;cursor:pointer;font-size:18px;'>✕</button>
      </div>
      <div style='display:flex;border-bottom:1px solid ${SWITCHER_CONFIG.colors.border};'>
        <button id='wb-tab-chars' style='flex:1;padding:10px;background:${SWITCHER_CONFIG.colors.tabActive};color:white;border:none;cursor:pointer;font-weight:bold;'>👥 角色版本</button>
        <button id='wb-tab-stories' style='flex:1;padding:10px;background:${SWITCHER_CONFIG.colors.tabInactive};color:#a0aec0;border:none;cursor:pointer;font-weight:bold;'>✍️ 剧情控制</button>
        <button id='wb-tab-summaries' style='flex:1;padding:10px;background:${SWITCHER_CONFIG.colors.tabInactive};color:#a0aec0;border:none;cursor:pointer;font-weight:bold;'>🎬 梗概控制</button>
      </div>
      <div style='padding:10px 15px;background:rgba(0,0,0,0.2);display:flex;flex-direction:column;gap:10px;'>
        <div style='display:flex;gap:5px;flex-wrap:nowrap;white-space:nowrap;overflow:hidden;'>
           <button id='wb-toggle-auto' style='flex:1;min-width:0;background:${autoBtnColor};color:white;border:none;padding:clamp(2px,1vw,5px);border-radius:4px;cursor:pointer;font-size:clamp(9px,2.5vw,12px);'>${autoBtnText}</button>
           <button id='wb-toggle-float' style='flex:1;min-width:0;background:#4a5568;color:white;border:none;padding:clamp(2px,1vw,5px);border-radius:4px;cursor:pointer;font-size:clamp(9px,2.5vw,12px);'>${SWITCHER_STATE.floatVisible ? '👁️ 隐藏' : '👁️ 悬浮'}</button>
           <button id='wb-reset-pos' style='flex:0.5;min-width:0;background:#e53e3e;color:white;border:none;padding:clamp(2px,1vw,5px);border-radius:4px;cursor:pointer;font-size:clamp(9px,2.5vw,12px);' title='重置悬浮窗位置'>📍</button>
           <button id='wb-settings-btn' style='flex:0.3;min-width:0;background:#4a5568;color:white;border:none;padding:clamp(2px,1vw,5px);border-radius:4px;cursor:pointer;font-size:clamp(9px,2.5vw,12px);' title='设置 Pro 数量上限'>⚙️</button>
           <button id='wb-info-btn' style='flex:0.3;min-width:0;background:#4a5568;color:white;border:none;padding:clamp(2px,1vw,5px);border-radius:4px;cursor:pointer;font-size:clamp(9px,2.5vw,12px);' title='逻辑说明'>ℹ️</button>
        </div>
        <div id='wb-current-book-display' style='font-size:12px;color:#63b3ed;text-align:center;'>正在检测...</div>
        <input type='text' id='wb-switcher-search' placeholder='🔍 搜索...' style='width:100%;padding:8px;border-radius:5px;border:1px solid ${SWITCHER_CONFIG.colors.border};background:#2d3748;color:white;'>
        <div id='wb-global-btns' style='display:flex;gap:10px;'></div>
        <div id='wb-virgin-btns' style='display:flex;gap:10px;'></div>
      </div>
      <div id='wb-switcher-list' style='flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:5px;'><div style='text-align:center;color:#718096;padding:20px;'>加载中...</div></div>
      <div style='padding:8px;text-align:center;font-size:12px;color:#718096;border-top:1px solid ${SWITCHER_CONFIG.colors.border};'>点击按钮切换 • 自动保存</div>
    </div>`;
  
  wb$('body').append(html);
  wb$('#wb-switcher-close').on('click', () => wb$('#wb-switcher-panel').remove());
  wb$('#wb-switcher-search').on('input', function() {
    const val = $(this).val().toLowerCase();
    wb$('.wb-item-row').each(function() { $(this).toggle($(this).data('name').toString().toLowerCase().includes(val)); });
  });
  wb$('#wb-tab-chars').on('click', () => switchTab('chars'));
  wb$('#wb-tab-stories').on('click', () => switchTab('stories'));
  wb$('#wb-tab-summaries').on('click', () => switchTab('summaries'));
  
  wb$('#wb-toggle-float').on('click', function() {
    SWITCHER_STATE.floatVisible = !SWITCHER_STATE.floatVisible; saveSettings();
    wb$('#wb-float-monitor').toggle(SWITCHER_STATE.floatVisible); 
    $(this).text(SWITCHER_STATE.floatVisible ? '👁️ 隐藏' : '👁️ 悬浮'); // [修改] 对应精简文本
  });

  wb$('#wb-reset-pos').on('click', function() {
    SWITCHER_STATE.floatPos = { top: '80px', left: '20px' };
    saveSettings();
    wb$('#wb-float-monitor').css(SWITCHER_STATE.floatPos);
    toastr.info('悬浮窗位置已重置为默认');
  });

  wb$('#wb-toggle-auto').on('click', function() {
    SWITCHER_STATE.autoMode = !SWITCHER_STATE.autoMode; saveSettings();
    $(this).text(SWITCHER_STATE.autoMode ? '🔄 自动: ON' : '🔄 自动: OFF'); // [修改] 对应精简文本
    $(this).css('background', SWITCHER_STATE.autoMode ? SWITCHER_CONFIG.colors.pro : SWITCHER_CONFIG.colors.inactive);
    
    const floatBtn = wb$('#wb-float-auto-toggle');
    if(floatBtn.length) {
        floatBtn.text(SWITCHER_STATE.autoMode ? '🔄' : '⏸️');
        floatBtn.attr('title', SWITCHER_STATE.autoMode ? '自动模式: ON' : '自动模式: OFF');
    }

    if (SWITCHER_STATE.autoMode) { toastr.info('自动模式已开启'); masterLoop(); }
  });

  wb$('#wb-settings-btn').on('click', async function() {
      let currentMax = 3;
      try {
          const globals = await getVariables({ type: 'global' });
          if (globals && globals.wuwa_max_pro_count !== undefined) {
              currentMax = parseInt(globals.wuwa_max_pro_count, 10);
          }
      } catch(e) {}

      const input = prompt('⚙️ 请输入同时存在的最大 Pro 词条数量:\n(注意：该上限仅对“环境在场”扫描生效，不会拦截飞讯和指令。)', currentMax);
      if (input !== null) {
          const parsed = parseInt(input, 10);
          if (!isNaN(parsed) && parsed >= 0) {
              try {
                  await insertOrAssignVariables({ wuwa_max_pro_count: parsed }, { type: 'global' });
                  toastr.success(`已保存最大 Pro 词条数量为: ${parsed}`);
                  if (SWITCHER_STATE.autoMode) masterLoop();
              } catch(e) {
                  toastr.error('保存配置失败: ' + e.message);
              }
          } else {
              toastr.warning('请输入有效的数字');
          }
      }
  });

  // [修改] 信息说明按钮：更新置顶特权的描述
  wb$('#wb-info-btn').on('click', function() {
      alert(
        '🤖 自动控制 Pro/Lite 触发逻辑说明\n\n' +
        '🥇 最高优先级：飞讯终端监控\n' +
        '读取“飞讯”发送消息者，匹配的角色强制开启 Pro。\n\n' +
        '🥈 次高优先级：开场指令扫描\n' +
        '检测输入框是否包含 [系统指令：生成开场剧情] 且读取“互动角色”一栏，填写的角色强制开启 Pro。\n\n' +
        '🥉 普通优先级：环境在场扫描 (日常状态)\n' +
        '读取 MVU 变量中的“是否在场”状态，并对在场角色进行优先级排序。\n' +
        '【置顶特权】：玩家手动⭐置顶的角色无视好感度排在最前(后置顶者优先)。\n' +
        '【好感排序】：其余未置顶在场角色按好感度从高到低填充剩余名额。\n' +
        '仅允许排名前 N 的角色开启 Pro，超出及不在场者均降级为 Lite。'
      );
  });

  loadDataAndRender();
}

let currentData = { pairs: [], stories: [], summaries: [] }, currentView = 'chars'; 
async function loadDataAndRender() {
  const result = await scanAndPairEntries();
  wb$('#wb-current-book-display').text(result.bookName ? `当前绑定世界书: ${result.bookName}` : '⚠️ 未检测到绑定的世界书').css('color', result.bookName ? '#63b3ed' : '#fc8181');
  if (result.success) { currentData = { pairs: result.pairs, stories: result.stories, summaries: result.summaries }; switchTab(currentView); }
  else wb$('#wb-switcher-list').html(`<div style='text-align:center;color:#fc8181;padding:20px;'>${result.message}</div>`);
}
function refreshUIIfOpen() {
  const $panel = wb$('#wb-switcher-panel');
  if ($panel.length && ($panel.is(':visible') || $panel.closest('#phone-app-body').length)) loadDataAndRender();
}

async function switchTab(view) {
  currentView = view;
  const active = { background: SWITCHER_CONFIG.colors.tabActive, color: 'white' };
  const inactive = { background: SWITCHER_CONFIG.colors.tabInactive, color: '#a0aec0' };
  
  wb$('#wb-tab-chars').css(view==='chars'?active:inactive); 
  wb$('#wb-tab-stories').css(view==='stories'?active:inactive);
  wb$('#wb-tab-summaries').css(view==='summaries'?active:inactive);

  if(view==='chars') { 
      wb$('#wb-virgin-btns').show();
      renderGlobalButtonsChars(); 
      renderListChars(); 
  } else if(view==='stories') { 
      wb$('#wb-virgin-btns').hide();
      renderGlobalButtonsStories(); 
      await renderListStories(); 
  } else { // summaries
      wb$('#wb-virgin-btns').hide();
      renderGlobalButtonsSummaries();
      await renderListSummaries();
  }
}

function checkAutoLock() {
  if (SWITCHER_STATE.autoMode) {
    toastr.warning('⚠️ 自动模式下禁止手动操作');
    return false;
  }
  return true;
}

function renderGlobalButtonsChars() {
  wb$('#wb-global-btns').html(`
    <button id='wb-global-pro' style='flex:1;background:${SWITCHER_CONFIG.colors.pro};color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;'>🚀 全部 Pro</button>
    <button id='wb-global-lite' style='flex:1;background:${SWITCHER_CONFIG.colors.lite};color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;'>🍃 全部 Lite</button>`);
  
  wb$('#wb-global-pro').on('click', async () => {
    if(!checkAutoLock()) return;
    if(!currentData.pairs.length)return; const ops=[]; currentData.pairs.forEach(i=>{if(i.proUid)ops.push({uid:i.proUid,enable:true});if(i.liteUid)ops.push({uid:i.liteUid,enable:false});}); await applyChanges(currentData.pairs[0].bookName, ops); toastr.success('全部 Pro 模式'); loadDataAndRender(); 
  });
  wb$('#wb-global-lite').on('click', async () => {
    if(!checkAutoLock()) return;
    if(!currentData.pairs.length)return; const ops=[]; currentData.pairs.forEach(i=>{if(i.liteUid)ops.push({uid:i.liteUid,enable:true});if(i.proUid)ops.push({uid:i.proUid,enable:false});}); await applyChanges(currentData.pairs[0].bookName, ops); toastr.success('全部 Lite 模式'); loadDataAndRender(); 
  });

  wb$('#wb-virgin-btns').html(`
    <button id='wb-global-virgin' style='flex:1;background:${SWITCHER_CONFIG.colors.virgin};color:white;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;font-size:12px;'>🌸 全员处女</button>
    <button id='wb-global-nonvirgin' style='flex:1;background:${SWITCHER_CONFIG.colors.nonVirgin};color:white;border:none;padding:6px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;font-size:12px;'>👠 全员非处女</button>
  `);

  wb$('#wb-global-virgin').on('click', async () => {
      if(!currentData.pairs.length) return;
      const modifiable = currentData.pairs.filter(p => p.virginModifiable);
      if(modifiable.length === 0) return toastr.warning('未找到包含“处女”设定的角色');
      await applyVirginUpdate(currentData.pairs[0].bookName, modifiable, true);
  });

  wb$('#wb-global-nonvirgin').on('click', async () => {
      if(!currentData.pairs.length) return;
      const modifiable = currentData.pairs.filter(p => p.virginModifiable);
      if(modifiable.length === 0) return toastr.warning('未找到包含“处女”设定的角色');
      await applyVirginUpdate(currentData.pairs[0].bookName, modifiable, false);
  });
}

function renderListChars() {
  const list = wb$('#wb-switcher-list').empty();
  if (currentData.pairs.length === 0) return list.html(`<div style='text-align:center;color:#718096;padding:20px;'>未找到 [Pro]/[Lite] 角色</div>`);
  
  currentData.pairs.forEach((item, idx) => {
    const isPro = item.proEnabled && !item.liteEnabled; const isLite = !item.proEnabled && item.liteEnabled;
    let virginBtnHtml = '';
    if (item.virginModifiable) {
        const vColor = item.isVirgin ? SWITCHER_CONFIG.colors.virgin : SWITCHER_CONFIG.colors.nonVirgin;
        const vText = item.isVirgin ? '🌸 处女' : '👠 非处女';
        virginBtnHtml = `<button class='wb-btn-virgin' data-idx='${idx}' style='background:${vColor};color:white;border:none;padding:5px 8px;border-radius:3px;cursor:pointer;font-size:11px;margin-right:5px;min-width:60px;font-weight:bold;'>${vText}</button>`;
    }

    // [新增] 动态生成置顶星标图标
    const pinIcon = item.isPinned ? '⭐' : '☆';
    const pinColor = item.isPinned ? '#ecc94b' : '#718096';

    // [修改] 左侧盒子布局，包裹星标与名字
    list.append(`<div class='wb-item-row' data-name='${item.displayName}' style='display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid transparent;'>
      <div style='display:flex;align-items:center;flex:1;overflow:hidden;margin-right:10px;'><span class='wb-btn-pin' data-core='${item.coreKey}' style='cursor:pointer;color:${pinColor};margin-right:4px;font-size:14px;user-select:none;flex-shrink:0;' title='置顶强制触发Pro'>${pinIcon}</span><div style='font-weight:bold;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'>${item.displayName}</div></div>
      <div style='display:flex;align-items:center;'>
        ${virginBtnHtml}
        <div style='display:flex;gap:2px;background:#2d3748;padding:2px;border-radius:4px;'>
          <button class='wb-btn-pro' data-idx='${idx}' ${!item.proUid?'disabled':''} style='background:${isPro?SWITCHER_CONFIG.colors.pro:'transparent'};color:${isPro?'white':'#a0aec0'};border:none;padding:5px 12px;border-radius:3px;cursor:pointer;font-size:12px;transition:0.2s;'>Pro</button>
          <button class='wb-btn-lite' data-idx='${idx}' ${!item.liteUid?'disabled':''} style='background:${isLite?SWITCHER_CONFIG.colors.lite:'transparent'};color:${isLite?'white':'#a0aec0'};border:none;padding:5px 12px;border-radius:3px;cursor:pointer;font-size:12px;transition:0.2s;'>Lite</button>
        </div>
      </div></div>`);
  });
  
  // [新增] 绑定置顶图标的点击事件
  wb$('.wb-btn-pin').on('click', function(e) {
      e.stopPropagation();
      const coreKey = $(this).data('core');
      togglePinStatus(coreKey);
  });

  wb$('.wb-btn-pro').on('click', async function() {
    if(!checkAutoLock()) return;
    const i=currentData.pairs[$(this).data('idx')]; await applyChanges(i.bookName, [{uid:i.proUid,enable:true}, i.liteUid?{uid:i.liteUid,enable:false}:null].filter(Boolean)); 
    $(this).closest('.wb-item-row').find('.wb-btn-pro').css({background:SWITCHER_CONFIG.colors.pro,color:'white'}); $(this).closest('.wb-item-row').find('.wb-btn-lite').css({background:'transparent',color:'#a0aec0'}); 
  });
  
  wb$('.wb-btn-lite').on('click', async function() {
    if(!checkAutoLock()) return;
    const i=currentData.pairs[$(this).data('idx')]; await applyChanges(i.bookName, [{uid:i.liteUid,enable:true}, i.proUid?{uid:i.proUid,enable:false}:null].filter(Boolean)); 
    $(this).closest('.wb-item-row').find('.wb-btn-pro').css({background:'transparent',color:'#a0aec0'}); $(this).closest('.wb-item-row').find('.wb-btn-lite').css({background:SWITCHER_CONFIG.colors.lite,color:'white'}); 
  });
  wb$('.wb-btn-virgin').on('click', async function() {
      const i = currentData.pairs[$(this).data('idx')];
      const targetState = !i.isVirgin;
      await applyVirginUpdate(i.bookName, [i], targetState);
  });
}

function renderGlobalButtonsStories() {
  wb$('#wb-global-btns').html(`
    <button id='wb-story-all-on' style='flex:1;background:${SWITCHER_CONFIG.colors.storyOn};color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;'>✍️ 全部开启</button>
    <button id='wb-story-all-off' style='flex:1;background:${SWITCHER_CONFIG.colors.inactive};color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;'>⛔ 全部关闭</button>`);
  wb$('#wb-story-all-on').on('click', async () => { if(!currentData.stories.length)return; await applyChanges(currentData.stories[0].bookName, currentData.stories.map(s=>({uid:s.uid,enable:true}))); toastr.success('已开启所有剧情'); loadDataAndRender(); });
  wb$('#wb-story-all-off').on('click', async () => { if(!currentData.stories.length)return; await applyChanges(currentData.stories[0].bookName, currentData.stories.map(s=>({uid:s.uid,enable:false}))); toastr.success('已关闭所有剧情'); loadDataAndRender(); });
}

function renderGlobalButtonsSummaries() {
  wb$('#wb-global-btns').html(`
    <button id='wb-summary-all-on' style='flex:1;background:${SWITCHER_CONFIG.colors.summaryOn};color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;'>🎬 全部开启</button>
    <button id='wb-summary-all-off' style='flex:1;background:${SWITCHER_CONFIG.colors.inactive};color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;font-weight:bold;opacity:0.9;'>⛔ 全部关闭</button>`);
  wb$('#wb-summary-all-on').on('click', async () => { if(!currentData.summaries.length)return; await applyChanges(currentData.summaries[0].bookName, currentData.summaries.map(s=>({uid:s.uid,enable:true}))); toastr.success('已开启所有梗概'); loadDataAndRender(); });
  wb$('#wb-summary-all-off').on('click', async () => { if(!currentData.summaries.length)return; await applyChanges(currentData.summaries[0].bookName, currentData.summaries.map(s=>({uid:s.uid,enable:false}))); toastr.success('已关闭所有梗概'); loadDataAndRender(); });
}

async function renderListStories() {
  const list = wb$('#wb-switcher-list').empty();
  if (currentData.stories.length === 0) return list.html(`<div style='text-align:center;color:#718096;padding:20px;'>未找到剧情条目(需包含✍️)</div>`);
  
  const scanText = await getFullContextVar();

  currentData.stories.forEach((item, idx) => {
    const type = item.strategy?.type || 'selective';
    const isConstant = type === 'constant';
    const isActive = checkStoryActivation(item, scanText);
    
    const strategyBtnText = isConstant ? '🔵常驻' : '🟢触';
    const strategyBtnColor = isConstant ? 'rgba(66,153,225,0.2)' : 'rgba(72,187,120,0.2)';
    const strategyBtnTextColor = isConstant ? '#63b3ed' : '#9ae6b4';
    
    let displayName = item.name.replace('✍️','').trim();
    let nameStyle = 'font-weight:bold;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:10px;';
    
    if (!item.enabled) {
        nameStyle += 'color:#718096;'; 
    } else if (isActive) {
        displayName = '⚡️ ' + displayName;
        nameStyle += 'color:white;'; 
    } else {
        nameStyle += 'color:#a0aec0;opacity:0.6;'; 
    }

    list.append(`<div class='wb-item-row' data-name='${item.name}' style='display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid transparent;'>
      <div style='${nameStyle}'>${displayName}</div>
      <div style='display:flex;align-items:center;gap:5px;'>
        <button class='wb-btn-story-strategy' data-idx='${idx}' style='background:${strategyBtnColor};color:${strategyBtnTextColor};border:1px solid ${strategyBtnTextColor};padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px;transition:0.2s;'>${strategyBtnText}</button>
        <button class='wb-btn-story-toggle' data-idx='${idx}' style='width:50px;background:${item.enabled?SWITCHER_CONFIG.colors.storyOn:SWITCHER_CONFIG.colors.inactive};color:white;border:none;padding:5px 10px;border-radius:3px;cursor:pointer;font-size:12px;transition:0.2s;'>${item.enabled?'ON':'OFF'}</button>
      </div></div>`);
  });
  
  wb$('.wb-btn-story-toggle').on('click', async function() { 
      const i=currentData.stories[$(this).data('idx')]; 
      const s=!i.enabled; 
      await applyChanges(i.bookName, [{uid:i.uid,enable:s}]); 
      i.enabled=s; 
      $(this).css('background',s?SWITCHER_CONFIG.colors.storyOn:SWITCHER_CONFIG.colors.inactive).text(s?'ON':'OFF'); 
  });

  wb$('.wb-btn-story-strategy').on('click', async function() {
      const i = currentData.stories[$(this).data('idx')];
      await toggleStrategy(i.bookName, i.uid);
  });
}

// [NEW] 梗概列表渲染 (复制自 Story 逻辑)
async function renderListSummaries() {
    const list = wb$('#wb-switcher-list').empty();
    if (currentData.summaries.length === 0) return list.html(`<div style='text-align:center;color:#718096;padding:20px;'>未找到梗概条目(需包含🎬️)</div>`);
    
    const scanText = await getFullContextVar();
  
    currentData.summaries.forEach((item, idx) => {
      const type = item.strategy?.type || 'selective';
      const isConstant = type === 'constant';
      const isActive = checkStoryActivation(item, scanText);
      
      const strategyBtnText = isConstant ? '🔵常驻' : '🟢触';
      const strategyBtnColor = isConstant ? 'rgba(66,153,225,0.2)' : 'rgba(72,187,120,0.2)';
      const strategyBtnTextColor = isConstant ? '#63b3ed' : '#9ae6b4';
      
      let displayName = item.name.replace('🎬️','').trim();
      let nameStyle = 'font-weight:bold;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:10px;';
      
      if (!item.enabled) {
          nameStyle += 'color:#718096;'; 
      } else if (isActive) {
          displayName = '⚡️ ' + displayName;
          nameStyle += 'color:#d6bcfa;'; // 紫色高亮
      } else {
          nameStyle += 'color:#a0aec0;opacity:0.6;'; 
      }
  
      list.append(`<div class='wb-item-row' data-name='${item.name}' style='display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid transparent;'>
        <div style='${nameStyle}'>${displayName}</div>
        <div style='display:flex;align-items:center;gap:5px;'>
          <button class='wb-btn-summary-strategy' data-idx='${idx}' style='background:${strategyBtnColor};color:${strategyBtnTextColor};border:1px solid ${strategyBtnTextColor};padding:4px 8px;border-radius:3px;cursor:pointer;font-size:11px;transition:0.2s;'>${strategyBtnText}</button>
          <button class='wb-btn-summary-toggle' data-idx='${idx}' style='width:50px;background:${item.enabled?SWITCHER_CONFIG.colors.summaryOn:SWITCHER_CONFIG.colors.inactive};color:white;border:none;padding:5px 10px;border-radius:3px;cursor:pointer;font-size:12px;transition:0.2s;'>${item.enabled?'ON':'OFF'}</button>
        </div></div>`);
    });
    
    wb$('.wb-btn-summary-toggle').on('click', async function() { 
        const i=currentData.summaries[$(this).data('idx')]; 
        const s=!i.enabled; 
        await applyChanges(i.bookName, [{uid:i.uid,enable:s}]); 
        i.enabled=s; 
        $(this).css('background',s?SWITCHER_CONFIG.colors.summaryOn:SWITCHER_CONFIG.colors.inactive).text(s?'ON':'OFF'); 
    });
  
    wb$('.wb-btn-summary-strategy').on('click', async function() {
        const i = currentData.summaries[$(this).data('idx')];
        await toggleStrategy(i.bookName, i.uid);
    });
  }

function saveSettings() { localStorage.setItem(SWITCHER_CONFIG.storageKey, JSON.stringify({ autoMode: SWITCHER_STATE.autoMode, floatVisible: SWITCHER_STATE.floatVisible, floatPos: SWITCHER_STATE.floatPos })); }
function loadSettings() { try { const s = JSON.parse(localStorage.getItem(SWITCHER_CONFIG.storageKey)); if(s) SWITCHER_STATE = { ...SWITCHER_STATE, ...s }; } catch (e) {} }

function mountWorldbookPanelInPhone(hostEl) {
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

window.__WUWA_WB_CREATE_PANEL__ = mountWorldbookPanelInPhone;

$(() => {
  loadSettings();
  if (!window.__WUWA_WB_PHONE_EMBED__ && typeof appendInexistentScriptButtons === 'function') {
    appendInexistentScriptButtons([{ name: SWITCHER_CONFIG.buttonName, visible: true }]);
    eventOn(getButtonEvent(SWITCHER_CONFIG.buttonName), () => {
        const panel = wb$('#wb-switcher-panel');
        if (panel.length > 0) panel.remove();
        else createSwitcherPanel();
    });
  }
  if (!window.__WUWA_WB_SKIP_FLOAT__) {
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
  }
  
  // 启动 1s 心跳循环
  clearInterval(masterLoopTimer);
  masterLoopTimer = setInterval(masterLoop, 1000);

  console.log('[WuWa v4.0.3] 实时状态机(变量驱动Pro+剧情+梗概+飞讯监控)已启动');
});

// [新增] 监听脚本沙箱卸载，彻底清理 UI 残留和内存（用 pagehide，iframe 内 unload 会被 Permissions Policy 拦截）
$(window).on('pagehide', () => {
    clearInterval(masterLoopTimer); // 停止心跳
    wb$('#wb-float-monitor').remove(); // 拔除悬浮窗
    wb$('#wb-switcher-panel').remove(); // 拔除设置面板
    console.log('[WuWa v4.0.3] 脚本已关闭，监控面板已同步销毁！');
});