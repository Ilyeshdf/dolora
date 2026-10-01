// Phase 3 walkthrough: data-entry flows end to end in Edge, with screenshots and console guard.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(() => localStorage.setItem('algos-delta-prefs', JSON.stringify({ state: { theme: 'projector', lang: 'en' }, version: 0 })));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const log = (k, v) => console.log(k.padEnd(52), v);
const shot = (n) => page.screenshot({ path: `screenshots/P3-${n}.png` });

await page.goto(`${BASE}/bed/4/monitor?freeze=1&state=pain`, { waitUntil: 'networkidle' });

// C. Add context: NMB on A1 (controlled ventilation) → face + motion masked, advisory
await page.getByRole('button', { name: 'Add context' }).click();
await page.getByPlaceholder('Search medications, conditions, events…').fill('neuromusc');
await shot('add-context-search');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
log('NMB chip added', await page.getByRole('button', { name: /Neuromuscular blockade/ }).first().isVisible());
log('face hotspot masked', await page.getByRole('button', { name: /Face: Masked/ }).isVisible());
log('motion hotspot masked', await page.getByRole('button', { name: /Motion: Masked/ }).isVisible());
log('alert stays (pain alert outranks NMB advisory)', await page.getByText('Possible unmanaged pain', { exact: true }).first().isVisible());
await shot('nmb-added');

// NMB + anticholinergic → unassessable warning before saving
await page.getByRole('button', { name: 'Add context' }).click();
await page.getByPlaceholder('Search medications, conditions, events…').fill('anticholinergic');
await page.keyboard.press('Enter');
log('unassessable warning shown', await page.getByText('Automated assessment will be unavailable (no reliable channel). Manual assessment only.').first().isVisible());
await shot('unassessable-warning');
await page.getByRole('button', { name: 'Add anyway' }).click();
await page.getByRole('button', { name: 'Add', exact: true }).click();
await page.waitForTimeout(200);
log('CONTEXT_UNASSESSABLE → abstention card', await page.getByText('Automated assessment unavailable', { exact: true }).isVisible());
await shot('unassessable');

// Remove anticholinergic with reason
await page.getByRole('button', { name: /Anticholinergic/ }).first().click();
await page.getByRole('button', { name: 'Entered in error' }).click();
await page.waitForTimeout(200);
log('removed → score back', await page.getByText('Estimated pain').first().isVisible());

// D. Log event retroactively: opioid bolus 15 min ago
await page.getByRole('button', { name: /Log event/ }).click();
await page.getByRole('radio', { name: '15 min ago' }).click();
await shot('log-event');
await page.getByRole('button', { name: /^Opioid bolus/ }).click();
await page.waitForTimeout(200);
log('opioid bolus chip (timed)', await page.getByRole('button', { name: /Opioid bolus · .* left/ }).isVisible());

// F. Baseline checklist
await page.getByRole('button', { name: 'Mark as baseline' }).click();
await shot('baseline-popover');
log('baseline: assess-now offered (CPOT 35 min old)', await page.getByRole('button', { name: 'Assess now' }).isVisible());
await page.getByRole('button', { name: 'Mark as provisional baseline' }).click();
log('baseline pill shows provisional', await page.getByText(/provisional/).first().isVisible());

// B. Profile drawer
await page.getByRole('button', { name: /Patient P-7F3A/ }).click();
await page.waitForTimeout(250);
await shot('profile-drawer');
log('profile drawer open', await page.getByRole('dialog', { name: 'Patient profile' }).isVisible());
await page.getByRole('radio', { name: /^Can self-report/ }).click();
log('NMB + self-report blocked', await page.getByText('A patient under neuromuscular blockade cannot self-report.').isVisible());
await shot('profile-contradiction');
await page.keyboard.press('Escape');

// Palette
await page.keyboard.press('Control+k');
await page.waitForTimeout(150);
await page.keyboard.type('turning');
await shot('palette');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
log('palette logged turning', await page.getByRole('button', { name: /Turning · .* left/ }).isVisible());

// Audit
await page.getByRole('button', { name: 'Audit trail' }).click();
await page.waitForTimeout(250);
await shot('audit-after-entry');
log('audit shows retroactive entry time', await page.getByText(/entered 14:32/).first().isVisible());
await page.keyboard.press('Escape');

// A. Admission wizard for bed 9
await page.goto(`${BASE}/bed/9/monitor?freeze=1`, { waitUntil: 'networkidle' });
log('bed 9: profile required', await page.getByText('Profile required').isVisible());
await shot('profile-required');
await page.getByRole('link', { name: 'Start admission' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Next' }).click();
log('step 1 blocks without age', await page.getByText('Enter an age in whole years.').isVisible());
await page.locator('#pf-age').fill('16');
await page.locator('#pf-age').blur();
await page.waitForTimeout(100);
log('paediatric blocked', await page.getByText(/Paediatric patients are not supported/).isVisible());
await shot('wizard-step1-paediatric');
await page.locator('#pf-age').fill('58');
await page.getByRole('radio', { name: 'Female' }).click();
await page.getByRole('radio', { name: 'Can self-report' }).click();
await page.getByRole('button', { name: 'Next' }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Beta-blocker' }).click();
await page.getByRole('button', { name: 'Atrial fibrillation' }).click();
await shot('wizard-step2');
await page.getByRole('button', { name: 'Skip for now' }).click();
await page.getByRole('button', { name: 'Skip for now' }).click();
await page.waitForTimeout(150);
await shot('wizard-summary');
log('summary lists HRV disabled', await page.getByText(/HRV disabled/).first().isVisible());
await page.getByRole('button', { name: 'Start calibration' }).click();
await page.waitForTimeout(300);
log('calibration started on monitor', await page.getByText("Learning this patient's resting state").isVisible());
log('profile incomplete badge', await page.getByText('Profile incomplete').isVisible());
await shot('calibrating');

await browser.close();
console.log(errors.length ? 'CONSOLE:\n' + [...new Set(errors)].join('\n') : 'No console errors or warnings.');
