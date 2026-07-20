const puppeteer = require('puppeteer-core');
(async () => {
  console.log('Connecting to Edge...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9223', defaultViewport: null, timeout: 10000 });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('localhost:8000')) || pages[0];
  
  console.log('=== TASK 1: Page State ===');
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  await page.waitForFunction(() => typeof window.$ !== 'undefined', { timeout: 5000 }).catch(() => console.log('jQuery not found on window'));
  console.log('jQuery ready');

  // === TASK 2: Console Messages ===
  console.log('\n=== TASK 2: Console Messages ===');
  const cdp = await page.createCDPSession();
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  
  const messages = [];
  cdp.on('Runtime.consoleAPICalled', msg => {
    const text = msg.args.map(a => a.value || a.description || '').join(' ');
    if (text.includes('鸣潮') || msg.type === 'error' || msg.type === 'warning') {
      messages.push({ type: msg.type, text });
    }
  });
  cdp.on('Log.entryAdded', entry => {
    const t = entry.entry.text || '';
    if (t.includes('鸣潮') || entry.entry.level === 'error' || entry.entry.level === 'warning') {
      messages.push({ type: 'log:' + entry.entry.level, text: t, source: entry.entry.source });
    }
  });

  await new Promise(r => setTimeout(r, 3000));
  
  if (messages.length === 0) {
    console.log('No console messages with 鸣潮 or errors found in 3s capture window.');
  } else {
    console.log('Found messages:');
    messages.forEach(m => console.log('  ['+m.type+'] '+m.text.substring(0,300)));
  }

  // === TASK 3: Opening Panel DOM ===
  console.log('\n=== TASK 3: Opening Panel (开局面板) DOM ===');
  const openingCheck = await page.evaluate(() => {
    const r = [];
    ['[id*="opening"]', '[class*="opening"]', '[id*="开场"]', '[class*="开场"]'].forEach(sel => {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) r.push({ selector: sel, count: els.length, samples: Array.from(els).slice(0,3).map(e => ({ tag: e.tagName, id: e.id, cls: e.className.substring(0,80), txt: (e.innerText||'').substring(0,50) })) });
    });

    const textHits = [];
    document.querySelectorAll('div, section, iframe, span, p, button').forEach(el => {
      const t = el.innerText || el.textContent || '';
      if (t.includes('开场') && el.offsetParent !== null) {
        textHits.push({ tag: el.tagName, id: el.id, cls: (el.className||'').substring(0,80), snippet: t.substring(0,100) });
      }
    });
    if (textHits.length > 0 && textHits.length < 30) r.push({ type: 'text_matches', count: textHits.length, matches: textHits });

    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({ id: f.id, cls: f.className, src: (f.src||'').substring(0,120) }));
    if (iframes.length > 0) r.push({ type: 'iframes', count: iframes.length, list: iframes });

    return r;
  });
  console.log(JSON.stringify(openingCheck, null, 2));

  // === TASK 4: Live Reload Toggle ===
  console.log('\n=== TASK 4: Live Reload Toggle ===');
  const toggleCheck = await page.evaluate(() => {
    const $el = $('#extensions_settings');
    if ($el.length === 0) return { error: '#extensions_settings not found', bodyText: (document.body.innerText||'').substring(0,500) };
    const allowMon = $el.find(':contains("允许监听")');
    const checked = $el.find('input[type="checkbox"]:checked');
    return {
      extensionsSettingsExists: true,
      allowMonitorTextCount: allowMon.length,
      checkedCount: checked.length,
      allowTextSample: allowMon.first().text().substring(0,200),
      htmlSample: $el.html().substring(0,800)
    };
  });
  console.log(JSON.stringify(toggleCheck, null, 2));

  // === TASK 5: Active Scripts ===
  console.log('\n=== TASK 5: Active Scripts ===');
  const scriptsCheck = await page.evaluate(() => {
    const r = {};
    r.hasWuwaInPage = (document.body.innerText||'').includes('鸣潮');

    const extSettings = document.querySelector('#extensions_settings');
    if (extSettings) {
      r.extSettingsFound = true;
      const names = [];
      extSettings.querySelectorAll('label, .script-name, .script-title, h3, h4, [class*="script"], div').forEach(el => {
        const t = (el.innerText||el.textContent||'').trim();
        if (t && t.length < 200) names.push(t.substring(0,100));
      });
      r.scriptNames = [...new Set(names)].slice(0, 30);
    }

    const scriptListEl = document.querySelector('#extensions_list, #script_list, .script-list');
    if (scriptListEl) {
      r.scriptListFound = true;
      r.scriptListContent = scriptListEl.innerText.substring(0,500);
    }

    // Toggles
    const toggles = [];
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      const label = (el.closest('label')||el.parentElement||{}).innerText || '';
      if (label.length < 100) toggles.push({ label: label.substring(0,80), checked: el.checked, id: el.id });
    });
    r.allCheckboxes = toggles.slice(0, 30);

    // Wuwa elements
    const wuwaEls = [];
    document.querySelectorAll('div, span, label, li, td, button').forEach(el => {
      const t = el.innerText || '';
      if (t.includes('鸣潮') && el.offsetParent !== null) wuwaEls.push({ tag: el.tagName, cls: (el.className||'').substring(0,80), txt: t.substring(0,80) });
    });
    r.wuwaElements = wuwaEls.slice(0, 15);

    return r;
  });
  console.log(JSON.stringify(scriptsCheck, null, 2));

  await browser.disconnect();
  console.log('\nDone.');
})().catch(e => console.error('FATAL:', e.message));