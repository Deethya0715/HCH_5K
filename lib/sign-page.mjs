import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { qrLinkOf, ribbonLabel } from "./tributes.mjs";

const signDir = dirname(fileURLToPath(import.meta.url));
const qrSource = readFileSync(join(signDir, "sign-qr.js"), "utf8");
const logoUri = `data:image/png;base64,${readFileSync(join(signDir, "../public/assets/logo-light.png")).toString("base64")}`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ribbonTheme(value) {
  const key = String(value || "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(key)) return key;
  if (key.includes("periwinkle")) return "#9AABEB";
  if (key.includes("teal") || key.includes("survivor")) return "#149A90";
  if (key.includes("gold") || key.includes("treatment")) return "#E3B505";
  if (key.includes("white") || key.includes("dove") || key.includes("memory")) return "#E7E2D8";
  return "#0B2545";
}

function nameSize(name) {
  const length = String(name || "").trim().length;
  if (length > 18) return "0.56in";
  if (length > 12) return "0.78in";
  if (length > 8) return "1.02in";
  return "1.28in";
}

function tint(hex, amount) {
  const n = Number.parseInt(String(hex).slice(1), 16);
  const mix = (channel) => Math.round(channel * amount + 255 * (1 - amount));
  const channel = (value) => mix(value).toString(16).padStart(2, "0");
  return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`;
}

function messageDensity(message) {
  const text = String(message || "").trim();
  if (!text) return "is-empty";
  const words = text.split(/\s+/).length;
  if (words <= 10 && text.length <= 80) return "is-short";
  if (words > 18 || text.length > 140) return "is-long";
  return "is-medium";
}

function photoMarkup(row) {
  const type = row.photo_content_type;
  const bytes = row.photo_bytes;
  const buffer = bytes ? (Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)) : null;
  const hero = String(row.hero_name || "").trim();
  const alt = escapeHtml(hero ? `Photo of ${hero}` : "Hero photo");
  if (buffer?.length && (type === "image/png" || type === "image/jpeg")) {
    const src = `data:${type};base64,${buffer.toString("base64")}`;
    return `<img src="${src}" alt="${alt}" />`;
  }
  return `<div class="missing" role="img" aria-label="${alt}">Photo unavailable</div>`;
}

function ribbonMark() {
  return `<div class="mark-row">
        <img class="mark-logo" src="${logoUri}" alt="Hope. Cope. Heal." />
      </div>`;
}

export function renderSignHtml(row) {
  const even = Number(row.id) % 2 === 0;
  const layout = even ? "photo-left" : "photo-right";
  const side = even ? "left" : "right";
  const background = ribbonTheme(row.ribbon_color);
  const field = tint(background, 0.34);
  const designation = ribbonLabel(row.ribbon_color) || "Ribbon";
  const link = String(qrLinkOf(row) || "").trim();
  const name = String(row.hero_name || "").trim();
  const message = String(row.message || "").trim();
  const density = messageDensity(message);
  const qr = link
    ? `<div class="qr-row">
        <div id="sign-qr" class="qr" data-link="${escapeHtml(link)}"></div>
        <p class="qr-caption">Scan with your phone</p>
      </div>`
    : ribbonMark();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Tribute sign ${escapeHtml(row.id)} · ${escapeHtml(name || "Hero")} | Hope. Cope. Heal.</title>
    <style>
      @page {
        size: 24in 18in landscape;
        size: 24in 18in;
        margin: 0;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #d5dde6;
        color: #0B2545;
        font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem 1.25rem;
        padding: 0.85rem 1.25rem;
        background: #0B2545;
        color: #ffffff;
      }
      .toolbar a { color: #ffffff; font-weight: 700; }
      .toolbar p { margin: 0; flex: 1 1 16rem; font-size: 0.95rem; line-height: 1.4; }
      .toolbar button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: #f59e0b;
        color: #0B2545;
        font: inherit;
        font-size: 1rem;
        font-weight: 800;
        padding: 0.72rem 1.15rem;
        cursor: pointer;
      }
      .viewport {
        display: flex;
        justify-content: center;
        padding: 1.25rem;
      }
      .sheet {
        width: min(96vw, calc((100vh - 5.75rem) * 24 / 18));
        aspect-ratio: 24 / 18;
        position: relative;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 16px 40px rgba(11, 37, 69, 0.22);
      }
      .sign {
        position: absolute;
        top: 0;
        left: 0;
        width: 24in;
        height: 18in;
        display: flex;
        overflow: hidden;
        visibility: hidden;
        background: #ffffff;
        transform-origin: top left;
      }
      .sign.is-fit { visibility: visible; }
      .photo, .info {
        width: 12in;
        height: 18in;
        flex: 0 0 12in;
      }
      .sign.photo-left .photo { order: 1; }
      .sign.photo-left .info { order: 2; }
      .sign.photo-right .info { order: 1; }
      .sign.photo-right .photo { order: 2; }
      .photo {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.7in;
      }
      .mat {
        background: #ffffff;
        padding: 0.22in;
        border: 0.05in solid #0B2545;
        box-shadow: 0 0.1in 0.3in rgba(11, 37, 69, 0.25);
      }
      .well {
        background: ${field};
        padding: 0.16in;
      }
      .well img, .missing {
        width: 8.38in;
        height: 12.88in;
        object-fit: contain;
        object-position: center;
        display: block;
        background: ${field};
      }
      .missing {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0B2545;
        font-size: 0.32in;
        font-weight: 800;
        text-align: center;
        padding: 0.4in;
      }
      .info {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 0.9in 0.85in 0.68in;
        background: #ffffff;
        color: #0B2545;
      }
      .flex-col { display: flex; flex-direction: column; }
      .justify-between { justify-content: space-between; }
      .heading, .info-foot { flex: 0 0 auto; }
      .message-slot {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 0;
        padding: 0.42in 0;
      }
      .info.is-empty .message-slot { display: none; }
      .info.is-empty .heading,
      .info.is-empty .info-foot { margin-top: auto; }
      .heading {
        display: flex;
        flex-direction: column;
        gap: 0.3in;
      }
      .info.is-short .heading { gap: 0.38in; }
      .name {
        margin: 0;
        color: #0B2545;
        font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
        font-size: ${nameSize(name)};
        font-weight: 700;
        line-height: 0.96;
        letter-spacing: -0.015in;
        overflow-wrap: anywhere;
      }
      .ribbon {
        margin: 0;
        color: #000000;
        font-size: 0.3in;
        font-weight: 800;
        line-height: 1.2;
      }
      .swatch {
        display: inline-block;
        width: 0.28in;
        height: 0.28in;
        margin-right: 0.12in;
        border: 0.015in solid #0B2545;
        vertical-align: -0.03in;
      }
      .message {
        margin: 0;
        color: #000000;
        font-size: 0.42in;
        font-weight: 500;
        line-height: 1.42;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .info.is-short .message {
        font-size: 0.58in;
        line-height: 1.62;
      }
      .info.is-long .message {
        font-size: 0.34in;
        line-height: 1.4;
      }
      .info-foot { width: 100%; }
      .qr-row {
        display: flex;
        align-items: center;
        gap: 0.28in;
        margin-bottom: 0.36in;
      }
      .qr {
        width: 2.15in;
        height: 2.15in;
        flex: 0 0 2.15in;
        background: #ffffff;
      }
      .qr svg { width: 100%; height: 100%; display: block; }
      .qr-caption {
        margin: 0;
        max-width: 3.4in;
        color: #0B2545;
        font-size: 0.24in;
        font-weight: 800;
        line-height: 1.25;
      }
      .mark-row {
        display: flex;
        align-items: flex-end;
        margin: 0 0 0.3in;
      }
      .mark-logo {
        display: block;
        width: 4.35in;
        height: auto;
      }
      .brand {
        margin: 0;
        padding-top: 0.18in;
        border-top: 0.02in solid #0B2545;
        color: #0B2545;
        font-size: 0.2in;
        font-weight: 800;
        letter-spacing: 0.004in;
        line-height: 1.3;
      }
      @media print {
        .no-print { display: none !important; }
        html, body {
          width: 24in;
          height: 18in;
          background: #ffffff;
        }
        .viewport { padding: 0; }
        .sheet {
          width: 24in;
          height: 18in;
          aspect-ratio: auto;
          overflow: visible;
          box-shadow: none;
        }
        .sign {
          position: static;
          visibility: visible !important;
          transform: none !important;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print toolbar">
      <a href="/admin/tributes">All tributes</a>
      <p>Sign #${escapeHtml(row.id)} · 24 × 18 in landscape · Photo on the ${side}. In the print dialog, choose 24 × 18 in paper, landscape, and no margins. Save as PDF to keep a file.</p>
      <button type="button" id="printSign">Print / Save Sign</button>
    </div>
    <div class="viewport">
      <div class="sheet">
        <article class="sign ${layout}" data-layout="${layout}">
          <section class="photo" style="background:${background}" aria-label="Hero photo">
            <div class="mat"><div class="well">${photoMarkup(row)}</div></div>
          </section>
          <section class="info flex-col justify-between ${density} ${link ? "has-qr" : "no-qr"}" aria-label="Tribute">
            <div class="heading">
              ${name ? `<h1 class="name">${escapeHtml(name)}</h1>` : ""}
              <p class="ribbon"><span class="swatch" style="background:${background}"></span>${escapeHtml(designation)}</p>
            </div>
            <div class="message-slot">
              ${message ? `<p class="message">${escapeHtml(message)}</p>` : ""}
            </div>
            <div class="info-foot">
              ${qr}
              <p class="brand">Hope. Cope. Heal. Tribute Trail • March 27, 2027</p>
            </div>
          </section>
        </article>
      </div>
    </div>
    <script>
${qrSource}
    </script>
    <script>
      (function () {
        var button = document.getElementById("printSign");
        if (button) button.addEventListener("click", function () { window.print(); });

        var node = document.getElementById("sign-qr");
        if (node && typeof renderTributeQr === "function") {
          var link = node.getAttribute("data-link") || "";
          if (link) {
            try {
              node.innerHTML = renderTributeQr(link);
            } catch (error) {
              node.textContent = "QR code could not be drawn.";
            }
          }
        }

        function fitSign() {
          var sheet = document.querySelector(".sheet");
          var sign = document.querySelector(".sign");
          if (!sheet || !sign || !window.matchMedia("screen").matches) return;
          var width = sign.offsetWidth || sign.getBoundingClientRect().width;
          if (!width) return;
          var scale = sheet.clientWidth / width;
          if (isFinite(scale) && scale > 0) sign.style.transform = "scale(" + scale + ")";
          sign.classList.add("is-fit");
        }
        window.addEventListener("resize", fitSign);
        window.addEventListener("beforeprint", function () {
          var sign = document.querySelector(".sign");
          if (sign) sign.style.transform = "none";
        });
        window.addEventListener("afterprint", fitSign);
        fitSign();
      })();
    </script>
  </body>
</html>`;
}
