import { createHash } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import {
  HarmonyQuestionPayload,
  normalizeAiQuestions,
} from '../journey/harmony-question.types';

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
      throw new InternalServerErrorException('GROQ_API_KEY manquante');
    }
    this.groq = new Groq({ apiKey });
  }

  private async chat(prompt: string, maxTokens = 1024): Promise<string> {
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
- Points de vigilance (usage interne, ne pas citer mot pour mot): ${JSON.stringify(map.redFlags ?? [])}
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

  async generateProfileSynthesis(userContext: any, allResponses: any[]) {
    console.log('🤖 [AI] Groq - Generating MentalMap for', userContext.firstName);

    const prompt = `
Tu es l'Expert Psychologue de BOLIGO, une application de rencontres sérieuses africaine.
Analyse les réponses de cet utilisateur à un entretien approfondi et génère sa carte mentale.

PROFIL:
- Prénom: ${userContext.firstName}
- Âge: ${userContext.age} ans
- Genre: ${userContext.gender}
- Ville: ${userContext.city}

RÉPONSES AUX MODULES:
${JSON.stringify(allResponses.map(r => ({ module: r.moduleName, réponses: r.rawResponses })), null, 2)}

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "synthesis": "Paragraphe de 2-3 phrases décrivant la personnalité et les attentes relationnelles",
  "bio": "Bio de profil de 1-2 phrases à la 1ère personne pour son profil public",
  "needsList": ["Besoin 1", "Besoin 2", "Besoin 3"],
  "keyValues": ["Valeur 1", "Valeur 2", "Valeur 3"],
  "redFlags": ["Point de vigilance 1"],
  "maturityScore": 0.85,
  "alchemyScore": 0.78
}
`;

    try {
      const text = await this.chat(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch (error) {
      console.error('❌ [AI] Erreur génération MentalMap:', error);
      return {
        synthesis: `${userContext.firstName} recherche une relation sérieuse basée sur des valeurs fortes.`,
        bio: `Salut, je suis ${userContext.firstName}, ${userContext.age} ans. Je cherche une relation authentique.`,
        needsList: ['Communication honnête', 'Respect mutuel', 'Projet de vie commun'],
        keyValues: ['Famille', 'Loyauté', 'Sincérité'],
        redFlags: [],
        maturityScore: 0.75,
        alchemyScore: 0.70,
      };
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
