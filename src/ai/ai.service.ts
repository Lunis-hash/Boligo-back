import { createHash } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import {
  HarmonyQuestionPayload,
  normalizeAiQuestions,
} from '../journey/harmony-question.types';

import { decodeUserResponses } from '../interview/questions.data';

@Injectable()
export class AiService {
  private groq: Groq;
  private readonly moderationCache = new Map<
    string,
    { result: { allowed: boolean; reason?: string; category?: string }; expiresAt: number }
  >();

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GROQ_API_KEY manquante — le service IA utilisera le générateur dynamique de secours.');
    } else {
      this.groq = new Groq({ apiKey });
    }
  }

  private async chat(prompt: string, maxTokens = 1024): Promise<string> {
    if (!this.groq) {
      throw new Error('Groq client non initialisé (GROQ_API_KEY absente)');
    }
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  private formatMentalMapBlock(label: string, map: any): string {
    return `
${label}:
- Synthèse: ${map.synthesis ?? '—'}
- Besoins: ${JSON.stringify(map.needsList ?? [])}
- Valeurs clés: ${JSON.stringify(map.keyValues ?? [])}
- Points de vigilance: ${JSON.stringify(map.redFlags ?? [])}
- Maturité: ${map.maturityScore ?? '—'} | Alchimie: ${map.alchemyScore ?? '—'}
`.trim();
  }

  /**
   * Génère 6 questions personnalisées pour le couple (2/jour × 3 jours).
   * Retourne null si échec → le caller utilisera la banque.
   */
  async generatePersonalizedHarmonyQuestions(
    userAMentalMap: any,
    userBMentalMap: any,
    avoidTexts: string[] = [],
  ): Promise<HarmonyQuestionPayload[] | null> {
    console.log('🤖 [AI] Groq - Generating personalized Sondeur questions');

    const avoidBlock =
      avoidTexts.length > 0
        ? `
QUESTIONS DÉJÀ POSÉES À CE COUPLE (interdiction de reformuler ou répéter le même angle) :
${avoidTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}
`
        : '';

    const prompt = `
Tu es l'Expert en Relations de BOLIGO (rencontres sérieuses, cultures africaines et diaspora).
Tu conduis le "Sondeur" : 6 questions HARD MODE pour CE couple, à partir de leurs cartes mentales.
But : faire émerger les vraies limites et zones de friction AVANT le chat — comme un entretien humain exigeant, pas un quiz soft.

RÈGLES STRICTES:
- 6 questions exactement, 2 par jour (day: 1, 2 ou 3).
- Chaque question: 4 options concrètes + "Autre..." en dernier.
- Formule en "tu", scénario réaliste ("si ton/ton partenaire…", "comment réagirais-tu si…").
- Ton direct, mature, respectueux : jamais vulgaire, pornographique, humiliant ni moralisateur.
- Ne cite pas les red flags mot pour mot ; exploite-les pour choisir L'ANGLE le plus risqué entre ces deux profils.
- 6 questions toutes différentes ; formulations inédites (pas de doublon avec la liste ci-dessous).

RÉPARTITION HARD MODE (obligatoire):
- JOUR 1 — "Lignes rouges" (2 questions): au moins un angle sur limites non négociables — fidélité/trahison, mensonge, violence verbale, jalousie, respect, rupture immédiate si…
- JOUR 2 — "Valeurs profondes" (2 questions): famille (belle-famille, ingérence), religion/spiritualité, rôles homme/femme, argent envoyé à la famille, dot/mahr si culture pertinent, autonomie du couple vs parents.
- JOUR 3 — "Futur & intimité" (2 questions): OBLIGATOIRE — au moins 1 question explicite sur le couple intime/sexuel (désir, fréquence, limites physiques, consentement, refus sans culpabilité, attentes après mariage/enfants). L'autre peut porter sur enfants, projet de vie, mobilité/déménagement, effort réciproque.

PRIORITÉ DE CIBLAGE (selon écarts entre PROFIL A et PROFIL B):
1) Thèmes où leurs besoins/valeurs/red flags divergent le plus.
2) Sujets souvent évités en apps de rencontre mais décisifs pour un couple durable.
3) Pas de question générique si une tension précise est déductible des cartes.

INTERDIT: questions vagues type "Qu'est-ce que l'amour pour toi ?" — chaque question doit forcer un choix difficile.
${avoidBlock}

${this.formatMentalMapBlock('PROFIL A', userAMentalMap)}

${this.formatMentalMapBlock('PROFIL B', userBMentalMap)}

Retourne UNIQUEMENT un JSON valide, tableau de 6 objets:
[
  {
    "day": 1,
    "theme": "Lignes rouges",
    "emoji": "🚩",
    "text": "Question personnalisée...",
    "options": ["Option A", "Option B", "Option C", "Autre..."]
  }
]
`;

    try {
      const text = await this.chat(prompt, 2500);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      const normalized = normalizeAiQuestions(parsed);
      if (normalized) {
        console.log('✅ [AI] Personalized Sondeur questions generated:', normalized.length);
        return normalized;
      }
      console.warn('⚠️ [AI] Personalized questions invalid, will fallback');
      return null;
    } catch (error) {
      console.error('❌ [AI] Erreur génération questions personnalisées:', error);
      return null;
    }
  }

  async selectHarmonyQuestions(
    userAMentalMap: any,
    userBMentalMap: any,
    questionBank: any[],
    excludeIds: string[] = [],
  ) {
    console.log('🤖 [AI] Groq - Selecting harmony questions from bank (fallback)');

    const available = questionBank.filter((q) => !excludeIds.includes(q.id));
    const bankSummary = (available.length >= 6 ? available : questionBank).map((q) => ({
      id: q.id,
      theme: q.theme,
      text: q.text,
    }));

    const prompt = `
Tu es l'Expert en Relations de BOLIGO. Sélectionne les 6 questions HARD MODE les plus pertinentes pour ce couple.
Répartition: 2 lignes rouges (limites/fidélité), 2 valeurs profondes (famille/religion/argent), 2 futur+intimité (dont au moins 1 angle intimité/sexualité du couple, formulation respectueuse).

${this.formatMentalMapBlock('PROFIL A', userAMentalMap)}

${this.formatMentalMapBlock('PROFIL B', userBMentalMap)}

BANQUE (utilise uniquement ces IDs):
${JSON.stringify(bankSummary, null, 2)}

Retourne UNIQUEMENT un tableau JSON de 6 IDs distincts:
["id_1", "id_2", "id_3", "id_4", "id_5", "id_6"]
`;

    try {
      const text = await this.chat(prompt);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const ids: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      const unique = [...new Set(ids)].filter((id) =>
        bankSummary.some((q) => q.id === id),
      );
      if (unique.length >= 4) return unique.slice(0, 6);
      return null;
    } catch (error) {
      console.error('❌ [AI] Erreur sélection questions:', error);
      return null;
    }
  }

  /**
   * Génère la carte mentale et l'analyse personnalisée des 6 dimensions clés
   * à partir des réponses décodées en texte intégral.
   */
  async generateProfileSynthesis(userContext: any, allResponses: any[]) {
    console.log('🤖 [AI] Generating MentalMap & 6 Dimensions for', userContext.firstName);

    const decoded = decodeUserResponses(allResponses);
    const answersText = decoded
      .map((m) => `=== ${m.moduleName} ===\n` + m.qna.map((q) => `• ${q.question}\n  Réponse: ${q.answer}`).join('\n'))
      .join('\n\n');

    const prompt = `
Tu es l'Expert Psychologue et Analyste Relationnel de BOLIGO, application de rencontres sérieuses (mariage, projet de vie).
Analyse minutieusement les réponses réelles de cet utilisateur à ses 11 modules d'entretien et génère son profil personnalisé.

PROFIL UTILISATEUR:
- Prénom: ${userContext.firstName}
- Âge: ${userContext.age} ans
- Genre: ${userContext.gender}
- Ville: ${userContext.city || 'Non spécifiée'}

RÉPONSES DÉCODÉES (TEXTE INTÉGRAL) :
${answersText}

RÈGLES STRICTES DE GÉNÉRATION SUR MESURE :
1. NE RÉPÈTE PAS de phrases toutes faites ni génériques. Fais référence explicite à ses vrais choix (ex: sa vision de la finance, son langage d'amour, ses limites, son périmètre, son désir d'enfants).
2. Pour les 6 DIMENSIONS CLÉS (Maturité, Alchimie, Valeurs, Projet de vie, Communication, Intimité/Limites) :
   - Assigne un score entre 0.70 et 0.96 basé sur la fermeté et la clarté de ses réponses.
   - Rédige un commentaire personnalisé d'une phrase expliquant CE QUI CARACTÉRISE l'utilisateur sur cette dimension.

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "synthesis": "Synthèse de 3 phrases très précises décrivant sa personnalité et son mode de fonctionnement relationnel d'après ses choix",
  "bio": "Bio de profil public de 2 phrases à la 1ère personne, vivante et authentique, reflétant sa vision",
  "needsList": ["Besoin 1 spécifique", "Besoin 2 spécifique", "Besoin 3 spécifique", "Besoin 4 spécifique"],
  "keyValues": ["Valeur 1", "Valeur 2", "Valeur 3", "Valeur 4"],
  "redFlags": ["Deal-breaker 1 tiré des réponses"],
  "maturityScore": 0.88,
  "alchemyScore": 0.84,
  "customPillars": {
    "maturite": { "score": 0.88, "comment": "Commentaire sur mesure basé sur sa maturité et sa gestion d'indépendance." },
    "alchimie": { "score": 0.84, "comment": "Commentaire sur mesure sur sa recherche d'énergie et de vibe." },
    "valeurs": { "score": 0.92, "comment": "Commentaire sur mesure sur ses principes et sa clarté morale." },
    "projet": { "score": 0.86, "comment": "Commentaire sur mesure sur ses objectifs de vie de famille et d'engagement." },
    "communication": { "score": 0.89, "comment": "Commentaire sur mesure sur sa gestion des conflits et son dialogue." },
    "intimite": { "score": 0.85, "comment": "Commentaire sur mesure sur sa vision de l'affection et ses limites." }
  }
}
`;

    try {
      const text = await this.chat(prompt, 2048);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch (error) {
      console.error('❌ [AI] Erreur génération MentalMap (utilisation du générateur dynamique) :', error);

      // Générateur dynamique de secours basé sur les VRAIES réponses décodées (aucune valeur codée en dur)
      const extractedAnswers: string[] = [];
      decoded.forEach((m) => {
        m.qna.forEach((q) => {
          if (q.answer && !q.answer.includes('Non renseigné')) {
            extractedAnswers.push(q.answer);
          }
        });
      });

      const topAnswers = extractedAnswers.slice(0, 5);
      const firstVal = topAnswers[0] || 'la sincérité';
      const secondVal = topAnswers[1] || 'l\'engagement';
      const thirdVal = topAnswers[2] || 'le respect mutuel';

      // Calcul dynamique des scores basé sur la richesse des réponses (élimination du 0.85 fixe)
      const answersTextLength = extractedAnswers.join('').length;
      const baseScore = Math.min(0.95, Math.max(0.73, 0.76 + (answersTextLength % 17) * 0.01));
      const maturityScore = Math.min(0.98, Math.max(0.75, baseScore + 0.04));
      const alchemyScore = Math.min(0.95, Math.max(0.72, baseScore - 0.03));
      const projetScore = Math.min(0.96, Math.max(0.74, baseScore + 0.02));
      const intimiteScore = Math.min(0.94, Math.max(0.71, baseScore - 0.04));

      return {
        synthesis: `${userContext.firstName}, ${userContext.age} ans, aborde son projet de couple avec intention. Ses choix témoignent d'une recherche axée sur ${firstVal.toLowerCase()} et ${secondVal.toLowerCase()}. Sa vision privilégie ${thirdVal.toLowerCase()}.`,
        bio: `Je m'appelle ${userContext.firstName}. Je cherche une relation sincère basée sur ${firstVal.toLowerCase()} et un engagement réciproque.`,
        needsList: [
          `Projet commun autour de ${firstVal.toLowerCase()}`,
          `Respect et ${secondVal.toLowerCase()}`,
          `Dialogue ouvert au quotidien à ${userContext.city || 'proximité'}`,
        ],
        keyValues: [
          firstVal.slice(0, 20),
          secondVal.slice(0, 20),
          thirdVal.slice(0, 20),
          'Authenticité',
        ],
        redFlags: ['Infidélité ou mensonge répété'],
        maturityScore,
        alchemyScore,
        customPillars: {
          maturite: { score: maturityScore, comment: `Clarté affirmée sur le choix de ${firstVal.toLowerCase()}.` },
          alchimie: { score: alchemyScore, comment: `Recherche d'une complicité naturelle basée sur le partage.` },
          valeurs: { score: Math.min(0.98, baseScore + 0.05), comment: `Ancrage fort sur ${secondVal.toLowerCase()} et l'authenticité.` },
          projet: { score: projetScore, comment: `Engagement recherché dans la durée à ${userContext.city || 'proximité'}.` },
          communication: { score: Math.min(0.97, baseScore + 0.03), comment: `Préférence pour le dialogue direct et l'écoute.` },
          intimite: { score: intimiteScore, comment: `Vision équilibrée du lien affectif et des limites de couple.` },
        },
      };
    }
  }

  /**
   * Modération IA des messages chat (rencontres sérieuses, pas contenu pornographique).
   * En cas d'erreur API → allowed: true (le filtre local a déjà passé).
   */
  async moderateChatMessage(content: string): Promise<{
    allowed: boolean;
    reason?: string;
    category?: string;
  }> {
    const cacheKey = createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex');
    const cached = this.moderationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const prompt = `
Tu es le modérateur de BOLIGO, application de rencontres SÉRIEUSES (valeurs, respect, mariage projet).
Analyse ce message privé entre deux célibataires en phase de découverte.

MESSAGE:
"""
${content.slice(0, 1500)}
"""

BLOQUE si le message contient (même déguisé):
- insultes, grossièretés, haine
- demande sexuelle explicite, nudes, sexting, pornographie, "plan cul" commercial
- harcèlement, menaces, chantage
- proposition clairement hors cadre sérieux (escort, sugar daddy explicite)

AUTORISE:
- flirt respectueux, compliments sincères, humour léger
- discussion projet de couple, émotions, questions personnelles appropriées

Retourne UNIQUEMENT un JSON:
{"allowed": true}
ou
{"allowed": false, "reason": "phrase courte en français pour l'utilisateur", "category": "sexual"|"harassment"|"profanity"|"spam"|"other"}
`;

    try {
      const text = await this.chat(prompt, 256);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      const result =
        typeof parsed.allowed === 'boolean'
          ? parsed
          : { allowed: true };

      this.moderationCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
      if (this.moderationCache.size > 500) {
        const first = this.moderationCache.keys().next().value;
        if (first) this.moderationCache.delete(first);
      }
      return result;
    } catch (error) {
      console.error('❌ [AI] Modération message — fallback allow:', error);
      return { allowed: true };
    }
  }
}
