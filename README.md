# AI Wine Concierge — Landing page di adesione

Pagina commerciale per le aziende del Territorio Gardesano. Frontend statico (HTML/CSS/JS, nessun framework, nessuna dipendenza) + una funzione serverless Vercel per ricevere le richieste. La web app AI esistente non viene toccata.

## File

| File | Ruolo |
|---|---|
| `index.html` | Struttura e testi (sezioni A–F) |
| `styles.css` | Stile. **Identità visiva in `:root`** |
| `config.js` | Contatti, dati del titolare, URL privacy, endpoint |
| `submit.js` | Interfaccia di invio, separata dal layout |
| `app.js` | Scelta piano → form, validazione, stati, footer |
| `api/adesione.js` | Funzione serverless: validazione, antispam, inoltro |
| `privacy.html` | **Segnaposto**: va sostituito con l'informativa reale |
| `vercel.json`, `package.json`, `.env.example` | Deploy e configurazione |

## Eseguire in locale

- Solo grafica e form lato client: `python3 -m http.server 3000` → http://localhost:3000 (l'invio mostrerà errore: l'API non gira).
- Pagina + API: `npm i -g vercel`, poi `vercel dev` con `ADESIONE_WEBHOOK_URL` in `.env.local`.

## Pubblicare su Vercel

1. Crea un repository GitHub e carica questa cartella (`git init && git add . && git commit`, poi push).
2. Su vercel.com: **Add New → Project**, importa il repository. Framework preset: *Other*. Nessun build command.
3. In **Settings → Environment Variables** imposta `ADESIONE_WEBHOOK_URL` (vedi sotto) ed eventualmente `ADESIONE_WEBHOOK_SECRET` e `ALLOWED_ORIGIN`.
4. **Deploy**. Poi, per usare un dominio dedicato, aggiungilo in **Settings → Domains** (non toccare il dominio della web app esistente).

## Ancora da configurare per ricevere richieste

- **`ADESIONE_WEBHOOK_URL`**: finché manca, il form risponde con errore "servizio non attivo" e NON mostra mai conferma. Opzioni senza codice: Make, Zapier, n8n, Google Apps Script (web app) che scrive su un foglio, Formspree. Il corpo inviato è JSON: `plan, company, contact, email, phone, category, city, website, about, consent{privacy, privacyAt, marketing}, receivedAt`.
- **Informativa privacy**: sostituire `privacy.html` o impostare `privacyUrl`.
- **Contatti e dati del titolare** in `config.js` (il footer mostra segnaposto finché sono vuoti).
- **Conservazione dei dati**: il webhook scelto diventa un responsabile del trattamento; verificare nomina e sede dei dati.
- **IVA e condizioni del PRO**: testo volutamente neutro finché non confermate.
- **Antispam**: incluso honeypot, tempo minimo di compilazione, validazione server e limite per IP (best effort, in memoria). Per una protezione solida attivare Vercel Firewall/rate limiting o aggiungere Cloudflare Turnstile.

## Immagini e identità visiva

- Palette, stile dei pulsanti, angoli e gradiente del hero sono ripresi da uno screenshot di https://garda-a-tavola-km-0.vercel.app (verde #185a39 / #4ca060 → lime #bad77e, crema #e3efc9, parole dei titoli in gradiente magenta→blu). I valori sono campionati dall'immagine, quindi approssimati: per quelli esatti modifica solo `:root` in `styles.css`.
- Il font della web app sembra un sans geometrico molto pesante; qui si usa Inter/font di sistema (nessuna chiamata a terzi). Per il font esatto caricalo in locale con `@font-face`.
- Il hero usa gradiente e griglia di puntini, senza foto. Per una fotografia reale aggiungi `assets/hero.jpg` e impostala come `background-image` di `.hero-art`.
