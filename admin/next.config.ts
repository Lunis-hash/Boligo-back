import type { NextConfig } from "next";

// Site statique (dossier out/), servi par Render comme l'application web BOLIGO.
// ADMIN_BASE_PATH=/admin : admin servi sous /admin par la prévisualisation de
// recette (un seul service). Vide par défaut : site Render actuel inchangé.
const basePath = (process.env.ADMIN_BASE_PATH || "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  // Retour à la connexion après une session expirée (lib/api.ts).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
