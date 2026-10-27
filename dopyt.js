/* Heartware – prispôsobivý formulár (stratégia 6A). Prototyp: odoslanie presmeruje na dakujeme.html, osobné údaje sa do URL neposielajú. */
(function () {
  var form = document.getElementById('dopyt');
  if (!form) return;
  var q = new URLSearchParams(location.search);
  var steps = [].slice.call(form.querySelectorAll('.form-step'));
  var bars = [].slice.call(form.querySelectorAll('.progress span'));
  var nazvy = ['Situácia', 'Podrobnosti', 'Kontakt'];
  var krok = 1;

  var TYPY = [
    ['', 'Vyberte'], ['skola', 'Škola alebo škôlka'], ['firma', 'Firma'],
    ['hotel', 'Hotel, HoReCa alebo konferenčný priestor'], ['kultura', 'Múzeum, galéria alebo divadlo'],
    ['zdravotnictvo', 'Zdravotníctvo alebo grafické štúdio'], ['verejna-sprava', 'Verejná správa alebo samospráva'],
    ['jednotlivec', 'Jednotlivec alebo domácnosť'], ['ine', 'Iné']
  ];
  var TERMINY = [
    ['', 'Vyberte'], ['co-najskor', 'Čím skôr'], ['do-konca-roka', 'Do konca roka'],
    ['buduci-rok', 'Budúci rok'], ['zistujem', 'Zatiaľ zisťujem']
  ];
  var SEGMENT_MAP = { 'skola': 'skola', 'materska-skola': 'skola', 'firma': 'firma', 'hotel': 'hotel', 'kultura': 'kultura', 'zdravotnictvo': 'zdravotnictvo' };

  function fill(sel, opts) { sel.innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join(''); }
  form.querySelectorAll('[data-typ]').forEach(function (s) { fill(s, TYPY); });
  form.querySelectorAll('[data-termin]').forEach(function (s) { fill(s, TERMINY); });

  function vstup() { return document.getElementById('vstup').value; }

  function setVstup(v) {
    document.getElementById('vstup').value = v;
    form.querySelectorAll('[data-choice="vstup"] .select-card').forEach(function (b) {
      var on = b.dataset.value === v; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.getElementById('err-vstup').hidden = true;
  }
  // Meranie (stratégia 9B): výber vstupu a odoslaná požiadavka. UI42: napojiť na Shopify customer events (analytics.publish).
  function track(name, detail) { try { window.dispatchEvent(new CustomEvent('hw:' + name, { detail: detail })); } catch (e) {} }
  form.querySelectorAll('[data-choice="vstup"] .select-card').forEach(function (b) {
    b.addEventListener('click', function () { setVstup(b.dataset.value); track('vstup', { vstup: b.dataset.value }); showStep(2); });
  });

  // Zobrazí len vetvu podľa voľby; neaktívne polia sú disabled a pri zmene vetvy sa neodošlú.
  function showRoute() {
    form.querySelectorAll('[data-route]').forEach(function (r) {
      var on = r.dataset.route === vstup(); r.hidden = !on;
      r.querySelectorAll('input,select,textarea').forEach(function (c) { c.disabled = !on; });
    });
    updateTyp();
  }

  // Jednotlivec: skryť organizáciu a otázku, kto nákup schvaľuje.
  function updateTyp() {
    var sel = form.querySelector('[data-route="' + vstup() + '"] [data-typ]');
    var jednotlivec = sel && sel.value === 'jednotlivec';
    var org = document.getElementById('organizacia-field');
    org.hidden = jednotlivec; org.querySelector('input').disabled = jednotlivec;
    var schv = document.getElementById('d-schvaluje-field');
    if (vstup() === 'dodavka') { schv.hidden = jednotlivec; schv.querySelector('select').disabled = jednotlivec; }
  }
  form.querySelectorAll('[data-typ]').forEach(function (s) { s.addEventListener('change', updateTyp); });

  function showStep(n) {
    krok = n;
    steps.forEach(function (s) { s.hidden = +s.dataset.step !== n; });
    bars.forEach(function (b, i) { b.classList.toggle('active', i < n); });
    document.getElementById('krok-cislo').textContent = n;
    document.getElementById('krok-nazov').textContent = nazvy[n - 1];
    if (n === 2) showRoute();
    var h = steps[n - 1].querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  // Chyba sa zobrazí textom priamo pod poľom, fokus na prvé chybné pole.
  function validate(step) {
    var first = null;
    step.querySelectorAll('input,select,textarea').forEach(function (c) {
      if (c.disabled || c.type === 'hidden' || c.closest('[hidden]')) return;
      var err = c.closest('.field') && c.closest('.field').querySelector('.field-error');
      var bad = !c.checkValidity();
      c.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (err) { err.hidden = !bad; if (c.id) { err.id = err.id || 'err-' + c.id; c.setAttribute('aria-describedby', err.id); } }
      if (bad && !first) first = c;
    });
    if (first) first.focus();
    return !first;
  }

  form.querySelectorAll('[data-next]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (krok === 1 && !vstup()) { document.getElementById('err-vstup').hidden = false; return; }
      if (krok === 2 && !validate(steps[1])) return;
      showStep(krok + 1);
    });
  });
  form.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { showStep(krok - 1); }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Enter v poli nesmie preskočiť kroky: na krokoch 1 a 2 sa správa ako „Ďalej“.
    if (krok === 1) { if (!vstup()) document.getElementById('err-vstup').hidden = false; return; }
    if (krok === 2) { if (validate(steps[1])) showStep(3); return; }
    if (!validate(steps[2])) return;
    // UI42: tu sa údaje odovzdajú zvolenému nástroju na evidenciu (stratégia 6B). Do URL ide len typ vstupu.
    track('poziadavka', { vstup: vstup(), zdroj: q.get('zdroj') || '' });
    location.href = 'dakujeme.html?vstup=' + encodeURIComponent(vstup());
  });

  // Prenos kontextu z predchádzajúcej stránky (stratégia 6A).
  ['zdroj', 'produkt', 'sku', 'segment', 'technologia', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
    var el = document.getElementById('h-' + k); if (el) el.value = q.get(k) || '';
  });
  try { if (document.referrer) { var u = new URL(document.referrer); document.getElementById('h-url').value = u.origin + u.pathname; } } catch (err) {}

  var seg = SEGMENT_MAP[q.get('segment')];
  if (seg) form.querySelectorAll('[data-typ]').forEach(function (s) { s.value = seg; });
  if (q.get('termin')) form.querySelectorAll('[data-termin]').forEach(function (s) { s.value = q.get('termin'); });
  if (q.get('produkt')) {
    document.getElementById('kontext-produkt').hidden = false;
    document.getElementById('kontext-produkt-nazov').textContent = q.get('produkt');
  }
  var v = q.get('vstup');
  if (v === 'poradenstvo' || v === 'servis' || v === 'dodavka') setVstup(v);
  else showRoute();
})();
