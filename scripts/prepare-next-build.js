const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function stagePublic() {
  const pub = path.join(root, "public");
  copyDir(path.join(root, "assets"), path.join(pub, "assets"));
  copyDir(path.join(root, "register"), path.join(pub, "register"));
}

function prepareNextBuild() {
  execSync(
    "npx --no-install tailwindcss -i ./src/input.css -o ./assets/styles.css --minify",
    {
      stdio: "inherit",
      cwd: root,
      env: process.env,
      shell: true,
    }
  );
  stagePublic();
}

if (require.main === module) {
  prepareNextBuild();
}

module.exports = { prepareNextBuild };
