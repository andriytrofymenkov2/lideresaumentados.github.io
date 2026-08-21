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
    /* El margen inferior define CUANDO arranca la animacion y es un
       equilibrio fino:
         · muy positivo (ej. +200px) => arranca fuera de pantalla y para
           cuando lo ves ya termino: el efecto no se aprecia.
         · muy negativo (el -6% original) => arranca cuando el elemento ya
           esta bien adentro y lo ves saltar de golpe.
       -80px lo dispara apenas el elemento entra: la subida y el fundido
       ocurren delante tuyo, que es lo que se quiere ver. */
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('is-visible');
      });
    }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
    reveals.forEach(el => {
      const parent = el.parentElement;
      const sibs = parent ? [...parent.children].filter(c => c.hasAttribute('data-reveal')) : [el];
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.setProperty('--d', (idx * 0.13) + 's');
      io.observe(el);
    });
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* 3b. PAUSAR ANIMACIONES DEL HERO CUANDO SALE DE PANTALLA
     Las formas flotantes y el punto que late solo existen en el hero, pero sus
     animaciones son infinitas: sin esto siguen ocupando la GPU durante los
     ~7300px de pagina que hay debajo. */
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      document.body.classList.toggle('anim-off', !e.isIntersecting);
    }, { threshold: 0 }).observe(hero);
  }

  /* 3c. CARRUSEL DE SPONSORS — CSS compositor animation (60 fps garantizados).
     JS solo hace dos cosas: setear el valor exacto en px de la mitad del track
     (elimina el micro-jitter que da el porcentaje) y controlar play/pause via
     clase cuando el carrusel sale de pantalla o la pestaña va a segundo plano. */
  (function () {
    const wrap = document.querySelector('.sponsors__track-wrap');
    if (!wrap) return;
    const tracks = wrap.querySelectorAll('.sponsors__track');
    if (!tracks.length) return;

    let inView = true;
    function setPaused(p) { tracks.forEach(t => t.classList.toggle('is-paused', p)); }
    function updatePause() { setPaused(!inView || document.hidden); }

    document.addEventListener('visibilitychange', updatePause);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; updatePause(); }, { threshold: 0 }).observe(wrap);
    }
  }());

  /* 4. FORM → Google Apps Script */
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzIR95vvyI3ZWXSC6Oiy0SaD-2iHfAh5fmEYNTdkbWXpM6Z9gsI6AXrNsXUSWKJ867hfg/exec';
  const ARROW_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const form = document.querySelector('[data-form]');
  if (form) {
    const ok  = form.querySelector('[data-form-ok]');
    const err = form.querySelector('[data-form-err]');
    const btn = form.querySelector('[type=submit]');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      /* El cuerpo se arma recorriendo el propio formulario, no enumerando los
         campos a mano. Con la lista fija, cualquier desfasaje entre el HTML y
         esta funcion hacia que un dato se perdiera EN SILENCIO: el navegador
         validaba la pregunta como obligatoria, la persona la respondia, y aun
         asi nunca viajaba. Asi todo campo con name viaja solo, y agregar una
         pregunta nueva al HTML no requiere tocar nada aca. */
      const payload = new URLSearchParams();
      new FormData(form).forEach((valor, clave) => payload.append(clave, valor));

      if (ok)  ok.classList.remove('show');
      if (err) err.classList.remove('show');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

      let enviado = false;
      try {
        await fetch(GAS_URL, { method: 'POST', body: payload });
        enviado = true;
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

  /* 6. MAPA — se carga solo al acercarse la seccion de inscripcion.
     El iframe no esta en el HTML porque Google Maps baja sus propios scripts
     y tiles apenas existe, y eso encarecia el arranque de toda la pagina. */
  (function () {
    const facade = document.getElementById('js-map-facade');
    if (!facade) return;
    const SRC = 'https://maps.google.com/maps?q=C%C3%A1mara+de+Comercio+R%C3%ADo+Gallegos+Santa+Cruz+Argentina&t=&z=15&ie=UTF8&iwloc=&output=embed';

    function cargar() {
      const wrap = facade.closest('.cta-map');
      if (!wrap || !wrap.contains(facade)) return;
      const iframe = document.createElement('iframe');
      iframe.src = SRC;
      iframe.title = 'Ubicación: Auditorio del CCIARG · 9 de Julio 32 · Río Gallegos';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      /* Sin loading="lazy" a proposito: nosotros ya decidimos el momento de
         cargarlo. Con lazy, el navegador aplicaba ADEMAS su propio criterio y
         posponia la descarga hasta tener el mapa casi encima, que es
         justamente lo que queremos evitar. */
      wrap.replaceChild(iframe, facade);
    }

    if ('IntersectionObserver' in window) {
      /* Observamos la seccion de inscripcion entera, no el mapa: el mapa esta
         al final de la seccion, asi que apenas asoma el bloque de inscripcion
         ya empezamos a pedirlo y quedan ~1500px de scroll por delante. Cuando
         llegas abajo el mapa ya esta dibujado. */
      const disparador = document.getElementById('inscripcion') || facade.closest('.cta-map');
      const io = new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        cargar();
      }, { rootMargin: '400px 0px', threshold: 0 });
      io.observe(disparador);
    } else {
      cargar();
    }
  }());

  /* 7. COUNTDOWN */
  (function () {
    const wrap  = document.getElementById('js-countdown-wrap');
    const elD   = document.getElementById('js-cd-days');
    const elH   = document.getElementById('js-cd-hours');
    const elM   = document.getElementById('js-cd-mins');
    const elS   = document.getElementById('js-cd-secs');
    if (!wrap || !elD) return;
    const EVENT = new Date('2026-09-05T10:00:00-03:00');
    const pad   = n => String(n).padStart(2, '0');
    function tick() {
      const diff = EVENT - new Date();
      if (diff <= 0) { wrap.hidden = true; return; }
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      const s = Math.floor((diff % 6e4) / 1e3);
      elD.textContent = pad(d);
      elH.textContent = pad(h);
      elM.textContent = pad(m);
      if (elS) elS.textContent = pad(s);
      wrap.hidden = false;
    }
    /* El contador solo corre mientras se lo ve.
       Antes el setInterval reescribia cuatro nodos del hero UNA VEZ POR
       SEGUNDO durante toda la vida de la pagina, incluso estando a miles de
       pixeles de distancia. Cada una de esas escrituras era trabajo de hilo
       principal que caia en medio de un frame de scroll o de carrusel: se
       sentia como un tironcito rítmico. Fuera de pantalla no hay nada que
       mostrar, asi que directamente no corre. Al volver hace un tick
       inmediato, por lo que nunca se ve un valor viejo. */
    let timer = null;
    function arrancar() {
      if (timer) return;
      tick();
      timer = setInterval(tick, 1000);
    }
    function frenar() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    let aLaVista = true;
    function evaluar() {
      (aLaVista && !document.hidden) ? arrancar() : frenar();
    }

    /* Se observa el CONTENEDOR, no el contador.
       Dos motivos: el contador arranca con [hidden], y un elemento sin caja
       nunca intersecta, asi que el observador no dispararia jamas. Y ademas
       este bloque ya no vive dentro del hero (ahora va debajo del carrusel),
       de modo que atarlo al hero lo dejaria congelado en 00 justo cuando lo
       tenes delante. */
    const contenedor = wrap.closest('.hero__bar') || wrap.parentElement;
    if (contenedor && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        aLaVista = e.isIntersecting;
        evaluar();
      }, { threshold: 0 }).observe(contenedor);
    }

    // Pestaña en segundo plano: tampoco tiene sentido seguir contando.
    document.addEventListener('visibilitychange', evaluar);
    // evaluar y no arrancar: si la pagina abre en una pestaña de fondo,
    // no debe ponerse a contar hasta que alguien la mire.
    evaluar();
  }());

})();
