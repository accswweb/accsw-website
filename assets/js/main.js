/**
 * Austin Chinese Church Southwest - Main JavaScript
 */

(() => {
  // 1. Instant Language-Based Root Redirect (index.html -> zh/ or en/)
  if (document.documentElement.hasAttribute('data-lang-redirect')) {
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    window.location.replace(browserLang.startsWith('zh') ? 'zh/' : 'en/');
    return;
  }

  // Shared Bulletin Discovery Utilities
  const STORAGE_KEY = 'accsw_latest_bulletin';

  function getCandidateSundays() {
    const candidates = [];
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7;

    for (let offset = 4; offset >= -16; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday + offset * 7);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      candidates.push(`SW-${year}-${month}-${date}.pdf`);
    }
    return candidates;
  }

  async function probeFile(url) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      if (res.ok) return true;
      if (res.status === 405) {
        const ctrl = new AbortController();
        const getRes = await fetch(url, { method: 'GET', signal: ctrl.signal, cache: 'no-cache' });
        ctrl.abort();
        return getRes.ok;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async function resolveLatestBulletin(basePath = '') {
    const candidates = getCandidateSundays();
    const BATCH_SIZE = 4;
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (fname) => ({
          fname,
          exists: await probeFile(basePath + fname),
        }))
      );
      for (const item of results) {
        if (item.exists) {
          try {
            sessionStorage.setItem(STORAGE_KEY, item.fname);
          } catch (e) {}
          return item.fname;
        }
      }
    }
    return null;
  }

  // 2. Instant Bulletin Redirect Page (bulletins/index.html)
  const bulletinFallback = document.documentElement.dataset.bulletinRedirect;
  if (bulletinFallback) {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        window.location.replace(cached);
        return;
      }
    } catch (e) {}

    resolveLatestBulletin('').then((latest) => {
      window.location.replace(latest || bulletinFallback);
    });
    return;
  }

  // 3. Standard Page Initialization
  document.addEventListener('DOMContentLoaded', () => {
    const createSwirlSvg = (className, viewBox, preserveAspectRatio, paths) => {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', className);
      svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('preserveAspectRatio', preserveAspectRatio);
      svg.setAttribute('aria-hidden', 'true');

      paths.forEach(([pathClass, d]) => {
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('class', pathClass);
        path.setAttribute('d', d);
        svg.appendChild(path);
      });

      return svg;
    };

    // Homepage Top Flow (Hero + Hope Section) Two-Sided Purple Swirl Renderer
    document.querySelectorAll('.home-top-flow').forEach((flow) => {
      if (flow.querySelector('.home-swirl-right')) return;

      const rightSvg = createSwirlSvg('home-swirl-right', '0 0 620 840', 'xMaxYMin meet', [
        [
          'hero-swirl-outer',
          'M384 0C357 58 320 92 288 138C255 184 241 252 246 334C250 416 281 498 321 566C361 634 408 696 460 742C512 788 569 802 620 744L620 0Z',
        ],
        [
          'hero-swirl-inner',
          'M465 0C444 46 413 78 389 128C366 178 361 248 373 318C386 388 417 454 451 512C486 570 526 618 568 626C590 630 608 608 620 568L620 0Z',
        ],
      ]);

      const leftSvg = createSwirlSvg('home-swirl-left', '0 0 420 680', 'xMinYMax meet', [
        [
          'hero-swirl-outer',
          'M0 0C30 38 66 64 104 96C153 136 206 186 231 272C255 358 253 468 221 544C188 620 134 658 77 662C42 664 16 646 0 608Z',
        ],
        [
          'hero-swirl-inner',
          'M0 115C24 148 53 172 84 204C123 244 161 296 172 368C184 440 169 518 135 558C102 598 57 600 24 572C12 562 5 548 0 532Z',
        ],
      ]);

      flow.insertBefore(leftSvg, flow.firstChild);
      flow.insertBefore(rightSvg, flow.firstChild);
      flow.classList.add('has-swirl-bg');
    });

    // Subpage Hero Subtle Purple Swirl Background Renderer (.page-hero & .move-hero)
    document.querySelectorAll('.page-hero, .move-hero').forEach((subHero) => {
      if (subHero.querySelector('.page-swirl-left')) return;

      const leftSvg = createSwirlSvg('page-swirl-left', '0 0 460 360', 'xMinYMin meet', [
        [
          'page-swirl-outer',
          'M286 0C264 58 226 96 185 128C143 160 108 214 69 262C42 296 18 322 0 336L0 0Z',
        ],
        [
          'page-swirl-inner',
          'M198 0C181 46 150 78 116 108C82 138 47 184 0 218L0 0Z',
        ],
      ]);

      subHero.insertBefore(leftSvg, subHero.firstChild);
      subHero.classList.add('has-swirl-bg');
    });

    const header = document.querySelector('.site-header');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobileDrawer = document.querySelector('.mobile-drawer');

    // Mobile Navigation Toggle
    if (mobileToggle && mobileDrawer) {
      const closeDrawer = () => {
        mobileToggle.classList.remove('active');
        mobileDrawer.classList.remove('active');
        if (header) header.classList.remove('drawer-open');
        document.body.style.overflow = '';
      };

      mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = mobileToggle.classList.toggle('active');
        mobileDrawer.classList.toggle('active', isActive);
        if (header) header.classList.toggle('drawer-open', isActive);
        document.body.style.overflow = isActive ? 'hidden' : '';
      });

      mobileDrawer.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeDrawer);
      });

      document.addEventListener('click', (e) => {
        if (
          mobileDrawer.classList.contains('active') &&
          !mobileDrawer.contains(e.target) &&
          !mobileToggle.contains(e.target)
        ) {
          closeDrawer();
        }
      });
    }

    // External Links: Ensure target="_blank" and rel="noopener noreferrer"
    const currentHost = window.location.hostname;
    document.querySelectorAll('a[href^="http://"], a[href^="https://"], a[href^="//"]').forEach((link) => {
      try {
        const url = new URL(link.getAttribute('href').trim(), window.location.href);
        if (url.hostname !== currentHost) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      } catch (e) {}
    });

    // Header Dynamic Height & Scroll State Management
    if (header) {
      const updateHeaderHeight = () => {
        document.documentElement.style.setProperty('--header-actual-height', `${header.offsetHeight}px`);
      };

      const updateHeaderState = () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
      };

      updateHeaderState();
      updateHeaderHeight();

      window.addEventListener('scroll', updateHeaderState, { passive: true });
      window.addEventListener('resize', updateHeaderHeight, { passive: true });
      window.addEventListener('orientationchange', updateHeaderHeight, { passive: true });
      window.addEventListener('load', updateHeaderHeight);

      window.toggleAnnouncementBanner = (show) => {
        if (!document.querySelector('.announcement-banner')) return;
        const willShow = typeof show === 'boolean' ? show : header.classList.contains('banner-off');
        header.classList.toggle('banner-off', !willShow);
        updateHeaderHeight();
      };
    }

    // Bilingual Page Language Switcher (/move/)
    const btnLangEn = document.getElementById('btnLangEn');
    const btnLangZh = document.getElementById('btnLangZh');
    if (btnLangEn && btnLangZh) {
      const setLanguage = (lang) => {
        const isZh = lang === 'zh';
        document.documentElement.lang = isZh ? 'zh' : 'en';
        btnLangZh.classList.toggle('active', isZh);
        btnLangEn.classList.toggle('active', !isZh);
        try {
          localStorage.setItem('accsw_move_lang', isZh ? 'zh' : 'en');
        } catch (e) {}
      };

      const toggleLanguage = () => {
        setLanguage(document.documentElement.lang === 'zh' ? 'en' : 'zh');
      };

      btnLangEn.addEventListener('click', () => setLanguage('en'));
      btnLangZh.addEventListener('click', () => setLanguage('zh'));
      document.querySelectorAll('button.lang-switch').forEach((btn) => {
        btn.addEventListener('click', toggleLanguage);
      });

      const urlParams = new URLSearchParams(window.location.search);
      const paramLang = urlParams.get('lang');
      const hash = (window.location.hash || '').toLowerCase();
      let storedLang = null;
      try {
        storedLang = localStorage.getItem('accsw_move_lang');
      } catch (e) {}

      if (paramLang === 'zh' || hash.includes('zh') || storedLang === 'zh') {
        setLanguage('zh');
      } else if (paramLang === 'en' || hash.includes('en') || storedLang === 'en') {
        setLanguage('en');
      } else {
        const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        setLanguage(browserLang.startsWith('zh') ? 'zh' : 'en');
      }
    }

    // Dynamic Client-Side Bulletin Link Updater (navbar & home page cards)
    const bulletinLinks = Array.from(document.querySelectorAll('a[href*="bulletins/"]'));
    if (bulletinLinks.length > 0) {
      let bulletinsBase = '../bulletins/';
      const sampleHref = bulletinLinks[0].getAttribute('href') || '';
      const idx = sampleHref.indexOf('bulletins/');
      if (idx !== -1) {
        bulletinsBase = sampleHref.substring(0, idx + 'bulletins/'.length);
      }

      let resolvedFilename = null;
      try {
        resolvedFilename = sessionStorage.getItem(STORAGE_KEY);
      } catch (e) {}

      const applyBulletinFilename = (filename) => {
        if (!filename) return;
        resolvedFilename = filename;
        bulletinLinks.forEach((link) => {
          link.setAttribute('href', bulletinsBase + filename);
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        });
      };

      if (resolvedFilename) {
        applyBulletinFilename(resolvedFilename);
      }

      const resolvePromise = resolveLatestBulletin(bulletinsBase).then((latest) => {
        if (latest) applyBulletinFilename(latest);
        return latest;
      });

      bulletinLinks.forEach((link) => {
        link.addEventListener('click', async (e) => {
          if (resolvedFilename) {
            link.setAttribute('href', bulletinsBase + resolvedFilename);
            return;
          }
          e.preventDefault();
          try {
            const timeout = new Promise((resolve) => setTimeout(resolve, 400));
            const found = await Promise.race([resolvePromise, timeout]);
            const target = found ? bulletinsBase + found : link.getAttribute('href');
            window.open(target, '_blank', 'noopener,noreferrer');
          } catch (err) {
            window.open(link.getAttribute('href'), '_blank', 'noopener,noreferrer');
          }
        });
      });
    }

    // Minimal Black & White Google Maps (About Page & Move Page)
    const aboutMapEl = document.getElementById('about-campus-map');
    const moveMapEl = document.getElementById('move-campus-map');
    if (aboutMapEl || moveMapEl) {
      const starSvg =
        '<svg class="campus-map-star" viewBox="0 0 36 36" aria-hidden="true">' +
        '<polygon points="18,2 22.4,12.8 34,13.6 25,21.2 27.9,32.6 18,26.3 8.1,32.6 11,21.2 2,13.6 13.6,12.8" fill="#642992" stroke="#1E1E1E" stroke-width="1.4" stroke-linejoin="round"/>' +
        '</svg>';

      const createStyledMap = (container) => {
        const map = window.L.map(container, {
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: true,
        });

        if (map.attributionControl) {
          map.attributionControl.setPrefix(false);
        }

        container.addEventListener('click', () => map.scrollWheelZoom.enable());
        container.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

        window.L.tileLayer(
          'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&apistyle=s.e:l%7Cp.v:off%2Cs.e:g%7Cp.s:-100%2Cs.t:6%7Cs.e:g%7Cp.c:%23c4d7ea',
          {
            subdomains: '0123',
            maxZoom: 18,
            minZoom: 9,
            attribution: 'Map data &copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google</a>',
          }
        ).addTo(map);

        return map;
      };

      const addCampusMarker = (map, item) => {
        const eyebrowHtml = item.eyebrow ? `<span class="campus-map-eyebrow">${item.eyebrow}</span>` : '';
        const subHtml = item.sub ? `<span class="campus-map-sub">${item.sub}</span>` : '';
        const html =
          `<a class="campus-map-marker" href="${item.url}" target="_blank" rel="noopener noreferrer">` +
          starSvg +
          `<span class="campus-map-label">` +
          eyebrowHtml +
          `<span class="campus-map-title">${item.title}</span>` +
          subHtml +
          `</span>` +
          `</a>`;

        const icon = window.L.divIcon({
          className: 'campus-map-icon',
          html,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        window.L.marker(item.coords, { icon }).addTo(map);
      };

      const initMaps = () => {
        if (!window.L) return;

        if (aboutMapEl) {
          const isZh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
          const map = createStyledMap(aboutMapEl);
          const campuses = [
            {
              coords: [30.371068, -97.6675702],
              eyebrow: isZh ? '奧斯汀華人教會' : 'Austin Chinese Church',
              title: isZh ? '主堂區' : 'Main Campus',
              sub: '',
              url: 'https://goo.gl/maps/uURzsBEcegnbRWWK6',
            },
            {
              coords: [30.289556, -97.801686],
              eyebrow: isZh ? '奧斯汀華人教會' : 'Austin Chinese Church',
              title: isZh ? '西南區' : 'Southwest Campus',
              sub: 'Cedar Creek Elementary',
              url: 'https://goo.gl/maps/671dHTtcB1BxRE528',
            },
          ];

          campuses.forEach((c) => addCampusMarker(map, c));

          const bounds = window.L.latLngBounds(campuses.map((c) => c.coords));
          const fitAboutMap = () => {
            const isNarrow = aboutMapEl.offsetWidth < 420;
            map.fitBounds(bounds, {
              paddingTopLeft: [isNarrow ? 32 : 48, 52],
              paddingBottomRight: [isNarrow ? 185 : 225, 52],
              animate: false,
            });
          };

          fitAboutMap();
          window.addEventListener('resize', () => {
            map.invalidateSize();
            fitAboutMap();
          }, { passive: true });
        }

        if (moveMapEl) {
          const map = createStyledMap(moveMapEl);
          const valleyViewCoords = [30.28102, -97.82671];

          addCampusMarker(map, {
            coords: valleyViewCoords,
            eyebrow: '<span class="lang-en">Austin Chinese Church</span><span class="lang-zh">奧斯汀華人教會</span>',
            title: '<span class="lang-en">New Southwest Campus</span><span class="lang-zh">西南區新聚會地點</span>',
            sub: 'Valley View Elementary',
            url: 'https://www.google.com/maps/search/?api=1&query=Valley+View+Elementary+School+1201+S+Capital+of+Texas+Hwy+Austin+TX+78746',
          });

          const centerMoveMap = () => {
            map.setView(valleyViewCoords, 13, { animate: false });
            map.panBy([95, 0], { animate: false });
          };

          centerMoveMap();
          window.addEventListener('resize', () => {
            map.invalidateSize();
            centerMoveMap();
          }, { passive: true });
        }
      };

      if (window.L) {
        initMaps();
      } else {
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.crossOrigin = '';
          document.head.appendChild(link);
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin = '';
        script.onload = initMaps;
        document.head.appendChild(script);
      }
    }
  });
})();
