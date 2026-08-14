(function () {
  'use strict';

  /* 0. EMPEZAR SIEMPRE EN LA PORTADA
     Por defecto el navegador guarda el scroll y te devuelve donde estabas al
     recargar. En una landing eso hace que caigas a mitad de pagina en vez de
     ver el hero. Los enlaces con # (ej: /#inscripcion) siguen funcionando. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var urlLimpia = location.pathname + location.search;

  /* Con restauracion manual el navegador deja de saltar solo al ancla,
     asi que si la URL trae un # lo resolvemos nosotros. Despues lo borramos
     de la barra de direcciones: si el # queda pegado, la proxima vez que
     abris la pagina el navegador te lleva a esa seccion y no a la portada. */
  if (location.hash) {
    window.addEventListener('load', function () {
      var destino = null;
      try { destino = document.querySelector(location.hash); } catch (_) {}
      // instant y no smooth: al abrir la pagina, animar 5000px seria lento y
      // desorientador. El scroll suave queda para los clics en el menu.
      if (destino) destino.scrollIntoView({ behavior: 'instant' });
      history.replaceState(null, '', urlLimpia);
    });
  }

  /* Los clics del menu tampoco deben dejar el # en la URL.
     Sin preventDefault a proposito: dejamos que el navegador haga el salto
     nativo (que ya funcionaba bien) y solo reescribimos la barra de
     direcciones despues. Asi no tocamos el mecanismo de scroll. */
  document.querySelectorAll('a[href^="#"]').forEach(function (enlace) {
    enlace.addEventListener('click', function () {
      setTimeout(function () {
        history.replaceState(null, '', urlLimpia);
      }, 0);
    });
  });

  /* 1. NAV — solid on scroll (throttled con rAF: como mucho una vez por frame) */
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    let ticking = false, solid = null;
    const apply = () => {
      ticking = false;
      const next = window.scrollY > 24;
      if (next === solid) return;        // no tocar el DOM si el estado no cambió
      solid = next;
      nav.classList.toggle('is-solid', next);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  /* 2. MOBILE MENU */
  const burger   = document.querySelector('[data-burger]');
  const mobile   = document.querySelector('[data-mobile]');
  const closeBtn = document.querySelector('[data-mobile-close]');
  const toggleMenu = (open) => {
    if (!mobile) return;
    mobile.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  if (burger)   burger.addEventListener('click', () => toggleMenu(true));
  if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));
  if (mobile)   mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* 3. REVEAL ON SCROLL */
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => {
      const parent = el.parentElement;
      const sibs = parent ? [...parent.children].filter(c => c.hasAttribute('data-reveal')) : [el];
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.setProperty('--d', (idx * 0.1) + 's');
      io.observe(el);
    });
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* 4. FORM → Google Apps Script */
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxHBRdNHz6PVMrRAbDaj8xl5wH5_h3rFHCQafYR_HKQ-WNBznq6ZkHQciN4heNVMhwClw/exec';
  const ARROW_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const form = document.querySelector('[data-form]');
  if (form) {
    const ok  = form.querySelector('[data-form-ok]');
    const err = form.querySelector('[data-form-err]');
    const btn = form.querySelector('[type=submit]');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = new FormData(form);
      const payload = new URLSearchParams({
        nombre:       d.get('nombre')       || '',
        email:        d.get('email')        || '',
        telefono:     d.get('telefono')     || '',
        organizacion: d.get('organizacion') || '',
        cargo:        d.get('cargo')        || '',
      });

      if (ok)  ok.classList.remove('show');
      if (err) err.classList.remove('show');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

      // Sin mode:'no-cors' a proposito: la respuesta de Apps Script es legible,
      // asi solo confirmamos cuando el envio realmente funciono.
      let enviado = false;
      try {
        const res  = await fetch(GAS_URL, { method: 'POST', body: payload });
        const data = await res.json().catch(() => ({}));
        enviado = res.ok && data.status === 'ok';
      } catch (_) {
        enviado = false;
      }

      if (btn) { btn.disabled = false; btn.innerHTML = 'Reservar mi lugar ' + ARROW_SVG; }
      if (enviado) {
        if (ok) ok.classList.add('show');
        form.reset();
      } else {
        // No limpiamos el formulario: la persona no pierde lo que escribio
        if (err) err.classList.add('show');
      }
    });
  }

  /* 5. YEAR */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
