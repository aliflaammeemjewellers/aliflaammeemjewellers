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
       2. COLLECTION DATA  —  your pieces go here

       There are no products in the site yet, so the showcase shows a
       placeholder. Add one object per piece and the filters, cards, prices
       and enquiry buttons build themselves.

       Photos live in the assets/ folder. Copy this template, fill it in and
       delete the surrounding comment markers:

       {
           name: 'Kundan Bridal Set',
           material: '22K Gold · Uncut Diamonds',
           category: 'bridal', categoryLabel: 'Bridal Sets',
           metal: 'gold', metalLabel: 'Gold',
           occasion: 'wedding',
           desc: 'Layered necklace with matching earrings and maang tikka.',
           price: '\u20B94,80,000 – \u20B98,50,000',
           badge: 'Bridal',              // optional ribbon, '' for none
           img: 'assets/bridal-set.jpg', // leave '' to show an image placeholder
           imgHint: 'assets/bridal-set.jpg',
           alt: 'Kundan bridal necklace set with matching earrings'
       },
       --------------------------------------------------------------------- */
    const PRODUCTS = [];

    /* Filter options. Keep these in step with the values used above. */
    const FACETS = {
        type: {
            label: 'Type',
            values: [
                { value: 'all', label: 'All Types' },
                { value: 'bridal', label: 'Bridal Sets' },
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
            quote: 'They spent two hours with us without any pressure to buy. We came back a week later for the bridal set and the craftsmanship was exactly as promised.',
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
       3. Icon set — inline SVG, drawn in the current text colour
       --------------------------------------------------------------------- */
    const ICONS = {
        image:    '<rect x="3" y="4.6" width="18" height="14.8" rx="2"/><circle cx="8.6" cy="10" r="1.8"/><path d="m3.6 17.4 4.9-4.6 4 3.6 3.1-2.6 4.8 4.2"/>',
        diamond:  '<path d="M7.2 3.5h9.6L21 9.4 12 20.8 3 9.4z"/><path d="M3 9.4h18"/><path d="M12 20.8 9.4 9.4 12 3.5l2.6 5.9z"/>',
        check:    '<polyline points="4.5 12.5 9.7 17.8 19.5 6.6"/>',
        chat:     '<path d="M20.2 11.7a8.1 8.1 0 0 1-11.8 7.2L4 20l1.1-4.3A8.1 8.1 0 1 1 20.2 11.7z"/><path d="M8.6 11.6h6.8M8.6 14.6h4.2"/>',
        phone:    '<path d="M6.2 3.4h3l1.5 3.9-2 1.5a11.3 11.3 0 0 0 4.9 4.9l1.5-2 3.9 1.5v3a2 2 0 0 1-2.2 2A15.2 15.2 0 0 1 4.2 5.6a2 2 0 0 1 2-2.2z"/>',
        instagram:'<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.1" cy="6.9" r="1.05" fill="currentColor" stroke="none"/>',
        facebook: '<path d="M14.6 8.6h2.6V5.4h-2.6a3.6 3.6 0 0 0-3.6 3.6v1.9H8.6v3.1h2.4v6.6h3.1v-6.6h2.5l.5-3.1h-3V9.4a.8.8 0 0 1 .5-.8z"/>',
        youtube:  '<rect x="2.6" y="5.6" width="18.8" height="12.8" rx="4"/><path d="M10.6 9.4 15.4 12l-4.8 2.6z"/>',
        pin:      '<path d="M12 21s6.9-6.1 6.9-10.9A6.9 6.9 0 0 0 5.1 10.1C5.1 14.9 12 21 12 21z"/><circle cx="12" cy="10.1" r="2.6"/>',
        mail:     '<rect x="3" y="5.6" width="18" height="12.8" rx="2"/><path d="m3.7 6.9 8.3 5.9 8.3-5.9"/>'
    };

    /* Filled four-point star used for brand marks and rating rows */
    const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
                 '<path d="M12 1.8 14.5 9.5 22.2 12 14.5 14.5 12 22.2 9.5 14.5 1.8 12 9.5 9.5Z"/></svg>';

    function iconSvg(name) {
        const body = ICONS[name];
        if (!body) return '';
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" ' +
               'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
               body + '</svg>';
    }

    function paintIcons(root) {
        (root || document).querySelectorAll('[data-icon]').forEach((el) => {
            if (el.firstElementChild) return;              // already painted
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

    const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);

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
    const emptyMarkup = $('#catalogEmpty') ? $('#catalogEmpty').outerHTML : '';

    function mediaMarkup(p) {
        if (p.img) {
            return '<img src="' + escapeHtml(p.img) + '" alt="' + escapeHtml(p.alt || p.name) +
                   '" loading="lazy" decoding="async">';
        }
        return '<div class="ph">' +
                   '<span class="ph-icon" data-icon="image" aria-hidden="true"></span>' +
                   '<span class="ph-file">' + escapeHtml(p.imgHint || 'assets/your-piece.jpg') + '</span>' +
               '</div>';
    }

    function productCard(p, index) {
        const card = document.createElement('article');
        card.className = 'product-card stagger';
        card.setAttribute('role', 'listitem');
        card.style.transitionDelay = Math.min(index * 70, 420) + 'ms';
        card.innerHTML = [
            '<div class="product-media">',
                mediaMarkup(p),
                p.badge ? '<span class="product-badge">' + escapeHtml(p.badge) + '</span>' : '',
                '<button class="product-quick" type="button" aria-label="Enquire about ', escapeHtml(p.name), '">\u2192</button>',
            '</div>',
            '<div class="product-body">',
                '<p class="product-meta">', escapeHtml(p.categoryLabel), ' <i>·</i> ', escapeHtml(p.metalLabel), '</p>',
                '<h3 class="product-title">', escapeHtml(p.name), '</h3>',
                '<p class="product-desc">', escapeHtml(p.desc), '</p>',
                '<p class="product-meta" style="letter-spacing:.14em">', escapeHtml(p.material), '</p>',
                '<div class="product-foot">',
                    '<span class="product-price">', escapeHtml(p.price),
                        '<small>', escapeHtml(p.note || 'Indicative range'), '</small>',
                    '</span>',
                    '<a class="product-cta" href="#appointment" data-enquire="', escapeHtml(p.name), '">Enquire</a>',
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

        if (!PRODUCTS.length) {
            // Nothing added yet — show the setup panel instead of an empty grid.
            if (emptyMarkup) grid.insertAdjacentHTML('afterbegin', emptyMarkup);
        } else {
            list.forEach((p, i) => grid.appendChild(productCard(p, i)));
            grid.appendChild(ctaCard());
        }

        // Filters and the counter only make sense once pieces exist.
        const tabs  = $('#filterTabs');
        const count = $('#gridCount');
        if (tabs)  tabs.style.display  = PRODUCTS.length ? '' : 'none';
        if (count) count.style.display = PRODUCTS.length ? '' : 'none';
        const counter = $('#productCount');
        if (counter) counter.textContent = list.length;

        paintIcons(grid);

        // Reveal the freshly rendered cards.
        const items = $$('.stagger', grid);
        if (!revealObserver || reduceMotion) {
            items.forEach((el) => el.classList.add('in'));
        } else {
            requestAnimationFrame(() => items.forEach((el) => el.classList.add('in')));
        }

        // Pre-fill the enquiry form when a card is used.
        $$('[data-enquire]', grid).forEach((a) => {
            a.addEventListener('click', () => prefillEnquiry(a.getAttribute('data-enquire')));
        });
        $$('.product-quick', grid).forEach((btn) => {
            btn.addEventListener('click', () => {
                const title = $('.product-title', btn.closest('.product-card'));
                if (title) prefillEnquiry(title.textContent);
                $('#appointment').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
            });
        });
    }

    function prefillEnquiry(name) {
        const box = $('#message');
        const purpose = $('#purpose');
        if (box) {
            box.value = 'I would like to enquire about the "' + name + '". Please share availability, certification and current pricing.';
        }
        if (purpose) purpose.value = /Bespoke|Atelier|Design/i.test(name) ? 'custom' : 'bridal';
    }

    function renderSubFilters() {
        const wrap = $('#subFilters');
        wrap.innerHTML = '';

        if (!state.facet || !PRODUCTS.length) {
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

                state.facet = filter === 'all' ? null : filter;
                state.value = 'all';
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
                '<div class="testimonial-stars" aria-label="5 out of 5 stars">' + STAR.repeat(5) + '</div>',
                '<blockquote class="testimonial-quote">', escapeHtml(t.quote), '</blockquote>',
                '<figcaption class="testimonial-author">',
                    '<span class="author-avatar" aria-hidden="true">', escapeHtml(initials), '</span>',
                    '<span class="author-info">',
                        '<span class="author-name">', escapeHtml(t.name), '</span>',
                        '<span class="author-meta">', escapeHtml(t.meta), '</span>',
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
       10. Appointment form → WhatsApp
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
       11. Footer year
       --------------------------------------------------------------------- */
    function initYear() {
        $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    }

    /* ---------------------------------------------------------------------
       12. Boot
       --------------------------------------------------------------------- */
    function init() {
        paintIcons(document);
        applyContactLinks();
        initNav();
        initReveal();
        initFilters();
        renderSubFilters();
        renderProducts();
        initTestimonials();
        initForm();
        initYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
