# Base unique du Grand Entretien V8.2 (FR + EN, mêmes identifiants).
import json, os
V7 = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v7reuse_final.json')))

ITEMS = []

def add(id, m, typ, dim, fr, en, fro=None, eno=None, v7='—', v8='—', v81='—', status='Nouvelle', cond='Tous', opt=False, sens=False, rev=False, why='', layer=''):
    ITEMS.append(dict(id=id, m=m, type=typ, dim=dim, fr=fr, en=en, fro=fro or [], eno=eno or [],
                      v7=v7, v8=v8, v81=v81, status=status, cond=cond, opt=opt, sens=sens, rev=rev, why=why, layer=layer))

def reuse(id, m, typ, dim, v8='—', v81='—', cond='Tous', opt=False, sens=False, why='', layer='', addfr=None, adden=None, frtext=None, entext=None):
    q = V7[id]
    fro = list(q['fr']['options']) + (addfr or [])
    eno = list(q['en']['options']) + (adden or [])
    status = 'Identique V7 (réponse conservée)' if not addfr else 'V7 + option ajoutée (réponse conservée)'
    add(id, m, typ, dim, frtext or q['fr']['text'], entext or q['en']['text'], fro, eno, v7=id, v8=v8, v81=v81,
        status=status, cond=cond, opt=opt, sens=sens, why=why, layer=layer)

PNR_FR, PNR_EN = 'Je préfère ne pas répondre', 'I prefer not to answer'

# ───────────── Module 0 — Cadre de la rencontre, filtres et habitudes ─────────────
add('V82_M0_01', 0, 'N', 'Âge idéal (préférence)',
    "Quelle tranche d'âge vous attire le plus chez un(e) partenaire ?",
    'Which age range appeals to you most in a partner?',
    ['Âge minimum idéal (curseur)', 'Âge maximum idéal (curseur)'], ['Ideal minimum age (slider)', 'Ideal maximum age (slider)'],
    v7='M0_Q01 (remplace)', v8='GE8_M0_01', v81='GE8_M0_01', status='Nouvelle (réponse demandée)', layer='Préférence',
    why='Sépare la préférence (sert au classement) des limites réelles (servent au filtre). Préremplie à ±5 ans de l’âge du membre pour ne rien changer par défaut.')
add('V82_M0_02', 0, 'N', 'Âges acceptables (limite réelle)',
    'Et quels âges accepteriez-vous réellement, au-delà de cette tranche idéale ?',
    'And which ages would you genuinely accept, beyond that ideal range?',
    ['Âge minimum accepté (18 ans au moins)', 'Âge maximum accepté'], ['Minimum accepted age (18 or over)', 'Maximum accepted age'],
    v7='M0_Q01 (remplace)', v8='GE8_M0_01', v81='GE8_M0_01', status='Nouvelle (réponse demandée)', layer='Limite déclarée',
    why='Seule cette plage filtre, et dans les deux sens. Elle englobe la tranche idéale. Remplace les plafonds fixes de 5 et 10 ans de la V7.')
reuse('M0_Q02', 0, 'C', 'Périmètre géographique', v8='GE8_M0_02', v81='GE8_M0_02', layer='Limite déclarée',
      why='Filtre réciproque ; la proximité se lit par région, dans tous les pays (règle en service).')
reuse('M0_Q03', 0, 'C', 'Mobilité', v8='GE8_M0_03', v81='GE8_M0_03', layer='Flexibilité',
      why='Flexibilité face au lieu de vie : distingue la limite (« je reste où je suis ») de l’ouverture.')
reuse('M0_Q10', 0, 'M', 'Langues du quotidien', v8='GE8_M0_04', v81='GE8_M0_04', layer='Limite déclarée',
      why='Une langue commune est une condition pratique de la relation ; filtre réciproque.')
reuse('M0_Q04', 0, 'C', 'Situation actuelle', v8='GE8_M0_05', v81='GE8_M0_05', layer='Contexte',
      why='Disponibilité réelle ; « séparation en cours » ouvre une question du Sondeur, jamais une exclusion.')
add('V82_M0_03', 0, 'M', 'Enfants : situation actuelle',
    'Avez-vous des enfants ? Si oui, où vivent-ils le plus souvent ? (plusieurs réponses possibles)',
    'Do you have children? If so, where do they mostly live? (several answers possible)',
    ["Je n'ai pas d'enfant", 'Avec moi, la plupart du temps', 'En résidence alternée', 'Principalement chez leur autre parent', 'Ils sont majeurs ou autonomes'],
    ["I don't have children", 'With me, most of the time', 'Shared custody', "Mainly with their other parent", 'They are adults or independent'],
    v7='M0_Q05 (précise)', v8='GE8_M0_06', v81='GE8_M0_06', status='Nouvelle (réponse demandée)', layer='Contexte',
    why='La résidence des enfants change la vie quotidienne du couple et se compare à M0_Q14 du partenaire.')
reuse('M0_Q06', 0, 'C', 'Projet d’enfant', v8='GE8_M0_07', v81='GE8_M0_07', opt=True, layer='Préférence de vie',
      addfr=['E. ' + PNR_FR], adden=['E. ' + PNR_EN],
      why='Premier facteur d’incompatibilité de projet ; « Non, c’est définitif » face à « Oui, absolument » est une incompatibilité déclarée.')
reuse('M0_Q14', 0, 'C', 'Partenaire ayant des enfants', v8='GE8_M0_08', v81='GE8_M0_08', layer='Attente envers le partenaire',
      why='Se compare à la situation réelle de l’autre (V82_M0_03) : « Je ne pourrais pas l’accepter » + enfants = incompatibilité déclarée.')
reuse('M0_Q09', 0, 'C', 'Tabac : comportement', v81='GE8_M0_10', layer='Comportement',
      why='Fait personnel, comparé à la tolérance de l’autre. Aide affichée : « y compris vapotage et chicha ».')
reuse('M0_Q11', 0, 'C', 'Tabac : attente envers le partenaire', v81='GE8_M0_11', layer='Attente / flexibilité',
      addfr=["D. Acceptable s'il ne fume jamais à la maison ni près des enfants"], adden=['D. Acceptable if never at home or around children'],
      why='Distingue la limite absolue, la tolérance sous condition et l’indifférence.')
