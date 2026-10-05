/* ==========================================================================
   Alif Laam Meem Jewellers — interactions
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
    'use strict';

    /* ---------------------------------------------------------------------
       1. BUSINESS CONFIG  —  edit these values only, they propagate site-wide
       --------------------------------------------------------------------- */
    const BUSINESS = {
        whatsapp: '91XXXXXXXXXX',          // country code + number, digits only
        phoneDisplay: '+91 XXXXX XXXXX',   // shown to visitors
        phoneDial: '+91XXXXXXXXXX'         // used by tel: links
    };

    /* ---------------------------------------------------------------------
       2. COLLECTION DATA
       Facets: category (sub-filter of Type) / metal / occasion
       --------------------------------------------------------------------- */
    const PRODUCTS = [
        {
            name: 'Aurora Solitaire Ring',
            material: '18K White Gold · VVS1 Diamond',
            category: 'rings', categoryLabel: 'Rings',
            metal: 'diamond', metalLabel: 'Diamond',
            occasion: 'wedding',
            desc: 'A brilliant-cut solitaire raised on a six-claw cathedral setting — our most requested engagement piece.',
            price: '\u20B91,45,000 – \u20B93,20,000',
            badge: 'Bestseller',
            img: 'assets/p-rings.jpg',
            alt: 'Solitaire diamond engagement ring photographed in black and white'
        },
        {
            name: 'Heritage Bridal Necklace',
            material: '22K Gold · Uncut Diamonds',
            category: 'necklace', categoryLabel: 'Necklaces',
            metal: 'gold', metalLabel: 'Gold',
            occasion: 'wedding',
            desc: 'Hand-assembled bridal set with traditional kundan work, balanced for weight and drape.',
            price: '\u20B94,80,000 – \u20B98,50,000',
            badge: 'Bridal',
            img: 'assets/p-necklace.jpg',
            alt: 'Ornate diamond bridal necklace set displayed on a bust'
        },
        {
            name: 'Chandelier Drop Earrings',
            material: '18K White Gold · 2.4 ct',
            category: 'earrings', categoryLabel: 'Earrings',
            metal: 'diamond', metalLabel: 'Diamond',
            occasion: 'wedding',
            desc: 'Graduated pear and marquise stones suspended to catch light with every movement.',
            price: '\u20B92,10,000 – \u20B93,90,000',
            badge: '',
            img: 'assets/p-earrings.jpg',
            alt: 'Pair of chandelier diamond drop earrings'
        },
        {
            name: 'Carved Heritage Bangles',
            material: '22K Gold · Hand Engraved',
            category: 'bangles', categoryLabel: 'Bangles',
            metal: 'gold', metalLabel: 'Gold',
            occasion: 'everyday',
            desc: 'Each bangle is engraved by hand over several days, so no two patterns repeat exactly.',
            price: '\u20B91,90,000 – \u20B94,10,000',
            badge: '',
            img: 'assets/p-bangle.jpg',
            alt: 'Stack of hand-carved gold bangles on a stone pedestal'
        },
        {
            name: 'Eternity Platinum Band',
            material: '950 Platinum · Channel Set',
            category: 'rings', categoryLabel: 'Rings',
            metal: 'platinum', metalLabel: 'Platinum',
            occasion: 'wedding',
            desc: 'A continuous line of channel-set stones in platinum — engineered to sit flush with any ring.',
            price: '\u20B985,000 – \u20B92,40,000',
            badge: 'New',
            img: 'assets/p-platinum.jpg',
            alt: 'Modern platinum eternity band with channel-set diamonds'
        },
        {
            name: 'Antique Temple Pendant',
            material: '22K Gold · Antique Finish',
            category: 'pendants', categoryLabel: 'Pendants',
            metal: 'gold', metalLabel: 'Gold',
            occasion: 'gifting',
            desc: 'Temple-inspired filigree finished by hand to a soft antique tone that deepens with wear.',
            price: '\u20B965,000 – \u20B91,75,000',
            badge: '',
            img: 'assets/p-pendant.jpg',
            alt: 'Antique gold temple pendant with filigree detailing'
        },
        {
            name: 'Bespoke Bridal Commission',
            material: 'Made to Order · Certified Stones',
            category: 'bespoke', categoryLabel: 'Bespoke',
            metal: 'diamond', metalLabel: 'Diamond',
            occasion: 'wedding',
            desc: 'Bring a reference or a sketch and our atelier will render, cast and set a piece that exists only for you.',
            price: 'Quoted at consultation',
            note: 'Bespoke commission',
            badge: 'Atelier',
            img: 'assets/craft.jpg',
            alt: 'Jeweller setting a stone into a ring at the workbench'
        },
        {
            name: 'Design Atelier Session',
            material: 'Studio Consultation · Stone Selection',
            category: 'bespoke', categoryLabel: 'Bespoke',
            metal: 'platinum', metalLabel: 'Platinum',
            occasion: 'gifting',
            desc: 'A working session with our designers: stone grading, metal options, sketches and costed drawings.',
            price: 'Complimentary',
            note: 'Studio session',
            badge: 'Studio',
            img: 'assets/p-custom.jpg',
            alt: 'Ring design sketch beside loose gemstones and jeweller tools'
        }
    ];

    const FACETS = {
        type: {
            label: 'Type',
            values: [
                { value: 'all', label: 'All Types' },
                { value: 'rings', label: 'Rings' },
                { value: 'necklace', label: 'Necklaces' },
                { value: 'earrings', label: 'Earrings' },
                { value: 'bangles', label: 'Bangles' },
                { value: 'pendants', label: 'Pendants' },
                { value: 'bespoke', label: 'Bespoke' }
            ]
        },
        metal: {
            label: 'Metal',
            values: [
                { value: 'all', label: 'All Metals' },
                { value: 'gold', label: 'Gold' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'platinum', label: 'Platinum' }
            ]
        },
        occasion: {
            label: 'Occasion',
            values: [
                { value: 'all', label: 'All Occasions' },
                { value: 'wedding', label: 'Wedding' },
                { value: 'everyday', label: 'Everyday' },
                { value: 'gifting', label: 'Gifting' }
            ]
        }
    };

    const TESTIMONIALS = [
        {
            quote: 'They spent two hours with us without any pressure to buy. We came back a week later for the wedding set and the craftsmanship was exactly as promised.',
            name: 'Ayesha & Imran',
            meta: 'Bridal Commission · Hyderabad'
        },
        {
            quote: 'My mother\u2019s old gold was reworked into three pieces for my sisters and me. They kept the original design language and the weight was certified in front of us.',
            name: 'Fatima Rahman',
            meta: 'Heritage Rework · Bengaluru'
        },
        {
            quote: 'I have bought investment gold here for six years. Transparent rates, hallmark on every piece, and buyback that matches what they quote.',
            name: 'Suhail Ahmed',
            meta: 'Gold Investment · Chennai'
        }
    ];

    /* ---------------------------------------------------------------------
       3. Icon set — inline monochrome SVG (inherits currentColor)
       --------------------------------------------------------------------- */
    const ICONS = {
        shield:   '<path d="M12 3.2 19 6v6.1c0 4.4-2.9 7.4-7 8.7-4.1-1.3-7-4.3-7-8.7V6z"/><polyline points="8.6 12.1 11 14.5 15.6 9.6"/>',
        diamond:  '<path d="M7.2 3.5h9.6L21 9.4 12 20.8 3 9.4z"/><path d="M3 9.4h18"/><path d="M12 20.8 9.4 9.4 12 3.5l2.6 5.9z"/>',
        exchange: '<path d="M20 11.2A8 8 0 0 0 6.3 5.6"/><polyline points="3.4 4.4 3.4 9 8 9"/><path d="M4 12.8a8 8 0 0 0 13.7 5.6"/><polyline points="20.6 19.6 20.6 15 16 15"/>',
        truck:    '<path d="M2.5 7h10.6v9.4H2.5z"/><path d="M13.1 10.4h4.6l3.4 3.6v2.4h-8z"/><circle cx="6.6" cy="18.4" r="1.7"/><circle cx="16.6" cy="18.4" r="1.7"/>',
        ring:     '<circle cx="12" cy="15.4" r="5"/><path d="M12 10.4 8.6 7 12 3.8 15.4 7z"/>',
        necklace: '<path d="M4.2 4.6c0 6.1 3.5 10.2 7.8 10.2s7.8-4.1 7.8-10.2"/><path d="M12 14.8v3.6"/><circle cx="12" cy="20" r="1.7"/>',
        sparkle:  '<path d="M12 3.2 14.1 10 21 12l-6.9 2L12 20.8 9.9 14 3 12l6.9-2z"/>',
        scale:    '<path d="M12 3.6v16.8"/><path d="M6.6 20.4h10.8"/><path d="M4.2 9.4h15.6"/><path d="M4.2 9.4 2 15h4.4z"/><path d="M19.8 9.4 22 15h-4.4z"/>',
        hammer:   '<path d="M13.9 3.8 20.2 10l-2.7 2.7-6.3-6.2z"/><path d="M11.2 7.2 4 14.4l2.9 2.9 7.2-7.2"/>',
        heart:    '<path d="M12 20.2S4.6 15.6 4.6 10.8A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.4 2.7c0 4.8-7.4 9.4-7.4 9.4z"/>',
        check:    '<polyline points="4.5 12.5 9.7 17.8 19.5 6.6"/>',
        chat:     '<path d="M20.2 11.7a8.1 8.1 0 0 1-11.8 7.2L4 20l1.1-4.3A8.1 8.1 0 1 1 20.2 11.7z"/><path d="M8.6 11.6h6.8M8.6 14.6h4.2"/>',
        phone:    '<path d="M6.2 3.4h3l1.5 3.9-2 1.5a11.3 11.3 0 0 0 4.9 4.9l1.5-2 3.9 1.5v3a2 2 0 0 1-2.2 2A15.2 15.2 0 0 1 4.2 5.6a2 2 0 0 1 2-2.2z"/>',
        instagram:'<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.1" cy="6.9" r="1.05" fill="currentColor" stroke="none"/>',
        facebook: '<path d="M14.6 8.6h2.6V5.4h-2.6a3.6 3.6 0 0 0-3.6 3.6v1.9H8.6v3.1h2.4v6.6h3.1v-6.6h2.5l.5-3.1h-3V9.4a.8.8 0 0 1 .5-.8z"/>',
        youtube:  '<rect x="2.6" y="5.6" width="18.8" height="12.8" rx="4"/><path d="M10.6 9.4 15.4 12l-4.8 2.6z"/>',
        pin:      '<path d="M12 21s6.9-6.1 6.9-10.9A6.9 6.9 0 0 0 5.1 10.1C5.1 14.9 12 21 12 21z"/><circle cx="12" cy="10.1" r="2.6"/>',
        mail:     '<rect x="3" y="5.6" width="18" height="12.8" rx="2"/><path d="m3.7 6.9 8.3 5.9 8.3-5.9"/>'
    };

    function iconSvg(name) {
        const body = ICONS[name];
        if (!body) return '';
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" ' +
               'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
               body + '</svg>';
    }

    function initIcons() {
        $$('[data-icon]').forEach((el) => {
            const markup = iconSvg(el.getAttribute('data-icon'));
            if (markup) el.innerHTML = markup;
        });
    }

    /* ---------------------------------------------------------------------
       4. Small utilities
       --------------------------------------------------------------------- */
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------------
       5. Contact links from config
       --------------------------------------------------------------------- */
    function applyContactLinks() {
        const waHref = 'https://wa.me/' + BUSINESS.whatsapp;
        $$('a[href^="https://wa.me"]').forEach((a) => {
            a.href = waHref;
            const value = $('.contact-value', a);
            if (value) value.textContent = BUSINESS.phoneDisplay;
        });
        $$('a[href^="tel:"]').forEach((a) => {
            a.href = 'tel:' + BUSINESS.phoneDial;
            const value = $('.contact-value', a);
            if (value) {
                value.textContent = BUSINESS.phoneDisplay;
            } else if (!a.querySelector('*')) {
                a.textContent = BUSINESS.phoneDisplay;
            }
        });
    }

    /* ---------------------------------------------------------------------
       6. Navigation
       --------------------------------------------------------------------- */
    function initNav() {
        const navbar   = $('#navbar');
        const btn      = $('#mobileMenuBtn');
        const links    = $('#navLinks');
        const progress = $('#scrollProgress');
        const toTop    = $('#backToTop');

        function onScroll() {
            const y = window.scrollY;
            navbar.classList.toggle('scrolled', y > 24);
            toTop.classList.toggle('visible', y > 640);
            toTop.setAttribute('aria-hidden', y > 640 ? 'false' : 'true');

            const max = document.documentElement.scrollHeight - window.innerHeight;
            progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
        }

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => { onScroll(); ticking = false; });
        }, { passive: true });
        onScroll();

        function setMenu(open) {
            links.classList.toggle('open', open);
            btn.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('no-scroll', open);
        }

        btn.addEventListener('click', () => setMenu(!links.classList.contains('open')));
        $$('.nav-link', links).forEach((a) => a.addEventListener('click', () => setMenu(false)));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setMenu(false);
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth > 860) setMenu(false);
        });

        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    /* ---------------------------------------------------------------------
       7. Reveal on scroll
       --------------------------------------------------------------------- */
    const revealObserver = ('IntersectionObserver' in window)
        ? new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('aos-in');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
        : null;

    function initReveal() {
        if (!revealObserver) {
            $$('[data-aos]').forEach((el) => el.classList.add('aos-in'));
            return;
        }
        $$('[data-aos]').forEach((el) => revealObserver.observe(el));
    }

    /* ---------------------------------------------------------------------
       8. Collections: render + filter
       --------------------------------------------------------------------- */
    const state = { facet: null, value: 'all' };

    function productCard(p, index) {
        const card = document.createElement('article');
        card.className = 'product-card stagger';
        card.setAttribute('role', 'listitem');
        card.style.transitionDelay = Math.min(index * 70, 420) + 'ms';
        card.innerHTML = [
            '<div class="product-media">',
                '<img src="', p.img, '" alt="', p.alt, '" loading="lazy" decoding="async" width="1024" height="1024">',
                p.badge ? '<span class="product-badge">' + p.badge + '</span>' : '',
                '<button class="product-quick" type="button" aria-label="Enquire about ', p.name, '">\u2192</button>',
            '</div>',
            '<div class="product-body">',
                '<p class="product-meta">', p.categoryLabel, ' <i>·</i> ', p.metalLabel, '</p>',
                '<h3 class="product-title">', p.name, '</h3>',
                '<p class="product-desc">', p.desc, '</p>',
                '<p class="product-meta" style="letter-spacing:.14em">', p.material, '</p>',
                '<div class="product-foot">',
                    '<span class="product-price">', p.price, '<small>', p.note || 'Indicative range', '</small></span>',
                    '<a class="product-cta" href="#appointment" data-enquire="', p.name, '">Enquire</a>',
                '</div>',
            '</div>'
        ].join('');
        return card;
    }

    function ctaCard() {
        const el = document.createElement('article');
        el.className = 'product-card product-card--cta stagger';
        el.setAttribute('role', 'listitem');
        el.innerHTML = [
            '<h3>Looking for something rare?</h3>',
            '<p>Our vault holds certified stones and heirloom pieces that never reach the floor. Request a private viewing.</p>',
            '<a class="btn btn-primary" href="#appointment">Book a Private Viewing</a>'
        ].join('');
        return el;
    }

    function renderProducts() {
        const grid = $('#productsGrid');
        const list = PRODUCTS.filter((p) => {
            if (!state.facet || state.value === 'all') return true;
            return p[state.facet] === state.value;
        });

        grid.innerHTML = '';
        list.forEach((p, i) => grid.appendChild(productCard(p, i)));
        grid.appendChild(ctaCard());

        const count = $('#productCount');
        if (count) count.textContent = list.length;

        // stagger reveal for freshly rendered cards
        const cards = $$('.stagger', grid);
        if (!revealObserver || reduceMotion) {
            cards.forEach((el) => el.classList.add('in'));
        } else {
            requestAnimationFrame(() => cards.forEach((el) => el.classList.add('in')));
        }

        // prefill the enquiry form when a card is used
        $$('[data-enquire]', grid).forEach((a) => {
            a.addEventListener('click', () => prefillEnquiry(a.getAttribute('data-enquire')));
        });
        $$('.product-quick', grid).forEach((btn) => {
            btn.addEventListener('click', () => {
                const name = btn.closest('.product-card').querySelector('.product-title').textContent;
                prefillEnquiry(name);
                document.getElementById('appointment').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
            });
        });
    }

    function prefillEnquiry(name) {
        const box = $('#message');
        const purpose = $('#purpose');
        if (box) {
            box.value = 'I would like to enquire about the "' + name + '". Please share availability, certification and current pricing.';
        }
        if (purpose) purpose.value = /Bespoke|Atelier/i.test(name) ? 'custom' : 'engagement';
    }

    function renderSubFilters() {
        const wrap = $('#subFilters');
        wrap.innerHTML = '';

        if (!state.facet) {
            wrap.classList.remove('open');
            return;
        }

        FACETS[state.facet].values.forEach((v) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chip' + (v.value === state.value ? ' active' : '');
            chip.textContent = v.label;
            chip.addEventListener('click', () => {
                state.value = v.value;
                $$('.chip', wrap).forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                renderProducts();
            });
            wrap.appendChild(chip);
        });

        wrap.classList.add('open');
    }

    function initFilters() {
        $$('.filter-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                const filter = tab.getAttribute('data-filter');
                $$('.filter-tab').forEach((t) => {
                    const on = t === tab;
                    t.classList.toggle('active', on);
                    t.setAttribute('aria-selected', String(on));
                });

                if (filter === 'all') {
                    state.facet = null;
                    state.value = 'all';
                } else {
                    state.facet = filter;
                    state.value = 'all';
                }
                renderSubFilters();
                renderProducts();
            });
        });
    }

    /* ---------------------------------------------------------------------
       9. Testimonials
       --------------------------------------------------------------------- */
    function initTestimonials() {
        const grid = $('#testimonialsGrid');
        if (!grid) return;

        TESTIMONIALS.forEach((t) => {
            const initials = t.name.split(/\s+|&\s*/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
            const el = document.createElement('figure');
            el.className = 'testimonial stagger';
            el.innerHTML = [
                '<div class="testimonial-stars" aria-label="5 out of 5 stars">\u2726\u2726\u2726\u2726\u2726</div>',
                '<blockquote class="testimonial-quote">', t.quote, '</blockquote>',
                '<figcaption class="testimonial-author">',
                    '<span class="author-avatar" aria-hidden="true">', initials, '</span>',
                    '<span class="author-info">',
                        '<span class="author-name">', t.name, '</span>',
                        '<span class="author-meta">', t.meta, '</span>',
                    '</span>',
                '</figcaption>'
            ].join('');
            grid.appendChild(el);
        });

        const items = $$('.stagger', grid);
        if (!revealObserver || reduceMotion) {
            items.forEach((el) => el.classList.add('in'));
        } else {
            items.forEach((el, i) => {
                el.style.transitionDelay = i * 110 + 'ms';
                requestAnimationFrame(() => el.classList.add('in'));
            });
        }
    }

    /* ---------------------------------------------------------------------
       10. Stats counters
       --------------------------------------------------------------------- */
    function initCounters() {
        const nodes = $$('[data-count]');
        if (!nodes.length) return;

        const fmt = (v, decimals) => v.toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });

        const run = (el) => {
            const target = parseFloat(el.getAttribute('data-count'));
            const suffix = el.getAttribute('data-suffix') || '';
            const decimals = (el.getAttribute('data-decimals') | 0);
            if (reduceMotion) { el.textContent = fmt(target, decimals) + suffix; return; }
            const start = performance.now();
            const dur = 1500;
            (function tick(now) {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = fmt(target * eased, decimals) + suffix;
                if (p < 1) requestAnimationFrame(tick);
            })(start);
        };

        if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }

        const obs = new IntersectionObserver((entries, o) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                run(e.target);
                o.unobserve(e.target);
            });
        }, { threshold: 0.5 });
        nodes.forEach((n) => obs.observe(n));
    }

    /* ---------------------------------------------------------------------
       11. Appointment form → WhatsApp
       --------------------------------------------------------------------- */
    function initForm() {
        const form = $('#appointmentForm');
        if (!form) return;

        const dateInput = $('#date');
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        dateInput.min = today.toISOString().slice(0, 10);

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const required = $$('[required]', form);
            let firstBad = null;
            required.forEach((field) => {
                const bad = !field.value.trim();
                field.classList.toggle('invalid', bad);
                if (bad && !firstBad) firstBad = field;
            });
            if (firstBad) {
                firstBad.focus();
                return;
            }

            const data = new FormData(form);
            const lines = [
                '*Appointment Request — Alif Laam Meem Jewellers*',
                '',
                'Name: ' + (data.get('name') || '—'),
                'Phone: ' + (data.get('phone') || '—'),
                data.get('email') ? 'Email: ' + data.get('email') : null,
                'Purpose: ' + labelOf('#purpose', data.get('purpose')),
                'Preferred: ' + formatDate(data.get('date')) + ' at ' + labelOf('#time', data.get('time')),
                data.get('message') ? 'Note: ' + data.get('message') : null
            ].filter(Boolean);

            form.setAttribute('action', 'https://wa.me/' + BUSINESS.whatsapp);
            $('#whatsappMessage').value = lines.join('\n');

            const success = $('#formSuccess');
            if (success) {
                success.classList.add('show');
                success.textContent = 'Opening WhatsApp with your request — we confirm within 2 hours.';
            }

            window.open('https://wa.me/' + BUSINESS.whatsapp + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
            form.reset();
        });

        $$('input, select, textarea', form).forEach((field) => {
            field.addEventListener('input', () => field.classList.remove('invalid'));
        });
    }

    function labelOf(selector, value) {
        const el = $(selector);
        if (!el || !value) return value || '—';
        const opt = Array.from(el.options).find((o) => o.value === value);
        return opt ? opt.textContent.trim() : value;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    /* ---------------------------------------------------------------------
       12. Footer year
       --------------------------------------------------------------------- */
    function initYear() {
        $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    }

    /* ---------------------------------------------------------------------
       13. Boot
       --------------------------------------------------------------------- */
    function init() {
        initIcons();
        applyContactLinks();
        initNav();
        initReveal();
        initFilters();
        renderSubFilters();
        renderProducts();
        initTestimonials();
        initCounters();
        initForm();
        initYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
