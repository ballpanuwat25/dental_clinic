// Screenshots a pinned scroll section at given progress values, at desktop and phone widths, and prints
// console errors. Uses the headless Chrome helper from the design-taste-frontend skill.
//   node scripts/shoot-scroll.mjs <url> <outDir> <pinVh> p1 p2 ...
// pinVh is the pinned section's scroll length in viewport heights × 100; images land as <outDir>/<width>-p<p>.jpg.
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const { Browser, sleep } = await import(pathToFileURL(`${homedir()}/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs`).href);
const [url, outDir, pinVh, ...ps] = process.argv.slice(2);
if (!url || !outDir || !pinVh) throw new Error('usage: node scripts/shoot-scroll.mjs <url> <outDir> <pinVh> p1 p2 ...');
mkdirSync(outDir, { recursive: true });

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const browser = await Browser.launch({ width: w, height: h, extraArgs: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ width: w, height: h, mobile });
  // a headless page counts as hidden, which slows requestAnimationFrame
  await page.send('Page.bringToFront');
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.goto(url, { settleMs: 7000 });
  for (const p of ps) {
    await page.eval((y) => scrollTo(0, y), (Number(p) * h * Number(pinVh)) / 100);
    await sleep(1400);
    await page.screenshot({ path: `${outDir}/${w}-p${p}.jpg` });
  }
  console.log(`${w}px: console errors ${JSON.stringify(page.consoleErrors)}`);
  await browser.close();
}
