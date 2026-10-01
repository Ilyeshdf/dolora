// Captures screens at 1920×1080 and 1366×768 using playwright-core + the local Edge/Chrome.
// Usage (dev server running):
//   npm run screenshots                       → monitor states A1–A7 + /dev/components, all themes
//   npm run screenshots -- --set=monitor      → only monitor states (each in its artboard theme)
//   npm run screenshots -- --set=components --only=1,2 --themes=hc --lang=fr
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = "screenshots";
const arg = (k) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const set = arg("set") ?? "all";
const lang = arg("lang") ?? "en";
const only = arg("only")?.split(",");
const themeArg = arg("themes")?.split(",");
const sizes = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1366", width: 1366, height: 768 },
];

/** Monitor states, each in the theme of its artboard (A2 = Night, A7 = High contrast). */
const monitor = [
  {
    id: "A1-pain",
    path: "/bed/4/monitor?freeze=1&state=pain&hover=eda_scr_rate",
    theme: "projector",
  },
  {
    id: "A2-stress",
    path: "/bed/4/monitor?freeze=1&state=stress",
    theme: "night",
  },
  {
    id: "A3-abstain",
    path: "/bed/4/monitor?freeze=1&state=abstain",
    theme: "projector",
  },
  {
    id: "A4-degraded",
    path: "/bed/4/monitor?freeze=1&state=degraded",
    theme: "projector",
  },
  {
    id: "A5-dialog",
    path: "/bed/4/monitor?freeze=1&state=pain&dialog=assessment&prefill=a5",
    theme: "projector",
  },
  {
    id: "A6-audit",
    path: "/bed/4/monitor?freeze=1&state=pain&panel=audit&hover=eda_scr_rate",
    theme: "projector",
  },
  {
    id: "A7-hc",
    path: "/bed/4/monitor?freeze=1&state=pain&hover=eda_scr_rate",
    theme: "hc",
  },
];
const components = (only ?? ["1", "2", "3", "4", "extras"]).map((s) => ({
  id: `components-${s}`,
  path: `/dev/components?sheet=${s}`,
}));

const targets = [];
if (set === "all" || set === "monitor") {
  for (const m of monitor) {
    if (only && set === "monitor" && !only.includes(m.id.slice(0, 2))) continue;
    // --themes=… on the monitor set captures every state in each listed theme.
    if (themeArg && set === "monitor")
      for (const th of themeArg)
        targets.push({ ...m, id: `${m.id}-${th}`, theme: th, full: false });
    else targets.push({ ...m, full: false });
  }
}
if (set === "all" || set === "components") {
  for (const theme of themeArg ?? ["projector", "night", "hc"])
    for (const c of components)
      targets.push({ ...c, id: `${c.id}-${theme}`, theme, full: true });
}

const executablePath = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => existsSync(p));
if (!executablePath) throw new Error("No local Chromium-based browser found");

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath });
const errors = [];
for (const size of sizes) {
  for (const tg of targets) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await ctx.addInitScript(
      ([th, lg]) => {
        localStorage.setItem(
          "algos-delta-prefs",
          JSON.stringify({ state: { theme: th, lang: lg }, version: 0 }),
        );
      },
      [tg.theme, lang],
    );
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning")
        errors.push(`[${tg.id} ${size.name}] ${m.type()}: ${m.text()}`);
    });
    page.on("pageerror", (e) =>
      errors.push(`[${tg.id} ${size.name}] pageerror: ${e.message}`),
    );
    await page.goto(BASE + tg.path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    // Layout guard: the monitor must not scroll at the target size (footer fully visible).
    if (!tg.full) {
      const overflow = await page.evaluate(() => ({
        sh: document.documentElement.scrollHeight,
        sw: document.documentElement.scrollWidth,
        footer:
          document.querySelector("footer")?.getBoundingClientRect().bottom ?? 0,
      }));
      if (
        overflow.sh > size.height ||
        overflow.sw > size.width ||
        overflow.footer > size.height
      )
        errors.push(
          `[${tg.id} ${size.name}] layout overflow: ${JSON.stringify(overflow)}`,
        );
      // Card guard: content must stay inside every card (D-0: no overlaps / clipped content).
      const cards = await page.evaluate(() =>
        [...document.querySelectorAll(".rounded-card")]
          .filter(
            (el) =>
              getComputedStyle(el).overflowY !== "auto" &&
              el.getBoundingClientRect().width > 0,
          )
          .map((el) => ({
            label: (
              el.getAttribute("aria-labelledby") ??
              el.textContent ??
              ""
            ).slice(0, 40),
            dh: el.scrollHeight - el.clientHeight,
            dw: el.scrollWidth - el.clientWidth,
          }))
          .filter((c) => c.dh > 2 || c.dw > 2),
      );
      for (const c of cards)
        errors.push(
          `[${tg.id} ${size.name}] card overflow ${JSON.stringify(c)}`,
        );
      // Single-line guard: elements marked .nowrap must render on one line.
      const wrapped = await page.evaluate(() =>
        [...document.querySelectorAll(".nowrap")]
          .filter((el) => {
            if (
              el.getBoundingClientRect().width === 0 ||
              el.children.length > 0
            )
              return false;
            const range = document.createRange();
            range.selectNodeContents(el);
            const tops = new Set(
              [...range.getClientRects()]
                .filter((r) => r.width > 1)
                .map((r) => Math.round(r.top / 4)),
            );
            return tops.size > 1;
          })
          .map((el) => el.textContent?.slice(0, 40)),
      );
      for (const w of wrapped)
        errors.push(`[${tg.id} ${size.name}] wrapped label "${w}"`);
    }
    const suffix = lang === "en" ? "" : `-${lang}`;
    await page.screenshot({
      path: `${OUT}/${tg.id}-${size.name}${suffix}.png`,
      fullPage: tg.full,
    });
    await ctx.close();
  }
}
await browser.close();
console.log(
  errors.length
    ? errors.join("\n")
    : "No console errors, warnings or layout overflow.",
);
process.exitCode = errors.length ? 1 : 0;
