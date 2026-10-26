// Takes the whole page as one long image per width, for the Fastwork portfolio cover. The stage is pinned and
// plays three scenes on one screen, so a plain full-length shot would show only one of them: this shoots
// each scene at the point it is fully in place, then the rest of the page below the pin in one piece, and
// stacks them (with Python's Pillow). Writes design/cover/desktop.jpg and phone.jpg.
// Chrome cannot paint one shot taller than 16,384 device pixels, so the part below the pin is kept under it.
//   node scripts/capture.mjs [url]        (default http://localhost:3015)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const { Browser, sleep } = await import(pathToFileURL(`${homedir()}/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs`).href);
const base = process.argv[2] ?? 'http://localhost:3015';
const OUT = 'design/cover';
// where each scene is fully in place, as a share of the pin's length (see AT in src/components/Stage.tsx)
const SCENES = [0, 0.5, 0.95];
mkdirSync(OUT, { recursive: true });

for (const [name, w, h, mobile, dsf] of [['desktop', 1440, 900, false, 1.5], ['phone', 390, 844, true, 2]]) {
  const browser = await Browser.launch({ width: w, height: h, extraArgs: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ width: w, height: h, mobile, dsf });
  await page.send('Page.bringToFront');
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.goto(base, { settleMs: 5000 });
  await page.eval(() => {
    const s = document.createElement('style');
    s.textContent = 'nextjs-portal { display: none !important; } html { scrollbar-gutter: auto !important; }';
    document.head.append(s);
  });
  const pin = await page.eval(() => {
    const spacer = document.getElementById('top').parentElement;
    return { top: spacer.offsetTop, length: spacer.offsetHeight - innerHeight, bottom: spacer.offsetTop + spacer.offsetHeight };
  });

  const parts = [];
  for (const [i, p] of SCENES.entries()) {
    await page.eval((y) => scrollTo(0, y), pin.top + pin.length * p);
    await sleep(2200);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
    const file = `${OUT}/${name}-scene${i}.png`;
    writeFileSync(file, Buffer.from(data, 'base64'));
    parts.push(file);
  }

  // below the pin: walk through once so the reveals and the map's walk have played, then shoot it whole,
  // without the fixed bar, which would otherwise be painted once mid-image
  const end = await page.eval(() => document.documentElement.scrollHeight);
  for (let y = pin.bottom - h; y < end; y += h * 0.6) { await page.eval((t) => scrollTo(0, t), y); await sleep(400); }
  await sleep(1800);
  await page.eval(() => { document.querySelector('.bar').style.visibility = 'hidden'; });
  const rest = Math.min(end - pin.bottom, Math.floor(16000 / dsf));
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true, clip: { x: 0, y: pin.bottom, width: w, height: rest, scale: 1 },
  });
  const file = `${OUT}/${name}-rest.png`;
  writeFileSync(file, Buffer.from(data, 'base64'));
  parts.push(file);
  console.log(`${name}: console errors ${JSON.stringify(page.consoleErrors)}`);
  await browser.close();

  execFileSync('python', ['-c', `
import sys
from PIL import Image
ims = [Image.open(p).convert('RGB') for p in sys.argv[2:]]
w = ims[0].width
out = Image.new('RGB', (w, sum(i.height for i in ims)))
y = 0
for i in ims:
    out.paste(i, (0, y)); y += i.height
out.save(sys.argv[1], quality=88)
print(sys.argv[1], out.size)
`, `${OUT}/${name}.jpg`, ...parts], { stdio: 'inherit' });
}
