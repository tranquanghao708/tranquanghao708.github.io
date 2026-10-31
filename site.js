(function () {
  'use strict';
  var U = 'tranquanghao708', REPO = 'tranquanghao708.github.io', GH = 'https://github.com/' + U + '/';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* SỬA Ở ĐÂY: tên repo thật của bạn */
  var REPOS = ['crackme-writeups', 'ghidra-notes', 'syscall-notes', 'x86-64-asm'];
  var CHIPS = ['Reverse Engineering', 'Low-Level', 'C & Assembly', 'Binary Security'];
  window.SITE = { user: U, repo: REPO, gh: GH, esc: esc };

  document.body.classList.add('has-side');
  var page = location.pathname.split('/').pop() || 'index.html';
  var file = new URLSearchParams(location.search).get('file') || '';

  var side = document.createElement('aside');
  side.id = 'sidebar';
  side.innerHTML =
    '<div class="avwrap"><img class="avatar" src="https://github.com/' + U + '.png?size=192" alt="" onerror="this.style.visibility=\'hidden\'"></div>' +
    '<a class="site" href="index.html">Trần Quang Hào</a>' +
    '<div class="sb-chips">' + CHIPS.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' +
    '<nav>' +
    '<a href="index.html"' + (page === 'index.html' ? ' class="on"' : '') + '><i>⌂</i>Home</a>' +
    '<h4>man blog</h4>' +
    '<a class="cmd' + (page === 'notes.html' || page === 'post.html' ? ' on' : '') + '" href="notes.html"><i>$</i>ls posts/</a>' +
    '<h4>repos</h4>' +
    REPOS.map(function (r) {
      return '<a href="' + GH + encodeURIComponent(r) + '" target="_blank" rel="noopener noreferrer"><i>↗</i>' + esc(r) + '</a>';
    }).join('') + '</nav>' +
    '<div class="foot"><a href="https://github.com/' + U + '" target="_blank" rel="noopener noreferrer">© 2026 ' + U + ' · GitHub ↗</a></div>';
  document.body.appendChild(side);

  var btn = document.createElement('button');
  btn.id = 'sb-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Menu');
  btn.textContent = '☰';
  btn.onclick = function () { document.body.classList.toggle('sb-open'); };
  document.body.appendChild(btn);
  side.addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('sb-open'); });

  /* Thanh trên: HOME › TRANG  +  ô search (chuyển sang notes.html?q=) */
  var bar = document.querySelector('.top-bar .nav');
  if (bar) {
    var crumb = page === 'notes.html' ? 'ls posts/' : page === 'post.html' ? (file || 'post') : '';
    bar.innerHTML = '<div class="crumb"><a href="index.html">Home</a>' + (crumb ? '<i>›</i><span>' + esc(crumb) + '</span>' : '') + '</div>' +
      '<form class="srch" action="notes.html" method="get"><input name="q" type="search" placeholder="Search…" autocomplete="off" aria-label="Tìm bài"></form>';
  }

  /* post.html: mục lục bài bên phải khi bài đã render */
  var c = document.getElementById('content');
  if (c) {
    var t = document.createElement('aside');
    t.id = 'toc';
    document.body.appendChild(t);
    var mo = new MutationObserver(function () {
      var hs = c.querySelectorAll('h2,h3');
      if (!hs.length) return;
      t.innerHTML = '<b>[ mục lục ]</b>' + [].map.call(hs, function (h) {
        return '<a class="d' + h.tagName[1] + '" href="#' + esc(h.id) + '">' + esc(h.textContent.replace(/^#/, '')) + '</a>';
      }).join('');
      mo.disconnect();
    });
    mo.observe(c, { childList: true });
  }
})();
