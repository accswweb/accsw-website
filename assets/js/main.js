/**
 * Austin Chinese Church Southwest - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = mobileToggle.classList.toggle('active');
      mobileDrawer.classList.toggle('active', isActive);
      const siteHeader = document.querySelector('.site-header');
      if (siteHeader) {
        siteHeader.classList.toggle('drawer-open', isActive);
      }
      document.body.style.overflow = isActive ? 'hidden' : '';
    });

    // Close when clicking on any link inside mobile drawer
    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileDrawer.classList.remove('active');
        const siteHeader = document.querySelector('.site-header');
        if (siteHeader) siteHeader.classList.remove('drawer-open');
        document.body.style.overflow = '';
      });
    });

    // Close when clicking outside mobile drawer
    document.addEventListener('click', (e) => {
      if (mobileDrawer.classList.contains('active') && !mobileDrawer.contains(e.target) && !mobileToggle.contains(e.target)) {
        mobileToggle.classList.remove('active');
        mobileDrawer.classList.remove('active');
        const siteHeader = document.querySelector('.site-header');
        if (siteHeader) siteHeader.classList.remove('drawer-open');
        document.body.style.overflow = '';
      }
    });
  }

  // External Links: Ensure target="_blank" and rel="noopener noreferrer"
  const currentHost = window.location.hostname;
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href').trim();
    // Check if link is external or explicitly an external service
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('//')
    ) {
      try {
        const url = new URL(href, window.location.href);
        // If domain is different from current site or points to external subdomains/services
        if (
          url.hostname !== currentHost ||
          url.hostname.includes('churchcenter.com') ||
          url.hostname.includes('youtube.com') ||
          url.hostname.includes('google.com') ||
          url.hostname.includes('acc.church') ||
          url.hostname === 'austinchinesechurch.org'
        ) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      } catch (e) {
        // Fallback for invalid URLs
      }
    }
  });

  // Header Scroll State: Clear navbar until scrolled down
  const header = document.querySelector('.site-header');
  if (header) {
    const updateHeaderState = () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  // Dynamic Client-Side Bulletin Discovery:
  // Automatically determines and updates the navbar Bulletin link to the latest PDF
  // without requiring any website rebuild when new bulletins are uploaded.
  const bulletinLinks = Array.from(document.querySelectorAll('.nav-menu .nav-link')).filter(
    (el) => el.textContent.trim() === 'Bulletin' || el.textContent.trim() === '主日週報'
  );

  if (bulletinLinks.length > 0) {
    // 1. Determine relative path to the bulletins directory from the current page
    let bulletinsBase = '';
    const sampleHref = bulletinLinks[0].getAttribute('href') || '';
    const idx = sampleHref.indexOf('bulletins/');
    if (idx !== -1) {
      bulletinsBase = sampleHref.substring(0, idx + 'bulletins/'.length);
    } else {
      const cssLink = document.querySelector('link[rel="stylesheet"]');
      if (cssLink) {
        const cssHref = cssLink.getAttribute('href') || '';
        const aIdx = cssHref.indexOf('assets/');
        if (aIdx !== -1) {
          bulletinsBase = cssHref.substring(0, aIdx) + 'bulletins/';
        }
      }
    }
    if (!bulletinsBase) bulletinsBase = '../bulletins/';

    // 2. Check session cache for instant application
    let resolvedFilename = null;
    try {
      resolvedFilename = sessionStorage.getItem('accsw_latest_bulletin');
    } catch (e) {}

    const applyBulletinFilename = (filename) => {
      if (!filename) return;
      resolvedFilename = filename;
      try {
        sessionStorage.setItem('accsw_latest_bulletin', filename);
      } catch (e) {}
      bulletinLinks.forEach((link) => {
        link.setAttribute('href', bulletinsBase + filename);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
    };

    if (resolvedFilename) {
      applyBulletinFilename(resolvedFilename);
    }

    // 3. Candidate Sunday generator (+4 weeks in future down to -16 weeks in past)
    function getCandidateSundays() {
      const candidates = [];
      const now = new Date();
      const day = now.getDay();
      const daysUntilSunday = (7 - day) % 7;

      for (let offset = 4; offset >= -16; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday + (offset * 7));
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        candidates.push(`SW-${year}-${month}-${date}.pdf`);
      }
      return candidates;
    }

    // 4. Lightweight HTTP probe to check if a file exists
    async function probeFile(url) {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        if (res.ok) return true;
        if (res.status === 405) {
          // Fallback if server disallows HEAD requests
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

    // 5. Multi-tier dynamic bulletin resolver
    async function resolveLatestBulletin() {
      // Tier 1: GitHub API (if hosted on GitHub Pages)
      try {
        const host = window.location.hostname;
        if (host.endsWith('github.io')) {
          const owner = host.split('.')[0];
          const pathParts = window.location.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            const repo = pathParts[0];
            for (const dir of ['docs/bulletins', 'bulletins']) {
              const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${dir}`);
              if (apiRes.ok) {
                const files = await apiRes.json();
                if (Array.isArray(files)) {
                  const pdfs = files
                    .map((f) => f.name)
                    .filter((name) => name.toLowerCase().endsWith('.pdf') && name !== 'latest.pdf');
                  const dated = pdfs
                    .map((name) => {
                      const m = name.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
                      return m ? { name, dateKey: `${m[1]}-${m[2]}-${m[3]}` } : null;
                    })
                    .filter(Boolean);
                  if (dated.length > 0) {
                    dated.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
                    return dated[0].name;
                  }
                }
              }
            }
          }
        }
      } catch (e) {}

      // Tier 2: Dynamic Sunday Probing (runs concurrent batches from newest to oldest)
      const candidates = getCandidateSundays();
      const BATCH_SIZE = 4;
      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (fname) => {
            const exists = await probeFile(bulletinsBase + fname);
            return { fname, exists };
          })
        );
        for (const item of results) {
          if (item.exists) {
            return item.fname;
          }
        }
      }

      return null;
    }

    // Run resolution in background
    const resolvePromise = resolveLatestBulletin().then((latest) => {
      if (latest) {
        applyBulletinFilename(latest);
      }
      return latest;
    });

    // Ensure smooth user click behavior even before probe completes
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
