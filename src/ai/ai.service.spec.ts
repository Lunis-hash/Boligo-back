import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { OpenRouterService } from './openrouter.service';

describe('AiService (5 Intelligences Harmonie)', () => {
  let service: AiService;
  let openRouterService: Partial<OpenRouterService>;

  beforeEach(async () => {
    process.env.OPENROUTER_API_KEY = 'mock-key';

    openRouterService = {
      executeAgentPrompt: jest.fn(),
      extractJson: jest.fn((text: string) => JSON.parse(text)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: OpenRouterService,
          useValue: openRouterService,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 🧠 1. Sondeur IA — Génération de Profil & Questions
  // =========================================================================
  describe('🧠 Sondeur IA', () => {
    it('doit générer la synthèse et la carte mentale 6D avec succès', async () => {
      const mockSynthesis = {
        synthesis: 'Profil axé sur la sincérité et le partage.',
        bio: 'Je recherche une relation durable empreinte de respect mutuel.',
        needsList: ['Écoute active', 'Projets communs'],
        keyValues: ['Bienveillance', 'Fidélité'],
        redFlags: ['Mensonge'],
        maturityScore: 0.9,
        alchemyScore: 0.85,
        customPillars: {
          maturite: { score: 0.9, comment: 'Très mature' },
        },
      };

      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockSynthesis),
        modelUsed: 'openrouter/free',
      });

      const userContext = { firstName: 'Sarah', age: 28, gender: 'Femme', city: 'Paris' };
      const responses = [{ moduleNumber: 1, answers: { q1: 'La sincérité' } }];

      const result = await service.generateProfileSynthesis(userContext, responses);

      expect(result.synthesis).toBe(mockSynthesis.synthesis);
      expect(result.bio).toBe(mockSynthesis.bio);
      expect(result.maturityScore).toBe(0.9);
      expect(result.needsList).toContain('Écoute active');
      expect(openRouterService.executeAgentPrompt).toHaveBeenCalledWith('sondeur', expect.any(Array));
    });

    it('doit fusionner avec le fallback de sécurité si la réponse IA est incomplète', async () => {
      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify({ synthesis: 'Partielle' }), // bio et piliers manquants
        modelUsed: 'openrouter/free',
      });

      const userContext = { firstName: 'Karim', age: 32, gender: 'Homme', city: 'Lyon' };
      const responses = [{ moduleNumber: 1, answers: { q1: 'L\'engagement' } }];

      const result = await service.generateProfileSynthesis(userContext, responses);

      expect(result.synthesis).toBe('Partielle');
      expect(result.bio).toBeDefined();
      expect(result.bio.length).toBeGreaterThan(5);
      expect(result.maturityScore).toBeGreaterThan(0);
    });

    it('doit générer 6 questions Hard-Mode personnalisées pour un couple', async () => {
      const mockQuestions = [
        { day: 1, theme: 'Lignes rouges', emoji: '🚩', text: 'Si désaccord majeur...', options: ['A', 'B', 'C', 'Autre...'] },
        { day: 1, theme: 'Lignes rouges', emoji: '🚩', text: 'Face au doute...', options: ['A', 'B', 'C', 'Autre...'] },
        { day: 2, theme: 'Valeurs profondes', emoji: '💎', text: 'Gestion de l\'argent...', options: ['A', 'B', 'C', 'Autre...'] },
        { day: 2, theme: 'Valeurs profondes', emoji: '💎', text: 'Rapport famille...', options: ['A', 'B', 'C', 'Autre...'] },
        { day: 3, theme: 'Futur & intimité', emoji: '🌱', text: 'Rythme de vie...', options: ['A', 'B', 'C', 'Autre...'] },
        { day: 3, theme: 'Futur & intimité', emoji: '🌱', text: 'Intimité émotionnelle...', options: ['A', 'B', 'C', 'Autre...'] },
      ];

      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockQuestions),
        modelUsed: 'openrouter/free',
      });

      const questions = await service.generatePersonalizedHarmonyQuestions(
        { synthesis: 'Profil A' },
        { synthesis: 'Profil B' },
      );

      expect(questions).not.toBeNull();
      expect(questions?.length).toBe(6);
      expect(questions?.[0].theme).toBe('Lignes rouges');
    });
  });

  // =========================================================================
  // 💖 2. Cupidon IA — Score d'Affinité 6D & Matching
  // =========================================================================
  describe('💖 Cupidon IA', () => {
    it('doit calculer les scores d\'affinité multi-dimensionnels', async () => {
      const mockScore = {
        globalScore: 89,
        summary: 'Excellente complémentarité sur les valeurs de vie.',
        strengths: ['Communication', 'Vision familiale'],
        potentialFrictions: ['Rythme pro'],
        dimensionScores: {
          values: 95,
          lifeGoals: 88,
          communication: 90,
          emotionalMaturity: 86,
          lifestyle: 85,
        },
      };

      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockScore),
        modelUsed: 'openrouter/free',
      });

      const result = await service.calculateCompatibilityScore(
        { synthesis: 'Profil A' },
        { synthesis: 'Profil B' },
      );

      expect(result.globalScore).toBe(89);
      expect(result.dimensionScores.values).toBe(95);
      expect(openRouterService.executeAgentPrompt).toHaveBeenCalledWith('cupidon', expect.any(Array));
    });
  });

  // =========================================================================
  // 💬 3. Coach de Conversation — Suggestions en Direct
  // =========================================================================
  describe('💬 Coach Conversation', () => {
    it('doit proposer 3 suggestions adaptées (humour, valeurs, action)', async () => {
      const mockSuggestions = {
        suggestions: [
          { type: 'humor', label: 'Spontané', text: 'Une blague sympathique' },
          { type: 'deep', label: 'Profondeur', text: 'Quels sont tes rêves ?' },
          { type: 'action', label: 'Rendez-vous', text: 'Un café cette semaine ?' },
        ],
        coachTip: 'Privilégie les questions ouvertes.',
      };

      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockSuggestions),
        modelUsed: 'openrouter/free',
      });

      const result = await service.generateCoachSuggestions(
        'Alex',
        'Léa',
        [{ sender: 'Léa', text: 'J\'adore voyager' }],
      );

      expect(result.suggestions.length).toBe(3);
      expect(result.coachTip).toBe('Privilégie les questions ouvertes.');
      expect(openRouterService.executeAgentPrompt).toHaveBeenCalledWith('coach', expect.any(Array));
    });
  });

  // =========================================================================
  // 🌱 4. Parcours Harmonie — Exercices Quotidiens
  // =========================================================================
  describe('🌱 Parcours Harmonie', () => {
    it('doit générer l\'exercice relationnel du jour', async () => {
      const mockExercise = {
        stepTitle: 'Les langages de l\'amour',
        theme: 'Connexion émotionnelle',
        durationMinutes: 5,
        reflectionPrompt: 'Quel est ton langage privilégié ?',
        actionItem: 'Partage un moment d\'attention aujourd\'hui.',
      };

      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockExercise),
        modelUsed: 'openrouter/free',
      });

      const result = await service.generateParcoursExercise({ synthesis: 'Profil' }, 2);

      expect(result.stepTitle).toBe('Les langages de l\'amour');
      expect(result.durationMinutes).toBe(5);
      expect(openRouterService.executeAgentPrompt).toHaveBeenCalledWith('parcours', expect.any(Array));
    });
  });

  // =========================================================================
  // 🛡️ 5. Médiateur & Modération — Sécurité des Échanges
  // =========================================================================
  describe('🛡️ Médiateur & Modérateur', () => {
    it('doit autoriser un message bienveillant', async () => {
      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify({ allowed: true }),
        modelUsed: 'nvidia/nemotron-3.5-content-safety:free',
      });

      const result = await service.moderateChatMessage('Bonjour, j\'ai adoré échanger avec toi !');
      expect(result.allowed).toBe(true);
    });

    it('doit bloquer un message toxique ou déplacé', async () => {
      (openRouterService.executeAgentPrompt as jest.Mock).mockResolvedValue({
        content: JSON.stringify({
          allowed: false,
          reason: 'Propos agressifs',
          category: 'harassment',
        }),
        modelUsed: 'nvidia/nemotron-3.5-content-safety:free',
      });

      const result = await service.moderateChatMessage('Tu es insupportable dégage');
      expect(result.allowed).toBe(false);
      expect(result.category).toBe('harassment');
    });
  });
});
