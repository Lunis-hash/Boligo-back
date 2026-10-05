/**
 * Génère le document du questionnaire BOLIGO (V6.1), en français et en anglais,
 * à partir des données du Grand Entretien : le document et l'application ne
 * peuvent donc pas diverger.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/questionnaire-doc.ts
 *
 * Sortie : docs/questionnaire/BOLIGO_Questionnaire_V6_1_FR.html et _EN.html
 * (importables tels quels dans Google Docs ou Word).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  QUESTIONS,
  Question,
  QuestionDependency,
  V6_CHANGES,
  V61_ADDED,
} from '../src/interview/questions.data';
import {
  InterviewLanguage,
  localizeQuestion,
} from '../src/interview/questions.en';
import { DIVERGENCE_RULES, Severity } from '../src/matching/divergence.engine';
import {
  ATTACHMENT_ANXIETY,
  ATTACHMENT_AVOIDANCE,
  BIG_FIVE,
  CONTEMPT,
  CRITICISM,
  DEFENSIVENESS,
  DEMANDINGNESS,
  HABIT_ITEM_IDS,
  RED_FLAG_HABITS,
  SHYNESS,
  REAPPRAISAL,
  SOCIAL_DESIRABILITY,
  STONEWALLING,
  SUPPRESSION,
} from '../src/psychometrics/psychometrics';

type Lang = InterviewLanguage;

const MODULES: Record<Lang, string[]> = {
  fr: [
    'Filtres non négociables',
    'Identité & culture',
    'Attachement & régulation émotionnelle',
    'Vécu & contexte',
    'Vision économique',
    'Dynamique sociale & familiale',
    'Quotidien, communication réelle & limites',
    'Trajectoire de vie & personnalité',
    'Projet de couple',
    'Pouvoir, effort & capacité à aimer',
    'Alchimie, vibe & désir',
  ],
  en: [
    'Non-negotiable filters',
    'Identity & culture',
    'Attachment & emotional regulation',
    'Past & context',
    'Economic vision',
    'Social & family dynamics',
    'Daily life, real communication & limits',
    'Life trajectory & personality',
    'Couple project',
    'Power, effort & capacity to love',
    'Alchemy, vibe & desire',
  ],
};

const SEVERITY: Record<Lang, Record<Severity, string>> = {
  fr: {
    critique: '🔴 incompatibilité déclarée',
    majeure: '🟠 divergence majeure',
    moderee: '🟡 à explorer pendant le Sondeur',
    mineure: 'nuance',
  },
  en: {
    critique: '🔴 declared incompatibility',
    majeure: '🟠 major divergence',
    moderee: '🟡 to explore during the Sonder',
    mineure: 'nuance',
  },
};

const CHANGE: Record<Lang, Record<string, string>> = {
  fr: {
    nouvelle: '★ Nouvelle (V6)',
    nouvelle61: '★ Nouvelle (V6.1)',
    retablie: '↺ Rétablie depuis la V5',
    reformulee: '✎ Reformulée (V6)',
  },
  en: {
    nouvelle: '★ New (V6)',
    nouvelle61: '★ New (V6.1)',
    retablie: '↺ Restored from V5',
    reformulee: '✎ Reworded (V6)',
  },
};

/** Échelle d'appartenance d'une affirmation (et sens de notation). */
function scaleOf(id: string, lang: Lang): string | null {
  const fr = lang === 'fr';
  const groups: Array<[string, Array<{ id: string; reverse?: boolean }>]> = [
    [fr ? 'Anxiété d’attachement' : 'Attachment anxiety', ATTACHMENT_ANXIETY],
    [
      fr ? 'Évitement d’attachement' : 'Attachment avoidance',
      ATTACHMENT_AVOIDANCE,
    ],
    [fr ? 'Réévaluation émotionnelle' : 'Cognitive reappraisal', REAPPRAISAL],
    [fr ? 'Suppression émotionnelle' : 'Emotional suppression', SUPPRESSION],
    [fr ? 'Critique (Gottman)' : 'Criticism (Gottman)', CRITICISM],
    [fr ? 'Mépris (Gottman)' : 'Contempt (Gottman)', CONTEMPT],
    [
      fr ? 'Attitude défensive (Gottman)' : 'Defensiveness (Gottman)',
      DEFENSIVENESS,
    ],
    [fr ? 'Repli (Gottman)' : 'Stonewalling (Gottman)', STONEWALLING],
    [fr ? 'Extraversion' : 'Extraversion', BIG_FIVE.extraversion],
    [fr ? 'Agréabilité' : 'Agreeableness', BIG_FIVE.agreeableness],
    [fr ? 'Conscience' : 'Conscientiousness', BIG_FIVE.conscientiousness],
    [
      fr ? 'Stabilité émotionnelle' : 'Emotional stability',
      BIG_FIVE.emotionalStability,
    ],
    [fr ? 'Ouverture' : 'Openness', BIG_FIVE.openness],
    [fr ? 'Timidité au début d’une relation' : 'Early shyness', SHYNESS],
    [
      fr
        ? 'Caractère exigeant (bouderie, attentes non dites, impatience)'
        : 'Demandingness (sulking, unspoken expectations, impatience)',
      DEMANDINGNESS,
    ],
  ];
  for (const [label, items] of groups) {
    const item = items.find((i) => i.id === id);
    if (item)
      return `${label}${item.reverse ? (fr ? ' — item inversé' : ' — reverse-scored') : ''}`;
  }
  if (HABIT_ITEM_IDS.includes(id))
    return fr
      ? 'Habitude — lue seulement face aux signaux d’alerte de l’autre (M8_Q10)'
      : 'Habit — only read against the other member’s red flags (M8_Q10)';
  if (SOCIAL_DESIRABILITY.includes(id))
    return fr
      ? 'Contrôle de sincérité (désirabilité sociale) — jamais montré ni pénalisé'
      : 'Sincerity check (social desirability) — never shown, never penalised';
  return null;
}

