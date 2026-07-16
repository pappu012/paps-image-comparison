import type { NextConfig } from "next";

// GitHub Pages serves this repo under /paps-image-comparison/ instead of
// the domain root, so the built asset paths need that prefix baked in.
// GITHUB_ACTIONS is set automatically by GitHub's runners — local `next dev`
// and `next build` stay unprefixed.
const repoName = "paps-image-comparison";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubActions ? `/${repoName}` : "",
  assetPrefix: isGithubActions ? `/${repoName}/` : "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
