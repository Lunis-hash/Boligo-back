/** Petites mises en forme de dates pour la messagerie. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jour de l'étape en cours (1 à 3), d'après la date de début renvoyée par le serveur. */
export function stepDay(stepStartDate: string | null | undefined, totalDays = 3, now = Date.now()): number {
  const start = stepStartDate ? new Date(stepStartDate).getTime() : NaN;
  if (!Number.isFinite(start)) return 1;
  return Math.min(totalDays, Math.max(1, Math.floor((now - start) / DAY_MS) + 1));
}

/** « À l'instant », « Il y a 5 min », « Il y a 3 h », « Hier », « Il y a 4 j ». */
export function formatSince(iso: string | null | undefined, now = Date.now()): string {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Hier' : `Il y a ${d} j`;
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Séparateur de la conversation : « Aujourd'hui », « Hier » ou « lundi 5 octobre » (heure locale). */
export function dayLabel(iso: string | null | undefined, now = Date.now()): string {
  const d = iso ? new Date(iso) : null;
  if (!d || !Number.isFinite(d.getTime())) return '';
  const startOf = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const diff = Math.round((startOf(new Date(now)) - startOf(d)) / DAY_MS);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`;
}
