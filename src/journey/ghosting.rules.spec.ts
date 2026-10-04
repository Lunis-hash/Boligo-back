import {
  assessGhosting,
  dueAction,
  ghostingViewFor,
  GhostingInput,
  HOUR_MS,
  INACTIVE_DAYS,
} from './ghosting.rules';
import {
  frenchDeadline,
  ghostingMode,
  reminderMessage,
} from './ghosting.service';
import { farewellText } from './farewell';

const T0 = new Date('2026-10-05T08:00:00Z');
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR_MS);
const base = (over: Partial<GhostingInput>): GhostingInput => ({
  step: 'chat_libre',
  stepStart: T0,
  userAId: 'A',
  userBId: 'B',
  ...over,
});

describe('règles anti-ghosting', () => {
  describe('Sondeur', () => {
    it("attend celui qui a moins répondu, échéance à 96 h, crédit rendu à l'autre", () => {
      const input = base({
        step: 'phase_harmonie',
        answeredA: 14,
        answeredB: 7,
        lastAnswerA: at(30),
        lastAnswerB: at(5),
      });
      const a = assessGhosting(input, at(40));
      expect(a.kind).toBe('ghosting');
      expect(a.waitingOnId).toBe('B');
      expect(a.waitingForId).toBe('A');
      expect(a.closeAt).toEqual(at(96));
      expect(a.refundWaiting).toBe(true);
      expect(dueAction(a, at(40))).toBe('none');
      expect(dueAction(a, at(48))).toBe('remind');
      expect(dueAction(a, at(72))).toBe('warn');
      expect(dueAction(a, at(96))).toBe('close');
    });

    it("n'accuse personne quand les deux en sont au même point", () => {
      const input = base({
        step: 'phase_harmonie',
        answeredA: 7,
        answeredB: 7,
        lastAnswerA: at(2),
        lastAnswerB: at(3),
      });
      expect(assessGhosting(input, at(10)).kind).toBe('none');
      const later = assessGhosting(input, at(30));
      expect(later.kind).toBe('inactive');
      expect(later.closeAt).toEqual(at(3 + INACTIVE_DAYS * 24));
      expect(dueAction(later, at(100))).toBe('none');
      expect(dueAction(later, at(3 + INACTIVE_DAYS * 24))).toBe('close');
    });
  });

  describe('chat libre', () => {
    it('attend la réponse au dernier message : rappel à 24 h, dernier avertissement à 36 h, clôture à 48 h', () => {
      const input = base({ lastMessage: { senderId: 'A', sentAt: at(10) } });
      const a = assessGhosting(input, at(11));
      expect(a.waitingOnId).toBe('B');
      expect(a.closeAt).toEqual(at(58));
      expect(dueAction(a, at(33))).toBe('none');
      expect(dueAction(a, at(34))).toBe('remind');
      expect(dueAction(a, at(46))).toBe('warn');
      expect(dueAction(a, at(58))).toBe('close');
    });

    it("respecte au moins 48 h dans l'étape (Règle de Justice historique)", () => {
      const a = assessGhosting(
        base({ lastMessage: { senderId: 'B', sentAt: at(-5) } }),
        at(1),
      );
      expect(a.waitingOnId).toBe('A');
      expect(a.closeAt).toEqual(at(48));
    });

    it("ne fixe pas d'échéance au-delà de la fin du chat (passage à la vidéo)", () => {
      const a = assessGhosting(
        base({ lastMessage: { senderId: 'A', sentAt: at(30) } }),
        at(31),
      );
      expect(a.closeAt).toBeNull();
      expect(dueAction(a, at(55))).toBe('remind');
      expect(dueAction(a, at(70))).toBe('remind');
    });

    it("sans aucun message, personne n'attend personne", () => {
      expect(assessGhosting(base({ lastMessage: null }), at(10)).kind).toBe(
        'none',
      );
    });
  });

  describe('vidéo', () => {
    it("laisse 24 h pour rejoindre après l'appel de l'autre, et 48 h minimum dans l'étape", () => {
      const late = assessGhosting(
        base({ step: 'video', joinedA: true, callStartedAt: at(50) }),
        at(51),
      );
      expect(late.waitingOnId).toBe('B');
      expect(late.closeAt).toEqual(at(74));
      const early = assessGhosting(
        base({ step: 'video', joinedB: true, callStartedAt: at(2) }),
        at(3),
      );
      expect(early.waitingOnId).toBe('A');
      expect(early.closeAt).toEqual(at(48));
      expect(dueAction(early, at(14))).toBe('remind');
      expect(dueAction(early, at(36))).toBe('warn');
    });

    it("n'accuse personne si l'appel a eu lieu ou n'a pas commencé", () => {
      expect(
        assessGhosting(
          base({ step: 'video', joinedA: true, joinedB: true }),
          at(2),
        ).kind,
      ).toBe('none');
      expect(assessGhosting(base({ step: 'video' }), at(2)).kind).toBe('none');
    });
  });

  describe('échange de coordonnées', () => {
    it('clôt sans remboursement : le parcours a eu lieu', () => {
      const a = assessGhosting(
        base({ step: 'echange_contacts', contactB: true }),
        at(1),
      );
      expect(a.waitingOnId).toBe('A');
      expect(a.refundWaiting).toBe(false);
      expect(a.closeAt).toEqual(at(72));
      expect(dueAction(a, at(72))).toBe('close');
    });
  });

  describe('vue du membre', () => {
    const a = assessGhosting(
      base({ lastMessage: { senderId: 'A', sentAt: at(10) } }),
      at(11),
    );
    it('indique à qui on attend et la récupération du crédit', () => {
      expect(ghostingViewFor(a, 'B')).toEqual({
        waitingOn: 'me',
        since: at(10).toISOString(),
        closeAt: at(58).toISOString(),
        refundOnClose: false,
      });
      expect(ghostingViewFor(a, 'A').waitingOn).toBe('partner');
      expect(ghostingViewFor(a, 'A').refundOnClose).toBe(true);
    });
    it("n'affiche rien quand personne n'attend", () => {
      expect(
        ghostingViewFor(assessGhosting(base({}), at(1)), 'A').waitingOn,
      ).toBeNull();
    });
  });
});