/** Lectures croisées V6.1 (pas de règle question par question). */
function crossSignals(id: string, lang: Lang): string[] {
  const fr = lang === 'fr';
  const flags = Object.keys(RED_FLAG_HABITS).join(', ');
  const table: Record<string, [string, string]> = {
    M8_Q10: [
      `${flags} cochés face à la même habitude chez l'autre : « souvent » → ${SEVERITY.fr.moderee}, « très souvent » → ${SEVERITY.fr.majeure}. F, G, I : sujets du Sondeur.`,
      `${flags} ticked against the same habit in the other member: "often" → ${SEVERITY.en.moderee}, "very often" → ${SEVERITY.en.majeure}. F, G, I: Sonder topics.`,
    ],
    M9_Q19: [
      `Face à un caractère exigeant (échelle ≥ 70) : D → ${SEVERITY.fr.majeure}, C → ${SEVERITY.fr.moderee}, A → nuance. Deux caractères exigeants → ${SEVERITY.fr.moderee} (risque partagé).`,
      `Against a demanding character (scale ≥ 70): D → ${SEVERITY.en.majeure}, C → ${SEVERITY.en.moderee}, A → nuance. Two demanding characters → ${SEVERITY.en.moderee} (shared risk).`,
    ],
    M2_Q19: [
      'Deux timidités (échelle ≥ 70), ou une timidité face à « on se parle de tout, tout le temps » (M8_Q06 = A) → nuance, abordée par le Sondeur.',
      'Two shy members (scale ≥ 70), or shyness against "we talk about everything, all the time" (M8_Q06 = A) → nuance, raised by the Sonder.',
    ],
    M10_Q11: [
      'Comparée à l’allure de l’autre (M10_Q12) : même allure → affinité du module 10 plus forte. F ne compte ni pour ni contre.',
      'Compared with the other member’s look (M10_Q12): same look → stronger module 10 affinity. F counts neither for nor against.',
    ],
    M10_Q13: [
      'Comparée à ce qu’on remarque chez l’autre (M10_Q14) : même déclic → affinité du module 10 plus forte.',
      'Compared with what people notice in the other member (M10_Q14): same spark → stronger module 10 affinity.',
    ],
  };
  const t = table[id];
  return t ? [fr ? t[0] : t[1]] : [];
}

