const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9223', defaultViewport: null, timeout: 10000 });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('localhost:8000')) || pages[0];

  // === DEEPER TASK 4: Check live reload toggle state ===
  console.log('=== DEEPER TASK 4: Live Reload Toggle State ===');
  const toggleState = await page.evaluate(() => {
    // Find the exact "允许监听" toggle
    const allLabels = Array.from(document.querySelectorAll('label'));
    const monitorLabels = allLabels.filter(l => l.innerText.includes('允许监听'));
    
    const results = [];
    monitorLabels.forEach(label => {
      const checkbox = label.querySelector('input[type="checkbox"]');
      results.push({
        fullText: label.innerText.substring(0, 200),
        hasCheckbox: !!checkbox,
        isChecked: checkbox ? checkbox.checked : null,
        checkboxId: checkbox ? checkbox.id : null,
        parentHtml: label.parentElement?.outerHTML?.substring(0, 300)
      });
    });

    // Also try to find it in the extensions_settings panel
    const extSettings = document.querySelector('#extensions_settings');
    const allCheckboxes = Array.from(extSettings?.querySelectorAll('input[type="checkbox"]') || []);
    const labelMap = allCheckboxes.map(cb => {
      const label = cb.closest('label');
      const text = label ? label.innerText.substring(0, 120) : (cb.parentElement?.innerText?.substring(0, 120) || 'N/A');
      return { id: cb.id, text, checked: cb.checked };
    });
    
    return { monitorLabels: results, allCheckboxes: labelMap };
  });
  console.log(JSON.stringify(toggleState, null, 2));

  // === DEEPER TASK 5: Script Management Panel ===
  console.log('\n=== DEEPER TASK 5: Script Management ===');
  const scriptMgmt = await page.evaluate(() => {
    const result = {};
    
    // Check multiple possible script containers
    // Try to find the scripts panel button first
    const scriptPanelBtn = document.querySelector('[id*="script"], [class*="script_manager"], button:has([class*="script"])');
    result.scriptPanelBtn = scriptPanelBtn ? { text: scriptPanelBtn.innerText?.substring(0,100), id: scriptPanelBtn.id, class: scriptPanelBtn.className } : 'not found';

    // Search for the script list in the DOM
    const bodyText = document.body.innerText || '';
    const hasScriptManager = bodyText.includes('脚本管理') || bodyText.includes('脚本库');
    result.hasScriptManager = hasScriptManager;

    // Check if there's an extensions panel visible
    const extList = document.querySelector('#extensions_list');
    if (extList) {
      result.extListFound = true;
      result.extListText = extList.innerText.substring(0, 1000);
    }

    // Check the right-side navigation/pane
    const rightPane = document.querySelector('#rightNavHolder, .rightNav, [class*="right"]');
    if (rightPane) {
      const navItems = Array.from(rightPane.querySelectorAll('a, button, .nav-item, .menu-item, [class*="nav"]')).map(el => ({ text: (el.innerText||'').substring(0,100), id: el.id, class: el.className?.substring(0,80) }));
      result.navItems = navItems.slice(0, 30);
    }

    // Check iframes specifically
    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => {
      const text = f.contentDocument?.body?.innerText?.substring(0, 200) || 'not accessible';
      return { id: f.id, class: f.className, src: f.src?.substring(0,120), contentSample: text };
    });
    result.iframes = iframes;

    return result;
  });
  console.log(JSON.stringify(scriptMgmt, null, 2));

  // === Navigate into a 鸣潮 chat and check console ===
  console.log('\n=== Navigating into 鸣潮测试 chat ===');
  
  // Click on the first 鸣潮 chat in the recent list
  const clicked = await page.evaluate(() => {
    const chats = Array.from(document.querySelectorAll('.recentChat'));
    const wuwaChat = chats.find(c => c.innerText.includes('鸣潮测试'));
    if (wuwaChat) {
      wuwaChat.click();
      return { clicked: true, text: wuwaChat.innerText.substring(0, 100) };
    }
    return { clicked: false };
  });
  console.log('Click result:', JSON.stringify(clicked));

  // Wait for chat to load
  await new Promise(r => setTimeout(r, 5000));

  // Check console after entering chat
  const cdp = await page.createCDPSession();
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  const consoleMessages = [];
  cdp.on('Runtime.consoleAPICalled', msg => {
    const text = msg.args.map(a => a.value || a.description || '').join(' ');
    consoleMessages.push({ level: msg.type, text: text.substring(0, 300) });
  });
  cdp.on('Log.entryAdded', entry => {
    consoleMessages.push({ level: 'log:' + entry.entry.level, text: (entry.entry.text || '').substring(0, 300), source: entry.entry.source });
  });

  await new Promise(r => setTimeout(r, 3000));

  const wuwaErrors = consoleMessages.filter(m => m.text.includes('鸣潮'));
  const allErrors = consoleMessages.filter(m => m.level === 'error' || m.level === 'warning' || m.level.includes('error'));
  
  console.log(`Total console messages captured: ${consoleMessages.length}`);
  console.log(`Messages with 鸣潮: ${wuwaErrors.length}`);
  console.log(`Error/warning messages: ${allErrors.length}`);
  
  if (wuwaErrors.length > 0) {
    console.log('\n鸣潮 messages:');
    wuwaErrors.forEach(m => console.log(`  [${m.level}] ${m.text.substring(0, 300)}`));
  }
  if (allErrors.length > 0) {
    console.log('\nAll error/warning messages:');
    allErrors.forEach(m => console.log(`  [${m.level}] ${m.text.substring(0, 300)}`));
  }

  // Check chat page for script-related elements
  const chatState = await page.evaluate(() => {
    const r = {};
    r.url = window.location.href;
    r.title = document.title;
    
    // Check for script iframes in chat
    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
      id: f.id, class: f.className, src: (f.src||'').substring(0,200)
    }));
    r.iframes = iframes;

    // Check for message content
    const messages = Array.from(document.querySelectorAll('.mes, .message, [class*="message"]')).map(m => ({
      cls: m.className?.substring(0, 80),
      text: (m.innerText||'').substring(0, 200)
    }));
    r.messageCount = messages.length;
    r.messages = messages.slice(0, 5);

    return r;
  });
  console.log('\nChat state:', JSON.stringify(chatState, null, 2));

  await browser.disconnect();
  console.log('\nDone.');
})().catch(e => console.error('FATAL:', e.message));