reuse('M0_Q12', 0, 'C', 'Alcool : comportement', v81='GE8_M0_12', layer='Comportement', why='Fait personnel, comparé à la tolérance de l’autre.')
reuse('M0_Q13', 0, 'C', 'Alcool : attente envers le partenaire', v81='GE8_M0_13', layer='Attente / flexibilité',
      addfr=["D. Acceptable avec modération, jamais d'ivresse"], adden=['D. Acceptable in moderation, never drunk'],
      why='L’option ajoutée sépare la consommation de l’ivresse, qui est la vraie source de conflit.')
reuse('M0_Q15', 0, 'C', 'Jeux d’argent : comportement', v81='GE8_M0_14', layer='Comportement',
      why='Risque financier réel pour un foyer ; fait comparé à la tolérance de l’autre.')
reuse('M0_Q16', 0, 'C', 'Jeux d’argent : attente envers le partenaire', v81='GE8_M0_15', layer='Attente / flexibilité', why='Limite, tolérance ou indifférence.')

# ───────────── Module 1 — Identité, convictions et traditions ─────────────
add('V82_M1_01', 1, 'M', 'Références culturelles',
    'Quelles cultures, langues familiales ou traditions comptent dans votre identité ? (deux au plus, facultatif)',
    'Which cultures, family languages or traditions matter in your identity? (two at most, optional)',
    ['Saisie libre guidée (pays, peuple, région, langue)', PNR_FR], ['Guided free entry (country, people, region, language)', PNR_EN],
    v7='M1_Q01 / M1_Q21', v8='GE8_M1_01', v81='GE8_M1_01', opt=True, sens=True, layer='Identité',
    why='Sert le portrait et le rapprochement culturel ; jamais un filtre (risque de discrimination).')
reuse('M1_Q16', 1, 'C', 'Religion ou conviction', opt=True, sens=True, layer='Identité',
      addfr=['L. Agnostique', 'M. Athée', 'N. ' + PNR_FR], adden=['L. Agnostic', 'M. Atheist', 'N. ' + PNR_EN],
      why='Réintroduit l’identification (demandée) : deux personnes pour qui la religion est essentielle peuvent ne pas partager la même. Agnostique et athée séparés de « sans religion ».')
add('V82_M1_02', 1, 'C', 'Place des convictions dans les choix de couple',
    'Vos convictions religieuses ou philosophiques guident-elles vos grandes décisions de couple ?',
    'Do your religious or philosophical beliefs guide your major decisions as a couple?',
    ['Oui, elles sont centrales et je souhaite qu’elles soient partagées', 'Oui, mais une différence reste compatible avec ma vision', 'Un peu, tant que le respect est mutuel', 'Non, pas vraiment', PNR_FR],
    ['Yes, they are central and I want them to be shared', 'Yes, but a difference remains compatible with my outlook', 'A little, as long as respect is mutual', 'No, not really', PNR_EN],
    v7='M1_Q15 (proche)', v8='GE8_M1_03', v81='GE8_M1_03', opt=True, sens=True, layer='Valeur',
    why='L’importance diffère de la pratique : on peut être très attaché à sa foi et peu pratiquant.')
reuse('M1_Q17', 1, 'C', 'Pratique religieuse', v81='GE8_M1_05', opt=True, sens=True, layer='Comportement',
      addfr=['E. ' + PNR_FR], adden=['E. ' + PNR_EN], cond='Si M1_Q16 ≠ sans religion, agnostique, athée',
      why='Rythme de vie concret (prière, jeûne, office) : source fréquente de friction au quotidien.')
reuse('M1_Q18', 1, 'C', 'Attente envers les convictions du partenaire', opt=True, sens=True, layer='Attente / flexibilité',
      why='Distingue l’exigence (A), la condition (B), le souhait (C), la coexistence (D) et l’ouverture personnelle (E).')
reuse('M1_Q19', 1, 'C', 'Règles alimentaires', opt=True, sens=True, layer='Comportement', addfr=['G. ' + PNR_FR], adden=['G. ' + PNR_EN],
      why='Halal, casher, végétarisme : contrainte quotidienne réelle du foyer commun (repas, courses, invitations).')
add('V82_M1_03', 1, 'C', 'Traditions dans le futur foyer',
    'Quelle place aimeriez-vous donner aux traditions de chacun dans votre futur foyer ?',
    'What place would you like each partner’s traditions to have in your future home?',
    ['Nous partagerions surtout les mêmes traditions', 'Nous construirions un équilibre entre nos deux cultures', 'Chacun pourrait garder ses propres pratiques', 'Nous déciderions au cas par cas', 'Je ne sais pas encore'],
    ['We would mostly share the same traditions', 'We would build a balance between our two cultures', 'Each of us could keep our own practices', 'We would decide case by case', "I don't know yet"],
    v7='M1_Q02 / M1_Q13', v8='GE8_M1_02', v81='GE8_M1_02', layer='Préférence de vie',
    why='Modèle d’intégration interculturelle du couple (assimilation, intégration, coexistence).')
add('V82_M1_04', 1, 'C', 'Autonomie face à la famille sur l’union',
    'Si vos familles désapprouvaient votre union pour des raisons culturelles ou religieuses, comment décideriez-vous ?',
    'If your families disapproved of your union for cultural or religious reasons, how would you decide?',
    ['Leur accord serait indispensable', 'Je chercherais une médiation avant de décider', 'Je les écouterais, puis nous déciderions à deux', 'Le choix du couple primerait, même sans leur accord'],
    ['Their approval would be essential', 'I would seek mediation before deciding', 'I would listen to them, then we would decide together', "Our choice as a couple would come first, even without their approval"],
    v7='M1_Q15', v8='GE8_M1_04', v81='GE8_M1_04', layer='Valeur',
    why='Mesure l’autonomie décisionnelle du couple face à la famille, très variable selon les cultures.')
reuse('M1_Q20', 1, 'C', 'Polygamie', opt=True, sens=True, layer='Limite déclarée', addfr=['E. ' + PNR_FR], adden=['E. ' + PNR_EN],
      why='Conservée : incompatibilité réelle et décisive dans plusieurs pays du public BOLIGO (légale au Sénégal, au Mali, au Cameroun… ; interdite en France). Formulation neutre, facultative ; A face à C = incompatibilité déclarée.')