/** Signaux de compatibilité d'une question, déduits des règles réelles du moteur. */
function signals(q: Question, lang: Lang): string[] {
  const cross = crossSignals(q.id, lang);
  if (cross.length) return cross;
  const rule = DIVERGENCE_RULES.find((r) => r.questionId === q.id);
  if (!rule) return [];
  const keys = q.options.map((o) => o.key);
  const out: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const s = rule.severity(keys[i], keys[j]);
      if (s && s !== 'mineure')
        out.push(`${keys[i]} + ${keys[j]} → ${SEVERITY[lang][s]}`);
    }
  }
  for (const [key, s] of Object.entries(rule.sameRisk ?? {})) {
    if (s)
      out.push(
        lang === 'fr'
          ? `${key} des deux côtés → ${SEVERITY[lang][s]} (risque partagé)`
          : `${key} on both sides → ${SEVERITY[lang][s]} (shared risk)`,
      );
  }
  return out;
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function condition(q: Question, lang: Lang): string | null {
  const r = q.rules;
  if (!r) return null;
  const fr = lang === 'fr';
  const parts: string[] = [];
  if (r.maxAge)
    parts.push(fr ? `posée avant ${r.maxAge} ans` : `asked under ${r.maxAge}`);
  if (r.minAge)
    parts.push(
      fr ? `posée à partir de ${r.minAge} ans` : `asked from age ${r.minAge}`,
    );
  if (r.dependsOn) {
    const deps: QuestionDependency[] = Array.isArray(r.dependsOn)
      ? r.dependsOn
      : [r.dependsOn];
    parts.push(
      deps
        .map((d) => `${d.questionId} = ${d.values.join('/')}`)
        .join(fr ? ' ou ' : ' or '),
    );
  }
  return parts.length ? parts.join(' · ') : null;
}

