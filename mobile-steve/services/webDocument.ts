import { Platform } from 'react-native';

/**
 * Document web (SEO / accessibilité) : la page exportée par Expo est en
 * `lang="en"` avec un titre unique « BOLIGO ». On déclare la langue française,
 * une description, et un titre propre à chaque écran.
 */
const DESCRIPTION =
  'Boligo : rencontres sérieuses pour la diaspora francophone. Un entretien guidé pour vous connaître, des profils compatibles, des échanges respectueux.';

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Rencontres sérieuses pour la diaspora francophone'],
  [/^\/login/, 'Connexion'],
  [/^\/verify/, 'Vérification de votre adresse e-mail'],
  [/^\/forgot-password/, 'Mot de passe oublié'],
  [/^\/reset-password/, 'Nouveau mot de passe'],
  [/^\/discover/, 'Découvrir des profils'],
  [/^\/messages/, 'Messages'],
  [/^\/profile\/edit/, 'Modifier mon profil'],
  [/^\/profile\/offres/, 'Offres'],
  [/^\/profile\/purchases/, 'Mes achats'],
  [/^\/profile/, 'Mon profil'],
  [/^\/interview\/generation/, 'Création de votre profil'],
  [/^\/interview\/summary/, 'Résumé de votre entretien'],
  [/^\/interview/, 'Entretien de personnalité'],
  [/^\/onboarding\/payment/, 'Paiement'],
  [/^\/onboarding/, 'Bienvenue'],
  [/^\/legal\/cgu/, "Conditions générales d'utilisation"],
  [/^\/legal\/confidentialite/, 'Politique de confidentialité'],
  [/^\/(partenaires|partners)/, 'Partenaires'],
  [/^\/(espace-partenaire|partner-space)/, 'Espace partenaire'],
  [/^\/video-call/, 'Appel vidéo'],
];

export function titleForPath(pathname: string): string {
  const hit = TITLES.find(([re]) => re.test(pathname || '/'));
  return hit ? `${hit[1]} · Boligo` : 'Boligo';
}

export function installWebDocument() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.lang = 'fr';
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', DESCRIPTION);
}

export function setWebTitle(pathname: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.title = titleForPath(pathname);
}
