import { createHash } from 'crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import Groq from 'groq-sdk';
import { OpenRouterService } from './openrouter.service';
import {
  HarmonyQuestionPayload,
  normalizeAiQuestions,
} from '../journey/harmony-question.types';
import { decodeUserResponses } from '../interview/questions.data';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq | null = null;
  private readonly moderationCache = new Map<
    string,
    { result: { allowed: boolean; reason?: string; category?: string }; expiresAt: number }
  >();

  constructor(
    @Optional() private readonly openRouterService?: OpenRouterService,
  ) {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      this.groq = new Groq({ apiKey: groqApiKey });
    }
  }

  /**
   * Exécute un prompt via OpenRouter si disponible, sinon bascule sur Groq
   */
  private async queryAiAgent(
    agentName: 'sondeur' | 'cupidon' | 'coach' | 'parcours' | 'moderation',
    prompt: string,
    systemPrompt?: string,
  ): Promise<string> {
    if (this.openRouterService && process.env.OPENROUTER_API_KEY) {
      try {
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        const res = await this.openRouterService.executeAgentPrompt(agentName, messages);
        return res.content;
      } catch (error: any) {
        this.logger.warn(`⚠️ [OpenRouter] Échec agent ${agentName}: ${error.message}. Fallback sur Groq...`);
      }
    }

    if (this.groq) {
      const completion = await this.groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      });
      return completion.choices[0]?.message?.content ?? '';
    }

    throw new Error('Aucun fournisseur d\'IA disponible (OpenRouter et Groq absents ou en échec).');
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

  // =========================================================================
  // 🧠 1. SONDEUR IA — Analyse profonde et Questions Hard-Mode
  // =========================================================================

  async generatePersonalizedHarmonyQuestions(
    userAMentalMap: any,
    userBMentalMap: any,
    avoidTexts: string[] = [],
  ): Promise<HarmonyQuestionPayload[] | null> {
    this.logger.log('🧠 [SONDEUR IA] Génération des 6 questions Hard Mode via OpenRouter/Claude 3.5');

    const avoidBlock =
      avoidTexts.length > 0
        ? `\nQUESTIONS DÉJÀ POSÉES À CE COUPLE (interdiction de reformuler) :\n${avoidTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
        : '';

    const systemPrompt = `Tu es l'Expert Psychologue et Analyste de Couples de Harmonie (rencontres sérieuses, mariage, valeurs profondes). Tu conduis le "Sondeur IA".`;

    const prompt = `
Tu génères 6 questions HARD MODE personnalisées pour CE couple à partir de leurs cartes mentales respectives.
But : faire émerger les vraies limites et zones de friction potentielles AVANT le chat.

RÈGLES STRICTES:
- 6 questions exactement, 2 par jour (day: 1, 2 ou 3).
- Chaque question: 4 options concrètes + "Autre..." en dernier.
- Formule en "tu", scénario réaliste ("si ton/ton partenaire…", "comment réagirais-tu si…").
- Ton direct, mature, respectueux.
- Ne cite pas les red flags mot pour mot ; exploite-les pour choisir L'ANGLE le plus risqué entre ces deux profils.

RÉPARTITION OBLIGATOIRE:
- JOUR 1 — "Lignes rouges" (2 questions) : limites non négociables (fidélité, respect, jalousie).
- JOUR 2 — "Valeurs profondes" (2 questions) : famille, spiritualité/religion, argent, rôles.
- JOUR 3 — "Futur & intimité" (2 questions) : au moins 1 question explicite sur le couple intime/sexuel (désir, consentement, attentes) et 1 sur le projet de vie.

${avoidBlock}

${this.formatMentalMapBlock('PROFIL A', userAMentalMap)}
${this.formatMentalMapBlock('PROFIL B', userBMentalMap)}

Retourne UNIQUEMENT un tableau JSON de 6 objets:
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
      const text = await this.queryAiAgent('sondeur', prompt, systemPrompt);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      const normalized = normalizeAiQuestions(parsed);
      if (normalized) {
        this.logger.log(`✅ [SONDEUR IA] 6 questions générées avec succès (${normalized.length} valides)`);
        return normalized;
      }
      return null;
    } catch (error) {
      this.logger.error('❌ [SONDEUR IA] Erreur lors de la génération des questions:', error);
      return null;
    }
  }

  async selectHarmonyQuestions(
    userAMentalMap: any,
    userBMentalMap: any,
    questionBank: any[],
    excludeIds: string[] = [],
  ) {
    this.logger.log('🧠 [SONDEUR IA] Sélection des questions dans la banque (fallback)');

    const available = questionBank.filter((q) => !excludeIds.includes(q.id));
    const bankSummary = (available.length >= 6 ? available : questionBank).map((q) => ({
      id: q.id,
      theme: q.theme,
      text: q.text,
    }));

    const prompt = `
Tu es l'Expert en Relations de Harmonie. Sélectionne les 6 questions HARD MODE les plus pertinentes pour ce couple.
Répartition: 2 lignes rouges (limites/fidélité), 2 valeurs profondes (famille/religion/argent), 2 futur+intimité (dont au moins 1 angle intimité/sexualité du couple).

${this.formatMentalMapBlock('PROFIL A', userAMentalMap)}
${this.formatMentalMapBlock('PROFIL B', userBMentalMap)}

BANQUE (utilise uniquement ces IDs):
${JSON.stringify(bankSummary, null, 2)}

Retourne UNIQUEMENT un tableau JSON de 6 IDs distincts:
["id_1", "id_2", "id_3", "id_4", "id_5", "id_6"]
`;

    try {
      const text = await this.queryAiAgent('sondeur', prompt);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const ids: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      const unique = [...new Set(ids)].filter((id) =>
        bankSummary.some((q) => q.id === id),
      );
      if (unique.length >= 4) return unique.slice(0, 6);
      return null;
    } catch (error) {
      this.logger.error('❌ [SONDEUR IA] Erreur sélection questions:', error);
      return null;
    }
  }


  async generateProfileSynthesis(userContext: any, allResponses: any[]) {
    this.logger.log(`🧠 [SONDEUR IA] Génération de la Carte Mentale 6D pour ${userContext.firstName}`);

    const decoded = decodeUserResponses(allResponses);
    const answersText = decoded
      .map((m) => `=== ${m.moduleName} ===\n` + m.qna.map((q) => `• ${q.question}\n  Réponse: ${q.answer}`).join('\n'))
      .join('\n\n');

    const prompt = `
Tu es l'Expert Psychologue et Analyste Relationnel d'Harmonie.
Analyse les réponses de cet utilisateur à ses modules d'entretien et génère son profil personnalisé 6D.

PROFIL UTILISATEUR:
- Prénom: ${userContext.firstName}
- Âge: ${userContext.age} ans
- Genre: ${userContext.gender}
- Ville: ${userContext.city || 'Non spécifiée'}

RÉPONSES DÉCODÉES :
${answersText}

Retourne UNIQUEMENT un JSON valide :
{
  "synthesis": "Synthèse de 3 phrases très précises décrivant sa personnalité relationnelle",
  "bio": "Bio de profil public de 2 phrases à la 1ère personne, vivante et authentique",
  "needsList": ["Besoin 1", "Besoin 2", "Besoin 3", "Besoin 4"],
  "keyValues": ["Valeur 1", "Valeur 2", "Valeur 3", "Valeur 4"],
  "redFlags": ["Deal-breaker principal"],
  "maturityScore": 0.88,
  "alchemyScore": 0.84,
  "customPillars": {
    "maturite": { "score": 0.88, "comment": "Commentaire sur mesure" },
    "alchimie": { "score": 0.84, "comment": "Commentaire sur mesure" },
    "valeurs": { "score": 0.92, "comment": "Commentaire sur mesure" },
    "projet": { "score": 0.86, "comment": "Commentaire sur mesure" },
    "communication": { "score": 0.89, "comment": "Commentaire sur mesure" },
    "intimite": { "score": 0.85, "comment": "Commentaire sur mesure" }
  }
}
`;

    try {
      const text = await this.queryAiAgent('sondeur', prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Réponse JSON invalide ou vide');
      }

      // Fusion sécurisée : garantit que chaque champ (bio, synthesis, piliers 6D) est toujours rempli
      const fallback = this.fallbackDynamicSynthesis(userContext, decoded);
      return {
        synthesis: parsed.synthesis?.trim() || fallback.synthesis,
        bio: parsed.bio?.trim() || fallback.bio,
        needsList: Array.isArray(parsed.needsList) && parsed.needsList.length > 0 ? parsed.needsList : fallback.needsList,
        keyValues: Array.isArray(parsed.keyValues) && parsed.keyValues.length > 0 ? parsed.keyValues : fallback.keyValues,
        redFlags: Array.isArray(parsed.redFlags) && parsed.redFlags.length > 0 ? parsed.redFlags : fallback.redFlags,
        maturityScore: typeof parsed.maturityScore === 'number' ? parsed.maturityScore : fallback.maturityScore,
        alchemyScore: typeof parsed.alchemyScore === 'number' ? parsed.alchemyScore : fallback.alchemyScore,
        customPillars: parsed.customPillars || fallback.customPillars,
      };
    } catch (error) {
      this.logger.error('❌ [SONDEUR IA] Erreur génération carte mentale:', error);
      return this.fallbackDynamicSynthesis(userContext, decoded);
    }
  }

  // =========================================================================
  // 💖 2. CUPIDON IA & COMPATIBILITÉ — Calcul d'affinité & Matching
  // =========================================================================

  async calculateCompatibilityScore(userAMentalMap: any, userBMentalMap: any) {
    this.logger.log('💖 [CUPIDON IA] Calcul du score de compatibilité multi-dimensionnel');

    const prompt = `
Tu es Cupidon IA, l'Orchestrateur de Compatibilité d'Harmonie.
Analyse les deux cartes mentales ci-dessous et calcule l'indice d'affinité global et par dimension.

${this.formatMentalMapBlock('PROFIL A', userAMentalMap)}
${this.formatMentalMapBlock('PROFIL B', userBMentalMap)}

Retourne UNIQUEMENT un JSON valide :
{
  "globalScore": 87,
  "summary": "Explication vivante de 2 phrases sur l'alchimie entre ces deux profils.",
  "strengths": ["Point fort 1", "Point fort 2"],
  "potentialFrictions": ["Zone de vigilance 1"],
  "dimensionScores": {
    "values": 92,
    "lifeGoals": 85,
    "communication": 88,
    "emotionalMaturity": 84,
    "lifestyle": 86
  }
}
`;

    try {
      const text = await this.queryAiAgent('cupidon', prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (error) {
      this.logger.error('❌ [CUPIDON IA] Erreur calcul compatibilité:', error);
      return {
        globalScore: 82,
        summary: 'Grande complémentarité sur les valeurs de vie et la vision du couple.',
        strengths: ['Vision partagée de la famille', 'Communication transparente'],
        potentialFrictions: ['Gestion du temps libre et rythme de vie'],
        dimensionScores: { values: 85, lifeGoals: 82, communication: 80, emotionalMaturity: 84, lifestyle: 79 },
      };
    }
  }

  // =========================================================================
  // 💬 3. COACH DE CONVERSATION IA — Assistant Temps Réel
  // =========================================================================

  async generateCoachSuggestions(
    userFirstName: string,
    partnerFirstName: string,
    lastMessages: Array<{ sender: string; text: string }>,
    userAMentalMap?: any,
    userBMentalMap?: any,
  ) {
    this.logger.log(`💬 [COACH CONVERSATION] Suggestion de relance pour ${userFirstName} et ${partnerFirstName}`);

    const historyBlock = lastMessages
      .map((m) => `${m.sender}: "${m.text}"`)
      .join('\n');

    const prompt = `
Tu es le Coach de Conversation d'Harmonie.
Aide ${userFirstName} à relancer ou approfondir la discussion avec ${partnerFirstName}.

DERNIERS MESSAGES ÉCHANGÉS:
${historyBlock}

Propose 3 suggestions de réponses naturelles, engageantes et bienveillantes (1 brise-glace/humour, 1 question profonde sur ses valeurs, 1 proposition d'activité/rendez-vous).

Retourne UNIQUEMENT un JSON:
{
  "suggestions": [
    { "type": "humor", "label": "Léger & Amusant", "text": "..." },
    { "type": "deep", "label": "Question Valeurs", "text": "..." },
    { "type": "action", "label": "Invitation / Projet", "text": "..." }
  ],
  "coachTip": "Petit conseil de communication d'une phrase."
}
`;

    try {
      const text = await this.queryAiAgent('coach', prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (error) {
      this.logger.error('❌ [COACH IA] Erreur suggestions conversation:', error);
      return {
        suggestions: [
          { type: 'humor', label: 'Spontané', text: `Dis-moi ${partnerFirstName}, quelle est la chose qui te fait le plus rire au quotidien ?` },
          { type: 'deep', label: 'Valeurs', text: `J'aimerais beaucoup en savoir plus sur ce qui compte le plus pour toi dans une relation.` },
          { type: 'action', label: 'Rendez-vous', text: `Ça te dirait qu'on se fasse un appel vidéo cette semaine pour mieux se découvrir ?` },
        ],
        coachTip: 'Pose des questions ouvertes pour inviter votre partenaire à se confier plus librement.',
      };
    }
  }

  // =========================================================================
  // 🌱 4. PARCOURS HARMONIE — Programme d'évolution personnelle
  // =========================================================================

  async generateParcoursExercise(userMentalMap: any, stepNumber: number) {
    this.logger.log(`🌱 [PARCOURS HARMONIE] Génération de l'étape ${stepNumber}`);

    const prompt = `
Tu es le Mentor du Parcours Harmonie.
Génère l'exercice quotidien de développement relationnel n°${stepNumber} basé sur la carte mentale de l'utilisateur.

${this.formatMentalMapBlock('PROFIL UTILISATEUR', userMentalMap)}

Retourne UNIQUEMENT un JSON:
{
  "stepTitle": "Titre de l'étape",
  "theme": "Thématique (ex: Intelligence Émotionnelle, Langages de l'Amour, Fixation de Limites)",
  "durationMinutes": 5,
  "reflectionPrompt": "Question de réflexion personnelle profonde.",
  "actionItem": "Défi concret à réaliser aujourd'hui dans sa vie amoureuse ou personnelle."
}
`;

    try {
      const text = await this.queryAiAgent('parcours', prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch (error) {
      this.logger.error('❌ [PARCOURS HARMONIE] Erreur exercice:', error);
      return {
        stepTitle: 'Identifier ses besoins non négociables',
        theme: 'Clarté Relationnelle',
        durationMinutes: 5,
        reflectionPrompt: 'Quelles sont les 3 choses dont tu as absolument besoin pour te sentir en sécurité et aimé(e) dans un couple ?',
        actionItem: 'Écris ces 3 besoins dans ton carnet personnel et réfléchis à la façon dont tu les exprimes.',
      };
    }
  }

  // =========================================================================
  // 🛡️ 5. MÉDIATEUR & MODÉRATION IA — Sécurité & Modération en Temps Réel
  // =========================================================================

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
Tu es le modérateur de sécurité d'Harmonie (application de rencontres sérieuses et de coaching amoureux).
Analyse ce message privé :

MESSAGE:
"""
${content.slice(0, 1500)}
"""

BLOQUE si le message contient : insultes, harcèlement, proposition sexuelle explicite non sollicitée, sexting, escroquerie.
AUTORISE : flirt respectueux, compliments, questions personnelles bienveillantes.

Retourne UNIQUEMENT un JSON:
{"allowed": true} ou {"allowed": false, "reason": "motif court en français", "category": "sexual"|"harassment"|"profanity"|"spam"}
`;

    try {
      const text = await this.queryAiAgent('moderation', prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      const result = typeof parsed.allowed === 'boolean' ? parsed : { allowed: true };

      this.moderationCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
      return result;
    } catch (error) {
      this.logger.error('❌ [MODÉRATION IA] Erreur — fallback autoriser:', error);
      return { allowed: true };
    }
  }

  // =========================================================================
  // Fallbacks et Utilitaires
  // =========================================================================

  private fallbackDynamicSynthesis(userContext: any, decoded: any[]) {
    const extractedAnswers: string[] = [];
    decoded.forEach((m) => {
      m.qna.forEach((q: any) => {
        if (q.answer && !q.answer.includes('Non renseigné')) {
          extractedAnswers.push(q.answer);
        }
      });
    });

    const firstVal = extractedAnswers[0] || 'la sincérité';
    const secondVal = extractedAnswers[1] || 'l\'engagement';
    const thirdVal = extractedAnswers[2] || 'le respect mutuel';

    return {
      synthesis: `${userContext.firstName}, ${userContext.age} ans, aborde son projet de couple avec intention. Ses choix témoignent d'une recherche axée sur ${firstVal.toLowerCase()} et ${secondVal.toLowerCase()}.`,
      bio: `Je m'appelle ${userContext.firstName}. Je cherche une relation sincère basée sur ${firstVal.toLowerCase()} et un engagement réciproque.`,
      needsList: [`Projet commun autour de ${firstVal.toLowerCase()}`, `Respect et ${secondVal.toLowerCase()}`, `Dialogue ouvert au quotidien`],
      keyValues: [firstVal.slice(0, 20), secondVal.slice(0, 20), thirdVal.slice(0, 20), 'Authenticité'],
      redFlags: ['Infidélité ou mensonge répété'],
      maturityScore: 0.85,
      alchemyScore: 0.82,
      customPillars: {
        maturite: { score: 0.88, comment: `Clarté affirmée sur le choix de ${firstVal.toLowerCase()}.` },
        alchimie: { score: 0.82, comment: `Recherche d'une complicité naturelle.` },
        valeurs: { score: 0.90, comment: `Ancrage fort sur ${secondVal.toLowerCase()}.` },
        projet: { score: 0.85, comment: `Engagement recherché dans la durée.` },
        communication: { score: 0.87, comment: `Préférence pour le dialogue direct.` },
        intimite: { score: 0.83, comment: `Vision équilibrée du lien affectif.` },
      },
    };
  }
}
