# Browser Automation (MERN + Playwright)

Paste a link in the React UI → the Express backend launches N (default 5) separate Chromium
browsers **simultaneously** via Playwright. Each opens the link and is closed automatically after
its own random time between min and max (default 5–30 seconds).

MongoDB is optional: set `MONGO_URI` in `backend/.env` to store run history.

```bash
npm run install:all
cp backend/.env.example backend/.env
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:5173
```

`POST /api/runs {url, count, minSec, maxSec}` · `GET /api/runs/:id`
