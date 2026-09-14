export default async function handler(req, res) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) {
    return res.status(503).json({ ok: false, error: 'GOOGLE_APPS_SCRIPT_URL não configurada' });
  }
  try {
    if (req.method === 'GET') {
      const r = await fetch(url, { redirect: 'follow' });
      const text = await r.text();
      res.status(r.ok ? 200 : 502).setHeader('content-type', 'application/json; charset=utf-8').send(text);
      return;
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'Método não permitido' });
    }
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const r = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: payload
    });
    const text = await r.text();
    res.status(r.ok ? 200 : 502).setHeader('content-type', 'application/json; charset=utf-8').send(text);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