# ───────────── Module 2 — Attachement, émotions et point de vue de l’autre ─────────────
M2 = [
 ('V82_M2_01','Attachement : anxiété',"Quand quelqu'un que j'aime répond beaucoup plus tard que d'habitude, je crains qu'il ou elle prenne ses distances.","When someone I love takes much longer than usual to reply, I worry they are pulling away.",False,'GE8_M2_01'),
 ('V82_M2_02','Attachement : anxiété',"J'ai besoin d'entendre régulièrement que je compte pour mon/ma partenaire.","I need to hear regularly that I matter to my partner.",False,'GE8_M2_02'),
 ('V82_M2_03','Attachement : anxiété',"Si mon/ma partenaire souhaite passer du temps sans moi, je le vis généralement avec sérénité.","If my partner wants to spend time without me, I usually feel at ease with it.",True,'GE8_M2_03'),
 ('V82_M2_04','Attachement : anxiété',"Après une petite tension, je me demande longtemps si la relation est menacée.","After a minor tension, I keep wondering for a long time whether the relationship is at risk.",False,'GE8_M2_04'),
 ('V82_M2_05','Attachement : évitement',"Quand une relation devient très intime émotionnellement, j'ai parfois besoin de m'éloigner.","When a relationship becomes very emotionally close, I sometimes need to step back.",False,'GE8_M2_07'),
 ('V82_M2_06','Attachement : évitement',"Parler d'une difficulté personnelle avec mon/ma partenaire m'est généralement naturel.","Talking about a personal difficulty with my partner usually comes naturally to me.",True,'GE8_M2_08'),
 ('V82_M2_07','Attachement : évitement',"Même quand j'ai besoin de soutien, je préfère ne compter que sur moi.","Even when I need support, I prefer to rely only on myself.",False,'GE8_M2_09'),
 ('V82_M2_08','Attachement : évitement',"J'accepte facilement que mon/ma partenaire prenne soin de moi quand je suis vulnérable.","I readily let my partner take care of me when I am vulnerable.",True,'GE8_M2_11'),
 ('V82_M2_09','Régulation : réévaluation',"Quand je reçois une remarque difficile, j'arrive à envisager d'autres explications que l'intention de me blesser.","When I receive a hard remark, I can consider explanations other than an intention to hurt me.",False,'GE8_M2_13'),
 ('V82_M2_10','Régulation : réévaluation',"Quand je me mets en colère, je peux reconsidérer la situation avant de répondre.","When I get angry, I can reconsider the situation before I respond.",False,'GE8_M2_15'),
 ('V82_M2_11','Régulation : suppression',"Quand je ressens de la tristesse, je fais souvent en sorte que personne ne la voie.","When I feel sad, I often make sure nobody sees it.",False,'GE8_M2_16'),
 ('V82_M2_12','Régulation : suppression',"Même bouleversé(e), je montre rarement mes émotions.","Even when I am upset, I rarely show my emotions.",False,'GE8_M2_17'),
 ('V82_M2_13','Point de vue de l’autre',"Même quand je ne partage pas l'avis de mon/ma partenaire, je peux imaginer pourquoi il ou elle le ressent ainsi.","Even when I don't share my partner's view, I can imagine why they feel that way.",False,'GE8_M2_20'),
 ('V82_M2_14','Point de vue de l’autre',"Quand j'interprète un silence comme un rejet, je peux remettre cette interprétation en question.","When I read a silence as rejection, I can question that interpretation.",False,'GE8_M2_22'),
]
for id, dim, fr, en, rev, v8 in M2:
    add(id, 2, 'L', dim, fr, en, v8=v8, v81=v8, rev=rev, layer='Besoin affectif / régulation',
        why={'Attachement : anxiété':'Dimension d’anxiété d’attachement (Brennan, Clark et Shaver, 1998 ; Wei et al., 2007) : besoin de réassurance, peur de l’éloignement.',
             'Attachement : évitement':'Dimension d’évitement (même modèle) : inconfort face à la proximité et à la dépendance.',
             'Régulation : réévaluation':'Réévaluation cognitive (Gross et John, 2003) : associée à de meilleures relations.',
             'Régulation : suppression':'Suppression expressive (Gross et John, 2003) : associée à moins de proximité perçue.',
             'Point de vue de l’autre':'Prise de perspective (Davis, 1983) : composante de l’empathie liée à la satisfaction conjugale.'}[dim])

# ───────────── Module 3 — Vécu relationnel ─────────────
add('V82_M3_01', 3, 'C', 'Dernière relation sérieuse', 'Quelle description correspond le mieux à votre dernière relation sérieuse ?',
    'Which description best fits your last serious relationship?',
    ["Je n'ai jamais vécu de relation sérieuse", 'La séparation est encore en cours', 'Elle s’est terminée il y a moins de six mois', 'Elle s’est terminée il y a plus de six mois', PNR_FR],
    ['I have never been in a serious relationship', 'The separation is still in progress', 'It ended less than six months ago', 'It ended more than six months ago', PNR_EN],
    v7='M3_Q11', v8='GE8_M3_01', v81='GE8_M3_01', opt=True, layer='Contexte', why='Disponibilité émotionnelle ; jamais un filtre.')
add('V82_M3_02', 3, 'C', 'Lien actuel avec l’ex', 'Aujourd’hui, quel lien gardez-vous avec votre dernier/dernière partenaire ?',
    'Today, what kind of contact do you keep with your last partner?',
    ['Aucun contact', 'Uniquement pour des responsabilités communes (enfants, logement)', 'Des relations cordiales, sans proximité', 'Une amitié ou une vraie proximité', PNR_FR],
    ['No contact', 'Only for shared responsibilities (children, housing)', 'Cordial relations, without closeness', 'A friendship or real closeness', PNR_EN],
    v7='M3_Q05', v8='GE8_M3_02', v81='GE8_M3_02', cond='Si V82_M3_01 ≠ « jamais »', opt=True, layer='Comportement',
    why='Frontières avec l’ex : sujet fréquent de jalousie ; comparé à M6_Q19 (« revoir un ex sans me le dire »).')
reuse('M3_Q12', 3, 'C', 'Conflits dans la famille d’origine', opt=True, layer='Contexte',
      why='Transmission des modèles de conflit (Amato, 1996) : éclaire le portrait sans jamais déterminer la personne ; nourrit le Sondeur (« d’où vient votre façon de vous disputer ? »).')

reuse('M3_Q04', 3, 'C', 'Rôle du beau-parent', cond='Si l’un a des enfants (V82_M0_03) ou accepte un partenaire avec enfants (M0_Q14 = A, B)', layer='Préférence de vie',
      why='Précise la famille recomposée (demandé) : attentes très différentes sur l’autorité du beau-parent, source majeure de conflit (Ganong et Coleman, 2004).')

