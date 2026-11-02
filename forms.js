/* Volunteer and partner forms: saved straight into the CYA database.
   Spam protection: a hidden "website" field people never see (bots fill it in),
   a minimum time on the page, and length limits (also enforced by the database). */
(function () {
  var DB = window.CYA_DB, loaded = Date.now();

  /* Under 18 on the volunteer form: same parent tick and phone as seat booking. */
  var age = document.getElementById('vg'), guard = document.getElementById('vg-guard');
  function syncVolunteerGuard() {
    if (!age || !guard) return;
    var on = age.value === 'Under 18';
    var box = document.getElementById('vg-ok'), phone = document.getElementById('vg-phone');
    guard.hidden = !on;
    box.required = on; phone.required = on;
    box.disabled = !on; phone.disabled = !on;
    if (!on) { box.checked = false; phone.value = ''; }
  }
  if (age) age.addEventListener('change', syncVolunteerGuard);
  syncVolunteerGuard();
  document.querySelectorAll('form[data-table]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.fmsg') || form.appendChild(Object.assign(document.createElement('p'), { className: 'fmsg' }));
      var btn = form.querySelector('button[type=submit]'), label = btn.innerHTML;
      msg.className = 'fmsg'; msg.textContent = '';
      if (!form.reportValidity()) return;
      var thanks = form.dataset.thanks || 'Thank you. CYA will be in touch soon.';
      // Bot checks: pretend all is well, save nothing.
      if (form.website && form.website.value) { form.reset(); if (form.id === 'vol-form') syncVolunteerGuard(); msg.className = 'fmsg ok'; msg.textContent = thanks; return; }
      if (Date.now() - loaded < 3000) { msg.className = 'fmsg err'; msg.textContent = 'Please take a moment to check your details, then send again.'; return; }
      var row = {};
      form.querySelectorAll('[data-col]').forEach(function (el) {
        if (el.disabled) return;   /* hidden parent-permission fields stay out of the save */
        var v = el.type === 'checkbox' ? el.checked : el.value.trim();
        if (v === '') v = null;
        row[el.dataset.col] = v;
      });
      btn.disabled = true; var sp = btn.querySelector('span'); if (sp) sp.textContent = 'Sending...'; else btn.textContent = 'Sending...';
      function post(payload) {
        return fetch(DB.URL + '/rest/v1/' + form.dataset.table, {
          method: 'POST', headers: DB.headers({ Prefer: 'return=minimal' }), body: JSON.stringify(payload)
        }).then(function (r) {
          if (r.ok) return;
          return r.json().then(function (j) { throw j || {}; }, function () { throw {}; });
        });
      }
      /* Parent columns are added by sql/003_parent_permission.sql. If that SQL has not been
         run yet, save the rest of the form so volunteering is not blocked. */
      post(row).catch(function (err) {
        var text = ((err && err.message) || '') + ' ' + ((err && err.details) || '');
        var parentCols = ('parent_permission' in row) || ('parent_phone' in row);
        if (parentCols && (err && err.code === 'PGRST204' || /parent_permission|parent_phone/.test(text))) {
          delete row.parent_permission; delete row.parent_phone;
          return post(row);
        }
        throw err;
      }).then(function () {
        form.reset(); msg.className = 'fmsg ok'; msg.textContent = thanks;
        if (form.id === 'vol-form') syncVolunteerGuard();
      }).catch(function () {
        msg.className = 'fmsg err';
        msg.innerHTML = 'Sorry, that did not go through. Please try again, or email <a href="mailto:infocya260@gmail.com">infocya260@gmail.com</a> or call <a href="tel:+260965175304">+260965175304</a>.';
      }).finally(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  });
})();
