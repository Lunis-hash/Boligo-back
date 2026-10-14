import type { NextConfig } from "next";

// Site statique (dossier out/), servi par Render comme l'application web BOLIGO.
// ADMIN_BASE_PATH=/admin : admin servi sous /admin par la prévisualisation de
// recette (un seul service). Vide par défaut : site Render actuel inchangé.
const basePath = (process.env.ADMIN_BASE_PATH || "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
