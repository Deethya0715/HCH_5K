const { prepareNextBuild } = require("./scripts/prepare-next-build");

// Vercel runs `next build` (via the package.json build script). Compile the
// Tailwind stylesheet and publish the static assets before Next collects files.
if (process.argv.includes("build")) {
  prepareNextBuild();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dynamic tribute, photo, and admin handlers need the Node server, so this
  // app is not a static export. Capacitor loads that server (capacitor.config.ts)
  // and copies the static pages into www/ for the native projects.
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/register/team",
          destination: "/register/team/index.html",
        },
        {
          source: "/register/team/",
          destination: "/register/team/index.html",
        },
      ],
      afterFiles: [{ source: "/index.html", destination: "/" }],
    };
  },
};

module.exports = nextConfig;
