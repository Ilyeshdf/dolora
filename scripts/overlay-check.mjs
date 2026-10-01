// Interaction smoke test for overlays on /dev/components (drawer, dialog, popover, toast, keyboard).
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/dev/components?sheet=extras', { waitUntil: 'networkidle' });
const log = (k, v) => console.log(k.padEnd(44), v);

await page.getByRole('button', { name: 'Open drawer' }).click();
const drawer = page.getByRole('dialog', { name: 'Patient profile' });
const box = await drawer.boundingBox();
log('drawer visible / x / width / top', `${await drawer.isVisible()} / ${box?.x} / ${box?.width} / ${box?.y}`);
await page.screenshot({ path: 'screenshots/overlay-drawer-1920.png' });
await page.keyboard.press('Escape');
log('drawer closed by Escape', !(await drawer.isVisible().catch(() => false)));

await page.getByRole('button', { name: 'Open dialog' }).click();
const dlg = page.getByRole('dialog', { name: 'Pain assessment' });
log('dialog visible', await dlg.isVisible());
for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
log('focus trapped inside dialog after 6×Tab', inside);
await page.screenshot({ path: 'screenshots/overlay-dialog-1920.png' });
await page.keyboard.press('Escape');
log('dialog closed by Escape', !(await dlg.isVisible().catch(() => false)));
log('focus returned to trigger', await page.evaluate(() => document.activeElement?.textContent));

await page.getByRole('button', { name: 'Open popover' }).click();
log('popover shows mode rule', await page.getByText('Switch to Ward mode?').last().isVisible());
await page.keyboard.press('Escape');

await page.getByRole('button', { name: 'Show toast' }).click();
const toast = page.getByText('Reference score recorded').last();
log('toast visible', await toast.isVisible());
await page.getByRole('button', { name: 'Undo' }).last().click();
await page.waitForTimeout(300);
log('toast dismissed by Undo', !(await toast.isVisible().catch(() => false)));

await page.getByRole('button', { name: 'Hover or focus me' }).focus();
await page.waitForTimeout(400);
log('tooltip opens on keyboard focus', await page.getByRole('tooltip').isVisible().catch(() => false));

await page.getByRole('button', { name: 'Increase Age (years)' }).first().click();
log('stepper increments (64 → 65)', await page.locator('#x-age').inputValue());

await page.getByRole('combobox', { name: /Unit|ICU/ }).first().click().catch(() => page.locator('#x-unit').click());
await page.getByRole('option', { name: 'Post-op ward · Beds 13–24' }).click();
log('select changes value', await page.locator('#x-unit').innerText());

await browser.close();
console.log(errors.length ? 'CONSOLE:\n' + errors.join('\n') : 'No console errors or warnings.');
