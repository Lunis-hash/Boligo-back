import type { ComponentType } from 'react';
import {
  BookOpen,
  Baby,
  Briefcase,
  ChefHat,
  Cigarette,
  CigaretteOff,
  Cpu,
  HardHat,
  Landmark,
  Palette,
  Stethoscope,
  CircleCheck,
  Clock,
  Compass,
  Gem,
  Globe,
  GraduationCap,
  HandHeart,
  Heart,
  HeartPulse,
  MapPin,
  MessageCircle,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Users,
  Wallet,
} from 'lucide-react-native';
import { Brand } from '@/constants/brand';

/**
 * Icônes au trait de la marque, à la place des émojis renvoyés par le serveur :
 * même épaisseur, mêmes couleurs, sur tous les écrans.
 */
type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface IconProps {
  size?: number;
  color?: string;
}

/** Les 11 modules du Grand Entretien (0 à 10). */
const MODULE_ICONS: IconComponent[] = [
  Target, // Filtres non négociables
  Globe, // Identité & culture
  HeartPulse, // Attachement & émotions
  BookOpen, // Vécu & contexte
  Wallet, // Vision économique
  Users, // Dynamique sociale & familiale
  MessageCircle, // Quotidien & communication
  Compass, // Trajectoire de vie & personnalité
  Gem, // Projet de couple
  HandHeart, // Effort & capacité à aimer
  Sparkles, // Alchimie & désir
];

export function ModuleIcon({ module, size = 20, color = Brand.framboise }: IconProps & { module?: number | null }) {
  const Icon = (module != null && MODULE_ICONS[module]) || Sparkles;
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}

/** Thème d'une journée du Sondeur, d'après son intitulé. */
export function ThemeIcon({ theme, size = 18, color = Brand.lavande }: IconProps & { theme?: string | null }) {
  const t = (theme ?? '').toLowerCase();
  const Icon: IconComponent = t.includes('rouge')
    ? ShieldAlert
    : t.includes('valeur')
      ? Scale
      : t.includes('futur') || t.includes('avenir')
        ? Compass
        : t.includes('intim') || t.includes('amour')
          ? Heart
          : t.includes('argent') || t.includes('financ')
            ? Wallet
            : t.includes('famil')
              ? Users
              : MessageCircle;
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}

/** Attentes d'un profil (le serveur les étiquette avec un émoji). */
const EXPECTATION_ICONS: Record<string, IconComponent> = {
  '⏱️': Clock,
  '⏱': Clock,
  '✨': Sparkles,
  '💞': Heart,
  '🛡️': Shield,
  '🛡': Shield,
};

export function ExpectationIcon({ tag, size = 20, color = Brand.framboise }: IconProps & { tag?: string | null }) {
  const Icon = (tag && EXPECTATION_ICONS[tag]) || CircleCheck;
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}

/** Informations de fiche (situation, enfants, études…). */
const DETAIL_ICONS: Record<string, IconComponent> = {
  situation: Gem,
  children: Baby,
  childrenWish: Heart,
  religion: Sun,
  education: GraduationCap,
  lifestyle: Sprout,
  city: MapPin,
};

export function DetailIcon({
  field,
  value,
  size = 15,
  color = Brand.lavande,
}: IconProps & { field: string; value?: string }) {
  // Tabac : icône barrée pour un non-fumeur.
  if (field === 'smoking') {
    const Smoke = value && /^non/i.test(value) ? CigaretteOff : Cigarette;
    return <Smoke size={size} color={color} strokeWidth={1.9} />;
  }
  const Icon = DETAIL_ICONS[field] || CircleCheck;
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}

/** Catégories de métiers du formulaire d'inscription. */
export function ProfessionIcon({ category, size = 16, color = Brand.lavande }: IconProps & { category: string }) {
  const c = category.toLowerCase();
  const Icon: IconComponent = c.startsWith('technolog')
    ? Cpu
    : c.startsWith('santé')
      ? Stethoscope
      : c.startsWith('droit')
        ? Scale
        : c.startsWith('business')
          ? Briefcase
          : c.startsWith('ingénierie')
            ? HardHat
            : c.startsWith('enseignement')
              ? GraduationCap
              : c.startsWith('art')
                ? Palette
                : c.startsWith('fonction')
                  ? Landmark
                  : c.startsWith('artisanat')
                    ? ChefHat
                    : c.startsWith('études')
                      ? Sprout
                      : CircleCheck;
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}
