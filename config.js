/* ==========================================================================
   CONFIGURAZIONE — l'unico file da modificare per contatti e dati legali.
   Qui NON vanno inserite chiavi segrete (il frontend è pubblico).
   ========================================================================== */
window.SITE_CONFIG = {
  // Endpoint che riceve le richieste (funzione serverless inclusa: api/adesione.js)
  submitEndpoint: "/api/adesione",

  // Web app AI per i visitatori (non viene modificata da questo progetto)
  webAppUrl: "https://garda-a-tavola-km-0.vercel.app/",

  // Pagina privacy (sostituire privacy.html con il testo legale reale o con un URL esterno)
  privacyUrl: "privacy.html",

  // Contatti mostrati nel footer e usati come alternativa se l'invio fallisce.
  // Lasciare vuoto per non mostrarli.
  contactEmail: "",
  contactPhone: "",

  // Dati del titolare — DA COMPILARE
  legal: {
    ownerName: "",        // es. "Ragione sociale / Nome del titolare"
    vatNumber: "",        // Partita IVA
    address: "",          // Sede legale
    extra: ""             // Altre informazioni (REA, PEC, ecc.)
  },

  // Tempo minimo (ms) tra apertura pagina e invio: filtro anti-bot
  minFillTimeMs: 3000
};