# ───────────── Module 4 — Argent, responsabilités et tâches ─────────────
add('V82_M4_01', 4, 'C', 'Organisation financière du foyer', 'Pour les dépenses d’un foyer commun, quelle organisation vous semblerait la plus juste ?',
    'For the expenses of a shared home, which arrangement would seem fairest to you?',
    ['Un budget entièrement commun', 'Des contributions proportionnelles aux revenus', 'Un partage à parts égales des charges communes', 'Des finances séparées avec des accords ponctuels', 'Nous déciderions selon nos revenus et nos obligations'],
    ['A fully joint budget', 'Contributions in proportion to income', 'An equal split of shared costs', 'Separate finances with occasional agreements', 'We would decide according to our incomes and obligations'],
    v7='M4_Q01', v8='GE8_M4_01', v81='GE8_M4_01', layer='Préférence de vie', why='L’argent est l’un des premiers sujets de conflit conjugal (Dew, Britt et Huston, 2012).')
add('V82_M4_02', 4, 'C', 'Soutien en cas de perte d’emploi', 'Si votre partenaire perdait son emploi pendant plusieurs mois tout en cherchant activement, comment le vivriez-vous ?',
    'If your partner lost their job for several months while actively looking, how would you handle it?',
    ['Je l’accompagnerais sans fixer d’échéance', 'Nous établirions ensemble un plan et des limites tenables', 'J’aiderais un temps, avec un calendrier clair', 'Je ne pourrais pas envisager une dépendance financière prolongée'],
    ['I would support them with no deadline', 'We would set a plan and sustainable limits together', 'I would help for a while, with a clear timeline', 'I could not consider prolonged financial dependence'],
    v7='M4_Q11', v8='GE8_M4_03', v81='GE8_M4_03', layer='Flexibilité', why='Réciprocité et solidarité économique face à l’imprévu.')
reuse('M4_Q16', 4, 'C', 'Aide financière à la famille : principe', v8='GE8_M4_04', v81='GE8_M4_04', layer='Valeur',
      why='Solidarité familiale : différence majeure entre cultures ; « devoir non discutable » face à « jamais l’argent du foyer » = écart important.')
add('V82_M4_03', 4, 'C', 'Aide financière à la famille : situation actuelle', 'Aujourd’hui, aidez-vous financièrement des proches de façon régulière ?',
    'Today, do you regularly support relatives financially?',
    ['Non', 'Ponctuellement, en cas de besoin', 'Régulièrement, pour une petite part de mes revenus', 'Régulièrement, pour une part importante de mes revenus', PNR_FR],
    ['No', 'Occasionally, when needed', 'Regularly, a small share of my income', 'Regularly, a large share of my income', PNR_EN],
    opt=True, layer='Comportement', why='Distingue le fait (ce que je fais déjà) du principe (M4_Q16) : un engagement existant pèse sur le budget du couple.')
add('V82_M4_04', 4, 'C', 'Transparence financière', 'Si vous découvriez un crédit important de votre partenaire avant de vivre ensemble, quelle réaction serait la plus proche de la vôtre ?',
    'If you discovered your partner had a large loan before moving in together, which reaction would be closest to yours?',
    ['J’aurais besoin d’une transparence complète avant tout engagement', 'J’en parlerais pour comprendre son impact sur nos projets', 'Ce serait privé tant que le foyer n’est pas concerné', 'Je ne sais pas'],
    ['I would need full transparency before any commitment', 'I would talk about it to understand its impact on our plans', 'It would be private as long as our household is not affected', "I don't know"],
    v7='M4_Q09', v8='GE8_M4_05', v81='GE8_M4_05', layer='Attente envers le partenaire', why='Attentes de transparence : source fréquente de rupture de confiance.')
add('V82_M4_05', 4, 'C', 'Répartition des tâches', 'Si l’un de vous travaillait beaucoup plus que l’autre, comment répartiriez-vous les tâches de la maison ?',
    'If one of you worked many more hours than the other, how would you share household tasks?',
    ['Selon le temps disponible et la charge totale de chacun', 'À parts égales, quelles que soient les contraintes', 'Selon les goûts et les compétences, en réajustant', 'Selon des rôles d’homme et de femme définis à l’avance', 'Nous en reparlerions régulièrement'],
    ['According to each person’s available time and total load', 'Equally, whatever the constraints', 'According to preferences and skills, adjusting as we go', 'According to predefined roles for men and women', 'We would revisit it regularly'],
    v7='M4_Q03 / M4_Q04 / M4_Q15', v8='GE8_M4_06', v81='GE8_M4_06', layer='Valeur',
    why='Équité perçue du travail domestique, liée à la satisfaction ; l’option « rôles définis » répond au sujet non négociable J (M8_Q12).')
add('V82_M4_06', 4, 'C', 'Compromis matériel', 'Si un projet commun exigeait de réduire votre niveau de vie pendant un an, que feriez-vous le plus probablement ?',
    'If a shared project required lowering your standard of living for a year, what would you most likely do?',
    ['Je réduirais volontiers mon train de vie si nous sommes d’accord', 'J’accepterais avec un budget et une date pour refaire le point', 'Je préférerais reporter le projet pour garder notre stabilité', 'Je refuserais de baisser durablement mon niveau de vie'],
    ['I would gladly cut back if we agree', 'I would accept with a budget and a date to review', 'I would rather postpone the project to keep our stability', 'I would refuse to lower my standard of living for long'],
    v7='M4_Q12', v8='GE8_M4_07', v81='GE8_M4_07', layer='Flexibilité', why='Tolérance au sacrifice pour un projet commun (modèle de l’investissement, Rusbult et al., 1998).')
reuse('M4_Q17', 4, 'C', 'Dot ou compensation matrimoniale', opt=True, layer='Limite déclarée / valeur',
      addfr=['E. ' + PNR_FR], adden=['E. ' + PNR_EN],
      why='Question V7 reprise telle quelle (réponses conservées). La dot (compensation remise à la famille de l’épouse, Afrique de l’Ouest et centrale) est une coutume familiale ; elle est désormais séparée du Mahr, qui relève du droit religieux.')
