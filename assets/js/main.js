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
});
