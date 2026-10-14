/**
 * Jeu de données FICTIF de la recette partenaires : 20 partenaires, 18 offres.
 *
 * Toutes les identités sont inventées. Les adresses utilisent le domaine
 * réservé « .example » (RFC 2606) : aucun e-mail ne peut atteindre un vrai
 * destinataire. Les numéros d'immatriculation « DEMO-… » sont saisis en
 * « autre pays » : aucun registre officiel n'est interrogé. Chaque société
 * porte la mention « (fictif) » ; tous les codes commencent par « DEMO ».
 */
const DOMAIN = 'boligo-demo.example';
const mail = (local) => `${local}@${DOMAIN}`;

/**
 * final : statut attendu en fin de recette.
 * via   : 'navigateur' (formulaire public) ou 'api' (même route POST /partners/apply).
 * code  : code personnalisé et réduction ; free = Parcours offert (jeu concours).
 * traffic : visites, inscriptions et Parcours payés simulés avec le code.
 */
const PARTNERS = [
  // ── 8 entreprises partenaires (annonceurs)
  { key: 'lumen', type: 'ANNONCEUR', name: 'Élise Varnier', company: 'Atelier Lumen (fictif)', city: 'Lyon', website: 'https://atelier-lumen.example', audience: 'Fleuriste, 2 boutiques', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOLUMEN', discount: 10 }, traffic: { visits: 10, signups: 1, sales: 1 } },
  { key: 'cerfeuil', type: 'ANNONCEUR', name: 'Thomas Orlin', company: 'Maison Cerfeuil (fictif)', city: 'Bordeaux', website: 'https://maison-cerfeuil.example', audience: 'Restaurant bistronomique', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOCERFEUIL', discount: 15 }, traffic: { visits: 8, signups: 1, sales: 0 } },
  { key: 'velo', type: 'ANNONCEUR', name: 'Agathe Morvan', company: 'Vélo Brume (fictif)', city: 'Nantes', website: 'https://velo-brume.example', audience: 'Balades à vélo guidées', final: 'ACCEPTE', via: 'api' },
  { key: 'ourlet', type: 'ANNONCEUR', name: 'Bastien Quérel', company: 'Librairie L’Ourlet (fictif)', city: 'Lille', website: 'https://librairie-ourlet.example', audience: 'Librairie café', final: 'ACCEPTE', via: 'api' },
  { key: 'nacre', type: 'ANNONCEUR', name: 'Romane Dufresnoy', company: 'Spa Nacre (fictif)', city: 'Annecy', website: 'https://spa-nacre.example', audience: 'Spa et soins en duo', final: 'SUSPENDU', via: 'api', code: { code: 'DEMONACRE', discount: 10 }, traffic: { visits: 6, signups: 1, sales: 1 } },
  { key: 'ardoise', type: 'ANNONCEUR', name: 'Victor Lemaire-Hô', company: 'Cave Ardoise (fictif)', city: 'Tours', website: 'https://cave-ardoise.example', audience: 'Caviste, ateliers dégustation', final: 'EN_COURS', via: 'api' },
  { key: 'galet', type: 'ANNONCEUR', name: 'Salomé Ribeyre', company: 'Studio Galet (fictif)', city: 'Marseille', website: 'https://studio-galet.example', audience: 'Studio photo', final: 'NOUVEAU', via: 'navigateur' },
  { key: 'tilleul', type: 'ANNONCEUR', name: 'Gaspard Nivelle', company: 'Voyages Tilleul (fictif)', city: 'Rennes', website: 'https://voyages-tilleul.example', audience: 'Agence de week-ends', final: 'REFUSE', via: 'api' },

  // ── 6 commerciaux / ambassadeurs
  { key: 'clara', type: 'AMBASSADEUR', name: 'Clara Fontenay', company: 'Commerciale indépendante (fictif)', city: 'Paris', audience: 'Réseau professionnel, 1 200 contacts', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOCLARA', discount: 10 }, traffic: { visits: 42, signups: 6, sales: 3 } },
  { key: 'yanis', type: 'AMBASSADEUR', name: 'Yanis Belcourt', company: 'Agent commercial (fictif)', city: 'Lyon', audience: 'Clubs de sport, associations', final: 'ACCEPTE', via: 'api', rate: 25, code: { code: 'DEMOYANIS', discount: 15 }, traffic: { visits: 30, signups: 4, sales: 2 } },
  { key: 'sophie', type: 'AMBASSADEUR', name: 'Sophie Marchetti', company: 'Ambassadrice (fictif)', city: 'Nice', audience: 'Événements afterwork', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOSOPHIE', discount: 10 }, traffic: { visits: 18, signups: 2, sales: 1 } },
  { key: 'karim', type: 'AMBASSADEUR', name: 'Karim Delaunay', company: 'Ambassadeur (fictif)', city: 'Toulouse', audience: 'Coachs, salles de sport', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOKARIM', discount: 20 }, traffic: { visits: 12, signups: 1, sales: 0 } },
  { key: 'hugo', type: 'AMBASSADEUR', name: 'Hugo Lessard', company: 'Commercial indépendant (fictif)', city: 'Strasbourg', audience: 'Réseau d’entrepreneurs', final: 'NOUVEAU', via: 'navigateur' },
  { key: 'mathis', type: 'AMBASSADEUR', name: 'Mathis Corbel', company: 'Ambassadeur (fictif)', city: 'Dijon', audience: 'Soirées étudiantes', final: 'REFUSE', via: 'api', code: { code: 'DEMOMATHIS', discount: 10 }, traffic: { visits: 5, signups: 0, sales: 0 } },

  // ── 6 créateurs / influenceurs
  { key: 'lina', type: 'CREATEUR', name: 'Lina Arcelle', company: 'Créatrice de contenu (fictif)', city: 'Montpellier', website: 'https://lina-arcelle.example', audience: 'Instagram 48 k, TikTok 30 k', final: 'ACCEPTE', via: 'navigateur', code: { code: 'DEMOLINA', discount: 15 }, adminUi: true, traffic: { visits: 25, signups: 3, sales: 2 } },
  { key: 'jade', type: 'CREATEUR', name: 'Jade Poitevin', company: 'Podcast « Cœurs lents » (fictif)', city: 'Paris', website: 'https://coeurs-lents.example', audience: 'Podcast 15 k écoutes / mois', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOJADE', discount: 10 }, traffic: { visits: 36, signups: 5, sales: 2 } },
  { key: 'nora', type: 'CREATEUR', name: 'Nora Valsain', company: 'YouTube « Rencontres vraies » (fictif)', city: 'Bruxelles', website: 'https://rencontres-vraies.example', audience: 'YouTube 22 k abonnés', final: 'ACCEPTE', via: 'api', rate: 12, code: { code: 'DEMONORA', discount: 10, free: true }, traffic: { visits: 20, signups: 3, sales: 0, free: 2 } },
  { key: 'theo', type: 'CREATEUR', name: 'Théo Grandin', company: 'Créateur de contenu (fictif)', city: 'Rennes', audience: 'TikTok 60 k', final: 'ACCEPTE', via: 'api', code: { code: 'DEMOTHEO', discount: 20 }, traffic: { visits: 15, signups: 2, sales: 1 } },
  { key: 'maelle', type: 'CREATEUR', name: 'Maëlle Kerbrat', company: 'Blog « Le temps d’aimer » (fictif)', city: 'Brest', website: 'https://temps-aimer.example', audience: 'Blog 9 k visiteurs / mois', final: 'SUSPENDU', via: 'api', code: { code: 'DEMOMAELLE', discount: 10 }, traffic: { visits: 14, signups: 2, sales: 1 } },
  { key: 'ines', type: 'CREATEUR', name: 'Inès Larrieu', company: 'Créatrice de contenu (fictif)', city: 'Pau', audience: 'Instagram 12 k', final: 'EN_COURS', via: 'api' },
].map((p, i) => ({
  ...p,
  email: mail(`partenaire-${p.key}`),
  regNumber: `DEMO-2026-${String(i + 1).padStart(4, '0')}`,
  message: `Candidature fictive de recette BOLIGO (${p.company}). Aucune donnée réelle : ce partenaire n’existe pas.`,
}));

const DAY = 24 * 3600 * 1000;
/**
 * 18 offres. state = état attendu en fin de recette.
 * startIn / endIn : décalage en jours par rapport à maintenant (null = sans date).
 * endInSec : fin dans N secondes (test d'expiration en direct).
 * withdraw : retirée par l'équipe ; publish : mise en ligne.
 */
const OFFERS = [
  { key: 'A', partner: 'lumen', title: 'Bouquet du premier rendez-vous', perk: '-20 % sur un bouquet', placement: 'PARTENAIRE_DU_MOIS', publish: true, state: 'en_ligne', clicks: 9 },
  { key: 'B', partner: 'lumen', title: 'Atelier composition à deux', perk: '1 place offerte pour 2', placement: 'OFFRES', publish: true, state: 'en_ligne', clicks: 5 },
  { key: 'C', partner: 'lumen', title: 'Fête des fleurs (septembre)', perk: '-15 % sur la boutique', placement: 'OFFRES', publish: true, startIn: -40, endIn: -2, state: 'expiree' },
  { key: 'D', partner: 'cerfeuil', title: 'Dîner découverte', perk: 'Dessert offert pour 2', placement: 'OFFRES', publish: true, state: 'en_ligne', clicks: 7 },
  { key: 'E', partner: 'cerfeuil', title: 'Menu de la Saint-Valentin', perk: '-10 % sur le menu', placement: 'OFFRES', publish: true, startIn: 7, endIn: 60, state: 'programmee' },
  { key: 'F', partner: 'cerfeuil', title: 'Brunch du dimanche', perk: 'Café offert', placement: 'OFFRES', publish: false, state: 'brouillon', adminUi: true },
  { key: 'G', partner: 'velo', title: 'Balade au coucher du soleil', perk: '-25 % pour 2 vélos', placement: 'OFFRES', publish: true, state: 'en_ligne', clicks: 4 },
  { key: 'H', partner: 'velo', title: 'Pique-nique en bord de Loire', perk: 'Panier offert', placement: 'OFFRES', publish: true, state: 'en_ligne', clicks: 3 },
  { key: 'I', partner: 'velo', title: 'Location tandem', perk: '-30 % le week-end', placement: 'OFFRES', publish: true, withdraw: true, state: 'retiree' },
  { key: 'J', partner: 'ourlet', title: 'Soirée lecture à deux voix', perk: 'Boisson offerte', placement: 'OFFRES', publish: true, state: 'en_ligne', clicks: 2 },
  { key: 'K', partner: 'ourlet', title: 'Vente flash livres d’amour', perk: '-30 % pendant 1 heure', placement: 'OFFRES', publish: true, endInSec: 40, state: 'expiree' },
  { key: 'L', partner: 'nacre', title: 'Soin duo détente', perk: '-20 % sur le soin duo', placement: 'OFFRES', publish: true, state: 'retiree' },
  { key: 'M', partner: 'nacre', title: 'Accès spa en soirée', perk: '2e entrée offerte', placement: 'OFFRES', publish: true, state: 'retiree' },
  { key: 'N', partner: 'ardoise', title: 'Atelier dégustation', perk: '-15 % sur l’atelier', placement: 'OFFRES', publish: false, state: 'brouillon' },
  { key: 'O', partner: 'ardoise', title: 'Coffret de deux vins', perk: '-10 % sur le coffret', placement: 'OFFRES', publish: false, state: 'brouillon' },
  { key: 'P', partner: 'galet', title: 'Portrait de couple', perk: '-20 % sur la séance', placement: 'OFFRES', publish: false, state: 'brouillon' },
  { key: 'Q', partner: 'tilleul', title: 'Week-end surprise', perk: '-50 € sur le week-end', placement: 'OFFRES', publish: true, state: 'retiree' },
  { key: 'R', partner: 'tilleul', title: 'Escapade en train', perk: '-10 % sur le séjour', placement: 'OFFRES', publish: false, state: 'brouillon' },
].map((o) => {
  const p = PARTNERS.find((x) => x.key === o.partner);
  const slug = o.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    ...o,
    description: `Offre fictive de recette proposée par ${p.company}. ${o.perk} sur présentation du code.`,
    url: `${p.website || `https://${p.key}.example`}/${slug}`,
    perkCode: `BOLIGO-${o.key}`,
  };
});

/** Ventes confirmées par les marques (relevés fictifs), en euros pour BOLIGO. */
const CONVERSIONS = [
  { offer: 'A', month: -1, conversions: 2, revenue: 6.0, reference: 'Relevé fictif Lumen 09' },
  { offer: 'A', month: 0, conversions: 1, revenue: 3.0, reference: 'Relevé fictif Lumen 10' },
  { offer: 'D', month: 0, conversions: 3, revenue: 12.6, reference: 'Relevé fictif Cerfeuil 10' },
  { offer: 'G', month: 0, conversions: 1, revenue: 4.5, reference: 'Saisie via l’administration', adminUi: true },
];

module.exports = { DOMAIN, PARTNERS, OFFERS, CONVERSIONS, DAY };
