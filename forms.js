/* Volunteer and partner forms: saved straight into the CYA database.
   Spam protection: a hidden "website" field people never see (bots fill it in),
   a minimum time on the page, and length limits (also enforced by the database). */
(function () {
  var DB = window.CYA_DB, loaded = Date.now();
  document.querySelectorAll('form[data-table]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.fmsg') || form.appendChild(Object.assign(document.createElement('p'), { className: 'fmsg' }));
      var btn = form.querySelector('button[type=submit]'), label = btn.textContent;
      msg.className = 'fmsg'; msg.textContent = '';
      if (!form.reportValidity()) return;
      var thanks = form.dataset.thanks || 'Thank you. CYA will be in touch soon.';
      // Bot checks: pretend all is well, save nothing.
      if (form.website && form.website.value) { form.reset(); msg.className = 'fmsg ok'; msg.textContent = thanks; return; }
      if (Date.now() - loaded < 3000) { msg.className = 'fmsg err'; msg.textContent = 'Please take a moment to check your details, then send again.'; return; }
      var row = {};
      form.querySelectorAll('[data-col]').forEach(function (el) {
        var v = el.type === 'checkbox' ? el.checked : el.value.trim();
        if (v === '') v = null;
        row[el.dataset.col] = v;
      });
      btn.disabled = true; btn.textContent = 'Sending...';
      fetch(DB.URL + '/rest/v1/' + form.dataset.table, {
        method: 'POST', headers: DB.headers({ Prefer: 'return=minimal' }), body: JSON.stringify(row)
      }).then(function (r) {
        if (!r.ok) throw 0;
        form.reset(); msg.className = 'fmsg ok'; msg.textContent = thanks;
      }).catch(function () {
        msg.className = 'fmsg err';
        msg.innerHTML = 'Sorry, that did not go through. Please try again, or email <a href="mailto:infocya260@gmail.com">infocya260@gmail.com</a> or call <a href="tel:+260965175304">+260965175304</a>.';
      }).finally(function () { btn.disabled = false; btn.textContent = label; });
    });
  });
})();
