import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the monorepo root: a checkout nested inside another one (git worktree)
  // otherwise makes Next pick the outer lockfile and miss node_modules.
  turbopack: { root: path.join(import.meta.dirname, "../..") },
};

export default nextConfig;
