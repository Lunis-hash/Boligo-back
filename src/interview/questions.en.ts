/**
 * Grand Entretien BOLIGO — version anglaise (questionnaire V6).
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

const SEE_MYSELF = 'I see myself as someone who';

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
      'In a relationship transition',
    ],
  },
  M0_Q05: {
    text: 'Do you have dependent children?',
    options: [
      'No children',
      'Yes, one child',
      'Yes, two or more',
      'Yes, but they are independent (18+)',
    ],
  },
  M0_Q06: {
    text: 'Do you want children in the future?',
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
  M0_Q08: {
    text: 'Tobacco, alcohol or other substances in a partner:',
    options: [
      'A deal-breaker — I couldn’t live with it',
      'Acceptable in moderation, without excess',
      'I use them myself occasionally',
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
      'A different but open culture',
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
  M1_Q04: {
    text: 'Which of these marriage traditions represents you best?',
    options: [
      'Dowry / Blessings / Dances / Henna (Africa)',
      'Ring / White dress / Banquet (Europe)',
      'Sacred fire / Tea ceremony / Ribbons (Asia)',
      'Bouquet / Lazo / Dance party (Americas)',
      'Zaffa / Henna / Religious contract (Middle East)',
      'Natural rituals / Songs / Tattoos (Oceania)',
    ],
  },
  M1_Q05: {
    text: 'Your religion or spirituality:',
    options: [
      'Practising Christian',
      'Practising Muslim',
      'Practising Jew',
      'Buddhist / Hindu',
      'Agnostic / Atheist',
      'Spiritual, with no defined religion',
    ],
  },
  M1_Q06: {
    text: 'Will your religion have an impact on your partner?',
    options: [
      'Yes — the same faith is required',
      'Yes — my partner will have to respect my practices',
      'Yes — but I’m open to other beliefs',
      'No — religion is a personal matter',
    ],
  },
  M1_Q08: {
    text: 'The language spoken at home:',
    options: [
      'My mother tongue only',
      'French or the language of the country I live in',
      'Bilingual — two languages',
      'Doesn’t matter as long as we understand each other',
    ],
  },
  M1_Q09: {
    text: 'Your relationship with dietary restrictions:',
    options: [
      'Strict — halal, kosher, vegetarian or another conviction',
      'Present but flexible depending on the context',
      'None — I eat everything',
      'A topic I’ve never really thought about',
    ],
  },
  M1_Q10: {
    text: 'The role of elders and patriarchs in your decisions as a couple:',
    options: [
      'Fundamental — I don’t decide without their opinion',
      'Important, but the final decision is ours',
      'I consult them out of respect, not obligation',
      'Our decisions concern only our couple',
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
  M2_Q01: {
    text: 'When your partner doesn’t reply to your messages for several hours:',
    options: [
      'I assume they’re busy and wait calmly',
      'I start to worry slightly',
      'I send another message to check',
      'I feel inner anxiety or anger',
    ],
  },
  M2_Q02: {
    text: 'When your partner asks for more closeness than you want:',
    options: [
      'I try to adapt, even if it costs me',
      'I calmly explain my need for space',
      'I feel overwhelmed and pull away',
      'I ignore the request and change the subject',
    ],
  },
  M2_Q03: {
    text: 'In a relationship, what you need most:',
    options: [
      'To feel safe and loved unconditionally',
      'To keep my autonomy and personal space',
      'A balance between intimacy and freedom',
      'I haven’t clearly identified my need yet',
    ],
  },
  M2_Q04: {
    text: 'Your deepest fear in a relationship:',
    options: [
      'Being abandoned',
      'Losing my independence',
      'Not being good enough',
      'Being betrayed or manipulated',
    ],
  },
  M2_Q05: {
    text: 'In a relationship, I have been criticised for:',
    options: [
      'Worrying too much or lacking trust',
      'Pulling away or keeping my distance when things get intense',
      'Finding it hard to express what I felt',
      'I’ve never received this kind of criticism',
    ],
  },
  M2_Q06: {
    text: 'When I’m angry in a relationship, I tend to:',
    options: [
      'Express my anger clearly and directly',
      'Step back before talking about it',
      'Keep it to myself until it explodes',
      'Cut contact temporarily (punitive silence)',
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
  M2_Q08: {
    text: 'Can you apologise first, even when you think you’re right?',
    options: [
      'Yes — harmony comes before my ego',
      'Yes, if I realise I made a mistake',
      'With difficulty — my ego resists',
      'No — I don’t need to apologise if I was right',
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
  M2_Q11: {
    text: 'I often worry that I care more about the other person than they care about me.',
  },
  M2_Q12: {
    text: 'When my partner pulls away a little, I need reassurance very quickly.',
  },
  M2_Q13: { text: 'The idea of being left rarely worries me.' },
  M2_Q14: {
    text: 'I feel uncomfortable when my partner wants to be very close to me.',
  },
  M2_Q15: { text: 'I prefer not to show my partner how I feel deep down.' },
  M2_Q16: { text: 'I find it easy to rely on my partner when I need to.' },
  M2_Q17: {
    text: 'When I’m upset, I can look at the situation from another angle to calm down.',
  },
  M2_Q18: { text: 'I keep my emotions to myself, even when they are strong.' },
  M2_Q19: {
    text: 'When I first meet someone, I feel shy and find it hard to show who I really am.',
  },
  M2_Q20: {
    text: 'It takes me time before I talk about myself and how I feel.',
  },
  M2_Q21: { text: 'People confide in me easily.' },

  // ── Module 3 — Past & context
  M3_Q01: {
    text: 'The main lesson from your past relationships:',
    options: [
      'Communicate my needs better from the start',
      'The importance of shared values',
      'Setting my limits without guilt',
      'Choosing with my head as much as my heart',
    ],
  },
  M3_Q02: {
    text: 'The main cause of your last break-up:',
    options: [
      'Incompatible values or life plans',
      'A deep lack of communication',
      'Infidelity or betrayal',
      'Family or cultural pressure',
      'Violence or lack of respect',
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
  M3_Q04: {
    text: 'Your view of blended families:',
    options: [
      'My child is your child — full integration',
      'We love each other, but parental roles stay defined',
      'My partner is present without direct parental authority',
      'It will build with time and trust',
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
    text: 'Do you have unresolved conflicts with your ex-partner?',
    options: [
      'No — everything is resolved',
      'Tensions over child custody',
      'Financial tensions still active',
      'We never had real closure',
    ],
  },
  M3_Q08: {
    text: 'Have you experienced violence in a past relationship?',
    options: [
      'Yes — I was a victim and have worked on it',
      'Yes — I witnessed it in my family',
      'No, never',
      'I prefer not to answer',
    ],
  },
  M3_Q10: {
    text: 'Have you ever repeated the same patterns across several relationships?',
    options: [
      'Yes, and I’ve worked on it (alone or with support)',
      'Yes, I see it but struggle to change',
      'I’m not really sure',
      'No — every relationship is different for me',
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
  M4_Q03: {
    text: 'Your view of the man’s economic role:',
    options: [
      'He is the main provider — it’s his responsibility',
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
  M4_Q08: {
    text: 'Your approach to saving as a couple:',
    options: [
      'We save together for shared projects',
      'Each of us saves separately',
      'Shared savings and personal savings',
      'I’m not comfortable saving together',
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
  M5_Q02: {
    text: 'Your mother (or father) disrespects your partner. You:',
    options: [
      'Defend your partner immediately and clearly',
      'Try to understand before acting',
      'Wait for it to settle on its own',
      'Tell your partner not to take it too much to heart',
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
  M5_Q04: {
    text: 'Do you have close friends of the opposite sex?',
    options: [
      'Yes — it’s non-negotiable for me',
      'Yes — but I’m transparent about it',
      'I avoid it out of respect for my partner',
      'No, I prefer not to',
    ],
  },
  M5_Q05: {
    text: 'Social media and your life as a couple:',
    options: [
      'I share our life — I love showing our happiness',
      'I protect our privacy — few or no posts',
      'Each manages their own account freely',
      'Social media has no place in our relationship',
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
  M5_Q08: {
    text: 'Access to your partner’s phone and messages:',
    options: [
      'Total transparency — each has access to everything',
      'Trust without control — each keeps their privacy',
      'Access only in case of serious doubt',
      'I’ve never thought about it',
    ],
  },

  // ── Module 6 — Daily life, real communication & limits
  M6_Q01: {
    text: 'During an argument, your actual behaviour is more likely to be:',
    options: [
      'Talking even if it’s hard — I confront directly',
      'Stepping back and coming back calm',
      'Cutting the conversation short and leaving',
      'Shutting down in silence — sometimes for days',
    ],
  },
  M6_Q02: {
    text: 'In arguments, I have been criticised for:',
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
  M6_Q06: {
    text: 'Your relationship to sexuality as a couple:',
    options: [
      'It’s a fundamental pillar of the relationship',
      'It’s important but not decisive',
      'It’s something that builds over time',
      'It’s an intimate topic I’ll address in due course',
    ],
  },
  M6_Q07: {
    text: 'The frequency of physical intimacy you would ideally want in a relationship:',
    options: [
      'Very regularly — several times a week',
      'Regularly — a few times a month',
      'Occasionally — depending on mood and closeness',
      'Frequency matters little — quality is what counts',
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
  M6_Q10: {
    text: 'Fidelity in your idea of a couple:',
    options: [
      'Absolute and non-negotiable',
      'Important, but I believe in reconciliation',
      'I’m human — temptations exist',
      'I define fidelity differently depending on the context',
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
  M6_Q13: {
    text: 'During an argument, I become sarcastic, mock or roll my eyes.',
  },
  M6_Q14: {
    text: 'When I’m criticised, I justify myself or shift the blame instead of listening.',
  },
  M6_Q15: {
    text: 'During an argument, I shut down completely and stop responding.',
  },

  // ── Module 7 — Life trajectory & personality
  M7_Q01: {
    text: 'In five years, if everything goes as you wish, your life looks like:',
    options: [
      'Stable and settled — home, children, security',
      'Constantly progressing — career, projects, growth',
      'Adventurous and free — travel, discoveries',
      'Peaceful and deep — fewer things, but meaningful',
    ],
  },
  M7_Q02: {
    text: 'Your level of professional ambition:',
    options: [
      'High — I aim high and make sacrifices for it',
      'Moderate — I like to succeed without it taking everything',
      'Low — work-life balance comes before career',
      'Accomplished — I’m in a phase of passing things on',
    ],
  },
  M7_Q03: {
    text: 'You are rather:',
    options: [
      'Introverted — people tire me, I recharge alone',
      'Ambivert — I need both, depending on the moment',
      'Extroverted — people give me energy',
      'It depends entirely on the context',
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
  M7_Q09: { text: `${SEE_MYSELF} is outgoing and sociable.` },
  M7_Q10: { text: `${SEE_MYSELF} is rather reserved.` },
  M7_Q11: { text: `${SEE_MYSELF} is generally trusting and kind.` },
  M7_Q12: { text: `${SEE_MYSELF} tends to find fault with others.` },
  M7_Q13: { text: `${SEE_MYSELF} does things carefully and follows through.` },
  M7_Q14: { text: `${SEE_MYSELF} tends to put things off.` },
  M7_Q15: { text: `${SEE_MYSELF} gets stressed or worried easily.` },
  M7_Q16: {
    text: `${SEE_MYSELF} stays calm and relaxed when things get difficult.`,
  },
  M7_Q17: {
    text: `${SEE_MYSELF} has an active imagination and enjoys new ideas.`,
  },
  M7_Q18: {
    text: `${SEE_MYSELF} has little interest in art, culture or abstract ideas.`,
  },

  // ── Module 8 — Couple project
  M8_Q01: {
    text: 'Your main goal on BOLIGO:',
    options: [
      'Marriage — I’m looking for an official commitment',
      'A serious relationship with a shared life plan',
      'Getting to know myself before any commitment',
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
    ],
  },
  M8_Q04: {
    text: 'Your main love language:',
    options: [
      'Words of affirmation (I love you, compliments)',
      'Acts of service (helping, doing things for them)',
      'Gifts (giving and receiving)',
      'Quality time (being fully present)',
      'Physical touch (hugs, tender gestures)',
    ],
  },
  M8_Q05: {
    text: 'What would end a relationship for you, with no discussion possible:',
    options: [
      'Infidelity or a serious lie',
      'Violence or repeated disrespect',
      'Deep disagreement on children or religion',
      'Incompatible fundamental values',
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
  M8_Q08: {
    text: 'What you could never accept in a couple:',
    options: [
      'Repeated lying',
      'Infidelity in any form',
      'Disrespect towards my family',
      'The absence of a shared project',
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
  M8_Q11: {
    text: 'If your partner became seriously ill or lived with a disability, taking care of them would be:',
    options: [
      'Obvious — for better or for worse',
      'Natural, with outside help to last over time',
      'Frightening, but I would try',
      'I don’t know if I could do it',
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
    text: 'Do you keep a mental tally of what you give versus what you receive?',
    options: [
      'No — I give freely without counting',
      'Sometimes, especially when I feel short-changed',
      'Yes — I naturally watch the balance',
      'Yes — it’s a way of protecting myself',
    ],
  },
  M9_Q04: {
    text: 'When you feel frustrated in a relationship:',
    options: [
      'I express it clearly as soon as possible',
      'I wait for the right moment to talk about it',
      'I keep it to myself, hoping it will pass',
      'I let it build up until it explodes',
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
  M9_Q08: { text: 'I have never been jealous, not even a tiny bit.' },
  M9_Q09: { text: 'I have never told even the smallest lie.' },
  M9_Q10: {
    text: 'At the start of a relationship, I quickly tell the other person they are the love of my life.',
  },
  M9_Q11: {
    text: 'When I have doubts, I look at the other person’s phone or ask where they are.',
  },
  M9_Q12: {
    text: 'When a relationship no longer suits me, I would rather disappear than explain myself.',
  },
  M9_Q13: {
    text: 'I prefer not to define the relationship too early, to keep my options open.',
  },
  M9_Q14: {
    text: 'When I talk about my exes, it’s mostly to say what they did wrong.',
  },
  M9_Q15: { text: 'During time together, I check my phone.' },
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
  M10_Q01: {
    text: 'When you walk into a room, people tend to:',
    options: [
      'Notice you easily — you have a natural presence',
      'Notice you gradually as the conversation goes on',
      'Remember mostly what you said',
      'Find it hard to define you clearly afterwards',
    ],
  },
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
      'Someone warm, stable and reassuring',
      'Someone calm and composed who balances my energy',
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
  M10_Q06: {
    text: 'For you, attraction in a relationship comes mainly from:',
    options: [
      'Intellectual connection and stimulating conversations',
      'Closeness and shared laughter',
      'Physical presence and bodily energy',
      'The feeling of being deeply understood and accepted',
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
  M10_Q10: {
    text: 'If you had to sum up in one word the experience you want to offer your partner:',
    options: ['Security', 'Adventure', 'Depth', 'Joy'],
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