add('V82_M4_08', 4, 'C', 'Mahr (mariage musulman)',
    'Le Mahr (don de l’époux à l’épouse, prévu par le mariage musulman) pour votre mariage :',
    'The Mahr (the gift from husband to wife required in an Islamic marriage) for your marriage:',
    ['Indispensable : notre mariage ne se fera pas sans Mahr', 'Important, avec une forme ou un montant décidés ensemble', 'Il ne fait pas partie de mes convictions, mais je le respecterais si mon/ma partenaire y tient', "Je n'y adhère pas, même si mon/ma partenaire y tient", PNR_FR],
    ['Essential: our marriage will not happen without a Mahr', 'Important, with a form or amount we decide together', "It is not part of my beliefs, but I would respect it if my partner cares about it", "I don't subscribe to it, even if my partner cares about it", PNR_EN],
    v7='M4_Q17 (séparée)', v8='—', v81='—', status='Nouvelle (réponse demandée)', opt=True, sens=True,
    cond='Si M1_Q16 = Musulmane, ou si M1_Q18 = C, D ou E (ouverture à un(e) partenaire d’une autre conviction)',
    layer='Limite déclarée / valeur',
    why='Le Mahr est une obligation du contrat de mariage en droit musulman, due à l’épouse ; la dot est une coutume due à la famille. Les fusionner rendait les anciennes réponses inutilisables (un membre opposé à la dot peut tenir au Mahr). Conditionnelle : affichée seulement aux personnes concernées ou ouvertes à un couple interreligieux.')

# ───────────── Module 5 — Famille et frontières ─────────────
add('V82_M5_01', 5, 'C', 'Protéger le partenaire', 'Un proche critique injustement votre partenaire devant vous. Que faites-vous le plus souvent ?',
    'A relative unfairly criticises your partner in front of you. What do you most often do?',
    ['J’interviens tout de suite pour poser une limite', 'Je soutiens mon/ma partenaire, puis je reparle au proche en privé', 'Je cherche d’abord à comprendre le contexte', 'Je laisse les personnes concernées régler cela'],
    ['I step in right away to set a boundary', 'I back my partner, then talk to the relative privately', 'I first try to understand the context', 'I let the people involved sort it out'],
    v7='M5_Q02', v8='GE8_M5_01', v81='GE8_M5_01', layer='Comportement', why='Loyauté envers le couple face à la famille.')
add('V82_M5_02', 5, 'C', 'Place des proches dans les décisions', 'Pour les grandes décisions du couple, quelle place devraient avoir les parents et les proches ?',
    'For major decisions as a couple, what role should parents and relatives play?',
    ['Leur accord est nécessaire', 'Leur avis compte, mais nous décidons à deux', 'Nous les informons une fois la décision prise', 'Nous décidons sans intervention familiale'],
    ['Their approval is necessary', 'Their opinion matters, but we decide together', 'We inform them once the decision is made', 'We decide without family involvement'],
    v7='M5_Q01', v8='GE8_M5_02', v81='GE8_M5_02', layer='Valeur', why='Frontières familiales (différenciation du couple).')
add('V82_M5_03', 5, 'C', 'Accueillir un proche', 'Si un membre de votre famille souhaitait vivre plusieurs mois chez vous, comment réagiriez-vous ?',
    'If a family member wanted to live with you for several months, how would you react?',
    ['Je l’accueillerais naturellement, même sans date de fin', 'Je voudrais fixer à deux une durée et des règles', 'J’accepterais seulement en situation exceptionnelle', 'Je ne souhaite pas de cohabitation prolongée'],
    ['I would welcome them naturally, even with no end date', 'I would want us to agree on a length of stay and rules', 'I would agree only in an exceptional situation', "I don't want a long-term cohabitation"],
    v7='M5_Q03', v8='GE8_M5_03', v81='GE8_M5_03', layer='Préférence de vie', why='Aucun scénario présupposé : le refus est une réponse comme les autres.')
add('V82_M5_04', 5, 'C', 'Conflit de loyautés', 'Quand une obligation familiale entre en conflit avec un engagement pris envers votre partenaire, que faites-vous ?',
    'When a family obligation clashes with a commitment you made to your partner, what do you do?',
    ['Je privilégie presque toujours ma famille', 'J’explique les contraintes et je cherche une solution équilibrée', 'Je privilégie l’engagement pris envers mon/ma partenaire', 'Cela dépend de la gravité de chaque demande'],
    ['I almost always put my family first', 'I explain the constraints and look for a balanced solution', 'I keep the commitment I made to my partner', 'It depends on how serious each request is'],
    v7='M5_Q10', v8='GE8_M5_04', v81='GE8_M5_04', layer='Comportement', why='Arbitrage des loyautés : prédit les tensions avec la belle-famille.')

# ───────────── Module 6 — Communication et conflits ─────────────
M6 = [
 ('V82_M6_01','Critique globale',"Dans une dispute, je reproche à l'autre ce qu'il ou elle est, plutôt qu'un fait précis.","In an argument, I criticise who the other person is rather than a specific behaviour.",'GE8_M6_01','M6_Q12'),
 ('V82_M6_02','Expression sans accusation',"Quand je suis contrarié(e), je dis ce que j'ai ressenti sans attaquer l'autre.","When I am upset, I say what I felt without attacking the other person.",'GE8_M6_02','M6_Q20'),
 ('V82_M6_03','Mépris / ironie',"Quand je me sens blessé(e), il m'arrive d'être ironique ou moqueur(se).","When I feel hurt, I sometimes become sarcastic or mocking.",'GE8_M6_03','M6_Q13'),
 ('V82_M6_04','Reconnaissance malgré le conflit',"Pendant un désaccord, je reste capable de reconnaître un effort de mon/ma partenaire.","During a disagreement, I can still acknowledge my partner's efforts.",'GE8_M6_04','M6_Q21'),
 ('V82_M6_05','Défensivité',"Quand on me reproche quelque chose, mon premier réflexe est de me justifier.","When I am criticised, my first reflex is to justify myself.",'GE8_M6_05','M6_Q14'),
 ('V82_M6_06','Pause constructive',"Quand l'échange devient trop intense, je préviens que j'ai besoin d'une pause et je propose d'y revenir.","When things get too heated, I say I need a break and suggest coming back to it.",'GE8_M6_06','M6_Q16'),
 ('V82_M6_07','Retrait sans retour',"Pendant une tension, il m'arrive d'arrêter de répondre sans dire quand nous en reparlerons.","During tension, I sometimes stop responding without saying when we will talk again.",'GE8_M6_07','M6_Q15'),
 ('V82_M6_08','Réparation',"Après une dispute, je reviens sur le sujet pour vérifier que chacun s'est senti entendu.","After an argument, I come back to it to check that we both felt heard.",'GE8_M6_08','M6_Q11'),
]
for id, dim, fr, en, v8, v7 in M6:
    add(id, 6, 'F', dim, fr, en, v7=v7, v8=v8, v81=v8, layer='Comportement déclaré',
        why='Gottman (1994) ; Gottman et Levenson (2000) : critique, mépris, défensivité et retrait prédisent la détérioration des couples ; expression douce, reconnaissance et réparation les protègent. Chaque comportement négatif a sa contrepartie positive.')
