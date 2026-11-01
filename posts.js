/*
 * posts.js — dùng chung cho index.html, notes.html, post.html
 *
 * Mọi file .md trong posts/ (kể cả trong thư mục con, tối đa 3 cấp) đều là 1 bài:
 *   posts/bai-don.md
 *   posts/folder1/writeup.md          (ảnh: posts/folder1/image/a.png → ![](image/a.png))
 *   posts/ctf/htb/box1/writeup.md
 * Danh sách lấy bằng 1 request (git trees), metadata (title/tags/date) đọc từ frontmatter,
 * cache trong localStorage để không tốn request & không dính rate limit.
 */
(function () {
  'use strict';
  var CFG = { owner: 'tranquanghao708', repo: 'tranquanghao708.github.io', branch: 'main', dir: 'posts' };
  var SEG = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$/;
  var BASE = new URL('.', location.href).href;
  var LOCAL = BASE + CFG.dir + '/';
  var RAW = 'https://raw.githubusercontent.com/' + CFG.owner + '/' + CFG.repo + '/' + CFG.branch + '/' + CFG.dir + '/';
  var TREE_KEY = 'posts_tree_v3', TREE_TTL = 5 * 60 * 1000;
  var MAX_BYTES = 512 * 1024;

  var enc = function (p) { return String(p).split('/').map(encodeURIComponent).join('/'); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
  var pretty = function (s) { return s.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); };
  function valid(p) {
    var a = p.split('/');
    return a.length <= 4 && /\.md$/i.test(p) && a.every(function (s) { return SEG.test(s); });
  }
  var ls = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function href(path) { return 'post.html?file=' + enc(path); }

  /* ---------- danh sách file ---------- */
  function list() {
    var c = ls.get(TREE_KEY);
    if (c && Date.now() - c.t < TREE_TTL && Array.isArray(c.items)) return Promise.resolve(c.items);
    var api = 'https://api.github.com/repos/' + CFG.owner + '/' + CFG.repo + '/git/trees/' + CFG.branch + '?recursive=1';
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 12000);
    return fetch(api, { cache: 'no-store', signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) {
        if (r.status === 403 || r.status === 429) throw new Error('GitHub API bị giới hạn (rate limit). Thử lại sau vài phút.');
        if (!r.ok) throw new Error('Lỗi API: ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var prefix = CFG.dir + '/', items = [];
        (Array.isArray(d.tree) ? d.tree : []).forEach(function (n) {
          if (!n || n.type !== 'blob' || typeof n.path !== 'string' || n.path.indexOf(prefix) !== 0) return;
          var rel = n.path.slice(prefix.length);
          if (!valid(rel)) return;
          var parts = rel.split('/'), base = parts.pop();
          items.push({ path: rel, base: base, folder: parts.join('/'), size: n.size | 0, href: href(rel) });
        });
        ls.set(TREE_KEY, { t: Date.now(), items: items });
        return items;
      })
      .catch(function (e) {
        if (c && Array.isArray(c.items)) return c.items; // lỗi mạng → dùng bản cũ
        throw e.name === 'AbortError' ? new Error('Hết thời gian chờ GitHub API.') : e;
      })
      .then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }

  /* ---------- đọc & phân tích file ---------- */
  function get(u) {
    return fetch(u, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (t) {
      if (t.length > MAX_BYTES || /^\s*<(!doctype|html)/i.test(t)) throw new Error('bad');
      return t;
    });
  }
  function fetchText(path) {
    return get(LOCAL + enc(path)).catch(function () { return get(RAW + enc(path)); });
  }
  function parse(md) {
    md = md.replace(/^\uFEFF/, '');
    var m = md.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
    if (!m) return { meta: {}, body: md };
    var meta = {}, key = null, clean = function (s) { return String(s).trim().replace(/^["']|["']$/g, ''); };
    m[1].split(/\r?\n/).forEach(function (line) {
      var item = line.match(/^\s*-\s+(.*)$/);
      if (item && key) { if (!Array.isArray(meta[key])) meta[key] = []; meta[key].push(clean(item[1])); return; }
      var kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
      if (!kv) return;
      key = kv[1].toLowerCase();
      var v = kv[2].trim();
      meta[key] = (v.charAt(0) === '[' && v.charAt(v.length - 1) === ']') ? v.slice(1, -1).split(',').map(clean).filter(Boolean) : clean(v);
    });
    return { meta: meta, body: m[2] };
  }
  function getTags(meta, limit) {
    var t = meta.tags || meta.tag || meta.categories || [];
    if (typeof t === 'string') t = t.split(',');
    if (!Array.isArray(t)) return [];
    var seen = {}, out = [];
    t.forEach(function (x) {
      var v = String(x).trim().replace(/^#+/, '').slice(0, 40), k = v.toLowerCase();
      if (v && !seen[k]) { seen[k] = 1; out.push(v); }
    });
    return out.slice(0, limit || 12);
  }
  var plain = function (md) {
    return String(md).replace(/```[\s\S]*?```/g, ' ').replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/!\[\[[^\]]*\]\]/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ').replace(/[`*_~>#|]/g, '').replace(/\s+/g, ' ').trim();
  };
  function fbTitle(it) {
    var b = it.base.replace(/\.md$/i, '').toLowerCase();
    return pretty((/^(index|readme)$/.test(b) && it.folder) ? it.folder.split('/').pop() : it.base);
  }

  /* ---------- metadata 1 bài (không bao giờ reject) ---------- */
  function meta(it) {
    var key = 'post_meta_v2:' + it.path + ':' + it.size, c = ls.get(key);
    if (c) return Promise.resolve(Object.assign({}, it, c));
    var fb = { title: fbTitle(it), date: '', tags: [], excerpt: '', mins: Math.max(1, Math.round(it.size / 1100)) };
    return fetchText(it.path).then(function (text) {
      var r = parse(text), h1 = r.body.match(/^#\s+(.+?)\s*#*\s*$/m);
      var t = plain(r.meta.title || (h1 && h1[1]) || '').slice(0, 120);
      var para = r.body.split(/\n\s*\n/).map(function (x) { return x.trim(); })
        .find(function (x) { return x && !/^(#|```|\||>|[-*+]\s|\d+\.\s|!\[|<|\$\$)/.test(x); });
      var ex = para ? plain(para) : '';
      var info = {
        title: t || fb.title,
        date: typeof r.meta.date === 'string' ? r.meta.date : '',
        tags: getTags(r.meta, 12),
        excerpt: ex.length > 150 ? ex.slice(0, 147).trimEnd() + '…' : ex,
        mins: Math.max(1, Math.round(r.body.trim().split(/\s+/).length / 200))
      };
      ls.set(key, info);
      return Object.assign({}, it, info);
    }).catch(function () { return Object.assign({}, it, fb); });
  }

  function pool(arr, n, fn) {
    var out = new Array(arr.length), i = 0;
    function next() {
      if (i >= arr.length) return Promise.resolve();
      var k = i++;
      return fn(arr[k]).then(function (v) { out[k] = v; }).then(next);
    }
    var w = [];
    for (var j = 0; j < Math.min(n, arr.length); j++) w.push(next());
    return Promise.all(w).then(function () { return out; });
  }
  function loadAll() {
    return list().then(function (items) { return pool(items, 6, meta); }).then(function (all) {
      return all.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;       // mới nhất trước
        return a.path < b.path ? 1 : -1;
      });
    });
  }

  /* ?post=ten-thu-muc → chọn file chính trong thư mục đó */
  function pickInFolder(items, slug) {
    var inside = items.filter(function (p) { return p.path.indexOf(slug + '/') === 0; });
    if (!inside.length) return null;
    var want = ['index.md', 'readme.md', slug.toLowerCase() + '.md', 'writeup.md'];
    for (var i = 0; i < want.length; i++) {
      var f = inside.find(function (p) { return p.base.toLowerCase() === want[i]; });
      if (f) return f;
    }
    return inside.sort(function (a, b) { return a.path.split('/').length - b.path.split('/').length || (a.path < b.path ? -1 : 1); })[0];
  }

  window.POSTS = { list: list, meta: meta, loadAll: loadAll, pickInFolder: pickInFolder, parse: parse, getTags: getTags, href: href, enc: enc, esc: esc };
})();
