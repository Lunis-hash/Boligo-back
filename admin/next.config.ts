import type { NextConfig } from "next";

// Site statique (dossier out/), servi par Render comme l'application web BOLIGO.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
