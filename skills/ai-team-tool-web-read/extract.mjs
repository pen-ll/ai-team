/**
 * ai-team-tool-web-read — 网页内容提取脚本
 * 用法: node extract.mjs <url> <outputDir> [cookieFile]
 * 输出: /tmp/web-read-result.json
 *
 * 自动检测页面类型（Axure 原型 / 普通页面），一次性完成：
 *   - 登录检测（LOGIN_REQUIRED → exit 1）
 *   - 文本提取
 *   - 图片下载到 {outputDir}/web-req-assets/
 *   - 页面截图
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const url = process.argv[2];
const outputDir = process.argv[3];
const cookieFile = process.argv[4];

if (!url || !outputDir) {
  console.error('Usage: node extract.mjs <url> <outputDir> [cookieFile]');
  process.exit(1);
}

const assetsDir = path.join(outputDir, 'web-req-assets');
fs.mkdirSync(assetsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

// Cookie 注入
if (cookieFile && fs.existsSync(cookieFile)) {
  try {
    const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf-8'));
    await context.addCookies(cookies);
    console.log('Cookies injected from', cookieFile);
  } catch (e) {
    console.error('Cookie parse error:', e.message);
  }
}

const page = await context.newPage();

// ─── 辅助函数 ───
async function downloadImages(pageObj, prefix) {
  const imgs = await pageObj.evaluate(() =>
    Array.from(document.images)
      .filter(img => !img.src.includes('/resources/') && !img.src.includes('/plugins/'))
      .map(img => ({ src: img.src, alt: img.alt || '' }))
  );
  const result = [];
  for (const img of imgs) {
    try {
      const r = await pageObj.request.get(img.src);
      if (r.ok()) {
        const ext = img.src.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)?.[0] || '.png';
        const local = `${prefix}-${String(result.length + 1).padStart(3, '0')}${ext}`;
        fs.writeFileSync(path.join(assetsDir, local), await r.body());
        result.push({ src: img.src, alt: img.alt, local });
      } else {
        console.warn('[img-skip] HTTP', r.status(), img.src.substring(0, 80));
      }
    } catch (e) {
      console.warn('[img-fail]', e.message.substring(0, 60), img.src.substring(0, 80));
    }
  }
  return result;
}

async function tryPageUrl(pageName, baseUrl, context) {
  const pageUrls = [
    () => new URL(path.join(new URL(baseUrl).pathname.replace(/\/$/, ''), encodeURIComponent(pageName) + '.html'), baseUrl).href,
    () => new URL(path.join(new URL(baseUrl).pathname.replace(/\/$/, ''), encodeURIComponent(pageName.replace(/\//g, '_')) + '.html'), baseUrl).href,
  ];
  for (const fn of pageUrls) {
    const pUrl = fn();
    const p = await context.newPage();
    try {
      const resp = await p.goto(pUrl, { waitUntil: 'networkidle', timeout: 10000 });
      if (resp && resp.status() === 200) {
        const text = await p.evaluate(() => document.body.innerText);
        if (text.length > 50) return { page: p, text };
      }
    } catch (e) { /* try next */ }
    await p.close();
  }
  return null;
}

async function tryDataFile(pageName, baseUrl, context) {
  try {
    const dataUrl = new URL('data/document.js', baseUrl).href;
    const dp = await context.newPage();
    await dp.goto(dataUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
    const rawData = await dp.evaluate(() => document.body.innerText);
    await dp.close();
    const encodedName = pageName.replace(/\//g, '_');
    const match = rawData.match(new RegExp(`"${encodedName}","([^"]+)"`));
    if (match) return new URL(path.join(new URL(baseUrl).pathname.replace(/\/$/, ''), match[1]), baseUrl).href;
  } catch (e) { /* ignore */ }
  return null;
}

async function tryPlayerUrl(pageName, baseUrl, context) {
  const u = new URL(baseUrl);
  const playerUrl = `${u.origin}${u.pathname}?id=${u.searchParams.get('id') || ''}&p=${encodeURIComponent(pageName)}&g=1&sc=3`;
  const p = await context.newPage();
  await p.goto(playerUrl, { waitUntil: 'networkidle', timeout: 10000 });
  await p.waitForTimeout(3000);
  const frame = p.frames().find(f => f !== p.mainFrame());
  const text = frame ? await frame.evaluate(() => document.body.innerText) : '';
  return { page: p, text };
}

// ─── 主流程 ───
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // 1. 登录检测
  const isLogin = await page.evaluate(() => {
    const u = location.href.toLowerCase();
    const pw = document.querySelector('input[type="password"]');
    return u.includes('login') || u.includes('signin') || u.includes('auth')
      || (pw && document.body.innerText.length < 200);
  });
  if (isLogin) {
    console.log('LOGIN_REQUIRED');
    await browser.close();
    process.exit(1);
  }

  // 2. 页面类型检测
  const pageType = await page.evaluate(() => {
    const hasAxure = !!document.querySelector('[src*="axure"]')
      || document.title.includes('Axure');
    const hasSitemap = !!document.getElementById('sitemapTreeContainer');
    const hasMainFrame = !!document.getElementById('mainFrame');
    return (hasAxure || hasSitemap || hasMainFrame) ? 'axure' : 'normal';
  });

  // 3. 提取
  let allPages = [];

  if (pageType === 'axure') {
    const pageNames = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.sitemapPageLink')).map(el => el.innerText.trim())
    );

    for (let i = 0; i < pageNames.length; i++) {
      const name = pageNames[i];
      const safeName = name.replace(/[\/\\?*:|"<>]/g, '_');

      // 策略 1: 直接访问 → 策略 2: 下划线替换 → 策略 3: data/document.js → 策略 4: Axure player
      let result = await tryPageUrl(name, url, context);

      if (!result) {
        const realUrl = await tryDataFile(name, url, context);
        if (realUrl) {
          const p = await context.newPage();
          await p.goto(realUrl, { waitUntil: 'networkidle', timeout: 10000 });
          result = { page: p, text: await p.evaluate(() => document.body.innerText) };
        }
      }

      if (!result) {
        result = await tryPlayerUrl(name, url, context);
      }

      if (result) {
        const { page: p, text } = result;
        const images = await downloadImages(p, `p${i + 1}-img`);
        const ss = `page-${String(i + 1).padStart(2, '0')}-${safeName}.png`;
        await p.screenshot({ path: path.join(assetsDir, ss), fullPage: true });
        allPages.push({ index: i + 1, name, text, images, screenshot: ss });
        await p.close();
      }
    }
  } else {
    const text = await page.evaluate(() => document.body.innerText);
    const images = await downloadImages(page, 'img');
    await page.screenshot({ path: path.join(assetsDir, 'fullpage.png'), fullPage: true });
    allPages = [{ index: 1, name: '正文', text, images, screenshot: 'fullpage.png' }];
  }

  fs.writeFileSync('/tmp/web-read-result.json', JSON.stringify(allPages, null, 2));
  console.log('===type===', pageType, '===pages===', allPages.length, '===DONE===');
} catch (err) {
  console.log('===ERROR===', err.message);
} finally {
  await browser.close();
}
