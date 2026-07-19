const fs = require('fs');
const path = require('path');
const https = require('https');
const net = require('net');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 7897;
const TARGET = 'E:/tavern_helper_template-main/src/鸣潮/assets/cg/赞妮';

const files = [
  ['日常形态','omez68','mp4'],['战斗形态','e6mpxs','mp4'],
  ['亲吻','8mzc72','mp4'],['暴露小穴','x94qdq','png'],
  ['口交','4jztmi','mp4'],['口交射精','zus4zw','png'],
  ['乳交','39bz3e','mp4'],['乳交射精','j6zj5h','png'],
  ['足交','pzvyy4','mp4'],['足交射精','ocgv1v','png'],
  ['破处','b5hg5y','mp4'],['破处射精','lmmyq7','mp4'],
  ['抱起来做爱','b433de','mp4'],['抱起来做爱射精','can6bn','png'],
  ['正常位做爱','6ha6kw','mp4'],['正常位做爱射精','lxxn9x','png'],
  ['女上位做爱','2aznj3','mp4'],['女上位做爱射精','24di8z','png'],
  ['后入位做爱','94csot','mp4'],['后入位做爱射精','k2m1rl','png'],
  ['自慰','mz1aua','mp4'],['自慰高潮','noayre','png'],
  ['手交','g74xjb','mp4'],['手交射精','imq3dt','png'],
  ['摸胸','aeodx8','mp4'],['做爱事后','j0wani','mp4'],
];

fs.mkdirSync(TARGET, { recursive: true });

// 通过 CONNECT 隧道建立 HTTPS 连接
function connectTunnel(hostname, port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: PROXY_HOST, port: PROXY_PORT });
    socket.on('error', reject);
    socket.write(`CONNECT ${hostname}:${port} HTTP/1.1\r\nHost: ${hostname}:${port}\r\n\r\n`);

    let buf = '';
    socket.once('data', (d) => {
      buf += d.toString();
      if (buf.includes('200')) {
        resolve(socket);
      } else {
        socket.destroy();
        reject(new Error(`CONNECT failed: ${buf.split('\n')[0]}`));
      }
    });
  });
}

function download(name, code, ext) {
  const dest = path.join(TARGET, `${name}.${ext}`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return Promise.resolve('skip');
  }

  return connectTunnel('files.catbox.moe', 443).then((socket) => {
    return new Promise((resolve) => {
      const req = https.request({
        createConnection: () => socket,
        hostname: 'files.catbox.moe',
        path: `/${code}.${ext}`,
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rejectUnauthorized: false,
      }, (res) => {
        if (res.statusCode >= 400) { res.resume(); resolve(`HTTP ${res.statusCode}`); return; }
        if (res.statusCode >= 300) {
          // Follow redirect
          const loc = res.headers.location;
          res.resume();
          if (loc) {
            const u = new URL(loc);
            connectTunnel(u.hostname, 443).then((sock2) => {
              const req2 = https.request({
                createConnection: () => sock2,
                hostname: u.hostname,
                path: u.pathname + u.search,
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                rejectUnauthorized: false,
              }, (res2) => {
                if (res2.statusCode >= 400) { res2.resume(); resolve(`redirect HTTP ${res2.statusCode}`); return; }
                const file = fs.createWriteStream(dest);
                res2.pipe(file);
                file.on('finish', () => resolve(`ok ${fs.statSync(dest).size}`));
                file.on('error', (e) => resolve(`write:${e.message}`));
              });
              req2.on('error', (e) => resolve(`redirect err:${e.message}`));
              req2.setTimeout(60000, () => { req2.destroy(); resolve('redirect timeout'); });
              req2.end();
            }).catch(e => resolve(`redirect connect:${e.message}`));
          } else {
            resolve('redirect no location');
          }
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => resolve(`ok ${fs.statSync(dest).size}`));
        file.on('error', (e) => resolve(`write:${e.message}`));
      });
      req.on('error', (e) => resolve(`err:${e.message}`));
      req.setTimeout(120000, () => { req.destroy(); resolve('timeout'); });
      req.end();
    });
  }).catch(e => `connect:${e.message}`);
}

async function main() {
  console.log(`代理: ${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`目标: ${TARGET}`);
  console.log(`共 ${files.length} 个文件\n`);

  let ok = 0, fail = 0;
  for (const [name, code, ext] of files) {
    const r = await download(name, code, ext);
    if (r === 'skip') {
      console.log(`[跳过] ${name}.${ext}`);
      ok++;
    } else if (r.startsWith('ok')) {
      const kb = (parseInt(r.split(' ')[1]) / 1024).toFixed(1);
      console.log(`[OK] ${name}.${ext} (${kb}KB)`);
      ok++;
    } else {
      console.log(`[失败] ${name}.${ext}: ${r}`);
      fail++;
    }
  }
  console.log(`\n===== 完成 ===== 成功: ${ok}, 失败: ${fail}`);
}

main().catch(console.error);