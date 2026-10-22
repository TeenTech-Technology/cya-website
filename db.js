/* Shared connection to the CYA database (Supabase). The key is the public "publishable" key:
   it is safe in the browser because Row Level Security decides what visitors may do. */
window.CYA_DB = {
  URL: 'https://brxiurlnnlildxygeqge.supabase.co',
  KEY: 'sb_publishable_e5l2X_AagzgFrCcwMkQJOg_Z2BDHPkc',
  headers: function (extra) {
    var h = { apikey: this.KEY, Authorization: 'Bearer ' + this.KEY, 'Content-Type': 'application/json' };
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }
};
