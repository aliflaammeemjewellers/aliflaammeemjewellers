/* ==========================================================================
   ALIF LAAM MEEM JEWELLERS — Interaction & Motion Engine
   Vanilla ES2020. No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(pointer: coarse)').matches;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------
     TOAST
  ------------------------------------------------------------------ */
  var toastEl = null;
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = doc.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      doc.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3400);
  }

  /* ------------------------------------------------------------------
     PRELOADER (index experience, quick fade on other pages)
  ------------------------------------------------------------------ */
  var preloader = $('#preloader');
  function completePreloader() {
    body.classList.add('is-loaded');
    if (!preloader) return;
    preloader.classList.add('is-done');
    setTimeout(function () {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 1200);
  }
  if (preloader) {
    var seen = false;
    try { seen = sessionStorage.getItem('alm-seen') === '1'; } catch (e) {}
    body.classList.add('is-locked');
    var countEl = $('.preloader__count');
    var barEl = $('.preloader__bar i');
    if (seen || reduceMotion) {
      setTimeout(completePreloader, reduceMotion ? 80 : 380);
    } else {
      var start = null;
      var DURATION = 1500;
      var failsafe = setTimeout(completePreloader, 4200);
      requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        var p = clamp((ts - start) / DURATION, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(eased * 100);
        if (countEl) countEl.textContent = (value < 10 ? '0' + value : value) + ' %';
        if (barEl) barEl.style.transform = 'scaleX(' + eased + ')';
        if (p < 1) { requestAnimationFrame(step); }
        else { clearTimeout(failsafe); setTimeout(completePreloader, 260); }
      });
    }
    try { sessionStorage.setItem('alm-seen', '1'); } catch (e) {}
  } else {
    body.classList.add('is-loaded');
  }

  /* ------------------------------------------------------------------
     SMOOTH SCROLLING (Lenis-style inertial glide — desktop pointer only)
  ------------------------------------------------------------------ */
  var smooth = {
    enabled: false,
    target: window.scrollY,
    current: window.scrollY,
    max: 0,
    LERP: 0.092
  };
  (function initSmooth() {
    if (reduceMotion || isTouch || window.innerWidth < 1024) return;
    smooth.enabled = true;
    smooth.measure = function () {
      smooth.max = Math.max(0, doc.documentElement.scrollHeight - window.innerHeight);
      smooth.target = clamp(smooth.target, 0, smooth.max);
    };
    smooth.measure();
    window.addEventListener('resize', function () { smooth.measure(); });

    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || body.classList.contains('is-locked')) return;
      e.preventDefault();
      smooth.target = clamp(smooth.target + e.deltaY, 0, smooth.max);
    }, { passive: false });

    var externallyScrolled = 0;
    window.addEventListener('scroll', function () {
      if (Math.abs(window.scrollY - smooth.current) > 1.5) {
        smooth.current = smooth.target = window.scrollY;
        externallyScrolled = Date.now();
      }
    }, { passive: true });

    (function tick() {
      smooth.current += (smooth.target - smooth.current) * smooth.LERP;
      if (Math.abs(smooth.target - smooth.current) < 0.35) smooth.current = smooth.target;
      if (Date.now() - externallyScrolled > 60) window.scrollTo(0, smooth.current);
      requestAnimationFrame(tick);
    })();
  })();

  function scrollToY(y) {
    var max = doc.documentElement.scrollHeight - window.innerHeight;
    y = clamp(y, 0, Math.max(0, max));
    if (smooth.enabled) { smooth.target = y; }
    else { window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }); }
  }
  function headerOffset() {
    var h = $('.header');
    return h ? h.offsetHeight + 10 : 80;
  }
  function scrollToEl(el) {
    scrollToY(el.getBoundingClientRect().top + window.scrollY - headerOffset() + 1);
  }

  /* Anchor links */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); scrollToY(0); return; }
    var target = doc.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    closeAllOverlays();
    scrollToEl(target);
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ------------------------------------------------------------------
     HEADER — solid on scroll, hide on scroll-down, progress line
  ------------------------------------------------------------------ */
  var header = $('.header');
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-solid', y > 40);
      var menuOpen = header.classList.contains('is-menu-open');
      var goingDown = y - lastY > 6;
      var goingUp = y - lastY < -5;
      if (!menuOpen && y > 560 && goingDown && !body.classList.contains('is-locked')) {
        header.classList.add('is-hidden');
      } else if (goingUp || y < 300) {
        header.classList.remove('is-hidden');
      }
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? y / max : 0;
      header.style.setProperty('--scroll-progress', progress.toFixed(4));
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 900);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* Back to top */
  var toTop = $('.to-top');
  if (toTop) toTop.addEventListener('click', function () { scrollToY(0); });

  /* Active nav link */
  (function markActiveNav() {
    var page = body.getAttribute('data-page');
    if (!page) return;
    $$('.main-nav__link[data-nav]').forEach(function (l) {
      if (l.getAttribute('data-nav') === page) l.classList.add('is-active');
    });
  })();

  /* ------------------------------------------------------------------
     FULL-SCREEN MENU
  ------------------------------------------------------------------ */
  var menu = $('.menu');
  var menuBtn = $('.menu-btn');
  var menuLastFocus = null;

  function openMenu() {
    if (!menu || !menuBtn) return;
    menuLastFocus = doc.activeElement;
    menu.classList.add('is-open');
    menuBtn.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    if (header) { header.classList.remove('is-hidden'); header.classList.add('is-menu-open', 'is-solid'); }
    body.classList.add('is-locked');
    if (smooth.enabled) { smooth.target = smooth.current = window.scrollY; }
    setTimeout(function () { var first = $('.menu__link', menu); if (first) first.focus(); }, 700);
  }
  function closeMenu() {
    if (!menu || !menuBtn || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menuBtn.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (header) header.classList.remove('is-menu-open');
    body.classList.remove('is-locked');
    if (menuLastFocus && menuLastFocus.focus) menuLastFocus.focus();
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      menu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
  }
  $$('.menu a, .menu button').forEach(function (el) {
    el.addEventListener('click', function () { closeMenu(); });
  });

  /* ------------------------------------------------------------------
     SEARCH
  ------------------------------------------------------------------ */
  var SEARCH_INDEX = [
    { title: 'Gold Rings', cat: 'Collections', url: 'collections.html#gold-rings' },
    { title: 'Diamond Jewellery', cat: 'Collections', url: 'collections.html#diamonds' },
    { title: 'Necklaces', cat: 'Collections', url: 'collections.html#necklaces' },
    { title: 'Earrings', cat: 'Collections', url: 'collections.html#earrings' },
    { title: 'Bangles', cat: 'Collections', url: 'collections.html#bangles' },
    { title: 'Bracelets', cat: 'Collections', url: 'collections.html#bracelets' },
    { title: 'Bridal Jewellery', cat: 'Collections', url: 'collections.html#bridal' },
    { title: 'New Arrivals', cat: 'Discover', url: 'index.html#new-arrivals' },
    { title: 'Signature Piece', cat: 'Signature', url: 'product.html' },
    { title: 'The Art of Craftsmanship', cat: 'Atelier', url: 'about.html#craftsmanship' },
    { title: 'Our Story', cat: 'Atelier', url: 'about.html' },
    { title: 'The Journal', cat: 'Stories', url: 'journal.html' },
    { title: 'Visit the Boutique', cat: 'Contact', url: 'contact.html' }
  ];

  var search = $('.search');
  var searchInput = $('.search__input');
  var searchResults = $('.search__results');

  function renderSearch(q) {
    if (!searchResults) return;
    var query = (q || '').trim().toLowerCase();
    searchResults.innerHTML = '';
    if (!query) { searchResults.classList.remove('has-results'); return; }
    var hits = SEARCH_INDEX.filter(function (item) {
      return item.title.toLowerCase().indexOf(query) !== -1 || item.cat.toLowerCase().indexOf(query) !== -1;
    });
    if (!hits.length) {
      searchResults.innerHTML = '<p class="lede" style="grid-column:1/-1;font-size:.9rem">No results for “' + escapeHtml(q) + '”. Try “gold”, “bridal” or “diamond”.</p>';
      searchResults.classList.add('has-results');
      return;
    }
    hits.slice(0, 6).forEach(function (item) {
      var a = doc.createElement('a');
      a.className = 'chip';
      a.href = item.url;
      a.textContent = item.cat + ' — ' + item.title;
      searchResults.appendChild(a);
    });
    searchResults.classList.add('has-results');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openSearch() {
    if (!search) return;
    menuLastFocus = doc.activeElement;
    search.classList.add('is-open');
    body.classList.add('is-locked');
    if (header) header.classList.remove('is-hidden');
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 420);
  }
  function closeSearch() {
    if (!search || !search.classList.contains('is-open')) return;
    search.classList.remove('is-open');
    body.classList.remove('is-locked');
    if (menuLastFocus && menuLastFocus.focus) menuLastFocus.focus();
  }
  var searchBtn = $('[data-open-search]');
  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  var searchClose = $('[data-close-search]');
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (search) $('.search__scrim').addEventListener('click', closeSearch);
  if (searchInput) {
    searchInput.addEventListener('input', function () { renderSearch(searchInput.value); });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var first = searchResults ? $('a', searchResults) : null;
        if (first) first.click();
      }
    });
  }

  function closeAllOverlays() { closeMenu(); closeSearch(); }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllOverlays();
  });

  /* ------------------------------------------------------------------
     REVEAL ON SCROLL
  ------------------------------------------------------------------ */
  (function initReveals() {
    var items = $$('[data-reveal], .rlines');
    if (reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------
     PARALLAX (rAF driven)
  ------------------------------------------------------------------ */
  (function initParallax() {
    if (reduceMotion) return;
    var els = $$('[data-parallax]').map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.14 };
    });
    if (!els.length) return;
    var vh = window.innerHeight;
    window.addEventListener('resize', function () { vh = window.innerHeight; });
    var visible = els;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var item = null;
          for (var i = 0; i < els.length; i++) if (els[i].el === entry.target) item = els[i];
          if (!item) return;
          item.active = entry.isIntersecting;
        });
      }, { rootMargin: '22% 0px 22% 0px' });
      els.forEach(function (item) { io.observe(item.el); });
      visible = null;
    }
    function frame() {
      var list = visible || els;
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (item.active === false) continue;
        var rect = item.el.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > vh + 80) continue;
        var centerDelta = rect.top + rect.height / 2 - vh / 2;
        item.el.style.transform = 'translate3d(0, ' + (centerDelta * -item.speed).toFixed(2) + 'px, 0)';
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------
     CAROUSELS — arrows, counter, drag, snap
  ------------------------------------------------------------------ */
  $$('.carousel').forEach(function (root) {
    var track = $('.carousel__track', root);
    if (!track) return;
    var prev = $('.c-arrow--prev', root);
    var next = $('.c-arrow--next', root);
    var count = $('.carousel__count b', root);
    var cards = Array.prototype.slice.call(track.children);

    function cardStep() {
      if (!cards.length) return 320;
      return cards[0].offsetWidth + parseFloat(getComputedStyle(track).gap || 24);
    }
    function currentIndex() {
      var step = cardStep();
      return clamp(Math.round(track.scrollLeft / step), 0, cards.length - 1);
    }
    function update() {
      var idx = currentIndex();
      if (count) count.textContent = String(idx + 1).padStart(2, '0');
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    }
    if (prev) prev.addEventListener('click', function () {
      track.scrollTo({ left: Math.max(0, track.scrollLeft - cardStep()), behavior: 'smooth' });
    });
    if (next) next.addEventListener('click', function () {
      track.scrollTo({ left: track.scrollLeft + cardStep(), behavior: 'smooth' });
    });
    track.addEventListener('scroll', function () {
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    /* Drag to scroll (desktop) */
    if (!isTouch && !reduceMotion) {
      var isDown = false, startX = 0, startLeft = 0, moved = 0;
      track.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') return;
        isDown = true; moved = 0;
        startX = e.clientX; startLeft = track.scrollLeft;
        track.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', function (e) {
        if (!isDown) return;
        var dx = e.clientX - startX;
        moved = Math.abs(dx);
        track.scrollLeft = startLeft - dx;
      });
      window.addEventListener('pointerup', function () {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('is-dragging');
        var step = cardStep();
        var target = Math.round(track.scrollLeft / step) * step;
        track.scrollTo({ left: target, behavior: 'smooth' });
        if (moved > 8) {
          var suppress = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
          track.addEventListener('click', suppress, { capture: true, once: true });
        }
      });
    }
  });

  /* ------------------------------------------------------------------
     NEWSLETTER
  ------------------------------------------------------------------ */
  var newsletter = $('.newsletter__form');
  if (newsletter) {
    var nlInput = $('.newsletter__input', newsletter);
    var nlMsg = $('.newsletter__msg');
    newsletter.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = (nlInput && nlInput.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
      if (!nlMsg) return;
      if (!ok) {
        nlMsg.textContent = 'Please enter a valid e-mail address.';
        nlMsg.classList.add('is-error');
        if (nlInput) nlInput.focus();
      } else {
        nlMsg.textContent = 'Welcome to the circle. Your first letter is on its way.';
        nlMsg.classList.remove('is-error');
        nlInput.value = '';
        showToast('Subscribed — welcome to the ALM circle');
      }
    });
  }

  /* ------------------------------------------------------------------
     CONTACT FORM
  ------------------------------------------------------------------ */
  var contactForm = $('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      $$('.field', contactForm).forEach(function (field) {
        var input = $('.field__input, .field__select, .field__textarea', field);
        var required = input && input.hasAttribute('required');
        var filled = input && input.value.trim() !== '';
        var isEmail = input && input.type === 'email';
        var emailOk = !isEmail || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
        var bad = (required && !filled) || (filled && !emailOk);
        field.classList.toggle('is-error', bad);
        if (bad) valid = false;
      });
      if (!valid) { showToast('Please complete the highlighted fields'); return; }
      var panel = $('#contact-success');
      if (panel) {
        contactForm.style.display = 'none';
        panel.hidden = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showToast('Message received — we will reply shortly');
    });
  }

  /* ------------------------------------------------------------------
     PRODUCT PAGE — gallery thumbs
  ------------------------------------------------------------------ */
  var pdMain = $('.pd__main img');
  if (pdMain) {
    $$('.pd__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var img = $('img', thumb);
        if (!img) return;
        pdMain.style.opacity = '0';
        setTimeout(function () {
          pdMain.src = img.src;
          pdMain.style.transition = 'opacity .5s ease';
          pdMain.style.opacity = '1';
        }, 220);
        $$('.pd__thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    });
  }

  /* ------------------------------------------------------------------
     PAGE TRANSITIONS — gold-lit curtain wipe between pages
  ------------------------------------------------------------------ */
  (function initTransitions() {
    var curtain = $('.curtain');
    if (!curtain || reduceMotion) return;
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.dataset.noTransition !== undefined) return;
      if (href.charAt(0) === '#' || href.charAt(0) === 'mailto:' || href.charAt(0) === 'tel:') return;
      if (/^(https?:)?\/\//i.test(href) && href.indexOf(location.origin) !== 0) return;
      if (href.indexOf('.html') === -1 && href.charAt(0) !== '/') return;
      e.preventDefault();
      curtain.classList.add('is-active');
      setTimeout(function () { location.href = href; }, 480);
    });
    window.addEventListener('pageshow', function () {
      curtain.classList.remove('is-active');
    });
  })();

  /* ------------------------------------------------------------------
     MISC — year, hero parallax hint
  ------------------------------------------------------------------ */
  $$('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Re-measure smooth scroll bounds after fonts/images settle */
  window.addEventListener('load', function () {
    if (smooth.enabled) smooth.measure();
    onScroll();
  });

})();
