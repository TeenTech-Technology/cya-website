/* Post-event feedback form: lists events that have already happened, saves feedback to the database. */
(function () {
  var DB = window.CYA_DB, f = document.getElementById('ffb'), sel = f.event, loaded = Date.now();
  var today = new Date().toISOString().slice(0, 10);
  fetch(DB.URL + '/rest/v1/events?select=id,title,event_date,status&order=event_date.desc.nullslast', { headers: DB.headers() })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (list) {
      var past = list.filter(function (e) { return e.event_date ? e.event_date <= today : e.status === 'past'; });
      sel.innerHTML = past.length ? '<option value="">Choose an event</option>' : '<option value="">No past events yet</option>';
      past.forEach(function (e) { var o = document.createElement('option'); o.value = e.id; o.textContent = e.title; sel.appendChild(o); });
      var q = new URLSearchParams(location.search).get('event'); if (q) sel.value = q;
    })
    .catch(function () { sel.innerHTML = '<option value="">Events could not load. Please refresh.</option>'; });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = f.querySelector('.fmsg'), btn = f.querySelector('button[type=submit]');
    msg.className = 'fmsg'; msg.textContent = '';
    if (!f.reportValidity()) return;
    var ok = function () { f.reset(); msg.className = 'fmsg ok'; msg.textContent = 'Thank you for your feedback. It really helps.'; };
    if (f.website.value) return ok();
    if (Date.now() - loaded < 3000) { msg.className = 'fmsg err'; msg.textContent = 'Please take a moment, then send again.'; return; }
    btn.disabled = true;
    fetch(DB.URL + '/rest/v1/feedback', { method: 'POST', headers: DB.headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ event_id: sel.value, rating: +f.querySelector('[name=rating]:checked').value,
        comments: f.comments.value.trim() || null, name: f.name.value.trim() || null }) })
      .then(function (r) { if (!r.ok) throw 0; ok(); })
      .catch(function () { msg.className = 'fmsg err'; msg.textContent = 'Sorry, that did not go through. Please try again a little later.'; })
      .finally(function () { btn.disabled = false; });
  });
})();
