import {
  GROQ_PREFERRED_MODELS,
  isModelUnavailableError,
  parseModelList,
  pickGroqModel,
} from './groq-model';

describe('Choix du modèle Groq', () => {
  it('retient le premier modèle préféré réellement ouvert au compte', () => {
    expect(
      pickGroqModel(
        ['whisper-large-v3', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
        GROQ_PREFERRED_MODELS,
      ),
    ).toBe('llama-3.3-70b-versatile');
  });

  it("se rabat sur un modèle de conversation quand aucun préféré n'existe plus", () => {
    expect(
      pickGroqModel(
        ['whisper-large-v3', 'llama-guard-4', 'nouveau-modele-2027'],
        GROQ_PREFERRED_MODELS,
      ),
    ).toBe('nouveau-modele-2027');
    expect(
      pickGroqModel(['whisper-large-v3'], GROQ_PREFERRED_MODELS),
    ).toBeNull();
  });

  it('écarte un modèle qui vient de répondre « introuvable »', () => {
    expect(
      pickGroqModel(
        ['llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
        ['llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
        ['llama-3.1-8b-instant'],
      ),
    ).toBe('openai/gpt-oss-20b');
  });

  it('lit une liste de modèles dans GROQ_MODEL', () => {
    expect(parseModelList(' a , b,,c ')).toEqual(['a', 'b', 'c']);
    expect(parseModelList(undefined)).toEqual([]);
  });

  it('reconnaît l’erreur de modèle retiré renvoyée en production', () => {
    const prod = Object.assign(
      new Error(
        '404 {"error":{"message":"The model `llama-3.1-8b-instant` does not exist or you do not have access to it.","type":"invalid_request_error","code":"model_not_found"}}',
      ),
      { status: 404 },
    );
    expect(isModelUnavailableError(prod)).toBe(true);
    expect(isModelUnavailableError(new Error('timeout'))).toBe(false);
  });
});
