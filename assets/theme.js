(function () {
  'use strict';

  var themeToggle = document.getElementById('themeToggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var lightColor = (themeMeta && themeMeta.getAttribute('data-theme-light')) || '#FBFBFA';

  function readStoredTheme() {
    try {
      var value = localStorage.getItem('hch-theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function applyTheme(theme) {
    var dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = theme;
    if (themeMeta) {
      themeMeta.setAttribute('content', dark ? '#121418' : lightColor);
    }
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(dark));
      themeToggle.setAttribute(
        'aria-label',
        dark ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem('hch-theme', theme);
    } catch (e) {}
  }

  applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(next);
      persistTheme(next);
    });
  }

  if (themeQuery.addEventListener) {
    themeQuery.addEventListener('change', function (event) {
      if (readStoredTheme()) return;
      applyTheme(event.matches ? 'dark' : 'light');
    });
  }
})();
