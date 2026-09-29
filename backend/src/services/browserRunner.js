import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Run from '../models/Run.js';

const memory = new Map(); // id -> run (always kept; Mongo is an extra history store)

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const useDb = () => mongoose.connection.readyState === 1;

// Common "big play" buttons (YouTube, Vimeo, video.js, JW Player, generic).
const PLAY_BUTTONS = [
  '.ytp-large-play-button', 'button.ytp-play-button[data-title-no-tooltip="Play"]',
  '.vp-controls .play', 'button[aria-label="Play"]', '.vjs-big-play-button',
  '.jw-icon-display', 'button[title="Play"]',
].join(',');

// Try to start any video on the page (and in iframes). Retries because players load late.
async function autoplay(page, tries = 8) {
  for (let i = 0; i < tries; i++) {
    let playing = false;
    for (const frame of page.frames()) {
      try {
        playing ||= await frame.evaluate(async () => {
          const vids = [...document.querySelectorAll('video')];
          for (const v of vids) {
            if (!v.paused) return true;
            try { await Promise.race([v.play(), new Promise((r) => setTimeout(r, 1500))]); } catch { /* blocked, click fallback below */ }
            if (!v.paused) return true;
          }
          return false;
        });
        if (!playing) await frame.locator(PLAY_BUTTONS).first().click({ timeout: 500 });
      } catch { /* no video / no button in this frame yet */ }
    }
    if (playing) return;
    await page.waitForTimeout(1000);
  }
  // last resort: click the page centre (many players start on click)
  await page.mouse.click(640, 360).catch(() => {});
}

async function persist(run) {
  if (!useDb()) return;
  try {
    await Run.findOneAndUpdate({ _id: run._dbId }, { sessions: run.sessions }).exec();
  } catch (e) {
    console.warn('persist failed', e.message);
  }
}

// One independent browser (own process) that stays open for `durationSec`, then closes itself.
async function runSession(run, s) {
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined, // optional custom Chromium binary
      args: ['--autoplay-policy=no-user-gesture-required'],
      headless: process.env.HEADLESS !== 'false' });
    const page = await (await browser.newContext()).newPage();
    await page.goto(run.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await autoplay(page);
    s.status = 'open';
    s.startedAt = new Date();
    await persist(run);
    await new Promise((r) => setTimeout(r, s.durationSec * 1000));
    s.status = 'closed';
  } catch (e) {
    s.status = 'failed';
    s.error = e.message;
  } finally {
    s.closedAt = new Date();
    await browser?.close().catch(() => {});
    await persist(run);
  }
}

export async function startRun({ url, count, minSec, maxSec }) {
  const run = {
    id: randomUUID(),
    url, count, minSec, maxSec,
    createdAt: new Date(),
    sessions: Array.from({ length: count }, (_, i) => ({
      index: i + 1,
      durationSec: rand(minSec, maxSec),
      status: 'pending',
    })),
  };
  if (useDb()) {
    const doc = await Run.create({ url, count, minSec, maxSec, sessions: run.sessions });
    run._dbId = doc._id;
    run.id = String(doc._id);
  }
  memory.set(run.id, run);
  // all sessions start simultaneously; not awaited so the HTTP call returns immediately
  Promise.all(run.sessions.map((s) => runSession(run, s)));
  return run;
}

export const getRun = (id) => memory.get(id);
export const listRuns = () => [...memory.values()].reverse();
