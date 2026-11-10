// Service de synchronisation : garde une copie des données de l'appli dans la base Redis du projet Vercel.
// Chaque code de synchronisation a son propre espace ; le code lui-même n'est jamais enregistré, seulement son empreinte.
const crypto = require('crypto');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const MAX_BYTES = 900000;

async function redis(command) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(command),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'storage_not_configured' });

  const code = String(req.headers['x-sync-code'] || '');
  if (code.length < 8 || code.length > 200) return res.status(400).json({ error: 'bad_code' });
  // Optionnel : si la variable SYNC_CODE est définie dans Vercel, seul ce code est accepté.
  if (process.env.SYNC_CODE && code !== process.env.SYNC_CODE) return res.status(403).json({ error: 'forbidden' });

  const key = 'sport-laura:' + crypto.createHash('sha256').update(code).digest('hex');
  try {
    if (req.method === 'GET') {
      const v = await redis(['GET', key]);
      return res.status(200).json(v ? JSON.parse(v) : { t: 0 });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!b || typeof b.t !== 'number' || !b.state || typeof b.state !== 'object' || Array.isArray(b.state)) {
        return res.status(400).json({ error: 'bad_body' });
      }
      const cur = await redis(['GET', key]);
      const curT = cur ? JSON.parse(cur).t || 0 : 0;
      const t = Math.max(b.t, curT + 1);
      const doc = JSON.stringify({ t, state: b.state });
      if (doc.length > MAX_BYTES) return res.status(413).json({ error: 'too_large' });
      await redis(['SET', key, doc]);
      return res.status(200).json({ t });
    }
    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
