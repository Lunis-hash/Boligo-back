import { OpenRouterService } from './openrouter.service';

describe('OpenRouterService', () => {
  let service: OpenRouterService;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    service = new OpenRouterService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('extractJson', () => {
    it('should parse clean JSON string', () => {
      const input = '{"status": "ok", "value": 42}';
      const result = service.extractJson(input);
      expect(result).toEqual({ status: 'ok', value: 42 });
    });

    it('should parse JSON wrapped in markdown codeblocks', () => {
      const input = '```json\n{"status": "ok", "items": [1, 2, 3]}\n```';
      const result = service.extractJson(input);
      expect(result).toEqual({ status: 'ok', items: [1, 2, 3] });
    });

    it('should parse JSON array wrapped in backticks', () => {
      const input = '```\n["item1", "item2"]\n```';
      const result = service.extractJson(input);
      expect(result).toEqual(['item1', 'item2']);
    });

    it('should extract JSON embedded in conversational text', () => {
      const input = 'Voici le résultat demandé :\n{"score": 95}\nEn espérant que cela vous convienne.';
      const result = service.extractJson(input);
      expect(result).toEqual({ score: 95 });
    });
  });

  describe('executeAgentPrompt', () => {
    it('should execute successfully with primary model', () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"answer": "parfait"}' } }],
          usage: { total_tokens: 25 },
        }),
      });
      (global as any).fetch = mockFetch;

      return service
        .executeAgentPrompt('coach', [{ role: 'user', content: 'Bonjour' }])
        .then((res) => {
          expect(res.content).toBe('{"answer": "parfait"}');
          expect(res.modelUsed).toBe('openrouter/free');
          expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    it('should fallback to secondary model if primary model fails', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Fallback response' } }],
          }),
        });
      (global as any).fetch = mockFetch;

      const res = await service.executeAgentPrompt('coach', [{ role: 'user', content: 'Bonjour' }]);
      expect(res.content).toBe('Fallback response');
      expect(res.modelUsed).toBe('minimax/minimax-m2.7:free');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
