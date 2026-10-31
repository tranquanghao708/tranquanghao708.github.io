(function () {
  'use strict';
  var U = 'tranquanghao708', R = 'tranquanghao708.github.io', GH = 'https://github.com/' + U + '/';

  /* SỬA Ở ĐÂY: nhóm chủ đề -> [tên hiển thị, link repo GitHub] */
  var GROUPS = [
    { t: 'Reverse Engineering', i: [['crackme-writeups', GH + 'crackme-writeups'], ['ghidra-notes', GH + 'ghidra-notes']] },
    { t: 'Low-Level Systems', i: [['syscall-notes', GH + 'syscall-notes'], ['os-from-scratch', GH + 'os-from-scratch']] },
    { t: 'C & Assembly', i: [['x86-64-asm', GH + 'x86-64-asm']] }
  ];

  var el = document.getElementById('side');
  if (!el) return;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var cur = new URLSearchParams(location.search).get('file') || '';

  el.innerHTML =
    '<div class="profile"><img class="avatar" src="https://github.com/' + U + '.png?size=168" alt="" onerror="this.style.display=\'none\'">' +
    '<b>Trần Quang Hào</b><small>low-level · reverse engineering</small></div>' +
    '<nav class="toc"><h3>trang</h3>' +
    '<a href="index.html#intro">giới thiệu</a><a href="index.html#focus">readelf --focus</a><a href="notes.html">tất cả ghi chú</a>' +
    GROUPS.map(function (g) {
      return '<h3>' + esc(g.t) + '</h3>' + g.i.map(function (x) {
        return '<a class="ext" href="' + esc(x[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(x[0]) + '</a>';
      }).join('');
    }).join('') +
    '<h3>posts</h3><div id="side-posts"><a>đang tải…</a></div></nav>';

  var box = document.getElementById('side-posts');
  function show(names) {
    box.innerHTML = names.length ? names.map(function (n) {
      var t = n.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
      return '<a href="post.html?file=' + encodeURIComponent(n) + '"' + (n === cur ? ' class="on"' : '') + '>' + esc(t) + '</a>';
    }).join('') : '<a>(chưa có bài)</a>';
  }
  var cached = null;
  try { cached = JSON.parse(sessionStorage.getItem('ll-posts')); } catch (e) {}
  if (cached) return show(cached);
  fetch('https://api.github.com/repos/' + U + '/' + R + '/contents/posts?ref=main', { headers: { Accept: 'application/vnd.github+json' } })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (files) {
      var names = files.filter(function (f) { return f.type === 'file' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.md$/.test(f.name); })
        .map(function (f) { return f.name; }).sort().reverse();
      try { sessionStorage.setItem('ll-posts', JSON.stringify(names)); } catch (e) {}
      show(names);
    })
    .catch(function () { box.innerHTML = '<a href="notes.html">xem danh sách ghi chú</a>'; });
})();