add('V82_M6_09', 6, 'C', 'Respect d’une pause demandée', 'Votre partenaire veut interrompre une discussion difficile pour la reprendre demain. Comment réagissez-vous ?',
    'Your partner wants to stop a difficult discussion and pick it up tomorrow. How do you react?',
    ['J’accepte et nous fixons un moment pour reprendre', 'J’accepte, mais j’ai besoin d’un signe qui me rassure', 'Je suis frustré(e) et je voudrais conclure maintenant', 'Je continue la discussion malgré sa demande'],
    ['I agree and we set a time to resume', 'I agree, but I need a reassuring sign', 'I feel frustrated and would like to settle it now', 'I keep going despite their request'],
    v7='M6_Q17', v8='GE8_M6_09', v81='GE8_M6_09', layer='Comportement déclaré',
    why='Distingue le besoin de réassurance (B, attachement) du non-respect d’une limite (D).')
reuse('M6_Q05', 6, 'C', 'Limite : mots blessants', layer='Limite déclarée',
      why='Limite déclarée sur les insultes, comparée au comportement de l’autre (V82_M6_03). Remplace la question V8 « rien ne justifie la violence », à réponse évidente.')
reuse('M6_Q04', 6, 'C', 'Limite : violence physique (sécurité)', layer='Sécurité (hors score)',
      why='Rétablie par rapport à la V8.2 initiale : le dispositif de sécurité en service la lit (questions de limite du Sondeur, règle de vigilance avec M6_Q24). Les réponses C et D ne sont pas « évidentes » : elles indiquent qu’une violence n’est pas exclue d’emblée. Jamais dans un score ni affichée à l’autre.')
reuse('M6_Q24', 6, 'L', 'Attitude envers la violence (sécurité)', opt=False, sens=False, layer='Sécurité (hors score)',
      why='Conservée, contrairement à la V8 : un accord (D, E) n’est pas une réponse évidente, il signale une attitude qui justifie la violence, facteur de risque reconnu. Utilisée uniquement par le dispositif de sécurité existant (questions de limite du Sondeur, signalement, modération), jamais dans un score ni affichée à l’autre.')

# ───────────── Module 7 — Personnalité (Mini-IPIP, domaine public) ─────────────
M7 = [
 ('V82_M7_01','Extraversion',"Je mets l'ambiance dans les soirées.","I am the life of the party.",False),
 ('V82_M7_02','Agréabilité',"Je compatis à ce que ressentent les autres.","I sympathize with others' feelings.",False),
 ('V82_M7_03','Conscienciosité',"Je fais les corvées tout de suite.","I get chores done right away.",False),
 ('V82_M7_04','Stabilité émotionnelle',"J'ai souvent des sautes d'humeur.","I have frequent mood swings.",True),
 ('V82_M7_05','Ouverture (imagination)',"J'ai une imagination fertile.","I have a vivid imagination.",False),
 ('V82_M7_06','Extraversion',"Je parle peu.","I don't talk a lot.",True),
 ('V82_M7_07','Agréabilité',"Les problèmes des autres ne m'intéressent pas.","I am not interested in other people's problems.",True),
 ('V82_M7_08','Conscienciosité',"J'oublie souvent de ranger les choses à leur place.","I often forget to put things back in their proper place.",True),
 ('V82_M7_09','Stabilité émotionnelle',"Je suis détendu(e) la plupart du temps.","I am relaxed most of the time.",False),
 ('V82_M7_10','Ouverture (imagination)',"Les idées abstraites ne m'intéressent pas.","I am not interested in abstract ideas.",True),
 ('V82_M7_11','Extraversion',"Dans une soirée, je parle avec beaucoup de personnes différentes.","I talk to a lot of different people at parties.",False),
 ('V82_M7_12','Agréabilité',"Je ressens les émotions des autres.","I feel others' emotions.",False),
 ('V82_M7_13','Conscienciosité',"J'aime l'ordre.","I like order.",False),
 ('V82_M7_14','Stabilité émotionnelle',"Je suis facilement contrarié(e).","I get upset easily.",True),
 ('V82_M7_15','Ouverture (imagination)',"J'ai du mal à comprendre les idées abstraites.","I have difficulty understanding abstract ideas.",True),
 ('V82_M7_16','Extraversion',"Je reste en retrait.","I keep in the background.",True),
 ('V82_M7_17','Agréabilité',"Les autres ne m'intéressent pas vraiment.","I am not really interested in others.",True),
 ('V82_M7_18','Conscienciosité',"Je mets le désordre dans mes affaires.","I make a mess of things.",True),
 ('V82_M7_19','Stabilité émotionnelle',"J'ai rarement le cafard.","I seldom feel blue.",False),
 ('V82_M7_20','Ouverture (imagination)',"Je n'ai pas beaucoup d'imagination.","I do not have a good imagination.",True),
]
for id, dim, fr, en, rev in M7:
    add(id, 7, 'X', 'Big Five — ' + dim, fr, en, v8='GE8_M7 (remplace)', v81='GE8_M7 (remplace)', rev=rev, layer='Trait de personnalité',
        why='Item du Mini-IPIP (Donnellan et al., 2006), issu de l’IPIP (domaine public, usage commercial libre). Version française BOLIGO, non validée : à tester avant tout affichage de score.')

# ───────────── Module 8 — Projet de couple, engagement et fidélité ─────────────
add('V82_M8_01', 8, 'C', 'Intention relationnelle', 'Que recherchez-vous aujourd’hui dans une rencontre ?', 'What are you looking for in a relationship today?',
    ['Un mariage ou un engagement officiel', 'Une relation durable avec un projet commun', 'Une relation sérieuse, à construire pas à pas', 'Découvrir, sans décider tout de suite de la forme'],
    ['A marriage or an official commitment', 'A lasting relationship with a shared project', 'A serious relationship, built step by step', 'To get to know someone, without deciding the form right away'],
    v7='M8_Q01', v8='GE8_M8_01', v81='GE8_M8_01', layer='Préférence de vie', why='Alignement des intentions : premier sujet de malentendu des premières semaines.')
