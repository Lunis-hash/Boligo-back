/**
 * A11 — accessibilité et libellés des écrans publics (connexion,
 * inscription étape 1, accueil). Vérifie les props qui donnent un nom
 * accessible, l'autocomplétion, les zones tactiles ≥ 44 px, les couleurs
 * de texte et le libellé du prix.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) },
}));
jest.mock('@/context/auth', () => ({ useAuth: () => ({ signIn: jest.fn(), token: null }) }));
jest.mock('@/services/auth', () => ({ AuthService: {} }));
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(async () => ({ data: [] })), post: jest.fn() },
  getReadableError: () => 'err',
}));
jest.mock('@/services/interview', () => ({ InterviewService: {}, getResumeModule: jest.fn() }));
jest.mock('@/services/location', () => ({
  detectPlace: jest.fn(async () => null),
  formatResidence: () => '',
  hasLocationPermission: jest.fn(async () => false),
  normName: (s: string) => s.toLowerCase(),
}));
jest.mock('@/components/CityAutocomplete', () => () => null);
jest.mock('@/services/brandFonts', () => ({ useBrandFonts: () => true }));
jest.mock('@/components/partners/PartnerOffers', () => ({
  PartnerOfMonthSection: () => null,
  ReferralBanner: () => null,
}));

import { Colors } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import LoginScreen from '@/app/(auth)/login';
import ProfileDetails from '@/app/onboarding/profile-details';
import { LandingPage } from '@/components/landing/LandingPage';

/** Rapport de contraste WCAG entre deux couleurs #RRGGBB. */
function contrast(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
const flat = (el: any) => StyleSheet.flatten(el.props.style) || {};
/** Remonte jusqu'à l'élément tactile qui porte le testID. */
const touchable = (testID: string) => flat(screen.getByTestId(testID));

describe('Connexion (login.tsx)', () => {
  beforeEach(() => render(<LoginScreen />));

  it('donne un nom accessible et la bonne autocomplétion aux deux champs', () => {
    const email = screen.getByTestId('login-email');
    expect(email.props.accessibilityLabel).toBe('Email');
    expect(email.props.autoComplete).toBe('email');
    expect(email.props.textContentType).toBe('emailAddress');
    const pwd = screen.getByTestId('login-password');
    expect(pwd.props.accessibilityLabel).toBe('Mot de passe');
    expect(pwd.props.autoComplete).toBe('current-password');
    expect(pwd.props.textContentType).toBe('password');
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Mot de passe')).toBeTruthy();
  });

  it('nomme le bouton œil et lui donne 44 × 44 px', () => {
    expect(screen.getByLabelText('Afficher le mot de passe')).toBeTruthy();
    const eye = touchable('login-toggle-password');
    expect(eye.width).toBeGreaterThanOrEqual(44);
    expect(eye.height).toBeGreaterThanOrEqual(44);
  });

  it('donne 44 px de haut à « Mot de passe oublié ? » et « Créer un compte »', () => {
    expect(touchable('login-forgot-password').minHeight).toBeGreaterThanOrEqual(44);
    expect(touchable('login-signup').minHeight).toBeGreaterThanOrEqual(44);
  });

  it('affiche « pas encore membre ? » et « Nouveau ici » à au moins 4,5:1', () => {
    for (const txt of ['pas encore membre ?', 'Nouveau ici — ']) {
      const style = flat(screen.getByText(txt));
      expect(contrast(style.color, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
      expect(style.fontSize).toBeGreaterThanOrEqual(13);
    }
  });
});

describe('Inscription étape 1 (profile-details.tsx)', () => {
  beforeEach(() => render(<ProfileDetails />));

  it('nomme les champs prénom et nom', () => {
    expect(screen.getByTestId('first-name').props.accessibilityLabel).toMatch(/Prénom/);
    expect(screen.getByTestId('last-name').props.accessibilityLabel).toMatch(/Nom \(privé/);
  });

  it('porte les champs à 44 px et les libellés à 13 px et 4,5:1', () => {
    expect(flat(screen.getByTestId('first-name')).minHeight).toBeGreaterThanOrEqual(44);
    const label = flat(screen.getByText('Prénom *'));
    expect(label.fontSize).toBeGreaterThanOrEqual(13);
    expect(contrast(label.color, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('donne 44 px de haut au lien « Se connecter »', () => {
    expect(touchable('signup-login-link').minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('Accueil (LandingPage.tsx)', () => {
  beforeEach(() => render(<LandingPage />));

  it('affiche 15 € TTC par parcours et par membre, sans abonnement', () => {
    expect(screen.getByTestId('price-harmonie').props.children).toBe('15 € TTC');
    expect(screen.getByText(/par membre, sans abonnement/)).toBeTruthy();
  });

  it('nomme le Grand Entretien dans la carte gratuite', () => {
    expect(screen.getByText('Inscription, Grand Entretien et profils compatibles.')).toBeTruthy();
    expect(screen.queryByText('Inscription, entretien et profils compatibles.')).toBeNull();
  });

  it('rend la mention « Exemples fictifs » lisible (≥ 4,5:1 sur le fond rose clair)', () => {
    const note = flat(screen.getByText('Exemples fictifs, à titre d’illustration.'));
    expect(contrast(note.color, '#FFF8FA')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(Brand.encreDouce, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('donne 44 px de haut aux liens du pied de page', () => {
    expect(touchable('footer-partners').minHeight).toBeGreaterThanOrEqual(44);
  });
});

it('garde les couleurs de la palette (aucune nouvelle couleur)', () => {
  expect(Colors.text.primary70).toBe('#5E4F6E');
  expect(Brand.encreDouce).toBe('#5E4F6E');
});
