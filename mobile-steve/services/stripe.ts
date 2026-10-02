/**
 * Point d'entrée Stripe pour iOS / Android.
 * La variante web (stripe.web.ts) est choisie automatiquement par Metro :
 * @stripe/stripe-react-native ne peut pas être empaqueté pour le web.
 */
export { StripeProvider, useStripe } from '@stripe/stripe-react-native';
