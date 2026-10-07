/**
 * Grand Entretien BOLIGO — version anglaise (questionnaire V7).
 *
 * Mêmes identifiants et mêmes clés d'options que `questions.data.ts` : seule la
 * langue d'affichage change. Une réponse « B » a donc le même sens quelle que
 * soit la langue dans laquelle le membre a passé l'entretien, et deux membres
 * de langues différentes restent comparables.
 *
 * Reprend la version anglaise du questionnaire V5 quand la question y figure.
 * Ajouter une langue : un fichier sur ce modèle, relu par une personne de
 * langue maternelle, puis l'entrée correspondante dans `TRANSLATIONS`.
 */
import { Question } from './questions.data';

export type InterviewLanguage = 'fr' | 'en';

export interface QuestionTranslation {
  text: string;
  /** Textes des options, dans l'ordre des clés ; absent pour une échelle. */
  options?: string[];
}

const AGREEMENT_EN = [
  'Strongly disagree',
  'Somewhat disagree',
  'Neither agree nor disagree',
  'Somewhat agree',
  'Strongly agree',
];

const FREQUENCY_EN = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'];

export const QUESTIONS_EN: Record<string, QuestionTranslation> = {
  // ── Module 0 — Non-negotiable filters
  M0_Q01: {
    text: 'The age range you are looking for in a partner:',
    options: [
      'Same generation (±5 years)',
      'Younger (no more than 5 years apart)',
      'Older (no more than 5 years apart)',
      'Doesn’t matter, within 10 years either way',
    ],
  },
  M0_Q02: {
    text: 'The geographic scope of your search:',
    options: [
      'Same city or nearby (local)',
      'Same region',
      'My whole country (national)',
      'International (no borders)',
    ],
  },
  M0_Q03: {
    text: 'Are you willing to relocate for your partner?',
    options: [
      'Yes, unconditionally',
      'Yes, if the life plan is solid',
      'It depends on the distance',
      'No, I’m staying where I am',
    ],
  },
  M0_Q04: {
    text: 'Your current situation:',
    options: [
      'Single',
      'Separated / divorced',
      'Widowed',
      'In transition: separation or divorce not yet finalised',
    ],
  },
  M0_Q05: {
    text: 'Do you have children?',
    options: [
      'No children',
      'Yes, one dependent child',
      'Yes, two or more dependent children',
      'Yes, and they are all independent (18+)',
    ],
  },
  M0_Q06: {
    text: 'Do you want to have children (or more children) in the future?',
    options: [
      'Yes, absolutely',
      'Yes, if the conditions are right',
      'I’m not sure',
      'No, that’s final',
    ],
  },
  M0_Q07: {
    text: 'Your level of education:',
    options: [
      'No diploma / vocational qualification',
      'High-school diploma (baccalaureate, A-levels)',
      'Two to four years of higher education',
      'Five years or more (master’s level and above)',
    ],
  },
  M0_Q09: {
    text: 'Do you smoke?',
    options: ['No, never', 'Occasionally', 'Yes, regularly'],
  },
  M0_Q11: {
    text: 'Tobacco in a partner:',
    options: [
      'I couldn’t live with it',
      'Acceptable if it stays occasional',
      'Doesn’t matter to me',
    ],
  },
  M0_Q12: {
    text: 'Do you drink alcohol yourself?',
    options: [
      'Never',
      'Only on occasions (celebrations, meals)',
      'Every week',
      'Almost every day',
    ],
  },
  M0_Q13: {
    text: 'Alcohol in a partner:',
    options: [
      'I couldn’t live with it, even occasionally',
      'Acceptable if it stays occasional',
      'Doesn’t matter to me',
    ],
  },
  M0_Q10: {
    text: 'Which languages are you comfortable living a relationship in, day to day? (several answers possible)',
    options: [
      'French — Français',
      'English',
      'Arabic — العربية',
      'Lingala',
      'Kiswahili',
      'Wolof',
      'Portuguese — Português',
      'Spanish — Español',
      'Another language (please specify)',
    ],
  },

  // ── Module 1 — Identity & culture
  M1_Q01: {
    text: 'Your continent of origin or cultural reference (two at most if you have mixed heritage):',
    options: [
      'Sub-Saharan Africa',
      'Maghreb / Middle East',
      'Europe',
      'Asia',
      'Americas / Caribbean',
      'Oceania',
    ],
  },
  M1_Q02: {
    text: 'The culture of your ideal partner:',
    options: [
      'The same as mine',
      'A close or compatible culture',
      'Rather a culture different from mine',
      'I have no preference',
    ],
  },
  M1_Q03: {
    text: 'How important are the marriage traditions of your culture to you?',
    options: [
      'Central — I will respect all of them (dowry, zaffa, sacred fire, lazo…)',
      'Important — I’ll keep the main ones',
      'Moderate — I’ll choose a few',
      'Not very important — I prefer personal symbolism',
    ],
  },
  M1_Q16: {
    text: 'Your religion or belief:',
    options: [
      'Christian: Catholic',
      'Christian: Protestant or Evangelical',
      'Christian: another Church',
      'Muslim',
      'Jewish',
      'Buddhist or Hindu',
      'A traditional or ancestral religion',
      'A personal spirituality, without religion',
      'No religion',
      'Another religion',
    ],
  },
  M1_Q17: {
    text: 'Your religious practice (prayer, services, fasting…):',
    options: [
      'Every day',
      'Every week',
      'Mostly for religious holidays and major occasions',
      'Rarely or never',
    ],
  },
  M1_Q18: {
    text: 'If the person you love did not share your religion or beliefs:',
    options: [
      'It wouldn’t be possible: I’m looking for someone who shares them',
      'It would be a condition: they would have to adopt mine before marriage',
      'I would wish for it, without making it a condition',
      'We would each keep our own, respecting the other’s',
      'I could adopt theirs myself',
    ],
  },
  M1_Q19: {
    text: 'Your eating habits (religious rules or convictions):',
    options: [
      'I eat halal, strictly',
      'I eat kosher, strictly',
      'I’m vegetarian or vegan',
      'Another strict rule (religious or personal)',
      'A few rules, which I adapt to the context',
      'No rules: I eat everything',
    ],
  },
  M1_Q11: {
    text: 'Your position on polygamy:',
    options: [
      'Unacceptable — exclusive monogamy, no discussion',
      'I respect it in others, but not for my relationship',
      'Conceivable within a religious, consensual and transparent framework',
      'I’d rather talk about it in person',
    ],
  },
  M1_Q13: {
    text: 'Your approach to passing on your culture to your children:',
    options: [
      'Mother tongue, traditions and religion — everything is passed on',
      'They will be exposed to both cultures',
      'They’ll choose for themselves as they grow up',
      'Culture won’t be central to their upbringing',
    ],
  },
  M1_Q15: {
    text: 'If your family disapproves of your partner for cultural reasons:',
    options: [
      'I respect their view and reconsider my decision',
      'I take it into account but follow my heart',
      'I explain my position and stand by my choice',
      'Their approval isn’t necessary for me',
    ],
  },

  // ── Module 2 — Attachment & emotional regulation
  M2_Q04: {
    text: 'Your greatest fears in a relationship (2 at most):',
    options: [
      'Being abandoned',
      'Losing my independence, feeling smothered',
      'Not being good enough',
      'Being betrayed',
      'Not getting enough attention and affection',
      'Having to put myself last to be loved',
      'None of these fears really speaks to me',
    ],
  },
  M2_Q05: {
    text: 'In a relationship, I have been criticised for: (several answers possible)',
    options: [
      'Worrying too much or lacking trust',
      'Pulling away or keeping my distance when things get intense',
      'Finding it hard to express what I felt',
      'I’ve never received this kind of criticism',
    ],
  },
  M2_Q07: {
    text: 'After a serious argument, you return to warmth within:',
    options: [
      'A few hours — I don’t let things drag on',
      'A day — I need to process',
      'Several days — wounds last',
      'A very long time — I can hold out for weeks',
    ],
  },
  M2_Q22: {
    text: 'After an argument in which you think you were mostly right, what do you usually do?',
    options: [
      'I acknowledge my share, even if it is small',
      'I take a step towards the other, without going back over the substance',
      'I wait for the other person to come back to me',
      'I don’t apologise as long as I think I was right',
    ],
  },
  M2_Q10: {
    text: 'If you were going through a difficult time, asking a professional for help (psychologist, couples counsellor) would be:',
    options: [
      'Natural — I have done it or would do it without hesitation',
      'Possible, after first trying on my own',
      'I’ve never needed it, but I’m open to it',
      'Difficult — I prefer to get through it on my own',
    ],
  },
  M2_Q23: {
    text: 'When the person I love takes a long time to reply to a message, I reread our conversation looking for a sign.',
  },
  M2_Q24: {
    text: 'When a relationship becomes very serious, I feel like taking a little distance.',
  },
  M2_Q25: {
    text: 'If I haven’t received a single loving word all day, I wonder whether something is wrong between us.',
  },
  M2_Q26: {
    text: 'When I get bad news, the person I love is the first one I want to talk to about it.',
  },
  M2_Q27: {
    text: 'When we spend a few days without seeing each other, I stay calm.',
  },
  M2_Q28: {
    text: 'When I have a big worry, I prefer to sort it out on my own before talking to the person I love.',
  },
  M2_Q29: {
    text: 'After a small argument, I find it hard to think about anything else until we have made up.',
  },
  M2_Q30: {
    text: 'When my partner says very tender things to me, I feel a little embarrassed and change the subject.',
  },
  M2_Q31: {
    text: 'When the person I love spends an evening with friends without me, I’m rather happy for them.',
  },
  M2_Q32: {
    text: 'When I’m exhausted, I gladly let my partner take care of me.',
  },
  M2_Q33: {
    text: 'When my partner doesn’t answer, I sometimes call or write several times in a row.',
  },
  M2_Q34: {
    text: 'When my partner asks me how I feel, I often say “I’m fine” to cut it short.',
  },
  M2_Q35: {
    text: 'When someone speaks to me curtly, I tell myself they may be having a bad day, and that calms me down.',
  },
  M2_Q36: {
    text: 'When I’m sad, I make sure nobody notices.',
  },
  M2_Q37: {
    text: 'After a setback (a cancelled train, a missed appointment), I quickly find a bright side or a lesson to learn.',
  },
  M2_Q38: {
    text: 'Even when I’m very angry, I keep a calm face so that nothing shows.',
  },
  M2_Q39: {
    text: 'When a remark hurts me, I go over it again and again for hours.',
  },
  M2_Q40: {
    text: 'When good news makes me happy, it shows straight away.',
  },
  M2_Q19: {
    text: 'When I first meet someone, I feel intimidated.',
  },
  M2_Q20: {
    text: 'It takes me time before I talk about myself and how I feel.',
  },
  M2_Q41: {
    text: 'With someone I’ve just met, I quickly feel at ease.',
  },

  // ── Module 3 — Past & context
  M3_Q11: {
    text: 'Your last serious relationship:',
    options: [
      'Hasn’t completely ended yet (separation in progress)',
      'Ended less than 6 months ago',
      'Ended 6 months to 2 years ago',
      'Ended more than 2 years ago',
      'I haven’t had a serious relationship yet',
    ],
  },
  M3_Q03: {
    text: 'How did you experience your last break-up?',
    options: [
      'Very hard — I’m still getting over it',
      'Painfully, but I rebuilt myself',
      'Relatively well — a mutual decision',
      'I decided — I feel free',
    ],
  },
  M3_Q05: {
    text: 'What place does your ex have in your life today?',
    options: [
      'None — a total break',
      'Communication only for the children',
      'We stayed friends',
      'They are part of my close circle',
    ],
  },
  M3_Q07: {
    text: 'Do you have unresolved conflicts with your ex-partner? (several answers possible)',
    options: [
      'No — everything is resolved',
      'Tensions over child custody',
      'Financial tensions still active',
      'We never had real closure',
    ],
  },
  M3_Q10: {
    text: 'Have you found yourself in the same difficult situations from one relationship to the next?',
    options: [
      'Yes, and I’ve worked on it (alone or with support)',
      'Yes, I see it but struggle to change',
      'I’m not really sure',
      'No — each relationship has been different for me',
    ],
  },
  M3_Q12: {
    text: 'In the home where you grew up, disagreements between adults were most often settled:',
    options: [
      'By talking, sometimes heatedly, then making up',
      'With shouting or arguments that kept coming back',
      'With silence: problems were not talked about',
      'One person decided, the others followed',
      'I didn’t grow up with two adults in a couple',
    ],
  },
  M3_Q04: {
    text: 'In a blended family, the step-parent’s place with the other’s children:',
    options: [
      'A full parent, with no difference between the children',
      'An affectionate place, each parent keeping their role with their own children',
      'A caring presence, without direct parental authority',
      'A place built over time and through trust',
    ],
  },

  // ── Module 4 — Economic vision
  M4_Q01: {
    text: 'Your approach to money as a couple:',
    options: [
      'Everything shared — one common pot',
      'Contributions proportional to income',
      'Each pays their own expenses, and shared costs are split',
      'Money stays an individual matter',
    ],
  },
  M4_Q14: {
    text: 'You receive an unexpected sum of money (a bonus, a gift). Most often:',
    options: [
      'I put almost all of it aside',
      'I put part of it aside and treat myself with the rest',
      'I mostly spend it on what I feel like at the time',
      'It really depends on the moment',
    ],
  },
  M4_Q03: {
    text: 'Your view of the man’s economic role:',
    options: [
      'He earns most of the household income — it’s his responsibility',
      'He contributes, without it being an absolute obligation',
      'Equality is the norm — we share everything',
      'His role depends on each person’s situation',
    ],
  },
  M4_Q04: {
    text: 'Your view of the woman’s economic role:',
    options: [
      'She runs the home and the children’s education — that’s her priority',
      'She works, but the home remains her main responsibility',
      'She is financially independent and contributes to the household',
      'She does what she wants — no imposed role',
    ],
  },
  M4_Q15: {
    text: 'Household chores (meals, cleaning, laundry) in your relationship:',
    options: [
      'Mainly the woman’s role',
      'Shared, with the woman keeping the main responsibility',
      'Shared fairly, according to each person’s availability',
      'I haven’t really thought about it yet',
    ],
  },
  M4_Q05: {
    text: 'Your approach to sending money to the extended family:',
    options: [
      'Normal and regular — my family counts on me',
      'We discuss it as a couple before any decision',
      'It’s my money — my business',
      'It must be limited to protect our home',
    ],
  },
  M4_Q06: {
    text: 'Buying property in your life plan:',
    options: [
      'Alone — it’s my independence',
      'Together — it’s a shared project',
      'Flexible renting for now',
      'Not a priority',
    ],
  },
  M4_Q07: {
    text: 'The dowry or mahr in your culture:',
    options: [
      'An obligation I fully respect',
      'An important symbolic tradition',
      'I practise it in a modernised way',
      'Not part of my culture, or I don’t adhere to it',
    ],
  },
  M4_Q09: {
    text: 'Your partner’s outstanding debts or loans:',
    options: [
      'Everything must be disclosed before committing',
      'We talk about it when we move in together',
      'It stays personal as long as it doesn’t affect the couple',
      'I’ve never thought about it',
    ],
  },
  M4_Q10: {
    text: 'On a first date, the bill:',
    options: [
      'The man should pay — it’s a sign of respect',
      'Whoever suggested the date pays',
      'We split it fifty-fifty',
      'It doesn’t matter, as long as nobody feels indebted',
    ],
  },
  M4_Q11: {
    text: 'If your partner earned little or nothing for a long period:',
    options: [
      'I would support them without counting — that’s what a couple is for',
      'I would support them, with a plan to get through it together',
      'I would support them for a while, but it would end up weighing on my feelings',
      'A lasting lack of money would be a reason to leave',
    ],
  },
  M4_Q12: {
    text: 'The place of money and lifestyle in choosing a partner:',
    options: [
      'Essential — I want a certain standard of living',
      'Important — stability matters more than the amount',
      'Secondary — we build it together',
      'None — only the heart matters',
    ],
  },
  M4_Q13: {
    text: 'Lending your personal belongings to your partner (car, phone, computer, clothes):',
    options: [
      'What’s mine is yours',
      'Gladly, as long as they ask first',
      'Some things only — not my car or my phone',
      'I prefer each of us to keep our own things',
    ],
  },

  // ── Module 5 — Social & family dynamics
  M5_Q01: {
    text: 'The place of your family in your decisions as a couple:',
    options: [
      'Central — I don’t decide without their opinion',
      'Important, but the final decision is ours',
      'I consult them out of respect, not obligation',
      'Our decisions concern only our couple',
    ],
  },
  M5_Q10: {
    text: 'Your relatives insist on a couple decision you don’t agree with (where to hold the wedding, a child’s name). Most often:',
    options: [
      'I follow their opinion to keep the peace',
      'We decide together, and I calmly explain our choice to them',
      'I oppose them strongly',
      'I distance myself from them for a while',
    ],
  },
  M5_Q02: {
    text: 'Your mother (or father) disrespects your partner. You:',
    options: [
      'Stand up for your partner in front of your parent',
      'Try to understand before acting',
      'Wait for it to settle on its own',
      'Tell your partner not to take it too much to heart',
      'Back your partner, then talk to your parent in private',
    ],
  },
  M5_Q03: {
    text: 'Living with your in-laws:',
    options: [
      'I accept if it’s temporary and with clear rules',
      'I don’t accept — our home is ours',
      'It’s normal in my culture — it’s expected',
      'I accept if my partner agrees',
    ],
  },
  M5_Q07: {
    text: 'The ideal frequency of visits to your in-laws:',
    options: [
      'Every weekend or very regularly',
      'Once a month',
      'Major occasions only',
      'Never or very rarely',
    ],
  },
  M5_Q09: {
    text: 'Your partner having close friends of the opposite sex:',
    options: [
      'It’s no problem for me',
      'Fine, if I know them and everything stays transparent',
      'It would make me uncomfortable',
      'I couldn’t accept it',
    ],
  },
  M5_Q08: {
    text: 'Access to your partner’s phone and messages:',
    options: [
      'Total transparency — each has access to everything',
      'Each keeps their phone to themselves',
      'Access only in case of serious doubt',
      'I’ve never thought about it',
    ],
  },

  // ── Module 6 — Daily life, real communication & limits
  M6_Q16: {
    text: 'During a tense discussion, when you feel you can no longer listen (heart racing, wanting to leave), most often:',
    options: [
      'I say so and suggest a break, setting a time to pick it up again',
      'I carry on, even though I’m not really listening any more',
      'I raise my voice',
      'I leave or go quiet, without explaining anything',
      'It doesn’t happen to me, or very rarely',
    ],
  },
  M6_Q17: {
    text: 'After a disagreement, your partner tells you: “I need a moment, let’s talk about it later.” Most often:',
    options: [
      'I leave them alone, and we talk about it later',
      'I accept, but I stay tense until it’s settled',
      'I insist that we talk about it right away',
      'I keep at it: I follow them, call or send several messages',
    ],
  },
  M6_Q02: {
    text: 'In arguments, I have been criticised for: (several answers possible)',
    options: [
      'Talking too loudly or too fast',
      'Running away or cutting off communication',
      'Being sarcastic or hurtful with words',
      'I’ve never received this kind of criticism',
    ],
  },
  M6_Q03: {
    text: 'Do you need to win the argument or have the last word?',
    options: [
      'No — resolving matters more to me than winning',
      'Sometimes I get carried away, but I realise it',
      'Often, yes — it’s stronger than me',
      'Yes — and I fully own it',
    ],
  },
  M6_Q11: {
    text: 'After an argument, the ideal reconciliation for you:',
    options: [
      'We talk it over calmly and apologise to each other',
      'A tender gesture is worth more than a long discussion',
      'Each of us steps back, then we turn the page',
      'I need the other person to make the first move',
    ],
  },
  M6_Q12: {
    text: 'During an argument, I criticise who my partner is rather than a specific behaviour (“you always…”, “you never…”).',
  },
  M6_Q20: {
    text: 'When something bothers me, I say it by talking about how I feel rather than by accusing (“I felt lonely last night”).',
  },
  M6_Q13: {
    text: 'During an argument, I become sarcastic, mock or roll my eyes.',
  },
  M6_Q21: {
    text: 'Even when I’m upset, I can tell my partner what I appreciate about them.',
  },
  M6_Q14: {
    text: 'When I’m criticised, I justify myself or shift the blame instead of listening.',
  },
  M6_Q22: {
    text: 'When I’m criticised, I first look for what is fair in it before defending myself.',
  },
  M6_Q15: {
    text: 'During an argument, I shut down completely and stop responding.',
  },
  M6_Q23: {
    text: 'During an argument, I show my partner that I’m listening (I look at them, answer, rephrase).',
  },
  M6_Q04: {
    text: 'Physical violence in a relationship:',
    options: [
      'Immediate break-up — an absolute, non-negotiable limit',
      'Unacceptable, but I would first try to talk it through',
      'It depends on the circumstances',
      'I don’t know how I would react',
    ],
  },
  M6_Q05: {
    text: 'Insults or hurtful words during an argument:',
    options: [
      'An absolute limit for me — unacceptable',
      'Serious, but I can forgive a first time',
      'Hard, but it can happen in a couple',
      'I try to ignore it if it’s not recurring',
    ],
  },
  M6_Q18: {
    text: 'If your partner cheated on you, it would be:',
    options: [
      'An immediate break-up, with no way back',
      'A very serious wound; I don’t know whether I could forgive',
      'A very serious wound, which can heal with time and proof',
      'An ordeal a couple can overcome if they talk about it openly',
    ],
  },
  M6_Q19: {
    text: 'In your view, which of these behaviours by your partner would already be unfaithful? (several answers possible)',
    options: [
      'Exchanging flirtatious messages with someone else',
      'Keeping an active profile on a dating app',
      'Confiding in someone else what they don’t tell me',
      'Seeing an ex without telling me',
      'Kissing someone else',
      'Watching adult content',
      'None of these: only a physical relationship counts',
    ],
  },
  M6_Q08: {
    text: 'When you don’t feel like physical intimacy and your partner suggests it:',
    options: [
      'I say so gently and we find a tender alternative',
      'I go along with it to please them — this often happens',
      'I say no clearly, without guilt',
      'I find it hard to refuse — I don’t want to disappoint',
    ],
  },

  // ── Module 7 — Life trajectory & personality
  M7_Q19: {
    text: 'Which of these matter most in your life? (3 at most)',
    options: [
      'The security and stability of my family',
      'Respecting traditions and my faith',
      'Succeeding and being recognised for what I do',
      'Being free to make my own choices',
      'Helping others and being fair',
      'Discovering, travelling, experiencing new things',
      'Enjoying life and its pleasures',
      'Living in harmony with those around me, avoiding conflict',
      'Having influence and material comfort',
    ],
  },
  M7_Q02: {
    text: 'Your level of professional ambition:',
    options: [
      'High — I aim high and make sacrifices for it',
      'Moderate — I like to succeed without it taking everything',
      'Measured — work-life balance comes before career',
      'Accomplished — I’m in a phase of passing things on',
    ],
  },
  M7_Q05: {
    text: 'Your relationship with change and the unexpected:',
    options: [
      'I love it — change stimulates and nourishes me',
      'I accept it well — flexibility is a quality',
      'I need to adapt gradually',
      'I need stability — the unexpected unsettles me',
    ],
  },
  M7_Q07: {
    text: 'Where do you see yourself living in five years?',
    options: [
      'In the same city as today',
      'In another city or region of my country',
      'In another country',
      'I’m open — it depends on the life plan',
    ],
  },
  M7_Q08: {
    text: 'Ideally, the time spent together during the week:',
    options: [
      'As much as possible — we share almost everything',
      'Evenings and weekends, with time for ourselves',
      'A few quality dates — each has their own life',
      'It depends on the period and our projects',
    ],
  },
  M7_Q20: {
    text: 'At a party where I know few people, I easily go up to others to chat.',
  },
  M7_Q21: {
    text: 'When a friend asks me a favour that’s a bit inconvenient, I still do it willingly.',
  },
  M7_Q22: {
    text: 'When I have some paperwork to do, I deal with it without waiting until the last minute.',
  },
  M7_Q23: {
    text: 'Over a small annoyance (a delay, a lost item), I can get irritated very quickly.',
  },
  M7_Q24: {
    text: 'I like discovering places, cuisines or ideas I don’t know yet.',
  },
  M7_Q25: {
    text: 'After a day spent with lots of people, what I mostly need is calm and solitude.',
  },
  M7_Q26: {
    text: 'In a disagreement between friends, I look for common ground rather than imposing my view.',
  },
  M7_Q27: {
    text: 'When I promise to do something, I do it, even if it costs me.',
  },
  M7_Q28: {
    text: 'I worry for a long time about things that may never happen.',
  },
  M7_Q29: {
    text: 'I prefer activities I already know to ones I’ve never tried.',
  },
  M7_Q30: {
    text: 'In a negotiation (a purchase, a rent), I defend my interests above all, even if the other person loses out.',
  },
  M7_Q31: {
    text: 'I often find myself looking for my keys or papers because they aren’t put away.',
  },
  M7_Q32: {
    text: 'When I’m criticised (at work, in my studies or in my family), I take it without losing my calm.',
  },
  M7_Q33: {
    text: 'In the evening, I can usually put the day’s worries aside.',
  },
  M7_Q34: {
    text: 'In a group of friends, I’m often the one who suggests an outing or an activity.',
  },
  M7_Q35: {
    text: 'A book, a film or a conversation can keep me thinking for several days.',
  },

  // ── Module 8 — Couple project
  M8_Q01: {
    text: 'Your main goal on BOLIGO:',
    options: [
      'Marriage — I’m looking for an official commitment',
      'A serious relationship with a shared life plan',
      'Taking time to really get to know the other person before any commitment',
      'I’m open to seeing what comes',
    ],
  },
  M8_Q02: {
    text: 'Within what timeframe do you see an official commitment?',
    options: [
      'Within 12 months if all goes well',
      'Within 2 to 3 years',
      'No pressure — at our natural pace',
      'When the conditions are right',
    ],
  },
  M8_Q03: {
    text: 'Your vision of marriage:',
    options: [
      'A fundamental religious and spiritual act',
      'A civil and symbolic commitment',
      'Both — civil and religious',
      'An optional choice — love matters more than paperwork',
      'Above all customary or traditional',
    ],
  },
  M8_Q15: {
    text: 'In raising children, what matters most to you:',
    options: [
      'Authority: children obey their parents',
      'A firm framework, explained with kindness',
      'Dialogue: rules are discussed with them',
      'Freedom: children mostly learn by themselves',
    ],
  },
  M8_Q04: {
    text: 'What makes you feel most loved (2 at most):',
    options: [
      'Loving words and compliments',
      'Practical gestures that make my life easier',
      'Thoughtful attentions and gifts',
      'Time spent together, fully present',
      'Physical tenderness: hugs, gentle gestures',
    ],
  },
  M8_Q06: {
    text: 'Communication in your ideal couple:',
    options: [
      'We talk about everything, all the time',
      'We communicate deeply about what matters',
      'We talk mostly when it’s necessary',
      'I prefer actions to long speeches',
    ],
  },
  M8_Q09: {
    text: 'If your life plans diverge on a key point (city, children, religion), you:',
    options: [
      'Raise it early and decide quickly if it’s not compatible',
      'Let the relationship grow before bringing it up',
      'Look for a compromise, whatever the cost',
      'Trust love to find a solution',
    ],
  },
  M8_Q14: {
    text: 'In every couple, some disagreements are never really resolved (personality, habits). For you:',
    options: [
      'It’s normal: you learn to live with them, and even laugh about them',
      'A solution has to be found in the end, otherwise it weighs on me',
      'If a disagreement can’t be resolved, it means we’re not made for each other',
      'I’ve never really thought about it',
    ],
  },
  M8_Q13: {
    text: 'If, after several years, your life as a couple made you unhappy:',
    options: [
      'I would stay: for me, commitment is for life',
      'I would do everything to save the relationship; separating would only be a last resort',
      'I would leave if, despite our efforts, nothing improved',
      'I would leave without waiting too long: you don’t stay together out of duty',
    ],
  },
  M8_Q11: {
    text: 'If your partner became seriously ill or lived with a disability, taking care of them would be:',
    options: [
      'Obvious — for better or for worse',
      'Natural, with outside help to last over time',
      'Frightening, but I would try',
      'I don’t know if I could do it',
    ],
  },
  M8_Q10: {
    text: 'Which of these signs would make you run quickly? (3 at most)',
    options: [
      'Very fast, overwhelming declarations of love',
      'Controlling jealousy: phone searched, location demanded',
      'Disappearing for days without explanation, then coming back as if nothing happened',
      'Staying vague about intentions: “we’ll see”, no commitment',
      'Badmouthing all their exes',
      'Being rude to waiters, strangers or their family',
      'Relying on the other person’s money to live',
      'Never admitting they were wrong',
      'Not respecting a “no” or a boundary',
      'Eyes glued to their phone during time together',
    ],
  },
  M8_Q12: {
    text: 'Which of these topics are non-negotiable for you, to the point that a disagreement would make you give up the relationship? (3 at most)',
    options: [
      'Having children, or not',
      'Religion and its practice',
      'Fidelity',
      'How money is managed',
      'Where we live',
      'The place of family in the couple',
      'Physical intimacy before marriage',
      'Polygamy',
      'Tobacco or alcohol',
      'The roles of men and women in the home',
      'None: for me, everything can be discussed',
    ],
  },

  // ── Module 9 — Power, effort & capacity to love
  M9_Q01: {
    text: 'In your ideal couple, who makes the important decisions?',
    options: [
      'We decide together — total equality',
      'I naturally take the lead',
      'My partner often decides — that suits me',
      'It depends on the area — we each have our domains',
    ],
  },
  M9_Q02: {
    text: 'Your philosophy of effort in love:',
    options: [
      'True love shouldn’t require effort — it should be natural',
      'Love is built — effort is a proof of love',
      'Effort must be mutual, otherwise I withdraw',
      'I give a lot but expect the same in return',
    ],
  },
  M9_Q03: {
    text: 'Do you keep count of what you give and what you receive in a relationship?',
    options: [
      'No — I give freely without counting',
      'Sometimes, especially when I feel short-changed',
      'Yes — I naturally watch the balance',
      'Yes — it’s a way of protecting myself',
    ],
  },
  M9_Q06: {
    text: 'Your attitude to sacrifice in a relationship:',
    options: [
      'I can sacrifice everything for the person I love',
      'I can make big sacrifices if it’s mutual',
      'Small sacrifices yes, big ones no — I stay myself',
      'I believe a true relationship doesn’t require sacrifices',
    ],
  },
  M9_Q07: {
    text: 'Your relationship with tenderness and physical affection outside sexuality:',
    options: [
      'Essential — it’s my main love language',
      'Important, but I’m not very demonstrative',
      'Appreciated but not essential',
      'I’m not very comfortable with non-sexual physical contact',
    ],
  },
  M9_Q25: {
    text: 'Your partner tells you a detail of their day while you’re busy. Most often:',
    options: [
      'I stop for a moment to listen and respond',
      'I answer briefly and go back to what I was doing',
      'I ask them to wait until I’ve finished, then I come back to them',
      'I carry on without really listening',
    ],
  },
  M9_Q08: { text: 'I have never been jealous, not even a tiny bit.' },
  M9_Q20: {
    text: 'I have sulked over a trifle before.',
  },
  M9_Q10: {
    text: 'At the start of a relationship, I quickly tell the other person they are the love of my life.',
  },
  M9_Q11: {
    text: 'When I have doubts, I look at the other person’s phone or ask where they are.',
  },
  M9_Q21: {
    text: 'I have never been in a bad mood with someone I love.',
  },
  M9_Q12: {
    text: 'When a relationship no longer suits me, I would rather disappear than explain myself.',
  },
  M9_Q13: {
    text: 'I prefer not to define the relationship too early, to keep my options open.',
  },
  M9_Q22: {
    text: 'I have said “I’m on my way” before when I hadn’t actually left yet.',
  },
  M9_Q14: {
    text: 'When I talk about my exes, it’s mostly to say what they did wrong.',
  },
  M9_Q15: { text: 'During time together, I check my phone.' },
  M9_Q24: {
    text: 'When my partner says no, I insist to make them change their mind.',
  },
  M9_Q23: {
    text: 'When I’m tired, I am sometimes less patient with those close to me.',
  },
  M9_Q16: {
    text: 'When I don’t get what I want, I let it show (sulking, coldness).',
  },
  M9_Q17: {
    text: 'In a couple, I expect the other person to guess what I want without my having to say it.',
  },
  M9_Q18: { text: 'When I want something, I find it hard to wait.' },
  M9_Q19: {
    text: 'With a partner who sulks when they don’t get what they want:',
    options: [
      'It doesn’t bother me — I gladly give in to please them',
      'I let it go, then we talk about it calmly',
      'It quickly annoys me — I don’t give in',
      'It’s a deal-breaker for me',
    ],
  },

  // ── Module 10 — Alchemy, vibe & desire
  M10_Q02: {
    text: 'My close friends would describe me as:',
    options: [
      'Funny, light-hearted and easy to be around',
      'Intense, deep and intellectually stimulating',
      'Warm, caring and reassuring',
      'Calm, stable and reliable — a rock',
    ],
  },
  M10_Q03: {
    text: 'What kind of energy are you looking for in a partner?',
    options: [
      'Someone light, funny, who makes me laugh',
      'Someone intense, deep and intellectually stimulating',
      'Someone warm, caring and reassuring',
      'Someone calm, steady and reliable, who balances my energy',
    ],
  },
  M10_Q09: {
    text: 'What you bring that is truly unique to a relationship:',
    options: [
      'My joie de vivre and light-heartedness — being with me is fun',
      'My depth and listening — I make the other person feel truly understood',
      'My stability and reliability — I’m always there',
      'My creativity and my taste for beauty and the unusual',
    ],
  },
  M10_Q04: {
    text: 'Do you easily make the people around you laugh?',
    options: [
      'Yes — humour is one of my natural strengths',
      'Often — I have a sense of humour without making a show of it',
      'Sometimes — especially with people I know well',
      'Rarely — I’m more serious by nature',
    ],
  },
  M10_Q11: {
    text: 'Think back to the people who swept you off your feet quickly. What did their look mostly have in common?',
    options: [
      'An elegant, polished look',
      'A natural, relaxed style',
      'A sporty, energetic look',
      'An original, artistic, unconventional style',
      'A look rooted in their culture (clothing, codes)',
      'Nothing in common: it surprises me every time',
    ],
  },
  M10_Q12: {
    text: 'Your own look, day to day:',
    options: [
      'Elegant and polished',
      'Natural and relaxed',
      'Sporty and energetic',
      'Original, artistic, unconventional',
      'Rooted in my culture (clothing, codes)',
      'I don’t really pay attention to it',
    ],
  },
  M10_Q13: {
    text: 'In someone, what sparks attraction first:',
    options: [
      'Their eyes and smile',
      'Their voice and way of speaking',
      'Their look and bearing',
      'Their confidence, their charisma',
      'Their kindness towards others',
      'Their humour and wit',
    ],
  },
  M10_Q14: {
    text: 'What people notice first about you:',
    options: [
      'My eyes and smile',
      'My voice and way of speaking',
      'My look and bearing',
      'My confidence, my charisma',
      'My kindness towards others',
      'My humour and wit',
    ],
  },
  M10_Q15: {
    text: 'For a story to begin, physical attraction has to be:',
    options: [
      'Immediate — without a spark at first sight, it won’t work',
      'There, and it grows as we get to know each other',
      'Secondary — it grows out of the connection',
      'It really depends on the person',
    ],
  },
  M10_Q16: {
    text: 'The place of physical intimacy in your life as a couple:',
    options: [
      'Essential: it’s a pillar of the relationship',
      'Important, without being central',
      'Secondary: other things matter more to me',
      'I don’t know yet: it will depend on the relationship',
    ],
  },
  M10_Q17: {
    text: 'Physical intimacy before marriage:',
    options: [
      'Ruled out for me: I’m waiting for marriage',
      'I’d rather wait for a serious commitment (engagement, official plans)',
      'Possible once the relationship is solid, without waiting for an official commitment',
      'I’d rather talk about it directly with the person',
    ],
  },
  M10_Q18: {
    text: 'If, for several months, you wanted intimacy less than your partner did:',
    options: [
      'I’d talk about it to find together what suits us',
      'I’d force myself to avoid tension',
      'I’d wait for it to pass, without talking about it',
      'I’d think it was up to them to adapt',
    ],
  },
};

