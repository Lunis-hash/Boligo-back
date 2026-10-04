import { Redirect } from 'expo-router';

/**
 * Les diapositives de présentation ont été remplacées par la page d'accueil,
 * qui présente déjà le concept, le parcours et le tarif. L'adresse reste
 * valable pour les anciens liens et mène directement à l'inscription.
 */
export default function ValueSlidesRedirect() {
  return <Redirect href="/onboarding/profile-details" />;
}