const INTRO: Record<Lang, string> = {
  fr: `
<h1>BOLIGO — Questionnaire de compatibilité V6.1</h1>
<p><b>Grand Entretien — version française.</b> ${QUESTIONS.length} questions en 11 modules (0 à 10). Document généré à partir de l'application : chaque question, chaque option et chaque signal ci-dessous est celui que l'application utilise réellement.</p>

<h2>Ce qui change en V6.1 (5 octobre 2026)</h2>
<ul>
<li><b>Orthographe</b> : audit complet en français et en anglais (par exemple M9_Q03 : « ce que vous donnez et ce que vous recevez »).</li>
<li><b>Argent</b> : qui paie au premier rendez-vous (l'homme, celui qui invite, moitié-moitié), soutien quand l'argent manque, place du niveau de vie dans le choix d'un partenaire, prêt des affaires personnelles (voiture, téléphone).</li>
<li><b>Attirance physique</b>, sans aucun critère de corps : l'allure des personnes qui vous ont déjà fait chavirer, comparée à l'allure de l'autre ; ce qui provoque votre déclic, comparé à ce qu'on remarque en premier chez l'autre ; rythme de l'attirance. Les préférences idéales déclarées prédisent mal l'attirance réelle (Eastwick &amp; Finkel, 2008), alors que les partenaires passés d'une même personne se ressemblent (Park &amp; MacDonald, 2019).</li>
<li><b>Signaux d'alerte actuels</b>, pour les femmes comme pour les hommes (3 au plus) : déclarations trop rapides, jalousie qui contrôle, disparitions sans explication, intentions floues, mépris des ex, impolitesse, dépendance financière, torts jamais reconnus, « non » ignoré, téléphone pendant les moments à deux. Ils sont croisés avec les habitudes que l'autre déclare.</li>
<li><b>Caractère exigeant (« capricieux »)</b> et tolérance à ce caractère : bouderie, attente que l'autre devine, impatience ; patience de l'autre face à la bouderie.</li>
<li><b>Timidité et ouverture</b> : timidité au début d'une relation, lenteur à se confier, facilité à recevoir les confidences. Le profil relationnel conseille le membre timide ; le Sondeur, écrit et à son rythme, précède l'appel vidéo.</li>
<li><b>Maladie et handicap</b> : une seule question d'attitude (prendre soin de l'autre). BOLIGO ne demande jamais à un membre s'il a un handicap : c'est une donnée de santé (RGPD, article 9) et un motif de discrimination interdit (Code pénal, article 225-1).</li>
<li><b>Langues</b> : celles du pays de résidence sont pré-cochées ; « une autre langue » se précise en toutes lettres et rapproche deux membres qui écrivent la même.</li>
<li><b>Sondeur</b> : formulations concrètes propres à chaque nouveau sujet (« le serveur pose l'addition… ») et questions de fond dans chaque thème.</li>
</ul>

<h2>Ce qui change par rapport à la V5</h2>
<ul>
<li><b>Questions de la V5 rétablies</b> (absentes de l'application) : interdits alimentaires, transmission culturelle aux enfants, désaccord de la famille, questions miroir, temps de réconciliation, conflits non résolus avec l'ex, dot ou Mahr, violence physique, mots blessants, refus d'intimité, style de communication.</li>
<li><b>Échelles validées par la recherche</b> (formulations originales BOLIGO, notées de 1 à 5, certaines inversées pour limiter les réponses automatiques) : attachement (anxiété et évitement, modèle ECR-R), régulation des émotions (ERQ), les « quatre cavaliers » de Gottman en dispute (critique, mépris, attitude défensive, repli), personnalité en cinq traits (structure du BFI-10), contrôle de sincérité.</li>
<li><b>Langues</b> : nouvelle question à choix multiple. Deux membres ne sont présentés l'un à l'autre que s'ils partagent au moins une langue du quotidien. Les entretiens antérieurs comptent comme francophones.</li>
<li><b>Risques partagés</b> : une même réponse des deux côtés peut être un risque (deux silences de plusieurs jours, deux refus de s'excuser). La V5 le prévoyait (« signal rouge si deux D ») ; c'est désormais appliqué.</li>
<li><b>Questions reformulées</b> : « Avez-vous suivi un accompagnement psychologique ? » devient l'ouverture à demander de l'aide. On mesure une attitude, plus un antécédent de santé (RGPD, article 9). Les réponses déjà données gardent leur sens.</li>
<li><b>Bilinguisme</b> : chaque question existe en français et en anglais, avec les mêmes clés de réponse. Deux membres qui ont répondu dans deux langues différentes restent comparables.</li>
</ul>

<h2>Approche « quasi clinique », sans diagnostic</h2>
<p>BOLIGO s'approche de la rigueur d'un questionnaire médical :</p>
<ul>
<li>des construits validés ;</li>
<li>plusieurs affirmations par trait ;</li>
<li>des items inversés ;</li>
<li>des questions miroir ;</li>
<li>un contrôle de sincérité.</li>
</ul>
<p>BOLIGO ne pose en revanche <b>aucun diagnostic</b>, ne collecte <b>aucune donnée de santé</b> et ne classe personne dans une catégorie clinique. Les résultats sont des repères de compatibilité, formulés avec bienveillance. Le membre est seul à voir son profil relationnel ; les autres membres n'en voient que les points de vigilance du couple.</p>
<p>La recherche montre que ce qui se joue <i>entre</i> deux personnes prédit mieux la satisfaction que leurs profils pris séparément (Joel et al., 2020). Les échelles servent donc à proposer les bonnes rencontres et à orienter le Sondeur ; la décision se construit pendant le parcours (questions, conversation, vidéo).</p>

<h2>Comment les réponses sont utilisées</h2>
<ul>
<li><b>🔴 Incompatibilité déclarée</b> : score ramené sous 55 %. Le profil n'est pas proposé en Découverte et l'invitation est refusée.</li>
<li><b>🟠 Divergence majeure</b> : plafonne le score (au plus 79 % avec une divergence majeure). Le Sondeur l'aborde dès le jour 1.</li>
<li><b>🟡 À explorer</b> : sujet proposé pendant le Sondeur.</li>
<li><b>Échelles</b> : scores de 0 à 100. Ils pèsent sur les affinités des modules 2 (sécurité d'attachement, régulation), 6 (dispute) et 7 (personnalité).</li>
<li><b>Lectures croisées</b>, en plus des règles question par question :
<ul>
<li>besoin d'être rassuré(e) d'un côté, besoin d'espace de l'autre → divergence majeure ;</li>
<li>reproches d'un côté, repli de l'autre → divergence majeure ;</li>
<li>repli des deux côtés → à explorer ;</li>
<li>ironie ou mépris fréquents → à explorer.</li>
</ul></li>
<li><b>Croisements entre questions</b> :
<ul>
<li>religion (M1_Q05 et M1_Q06) ;</li>
<li>culture d'origine (M1_Q01 et M1_Q02) ;</li>
<li>tabac (M0_Q08 et M0_Q09) ;</li>
<li>ligne rouge « enfants ou religion » (M8_Q05).</li>
</ul></li>
</ul>

<h2>Échelles de réponse</h2>
<p><b>Accord</b> : A Pas du tout d'accord · B Plutôt pas d'accord · C Ni d'accord ni pas d'accord · D Plutôt d'accord · E Tout à fait d'accord.<br>
<b>Fréquence</b> : A Jamais · B Rarement · C Parfois · D Souvent · E Très souvent.</p>
`,
  en: `
<h1>BOLIGO — Compatibility Questionnaire V6.1</h1>
<p><b>Mental Map Interview — English version.</b> ${QUESTIONS.length} questions in 11 modules (0 to 10). Generated from the app: every question, option and signal below is exactly what the app uses.</p>

<h2>What changes in V6.1 (5 October 2026)</h2>
<ul>
<li><b>Spelling</b>: full review in French and English (e.g. M9_Q03: "what you give versus what you receive").</li>
<li><b>Money</b>: who pays on a first date (the man, whoever invited, fifty-fifty), support when money runs short, the place of lifestyle in choosing a partner, lending personal belongings (car, phone).</li>
<li><b>Physical attraction</b>, with no body criteria: the look of people who swept you off your feet, compared with the other member's look; what sparks your attraction, compared with what people notice first in the other; the pace of attraction. Stated ideal preferences predict actual attraction poorly (Eastwick &amp; Finkel, 2008), whereas a person's past partners resemble each other (Park &amp; MacDonald, 2019).</li>
<li><b>Current red flags</b>, for women and men alike (3 at most): overwhelming early declarations, controlling jealousy, disappearing without explanation, vague intentions, badmouthing exes, rudeness, financial dependence, never admitting fault, ignoring a "no", phone during time together. They are matched against the habits the other member reports.</li>
<li><b>Demanding ("capricious") character</b> and tolerance of it: sulking, expecting the other to guess, impatience; the other member's patience with sulking.</li>
<li><b>Shyness and openness</b>: early shyness, slowness to confide, ease in receiving confidences. The relational profile advises shy members; the written Sonder, at their own pace, comes before the video call.</li>
<li><b>Illness and disability</b>: a single attitude question (caring for the other). BOLIGO never asks members whether they have a disability: it is health data (GDPR, article 9) and a prohibited ground of discrimination (French Criminal Code, article 225-1).</li>
<li><b>Languages</b>: those of the country of residence are pre-selected; "another language" is written in and brings together members who write the same one.</li>
<li><b>Sonder</b>: concrete wording specific to each new topic ("the waiter puts the bill on the table…") and in-depth questions in every theme.</li>
</ul>

<h2>What changes compared with V5</h2>
<ul>
<li><b>V5 questions restored</b> (they were missing from the app): dietary restrictions, passing culture on to children, family disapproval, mirror questions, time to reconcile, unresolved conflicts with an ex, dowry or Mahr, physical violence, hurtful words, declining intimacy, communication style.</li>
<li><b>Research-validated scales</b> (original BOLIGO wording, scored 1 to 5, some reverse-scored to limit automatic answering): attachment anxiety and avoidance (ECR-R model), emotion regulation (ERQ), Gottman's "four horsemen" in conflict (criticism, contempt, defensiveness, stonewalling), five-trait personality (BFI-10 structure), sincerity check.</li>
<li><b>Languages</b>: a new multiple-choice question. Two members are only introduced if they share at least one everyday language. Earlier interviews count as French-speaking.</li>
<li><b>Shared risks</b>: the same answer on both sides can be a risk (two silences lasting days, two refusals to apologise). V5 planned this ("red signal if two D"); it is now enforced.</li>
<li><b>Reworded questions</b>: "Have you undertaken psychological support?" becomes openness to seeking help. It measures an attitude, no longer a health history (GDPR, article 9). Existing answers keep their meaning.</li>
<li><b>Bilingual</b>: every question exists in French and English with the same answer keys. Two members who answered in different languages remain comparable.</li>
</ul>

<h2>A "near-clinical" approach, without diagnosis</h2>
<p>BOLIGO comes close to the rigour of a medical questionnaire:</p>
<ul>
<li>validated constructs;</li>
<li>several statements per trait;</li>
<li>reverse-scored items;</li>
<li>mirror questions;</li>
<li>a sincerity check.</li>
</ul>
<p>It does <b>not</b> make any diagnosis, collects <b>no health data</b> and never puts anyone in a clinical category. Results are compatibility markers, written with care. Only the member sees their relational profile; other members only see the couple's points of attention.</p>
<p>Research shows that what happens <i>between</i> two people predicts satisfaction better than their separate profiles (Joel et al., 2020). The scales therefore serve to suggest the right matches and to guide the Sonder; the decision is built during the journey (questions, conversation, video).</p>

<h2>How answers are used</h2>
<ul>
<li><b>🔴 Declared incompatibility</b>: the score drops below 55%. The profile is not shown in Discover and the invitation is refused.</li>
<li><b>🟠 Major divergence</b>: caps the score (at most 79% with one major divergence). The Sonder addresses it from day 1.</li>
<li><b>🟡 To explore</b>: a topic raised during the Sonder.</li>
<li><b>Scales</b>: scores from 0 to 100. They weigh on module affinities 2 (attachment security, regulation), 6 (conflict) and 7 (personality).</li>
<li><b>Cross readings</b>, on top of the question-by-question rules:
<ul>
<li>need for reassurance on one side, need for space on the other → major divergence;</li>
<li>criticism on one side, stonewalling on the other → major divergence;</li>
<li>stonewalling on both sides → to explore;</li>
<li>frequent sarcasm or contempt → to explore.</li>
</ul></li>
<li><b>Cross-question rules</b>:
<ul>
<li>religion (M1_Q05 and M1_Q06);</li>
<li>cultural origin (M1_Q01 and M1_Q02);</li>
<li>tobacco (M0_Q08 and M0_Q09);</li>
<li>"children or religion" deal-breaker (M8_Q05).</li>
</ul></li>
</ul>

<h2>Answer scales</h2>
<p><b>Agreement</b>: A Strongly disagree · B Somewhat disagree · C Neither agree nor disagree · D Somewhat agree · E Strongly agree.<br>
<b>Frequency</b>: A Never · B Rarely · C Sometimes · D Often · E Very often.</p>
`,
};

