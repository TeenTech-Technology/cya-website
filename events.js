/* Loads CYA events live from the database (managed in the CYA dashboard) and lets visitors
   reserve seats (reserving a seat is how people register). Used by events.html and register.html.
   Also handles the Share button and deep links (events.html#event-ID, register.html?event=ID).
   On events.html, if the database cannot be reached, the events written in the page stay visible. */
(function () {
  var DB = window.CYA_DB;
  var up = document.getElementById('ev-up'), past = document.getElementById('ev-past');
  if (!up && !past) return;
  var limit = up && up.getAttribute('data-limit') ? +up.getAttribute('data-limit') : 0;
  var isReg = !!(up && up.hasAttribute('data-register'));   /* register.html: only upcoming events, plus a "coming soon" message */
  var soon = document.getElementById('ev-soon');
  var firstDraw = true;
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
  var TICKET = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6Z"/><path d="M13 5v2M13 11v2M13 17v2"/></svg>';

  function ic(d) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + d + '</svg>'; }
  var ICO = {
    share: ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    copy: ic('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    check: ic('<path d="M20 6 9 17l-5-5"/>'),
    wa: ic('<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z"/>'),
    fb: ic('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>'),
    mail: ic('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
    users: ic('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    down: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
    print: ic('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    img: ic('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
    star: ic('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2l-5-4.9 6.9-1Z"/>')
  };

  function upCard(e) {
    var img = safeUrl(e.poster_url), w = when(e), l = left(e);
    return '<div class="u' + (img ? ' pic' : '') + '" id="event-' + esc(e.id) + '">' +
      (img ? '<img class="up-img" src="' + esc(img) + '" alt="' + esc(e.title) + ' poster" loading="lazy">' : '') +
      '<div class="ut">' +
      (w ? '<span class="d">' + esc(w) + '</span>' : '') +
      '<h3>' + esc(e.title) + '</h3>' +
      (e.venue ? '<p class="v">' + esc(e.venue) + '</p>' : '') +
      (e.description ? '<p>' + esc(e.description) + '</p>' : '') +
      (l !== null ? '<p class="seats">' + (l ? l + ' of ' + e.capacity + ' seats left' : 'Fully booked') + '</p>' : '') +
      '<div class="ub">' +
      (l === 0 ? '' : '<button class="btn bc rs" type="button" data-reserve="' + esc(e.id) + '">' + TICKET + '<span>Reserve a seat</span></button>') +
      '<button class="btn bo rs" type="button" data-share="' + esc(e.id) + '" aria-label="Share ' + esc(e.title) + ' with friends">' + ICO.share + '<span>Share</span></button>' +
      '</div></div></div>';
  }
  function pastCard(e) {
    var img = safeUrl(e.poster_url), w = when(e);
    return '<div class="w two pe" id="event-' + esc(e.id) + '"><div>' +
      (w ? '<span class="k">' + esc(w) + '</span>' : '') +
      '<h2>' + esc(e.title) + '</h2>' +
      (e.venue ? '<p><strong>' + esc(e.venue) + '</strong></p>' : '') +
      (e.description ? '<p class="lead">' + esc(e.description) + '</p>' : '') +
      ((gal[e.id] || []).length ? '<div class="gl">' + gal[e.id].slice(0, 4).map(function (g) {
        return '<a href="gallery.html?event=' + esc(e.id) + '"><img src="' + esc(g.image_url) + '" alt="' + esc(g.caption || e.title + ' photo') + '" loading="lazy"></a>'; }).join('') +
        '<a class="more tl" href="gallery.html?event=' + esc(e.id) + '">' + ICO.img + '<span>See all photos</span></a></div>' : '') +
      '<p style="margin-top:14px"><a class="tl" href="feedback.html?event=' + esc(e.id) + '">' + ICO.star + '<span>Were you there? Share your feedback</span></a></p>' +
      '<p style="margin-top:10px"><button class="tl tlb" type="button" data-share="' + esc(e.id) + '" aria-label="Share ' + esc(e.title) + ' with friends">' + ICO.share + '<span>Share this event</span></button></p></div>' +
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
    var want = wantedId();
    if (isReg && want) u.sort(function (a, b) { return (b.id === want) - (a.id === want); });   /* a shared event comes first */
    if (limit) u = u.slice(0, limit);
    if (up) {
      if (isReg) {
        up.innerHTML = u.map(upCard).join('');
        up.hidden = !u.length;
        if (soon) soon.hidden = !!u.length;
      } else {
        up.innerHTML = u.length ? u.map(upCard).join('') :
          '<div class="u"><h3>New events coming soon</h3><p>We are planning our next gatherings. Please check back soon, or leave your email on the Register page and we will let you know.</p><div class="ub"><a class="btn bc rs" href="register.html">' + ICO.mail + '<span>Hear about the next event</span></a></div></div>';
      }
    }
    if (past) past.innerHTML = p.length ? p.map(pastCard).join('') :
      '<div class="w"><p class="lead">Photos and stories from our past events will appear here soon.</p></div>';
    if (firstDraw) { firstDraw = false; highlight(want); }
  }

  /* ---------- Deep links: events.html#event-ID and register.html?event=ID ---------- */
  function wantedId() {
    var m = /^#event-(.+)$/.exec(location.hash || '');
    if (m) { try { return decodeURIComponent(m[1]); } catch (x) { return m[1]; } }
    try { return new URLSearchParams(location.search).get('event') || ''; } catch (x) { return ''; }
  }
  window.addEventListener('hashchange', function () { highlight(wantedId()); });
  function highlight(id) {
    var el = id && document.getElementById('event-' + id); if (!el) return;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.classList.add('hl');
    el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    setTimeout(function () { el.classList.remove('hl'); }, 4500);
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
    .catch(function () { if (isReg) render(); /* events.html keeps the built-in events shown in the page */ });

  /* ---------- Reserve a seat ---------- */
  var dlg = document.createElement('dialog'); dlg.className = 'rsv'; document.body.appendChild(dlg);
  var X = '<button class="x" type="button" aria-label="Close" data-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  var opened = 0, current = null, ticket = null;
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    if (e.target.closest('[data-png]')) downloadPng();
    if (e.target.closest('[data-invite]') && current) share(current, e.target.closest('[data-invite]'));
    if (e.target.closest('[data-print]')) { document.body.classList.add('printing'); window.print(); document.body.classList.remove('printing'); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-reserve]'); if (!b) return;
    current = byId[b.getAttribute('data-reserve')]; if (current) openForm();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-share]'); if (!b) return;
    var ev = byId[b.getAttribute('data-share')]; if (ev) share(ev, b);
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
      '<button class="btn bc rs" type="submit" style="width:100%;margin-top:16px">' + TICKET + '<span>Reserve my seat</span></button><p class="fmsg"></p></form>' +
      '<p class="note">Reserving a seat registers you for this event. Your ticket appears on screen straight away. Please save it or take a screenshot, and show it at the entrance.</p></div>';
    opened = Date.now(); dlg.showModal();
    dlg.querySelector('form').addEventListener('submit', submit);
  }
  function submit(ev) {
    ev.preventDefault(); var f = ev.target, msg = f.querySelector('.fmsg'), btn = f.querySelector('button[type=submit]');
    msg.className = 'fmsg'; msg.textContent = '';
    if (!f.reportValidity()) return;
    if (f.website.value) { dlg.close(); return; }
    if (Date.now() - opened < 2500) { msg.className = 'fmsg err'; msg.textContent = 'Please take a moment to check your details, then try again.'; return; }
    btn.disabled = true; btn.querySelector('span').textContent = 'Reserving...';
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
        btn.disabled = false; btn.querySelector('span').textContent = 'Reserve my seat';
      });
  }
  function qrSvg(text) { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q; }
  function showTicket() {
    var t = ticket, q = qrSvg(t.code);
    dlg.innerHTML = '<div class="in">' + X + '<h3>You are registered</h3><p class="sub">Thank you, ' + esc(t.name) + '. We look forward to seeing you.</p>' +
      '<div class="ticket" id="ticket"><strong>Chingola Youth Association</strong>' +
      '<div class="qrc">' + q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) + '</div>' +
      '<div class="code">' + esc(t.code) + '</div>' +
      '<dl><dt>Event</dt><dd>' + esc(t.title) + '</dd><dt>Date</dt><dd>' + esc(t.date) + '</dd><dt>Venue</dt><dd>' + esc(t.venue) + '</dd>' +
      '<dt>Name</dt><dd>' + esc(t.name) + '</dd><dt>Seats</dt><dd>' + t.seats + '</dd></dl></div>' +
      '<div class="acts"><button class="btn bc" type="button" data-png>' + ICO.down + '<span>Download ticket</span></button><button class="btn bo3" type="button" data-print>' + ICO.print + '<span>Print or save as PDF</span></button>' +
      '<button class="btn bo3" type="button" data-invite>' + ICO.users + '<span>Invite a friend</span></button></div>' +
      '<p class="note">Please keep this code. CYA does not send tickets by email or WhatsApp.</p></div>';
  }
  /* ---------- Share an event ---------- */
  function shareUrl(e) {
    return new URL(isPast(e) ? 'events.html#event-' + encodeURIComponent(e.id) : 'register.html?event=' + encodeURIComponent(e.id), location.href).href;
  }
  function shareText(e) {
    var known = e.event_date, bits = [];
    if (isPast(e)) return 'Have a look at ' + e.title + ', an event by Chingola Youth Association.';
    if (known) bits.push(when(e));
    if (e.venue) bits.push(e.venue);
    return 'I would love to see you at ' + e.title + (bits.length ? ' (' + bits.join(', ') + ')' : '') + '. Reserve a seat with Chingola Youth Association:';
  }
  var sdlg = document.createElement('dialog'); sdlg.className = 'rsv shr'; sdlg.setAttribute('aria-labelledby', 'shr-h'); document.body.appendChild(sdlg);
  sdlg.addEventListener('click', function (e) {
    if (e.target === sdlg || e.target.closest('[data-close]')) sdlg.close();
    var c = e.target.closest('[data-copy]'); if (c) copyLink(c);
  });
  function share(e, opener) {
    var data = { title: e.title, text: shareText(e), url: shareUrl(e) };
    var phone = navigator.share && window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (!phone) return openShare(e, data);
    navigator.share(data).catch(function (err) { if (!err || err.name !== 'AbortError') openShare(e, data); });
  }
  function openShare(e, d) {
    var q = encodeURIComponent, full = d.text + ' ' + d.url;
    sdlg.innerHTML = '<div class="in">' + X.replace('aria-label="Close"', 'aria-label="Close sharing"') + '<h3 id="shr-h">Share with friends</h3><p class="sub">' + esc(e.title) + '</p>' +
      '<div class="cp"><label class="sr" for="shr-u">Link to this event</label><input id="shr-u" type="text" readonly value="' + esc(d.url) + '">' +
      '<button class="btn bc rs" type="button" data-copy autofocus>' + ICO.copy + '<span>Copy link</span></button></div>' +
      '<p class="fmsg ok" role="status" aria-live="polite"></p>' +
      '<div class="sh">' +
      '<a class="btn bo3 rs" target="_blank" rel="noopener" href="https://wa.me/?text=' + q(full) + '">' + ICO.wa + '<span>WhatsApp</span></a>' +
      '<a class="btn bo3 rs" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + q(d.url) + '">' + ICO.fb + '<span>Facebook</span></a>' +
      '<a class="btn bo3 rs" href="mailto:?subject=' + q(e.title + ' | Chingola Youth Association') + '&body=' + q(d.text + '\n\n' + d.url) + '">' + ICO.mail + '<span>Email</span></a>' +
      '</div></div>';
    sdlg.showModal();
  }
  function copyLink(btn) {
    var inp = sdlg.querySelector('#shr-u'), msg = sdlg.querySelector('.fmsg');
    function ok() { btn.innerHTML = ICO.check + '<span>Link copied</span>'; msg.textContent = 'Link copied. Now paste it into a chat.'; }
    function fallback() { inp.focus(); inp.select(); try { if (document.execCommand('copy')) return ok(); } catch (x) {} msg.textContent = 'Press and hold the link above to copy it.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(ok, fallback); else fallback();
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
