import { Router } from 'express';
import { startRun, getRun, listRuns } from '../services/browserRunner.js';

const router = Router();
const clean = ({ _dbId, ...r }) => r;

router.post('/', async (req, res, next) => {
  try {
    const { url, count = 5, minSec = 5, maxSec = 30 } = req.body;
    let parsed;
    try {
      parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      return res.status(400).json({ error: 'A valid http(s) URL is required' });
    }
    const c = Number(count), min = Number(minSec), max = Number(maxSec);
    if (!Number.isInteger(c) || c < 1 || c > 10) return res.status(400).json({ error: 'count must be 1-10' });
    if (!(min >= 1) || !(max >= min) || max > 3600)
      return res.status(400).json({ error: 'need 1 <= min <= max <= 3600 seconds' });
    res.status(201).json(clean(await startRun({ url: parsed.href, count: c, minSec: min, maxSec: max })));
  } catch (e) {
    next(e);
  }
});

router.get('/', (_req, res) => res.json(listRuns().map(clean)));
router.get('/:id', (req, res) => {
  const run = getRun(req.params.id);
  run ? res.json(clean(run)) : res.status(404).json({ error: 'Not found' });
});

export default router;
