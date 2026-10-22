/* Loads CYA events live from the database (Supabase), managed in the CYA dashboard.
   If the database cannot be reached, the events already written in the page stay visible. */
(function () {
  var URL = 'https://brxiurlnnlildxygeqge.supabase.co';
  var KEY = 'sb_publishable_e5l2X_AagzgFrCcwMkQJOg_Z2BDHPkc'; // public key, safe in the browser
  var up = document.getElementById('ev-up'), past = document.getElementById('ev-past');
  if (!up && !past) return;
  var limit = up && up.getAttribute('data-limit') ? +up.getAttribute('data-limit') : 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function when(e) {
    if (!e.event_date) return e.date_tbc || e.status === 'upcoming' ? 'Date to be confirmed' : '';
    var d = new Date(e.event_date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  var today = new Date().toISOString().slice(0, 10);
  function isPast(e) { return e.event_date ? e.event_date < today : e.status === 'past'; }

  function upCard(e) {
    var reg = safeUrl(e.register_url), img = safeUrl(e.poster_url), w = when(e);
    return '<div class="u">' +
      (img ? '<img class="up-img" src="' + esc(img) + '" alt="' + esc(e.title) + ' poster" loading="lazy">' : '') +
      (w ? '<span class="d">' + esc(w) + '</span>' : '') +
      '<h3>' + esc(e.title) + '</h3>' +
      (e.venue ? '<p class="v">' + esc(e.venue) + '</p>' : '') +
      (e.description ? '<p>' + esc(e.description) + '</p>' : '') +
      (reg ? '<a class="btn bc" href="' + esc(reg) + '">Register your interest</a>' : '') + '</div>';
  }
  function pastCard(e) {
    var img = safeUrl(e.poster_url), w = when(e);
    return '<div class="w two pe"><div>' +
      (w ? '<span class="k">' + esc(w) + '</span>' : '') +
      '<h2>' + esc(e.title) + '</h2>' +
      (e.venue ? '<p><strong>' + esc(e.venue) + '</strong></p>' : '') +
      (e.description ? '<p class="lead">' + esc(e.description) + '</p>' : '') + '</div>' +
      (img ? '<img src="' + esc(img) + '" alt="' + esc(e.title) + ' poster" loading="lazy">' : '<div></div>') + '</div>';
  }

  fetch(URL + '/rest/v1/events?select=*&order=sort_order.asc,event_date.asc', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (rows) {
      var u = rows.filter(function (e) { return !isPast(e); }).sort(function (a, b) {
        // dated events soonest first, then those still to be confirmed
        if (a.event_date && b.event_date) return a.event_date < b.event_date ? -1 : 1;
        if (a.event_date || b.event_date) return a.event_date ? -1 : 1;
        return a.sort_order - b.sort_order; });
      var p = rows.filter(isPast).sort(function (a, b) {
        if (a.event_date && b.event_date) return a.event_date > b.event_date ? -1 : 1;
        return a.sort_order - b.sort_order; });
      if (limit) u = u.slice(0, limit);
      if (up) up.innerHTML = u.length ? u.map(upCard).join('') :
        '<div class="u"><h3>New events coming soon</h3><p>We are planning our next gatherings. Please check back soon, or register your interest and we will keep you posted.</p><a class="btn bc" href="register.html">Register your interest</a></div>';
      if (past) past.innerHTML = p.length ? p.map(pastCard).join('') :
        '<div class="w"><p class="lead">Photos and stories from our past events will appear here soon.</p></div>';
    })
    .catch(function () { /* keep the built-in events shown in the page */ });
})();