describe('messages anti-ghosting', () => {
  it('formate les échéances en heure de Paris', () => {
    expect(frenchDeadline(new Date('2026-10-08T12:00:00Z'))).toBe(
      'jeudi 8 octobre à 14:00',
    );
  });

  it('annonce la clôture et le crédit rendu dans le dernier avertissement', () => {
    const m = reminderMessage(
      'chat_libre',
      'warn',
      'Inès',
      new Date('2026-10-08T12:00:00Z'),
      true,
    );
    expect(m.title).toBe('Dernier rappel : votre parcours avec Inès');
    expect(m.content).toContain('jeudi 8 octobre à 14:00');
    expect(m.content).toContain('Inès récupérera son crédit');
  });

  it('propose toujours de mettre fin poliment dans le rappel', () => {
    const m = reminderMessage('video', 'remind', 'Yanis', null, true);
    expect(m.title).toBe('Yanis attend votre réponse');
    expect(m.content).toContain('mettez-y fin poliment');
    expect(m.content).not.toContain('Sans réponse avant');
  });

  it('lit le mode du moniteur (observation par défaut)', () => {
    expect(ghostingMode(undefined)).toBe('observe');
    expect(ghostingMode(' ON ')).toBe('on');
    expect(ghostingMode('off')).toBe('off');
    expect(ghostingMode('n importe quoi')).toBe('observe');
  });

  it("n'accepte que les messages de courtoisie prévus", () => {
    expect(farewellText('merci')).toContain('Merci pour ces échanges');
    expect(farewellText('texte libre')).toBeNull();
    expect(farewellText('toString')).toBeNull();
    expect(farewellText(undefined)).toBeNull();
  });
});
