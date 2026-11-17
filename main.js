/* ============================================================
   Scarlette Radiance — wepink
   Scroll-scrubbed image sequence + 6 cenas de texto
   GSAP 3 + ScrollTrigger. Sem build, sem framework.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- config ---------- */
  var FRAME_COUNT   = 241;              // conferido com: ls frames | wc -l
  var DESKTOP_DIR   = 'frames/';
  var MOBILE_DIR    = 'frames-mobile/';
  var EXT           = '.webp';
  var MOBILE_QUERY  = '(max-width: 768px)';
  var LOAD_CONCURRENCY = 12;            // evita 241 requests simultâneos
  var MAX_DPR       = 2;

  /* faixas de progresso (0–1) de cada cena — disjuntas de propósito:
     o card sai por completo antes do próximo entrar.                */
  var RANGES = [
    { in: 0.000, out: 0.115 },  // 0 — hero
    { in: 0.150, out: 0.300 },  // 1 — a fragrância
    { in: 0.335, out: 0.485 },  // 2 — a evolução
    { in: 0.520, out: 0.670 },  // 3 — a composição
    { in: 0.705, out: 0.855 },  // 4 — alta perfumaria
    { in: 0.890, out: 1.001 }   // 5 — fechamento (segura até o fim)
  ];

  /* ---------- refs ---------- */
  var body      = document.body;
  var stage     = document.getElementById('stage');
  var canvas    = document.getElementById('seq');
  var ctx       = canvas.getContext('2d', { alpha: false });
  var preloader = document.getElementById('preloader');
  var preFill   = document.getElementById('preFill');
  var prePct    = document.getElementById('prePct');
  var labelEl   = document.getElementById('sceneLabel');
  var hintEl    = document.getElementById('hint');
  var barFill   = document.getElementById('barFill');
  var sceneEls  = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var innerEls  = sceneEls.map(function (s) { return s.querySelector('.scene__in'); });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia(MOBILE_QUERY).matches;
  var DIR = isMobile ? MOBILE_DIR : DESKTOP_DIR;

  var frames = new Array(FRAME_COUNT);

  /* ============================================================
     CANVAS — cover manual (sem distorcer)
     ============================================================ */
  var cssW = 0, cssH = 0;

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
  }

  function paint(img) {
    ctx.fillStyle = '#08050A';
    ctx.fillRect(0, 0, cssW, cssH);
    if (!img || !img.naturalWidth) return;

    var scale = Math.max(cssW / img.naturalWidth, cssH / img.naturalHeight);
    var dw = img.naturalWidth  * scale;
    var dh = img.naturalHeight * scale;
    ctx.drawImage(img, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
  }

  /* redesenha só quando o índice muda, e sempre dentro de um rAF */
  var drawnIndex = -1;
  var wantedIndex = 0;
  var rafId = 0;

  function flush() {
    rafId = 0;
    if (wantedIndex === drawnIndex) return;
    drawnIndex = wantedIndex;
    paint(frames[drawnIndex]);
  }

  function requestFrame(i) {
    if (i < 0) i = 0;
    if (i > FRAME_COUNT - 1) i = FRAME_COUNT - 1;
    wantedIndex = i;
    if (!rafId) rafId = requestAnimationFrame(flush);
  }

  function repaintNow() {           // usado no resize
    drawnIndex = -1;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(flush);
  }

  /* ============================================================
     PRELOAD
     ============================================================ */
  function src(i) {
    return DIR + 'frame_' + String(i + 1).padStart(4, '0') + EXT;
  }

  function loadOne(i) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = img.onerror = function () { frames[i] = img; resolve(); };
      img.src = src(i);
    });
  }

  function preloadAll(total, onProgress) {
    var next = 0, done = 0;
    return new Promise(function (resolve) {
      function pump() {
        if (next >= total) return;
        var i = next++;
        loadOne(i).then(function () {
          done++;
          onProgress(done / total);
          if (done === total) resolve();
          else pump();
        });
      }
      var n = Math.min(LOAD_CONCURRENCY, total);
      for (var k = 0; k < n; k++) pump();
    });
  }

  function setProgress(p) {
    var pct = Math.round(p * 100);
    preFill.style.width = pct + '%';
    prePct.textContent = pct + '%';
  }

  function dismissPreloader() {
    preloader.classList.add('is-done');
    body.classList.remove('is-loading');
    document.documentElement.classList.remove('is-loading');
    window.setTimeout(function () {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 900);
  }

  /* ============================================================
     CENAS
     ============================================================ */
  var activeScene = -1;

  var labelTl = null;

  function setLabel(text) {
    if (labelTl) labelTl.kill();
    labelTl = gsap.timeline()
      .to(labelEl, { opacity: 0, duration: 0.16, ease: 'power1.in' })
      .call(function () { labelEl.textContent = text; })
      .to(labelEl, { opacity: 1, duration: 0.22, ease: 'power1.out' });
  }

  var hideTween = null;

  function hideScene(i) {
    gsap.killTweensOf(innerEls[i]);
    hideTween = gsap.to(innerEls[i], {
      autoAlpha: 0, y: -24,
      duration: 0.4, ease: 'power2.in', overwrite: true
    });
    return hideTween;
  }

  function showScene(i, delay) {
    gsap.killTweensOf(innerEls[i]);
    gsap.fromTo(innerEls[i],
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.72, delay: delay, ease: 'power2.out', overwrite: true }
    );
  }

  /* garante um único card visível por vez: a entrada só começa
     depois que a saída anterior terminou de fato.               */
  function activate(i) {
    if (activeScene === i) return;
    var delay = 0;

    if (activeScene > -1) {
      hideScene(activeScene);
      delay = 0.4;
    } else if (hideTween && hideTween.isActive()) {
      delay = Math.max(0, hideTween.duration() - hideTween.time());
    }

    activeScene = i;
    showScene(i, delay);
    setLabel(sceneEls[i].dataset.label);
  }

  function deactivate(i) {
    if (activeScene !== i) return;
    activeScene = -1;
    hideScene(i);
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    sizeCanvas();

    /* ---- reduced motion: um frame estático, seções empilhadas ---- */
    if (reduced) {
      var still = Math.floor(FRAME_COUNT * 0.42);
      loadOne(still).then(function () {
        requestFrame(still);
        setProgress(1);
        dismissPreloader();
      });
      window.addEventListener('resize', function () {
        sizeCanvas(); repaintNow();
      });
      return;
    }

    /* ---- fluxo normal ---- */
    preloadAll(FRAME_COUNT, setProgress).then(function () {
      requestFrame(0);
      dismissPreloader();
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      wire();
    });
  }

  function wire() {
    /* --- scrub do vídeo --- */
    var seek = { f: 0 };

    gsap.to(seek, {
      f: FRAME_COUNT - 1,
      ease: 'none',
      snap: { f: 1 },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true
      },
      onUpdate: function () { requestFrame(seek.f); }
    });

    /* --- barra de progresso + hint --- */
    ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        barFill.style.width = (self.progress * 100).toFixed(2) + '%';
        /* resolve a cena ativa a cada tick: barato (6 comparacoes) e
           imune aos cantos em que o onToggle da cena 0 nao dispara.  */
        syncActive();
      }
    });

    ScrollTrigger.create({
      start: 0,
      end: function () { return span() * RANGES[0].out; },
      onToggle: function (self) {
        gsap.to(hintEl, {
          autoAlpha: self.isActive ? 1 : 0,
          duration: 0.4, ease: 'power1.out'
        });
      }
    });

    /* --- uma ScrollTrigger por cena, ancorada na faixa de progresso --- */
    sceneEls.forEach(function (el, i) {
      var r = RANGES[i];
      ScrollTrigger.create({
        start: (function (v) { return function () { return span() * v; }; })(r.in),
        end:   (function (v) { return function () { return span() * v; }; })(r.out),
        onToggle: function (self) {
          if (self.isActive) activate(i);
          else deactivate(i);
        }
      });
    });

    /* --- resize com debounce --- */
    var t = 0;
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(function () {
        /* no iOS a barra de endereço muda só a altura: não vale refazer tudo */
        var widthChanged = window.innerWidth !== lastW;
        lastW = window.innerWidth;
        sizeCanvas();
        repaintNow();
        if (widthChanged || !('ontouchstart' in window)) ScrollTrigger.refresh();
      }, 180);
    }, { passive: true });

    ScrollTrigger.refresh();
    syncActive();
    barFill.style.width = (scrollY() / span() * 100).toFixed(2) + '%';

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        ScrollTrigger.refresh();
        syncActive();
      });
    }
  }

  function scrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  /* o ScrollTrigger da cena 0 comeca em scroll 0 e nao dispara onToggle
     no estado inicial — entao a cena ativa e resolvida na mao no boot. */
  function syncActive() {
    var y = scrollY();
    var s = span();
    for (var i = 0; i < RANGES.length; i++) {
      if (y >= s * RANGES[i].in && y < s * RANGES[i].out) { activate(i); return; }
    }
  }

  function span() {
    return Math.max(1, stage.offsetHeight - window.innerHeight);
  }

  /* ---- CTAs (troque o href pelo link real da loja) ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-buy]'), function (a) {
    a.addEventListener('click', function (e) {
      if (a.getAttribute('href') === '#') e.preventDefault();
    });
  });

  boot();
})();
