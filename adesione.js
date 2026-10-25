/**
 * Vercel Serverless Function — riceve le richieste di adesione.
 *
 * Nessuna dipendenza. Inoltra la richiesta (già validata) a un servizio
 * server-side scelto da te tramite variabili d'ambiente:
 *
 *   ADESIONE_WEBHOOK_URL     (obbligatoria) URL che riceve il JSON: Make, Zapier, n8n,
 *                            Google Apps Script, Formspree, un tuo database/CRM...
 *   ADESIONE_WEBHOOK_SECRET  (facoltativa) inviata come header "Authorization: Bearer ..."
 *   ALLOWED_ORIGIN           (facoltativa) es. https://adesioni.tuodominio.it — se impostata,
 *                            le richieste da altri domini vengono rifiutate
 *
 * Se ADESIONE_WEBHOOK_URL manca -> risposta 503: il frontend NON mostra successo.
 * Si risponde { ok: true } solo se il webhook ha confermato con HTTP 2xx.
 */

const CATEGORIES = ["Cantina", "Azienda agricola", "Produttore di olio", "Enoteca", "Enoturismo", "Ristorazione", "Ospitalità", "Altro"];
const PLANS = ["BASE", "PRO"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_FILL_MS = 2500;

// Rate limit "best effort" in memoria (per istanza): 5 richieste / 10 min per IP.
// Su Vercel le istanze sono effimere: per una protezione solida usa Vercel Firewall
// o un servizio esterno (vedi README).
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 5;
}

const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

function validate(b) {
  const f = {};
  if (!clean(b.company, 120)) f.company = "Nome azienda obbligatorio.";
  if (clean(b.contact, 120).split(/\s+/).length < 2) f.contact = "Inserisci nome e cognome.";
  if (!EMAIL.test(clean(b.email, 160))) f.email = "Email non valida.";
  if (b.phone && !/^[+()\d\s./-]{6,30}$/.test(clean(b.phone, 30))) f.phone = "Telefono non valido.";
  if (!CATEGORIES.includes(b.category)) f.category = "Categoria non valida.";
  if (!clean(b.city, 100)) f.city = "Località obbligatoria.";
  if (b.website) {
    try { const u = new URL(clean(b.website, 200)); if (!/^https?:$/.test(u.protocol)) throw 0; }
    catch { f.website = "Indirizzo web non valido."; }
  }
  if (!PLANS.includes(b.plan)) f.plan = "Piano non valido.";
  if (b.privacy !== true) f.privacy = "Consenso privacy obbligatorio.";
  return f;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Metodo non consentito." });
  }

  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && req.headers.origin && req.headers.origin !== allowed) {
    return res.status(403).json({ ok: false, message: "Origine non autorizzata." });
  }

  const webhook = process.env.ADESIONE_WEBHOOK_URL;
  if (!webhook) {
    return res.status(503).json({ ok: false, message: "Servizio di ricezione non configurato." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : null;
  if (!body) return res.status(400).json({ ok: false, message: "Richiesta non valida." });

  // Antispam: honeypot e tempo minimo di compilazione
  if (body.hp_field) return res.status(400).json({ ok: false, message: "Richiesta non accettata." });
  if (!Number.isFinite(body.elapsedMs) || body.elapsedMs < MIN_FILL_MS) {
    return res.status(400).json({ ok: false, message: "Richiesta troppo rapida: riprova." });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ ok: false, message: "Troppe richieste. Riprova più tardi." });

  const fields = validate(body);
  if (Object.keys(fields).length) return res.status(422).json({ ok: false, fields });

  const record = {
    receivedAt: new Date().toISOString(),
    plan: body.plan,
    company: clean(body.company, 120),
    contact: clean(body.contact, 120),
    email: clean(body.email, 160),
    phone: clean(body.phone, 30),
    category: body.category,
    city: clean(body.city, 100),
    website: clean(body.website, 200),
    about: clean(body.about, 1200),
    consent: { privacy: true, privacyAt: clean(body.consentAt, 40), marketing: body.marketing === true },
    source: "landing-adesioni"
  };

  try {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.ADESIONE_WEBHOOK_SECRET) headers.Authorization = "Bearer " + process.env.ADESIONE_WEBHOOK_SECRET;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(webhook, { method: "POST", headers, body: JSON.stringify(record), signal: ctrl.signal });
    clearTimeout(timer);

    if (!r.ok) throw new Error("webhook status " + r.status);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[adesione] inoltro fallito:", err && err.message);
    return res.status(502).json({ ok: false, message: "Non siamo riusciti a registrare la richiesta." });
  }
};
