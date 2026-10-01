// Captures /dev/components (and later screens) at 1920×1080 and 1366×768 in every theme.
// Uses playwright-core with the locally installed Edge/Chrome (no browser download).
// Usage: npm run dev (in another terminal), then `npm run screenshots [-- --only=1,2 --themes=hc --lang=fr]`.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = 'screenshots';
const sizes = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1366', width: 1366, height: 768 },
];
const themes = ['projector', 'night', 'hc'];
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const sheets = (only ?? ['1', '2', '3', '4', 'extras']).map((s) => ({ id: `components-${s}`, path: `/dev/components?sheet=${s}` }));
const lang = process.argv.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'en';
const themeArg = process.argv.find((a) => a.startsWith('--themes='))?.slice(9).split(',');

const candidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('No local Chromium-based browser found');

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath });
const errors = [];
for (const theme of themeArg ?? themes) {
  for (const size of sizes) {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([th, lg]) => {
      localStorage.setItem('algos-delta-prefs', JSON.stringify({ state: { theme: th, lang: lg }, version: 0 }));
    }, [theme, lang]);
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${theme} ${size.name}] ${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`[${theme} ${size.name}] pageerror: ${e.message}`));
    for (const s of sheets) {
      await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${OUT}/${s.id}-${theme}-${size.name}${lang === 'en' ? '' : '-' + lang}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'No console errors or warnings.');
process.exitCode = errors.length ? 1 : 0;
