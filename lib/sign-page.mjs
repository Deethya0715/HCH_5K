import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { qrLinkOf, ribbonLabel } from "./tributes.mjs";

const qrSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "sign-qr.js"), "utf8");

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

function messageSize(message) {
  const text = String(message || "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  if (words > 20 || text.length > 150) return "0.32in";
  if (words > 14 || text.length > 100) return "0.38in";
  return "0.46in";
}

function photoMarkup(row) {
  const type = row.photo_content_type;
  const bytes = row.photo_bytes;
  const buffer = bytes ? (Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)) : null;
  const alt = escapeHtml(row.hero_name ? `Photo of ${row.hero_name}` : "Hero photo");
  if (buffer?.length && (type === "image/png" || type === "image/jpeg")) {
    const src = `data:${type};base64,${buffer.toString("base64")}`;
    return `<img src="${src}" alt="${alt}" />`;
  }
  return `<div class="missing" role="img" aria-label="${alt}">Photo unavailable</div>`;
}

export function renderSignHtml(row) {
  const even = Number(row.id) % 2 === 0;
  const layout = even ? "photo-left" : "photo-right";
  const side = even ? "left" : "right";
  const background = ribbonTheme(row.ribbon_color);
  const designation = ribbonLabel(row.ribbon_color) || "Ribbon";
  const link = qrLinkOf(row);
  const qr = link
    ? `<div class="qr-row">
        <div id="sign-qr" class="qr" data-link="${escapeHtml(link)}"></div>
        <p class="qr-caption">Scan with your phone</p>
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Tribute sign ${escapeHtml(row.id)} · ${escapeHtml(row.hero_name || "Hero")} | Hope. Cope. Heal.</title>
    <style>
      @page {
        size: 24in 18in landscape;
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
        background: #ffffff;
        transform-origin: top left;
      }
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
      .mat img, .missing {
        width: 8.7in;
        height: 13.2in;
        object-fit: cover;
        display: block;
        background: #e5e7eb;
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
        padding: 0.9in 0.85in 0.68in;
        background: #ffffff;
        color: #0B2545;
      }
      .name {
        margin: 0;
        color: #0B2545;
        font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
        font-size: ${nameSize(row.hero_name)};
        font-weight: 700;
        line-height: 0.96;
        letter-spacing: -0.015in;
        overflow-wrap: anywhere;
      }
      .ribbon {
        margin: 0.32in 0 0;
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
        margin: 0.38in 0 0;
        color: #000000;
        font-size: ${messageSize(row.message)};
        font-weight: 500;
        line-height: 1.28;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .info-foot { margin-top: auto; }
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
            <div class="mat">${photoMarkup(row)}</div>
          </section>
          <section class="info" aria-label="Tribute">
            <h1 class="name">${escapeHtml(row.hero_name || "")}</h1>
            <p class="ribbon"><span class="swatch" style="background:${background}"></span>${escapeHtml(designation)}</p>
            <p class="message">${escapeHtml(row.message || "")}</p>
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
          if (!isFinite(scale) || scale <= 0) return;
          sign.style.transform = "scale(" + scale + ")";
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
