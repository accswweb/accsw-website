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
  });
})();