add('V82_M8_02', 8, 'C', 'Horizon d’engagement', 'Si la relation se construit bien, à quel horizon souhaiteriez-vous un engagement officiel ?',
    'If the relationship goes well, when would you like an official commitment?',
    ['Dans l’année', 'D’ici un à deux ans', 'Dans plus de deux ans', 'Pas forcément d’engagement officiel', 'Je ne sais pas encore'],
    ['Within a year', 'Within one to two years', 'In more than two years', 'Not necessarily an official commitment', "I don't know yet"],
    v7='M8_Q17', v8='GE8_M8_02', v81='GE8_M8_02', cond='Si V82_M8_01 = A, B ou C', layer='Préférence de vie', why='Rythme d’engagement : écart fréquent et douloureux.')
reuse('M8_Q16', 8, 'M', 'Forme du mariage', v8='GE8_M8_03', v81='GE8_M8_03', sens=True, layer='Préférence de vie',
      why='Civil, religieux, coutumier : se compare au partenaire (un mariage religieux indispensable pour l’un, aucun pour l’autre).')
reuse('M8_Q19', 8, 'C', 'Vivre ensemble avant le mariage', v8='GE8_M8_04', v81='GE8_M8_04', layer='Limite déclarée',
      why='« Exclu » face à « souhaitable » : écart majeur de projet.')
add('V82_M8_03', 8, 'C', 'Cadre d’exclusivité', 'Quel cadre d’exclusivité recherchez-vous dans une relation durable ?',
    'What kind of exclusivity are you looking for in a lasting relationship?',
    ['Une exclusivité affective et sexuelle réciproque', 'Une exclusivité, avec des limites à définir ensemble', 'Je suis ouvert(e) à d’autres formes de relation, avec le consentement de chacun', 'Je ne sais pas encore', PNR_FR],
    ['Mutual emotional and sexual exclusivity', 'Exclusivity, with limits to define together', "I am open to other forms of relationship, with everyone's consent", "I don't know yet", PNR_EN],
    v7='M1_Q20 / M6_Q19', v8='GE8_M8_05', v81='GE8_M8_05', opt=True, sens=True, layer='Limite déclarée',
    why='A face à C = incompatibilité déclarée. La polygamie reste une question distincte (M1_Q20) car elle relève d’un cadre religieux ou coutumier.')
reuse('M6_Q19', 8, 'M', 'Ce qui compte comme infidélité', opt=True, sens=True, layer='Attente envers le partenaire',
      why='Précise la fidélité : deux personnes « fidèles » peuvent tracer la limite à des endroits très différents (messages, applications, contenus adultes).')
add('V82_M8_04', 8, 'C', 'Style éducatif', 'Si vous élevez des enfants, quelle approche vous paraît la plus juste ?', 'If you raise children, which approach seems fairest to you?',
    ['Un cadre ferme, expliqué et constant', 'Beaucoup de dialogue, avec des règles adaptées à l’âge', 'Une large autonomie dans un cadre de sécurité', 'Je déciderais selon l’enfant et avec l’autre parent', PNR_FR],
    ['A firm, explained and consistent framework', 'Lots of dialogue, with age-appropriate rules', 'Broad autonomy within a safe framework', 'I would decide according to the child and with the other parent', PNR_EN],
    v7='M8_Q15', v8='GE8_M8_06', v81='GE8_M8_06', cond='Si enfants (V82_M0_03) ou projet d’enfant (M0_Q06 = A, B, C)', opt=True, layer='Valeur', why='Désaccords éducatifs : source majeure de conflit des couples parents.')
reuse('M8_Q18', 8, 'C', 'Religion des enfants', cond='Si enfants ou projet d’enfant, et M1_Q16 renseignée', opt=True, sens=True, layer='Limite déclarée',
      why='« Dans ma religion, c’est indispensable » face à « sans éducation religieuse » = écart majeur.')
reuse('M8_Q20', 8, 'C', 'Châtiment corporel des enfants', cond='Si enfants ou projet d’enfant', opt=True, layer='Valeur',
      why='Désaccord éducatif majeur (A face à D) ; la recherche associe la fessée à des effets négatifs (Gershoff et Grogan-Kaylor, 2016). Option D formulée par le membre, jamais par BOLIGO.')
add('V82_M8_05', 8, 'C', 'Trajectoire géographique', 'Si l’un de vous voulait s’installer durablement dans un autre pays, quelle serait votre position ?',
    'If one of you wanted to settle permanently in another country, what would your position be?',
    ['Je suis ouvert(e) à construire ce projet', 'Je pourrais accepter avec des garanties concrètes', 'Je souhaite rester durablement dans mon pays actuel', 'Je ne sais pas encore'],
    ['I am open to building that plan', 'I could accept it with concrete guarantees', 'I want to stay in my current country for the long term', "I don't know yet"],
    v7='M7_Q07 / M7_Q36', v8='GE8_M8_07', v81='GE8_M8_07', layer='Flexibilité', why='Projets personnels et lieu de vie à long terme ; complète la mobilité (M0_Q03).')
reuse('M8_Q10', 8, 'M', 'Signaux qui feraient fuir', layer='Limite déclarée',
      why='Limites déclarées envers le comportement d’un partenaire (contrôle, disparitions, non-respect d’un « non ») : comparées aux comportements déclarés de l’autre (M9).')
reuse('M8_Q12', 8, 'M', 'Sujets non négociables', v8='GE8_M0_09', v81='GE8_M0_09', layer='Priorités déclarées',
      why='Ne crée jamais seul une exclusion : rend plus grave l’écart sur le thème coché (règle en service).')

# ───────────── Module 9 — Réciprocité, autonomie et limites ─────────────
add('V82_M9_01', 9, 'C', 'Partage du pouvoir de décision', 'Pour une décision importante sur laquelle vous n’êtes pas d’accord, quel fonctionnement préférez-vous ?',
    'For an important decision you disagree on, how do you prefer to proceed?',
    ['Chercher un accord qui convient aux deux', 'Laisser décider la personne la plus concernée', 'L’un tranche après avoir écouté l’autre', 'Reporter la décision jusqu’à trouver un compromis'],
    ['Look for an agreement that suits us both', 'Let the person most concerned decide', 'One of us decides after hearing the other', 'Postpone until we find a compromise'],
    v7='M9_Q01', v8='GE8_M9_01', v81='GE8_M9_01', layer='Valeur', why='Partage du pouvoir (Gottman : accepter l’influence de l’autre).')
add('V82_M9_02', 9, 'L', 'Exprimer ses besoins', "J'arrive à demander clairement ce dont j'ai besoin, sans attendre que l'autre le devine.",
    "I can ask clearly for what I need, without waiting for the other person to guess.", v7='M9_Q17', v8='GE8_M9_03', v81='GE8_M9_03',
    layer='Comportement déclaré', why='Expression explicite des besoins : protège contre la rancœur silencieuse.')
