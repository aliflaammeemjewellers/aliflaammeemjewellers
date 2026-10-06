/* ==========================================================================
   ALIF LAAM MEEM JEWELLERS — Site behaviour
   Vanilla JS, no dependencies. Everything injected/configured from SITE.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     1. BUSINESS CONFIG — change these values to go live (single source)
     --------------------------------------------------------------------- */
  const SITE = {
    name: 'Alif Laam Meem Jewellers',
    whatsapp: '923000000000',                 // international format, digits only
    phoneDisplay: '+92 300 000 0000',
    email: 'care@aliflaammeemjewellers.com',
    addressLine1: 'Shop 42, Gold Souk, Liberty Market',
    addressLine2: 'Gulberg III, Lahore 54660, Pakistan',
    hoursWeek: 'Mon – Sat · 11:00 AM – 9:00 PM',
    hoursSun: 'Sunday · 1:00 PM – 7:00 PM',
    mapsUrl: 'https://maps.google.com/?q=Liberty+Market+Gulberg+III+Lahore',
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    youtube: 'https://youtube.com/'
  };

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  const waLink = (msg) =>
    'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(msg);

  /* ---------------------------------------------------------------------
     2. GOLD LINE-ART MOTIFS (inline SVG, brand-consistent per category)
     --------------------------------------------------------------------- */
  const G = 'stroke="url(#goldStroke)" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const GF = 'fill="url(#goldFill)"';

  const MOTIF = {
    rings: `<svg class="motif" viewBox="0 0 120 120" role="img" aria-label="Gold ring line drawing">
      <circle cx="60" cy="74" r="30" ${G}/>
      <circle cx="60" cy="74" r="23" ${G} stroke-width="1.1" opacity=".55"/>
      <path d="M60 26 L71 40 L60 54 L49 40 Z" ${G}/>
      <path d="M49 40 h22 M60 26 v28" ${G} stroke-width="1.1" opacity=".6"/>
      <path d="M45 22 l4 4 M75 22 l-4 4" ${G} stroke-width="1.4" opacity=".7"/>
    </svg>`,

    necklace: `<svg class="motif" viewBox="0 0 120 120" role="img" aria-label="Gold necklace line drawing">
      <path d="M22 16 C22 62 34 78 60 78 C86 78 98 62 98 16" ${G}/>
      <circle cx="22" cy="16" r="3" ${GF}/>
      <circle cx="98" cy="16" r="3" ${GF}/>
      <path d="M60 78 v14" ${G}/>
      <path d="M60 92 L70 104 L60 116 L50 104 Z" ${G}/>
      <path d="M50 104 h20" ${G} stroke-width="1.1" opacity=".6"/>
      <path d="M40 62 l4 6 M80 62 l-4 6 M60 70 v6" ${G} stroke-width="1.3" opacity=".65"/>
    </svg>`,

    earrings: `<svg class="motif" viewBox="0 0 120 120" role="img" aria-label="Gold jhumka earrings line drawing">
      <path d="M36 14 a10 10 0 1 0 0 .01" ${G} stroke-width="0"/>
      <circle cx="36" cy="16" r="5" ${G}/>
      <path d="M36 21 v10" ${G}/>
      <path d="M36 31 c-13 0 -20 9 -20 19 h40 c0 -10 -7 -19 -20 -19 z" ${G}/>
      <path d="M16 50 h40" ${G} stroke-width="1.2"/>
      <circle cx="24" cy="58" r="3.4" ${GF}/>
      <circle cx="36" cy="62" r="3.4" ${GF}/>
      <circle cx="48" cy="58" r="3.4" ${GF}/>
      <circle cx="84" cy="16" r="5" ${G}/>
      <path d="M84 21 v10" ${G}/>
      <path d="M84 31 c-13 0 -20 9 -20 19 h40 c0 -10 -7 -19 -20 -19 z" ${G}/>
      <path d="M64 50 h40" ${G} stroke-width="1.2"/>
      <circle cx="72" cy="58" r="3.4" ${GF}/>
      <circle cx="84" cy="62" r="3.4" ${GF}/>
      <circle cx="96" cy="58" r="3.4" ${GF}/>
    </svg>`,

    bangles: `<svg class="motif" viewBox="0 0 120 120" role="img" aria-label="Gold bangles line drawing">
      <ellipse cx="60" cy="32" rx="34" ry="12" ${G}/>
      <ellipse cx="60" cy="52" rx="34" ry="12" ${G}/>
      <ellipse cx="60" cy="72" rx="34" ry="12" ${G}/>
      <ellipse cx="60" cy="92" rx="34" ry="12" ${G}/>
      <path d="M26 32 v60 M94 32 v60" ${G} stroke-width="1" opacity=".28"/>
      <path d="M60 20 v-8 M60 100 v10" ${G} stroke-width="1.4" opacity=".6"/>
    </svg>`,

    bridal: `<svg class="motif" viewBox="0 0 120 120" role="img" aria-label="Bridal jewellery set line drawing">
      <path d="M14 22 C14 60 30 74 60 74 C90 74 106 60 106 22" ${G}/>
      <path d="M24 22 C24 52 38 64 60 64 C82 64 96 52 96 22" ${G} stroke-width="1.1" opacity=".5"/>
      <path d="M40 52 c0 0 4 6 4 10 a4 4 0 0 1 -8 0 c0 -4 4 -10 4 -10 z" ${GF}/>
      <path d="M60 60 c0 0 4 6 4 10 a4 4 0 0 1 -8 0 c0 -4 4 -10 4 -10 z" ${GF}/>
      <path d="M80 52 c0 0 4 6 4 10 a4 4 0 0 1 -8 0 c0 -4 4 -10 4 -10 z" ${GF}/>
      <path d="M60 74 v10" ${G} stroke-width="1.2"/>
      <path d="M60 84 L68 96 L60 108 L52 96 Z" ${G}/>
      <path d="M52 96 h16" ${G} stroke-width="1" opacity=".55"/>
    </svg>`,

    pendants: `<svg class="motif" viewBox="0 0 120 120" role="img" aria-label="Diamond pendant line drawing">
      <circle cx="60" cy="60" r="34" ${G} stroke-width="1.1" opacity=".35" stroke-dasharray="4 6"/>
      <path d="M60 24 L74 44 L60 64 L46 44 Z" ${G}/>
      <path d="M46 44 h28 M60 24 v40" ${G} stroke-width="1.1" opacity=".6"/>
      <path d="M60 64 v20" ${G} stroke-width="1.4"/>
      <path d="M46 92 h28" ${G} stroke-width="1.4"/>
      <path d="M40 20 l5 5 M80 20 l-5 5" ${G} stroke-width="1.3" opacity=".7"/>
    </svg>`
  };

  /* ---------------------------------------------------------------------
     3. COLLECTION DATA
     --------------------------------------------------------------------- */
  const METALS = {
    gold22:  '22K Gold',
    gold18:  '18K Gold',
    rose:    'Rose Gold',
    white:   'White Gold',
    plat:    'Platinum'
  };
  const OCCASIONS = {
    bridal:     'Bridal',
    engagement: 'Engagement',
    festive:    'Festive',
    everyday:   'Everyday',
    gifting:    'Gifting',
    investment: 'Investment'
  };
  const TYPES = {
    rings:    'Rings',
    necklace: 'Necklaces',
    earrings: 'Earrings',
    bangles:  'Bangles',
    bridal:   'Bridal Sets'
  };

  const PRODUCTS = [
    { id:'meher',    name:'Meher Solitaire Ring',      type:'rings',    metals:['gold22'],        occasion:'engagement', motif:'rings',
      desc:'A brilliant-cut solitaire raised on a hand-forged 22K band.', tags:['BIS Hallmarked','IGI Certified'], price:'PKR 385,000', note:'incl. making', badge:'Bestseller' },
    { id:'aab',      name:'Aab Diamond Pendant',       type:'necklace', metals:['gold18'],        occasion:'gifting',    motif:'pendants',
      desc:'Pear-cut diamond suspended on a whisper-fine 18K chain.', tags:['IGI Certified','18K'], price:'PKR 168,000', note:'chain included' },
    { id:'zohra',    name:'Zohra Jhumka Earrings',     type:'earrings', metals:['gold22'],        occasion:'festive',    motif:'earrings',
      desc:'Granulated dome jhumkas finished with hand-strung pearls.', tags:['Handcrafted','Pearl'], price:'PKR 245,000', note:'pair', badge:'New' },
    { id:'sana',     name:'Sana Engraved Bangles',     type:'bangles',  metals:['gold22'],        occasion:'everyday',   motif:'bangles',
      desc:'Set of four slim bangles with traditional hand engraving.', tags:['Set of 4','Hand Engraved'], price:'PKR 720,000', note:'set of four' },
    { id:'noor',     name:'Noor Polki Bridal Set',     type:'bridal',   metals:['gold22'],        occasion:'bridal',     motif:'bridal',
      desc:'Uncut polki necklace with matching earrings and maang tikka.', tags:['Bridal','Polki','Made to order'], price:'Price on request', note:'bespoke', badge:'Signature' },
    { id:'roshni',   name:'Roshni Temple Necklace',    type:'necklace', metals:['gold22'],        occasion:'bridal',     motif:'necklace',
      desc:'Temple-inspired nakshi work with ruby and emerald accents.', tags:['Bridal','22K Gold'], price:'PKR 1,240,000', note:'approx. 48g' },
    { id:'hina',     name:'Hina Eternity Band',        type:'rings',    metals:['rose','white'],  occasion:'engagement', motif:'rings',
      desc:'Micro-set diamonds running continuously around the band.', tags:['Ethical Diamonds','Comfort Fit'], price:'PKR 210,000', note:'per band' },
    { id:'gulbahar', name:'Gulbahar Emerald Choker',   type:'bridal',   metals:['gold22'],        occasion:'bridal',     motif:'bridal',
      desc:'Zambian emerald drops set in kundan on a 22K gold base.', tags:['Kundan','Emerald'], price:'Price on request', note:'bespoke' },
    { id:'mahtab',   name:'Mahtab Diamond Studs',      type:'earrings', metals:['white'],         occasion:'everyday',   motif:'pendants',
      desc:'Four-prong princess studs that move from desk to dinner.', tags:['IGI Certified','Everyday'], price:'PKR 132,000', note:'pair', badge:'Bestseller' },
    { id:'vasl',     name:'Vasl Couple Bands',         type:'rings',    metals:['plat','gold18'], occasion:'engagement', motif:'rings',
      desc:'Brushed platinum bands with a single hidden gold inlay.', tags:['Platinum','Engraving included'], price:'PKR 298,000', note:'pair' },
    { id:'sitara',   name:'Sitara Filigree Kada',      type:'bangles',  metals:['gold22'],        occasion:'festive',    motif:'bangles',
      desc:'Wide kada built from hand-drawn gold filigree scrolls.', tags:['Filigree','22K Gold'], price:'PKR 545,000', note:'approx. 32g' },
    { id:'sahr',     name:'Sahr Gold Coin Pendant',    type:'necklace', metals:['gold22'],        occasion:'investment', motif:'pendants',
      desc:'Hallmarked 22K bullion coin framed in a rope-edge bezel.', tags:['Bullion','24K Coin'], price:'PKR 96,000', note:'incl. coin' },
    { id:'nazm',     name:'Nazm Pearl Drop Earrings',  type:'earrings', metals:['gold18'],        occasion:'gifting',    motif:'earrings',
      desc:'South Sea pearl drops swinging from hammered gold hoops.', tags:['South Sea Pearl','18K'], price:'PKR 88,000', note:'pair' },
    { id:'maahru',   name:'Maahru Diamond Bangle',     type:'bangles',  metals:['white','gold18'],occasion:'bridal',     motif:'bangles',
      desc:'A formal bangle of channel-set diamonds with gold edging.', tags:['IGI Certified','Formal'], price:'PKR 465,000', note:'single' }
  ];

  const TESTIMONIALS = [
    { name:'Ayesha Rehman', role:'Bridal client, Lahore', rating:5,
      text:'They designed my entire bridal set from a sketch I brought in. The polki work was finer than anything I saw in the market — and the price was settled before a single gram was melted.' },
    { name:'Bilal Ahmed', role:'Investment buyer', rating:5,
      text:'I have bought bullion here for nine years. Transparent weighing, proper hallmarking, documented invoicing. That consistency is why my family keeps coming back.' },
    { name:'Sana Tariq', role:'Engagement purchase', rating:5,
      text:'I was nervous about choosing a solitaire. Their consultant spent two hours with me under the loupe, showed me the certificate, and never once pushed me upwards.' },
    { name:'Hina & Faisal', role:'Wedding bands, 2025', rating:5,
      text:'Both our bands were hand-engraved with our wedding date. The detailing is so clean it reads as machine work — except no machine could do this.' },
    { name:'Zeeshan Malik', role:'Restoration', rating:4,
      text:'My mother\u2019s old necklace had a broken clasp and worn links. They restored it matching the original karigar work. You cannot tell where the repair begins.' },
    { name:'Farah Naz', role:'Repeat client', rating:5,
      text:'The lifetime exchange promise is real. I upgraded an old chain last month and got a fair, clearly explained rate on the spot. No drama, no haggling.' }
  ];

  /* ---------------------------------------------------------------------
     4. SMALL HELPERS
     --------------------------------------------------------------------- */
  const money = (str) => str;

  function starRow(n) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      out += '<svg viewBox="0 0 24 24" aria-hidden="true" ' +
        (i < n ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.5"') + '>' +
        '<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95L12 2.6z"/></svg>';
    }
    return '<div class="stars" role="img" aria-label="' + n + ' out of 5 stars">' + out + '</div>';
  }

  /* ---------------------------------------------------------------------
     5. RENDER: products
     --------------------------------------------------------------------- */
  const grid = $('#productsGrid');
  const subFilters = $('#subFilters');
  const filterState = { group: 'all', value: null };

  function cardHTML(p, i) {
    const metalList = p.metals.map((m) => METALS[m]).join(' · ');
    return `
      <article class="product-card" role="listitem" data-type="${p.type}" data-occasion="${p.occasion}"
               data-metals="${p.metals.join(' ')}" style="animation-delay:${Math.min(i * 55, 420)}ms">
        <div class="product-media">
          <span class="halo" aria-hidden="true"></span>
          ${MOTIF[p.motif]}
          ${p.badge ? `<span class="badge${p.badge === 'Bestseller' || p.badge === 'Signature' ? ' gold' : ''}">${p.badge}</span>` : ''}
          <button class="fav-btn" type="button" aria-label="Save ${p.name} to wishlist" aria-pressed="false"
                  data-fav="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7 3c0 5-7 9.4-7 9.4z"/>
            </svg>
          </button>
        </div>
        <div class="product-body">
          <span class="product-cat">${TYPES[p.type]} · ${OCCASIONS[p.occasion]}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.desc}</p>
          <div class="product-meta">
            ${p.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
            <span class="tag">${metalList}</span>
          </div>
          <div class="product-foot">
            <span class="price">${money(p.price)}<small>${p.note}</small></span>
            <button class="enquire-btn" type="button"
                    data-enquire="${p.name}|${money(p.price)}">
              Enquire
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          </div>
        </div>
      </article>`;
  }

  function matches(p) {
    const f = filterState;
    if (!f.value) return true;
    if (f.group === 'all') return true;
    if (f.group === 'type') return p.type === f.value;
    if (f.group === 'occasion') return p.occasion === f.value;
    if (f.group === 'metal') return p.metals.indexOf(f.value) > -1;
    return true;
  }

  function renderProducts() {
    if (!grid) return;
    const list = PRODUCTS.filter(matches);
    grid.innerHTML = list.length
      ? list.map(cardHTML).join('')
      : `<p class="collections-note" style="grid-column:1/-1;text-align:center;padding:40px 0">
           No pieces in this selection yet — call us and we will craft it for you.
         </p>`;
  }

  function renderSubFilters(group) {
    if (!subFilters) return;
    const map = group === 'type' ? TYPES : group === 'metal' ? METALS : OCCASIONS;
    const keys = Object.keys(map);
    subFilters.innerHTML =
      '<button class="chip active" type="button" aria-pressed="true" data-val="">All</button>' +
      keys.map((k) =>
        `<button class="chip" type="button" aria-pressed="false" data-val="${k}">${map[k]}</button>`
      ).join('');
  }

  function bindFilterTabs() {
    const tabs = $$('.filter-tab');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        const group = tab.dataset.filter;
        filterState.group = group;
        filterState.value = null;
        if (group === 'all') {
          if (subFilters) subFilters.innerHTML = '';
        } else {
          renderSubFilters(group);
        }
        renderProducts();
      });
    });

    if (subFilters) {
      subFilters.addEventListener('click', (e) => {
        const chip = e.target.closest && e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', subFilters).forEach((c) => {
          const on = c === chip;
          c.classList.toggle('active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        filterState.value = chip.dataset.val || null;
        renderProducts();
      });
    }
  }

  /* ---------------------------------------------------------------------
     6. RENDER: testimonials
     --------------------------------------------------------------------- */
  function renderTestimonials() {
    const wrap = $('#testimonialsGrid');
    if (!wrap) return;
    wrap.innerHTML = TESTIMONIALS.map((t) => {
      const initials = t.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      return `
        <figure class="testimonial">
          ${starRow(t.rating)}
          <blockquote>${t.text}</blockquote>
          <figcaption class="testimonial-author">
            <span class="author-avatar" aria-hidden="true">${initials}</span>
            <span>
              <span class="author-name">${t.name}</span>
              <span class="author-role">${t.role}</span>
            </span>
          </figcaption>
        </figure>`;
    }).join('');
  }

  /* ---------------------------------------------------------------------
     7. APPOINTMENT FORM → WhatsApp
     --------------------------------------------------------------------- */
  function initForm() {
    const form = $('#appointmentForm');
    if (!form) return;

    const dateInput = $('#date');
    if (dateInput) {
      const today = new Date();
      const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
      dateInput.min = iso;
      dateInput.value = '';
    }

    const status = $('#formStatus');

    function setInvalid(field, on, msg) {
      const group = field.closest('.form-group');
      if (!group) return;
      group.classList.toggle('invalid', on);
      const box = $('.error-msg', group);
      if (box && msg) box.textContent = msg;
    }

    $$('input, select, textarea', form).forEach((f) => {
      f.addEventListener('input', () => setInvalid(f, false));
      f.addEventListener('change', () => setInvalid(f, false));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = $('#name');
      const phone = $('#phone');
      const purpose = $('#purpose');
      const date = $('#date');
      const time = $('#time');
      let firstBad = null;

      const checks = [
        [name, name.value.trim().length >= 3, 'Please enter your full name.'],
        [phone, /^[+()\-\s\d]{9,20}$/.test(phone.value.trim()), 'Enter a reachable phone number.'],
        [purpose, !!purpose.value, 'Choose the purpose of your visit.'],
        [date, !!date.value, 'Pick a preferred date.'],
        [time, !!time.value, 'Pick a preferred time.']
      ];

      checks.forEach(([field, ok, msg]) => {
        setInvalid(field, !ok, msg);
        if (!ok && !firstBad) firstBad = field;
      });

      if (firstBad) {
        firstBad.focus();
        if (status) status.classList.remove('show');
        return;
      }

      const lines = [
        'Assalam-o-Alaikum, ' + SITE.name + '.',
        '',
        'I would like to book a showroom consultation.',
        '',
        'Name: ' + name.value.trim(),
        'Phone: ' + phone.value.trim()
      ];
      const email = $('#email');
      const message = $('#message');
      if (email && email.value.trim()) lines.push('Email: ' + email.value.trim());
      lines.push('Purpose: ' + purpose.options[purpose.selectedIndex].text);
      lines.push('Preferred date: ' + date.value);
      lines.push('Preferred time: ' + time.options[time.selectedIndex].text);
      if (message && message.value.trim()) lines.push('Notes: ' + message.value.trim());

      const msg = lines.join('\n');
      const hidden = $('#whatsappMessage');
      if (hidden) hidden.value = msg;

      window.open(waLink(msg), '_blank', 'noopener');

      if (status) {
        status.innerHTML = 'Thank you, ' + name.value.trim().split(' ')[0] +
          ' — your request has been prepared in WhatsApp. Send the message and we will confirm your slot within 2 hours.';
        status.classList.add('show');
      }
    });
  }

  /* ---------------------------------------------------------------------
     8. NEWSLETTER + wishlist micro-interactions
     --------------------------------------------------------------------- */
  function initNewsletter() {
    const form = $('#newsletterForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input', form);
      const msg = $('#newsletterMsg');
      if (!input || !input.value.trim()) return;
      if (msg) {
        msg.textContent = 'Added ' + input.value.trim() +
          ' — we will send the new arrivals preview, never more than twice a month.';
        msg.classList.add('show');
      }
      form.reset();
    });
  }

  function initDelegatedClicks() {
    document.addEventListener('click', (e) => {
      const fav = e.target.closest('[data-fav]');
      if (fav) {
        const on = fav.getAttribute('aria-pressed') === 'true';
        fav.setAttribute('aria-pressed', on ? 'false' : 'true');
        fav.classList.toggle('active', !on);
        return;
      }
      const enq = e.target.closest('[data-enquire]');
      if (enq) {
        const parts = enq.dataset.enquire.split('|');
        const msg = 'Assalam-o-Alaikum, ' + SITE.name + '.\n\n' +
          'I am interested in: ' + parts[0] + (parts[1] ? ' (' + parts[1] + ')' : '') + '\n' +
          'Could you share availability, weight and current pricing?';
        window.open(waLink(msg), '_blank', 'noopener');
      }
    });
  }

  /* ---------------------------------------------------------------------
     9. NAV, SCROLL, REVEAL, COUNTERS
     --------------------------------------------------------------------- */
  function initNav() {
    const nav = $('#navbar');
    const btn = $('#mobileMenuBtn');
    const links = $('#navLinks');

    const onScroll = () => {
      if (nav) nav.classList.toggle('is-stuck', window.scrollY > 12);
      const bar = $('#progress');
      if (bar) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ')';
      }
      const top = $('#backToTop');
      if (top) {
        const show = window.scrollY > 620;
        top.classList.toggle('show', show);
        top.setAttribute('aria-hidden', show ? 'false' : 'true');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (btn && links) {
      const setMenu = (open) => {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        links.classList.toggle('open', open);
        document.body.classList.toggle('no-scroll', open);
      };
      btn.addEventListener('click', () =>
        setMenu(btn.getAttribute('aria-expanded') !== 'true'));
      $$('.nav-link', links).forEach((a) =>
        a.addEventListener('click', () => setMenu(false)));
      window.addEventListener('resize', () => {
        if (window.innerWidth > 980 && links.classList.contains('open')) setMenu(false);
      });
    }

    const top = $('#backToTop');
    if (top) {
      top.addEventListener('click', () =>
        window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // Active link highlight
    const sections = $$('section[id]');
    const navAs = $$('.nav-link[href^="#"]');
    if ('IntersectionObserver' in window && sections.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navAs.forEach((a) =>
            a.classList.toggle('active', a.getAttribute('href') === '#' + id));
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach((s) => spy.observe(s));
    }
  }

  function initReveal() {
    const items = $$('[data-aos]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('aos-in'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = el.dataset.aosDelay ? parseInt(el.dataset.aosDelay, 10) : 0;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('aos-in');
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }

  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const reduce = !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const decimals = (el.dataset.count.split('.')[1] || '').length;
      if (reduce) { el.textContent = target.toFixed(decimals) + suffix; return; }
      const dur = 1500;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
  }

  function hydrateSite() {
    $$('[data-site]').forEach((el) => {
      const key = el.dataset.site;
      if (!SITE[key]) return;
      if (el.tagName === 'A') {
        if (key === 'phoneDisplay') el.href = 'tel:+' + SITE.phoneDisplay.replace(/[^\d]/g, '');
        else if (key === 'email') el.href = 'mailto:' + SITE.email;
      }
      el.textContent = SITE[key];
    });
    $$('[data-site-href]').forEach((el) => {
      const url = SITE[el.dataset.siteHref];
      if (!url) return;
      el.href = url;
      if (!/^(mailto:|tel:)/.test(url)) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      }
    });
    $$('[data-wa]').forEach((el) => {
      el.href = waLink(el.dataset.wa || ('Assalam-o-Alaikum, ' + SITE.name + '. I would like to know more about your collections.'));
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------------------
     10. BOOT
     --------------------------------------------------------------------- */
  function init() {
    hydrateSite();
    bindFilterTabs();
    renderProducts();
    renderTestimonials();
    initForm();
    initNewsletter();
    initDelegatedClicks();
    initNav();
    initReveal();
    initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
