/*
 * posts.js — dùng chung cho index.html, notes.html, post.html
 *
 * Mọi file .md trong posts/ (kể cả thư mục con, tối đa 6 cấp) đều là 1 bài. Tên file/thư mục
 * được phép có dấu cách, tiếng Việt, hoa/thường:
 *   posts/bai-don.md
 *   posts/Writeup HTB Box1/writeup.md       (ảnh: posts/Writeup HTB Box1/image/a.png → ![](image/a.png))
 *   posts/ctf/htb/box1/writeup.md
 * Danh sách lấy bằng 1 request (git trees) gồm cả thống kê thư mục / ảnh; metadata (title/tags/date)
 * đọc từ frontmatter và cache trong localStorage.
 */
(function () {
  'use strict';
  var CFG = { owner: 'tranquanghao708', repo: 'tranquanghao708.github.io', branch: 'main', dir: 'posts' };
  var BASE = new URL('.', location.href).href;
  var LOCAL = BASE + CFG.dir + '/';
  var RAW = 'https://raw.githubusercontent.com/' + CFG.owner + '/' + CFG.repo + '/' + CFG.branch + '/' + CFG.dir + '/';
  var TREE_KEY = 'posts_tree_v4', TREE_TTL = 90 * 1000;
  var MAX_BYTES = 512 * 1024;
  var BAD = /[\u0000-\u001f\u007f\\]/;

  var enc = function (p) { return String(p).split('/').map(encodeURIComponent).join('/'); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
  var pretty = function (s) { return s.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); };
  function validSeg(s) {
    return typeof s === 'string' && s.length > 0 && s.length <= 120 && !BAD.test(s) && s.charAt(0) !== '.';
  }
  function valid(p) {
    var a = p.split('/');
    return p.length <= 400 && a.length <= 6 && /\.md$/i.test(p) && a.every(validSeg);
  }
  var ls = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function href(path) { return 'post.html?file=' + enc(path); }
  var IMG = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

  /* ---------- cây thư mục posts/ (1 request) ---------- */
  function tree() {
    var c = ls.get(TREE_KEY);
    if (c && Date.now() - c.t < TREE_TTL && Array.isArray(c.items) && c.dirs) return Promise.resolve(c);
    var api = 'https://api.github.com/repos/' + CFG.owner + '/' + CFG.repo + '/git/trees/' + CFG.branch + '?recursive=1';
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 12000);
    return fetch(api, { cache: 'no-store', signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) {
        if (r.status === 403 || r.status === 429) throw new Error('GitHub API bị giới hạn (rate limit). Thử lại sau vài phút.');
        if (r.status === 404) throw new Error('Không tìm thấy repo/nhánh "' + CFG.branch + '" (kiểm tra CFG trong posts.js).');
        if (!r.ok) throw new Error('Lỗi API: ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var prefix = CFG.dir + '/', items = [], dirs = {}, total = 0;
        function dir(k) { return dirs[k] || (dirs[k] = { md: 0, mdTotal: 0, img: 0, files: 0 }); }
        (Array.isArray(d.tree) ? d.tree : []).forEach(function (n) {
          if (!n || n.type !== 'blob' || typeof n.path !== 'string' || n.path.indexOf(prefix) !== 0) return;
          var rel = n.path.slice(prefix.length), parts = rel.split('/');
          if (!parts.every(validSeg)) return;
          var base = parts.pop(), folder = parts.join('/');
          var isMd = /\.md$/i.test(base), isImg = IMG.test(base);
          total++;
          for (var i = 1; i <= parts.length; i++) {
            var x = dir(parts.slice(0, i).join('/'));
            x.files++;
            if (isMd) x.mdTotal++;
            if (isImg) x.img++;
          }
          if (isMd && valid(rel)) {
            if (folder) dir(folder).md++;
            items.push({ path: rel, base: base, folder: folder, size: n.size | 0, href: href(rel) });
          }
        });
        var out = { t: Date.now(), items: items, dirs: dirs, total: total, truncated: !!d.truncated };
        ls.set(TREE_KEY, out);
        return out;
      })
      .catch(function (e) {
        if (c && Array.isArray(c.items) && c.dirs) return c; // lỗi mạng → dùng bản cũ
        throw e.name === 'AbortError' ? new Error('Hết thời gian chờ GitHub API.') : e;
      })
      .then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }
  function list() { return tree().then(function (t) { return t.items; }); }
  function clearCache() {
    ls.del(TREE_KEY);
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('post_meta_v2:') === 0) localStorage.removeItem(k); });
    } catch (e) {}
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
    return pretty((/^(index|readme|writeup|main)$/.test(b) && it.folder) ? it.folder.split('/').pop() : it.base);
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
        date: r.meta.date ? String(r.meta.date) : '',
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
  function sortPosts(all) {
    return all.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;       // mới nhất trước
      return a.path < b.path ? 1 : -1;
    });
  }
  function loadAll() {
    return list().then(function (items) { return pool(items, 6, meta); }).then(sortPosts);
  }

  /* ?post=ten-thu-muc → chọn file chính trong thư mục đó */
  function pickInFolder(items, slug) {
    var inside = items.filter(function (p) { return p.path.indexOf(slug + '/') === 0; });
    if (!inside.length) return null;
    var want = ['index.md', 'readme.md', slug.toLowerCase() + '.md', 'writeup.md', 'main.md'];
    for (var i = 0; i < want.length; i++) {
      var f = inside.find(function (p) { return p.base.toLowerCase() === want[i]; });
      if (f) return f;
    }
    return inside.sort(function (a, b) { return a.path.split('/').length - b.path.split('/').length || (a.path < b.path ? -1 : 1); })[0];
  }

  window.POSTS = {
    tree: tree, list: list, meta: meta, loadAll: loadAll, sortPosts: sortPosts, pool: pool, clearCache: clearCache,
    pickInFolder: pickInFolder, parse: parse, getTags: getTags, href: href, enc: enc, esc: esc, validSeg: validSeg, validPath: valid
  };
})();
