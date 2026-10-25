const { prepareNextBuild } = require("./scripts/prepare-next-build");

// Vercel runs `next build` (via the package.json build script). Compile the
// Tailwind stylesheet and publish the static assets before Next collects files.
if (process.argv.includes("build")) {
  prepareNextBuild();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
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
