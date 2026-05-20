// Drives a full BUCKETS vs-bot match end-to-end via puppeteer.
// Verifies coin-flip → announcer → offense → defense → ... → score screen.

import puppeteer from 'puppeteer';

const URL = 'http://localhost:8081';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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
  if (!rect) throw new Error(`button ${label} not found`);
  await page.mouse.move(rect.x + rect.w / 2, rect.y + rect.h / 2);
  await page.mouse.down();
  await sleep(50);
  await page.mouse.up();
}

async function dragShoot(page, vw, vh) {
  const startX = vw / 2 + (Math.random() - 0.5) * 30;
  const startY = vh * 0.78;
  const dy = 80 + Math.random() * 40;
  const dx = (Math.random() - 0.5) * 30;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    await page.mouse.move(startX + dx * t, startY + dy * t);
    await sleep(8);
  }
  await sleep(280);
  await page.mouse.up();
  await sleep(900);
}

async function swipeUp(page, vw, vh) {
  const startX = vw / 2;
  const startY = vh * 0.75;
  const endY = vh * 0.30;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    await page.mouse.move(startX, startY + (endY - startY) * t);
    await sleep(8);
  }
  await page.mouse.up();
  await sleep(400);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=414,896'],
    defaultViewport: { width: 414, height: 896, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.error('[pageerror]', err.message));

  console.log('navigating');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3000);

  await clickByLabel(page, 'PLAY');
  console.log('clicked PLAY');
  await sleep(500);
  await page.screenshot({ path: '/opt/cursor/artifacts/full_game_coinflip.png' });

  // Coin flip animation lasts COIN_FLIP_DURATION_MS=2400ms + 1100ms reveal = 3500ms
  await sleep(4000);
  await page.screenshot({ path: '/opt/cursor/artifacts/full_game_announcer.png' });
  // Announcer is TURN_ANNOUNCE_MS=1800ms
  await sleep(2200);
  await page.screenshot({ path: '/opt/cursor/artifacts/full_game_first_offense.png' });

  // Drive the FSM by alternately shooting (during offense) and swiping
  // (during defense). After every action wait 1.5s and inspect what phase
  // we're in by looking at the DOM.
  const dims = await page.evaluate(() => ({ vw: window.innerWidth, vh: window.innerHeight }));

  async function detectPhase() {
    return await page.evaluate(() => {
      const txt = (document.body.textContent || '').toUpperCase();
      if (txt.includes('YOU WIN') || txt.includes('BOT WINS') || txt.includes('PLAYER 2 WINS') || txt.includes('TIE GAME')) return 'END';
      if (txt.includes('TURN OVER')) return 'TURN_OVER';
      if (txt.includes('PASS THE PHONE')) return 'PASS_PHONE';
      if (txt.includes('SLINGSHOT THE 3')) return 'ANNOUNCE';
      if (txt.includes('SLINGSHOT ZONE')) return 'OFFENSE';
      if (txt.includes('SWIPE UP TO BLOCK')) return 'DEFENSE';
      if (txt.includes('COIN FLIP')) return 'COIN_FLIP';
      return 'UNKNOWN';
    });
  }

  const startTs = Date.now();
  const MAX_DURATION_MS = 240_000; // 4 min cap
  const MAX_ACTIONS = 200;

  let lastPhase = '';
  for (let i = 0; i < MAX_ACTIONS; i++) {
    if (Date.now() - startTs > MAX_DURATION_MS) {
      console.log('hit time cap');
      break;
    }
    const phase = await detectPhase();
    if (phase !== lastPhase) {
      console.log(`[i=${i} t=${Math.round((Date.now() - startTs) / 1000)}s] phase=${phase}`);
      lastPhase = phase;
    }
    if (phase === 'END') {
      await page.screenshot({ path: '/opt/cursor/artifacts/full_game_score.png' });
      break;
    }
    if (phase === 'OFFENSE') {
      await dragShoot(page, dims.vw, dims.vh);
    } else if (phase === 'DEFENSE') {
      await swipeUp(page, dims.vw, dims.vh);
      await sleep(800);
    } else if (phase === 'PASS_PHONE') {
      try { await clickByLabel(page, 'READY'); } catch {}
      await sleep(3500);
    } else if (phase === 'TURN_OVER') {
      try { await clickByLabel(page, 'OK'); } catch {}
      await sleep(500);
    } else {
      await sleep(800);
    }
  }

  // Try to read final score
  const final = await page.evaluate(() => {
    const txt = document.body.textContent || '';
    const winnerMatch = txt.match(/(YOU WIN|BOT WINS|PLAYER 2 WINS|TIE GAME)/);
    return {
      winner: winnerMatch ? winnerMatch[1] : null,
      hasHighlightBtn: txt.includes('HIGHLIGHT!'),
      sample: txt.slice(0, 500),
    };
  });
  console.log('FINAL:', final);

  // Click HIGHLIGHT! if present
  if (final.hasHighlightBtn) {
    await sleep(1000);
    try {
      await clickByLabel(page, 'HIGHLIGHT!');
      await sleep(2000);
      await page.screenshot({ path: '/opt/cursor/artifacts/full_game_highlight.png' });
      console.log('captured highlight screen');
    } catch (e) {
      console.log('failed to navigate to highlight:', e.message);
    }
  }

  await browser.close();
})();
