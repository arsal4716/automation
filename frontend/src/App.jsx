import { useEffect, useState } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [count, setCount] = useState(5);
  const [minSec, setMinSec] = useState(5);
  const [maxSec, setMaxSec] = useState(30);
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const active = run?.sessions.some((s) => s.status === 'pending' || s.status === 'open');

  // poll run status while any browser is still alive
  useEffect(() => {
    if (!run || !active) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/runs/${run.id}`);
      if (r.ok) setRun(await r.json());
    }, 1000);
    return () => clearInterval(t);
  }, [run?.id, active]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, count: +count, minSec: +minSec, maxSec: +maxSec }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRun(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Browser Automation</h1>
      <form onSubmit={submit}>
        <input
          type="url"
          required
          placeholder="Paste link, e.g. https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="row">
          <label>Browsers<input type="number" min="1" max="10" value={count} onChange={(e) => setCount(e.target.value)} /></label>
          <label>Min (sec)<input type="number" min="1" value={minSec} onChange={(e) => setMinSec(e.target.value)} /></label>
          <label>Max (sec)<input type="number" min="1" value={maxSec} onChange={(e) => setMaxSec(e.target.value)} /></label>
        </div>
        <button disabled={busy || active}>{active ? 'Running…' : 'Start'}</button>
        {error && <p className="error">{error}</p>}
      </form>

      {run && (
        <table>
          <thead><tr><th>#</th><th>Random time</th><th>Status</th></tr></thead>
          <tbody>
            {run.sessions.map((s) => (
              <tr key={s.index}>
                <td>{s.index}</td>
                <td>{s.durationSec}s</td>
                <td className={s.status}>{s.status}{s.error ? `: ${s.error.split('\n')[0]}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
