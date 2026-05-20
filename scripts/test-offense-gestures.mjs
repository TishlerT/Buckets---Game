// Automated drag test for the OffenseScreen.
// Spawns headless Chrome, navigates to localhost:8081, clicks PLAY, and
// dispatches real CDP-level pointer events (mouse-down + N intermediate
// pointer-moves + mouse-up) to verify the slingshot gesture pipeline works.
//
// Run with: node scripts/test-offense-gestures.mjs

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
  page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[pageerror]', err.message));

  console.log('navigating');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3000);

  console.log('clicking PLAY');
  // The PLAY button is the green one; click it by accessibility label.
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div[role="button"], [aria-label="PLAY"]'));
    const play = buttons.find((b) => (b.getAttribute('aria-label') || b.textContent || '').includes('PLAY'));
    if (play) play.click();
    else throw new Error('PLAY button not found');
  });
  await sleep(2500);

  await page.screenshot({ path: '/opt/cursor/artifacts/auto_offense_initial.png' });

  // Print DEBUG info about page dimensions
  const dims = await page.evaluate(() => {
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      dpr: window.devicePixelRatio,
      bodyH: document.body.clientHeight,
      rootH: document.getElementById('root')?.clientHeight || -1,
    };
  });
  console.log('page dims:', dims);

  // Compute gesture coordinates as fractions of viewport.
  const vw = dims.vw, vh = dims.vh;

  async function dragShoot(label, dx, dy, holdMs) {
    console.log(`--- ${label}: drag (${dx}, ${dy}) hold=${holdMs}ms ---`);
    const startX = vw / 2;
    const startY = vh * 0.78; // deep in slingshot zone (bottom 40%)

    // Use puppeteer mouse API which generates real pointer events on web.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move in 16 steps so pointer-move events fire each frame.
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await page.mouse.move(startX + dx * t, startY + dy * t);
      await sleep(8);
    }
    await sleep(holdMs);
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_offense_${label}_pulling.png` });
    await page.mouse.up();
    await sleep(800);
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_offense_${label}_after.png` });
  }

  async function dragSlide(label, dx) {
    console.log(`--- ${label}: slide dx=${dx} ---`);
    const startX = vw / 2;
    const startY = vh * 0.35; // upper area (slide zone)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await page.mouse.move(startX + dx * t, startY);
      await sleep(8);
    }
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_offense_${label}_during.png` });
    await page.mouse.up();
    await sleep(300);
    await page.screenshot({ path: `/opt/cursor/artifacts/auto_offense_${label}_after.png` });
  }

  // 1. Straight-down moderate pull (should be a clean shot up).
  await dragShoot('shot1_straight_med', 0, 90, 280);
  // 2. Stronger straight pull
  await dragShoot('shot2_straight_strong', 0, 160, 280);
  // 3. Off-angle pull (right and down → ball goes left)
  await dragShoot('shot3_offangle', 60, 110, 280);
  // 4. Slide left
  await dragSlide('slide_left', -140);
  // 5. Shoot from new position
  await dragShoot('shot4_after_slide', 0, 110, 280);
  // 6. Slide right
  await dragSlide('slide_right', 280);
  // 7. Shoot from far right
  await dragShoot('shot5_far_right', 0, 110, 280);
  // 8. Take 3 quick rapid shots
  for (let i = 0; i < 3; i++) {
    await dragShoot(`rapid_${i}`, 0, 90 + i * 10, 280);
    await sleep(300);
  }

  await page.screenshot({ path: '/opt/cursor/artifacts/auto_offense_final.png' });

  // Read score from DOM
  const score = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div'));
    for (const el of els) {
      const txt = el.textContent || '';
      if (/^\d{1,3}$/.test(txt) && el.parentElement?.textContent?.includes('PLAYER')) {
        return parseInt(txt, 10);
      }
    }
    return null;
  });
  console.log('FINAL SCORE attempt:', score);

  await browser.close();
})();
