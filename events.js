/* Loads CYA events live from the database (managed in the CYA dashboard) and lets visitors
   reserve seats. If the database cannot be reached, the events written in the page stay visible. */
(function () {
  var DB = window.CYA_DB;
  var up = document.getElementById('ev-up'), past = document.getElementById('ev-past');
  if (!up && !past) return;
  var limit = up && up.getAttribute('data-limit') ? +up.getAttribute('data-limit') : 0;
  var byId = {}, seats = {}, gal = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function when(e) {
    if (!e.event_date) return e.date_tbc || e.status === 'upcoming' ? 'Date to be confirmed' : '';
    return new Date(e.event_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  var today = new Date().toISOString().slice(0, 10);
  function isPast(e) { return e.event_date ? e.event_date < today : e.status === 'past'; }
  function left(e) { var s = seats[e.id]; return e.capacity ? Math.max(e.capacity - (s || 0), 0) : null; }
  var TICKET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6Z"/><path d="M13 5v2M13 11v2M13 17v2"/></svg>';

  function upCard(e) {
    var reg = safeUrl(e.register_url), img = safeUrl(e.poster_url), w = when(e), l = left(e);
    return '<div class="u">' +
      (img ? '<img class="up-img" src="' + esc(img) + '" alt="' + esc(e.title) + ' poster" loading="lazy">' : '') +
      (w ? '<span class="d">' + esc(w) + '</span>' : '') +
      '<h3>' + esc(e.title) + '</h3>' +
      (e.venue ? '<p class="v">' + esc(e.venue) + '</p>' : '') +
      (e.description ? '<p>' + esc(e.description) + '</p>' : '') +
      (l !== null ? '<p class="seats">' + (l ? l + ' of ' + e.capacity + ' seats left' : 'Fully booked') + '</p>' : '') +
      (l === 0 ? '' : '<button class="btn bc rs" type="button" data-reserve="' + esc(e.id) + '">' + TICKET + 'Reserve a seat</button>') +
      (reg ? '<a class="btn bo" href="' + esc(reg) + '">Register your interest</a>' : '') + '</div>';
  }
  function pastCard(e) {
    var img = safeUrl(e.poster_url), w = when(e);
    return '<div class="w two pe"><div>' +
      (w ? '<span class="k">' + esc(w) + '</span>' : '') +
      '<h2>' + esc(e.title) + '</h2>' +
      (e.venue ? '<p><strong>' + esc(e.venue) + '</strong></p>' : '') +
      (e.description ? '<p class="lead">' + esc(e.description) + '</p>' : '') +
      ((gal[e.id] || []).length ? '<div class="gl">' + gal[e.id].slice(0, 4).map(function (g) {
        return '<a href="gallery.html?event=' + esc(e.id) + '"><img src="' + esc(g.image_url) + '" alt="' + esc(g.caption || e.title + ' photo') + '" loading="lazy"></a>'; }).join('') +
        '<a class="more" href="gallery.html?event=' + esc(e.id) + '">See all photos</a></div>' : '') +
      '<p style="margin-top:14px"><a href="feedback.html?event=' + esc(e.id) + '">Were you there? Share your feedback</a></p></div>' +
      (img ? '<img src="' + esc(img) + '" alt="' + esc(e.title) + ' poster" loading="lazy">' : '<div></div>') + '</div>';
  }

  var rows = [];
  function render() {
    var u = rows.filter(function (e) { return !isPast(e); }).sort(function (a, b) {
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
  }
  function loadSeats() {
    return fetch(DB.URL + '/rest/v1/rpc/event_seats', { method: 'POST', headers: DB.headers(), body: '{}' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { seats = {}; list.forEach(function (s) { seats[s.event_id] = s.seats_taken; }); })
      .catch(function () {});
  }
  function loadGallery() {
    if (!past) return Promise.resolve();
    return fetch(DB.URL + '/rest/v1/gallery?select=event_id,image_url,caption&event_id=not.is.null&order=sort_order.asc,created_at.desc', { headers: DB.headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { list.forEach(function (g) { if (/^https:\/\//.test(g.image_url)) (gal[g.event_id] = gal[g.event_id] || []).push(g); }); })
      .catch(function () {});
  }
  fetch(DB.URL + '/rest/v1/events?select=*&order=sort_order.asc,event_date.asc', { headers: DB.headers() })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (list) { rows = list; list.forEach(function (e) { byId[e.id] = e; }); return Promise.all([loadSeats(), loadGallery()]); })
    .then(render)
    .catch(function () { /* keep the built-in events shown in the page */ });

  /* ---------- Reserve a seat ---------- */
  var dlg = document.createElement('dialog'); dlg.className = 'rsv'; document.body.appendChild(dlg);
  var X = '<button class="x" type="button" aria-label="Close" data-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  var opened = 0, current = null, ticket = null;
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    if (e.target.closest('[data-png]')) downloadPng();
    if (e.target.closest('[data-print]')) { document.body.classList.add('printing'); window.print(); document.body.classList.remove('printing'); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-reserve]'); if (!b) return;
    current = byId[b.getAttribute('data-reserve')]; if (current) openForm();
  });

  function openForm() {
    var e = current, l = left(e), max = Math.min(5, l === null ? 5 : l), opts = '';
    for (var i = 1; i <= max; i++) opts += '<option>' + i + '</option>';
    dlg.innerHTML = '<div class="in">' + X + '<h3>Reserve a seat</h3><p class="sub">' + esc(e.title) + ' &middot; ' + esc(when(e)) + (e.venue ? ' &middot; ' + esc(e.venue) : '') + '</p>' +
      '<form novalidate>' +
      '<label for="rn">Full name</label><input id="rn" name="name" required maxlength="120" autocomplete="name">' +
      '<label for="rp">Phone</label><input id="rp" name="phone" type="tel" required minlength="5" maxlength="40" placeholder="+260 ..." autocomplete="tel">' +
      '<label for="re">Email <em>(optional)</em></label><input id="re" name="email" type="email" maxlength="200" autocomplete="email">' +
      '<label for="rs">Number of seats</label><select id="rs" name="seats">' + opts + '</select>' +
      (l !== null ? '<p class="sub" style="margin-top:6px">' + l + ' seats left</p>' : '') +
      '<div class="hp" aria-hidden="true"><label for="rw">Leave this empty</label><input id="rw" name="website" tabindex="-1" autocomplete="off"></div>' +
      '<button class="btn bc" type="submit" style="width:100%;margin-top:16px">Reserve my seat</button><p class="fmsg"></p></form>' +
      '<p class="note">Your ticket appears on screen straight away. Please save it or take a screenshot, and show it at the entrance.</p></div>';
    opened = Date.now(); dlg.showModal();
    dlg.querySelector('form').addEventListener('submit', submit);
  }
  function submit(ev) {
    ev.preventDefault(); var f = ev.target, msg = f.querySelector('.fmsg'), btn = f.querySelector('button[type=submit]');
    msg.className = 'fmsg'; msg.textContent = '';
    if (!f.reportValidity()) return;
    if (f.website.value) { dlg.close(); return; }
    if (Date.now() - opened < 2500) { msg.className = 'fmsg err'; msg.textContent = 'Please take a moment to check your details, then try again.'; return; }
    btn.disabled = true; btn.textContent = 'Reserving...';
    var body = { p_event_id: current.id, p_name: f.name.value.trim(), p_phone: f.phone.value.trim(), p_email: f.email.value.trim() || null, p_seats: +f.seats.value };
    fetch(DB.URL + '/rest/v1/rpc/reserve_seat', { method: 'POST', headers: DB.headers(), body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
      .then(function (res) {
        ticket = { code: res.code, seats: res.seats, name: body.p_name, title: current.title, date: when(current), venue: current.venue || 'To be confirmed' };
        showTicket(); loadSeats().then(render);
      })
      .catch(function (err) {
        msg.className = 'fmsg err';
        msg.textContent = (err && err.code === 'P0001' && err.message) ? err.message : 'Sorry, we could not reserve your seat just now. Please try again, or call +260965175304.';
        btn.disabled = false; btn.textContent = 'Reserve my seat';
      });
  }
  function qrSvg(text) { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q; }
  function showTicket() {
    var t = ticket, q = qrSvg(t.code);
    dlg.innerHTML = '<div class="in">' + X + '<h3>You are booked in</h3><p class="sub">Thank you, ' + esc(t.name) + '. We look forward to seeing you.</p>' +
      '<div class="ticket" id="ticket"><strong>Chingola Youth Association</strong>' +
      '<div class="qrc">' + q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) + '</div>' +
      '<div class="code">' + esc(t.code) + '</div>' +
      '<dl><dt>Event</dt><dd>' + esc(t.title) + '</dd><dt>Date</dt><dd>' + esc(t.date) + '</dd><dt>Venue</dt><dd>' + esc(t.venue) + '</dd>' +
      '<dt>Name</dt><dd>' + esc(t.name) + '</dd><dt>Seats</dt><dd>' + t.seats + '</dd></dl></div>' +
      '<div class="acts"><button class="btn bc" type="button" data-png>Download ticket</button><button class="btn bo3" type="button" data-print>Print or save as PDF</button></div>' +
      '<p class="note">Please keep this code. CYA does not send tickets by email or WhatsApp.</p></div>';
  }
  function downloadPng() {
    var t = ticket, q = qrSvg(t.code), n = q.getModuleCount(), W = 640, cell = Math.floor(300 / (n + 4)), qs = cell * (n + 4);
    var c = document.createElement('canvas'), x = c.getContext('2d'), lines = [['Event', t.title], ['Date', t.date], ['Venue', t.venue], ['Name', t.name], ['Seats', String(t.seats)]];
    c.width = W; c.height = 300 + qs + lines.length * 64;
    x.fillStyle = '#fffaf4'; x.fillRect(0, 0, W, c.height);
    x.fillStyle = '#0b3c8c'; x.fillRect(0, 0, W, 90);
    x.fillStyle = '#fff'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.fillText('Chingola Youth Association', W / 2, 56);
    var ox = (W - qs) / 2, oy = 120; x.fillStyle = '#fff'; x.fillRect(ox, oy, qs, qs); x.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(ox + (k + 2) * cell, oy + (r + 2) * cell, cell, cell);
    x.fillStyle = '#072a63'; x.font = 'bold 44px monospace'; x.fillText(t.code, W / 2, oy + qs + 60);
    x.textAlign = 'left'; var y = oy + qs + 120;
    lines.forEach(function (l) {
      x.fillStyle = '#5b6577'; x.font = '20px Arial'; x.fillText(l[0], 40, y);
      x.fillStyle = '#1b2333'; x.font = 'bold 24px Arial'; var s = l[1]; while (x.measureText(s).width > W - 200 && s.length > 4) s = s.slice(0, -2);
      x.fillText(s === l[1] ? s : s + '...', 160, y); y += 64;
    });
    var a = document.createElement('a'); a.download = 'CYA-ticket-' + t.code + '.png'; a.href = c.toDataURL('image/png'); a.click();
  }
})();
