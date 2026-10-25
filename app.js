/* ==========================================================================
   Comportamento della pagina: scelta piano, validazione, invio, footer, reveal.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var openedAt = Date.now();

  var form = $("#join-form");
  var statusBox = $("#form-status");
  var submitBtn = $("#submit-btn");

  /* ---------- Piano: card -> form ---------- */
  function setPlan(plan) {
    var radio = $('input[name="plan"][value="' + plan + '"]', form);
    if (radio) radio.checked = true;
    $$(".plan").forEach(function (c) { c.classList.toggle("selected", c.dataset.plan === plan); });
  }

  $$("[data-choose]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setPlan(btn.dataset.choose);
      $("#adesione").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { $("#company").focus({ preventScroll: true }); }, 600);
    });
  });
  $$('input[name="plan"]').forEach(function (r) {
    r.addEventListener("change", function () { setPlan(r.value); });
  });
  setPlan("BASE");

  /* ---------- Validazione ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate(v) {
    var e = {};
    if (!v.company.trim()) e.company = "Inserisci il nome dell'azienda.";
    if (!v.contact.trim() || v.contact.trim().split(/\s+/).length < 2) e.contact = "Inserisci nome e cognome del referente.";
    if (!EMAIL.test(v.email.trim())) e.email = "Inserisci un indirizzo email valido.";
    if (v.phone && !/^[+()\d\s./-]{6,30}$/.test(v.phone.trim())) e.phone = "Numero di telefono non valido.";
    if (!v.category) e.category = "Seleziona una categoria.";
    if (!v.city.trim()) e.city = "Indica il comune o la località.";
    if (v.website) {
      try {
        var u = new URL(v.website.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") throw 0;
      } catch (x) { e.website = "Inserisci un indirizzo valido (es. https://www.tuaazienda.it)."; }
    }
    if (!v.privacy) e.privacy = "Per procedere è necessario prendere visione dell'informativa privacy.";
    return e;
  }

  function showErrors(errors) {
    $$(".err", form).forEach(function (p) { p.textContent = ""; });
    $$(".field", form).forEach(function (f) { f.classList.remove("invalid"); });
    var first = null;
    Object.keys(errors).forEach(function (name) {
      var p = $('[data-err="' + name + '"]', form);
      if (p) p.textContent = errors[name];
      var input = form.elements[name];
      if (input && input.closest) {
        var f = input.closest(".field");
        if (f) f.classList.add("invalid");
        if (!first) first = input;
      }
    });
    if (first && first.focus) first.focus();
  }

  function setStatus(kind, title, text) {
    statusBox.hidden = false;
    statusBox.className = "status " + kind;
    statusBox.innerHTML = "";
    var s = document.createElement("strong");
    s.textContent = title;
    var p = document.createElement("span");
    p.textContent = text;
    statusBox.appendChild(s);
    statusBox.appendChild(p);
    if (kind === "error" && cfg.contactEmail) {
      statusBox.appendChild(document.createElement("br"));
      var a = document.createElement("a");
      a.href = "mailto:" + cfg.contactEmail;
      a.textContent = "Scrivici a " + cfg.contactEmail;
      statusBox.appendChild(a);
    }
    statusBox.scrollIntoView({ behavior: "smooth", block: "center" });
    statusBox.focus({ preventScroll: true });
  }

  function values() {
    var f = form.elements;
    return {
      company: f.company.value, contact: f.contact.value, email: f.email.value,
      phone: f.phone.value, category: f.category.value, city: f.city.value,
      website: f.website.value, about: f.about.value,
      plan: (form.querySelector('input[name="plan"]:checked') || {}).value || "BASE",
      privacy: f.privacy.checked, marketing: f.marketing.checked,
      hp_field: f.hp_field.value
    };
  }

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    statusBox.hidden = true;

    var v = values();
    var errors = validate(v);
    showErrors(errors);
    if (Object.keys(errors).length) return;

    // Metadati antispam (il server li ricontrolla)
    v.elapsedMs = Date.now() - openedAt;
    v.consentAt = new Date().toISOString();

    submitBtn.disabled = true;
    var label = submitBtn.textContent;
    submitBtn.textContent = "Invio in corso…";

    try {
      await window.submitApplication(v);       // successo SOLO se il server conferma
      form.reset();
      setPlan("BASE");
      setStatus("ok", "Richiesta ricevuta.",
        "Grazie! Abbiamo registrato la tua richiesta di adesione e ti ricontatteremo all'indirizzo indicato. L'adesione è subordinata ad approvazione.");
    } catch (err) {
      if (err && err.code === "validation" && err.fields) {
        showErrors(err.fields);
        setStatus("error", "Controlla i dati inseriti.", err.message);
      } else if (err && err.code === "not_configured") {
        setStatus("error", "Invio non disponibile al momento.",
          "Il servizio di ricezione delle richieste non è ancora attivo, quindi la tua richiesta NON è stata inviata.");
      } else {
        setStatus("error", "Richiesta non inviata.",
          ((err && err.message) || "Errore imprevisto.") + " I tuoi dati non sono stati ricevuti: riprova tra qualche istante.");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  /* ---------- Footer / link configurabili ---------- */
  (function applyConfig() {
    if (cfg.privacyUrl) {
      ["#privacy-link", "#privacy-link-foot"].forEach(function (s) { $(s).href = cfg.privacyUrl; });
    }
    if (cfg.webAppUrl) $("#webapp-link").href = cfg.webAppUrl;

    var c = $("#foot-contacts");
    var parts = [];
    if (cfg.contactEmail) parts.push('<a href="mailto:' + encodeURI(cfg.contactEmail) + '"></a>');
    if (cfg.contactPhone) parts.push('<a href="tel:' + encodeURI(cfg.contactPhone.replace(/\s+/g, "")) + '"></a>');
    if (parts.length) {
      c.innerHTML = parts.join("<br>");
      var links = $$("a", c);
      var i = 0;
      if (cfg.contactEmail) links[i++].textContent = cfg.contactEmail;
      if (cfg.contactPhone) links[i++].textContent = cfg.contactPhone;
    }

    var L = cfg.legal || {};
    var lines = [L.ownerName, L.vatNumber && ("P. IVA " + L.vatNumber), L.address, L.extra].filter(Boolean);
    if (lines.length) {
      var el = $("#foot-legal");
      el.textContent = "";
      lines.forEach(function (t, idx) {
        if (idx) el.appendChild(document.createElement("br"));
        el.appendChild(document.createTextNode(t));
      });
    }
  })();

  /* ---------- Reveal allo scroll ---------- */
  var items = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }
})();
