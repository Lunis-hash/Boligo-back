// Fiches détaillées : l'identifiant passe dans l'adresse (?id=…), ce qui permet
// de servir le tableau de bord comme un site statique.
export const userHref = (id: string) => `/dashboard/users/detail?id=${encodeURIComponent(id)}`;
export const journeyHref = (id: string) =>
  `/dashboard/journeys/detail?id=${encodeURIComponent(id)}`;
