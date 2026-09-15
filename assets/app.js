(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById('navToggle');
  var mobileNav = document.getElementById('mobileNav');
  var navOpenIcon = document.getElementById('navOpenIcon');
  var navCloseIcon = document.getElementById('navCloseIcon');

  function setMobileNavOpen(isOpen) {
    if (!navToggle || !mobileNav) return;

    mobileNav.classList.toggle('is-open', isOpen);
    mobileNav.setAttribute('aria-hidden', String(!isOpen));
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');

    if ('inert' in mobileNav) {
      mobileNav.inert = !isOpen;
    }

    if (navOpenIcon && navCloseIcon) {
      navOpenIcon.classList.toggle('hidden', isOpen);
      navCloseIcon.classList.toggle('hidden', !isOpen);
    }
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      setMobileNavOpen(!mobileNav.classList.contains('is-open'));
    });

    mobileNav.querySelectorAll('.js-mobile-link').forEach(function (link) {
      link.addEventListener('click', function () {
        setMobileNavOpen(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mobileNav.classList.contains('is-open')) {
        setMobileNavOpen(false);
        navToggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setMobileNavOpen(false);
      }
    });
  }

  /* ---------- Schedule accordion bulk controls ---------- */
  var scheduleItems = document.querySelectorAll('[data-accordion] details');
  var expandAll = document.getElementById('expandAll');
  var collapseAll = document.getElementById('collapseAll');

  function setAll(open) {
    scheduleItems.forEach(function (item) {
      item.open = open;
    });
  }

  if (expandAll) expandAll.addEventListener('click', function () { setAll(true); });
  if (collapseAll) collapseAll.addEventListener('click', function () { setAll(false); });

  /* ---------- Site map legend <-> pin highlighting ---------- */
  var legendButtons = document.querySelectorAll('.js-legend');
  var markers = document.querySelectorAll('.map-marker');

  function highlightMarker(id) {
    markers.forEach(function (marker) {
      marker.classList.toggle('is-active', marker.dataset.marker === id);
    });
    legendButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.marker === id);
    });
  }

  legendButtons.forEach(function (button) {
    var activate = function () { highlightMarker(button.dataset.marker); };
    button.addEventListener('click', activate);
    button.addEventListener('mouseenter', activate);
    button.addEventListener('focus', activate);
  });

  /* ---------- Scrollspy for the desktop nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.js-nav-link'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle(
            'is-current',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ---------- Race day countdown ---------- */
  var countdownValue = document.getElementById('countdownValue');
  // 7:30 AM CDT on race morning; Texas is UTC-5 on that date (DST already began).
  var raceStart = new Date('2027-03-27T07:30:00-05:00');

  function renderCountdown() {
    if (!countdownValue) return;

    var diff = raceStart.getTime() - Date.now();

    if (diff <= 0) {
      countdownValue.textContent = "Race day is here — we're so glad you came.";
      return true;
    }

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);

    countdownValue.textContent =
      days.toLocaleString() + ' days · ' + hours + ' hrs · ' + minutes + ' min until gates open';

    return false;
  }

  if (countdownValue && !renderCountdown()) {
    setInterval(renderCountdown, 30000);
  }
})();
