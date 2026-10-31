(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hex rain nền (rất mờ, tự dừng khi tab ẩn) */
  var cv = document.getElementById('rain');
  if (cv && !reduce) {
    var ctx = cv.getContext('2d'), cols = [], fs = 14, raf = 0, last = 0, W = 0, H = 0;
    var chars = '0123456789ABCDEF';
    var resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fs + 'px monospace';
      cols = Array.from({ length: Math.ceil(W / (fs * 1.6)) }, function () { return Math.random() * H / fs; });
    };
    var draw = function (t) {
      raf = requestAnimationFrame(draw);
      if (t - last < 66) return; // ~15 fps
      last = t;
      ctx.fillStyle = 'rgba(10,14,20,.12)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(63,185,80,.55)';
      cols.forEach(function (y, i) {
        ctx.fillText(chars[(Math.random() * 16) | 0], i * fs * 1.6, y * fs);
        cols[i] = (y * fs > H && Math.random() > .975) ? 0 : y + 1;
      });
    };
    resize();
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    });
    raf = requestAnimationFrame(draw);
  }

  /* Terminal: gõ từng lệnh (.cmd .t), hiện output (.out) lần lượt */
  window.LL = {
    type: function (term, done) {
      var lines = Array.prototype.slice.call(term.querySelectorAll('.tl'));
      var cur = document.createElement('span');
      cur.className = 'cur';
      if (reduce || !lines.length) { if (done) done(); return; }
      var texts = lines.map(function (l) { var t = l.querySelector('.t'); return t ? t.textContent : null; });
      lines.forEach(function (l, i) { l.classList.add('hid'); var t = l.querySelector('.t'); if (t) t.textContent = ''; });
      var i = 0;
      (function next() {
        if (i >= lines.length) { if (done) done(); return; }
        var l = lines[i], t = l.querySelector('.t'), txt = texts[i];
        l.classList.remove('hid');
        if (!t) { i++; return setTimeout(next, 90); }
        t.after(cur);
        var j = 0;
        (function ch() {
          if (j < txt.length) { t.textContent += txt[j++]; setTimeout(ch, 28 + Math.random() * 40); }
          else { i++; setTimeout(next, 260); }
        })();
      })();
    }
  };
})();
