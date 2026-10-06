/** Textes du Programme Partenaires, en français et en anglais (BOLIGO est international). */
export type PartnerLang = 'fr' | 'en';
export type PartnerType = 'ANNONCEUR' | 'AMBASSADEUR' | 'CREATEUR';

export interface PartnerCard {
  type: PartnerType;
  title: string;
  pitch: string;
  points: string[];
  audienceLabel: string;
  audienceHint: string;
}

export interface PartnerContent {
  langSwitch: string;
  back: string;
  kicker: string;
  title: string;
  titleAccent: string;
  intro: string;
  cta: string;
  cardsTitle: string;
  cards: PartnerCard[];
  stepsTitle: string;
  steps: { title: string; text: string }[];
  valuesTitle: string;
  values: { title: string; text: string }[];
  formTitle: string;
  formIntro: string;
  fields: {
    type: string;
    name: string;
    email: string;
    company: string;
    country: string;
    city: string;
    website: string;
    message: string;
    messageHint: string;
  };
  consent: string;
  privacyLink: string;
  submit: string;
  sending: string;
  successTitle: string;
  successText: string;
  again: string;
  missing: string;
  contact: string;
}

export const CONTENT: Record<PartnerLang, PartnerContent> = {
  fr: {
    langSwitch: 'English',
    back: 'Retour',
    kicker: 'Programme Partenaires',
    title: 'Grandissons ensemble,',
    titleAccent: 'partout dans le monde.',
    intro:
      'BOLIGO réunit des célibataires qui cherchent une relation sérieuse, fondée sur des valeurs partagées. Marques, ambassadeurs, créateurs : rejoignez-nous pour faire connaître une autre façon de se rencontrer, en France, en Afrique, en Europe, aux Amériques et dans toute la diaspora.',
    cta: 'Devenir partenaire',
    cardsTitle: 'Trois façons de travailler avec nous',
    cards: [
      {
        type: 'ANNONCEUR',
        title: 'Marques et annonceurs',
        pitch: 'Faites connaître votre marque auprès de célibataires engagés.',
        points: [
          'Partenaire du mois dans l’application et la lettre d’information',
          'Idées de rendez-vous et offres réservées aux membres (restaurants, sorties, voyages)',
          'Offres pour les couples formés sur BOLIGO (mariage, installation)',
          'Publicité toujours signalée, sans ciblage sur des données sensibles',
        ],
        audienceLabel: 'Budget et période envisagés',
        audienceHint: 'Ex. : 1 500 €, printemps 2027, Paris et Abidjan',
      },
      {
        type: 'AMBASSADEUR',
        title: 'Ambassadeurs commerciaux',
        pitch: 'Représentez BOLIGO dans votre ville, votre communauté ou votre réseau.',
        points: [
          'Un code personnel à partager',
          '20 % du prix de chaque Parcours payé avec votre code',
          'Kit de présentation et accompagnement par l’équipe',
          'Suivi mensuel de vos résultats ; ouvert dans tous les pays',
        ],
        audienceLabel: 'Ville, communauté ou réseau couvert',
        audienceHint: 'Ex. : associations de la diaspora congolaise à Bruxelles',
      },
      {
        type: 'CREATEUR',
        title: 'Créateurs et influenceurs',
        pitch: 'Parlez de rencontres sérieuses à votre communauté, avec vos mots.',
        points: [
          '10 % de réduction pour votre audience avec votre code',
          '15 % du prix de chaque Parcours payé avec votre code',
          'Liberté de ton, contenus validés ensemble avant publication',
          'Collaboration toujours affichée, dans le respect de la loi de votre pays',
        ],
        audienceLabel: 'Réseaux et nombre d’abonnés',
        audienceHint: 'Ex. : Instagram 25 k, TikTok 60 k',
      },
    ],
    stepsTitle: 'Comment ça marche',
    steps: [
      { title: 'Candidature', text: 'Deux minutes pour vous présenter.' },
      { title: 'Échange', text: 'L’équipe vous répond sous 5 jours ouvrés.' },
      { title: 'Accord', text: 'Conditions écrites et code personnel.' },
      { title: 'Suivi', text: 'Résultats et commissions chaque mois.' },
    ],
    valuesTitle: 'Nos engagements',
    values: [
      {
        title: 'Données protégées',
        text: 'Aucune donnée de nos membres n’est vendue ni partagée avec un partenaire.',
      },
      {
        title: 'Transparence',
        text: 'Toute publicité ou collaboration est clairement signalée comme telle.',
      },
      {
        title: 'Respect',
        text: 'Pas de promesse trompeuse, pas de ciblage sur la religion, l’origine ou la santé.',
      },
    ],
    formTitle: 'Candidater',
    formIntro: 'Choisissez votre profil et présentez-vous. Tous les champs marqués d’un astérisque sont obligatoires.',
    fields: {
      type: 'Votre profil *',
      name: 'Nom et prénom *',
      email: 'Adresse e-mail *',
      company: 'Marque, société ou nom de scène',
      country: 'Pays *',
      city: 'Ville',
      website: 'Site ou réseaux sociaux',
      message: 'Votre projet *',
      messageHint: 'Qui êtes-vous, que proposez-vous, pourquoi BOLIGO ? (20 caractères minimum)',
    },
    consent:
      'J’accepte que BOLIGO utilise ces informations pour étudier ma candidature et me recontacter. Elles ne sont jamais partagées.',
    privacyLink: 'Politique de confidentialité',
    submit: 'Envoyer ma candidature',
    sending: 'Envoi…',
    successTitle: 'Merci, votre candidature est envoyée',
    successText: 'Vous allez recevoir un e-mail de confirmation. L’équipe vous répond sous 5 jours ouvrés.',
    again: 'Envoyer une autre candidature',
    missing: 'Complétez les champs obligatoires et acceptez l’utilisation de vos informations.',
    contact: 'Une question ? contact@boligo.fr',
  },
  en: {
    langSwitch: 'Français',
    back: 'Back',
    kicker: 'Partner Program',
    title: 'Let’s grow together,',
    titleAccent: 'all around the world.',
    intro:
      'BOLIGO brings together singles looking for a serious relationship built on shared values. Brands, ambassadors, creators: join us to promote a different way of meeting people, in Europe, Africa, the Americas and across the diaspora.',
    cta: 'Become a partner',
    cardsTitle: 'Three ways to work with us',
    cards: [
      {
        type: 'ANNONCEUR',
        title: 'Brands and advertisers',
        pitch: 'Reach committed singles with your brand.',
        points: [
          'Partner of the month in the app and the newsletter',
          'Date ideas and member-only offers (restaurants, outings, travel)',
          'Offers for couples who met on BOLIGO (weddings, moving in)',
          'Ads always labelled, with no targeting on sensitive data',
        ],
        audienceLabel: 'Budget and timing',
        audienceHint: 'E.g. €1,500, spring 2027, London and Lagos',
      },
      {
        type: 'AMBASSADEUR',
        title: 'Sales ambassadors',
        pitch: 'Represent BOLIGO in your city, community or network.',
        points: [
          'A personal code to share',
          '20% of the price of every Journey paid with your code',
          'Presentation kit and support from the team',
          'Monthly results; open in every country',
        ],
        audienceLabel: 'City, community or network covered',
        audienceHint: 'E.g. Ghanaian diaspora associations in London',
      },
      {
        type: 'CREATEUR',
        title: 'Creators and influencers',
        pitch: 'Talk to your community about serious dating, in your own words.',
        points: [
          '10% off for your audience with your code',
          '15% of the price of every Journey paid with your code',
          'Creative freedom, content agreed together before posting',
          'Partnership always disclosed, in line with your country’s rules',
        ],
        audienceLabel: 'Networks and followers',
        audienceHint: 'E.g. Instagram 25k, TikTok 60k',
      },
    ],
    stepsTitle: 'How it works',
    steps: [
      { title: 'Apply', text: 'Two minutes to introduce yourself.' },
      { title: 'Talk', text: 'The team replies within 5 business days.' },
      { title: 'Agree', text: 'Written terms and your personal code.' },
      { title: 'Track', text: 'Results and commissions every month.' },
    ],
    valuesTitle: 'Our commitments',
    values: [
      { title: 'Protected data', text: 'No member data is ever sold or shared with a partner.' },
      { title: 'Transparency', text: 'Every ad or partnership is clearly labelled as such.' },
      {
        title: 'Respect',
        text: 'No misleading promises, no targeting on religion, origin or health.',
      },
    ],
    formTitle: 'Apply',
    formIntro: 'Choose your profile and introduce yourself. Fields marked with an asterisk are required.',
    fields: {
      type: 'Your profile *',
      name: 'Full name *',
      email: 'Email address *',
      company: 'Brand, company or stage name',
      country: 'Country *',
      city: 'City',
      website: 'Website or social media',
      message: 'Your project *',
      messageHint: 'Who are you, what do you offer, why BOLIGO? (at least 20 characters)',
    },
    consent:
      'I agree that BOLIGO may use this information to review my application and contact me. It is never shared.',
    privacyLink: 'Privacy policy',
    submit: 'Send my application',
    sending: 'Sending…',
    successTitle: 'Thank you, your application has been sent',
    successText: 'You will receive a confirmation email. The team will reply within 5 business days.',
    again: 'Send another application',
    missing: 'Please fill in the required fields and accept the use of your information.',
    contact: 'Any question? contact@boligo.fr',
  },
};

/** Langue de départ : celle de l'appareil (français ou anglais). */
export function initialPartnerLang(forced?: PartnerLang): PartnerLang {
  if (forced) return forced;
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'fr';
  }
}

export interface PartnerForm {
  type: PartnerType | null;
  name: string;
  email: string;
  company: string;
  country: string;
  city: string;
  website: string;
  audience: string;
  message: string;
  consent: boolean;
}

/** Le formulaire peut-il être envoyé ? (mêmes règles que l'API). */
export function isPartnerFormValid(f: PartnerForm): boolean {
  return Boolean(
    f.type &&
      f.name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) &&
      f.country.trim().length >= 2 &&
      f.message.trim().length >= 20 &&
      f.consent,
  );
}

/** Corps envoyé à POST /partners/apply (champs vides retirés). */
export function partnerPayload(f: PartnerForm, lang: PartnerLang) {
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    type: f.type,
    name: f.name.trim(),
    email: f.email.trim().toLowerCase(),
    company: opt(f.company),
    country: f.country.trim(),
    city: opt(f.city),
    website: opt(f.website),
    audience: opt(f.audience),
    message: f.message.trim(),
    language: lang,
    consent: f.consent,
  };
}
