/* ==========================================================================
   Interfaccia di invio — separata dal layout.
   Per collegare un altro backend basta cambiare `submitEndpoint` in config.js
   oppure sostituire il corpo di submitApplication() mantenendo il contratto:

     submitApplication(payload) -> Promise<{ ok: true, id?: string }>
     in caso di errore lancia SubmitError { code, message, fields? }

   Il risultato è "ok" SOLO se il server risponde con HTTP 2xx e { ok: true }.
   Nessun dato viene salvato nel browser e nessun successo viene simulato.
   ========================================================================== */
(function () {
  "use strict";

  function SubmitError(code, message, fields) {
    this.name = "SubmitError";
    this.code = code;          // "not_configured" | "validation" | "network" | "server" | "spam"
    this.message = message;
    this.fields = fields || null;
  }
  SubmitError.prototype = Object.create(Error.prototype);

  async function submitApplication(payload) {
    var endpoint = (window.SITE_CONFIG || {}).submitEndpoint;
    if (!endpoint) {
      throw new SubmitError("not_configured", "Endpoint di invio non configurato.");
    }

    var res;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      });
    } catch (e) {
      throw new SubmitError("network", "Connessione non riuscita.");
    }

    var data = null;
    try { data = await res.json(); } catch (e) { /* risposta non JSON */ }

    if (res.ok && data && data.ok === true) {
      return { ok: true, id: data.id };
    }

    if (res.status === 422 && data && data.fields) {
      throw new SubmitError("validation", "Controlla i campi evidenziati.", data.fields);
    }
    if (res.status === 503) {
      throw new SubmitError("not_configured", "Il servizio di ricezione non è ancora attivo.");
    }
    if (res.status === 429 || res.status === 400) {
      throw new SubmitError("spam", (data && data.message) || "Richiesta non accettata. Riprova tra poco.");
    }
    throw new SubmitError("server", (data && data.message) || "Il server non ha confermato la ricezione.");
  }

  window.submitApplication = submitApplication;
  window.SubmitError = SubmitError;
})();
