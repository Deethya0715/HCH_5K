import { formatTimestamp, qrLinkOf, returnLabel, ribbonLabel, signLabel } from "./tributes.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title, main) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#F8FAFC" />
    <meta name="robots" content="noindex, nofollow" />
    <script>
      (function () {
        var theme = "light";
        try {
          var stored = localStorage.getItem("hch-theme");
          if (stored === "light" || stored === "dark") theme = stored;
          else if (window.matchMedia("(prefers-color-scheme: dark)").matches) theme = "dark";
        } catch (e) {
          if (window.matchMedia("(prefers-color-scheme: dark)").matches) theme = "dark";
        }
        var meta = document.querySelector('meta[name="theme-color"]');
        var lightColor = (meta && meta.getAttribute("content")) || "#F8FAFC";
        if (meta) meta.setAttribute("data-theme-light", lightColor);
        if (theme === "dark") document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = theme;
        if (meta && theme === "dark") meta.setAttribute("content", "#121418");
      })();
    </script>
    <title>${escapeHtml(title)}</title>
    <link rel="icon" type="image/png" href="/assets/favicon.png" />
    <link rel="stylesheet" href="/assets/styles.css" />
    <style>
      .tribute-admin-scroll { overflow-x: auto; }
      .tribute-admin-table { width: 100%; min-width: 72rem; border-collapse: collapse; }
      .tribute-admin-table th,
      .tribute-admin-table td { vertical-align: top; }
      .tribute-admin-table a { overflow-wrap: anywhere; }
      .tribute-photo-link { display: inline-flex; flex-direction: column; gap: 0.35rem; max-width: 8rem; font-size: 0.75rem; font-weight: 700; }
      .tribute-photo { display: block; width: 6rem; height: 6rem; object-fit: cover; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #f1f5f9; }
      .tribute-photo-empty { display: inline-flex; align-items: center; justify-content: center; width: 6rem; height: 6rem; box-sizing: border-box; border-radius: 0.5rem; border: 1px dashed #cbd5e1; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 600; text-align: center; padding: 0.35rem; }
      .tribute-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem; }
      .tribute-action { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.7rem; background: #f59e0b; color: #0B2545; font-size: 0.75rem; font-weight: 800; line-height: 1.2; padding: 0.45rem 0.7rem; text-decoration: none; white-space: nowrap; }
      .tribute-action-secondary { background: #fff; color: #0B2545; border: 1px solid #cbd5e1; }
      html.dark .tribute-photo { border-color: #334155; background: #1a1f27; }
      html.dark .tribute-photo-empty { border-color: #334155; background: #1a1f27; color: #94a3b8; }
      html.dark .tribute-action-secondary { background: #1a1f27; color: #e2e8f0; border-color: #334155; }
    </style>
  </head>
  <body class="w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-800 antialiased">
    <header class="border-b border-slate-200 bg-white">
      <div class="section-shell flex min-h-20 items-center gap-4 py-3">
        <a href="/" class="mr-auto flex min-w-0 items-center" aria-label="Hope. Cope. Heal. home">
          <img src="/assets/logo-light.png" alt="" width="1024" height="430" class="brand-logo-light h-12 w-auto max-w-[11rem] object-contain object-left" />
          <img src="/assets/logo-dark.png" alt="" width="1024" height="430" class="brand-logo-dark hidden h-12 w-auto max-w-[11rem] object-contain object-left" />
        </a>
        <p class="text-sm font-semibold text-slate-600">Tribute signs</p>
        <button type="button" id="themeToggle" class="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50" aria-pressed="false" aria-label="Toggle color theme">Theme</button>
      </div>
    </header>
    <main id="main" class="section-shell py-8 sm:py-12">${main}</main>
    <script src="/assets/theme.js" defer></script>
  </body>
</html>`;
}

export function renderLogin(error) {
  const alert = error
    ? `<p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">${escapeHtml(error)}</p>`
    : "";
  return page(
    "Tribute sign admin | Hope. Cope. Heal.",
    `<div class="mx-auto max-w-md rounded-2xl border border-slate-200 border-t-4 border-t-gold-500 bg-white p-6 shadow-sm sm:p-8">
      <p class="eyebrow">Organizers</p>
      <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Tribute sign list</h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">Enter the admin password to review dedications and export them for printing.</p>
      ${alert}
      <form method="post" action="/admin/tributes" class="mt-6">
        <label for="password" class="block text-sm font-semibold text-slate-900">Password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm" />
        <button type="submit" class="mt-5 w-full rounded-xl bg-gold-500 px-4 py-3.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-gold-600">View dedications</button>
      </form>
    </div>`
  );
}

export function renderMessage(message) {
  return page(
    "Tribute sign admin | Hope. Cope. Heal.",
    `<div class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 class="text-2xl font-extrabold text-slate-900">Tribute sign list</h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">${escapeHtml(message)}</p>
    </div>`
  );
}

function isPhotoSrc(url) {
  return /^https?:\/\/\S+$/i.test(url) || /^\/api\/tributes\/photos\/[A-Za-z0-9_-]{32}$/.test(url);
}

function photoCell(row) {
  const url = row.photo_url || "";
  if (!url) return '<span class="tribute-photo-empty">No photo</span>';
  if (!isPhotoSrc(url)) return escapeHtml(url);
  const safe = escapeHtml(url);
  const alt = escapeHtml(row.hero_name ? `Photo of ${row.hero_name}` : "Hero photo");
  const file = row.photo_filename
    ? `<span class="font-medium text-slate-500">${escapeHtml(row.photo_filename)}</span>`
    : "";
  return `<a class="tribute-photo-link" href="${safe}" target="_blank" rel="noopener noreferrer"><img class="tribute-photo" src="${safe}" alt="${alt}" width="96" height="96" loading="lazy" onerror="this.hidden=true;if(!this.nextElementSibling.dataset.fallback){this.insertAdjacentHTML('afterend','<span class=&quot;tribute-photo-empty&quot; data-fallback=&quot;1&quot;>Preview unavailable</span>')}" /><span>Open photo</span>${file}</a>`;
}

function linkCell(url) {
  if (!url) return '<span class="text-slate-500">—</span>';
  if (!/^https?:\/\/\S+$/i.test(url)) return escapeHtml(url);
  const safe = escapeHtml(url);
  return `<a class="font-semibold text-slateblue-700 underline underline-offset-2" href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
}

function actionCell(row) {
  const id = escapeHtml(row.id);
  const sign = `<a class="tribute-action" href="/admin/tributes/generate-html/${id}">Generate sign</a>`;
  const url = row.photo_url || "";
  const photo = isPhotoSrc(url)
    ? `<a class="tribute-action tribute-action-secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open photo</a>`
    : "";
  return `<div class="tribute-actions">${sign}${photo}</div>`;
}

function textCell(value) {
  const text = value == null || value === "" ? "" : String(value);
  if (!text) return '<span class="text-slate-500">—</span>';
  return escapeHtml(text);
}

function ribbonChip(value) {
  const label = ribbonLabel(value);
  const tone =
    value === "gold"
      ? "border-gold-200 bg-gold-50 text-gold-900"
      : value === "teal"
        ? "border-teal-soft-200 bg-teal-soft-50 text-teal-soft-800"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return `<span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone}">${escapeHtml(label)}</span>`;
}

export function renderTable(rows) {
  const count = rows.length;
  const noun = count === 1 ? "dedication" : "dedications";
  const body = rows.length
    ? rows
        .map(
          (row) => `<tr class="border-b border-slate-200">
            <td class="px-3 py-3">${photoCell(row)}</td>
            <td class="px-3 py-3 font-semibold text-slate-900">${textCell(row.hero_name)}</td>
            <td class="px-3 py-3">${ribbonChip(row.ribbon_color)}</td>
            <td class="px-3 py-3">${textCell(row.contact_email)}</td>
            <td class="px-3 py-3">${actionCell(row)}</td>
            <td class="px-3 py-3" style="min-width:16rem">${textCell(row.message)}</td>
            <td class="px-3 py-3">${textCell(signLabel(row.sign_type))}</td>
            <td class="px-3 py-3" style="min-width:12rem">${linkCell(qrLinkOf(row))}</td>
            <td class="px-3 py-3 whitespace-nowrap">${textCell(row.phone)}</td>
            <td class="px-3 py-3">${textCell(row.submitter_name)}</td>
            <td class="px-3 py-3">${textCell(row.relationship)}</td>
            <td class="px-3 py-3">${textCell(row.treatment_date)}</td>
            <td class="px-3 py-3">${textCell(row.milestone)}</td>
            <td class="px-3 py-3">${textCell(row.sponsor_name)}</td>
            <td class="px-3 py-3">${textCell(returnLabel(row.return_method))}</td>
            <td class="px-3 py-3" style="min-width:14rem">${textCell(row.mail_address)}</td>
            <td class="px-3 py-3 whitespace-nowrap text-slate-600">${escapeHtml(formatTimestamp(row.created_at || row.timestamp))}</td>
            <td class="px-3 py-3 tabular-nums text-slate-500">${escapeHtml(row.id)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td class="px-3 py-8 text-sm text-slate-600" colspan="18">No tribute signs yet.</td></tr>`;

  return page(
    "Tribute signs | Hope. Cope. Heal.",
    `<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="eyebrow">Honoring Our Heroes</p>
        <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Tribute signs</h1>
        <p class="mt-2 text-sm text-slate-600">${count} ${noun}, newest first. Times are Central.</p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <a href="/admin/tributes/export" class="inline-flex items-center justify-center rounded-xl bg-gold-500 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-gold-600">Export to CSV</a>
        <form method="post" action="/admin/tributes">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" class="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">Log out</button>
        </form>
      </div>
    </div>
    <div class="tribute-admin-scroll mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="tribute-admin-table text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
            <th class="px-3 py-3">Hero photo</th>
            <th class="px-3 py-3">Hero</th>
            <th class="px-3 py-3">Ribbon</th>
            <th class="px-3 py-3">Contact email</th>
            <th class="px-3 py-3">Actions</th>
            <th class="px-3 py-3">Message</th>
            <th class="px-3 py-3">Sign type</th>
            <th class="px-3 py-3">QR link</th>
            <th class="px-3 py-3">Phone</th>
            <th class="px-3 py-3">Submitted by</th>
            <th class="px-3 py-3">Relationship</th>
            <th class="px-3 py-3">Last treatment</th>
            <th class="px-3 py-3">Milestone</th>
            <th class="px-3 py-3">Sponsor</th>
            <th class="px-3 py-3">After the race</th>
            <th class="px-3 py-3">Mailing address</th>
            <th class="px-3 py-3">Submitted</th>
            <th class="px-3 py-3">ID</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>`
  );
}