const TRANSLATIONS: Record<
  Exclude<InterviewLanguage, 'fr'>,
  Record<string, QuestionTranslation>
> = {
  en: QUESTIONS_EN,
};

/** Langue demandée (paramètre `lang`) ; le français par défaut. */
export function parseLanguage(value: unknown): InterviewLanguage {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return v.startsWith('en') ? 'en' : 'fr';
}

/** Options d'une question dans la langue demandée (échelles comprises). */
function translatedOptions(
  q: Question,
  t: QuestionTranslation,
): string[] | undefined {
  if (q.scale === 'accord') return AGREEMENT_EN;
  if (q.scale === 'frequence') return FREQUENCY_EN;
  return t.options;
}

/**
 * Question dans la langue du membre. Les clés d'options ne changent jamais ;
 * si une traduction manquait, la question resterait en français plutôt que de
 * disparaître.
 */
export function localizeQuestion(
  q: Question,
  lang: InterviewLanguage,
): Question {
  if (lang === 'fr') return q;
  const t = TRANSLATIONS[lang][q.id];
  if (!t) return q;
  const options = translatedOptions(q, t);
  return {
    ...q,
    text: t.text,
    options: q.options.map((o, i) => ({
      ...o,
      text: options?.[i] ?? o.text,
    })),
  };
}
