import { BankQuestion } from './questions.bank';

/** Question Sondeur prête à persister (IA ou banque). */
export interface HarmonyQuestionPayload {
  day: number;
  theme: string;
  emoji: string;
  text: string;
  options: string[];
  /** Thème fondamental BOLIGO (famille, argent, …) quand il est connu. */
  themeKey?: string;
  /** Technique clinique employée (jamais montrée aux membres). */
  method?: string;
  /** Ce que la question cherche à révéler (jamais montré aux membres). */
  target?: string;
  /** Écart détecté auquel répond une question de l'IA (jamais montré). */
  gap?: string;
  /** Modèle d'IA qui l'a rédigée, puis celui qui l'a relue (traçabilité). */
  writer?: string;
  reviewer?: string;
  /**
   * V8.2 — contrat de preuves (questions de l'IA) : identifiants des preuves
   * invoquées (« E3 », « N-famille ») et nature déclarée (« ecart »,
   * « accord », « neutre »). Jamais montrés aux membres.
   */
  evidence?: string[];
  claim?: string;
  /** Sondeur bilingue : la même question et ses options en anglais. */
  textEn?: string;
  optionsEn?: string[];
}

const DEFAULT_OPTIONS = [
  'Oui, clairement',
  'Non, ce serait difficile',
  'On en discuterait ouvertement',
  'Autre...',
];

export function ensureAutreOption(options: string[]): string[] {
  const trimmed = options
    .map((o) => String(o).trim())
    .filter((o) => o.length > 0)
    .slice(0, 5);
  if (!trimmed.some((o) => o.toLowerCase().startsWith('autre'))) {
    trimmed.push('Autre...');
  }
  return trimmed.length >= 3 ? trimmed : [...DEFAULT_OPTIONS];
}

export function bankToPayload(
  q: BankQuestion,
  day: number,
): HarmonyQuestionPayload {
  return {
    day,
    theme: q.theme,
    emoji: q.emoji,
    text: q.text,
    options: ensureAutreOption(q.options ?? DEFAULT_OPTIONS),
  };
}

export function normalizeAiQuestions(
  raw: unknown,
  /** Nombre maximal de questions gardées (2 candidates par créneau possibles). */
  max = 21,
  /** Nombre minimal de questions valables (Sondeur : écarts seuls, parfois 2). */
  min = 4,
): HarmonyQuestionPayload[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const result: HarmonyQuestionPayload[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const day = Number(o.day);
    const theme = String(o.theme ?? o.thème ?? '').trim();
    const text = String(o.text ?? o.question ?? o.questionText ?? '').trim();
    const emoji = String(o.emoji ?? '💬').trim() || '💬';
    let options: string[] = [];
    if (Array.isArray(o.options)) {
      options = o.options.map((x) => String(x).trim()).filter(Boolean);
    }

    if (![1, 2, 3].includes(day) || !theme || text.length < 12) continue;

    const themeKey = String(o.themeKey ?? o.theme_key ?? '').trim();
    const field = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const method = field(o.methode ?? o.method).slice(0, 160);
    const target = field(o.cible ?? o.target).slice(0, 200);
    // Écart détecté auquel la question répond (DETECTED_GAP), jamais montré.
    const gap = field(o.ecart ?? o.gap).slice(0, 200);
    const rawEvidence = o.preuves ?? o.evidence;
    const evidence = Array.isArray(rawEvidence)
      ? rawEvidence
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.trim())
          .filter((x) => /^(?:E\d{1,3}|N-[a-z]+)$/.test(x))
          .slice(0, 4)
      : [];
    const claim = field(o.nature ?? o.claim).slice(0, 20);
    // Sondeur bilingue : la même question en anglais naturel, et ses options.
    const textEn = field(o.text_en ?? o.textEn).slice(0, 300);
    const optionsEn = Array.isArray(o.options_en ?? o.optionsEn)
      ? ((o.options_en ?? o.optionsEn) as unknown[])
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    result.push({
      day,
      theme,
      emoji,
      text,
      options: ensureAutreOption(options),
      ...(themeKey ? { themeKey } : {}),
      ...(method ? { method } : {}),
      ...(target ? { target } : {}),
      ...(gap ? { gap } : {}),
      ...(evidence.length ? { evidence } : {}),
      ...(claim ? { claim } : {}),
      ...(textEn ? { textEn } : {}),
      ...(optionsEn.length ? { optionsEn } : {}),
    });
  }

  if (result.length < min) return null;

  const seen = new Set<string>();
  const unique: HarmonyQuestionPayload[] = [];
  for (const q of result.sort((a, b) => a.day - b.day)) {
    const key = q.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }

  // Même seuil que pour les questions lues : un jour qui ne porte qu'un écart
  // (trois propositions) n'est pas rejeté en bloc.
  if (unique.length < min) return null;
  return unique.slice(0, max);
}

/** Répartit 21 questions : 7 par jour (indices 0-6 → jour 1, etc.). */
export function assignDaysSevenPerDay(
  questions: HarmonyQuestionPayload[],
): HarmonyQuestionPayload[] {
  return questions.slice(0, 21).map((q, i) => ({
    ...q,
    day: Math.floor(i / 7) + 1,
  }));
}
