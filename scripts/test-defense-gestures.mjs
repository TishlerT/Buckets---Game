// Automated swipe-up test for the DefenseScreen.
// Run with: node scripts/test-defense-gestures.mjs

import puppeteer from 'puppeteer';

const URL = 'http://localhost:8081';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=414,896'],
    defaultViewport: { width: 414, height: 896, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error' || t === 'warn') return; // mute reanimated warnings
    if (text.includes('react-native')) return;
    console.log('[browser]', t, text);
  });
  page.on('pageerror', (err) => console.error('[pageerror]', err.message));

  console.log('navigating');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3000);

  console.log('clicking DEFENSE button');
  // Find the bounding box of the DEFENSE button, then dispatch real pointer events.
  const buttonRect = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('[aria-label="DEFENSE"], [role="button"][aria-label="DEFENSE"]'));
    if (all.length === 0) {
      // Walk up to find a Pressable
      const labels = Array.from(document.querySelectorAll('*'));
      for (const el of labels) {
        if ((el.getAttribute && el.getAttribute('aria-label')) === 'DEFENSE') {
          const r = el.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        }
      }
      return null;
    }
    const r = all[0].getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  if (!buttonRect) throw new Error('DEFENSE button not found');
  console.log('button rect:', buttonRect);
  await page.mouse.move(buttonRect.x + buttonRect.w / 2, buttonRect.y + buttonRect.h / 2);
  await page.mouse.down();
  await sleep(50);
  await page.mouse.up();
  await sleep(2000);

  await page.screenshot({ path: '/opt/cursor/artifacts/auto_defense_initial.png' });

  const dims = await page.evaluate(() => ({
    vw: window.innerWidth,
    vh: window.innerHeight,
  }));
  console.log('page dims:', dims);

  // Swipe-up: start at 70% down screen, swipe to 30% down. Hold 0ms (quick).
  async function swipeUp(label) {
    const startX = dims.vw / 2;
    const startY = dims.vh * 0.75;
    const endY = dims.vh * 0.30;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await page.mouse.move(startX, startY + (endY - startY) * t);
      await sleep(8);
    }
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_defense_${label}_during.png` });
    await page.mouse.up();
    await sleep(700);
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_defense_${label}_after.png` });
  }

  // Wait until shooter goes into RELEASE phase by polling DOM. We can't see
  // the FSM directly, so just take periodic screenshots and try swipe at
  // various intervals to catch a release.
  for (let i = 0; i < 10; i++) {
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_defense_observe_${i}.png` });
    await sleep(500);
  }

  // Now perform a series of swipes hoping to catch some RELEASE moments.
  for (let i = 0; i < 8; i++) {
    await swipeUp(`swipe_${i}`);
    await sleep(1200 + Math.random() * 1500);
  }

  await page.screenshot({ path: '/opt/cursor/artifacts/auto_defense_final.png' });

  // Read score from DOM
  const stats = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div'));
    const out = { blocks: null, botScore: null };
    for (const el of els) {
      const txt = (el.textContent || '').trim();
      const m = txt.match(/^BLOCKS\s+(\d+)$/);
      if (m) out.blocks = parseInt(m[1], 10);
    }
    return out;
  });
  console.log('FINAL stats:', stats);

  await browser.close();
})();
