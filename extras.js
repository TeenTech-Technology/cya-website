/* Newsletter sign-up and privacy-friendly visit counting.
   Visits: only the page path and the referring website's name are stored. No IP address,
   no cookies; each page is counted once per browser tab session. */
(function () {
  var DB = window.CYA_DB; if (!DB) return;
  function rpc(name, body) {
    return fetch(DB.URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: DB.headers(), body: JSON.stringify(body) });
  }
  try {
    var path = location.pathname.replace(/^\/cya-website/, '') || '/';
    if (path === '/' ) path = '/index.html';
    var key = 'cya_v:' + path;
    if (!sessionStorage.getItem(key) && !/^(localhost|127\.)/.test(location.hostname)) {
      sessionStorage.setItem(key, '1');
      var ref = '';
      try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
      if (ref === location.hostname) ref = '';
      rpc('track_view', { p_path: path, p_ref: ref || null }).catch(function () {});
    }
  } catch (e) {}

  var loaded = Date.now();
  document.querySelectorAll('form[data-subscribe]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = f.querySelector('.fmsg'), btn = f.querySelector('button');
      msg.className = 'fmsg'; msg.textContent = '';
      if (!f.reportValidity()) return;
      var done = function () { f.reset(); msg.className = 'fmsg ok'; msg.textContent = 'Thank you. You are on the CYA news list.'; };
      if (f.website.value) return done();
      if (Date.now() - loaded < 2000) { msg.className = 'fmsg err'; msg.textContent = 'Please try again in a moment.'; return; }
      btn.disabled = true;
      rpc('subscribe', { p_email: f.email.value.trim(), p_name: (f.name && f.name.value.trim()) || null })
        .then(function (r) { if (!r.ok) throw 0; done(); })
        .catch(function () { msg.className = 'fmsg err'; msg.textContent = 'Sorry, that did not go through. Please check your email address and try again.'; })
        .finally(function () { btn.disabled = false; });
    });
  });
})();
