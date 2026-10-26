const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const webDir = path.join(root, "www");

// Static pages the site serves from disk. Dynamic tribute, photo, and admin
// routes stay on the Next.js server configured in capacitor.config.ts.
const entries = ["index.html", "assets", "tribute", "register", "trail-feed"];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function prepareCapacitorWebDir() {
  fs.rmSync(webDir, { recursive: true, force: true });
  fs.mkdirSync(webDir, { recursive: true });
  for (const entry of entries) {
    const from = path.join(root, entry);
    const to = path.join(webDir, entry);
    if (fs.statSync(from).isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

if (require.main === module) {
  prepareCapacitorWebDir();
}

module.exports = { prepareCapacitorWebDir };
