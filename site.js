(function () {
  'use strict';
  var U = 'tranquanghao708', REPO = 'tranquanghao708.github.io', GH = 'https://github.com/' + U + '/';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* SỬA Ở ĐÂY: [tên repo, nhóm chủ đề] — đổi thành repo thật của bạn */
  var REPOS = [
    ['crackme-writeups', 'Reverse Engineering'],
    ['ghidra-notes', 'Reverse Engineering'],
    ['syscall-notes', 'Low-Level Systems'],
    ['x86-64-asm', 'C & Assembly']
  ];
  window.SITE = { user: U, repo: REPO, gh: GH, repos: REPOS, esc: esc };

  document.body.classList.add('has-side');
  var page = location.pathname.split('/').pop() || 'index.html';
  var nav = [
    ['index.html', '⌂', 'Home'], ['notes.html', '☰', 'Notes'],
    ['index.html#repos', '⎇', 'Repos'], ['index.html#about', '☺', 'About']
  ];
  var side = document.createElement('aside');
  side.id = 'sidebar';
  side.innerHTML =
    '<img class="avatar" src="https://github.com/' + U + '.png?size=192" alt="" onerror="this.style.display=\'none\'">' +
    '<a class="site" href="index.html">Trần Quang Hào</a>' +
    '<p class="tag">low-level systems &amp; reverse engineering</p>' +
    '<nav>' + nav.map(function (n) {
      return '<a href="' + n[0] + '"' + (n[0] === page ? ' class="on"' : '') + '><i>' + n[1] + '</i>' + n[2] + '</a>';
    }).join('') + '</nav>' +
    '<div class="foot"><a href="https://github.com/' + U + '" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>';
  document.body.appendChild(side);

  var btn = document.createElement('button');
  btn.id = 'sb-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Menu');
  btn.textContent = '☰';
  btn.onclick = function () { document.body.classList.toggle('sb-open'); };
  document.body.appendChild(btn);
  side.addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('sb-open'); });

  /* post.html: dựng mục lục bên phải khi bài đã render */
  var c = document.getElementById('content');
  if (c) {
    var t = document.createElement('aside');
    t.id = 'toc';
    document.body.appendChild(t);
    var mo = new MutationObserver(function () {
      var hs = c.querySelectorAll('h2,h3');
      if (!hs.length) return;
      t.innerHTML = '<b>Mục lục bài</b>' + [].map.call(hs, function (h) {
        return '<a class="d' + h.tagName[1] + '" href="#' + esc(h.id) + '">' + esc(h.textContent.replace(/^#/, '')) + '</a>';
      }).join('');
      mo.disconnect();
    });
    mo.observe(c, { childList: true });
  }
})();
