/* Gallery page: photos uploaded in the CYA dashboard, with a simple full-screen viewer. */
(function () {
  var DB = window.CYA_DB, grid = document.getElementById('ggrid'), sel = document.getElementById('gev');
  var photos = [], shown = [], idx = 0;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function render() {
    var ev = sel.value;
    shown = photos.filter(function (p) { return !ev || p.event_id === ev; });
    grid.innerHTML = shown.length ? shown.map(function (p, i) {
      return '<figure><button type="button" data-i="' + i + '" aria-label="View photo' + (p.caption ? ': ' + esc(p.caption) : '') + '"><img src="' + esc(p.image_url) + '" alt="' + esc(p.caption || 'CYA photo') + '" loading="lazy"></button>' +
        (p.caption || (p.events && p.events.title) ? '<figcaption>' + esc(p.caption || '') + (p.events && p.events.title ? '<span>' + esc(p.events.title) + '</span>' : '') + '</figcaption>' : '') + '</figure>';
    }).join('') : '<p class="lead">Photos from our events will appear here soon.</p>';
  }
  fetch(DB.URL + '/rest/v1/gallery?select=*,events(title)&order=sort_order.asc,created_at.desc', { headers: DB.headers() })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (list) {
      photos = list.filter(function (p) { return /^https:\/\//.test(p.image_url); });
      var evs = {}; photos.forEach(function (p) { if (p.event_id && p.events) evs[p.event_id] = p.events.title; });
      Object.keys(evs).forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = evs[id]; sel.appendChild(o); });
      document.getElementById('gfilter').hidden = !Object.keys(evs).length;
      var q = new URLSearchParams(location.search).get('event'); if (q && evs[q]) sel.value = q;
      render();
    })
    .catch(function () { grid.innerHTML = '<p class="lead">The gallery could not load just now. Please try again a little later.</p>'; });
  sel.addEventListener('change', render);

  var box = document.createElement('dialog'); box.className = 'glb';
  box.innerHTML = '<button class="x" type="button" aria-label="Close">&times;</button><button class="pv" type="button" aria-label="Previous photo">&lsaquo;</button><figure><img alt=""><figcaption></figcaption></figure><button class="nx" type="button" aria-label="Next photo">&rsaquo;</button>';
  document.body.appendChild(box);
  function open(i) { idx = (i + shown.length) % shown.length; var p = shown[idx]; box.querySelector('img').src = p.image_url; box.querySelector('img').alt = p.caption || 'CYA photo'; box.querySelector('figcaption').textContent = p.caption || ''; if (!box.open) box.showModal(); }
  grid.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) open(+b.dataset.i); });
  box.addEventListener('click', function (e) {
    if (e.target.closest('.x') || e.target === box) box.close();
    else if (e.target.closest('.pv')) open(idx - 1); else if (e.target.closest('.nx')) open(idx + 1);
  });
  box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') open(idx - 1); if (e.key === 'ArrowRight') open(idx + 1); });
})();