function render(lang: Lang): string {
  const fr = lang === 'fr';
  const html: string[] = [
    '<!doctype html><html><head><meta charset="utf-8"><title>BOLIGO Questionnaire V6.1</title></head><body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4">',
    INTRO[lang],
  ];
  for (let m = 0; m <= 10; m++) {
    const questions = QUESTIONS.filter((q) => q.moduleNumber === m);
    html.push(
      `<h2>Module ${m} — ${esc(MODULES[lang][m])} (${questions.length} questions)</h2>`,
    );
    for (const raw of questions) {
      const q = localizeQuestion(raw, lang);
      const tags: string[] = [];
      const change = V61_ADDED.has(q.id) ? 'nouvelle61' : V6_CHANGES[q.id];
      if (change) tags.push(CHANGE[lang][change]);
      if (q.multiple)
        tags.push(
          q.maxChoices
            ? fr
              ? `${q.maxChoices} réponses au plus`
              : `${q.maxChoices} answers at most`
            : fr
              ? 'Plusieurs réponses possibles'
              : 'Several answers possible',
        );
      if (q.id === 'M0_Q10')
        tags.push(
          fr
            ? 'Quatre propositions : langue du pays (selon la géolocalisation ou le pays d’inscription), anglais, espagnol, autre langue à écrire'
            : 'Four choices: the language of the country (from geolocation or the sign-up country), English, Spanish, another language to write in',
        );
      const cond = condition(q, lang);
      if (cond) tags.push((fr ? 'Condition : ' : 'Condition: ') + cond);
      html.push(
        `<p><b>${q.id}. ${esc(q.text)}</b>${tags.length ? `<br><i>${esc(tags.join(' · '))}</i>` : ''}</p>`,
      );
      const scale = scaleOf(q.id, lang);
      if (q.scale) {
        html.push(
          `<p style="margin-left:18pt">${fr ? 'Réponse :' : 'Answer:'} ${q.scale === 'accord' ? (fr ? 'échelle d’accord (A à E)' : 'agreement scale (A to E)') : fr ? 'échelle de fréquence (A à E)' : 'frequency scale (A to E)'}${scale ? ` — ${esc(scale)}` : ''}</p>`,
        );
      } else if (q.id === 'M0_Q10') {
        // Le membre ne voit que quatre propositions, lues A à D.
        html.push(
          `<p style="margin-left:18pt">${(fr
            ? [
                'A. La langue du pays de résidence (français par défaut ; portugais au Portugal…), cochée d’office',
                'B. Anglais — English',
                'C. Espagnol — Español',
                'D. Une autre langue (précisez) — les autres langues du pays y sont pré-écrites (wolof au Sénégal, lingala en RDC, allemand en Allemagne…)',
              ]
            : [
                'A. The language of the country of residence (French by default; Portuguese in Portugal…), pre-selected',
                'B. English',
                'C. Spanish — Español',
                'D. Another language (please specify) — the country’s other languages are pre-filled (Wolof in Senegal, Lingala in the DRC, German in Germany…)',
              ]
          )
            .map(esc)
            .join('<br>')}</p>`,
        );
      } else {
        html.push(
          `<p style="margin-left:18pt">${q.options.map((o) => `${o.key}. ${esc(o.text)}`).join('<br>')}</p>`,
        );
      }
      const sig = signals(raw, lang);
      if (sig.length) {
        html.push(
          `<p style="margin-left:18pt; color:#5E4F6E">${fr ? 'Signal :' : 'Signal:'} ${sig.map(esc).join(' · ')}</p>`,
        );
      }
    }
  }
  html.push(
    `<p style="color:#5E4F6E"><i>${fr ? 'BOLIGO — document généré depuis l’application' : 'BOLIGO — generated from the app'} (${new Date().toISOString().slice(0, 10)}).</i></p></body></html>`,
  );
  return html.join('\n');
}

const outDir = path.resolve(__dirname, '..', 'docs', 'questionnaire');
fs.mkdirSync(outDir, { recursive: true });
for (const lang of ['fr', 'en'] as const) {
  const file = path.join(
    outDir,
    `BOLIGO_Questionnaire_V6_1_${lang === 'fr' ? 'FR' : 'EN'}.html`,
  );
  fs.writeFileSync(file, render(lang));
  console.log(file);
}
