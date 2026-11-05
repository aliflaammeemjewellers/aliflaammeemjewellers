/* Mobile menu for the hand-written auth pages (kept external for the Content-Security-Policy). */
(() => {
  const button = document.getElementById('mobileMenuBtn');
  const links = document.getElementById('navLinks');
  if (!button || !links) return;

  const setMenu = (open) => {
    button.setAttribute('aria-expanded', String(open));
    links.classList.toggle('open', open);
    document.body.classList.toggle('no-scroll', open);
  };

  button.addEventListener('click', () => {
    setMenu(button.getAttribute('aria-expanded') !== 'true');
  });
  links.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      setMenu(false);
      button.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860 && links.classList.contains('open')) setMenu(false);
  });
})();
