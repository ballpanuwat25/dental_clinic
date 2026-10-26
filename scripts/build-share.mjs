// Draws what a link to the site shows outside it, with headless Chrome. Adapted from Pak's (D:/bai-liang).
//  - src/app/apple-icon.png: the molar icon on the page's ground, 180 px (iOS fills transparency black)
//  - src/app/opengraph-image.jpg and twitter-image.jpg: the hero itself at 1200 by 630, the picture LINE,
//    Facebook or X show for a shared link
// Needs the dev server running.   node scripts/build-share.mjs [url]   (default http://localhost:3015)
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const { Browser, sleep } = await import(pathToFileURL(`${homedir()}/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs`).href);
const base = process.argv[2] ?? 'http://localhost:3015';
const app = (name) => new URL(`../src/app/${name}`, import.meta.url);

async function shoot(width, height, load, format = 'jpeg') {
  const browser = await Browser.launch({ width, height });
  const page = await browser.newPage({ width, height });
  await page.send('Page.bringToFront');
  await load(page);
  const params = { format, clip: { x: 0, y: 0, width, height, scale: 1 } };
  if (format === 'jpeg') params.quality = 88;
  const { data } = await page.send('Page.captureScreenshot', params);
  const errors = page.consoleErrors;
  await browser.close();
  return { data: Buffer.from(data, 'base64'), errors };
}

// the Apple icon: the same drawing as icon.svg, on the ground colour, with room round it as iOS rounds corners
const svg = readFileSync(app('icon.svg'), 'utf8');
const icon = await shoot(180, 180, async (page) => {
  await page.goto(`data:text/html,${encodeURIComponent(`<body style="margin:0;background:#f3f6f6;display:grid;place-items:center;height:180px">${svg.replace('<svg ', '<svg width="132" height="132" ')}</body>`)}`, { settleMs: 300 });
}, 'png');
writeFileSync(app('apple-icon.png'), icon.data);

// the share image: the first view once the loader has gone, without the dev tools' badge
const og = await shoot(1200, 630, async (page) => {
  await page.goto(base, { settleMs: 5000 });
  await page.eval(() => {
    const s = document.createElement('style');
    s.textContent = 'nextjs-portal { display: none !important; } html { scrollbar-gutter: auto !important; }';
    document.head.append(s);
  });
  await sleep(800);
});
const alt = 'ฟ้าใส ทันตกรรม ลาดพร้าว โชคชัย 4: ฟันสีขาวตัวกลมยืนบนเส้นพื้นระหว่างคำว่า "ฟ้า" กับ "ใส" ตัวโปร่ง พร้อมหัวข้อ หมอฟันใกล้บ้านที่บอกเวลาว่างให้ดูก่อนจอง';
for (const name of ['opengraph-image', 'twitter-image']) {
  writeFileSync(app(`${name}.jpg`), og.data);
  writeFileSync(app(`${name}.alt.txt`), alt);
}
console.log(`apple-icon.png ${icon.data.length >> 10} KB, share image ${og.data.length >> 10} KB, console errors ${JSON.stringify([...icon.errors, ...og.errors])}`);
