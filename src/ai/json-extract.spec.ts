import { firstJsonArray, firstJsonObject } from './json-extract';

describe('Extraction du JSON d’une réponse de modèle', () => {
  it('ignore les accolades d’une phrase avant ou après le JSON', () => {
    expect(
      firstJsonObject('Voici {mon avis} : {"fidele": true} (fin {ok})'),
    ).toEqual({ fidele: true });
  });
  it('tolère une virgule finale et des accolades dans les chaînes', () => {
    expect(
      firstJsonObject('{"text": "une {accolade}", "n": [1, 2,],}'),
    ).toEqual({ text: 'une {accolade}', n: [1, 2] });
  });
  it('trouve un tableau seul', () => {
    expect(firstJsonArray('Questions : [{"text": "a"}] merci')).toEqual([
      { text: 'a' },
    ]);
  });
  it('renvoie null sans JSON lisible', () => {
    expect(firstJsonObject('aucun json ici')).toBeNull();
    expect(firstJsonObject('{"a": ')).toBeNull();
  });
});
