// Verifies the progression screen renders, an unlock can be purchased,
// and a court can be selected.
import puppeteer from 'puppeteer';
const URL = 'http://localhost:8081';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function clickByLabel(page, label) {
  const rect = await page.evaluate((lbl) => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      if ((el.getAttribute && el.getAttribute('aria-label')) === lbl) {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }
    return null;
  }, label);
  if (!rect) throw new Error(`${label} not found`);
  await page.mouse.move(rect.x + rect.w / 2, rect.y + rect.h / 2);
  await page.mouse.down();
  await sleep(60);
  await page.mouse.up();
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=414,896'],
    defaultViewport: { width: 414, height: 896, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.error('[pageerror]', err.message));
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3000);

  // Manually seed some unlock points by writing localStorage before navigating.
  await page.evaluate(() => {
    localStorage.setItem('@buckets/progression/v1', JSON.stringify({
      schemaVersion: 1, totalXp: 9999, unlockPoints: 10,
      unlocked: { courts: ['playground'], defenders: ['grandpa'], skins: ['classic'] },
      selected: { court: 'playground', defender: 'grandpa', skin: 'classic' },
    }));
    location.reload();
  });
  await sleep(3000);

  await clickByLabel(page, 'PROGRESSION');
  await sleep(1500);
  await page.screenshot({ path: '/opt/cursor/artifacts/phase5_progression.png' });

  // Try to buy GYM
  await clickByLabel(page, 'UNLOCK');
  await sleep(800);
  await page.screenshot({ path: '/opt/cursor/artifacts/phase5_after_unlock.png' });

  // Equip GYM
  await clickByLabel(page, 'EQUIP');
  await sleep(800);
  await page.screenshot({ path: '/opt/cursor/artifacts/phase5_equipped.png' });

  // Back to home
  await clickByLabel(page, 'BACK');
  await sleep(1000);
  await page.screenshot({ path: '/opt/cursor/artifacts/phase5_home_with_xp.png' });

  // Verify storage was updated
  const state = await page.evaluate(() => localStorage.getItem('@buckets/progression/v1'));
  console.log('FINAL storage:', state);

  await browser.close();
})();