reuse('M9_Q16', 9, 'F', 'Retrait protestataire', v8='GE8_M9_04', v81='GE8_M9_04', layer='Comportement déclaré',
      why='Bouderie et froideur : forme passive de pression, distincte du besoin de pause.')
add('V82_M9_03', 9, 'L', 'Autonomie du partenaire', "Un(e) partenaire doit pouvoir garder ses activités, ses amitiés et du temps à soi sans demander la permission.",
    "A partner should be able to keep their activities, friendships and time alone without asking for permission.",
    v7='M9_Q26 / M9_Q27', v8='GE8_M9_06', v81='GE8_M9_06', layer='Valeur', why='Respect de l’autonomie : opposé conceptuel du contrôle.')
reuse('M5_Q08', 9, 'C', 'Téléphone : attente de transparence', layer='Préférence',
      why='Préférence déclarée sur l’accès au téléphone, à ne pas confondre avec le comportement (V82_M9_06).')
add('V82_M9_05', 9, 'C', 'Localisation partagée : préférence', 'Partager sa localisation en temps réel dans un couple :',
    'Sharing your real-time location as a couple:',
    ['Je le souhaite, si nous le décidons tous les deux', 'Seulement ponctuellement (un trajet, un voyage)', 'Je préfère ne pas le faire, sauf urgence', 'Cela m’est égal'],
    ['I would like it, if we both decide so', 'Only occasionally (a journey, a trip)', 'I prefer not to, except in an emergency', "I don't mind"],
    layer='Préférence', why='Préférence légitime, distincte du fait d’exiger la localisation de l’autre (V82_M9_07).')
add('V82_M9_06', 9, 'F', 'Contrôle : téléphone', "Dans mes relations passées, il m'est arrivé de consulter le téléphone d'un(e) partenaire sans son accord.",
    "In past relationships, I have looked at a partner's phone without their consent.", v7='M9_Q11 (séparée)', v81='GE8_M6_13',
    cond='Si relation passée (V82_M3_01 ≠ « jamais »)', opt=True, layer='Comportement déclaré',
    why='Comportement précis, séparé de la demande de nouvelles. Option « Non applicable ». Jamais d’étiquette : sert au portrait (avec tact) et à la comparaison avec les limites de l’autre (M8_Q10 B, I).')
add('V82_M9_07', 9, 'F', 'Contrôle : localisation', "Il m'est arrivé de demander à un(e) partenaire de partager sa localisation alors qu'il ou elle ne le souhaitait pas.",
    "I have asked a partner to share their location when they did not want to.", v7='M9_Q11 (séparée)', v81='GE8_M6_13',
    cond='Si relation passée', opt=True, layer='Comportement déclaré', why='Exiger la localisation, distinct de la préférence partagée (V82_M9_05).')
reuse('M9_Q24', 9, 'F', 'Insistance après un refus', cond='Tous (option « Non applicable » proposée)', layer='Comportement déclaré',
      why='Insister jusqu’à ce que l’autre cède : non-respect d’un refus, cœur du contrôle coercitif (Stark, 2007). Jamais un diagnostic.')

# ───────────── Module 10 — Connexion, affection et intimité ─────────────
add('V82_M10_01', 10, 'C', 'Ce qui crée la proximité', 'Qu’est-ce qui vous fait le plus souvent sentir une proximité naissante avec quelqu’un ?',
    'What most often makes you feel a budding closeness with someone?',
    ['Une conversation profonde et sincère', 'Des échanges légers, avec beaucoup d’humour', 'Une présence calme et une écoute attentive', 'Des gestes concrets et des attentions', 'Je ne peux pas le savoir avant la rencontre'],
    ['A deep and sincere conversation', 'Light exchanges, with plenty of humour', 'A calm presence and attentive listening', 'Concrete gestures and thoughtfulness', "I can't tell before meeting"],
    v7='M10_Q03 / M10_Q13', v8='GE8_M10_01', v81='GE8_M10_01', layer='Besoin affectif', why='Déclencheurs de connexion : au cœur d’une rencontre sans photo.')
add('V82_M10_02', 10, 'C', 'Rythme de découverte sans photo', 'Dans une relation qui commence sans photo, quel rythme de découverte vous met le plus à l’aise ?',
    'In a relationship that starts without photos, which pace of discovery makes you most comfortable?',
    ['Des échanges écrits d’abord, puis une conversation à voix haute', 'Une conversation à voix haute assez vite', 'Une découverte progressive, sans calendrier', 'Je préfère en convenir avec la personne'],
    ['Written exchanges first, then a spoken conversation', 'A spoken conversation fairly soon', 'Gradual discovery, with no timetable', 'I prefer to agree on it with the person'],
    v8='GE8_M10_02', v81='GE8_M10_02', layer='Préférence', why='Propre au concept BOLIGO : rythme d’intimité conversationnelle.')
add('V82_M10_04', 10, 'C', 'Place de l’intimité physique', 'Pour vous, quelle place l’intimité physique devrait-elle avoir dans un couple durable ?',
    'For you, what place should physical intimacy have in a lasting relationship?',
    ['Une place centrale', 'Une place importante parmi d’autres', 'Une place plutôt secondaire', 'Je préfère en convenir avec la personne', PNR_FR],
    ['A central place', 'An important place among others', 'A rather secondary place', 'I prefer to agree on it with the person', PNR_EN],
    v7='M10_Q16', v8='GE8_M10_04', v81='GE8_M10_04', opt=True, sens=True, layer='Besoin affectif', why='Écart d’attentes d’intimité : à explorer avec tact, jamais exposé tel quel.')
reuse('M10_Q17', 10, 'C', 'Intimité avant le mariage', v81='GE8_M10_05', opt=True, sens=True, layer='Limite déclarée',
      addfr=['E. ' + PNR_FR], adden=['E. ' + PNR_EN], why='« J’attends le mariage » face à « possible sans engagement » : écart décisif pour une partie du public.')
reuse('M10_Q19', 10, 'C', 'Dire non à l’intimité', opt=True, sens=True, layer='Comportement déclaré', addfr=['E. ' + PNR_FR], adden=['E. ' + PNR_EN],
      why='Capacité à poser ses propres limites (B et C signalent une difficulté à refuser, abordée avec bienveillance, jamais exposée à l’autre).')

assert len({i['id'] for i in ITEMS}) == len(ITEMS)
