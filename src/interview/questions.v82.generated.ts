/* eslint-disable */
// Fichier GÉNÉRÉ par docs/questionnaire/V8_2_FINAL/preuves/export_app.py
// à partir du modèle V8.2 validé (model.py). Ne pas modifier à la main.
import type { V82QuestionData, V82Translation } from './questions.v82';

export const V82_BASE: V82QuestionData[] = [
 {
  "id": "V82_M0_01",
  "moduleNumber": 0,
  "text": "Quelle tranche d'âge vous attire le plus chez un(e) partenaire ?",
  "options": [],
  "input": "ageRange",
  "session": 1
 },
 {
  "id": "V82_M0_02",
  "moduleNumber": 0,
  "text": "Et quels âges accepteriez-vous réellement, au-delà de cette tranche idéale ?",
  "options": [],
  "input": "ageRange",
  "session": 1
 },
 {
  "id": "M0_Q02",
  "moduleNumber": 0,
  "text": "Le périmètre géographique de vos rencontres :",
  "options": [
   {
    "key": "A",
    "text": "Près de chez moi (ma ville et ma région)"
   },
   {
    "key": "B",
    "text": "Même région"
   },
   {
    "key": "C",
    "text": "Tout mon pays (National)"
   },
   {
    "key": "D",
    "text": "International (Sans frontières)"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q03",
  "moduleNumber": 0,
  "text": "Êtes-vous prêt(e) à déménager pour votre partenaire ?",
  "options": [
   {
    "key": "A",
    "text": "Oui, sans condition"
   },
   {
    "key": "B",
    "text": "Oui, si le projet de vie est solide"
   },
   {
    "key": "C",
    "text": "Cela dépend de la distance"
   },
   {
    "key": "D",
    "text": "Non, je reste où je suis"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q10",
  "moduleNumber": 0,
  "text": "Dans quelles langues êtes-vous à l'aise pour vivre une relation au quotidien ? (plusieurs réponses possibles)",
  "options": [
   {
    "key": "A",
    "text": "Français"
   },
   {
    "key": "B",
    "text": "Anglais — English"
   },
   {
    "key": "C",
    "text": "Arabe — العربية"
   },
   {
    "key": "D",
    "text": "Lingala"
   },
   {
    "key": "E",
    "text": "Kiswahili"
   },
   {
    "key": "F",
    "text": "Wolof"
   },
   {
    "key": "G",
    "text": "Portugais — Português"
   },
   {
    "key": "H",
    "text": "Espagnol — Español"
   },
   {
    "key": "J",
    "text": "Créole — Kreyòl"
   },
   {
    "key": "I",
    "text": "Une autre langue (précisez)",
    "freeText": true
   }
  ],
  "multiple": true,
  "session": 1
 },
 {
  "id": "M0_Q04",
  "moduleNumber": 0,
  "text": "Votre situation actuelle :",
  "options": [
   {
    "key": "A",
    "text": "Célibataire"
   },
   {
    "key": "B",
    "text": "Séparé(e) / divorcé(e)"
   },
   {
    "key": "C",
    "text": "Veuf / Veuve"
   },
   {
    "key": "D",
    "text": "En transition : séparation ou divorce pas encore terminé"
   }
  ],
  "session": 1
 },
 {
  "id": "V82_M0_03",
  "moduleNumber": 0,
  "text": "Avez-vous des enfants ? Si oui, où vivent-ils le plus souvent ? (plusieurs réponses possibles)",
  "options": [
   {
    "key": "A",
    "text": "Je n'ai pas d'enfant",
    "exclusive": true
   },
   {
    "key": "B",
    "text": "Avec moi, la plupart du temps"
   },
   {
    "key": "C",
    "text": "En résidence alternée"
   },
   {
    "key": "D",
    "text": "Principalement chez leur autre parent"
   },
   {
    "key": "E",
    "text": "Ils sont majeurs ou autonomes"
   }
  ],
  "multiple": true,
  "session": 1
 },
 {
  "id": "M0_Q06",
  "moduleNumber": 0,
  "text": "Souhaitez-vous avoir des enfants (ou d'autres enfants) à l'avenir ?",
  "options": [
   {
    "key": "A",
    "text": "Oui, absolument"
   },
   {
    "key": "B",
    "text": "Oui, si les conditions sont réunies"
   },
   {
    "key": "C",
    "text": "Je ne suis pas certain(e)"
   },
   {
    "key": "D",
    "text": "Non, c'est définitif"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "M0_Q14",
  "moduleNumber": 0,
  "text": "Un(e) partenaire qui a déjà des enfants :",
  "options": [
   {
    "key": "A",
    "text": "Cela me convient tout à fait"
   },
   {
    "key": "B",
    "text": "Cela me convient, s'ils ne vivent pas avec nous à plein temps"
   },
   {
    "key": "C",
    "text": "Je préférerais l'éviter"
   },
   {
    "key": "D",
    "text": "Je ne pourrais pas l'accepter"
   }
  ],
  "session": 1
 },
 {
  "id": "M3_Q04",
  "moduleNumber": 3,
  "text": "Dans une famille recomposée, la place du beau-parent auprès des enfants de l'autre :",
  "options": [
   {
    "key": "A",
    "text": "Un parent à part entière, sans distinction entre les enfants"
   },
   {
    "key": "B",
    "text": "Une place affectueuse, chaque parent gardant son rôle auprès de ses enfants"
   },
   {
    "key": "C",
    "text": "Une présence bienveillante, sans autorité parentale directe"
   },
   {
    "key": "D",
    "text": "Une place qui se construit avec le temps et la confiance"
   }
  ],
  "rules": {
   "dependsOn": [
    {
     "questionId": "V82_M0_03",
     "values": [
      "B",
      "C",
      "D",
      "E"
     ]
    },
    {
     "questionId": "M0_Q14",
     "values": [
      "A",
      "B",
      "C"
     ]
    }
   ]
  },
  "session": 1
 },
 {
  "id": "V82_M8_01",
  "moduleNumber": 8,
  "text": "Que recherchez-vous aujourd’hui dans une rencontre ?",
  "options": [
   {
    "key": "A",
    "text": "Un mariage ou un engagement officiel"
   },
   {
    "key": "B",
    "text": "Une relation durable avec un projet commun"
   },
   {
    "key": "C",
    "text": "Une relation sérieuse, à construire pas à pas"
   },
   {
    "key": "D",
    "text": "Découvrir, sans décider tout de suite de la forme"
   }
  ],
  "session": 1
 },
 {
  "id": "V82_M8_02",
  "moduleNumber": 8,
  "text": "Si la relation se construit bien, à quel horizon souhaiteriez-vous un engagement officiel ?",
  "options": [
   {
    "key": "A",
    "text": "Dans l’année"
   },
   {
    "key": "B",
    "text": "D’ici un à deux ans"
   },
   {
    "key": "C",
    "text": "Dans plus de deux ans"
   },
   {
    "key": "D",
    "text": "Pas forcément d’engagement officiel"
   },
   {
    "key": "E",
    "text": "Je ne sais pas encore"
   }
  ],
  "rules": {
   "dependsOn": {
    "questionId": "V82_M8_01",
    "values": [
     "A",
     "B",
     "C"
    ]
   }
  },
  "session": 1
 },
 {
  "id": "M8_Q16",
  "moduleNumber": 8,
  "text": "Pour vous, un mariage n'est accompli qu'avec : (plusieurs réponses possibles)",
  "options": [
   {
    "key": "A",
    "text": "Le mariage civil"
   },
   {
    "key": "B",
    "text": "Le mariage religieux"
   },
   {
    "key": "C",
    "text": "Le mariage coutumier (dot, présentation des familles)"
   },
   {
    "key": "D",
    "text": "Aucune cérémonie n'est indispensable pour moi",
    "exclusive": true
   }
  ],
  "multiple": true,
  "session": 1
 },
 {
  "id": "M8_Q19",
  "moduleNumber": 8,
  "text": "Vivre ensemble avant le mariage :",
  "options": [
   {
    "key": "A",
    "text": "Exclu pour moi"
   },
   {
    "key": "B",
    "text": "Seulement après les fiançailles"
   },
   {
    "key": "C",
    "text": "Possible quand la relation est solide"
   },
   {
    "key": "D",
    "text": "Souhaitable, pour bien se connaître"
   }
  ],
  "session": 1
 },
 {
  "id": "V82_M8_05",
  "moduleNumber": 8,
  "text": "Si l’un de vous voulait s’installer durablement dans un autre pays, quelle serait votre position ?",
  "options": [
   {
    "key": "A",
    "text": "Je suis ouvert(e) à construire ce projet"
   },
   {
    "key": "B",
    "text": "Je pourrais accepter avec des garanties concrètes"
   },
   {
    "key": "C",
    "text": "Je souhaite rester durablement dans mon pays actuel"
   },
   {
    "key": "D",
    "text": "Je ne sais pas encore"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q09",
  "moduleNumber": 0,
  "text": "Vous-même, fumez-vous ?",
  "options": [
   {
    "key": "A",
    "text": "Non, jamais"
   },
   {
    "key": "B",
    "text": "Occasionnellement"
   },
   {
    "key": "C",
    "text": "Oui, régulièrement"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q11",
  "moduleNumber": 0,
  "text": "Le tabac chez votre partenaire :",
  "options": [
   {
    "key": "A",
    "text": "Je ne pourrais pas vivre avec"
   },
   {
    "key": "B",
    "text": "Acceptable s'il reste occasionnel"
   },
   {
    "key": "C",
    "text": "Sans importance pour moi"
   },
   {
    "key": "D",
    "text": "Acceptable s'il ne fume jamais à la maison ni près des enfants"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q12",
  "moduleNumber": 0,
  "text": "Vous-même, buvez-vous de l'alcool ?",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Seulement lors d'occasions (fêtes, repas)"
   },
   {
    "key": "C",
    "text": "Chaque semaine"
   },
   {
    "key": "D",
    "text": "Presque tous les jours"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q13",
  "moduleNumber": 0,
  "text": "L'alcool chez votre partenaire :",
  "options": [
   {
    "key": "A",
    "text": "Je ne pourrais pas vivre avec, même occasionnel"
   },
   {
    "key": "B",
    "text": "Acceptable s'il reste occasionnel"
   },
   {
    "key": "C",
    "text": "Sans importance pour moi"
   },
   {
    "key": "D",
    "text": "Acceptable avec modération, jamais d'ivresse"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q15",
  "moduleNumber": 0,
  "text": "Vous-même, les jeux d'argent (paris sportifs, casino, loterie) :",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement, pour le plaisir"
   },
   {
    "key": "C",
    "text": "Chaque semaine"
   },
   {
    "key": "D",
    "text": "Presque tous les jours"
   }
  ],
  "session": 1
 },
 {
  "id": "M0_Q16",
  "moduleNumber": 0,
  "text": "Les jeux d'argent (paris sportifs, casino, loterie) chez votre partenaire :",
  "options": [
   {
    "key": "A",
    "text": "Je ne pourrais pas l'accepter, même rarement"
   },
   {
    "key": "B",
    "text": "Acceptables s'ils restent rares et sans enjeu"
   },
   {
    "key": "C",
    "text": "Sans importance pour moi"
   }
  ],
  "session": 1
 },
 {
  "id": "V82_M1_01",
  "moduleNumber": 1,
  "text": "Quelles cultures, langues familiales ou traditions comptent dans votre identité ? (deux au plus, facultatif)",
  "options": [
   {
    "key": "A",
    "text": "Saisie libre guidée (pays, peuple, région, langue)",
    "freeText": true
   },
   {
    "key": "B",
    "text": "Je préfère ne pas répondre",
    "exclusive": true
   }
  ],
  "multiple": true,
  "maxChoices": 2,
  "optional": true,
  "session": 1
 },
 {
  "id": "M1_Q16",
  "moduleNumber": 1,
  "text": "Votre religion ou conviction :",
  "options": [
   {
    "key": "A",
    "text": "Chrétienne : catholique"
   },
   {
    "key": "B",
    "text": "Chrétienne : protestante ou évangélique"
   },
   {
    "key": "C",
    "text": "Chrétienne : une autre Église"
   },
   {
    "key": "D",
    "text": "Musulmane"
   },
   {
    "key": "E",
    "text": "Juive"
   },
   {
    "key": "F",
    "text": "Bouddhiste"
   },
   {
    "key": "K",
    "text": "Hindoue"
   },
   {
    "key": "G",
    "text": "Une religion traditionnelle ou des ancêtres"
   },
   {
    "key": "H",
    "text": "Une spiritualité personnelle, sans religion"
   },
   {
    "key": "I",
    "text": "Sans religion"
   },
   {
    "key": "J",
    "text": "Une autre religion"
   },
   {
    "key": "L",
    "text": "Agnostique"
   },
   {
    "key": "M",
    "text": "Athée"
   },
   {
    "key": "N",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "V82_M1_02",
  "moduleNumber": 1,
  "text": "Vos convictions religieuses ou philosophiques guident-elles vos grandes décisions de couple ?",
  "options": [
   {
    "key": "A",
    "text": "Oui, elles sont centrales et je souhaite qu’elles soient partagées"
   },
   {
    "key": "B",
    "text": "Oui, mais une différence reste compatible avec ma vision"
   },
   {
    "key": "C",
    "text": "Un peu, tant que le respect est mutuel"
   },
   {
    "key": "D",
    "text": "Non, pas vraiment"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "M1_Q17",
  "moduleNumber": 1,
  "text": "Votre pratique religieuse (prière, office, jeûne…) :",
  "options": [
   {
    "key": "A",
    "text": "Chaque jour"
   },
   {
    "key": "B",
    "text": "Chaque semaine"
   },
   {
    "key": "C",
    "text": "Surtout lors des fêtes religieuses et des grandes occasions"
   },
   {
    "key": "D",
    "text": "Rarement ou jamais"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "rules": {
   "dependsOn": {
    "questionId": "M1_Q16",
    "values": [
     "A",
     "B",
     "C",
     "D",
     "E",
     "F",
     "K",
     "G",
     "H",
     "J"
    ]
   }
  },
  "optional": true,
  "session": 1
 },
 {
  "id": "M1_Q18",
  "moduleNumber": 1,
  "text": "Si la personne que vous aimez n'avait pas votre religion ou vos convictions :",
  "options": [
   {
    "key": "A",
    "text": "Ce ne serait pas possible : je cherche quelqu'un qui les partage"
   },
   {
    "key": "B",
    "text": "J'en ferais une condition : qu'elle adopte les miennes avant le mariage"
   },
   {
    "key": "C",
    "text": "Je le souhaiterais, sans en faire une condition"
   },
   {
    "key": "D",
    "text": "Chacun garderait les siennes, dans le respect de l'autre"
   },
   {
    "key": "E",
    "text": "Je pourrais moi-même adopter les siennes"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "M1_Q19",
  "moduleNumber": 1,
  "text": "Vos habitudes alimentaires (règles religieuses ou convictions) :",
  "options": [
   {
    "key": "A",
    "text": "Je mange halal, strictement"
   },
   {
    "key": "B",
    "text": "Je mange casher, strictement"
   },
   {
    "key": "C",
    "text": "Je suis végétarien(ne) ou végan(e)"
   },
   {
    "key": "D",
    "text": "Une autre règle stricte (religieuse ou personnelle)"
   },
   {
    "key": "E",
    "text": "Quelques règles, que j'adapte selon le contexte"
   },
   {
    "key": "F",
    "text": "Aucune règle : je mange de tout"
   },
   {
    "key": "G",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "V82_M1_03",
  "moduleNumber": 1,
  "text": "Quelle place aimeriez-vous donner aux traditions de chacun dans votre futur foyer ?",
  "options": [
   {
    "key": "A",
    "text": "Nous partagerions surtout les mêmes traditions"
   },
   {
    "key": "B",
    "text": "Nous construirions un équilibre entre nos deux cultures"
   },
   {
    "key": "C",
    "text": "Chacun pourrait garder ses propres pratiques"
   },
   {
    "key": "D",
    "text": "Nous déciderions au cas par cas"
   },
   {
    "key": "E",
    "text": "Je ne sais pas encore"
   }
  ],
  "session": 1
 },
 {
  "id": "V82_M1_04",
  "moduleNumber": 1,
  "text": "Si vos familles désapprouvaient votre union pour des raisons culturelles ou religieuses, comment décideriez-vous ?",
  "options": [
   {
    "key": "A",
    "text": "Leur accord serait indispensable"
   },
   {
    "key": "B",
    "text": "Je chercherais une médiation avant de décider"
   },
   {
    "key": "C",
    "text": "Je les écouterais, puis nous déciderions à deux"
   },
   {
    "key": "D",
    "text": "Le choix du couple primerait, même sans leur accord"
   }
  ],
  "session": 1
 },
 {
  "id": "M4_Q17",
  "moduleNumber": 4,
  "text": "La dot pour votre mariage :",
  "options": [
   {
    "key": "A",
    "text": "Indispensable : mon mariage ne se fera pas sans elle"
   },
   {
    "key": "B",
    "text": "Importante, sous une forme symbolique ou modernisée"
   },
   {
    "key": "C",
    "text": "Absente de ma culture, mais je la respecterais dans celle de mon/ma partenaire"
   },
   {
    "key": "D",
    "text": "Je n'y adhère pas, même si mon/ma partenaire y tient"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "V82_M4_08",
  "moduleNumber": 4,
  "text": "Le Mahr (don de l’époux à l’épouse, prévu par le mariage musulman) pour votre mariage :",
  "options": [
   {
    "key": "A",
    "text": "Indispensable : notre mariage ne se fera pas sans Mahr"
   },
   {
    "key": "B",
    "text": "Important, avec une forme ou un montant décidés ensemble"
   },
   {
    "key": "C",
    "text": "Il ne fait pas partie de mes convictions, mais je le respecterais si mon/ma partenaire y tient"
   },
   {
    "key": "D",
    "text": "Je n'y adhère pas, même si mon/ma partenaire y tient"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "rules": {
   "dependsOn": [
    {
     "questionId": "M1_Q16",
     "values": [
      "D"
     ]
    },
    {
     "questionId": "M1_Q18",
     "values": [
      "C",
      "D",
      "E"
     ]
    }
   ]
  },
  "optional": true,
  "session": 1
 },
 {
  "id": "M1_Q20",
  "moduleNumber": 1,
  "text": "Pour votre propre couple, la polygamie (plusieurs épouses pour un même mari) :",
  "options": [
   {
    "key": "A",
    "text": "Exclue, sans discussion possible"
   },
   {
    "key": "B",
    "text": "Exclue, mais j'accepte d'en parler"
   },
   {
    "key": "C",
    "text": "Envisageable si chacun y consent, dans un cadre religieux ou coutumier"
   },
   {
    "key": "D",
    "text": "Je n'ai pas encore de position arrêtée"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "V82_M8_03",
  "moduleNumber": 8,
  "text": "Quel cadre d’exclusivité recherchez-vous dans une relation durable ?",
  "options": [
   {
    "key": "A",
    "text": "Une exclusivité affective et sexuelle réciproque"
   },
   {
    "key": "B",
    "text": "Une exclusivité, avec des limites à définir ensemble"
   },
   {
    "key": "C",
    "text": "Je suis ouvert(e) à d’autres formes de relation, avec le consentement de chacun"
   },
   {
    "key": "D",
    "text": "Je ne sais pas encore"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "M6_Q19",
  "moduleNumber": 8,
  "text": "Pour vous, lesquels de ces comportements de votre partenaire seraient déjà une infidélité ? (plusieurs réponses possibles)",
  "options": [
   {
    "key": "A",
    "text": "Échanger des messages de séduction avec quelqu'un d'autre"
   },
   {
    "key": "B",
    "text": "Garder un profil actif sur une application de rencontre"
   },
   {
    "key": "C",
    "text": "Confier à quelqu'un d'autre ce qu'il ou elle ne me dit pas"
   },
   {
    "key": "D",
    "text": "Revoir un(e) ex sans me le dire"
   },
   {
    "key": "E",
    "text": "Embrasser quelqu'un d'autre"
   },
   {
    "key": "F",
    "text": "Regarder des contenus pour adultes"
   },
   {
    "key": "G",
    "text": "Aucun de ceux-là : seule une relation physique compte",
    "exclusive": true
   }
  ],
  "multiple": true,
  "optional": true,
  "session": 1
 },
 {
  "id": "M10_Q17",
  "moduleNumber": 10,
  "text": "L'intimité physique avant le mariage :",
  "options": [
   {
    "key": "A",
    "text": "Exclue pour moi : j'attends le mariage"
   },
   {
    "key": "B",
    "text": "Je préfère attendre un engagement sérieux (fiançailles, projet officiel)"
   },
   {
    "key": "C",
    "text": "Possible quand la relation est solide, sans attendre un engagement officiel"
   },
   {
    "key": "D",
    "text": "Je préfère en parler directement avec la personne"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 1
 },
 {
  "id": "V82_M8_04",
  "moduleNumber": 8,
  "text": "Si vous élevez des enfants, quelle approche vous paraît la plus juste ?",
  "options": [
   {
    "key": "A",
    "text": "Un cadre ferme, expliqué et constant"
   },
   {
    "key": "B",
    "text": "Beaucoup de dialogue, avec des règles adaptées à l’âge"
   },
   {
    "key": "C",
    "text": "Une large autonomie dans un cadre de sécurité"
   },
   {
    "key": "D",
    "text": "Je déciderais selon l’enfant et avec l’autre parent"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "rules": {
   "dependsOn": [
    {
     "questionId": "V82_M0_03",
     "values": [
      "B",
      "C",
      "D"
     ]
    },
    {
     "questionId": "M0_Q06",
     "values": [
      "A",
      "B",
      "C"
     ]
    }
   ]
  },
  "optional": true,
  "session": 1
 },
 {
  "id": "M8_Q18",
  "moduleNumber": 8,
  "text": "Dans quelle religion élèveriez-vous vos enfants ?",
  "options": [
   {
    "key": "A",
    "text": "Dans ma religion, c'est indispensable"
   },
   {
    "key": "B",
    "text": "Dans celle de l'un de nous, choisie à deux"
   },
   {
    "key": "C",
    "text": "Dans nos deux traditions ; ils choisiront plus tard"
   },
   {
    "key": "D",
    "text": "Sans éducation religieuse"
   }
  ],
  "rules": {
   "dependsOn": [
    {
     "questionId": "V82_M0_03",
     "values": [
      "B",
      "C",
      "D"
     ]
    },
    {
     "questionId": "M0_Q06",
     "values": [
      "A",
      "B",
      "C"
     ]
    }
   ]
  },
  "optional": true,
  "session": 1
 },
 {
  "id": "M8_Q20",
  "moduleNumber": 8,
  "text": "Une tape ou une fessée pour éduquer un enfant :",
  "options": [
   {
    "key": "A",
    "text": "Cela fait partie d'une bonne éducation"
   },
   {
    "key": "B",
    "text": "Acceptable de façon exceptionnelle"
   },
   {
    "key": "C",
    "text": "Je préfère l'éviter"
   },
   {
    "key": "D",
    "text": "Jamais : c'est une violence"
   }
  ],
  "rules": {
   "dependsOn": [
    {
     "questionId": "V82_M0_03",
     "values": [
      "B",
      "C",
      "D"
     ]
    },
    {
     "questionId": "M0_Q06",
     "values": [
      "A",
      "B",
      "C"
     ]
    }
   ]
  },
  "optional": true,
  "session": 1
 },
 {
  "id": "M8_Q10",
  "moduleNumber": 8,
  "text": "Parmi ces signaux, lesquels vous feraient fuir rapidement ? (3 au plus)",
  "options": [
   {
    "key": "A",
    "text": "Des déclarations d'amour très rapides et envahissantes"
   },
   {
    "key": "B",
    "text": "Une jalousie qui contrôle : téléphone fouillé, localisation exigée"
   },
   {
    "key": "C",
    "text": "Disparaître des jours sans explication, puis revenir comme si de rien n’était"
   },
   {
    "key": "D",
    "text": "Rester flou sur ses intentions : « on verra », sans engagement"
   },
   {
    "key": "E",
    "text": "Dire du mal de tous ses ex"
   },
   {
    "key": "F",
    "text": "Mal parler aux serveurs, aux inconnus ou à sa famille"
   },
   {
    "key": "G",
    "text": "Compter sur l'argent de l'autre pour vivre"
   },
   {
    "key": "H",
    "text": "Ne jamais reconnaître ses torts"
   },
   {
    "key": "I",
    "text": "Ne pas respecter un « non » ou une limite"
   },
   {
    "key": "J",
    "text": "Avoir les yeux rivés sur son téléphone pendant les moments à deux"
   }
  ],
  "multiple": true,
  "maxChoices": 3,
  "session": 1
 },
 {
  "id": "M8_Q12",
  "moduleNumber": 8,
  "text": "Parmi ces sujets, lesquels sont pour vous non négociables, au point qu’un désaccord vous ferait renoncer à la relation ? (3 au plus)",
  "options": [
   {
    "key": "A",
    "text": "Avoir des enfants, ou non"
   },
   {
    "key": "B",
    "text": "La religion et sa pratique"
   },
   {
    "key": "C",
    "text": "La fidélité"
   },
   {
    "key": "D",
    "text": "La façon de gérer l'argent"
   },
   {
    "key": "E",
    "text": "Le lieu de vie"
   },
   {
    "key": "F",
    "text": "La place de la famille dans le couple"
   },
   {
    "key": "G",
    "text": "L'intimité avant le mariage"
   },
   {
    "key": "H",
    "text": "La polygamie"
   },
   {
    "key": "I",
    "text": "Le tabac ou l'alcool"
   },
   {
    "key": "J",
    "text": "Les rôles de l'homme et de la femme dans le foyer"
   },
   {
    "key": "K",
    "text": "Aucun : pour moi, tout se discute",
    "exclusive": true
   }
  ],
  "multiple": true,
  "maxChoices": 3,
  "session": 1
 },
 {
  "id": "V82_M2_01",
  "moduleNumber": 2,
  "text": "Quand quelqu'un que j'aime répond beaucoup plus tard que d'habitude, je crains qu'il ou elle prenne ses distances.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : anxiété",
  "session": 2
 },
 {
  "id": "V82_M2_02",
  "moduleNumber": 2,
  "text": "J'ai besoin d'entendre régulièrement que je compte pour mon/ma partenaire.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : anxiété",
  "session": 2
 },
 {
  "id": "V82_M2_03",
  "moduleNumber": 2,
  "text": "Si mon/ma partenaire souhaite passer du temps sans moi, je le vis généralement avec sérénité.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : anxiété",
  "reversed": true,
  "session": 2
 },
 {
  "id": "V82_M2_04",
  "moduleNumber": 2,
  "text": "Après une petite tension, je me demande longtemps si la relation est menacée.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : anxiété",
  "session": 2
 },
 {
  "id": "V82_M10_01",
  "moduleNumber": 10,
  "text": "Qu’est-ce qui vous fait le plus souvent sentir une proximité naissante avec quelqu’un ?",
  "options": [
   {
    "key": "A",
    "text": "Une conversation profonde et sincère"
   },
   {
    "key": "B",
    "text": "Des échanges légers, avec beaucoup d’humour"
   },
   {
    "key": "C",
    "text": "Une présence calme et une écoute attentive"
   },
   {
    "key": "D",
    "text": "Des gestes concrets et des attentions"
   },
   {
    "key": "E",
    "text": "Je ne peux pas le savoir avant la rencontre"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M10_02",
  "moduleNumber": 10,
  "text": "Dans une relation qui commence sans photo, quel rythme de découverte vous met le plus à l’aise ?",
  "options": [
   {
    "key": "A",
    "text": "Des échanges écrits d’abord, puis une conversation à voix haute"
   },
   {
    "key": "B",
    "text": "Une conversation à voix haute assez vite"
   },
   {
    "key": "C",
    "text": "Une découverte progressive, sans calendrier"
   },
   {
    "key": "D",
    "text": "Je préfère en convenir avec la personne"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M10_04",
  "moduleNumber": 10,
  "text": "Pour vous, quelle place l’intimité physique devrait-elle avoir dans un couple durable ?",
  "options": [
   {
    "key": "A",
    "text": "Une place centrale"
   },
   {
    "key": "B",
    "text": "Une place importante parmi d’autres"
   },
   {
    "key": "C",
    "text": "Une place plutôt secondaire"
   },
   {
    "key": "D",
    "text": "Je préfère en convenir avec la personne"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 2
 },
 {
  "id": "V82_M2_05",
  "moduleNumber": 2,
  "text": "Quand une relation devient très intime émotionnellement, j'ai parfois besoin de m'éloigner.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : évitement",
  "session": 2
 },
 {
  "id": "V82_M2_06",
  "moduleNumber": 2,
  "text": "Parler d'une difficulté personnelle avec mon/ma partenaire m'est généralement naturel.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : évitement",
  "reversed": true,
  "session": 2
 },
 {
  "id": "V82_M2_07",
  "moduleNumber": 2,
  "text": "Même quand j'ai besoin de soutien, je préfère ne compter que sur moi.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : évitement",
  "session": 2
 },
 {
  "id": "V82_M2_08",
  "moduleNumber": 2,
  "text": "J'accepte facilement que mon/ma partenaire prenne soin de moi quand je suis vulnérable.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attachement : évitement",
  "reversed": true,
  "session": 2
 },
 {
  "id": "V82_M3_01",
  "moduleNumber": 3,
  "text": "Quelle description correspond le mieux à votre dernière relation sérieuse ?",
  "options": [
   {
    "key": "A",
    "text": "Je n'ai jamais vécu de relation sérieuse"
   },
   {
    "key": "B",
    "text": "La séparation est encore en cours"
   },
   {
    "key": "C",
    "text": "Elle s’est terminée il y a moins de six mois"
   },
   {
    "key": "D",
    "text": "Elle s’est terminée il y a plus de six mois"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 2
 },
 {
  "id": "V82_M3_02",
  "moduleNumber": 3,
  "text": "Aujourd’hui, quel lien gardez-vous avec votre dernier/dernière partenaire ?",
  "options": [
   {
    "key": "A",
    "text": "Aucun contact"
   },
   {
    "key": "B",
    "text": "Uniquement pour des responsabilités communes (enfants, logement)"
   },
   {
    "key": "C",
    "text": "Des relations cordiales, sans proximité"
   },
   {
    "key": "D",
    "text": "Une amitié ou une vraie proximité"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "rules": {
   "dependsOn": {
    "questionId": "V82_M3_01",
    "values": [
     "B",
     "C",
     "D"
    ]
   }
  },
  "optional": true,
  "session": 2
 },
 {
  "id": "M3_Q12",
  "moduleNumber": 3,
  "text": "Dans la maison où vous avez grandi, les désaccords entre adultes se réglaient le plus souvent :",
  "options": [
   {
    "key": "A",
    "text": "En discutant, parfois vivement, puis en se réconciliant"
   },
   {
    "key": "B",
    "text": "Par des cris ou des disputes qui revenaient souvent"
   },
   {
    "key": "C",
    "text": "Par le silence : on ne parlait pas des problèmes"
   },
   {
    "key": "D",
    "text": "Une seule personne décidait, les autres suivaient"
   },
   {
    "key": "E",
    "text": "Je n'ai pas grandi auprès de deux adultes en couple"
   }
  ],
  "optional": true,
  "session": 2
 },
 {
  "id": "V82_M6_01",
  "moduleNumber": 6,
  "text": "Dans une dispute, je reproche à l'autre ce qu'il ou elle est, plutôt qu'un fait précis.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Critique globale",
  "session": 2
 },
 {
  "id": "V82_M6_02",
  "moduleNumber": 6,
  "text": "Quand je suis contrarié(e), je dis ce que j'ai ressenti sans attaquer l'autre.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Expression sans accusation",
  "session": 2
 },
 {
  "id": "V82_M6_03",
  "moduleNumber": 6,
  "text": "Quand je me sens blessé(e), il m'arrive d'être ironique ou moqueur(se).",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Mépris / ironie",
  "session": 2
 },
 {
  "id": "V82_M6_04",
  "moduleNumber": 6,
  "text": "Pendant un désaccord, je reste capable de reconnaître un effort de mon/ma partenaire.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Reconnaissance malgré le conflit",
  "session": 2
 },
 {
  "id": "M6_Q05",
  "moduleNumber": 6,
  "text": "Les insultes ou les mots blessants lors d'une dispute :",
  "options": [
   {
    "key": "A",
    "text": "Limite absolue pour moi — inacceptable"
   },
   {
    "key": "B",
    "text": "Grave, mais je peux pardonner une première fois"
   },
   {
    "key": "C",
    "text": "Difficile, mais ça peut arriver dans un couple"
   },
   {
    "key": "D",
    "text": "J'essaie de passer outre si ce n'est pas récurrent"
   }
  ],
  "session": 2
 },
 {
  "id": "M6_Q04",
  "moduleNumber": 6,
  "text": "La violence physique dans une relation :",
  "options": [
   {
    "key": "A",
    "text": "Rupture immédiate — limite absolue, non négociable"
   },
   {
    "key": "B",
    "text": "Inacceptable, mais je tenterais d'abord une discussion"
   },
   {
    "key": "C",
    "text": "Ça dépend des circonstances"
   },
   {
    "key": "D",
    "text": "Je ne sais pas comment je réagirais"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M6_05",
  "moduleNumber": 6,
  "text": "Quand on me reproche quelque chose, mon premier réflexe est de me justifier.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Défensivité",
  "session": 2
 },
 {
  "id": "V82_M6_06",
  "moduleNumber": 6,
  "text": "Quand l'échange devient trop intense, je préviens que j'ai besoin d'une pause et je propose d'y revenir.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Pause constructive",
  "session": 2
 },
 {
  "id": "V82_M6_07",
  "moduleNumber": 6,
  "text": "Pendant une tension, il m'arrive d'arrêter de répondre sans dire quand nous en reparlerons.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Retrait sans retour",
  "session": 2
 },
 {
  "id": "V82_M6_08",
  "moduleNumber": 6,
  "text": "Après une dispute, je reviens sur le sujet pour vérifier que chacun s'est senti entendu.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "dimension": "Réparation",
  "session": 2
 },
 {
  "id": "V82_M6_09",
  "moduleNumber": 6,
  "text": "Votre partenaire veut interrompre une discussion difficile pour la reprendre demain. Comment réagissez-vous ?",
  "options": [
   {
    "key": "A",
    "text": "J’accepte et nous fixons un moment pour reprendre"
   },
   {
    "key": "B",
    "text": "J’accepte, mais j’ai besoin d’un signe qui me rassure"
   },
   {
    "key": "C",
    "text": "Je suis frustré(e) et je voudrais conclure maintenant"
   },
   {
    "key": "D",
    "text": "Je continue la discussion malgré sa demande"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M2_09",
  "moduleNumber": 2,
  "text": "Quand je reçois une remarque difficile, j'arrive à envisager d'autres explications que l'intention de me blesser.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Régulation : réévaluation",
  "session": 2
 },
 {
  "id": "V82_M2_10",
  "moduleNumber": 2,
  "text": "Quand je me mets en colère, je peux reconsidérer la situation avant de répondre.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Régulation : réévaluation",
  "session": 2
 },
 {
  "id": "V82_M2_11",
  "moduleNumber": 2,
  "text": "Quand je ressens de la tristesse, je fais souvent en sorte que personne ne la voie.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Régulation : suppression",
  "session": 2
 },
 {
  "id": "V82_M2_12",
  "moduleNumber": 2,
  "text": "Même bouleversé(e), je montre rarement mes émotions.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Régulation : suppression",
  "session": 2
 },
 {
  "id": "V82_M2_13",
  "moduleNumber": 2,
  "text": "Même quand je ne partage pas l'avis de mon/ma partenaire, je peux imaginer pourquoi il ou elle le ressent ainsi.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Point de vue de l’autre",
  "session": 2
 },
 {
  "id": "V82_M2_14",
  "moduleNumber": 2,
  "text": "Quand j'interprète un silence comme un rejet, je peux remettre cette interprétation en question.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Point de vue de l’autre",
  "session": 2
 },
 {
  "id": "V82_M9_01",
  "moduleNumber": 9,
  "text": "Pour une décision importante sur laquelle vous n’êtes pas d’accord, quel fonctionnement préférez-vous ?",
  "options": [
   {
    "key": "A",
    "text": "Chercher un accord qui convient aux deux"
   },
   {
    "key": "B",
    "text": "Laisser décider la personne la plus concernée"
   },
   {
    "key": "C",
    "text": "L’un tranche après avoir écouté l’autre"
   },
   {
    "key": "D",
    "text": "Reporter la décision jusqu’à trouver un compromis"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M9_02",
  "moduleNumber": 9,
  "text": "J'arrive à demander clairement ce dont j'ai besoin, sans attendre que l'autre le devine.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "session": 2
 },
 {
  "id": "M9_Q16",
  "moduleNumber": 9,
  "text": "Quand je n'obtiens pas ce que je veux, je le fais sentir (bouderie, froideur).",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "session": 2
 },
 {
  "id": "V82_M9_03",
  "moduleNumber": 9,
  "text": "Un(e) partenaire doit pouvoir garder ses activités, ses amitiés et du temps à soi sans demander la permission.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "session": 2
 },
 {
  "id": "M5_Q08",
  "moduleNumber": 9,
  "text": "L'accès au téléphone et aux messages de votre partenaire :",
  "options": [
   {
    "key": "A",
    "text": "Transparence totale — chacun a accès à tout"
   },
   {
    "key": "B",
    "text": "Chacun garde son téléphone pour lui"
   },
   {
    "key": "C",
    "text": "Accès possible seulement en cas de doute sérieux"
   },
   {
    "key": "D",
    "text": "Je ne me suis jamais posé la question"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M9_05",
  "moduleNumber": 9,
  "text": "Partager sa localisation en temps réel dans un couple :",
  "options": [
   {
    "key": "A",
    "text": "Je le souhaite, si nous le décidons tous les deux"
   },
   {
    "key": "B",
    "text": "Seulement ponctuellement (un trajet, un voyage)"
   },
   {
    "key": "C",
    "text": "Je préfère ne pas le faire, sauf urgence"
   },
   {
    "key": "D",
    "text": "Cela m’est égal"
   }
  ],
  "session": 2
 },
 {
  "id": "V82_M9_06",
  "moduleNumber": 9,
  "text": "Dans mes relations passées, il m'est arrivé de consulter le téléphone d'un(e) partenaire sans son accord.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "rules": {
   "dependsOn": {
    "questionId": "V82_M3_01",
    "values": [
     "B",
     "C",
     "D",
     "E"
    ]
   }
  },
  "optional": true,
  "session": 2
 },
 {
  "id": "V82_M9_07",
  "moduleNumber": 9,
  "text": "Il m'est arrivé de demander à un(e) partenaire de partager sa localisation alors qu'il ou elle ne le souhaitait pas.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "rules": {
   "dependsOn": {
    "questionId": "V82_M3_01",
    "values": [
     "B",
     "C",
     "D",
     "E"
    ]
   }
  },
  "optional": true,
  "session": 2
 },
 {
  "id": "M9_Q24",
  "moduleNumber": 9,
  "text": "Quand l'autre refuse quelque chose qui le ou la concerne (un geste, une sortie, une dépense), j'insiste jusqu'à ce qu'il ou elle cède.",
  "options": [
   {
    "key": "A",
    "text": "Jamais"
   },
   {
    "key": "B",
    "text": "Rarement"
   },
   {
    "key": "C",
    "text": "Parfois"
   },
   {
    "key": "D",
    "text": "Souvent"
   },
   {
    "key": "E",
    "text": "Très souvent"
   },
   {
    "key": "NA",
    "text": "Non applicable"
   }
  ],
  "scale": "frequence",
  "session": 2
 },
 {
  "id": "M6_Q24",
  "moduleNumber": 6,
  "text": "Dans un couple, il y a des situations où une gifle peut se comprendre.",
  "options": [
   {
    "key": "A",
    "text": "Pas du tout d’accord"
   },
   {
    "key": "B",
    "text": "Plutôt pas d’accord"
   },
   {
    "key": "C",
    "text": "Ni d’accord ni pas d’accord"
   },
   {
    "key": "D",
    "text": "Plutôt d’accord"
   },
   {
    "key": "E",
    "text": "Tout à fait d’accord"
   }
  ],
  "scale": "accord",
  "dimension": "Attitude envers la violence (sécurité)",
  "session": 2
 },
 {
  "id": "M10_Q19",
  "moduleNumber": 10,
  "text": "Quand votre partenaire propose un moment d'intimité et que vous n'en avez pas envie :",
  "options": [
   {
    "key": "A",
    "text": "Je le dis simplement, et nous trouvons un autre moment de tendresse"
   },
   {
    "key": "B",
    "text": "J’accepte quand même, pour ne pas le ou la décevoir"
   },
   {
    "key": "C",
    "text": "Je refuse, mais je me sens coupable"
   },
   {
    "key": "D",
    "text": "Je refuse sans difficulté"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 2
 },
 {
  "id": "V82_M4_01",
  "moduleNumber": 4,
  "text": "Pour les dépenses d’un foyer commun, quelle organisation vous semblerait la plus juste ?",
  "options": [
   {
    "key": "A",
    "text": "Un budget entièrement commun"
   },
   {
    "key": "B",
    "text": "Des contributions proportionnelles aux revenus"
   },
   {
    "key": "C",
    "text": "Un partage à parts égales des charges communes"
   },
   {
    "key": "D",
    "text": "Des finances séparées avec des accords ponctuels"
   },
   {
    "key": "E",
    "text": "Nous déciderions selon nos revenus et nos obligations"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M4_02",
  "moduleNumber": 4,
  "text": "Si votre partenaire perdait son emploi pendant plusieurs mois tout en cherchant activement, comment le vivriez-vous ?",
  "options": [
   {
    "key": "A",
    "text": "Je l’accompagnerais sans fixer d’échéance"
   },
   {
    "key": "B",
    "text": "Nous établirions ensemble un plan et des limites tenables"
   },
   {
    "key": "C",
    "text": "J’aiderais un temps, avec un calendrier clair"
   },
   {
    "key": "D",
    "text": "Je ne pourrais pas envisager une dépendance financière prolongée"
   }
  ],
  "session": 3
 },
 {
  "id": "M4_Q16",
  "moduleNumber": 4,
  "text": "Aider financièrement votre famille (parents, frères et sœurs…) une fois en couple :",
  "options": [
   {
    "key": "A",
    "text": "Un devoir régulier : ma famille compte sur moi, cela ne se discute pas"
   },
   {
    "key": "B",
    "text": "Une aide régulière, dont le montant se décide à deux"
   },
   {
    "key": "C",
    "text": "Une aide ponctuelle, en cas de vrai besoin"
   },
   {
    "key": "D",
    "text": "L'argent du foyer ne doit pas servir à la famille élargie"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M4_03",
  "moduleNumber": 4,
  "text": "Aujourd’hui, aidez-vous financièrement des proches de façon régulière ?",
  "options": [
   {
    "key": "A",
    "text": "Non"
   },
   {
    "key": "B",
    "text": "Ponctuellement, en cas de besoin"
   },
   {
    "key": "C",
    "text": "Régulièrement, pour une petite part de mes revenus"
   },
   {
    "key": "D",
    "text": "Régulièrement, pour une part importante de mes revenus"
   },
   {
    "key": "E",
    "text": "Je préfère ne pas répondre"
   }
  ],
  "optional": true,
  "session": 3
 },
 {
  "id": "V82_M4_04",
  "moduleNumber": 4,
  "text": "Si vous découvriez un crédit important de votre partenaire avant de vivre ensemble, quelle réaction serait la plus proche de la vôtre ?",
  "options": [
   {
    "key": "A",
    "text": "J’aurais besoin d’une transparence complète avant tout engagement"
   },
   {
    "key": "B",
    "text": "J’en parlerais pour comprendre son impact sur nos projets"
   },
   {
    "key": "C",
    "text": "Ce serait privé tant que le foyer n’est pas concerné"
   },
   {
    "key": "D",
    "text": "Je ne sais pas"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M7_01",
  "moduleNumber": 7,
  "text": "Je mets l'ambiance dans les soirées.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Extraversion",
  "session": 3
 },
 {
  "id": "V82_M7_02",
  "moduleNumber": 7,
  "text": "Je compatis à ce que ressentent les autres.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Agréabilité",
  "session": 3
 },
 {
  "id": "V82_M7_03",
  "moduleNumber": 7,
  "text": "Je fais les corvées tout de suite.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Conscienciosité",
  "session": 3
 },
 {
  "id": "V82_M7_04",
  "moduleNumber": 7,
  "text": "J'ai souvent des sautes d'humeur.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Stabilité émotionnelle",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_05",
  "moduleNumber": 7,
  "text": "J'ai une imagination fertile.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Ouverture (imagination)",
  "session": 3
 },
 {
  "id": "V82_M7_06",
  "moduleNumber": 7,
  "text": "Je parle peu.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Extraversion",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_07",
  "moduleNumber": 7,
  "text": "Les problèmes des autres ne m'intéressent pas.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Agréabilité",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_08",
  "moduleNumber": 7,
  "text": "J'oublie souvent de ranger les choses à leur place.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Conscienciosité",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_09",
  "moduleNumber": 7,
  "text": "Je suis détendu(e) la plupart du temps.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Stabilité émotionnelle",
  "session": 3
 },
 {
  "id": "V82_M7_10",
  "moduleNumber": 7,
  "text": "Les idées abstraites ne m'intéressent pas.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Ouverture (imagination)",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M4_05",
  "moduleNumber": 4,
  "text": "Si l’un de vous travaillait beaucoup plus que l’autre, comment répartiriez-vous les tâches de la maison ?",
  "options": [
   {
    "key": "A",
    "text": "Selon le temps disponible et la charge totale de chacun"
   },
   {
    "key": "B",
    "text": "À parts égales, quelles que soient les contraintes"
   },
   {
    "key": "C",
    "text": "Selon les goûts et les compétences, en réajustant"
   },
   {
    "key": "D",
    "text": "Selon des rôles d’homme et de femme définis à l’avance"
   },
   {
    "key": "E",
    "text": "Nous en reparlerions régulièrement"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M4_06",
  "moduleNumber": 4,
  "text": "Si un projet commun exigeait de réduire votre niveau de vie pendant un an, que feriez-vous le plus probablement ?",
  "options": [
   {
    "key": "A",
    "text": "Je réduirais volontiers mon train de vie si nous sommes d’accord"
   },
   {
    "key": "B",
    "text": "J’accepterais avec un budget et une date pour refaire le point"
   },
   {
    "key": "C",
    "text": "Je préférerais reporter le projet pour garder notre stabilité"
   },
   {
    "key": "D",
    "text": "Je refuserais de baisser durablement mon niveau de vie"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M5_01",
  "moduleNumber": 5,
  "text": "Un proche critique injustement votre partenaire devant vous. Que faites-vous le plus souvent ?",
  "options": [
   {
    "key": "A",
    "text": "J’interviens tout de suite pour poser une limite"
   },
   {
    "key": "B",
    "text": "Je soutiens mon/ma partenaire, puis je reparle au proche en privé"
   },
   {
    "key": "C",
    "text": "Je cherche d’abord à comprendre le contexte"
   },
   {
    "key": "D",
    "text": "Je laisse les personnes concernées régler cela"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M5_02",
  "moduleNumber": 5,
  "text": "Pour les grandes décisions du couple, quelle place devraient avoir les parents et les proches ?",
  "options": [
   {
    "key": "A",
    "text": "Leur accord est nécessaire"
   },
   {
    "key": "B",
    "text": "Leur avis compte, mais nous décidons à deux"
   },
   {
    "key": "C",
    "text": "Nous les informons une fois la décision prise"
   },
   {
    "key": "D",
    "text": "Nous décidons sans intervention familiale"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M5_03",
  "moduleNumber": 5,
  "text": "Si un membre de votre famille souhaitait vivre plusieurs mois chez vous, comment réagiriez-vous ?",
  "options": [
   {
    "key": "A",
    "text": "Je l’accueillerais naturellement, même sans date de fin"
   },
   {
    "key": "B",
    "text": "Je voudrais fixer à deux une durée et des règles"
   },
   {
    "key": "C",
    "text": "J’accepterais seulement en situation exceptionnelle"
   },
   {
    "key": "D",
    "text": "Je ne souhaite pas de cohabitation prolongée"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M5_04",
  "moduleNumber": 5,
  "text": "Quand une obligation familiale entre en conflit avec un engagement pris envers votre partenaire, que faites-vous ?",
  "options": [
   {
    "key": "A",
    "text": "Je privilégie presque toujours ma famille"
   },
   {
    "key": "B",
    "text": "J’explique les contraintes et je cherche une solution équilibrée"
   },
   {
    "key": "C",
    "text": "Je privilégie l’engagement pris envers mon/ma partenaire"
   },
   {
    "key": "D",
    "text": "Cela dépend de la gravité de chaque demande"
   }
  ],
  "session": 3
 },
 {
  "id": "V82_M7_11",
  "moduleNumber": 7,
  "text": "Dans une soirée, je parle avec beaucoup de personnes différentes.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Extraversion",
  "session": 3
 },
 {
  "id": "V82_M7_12",
  "moduleNumber": 7,
  "text": "Je ressens les émotions des autres.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Agréabilité",
  "session": 3
 },
 {
  "id": "V82_M7_13",
  "moduleNumber": 7,
  "text": "J'aime l'ordre.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Conscienciosité",
  "session": 3
 },
 {
  "id": "V82_M7_14",
  "moduleNumber": 7,
  "text": "Je suis facilement contrarié(e).",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Stabilité émotionnelle",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_15",
  "moduleNumber": 7,
  "text": "J'ai du mal à comprendre les idées abstraites.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Ouverture (imagination)",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_16",
  "moduleNumber": 7,
  "text": "Je reste en retrait.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Extraversion",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_17",
  "moduleNumber": 7,
  "text": "Les autres ne m'intéressent pas vraiment.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Agréabilité",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_18",
  "moduleNumber": 7,
  "text": "Je mets le désordre dans mes affaires.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Conscienciosité",
  "reversed": true,
  "session": 3
 },
 {
  "id": "V82_M7_19",
  "moduleNumber": 7,
  "text": "J'ai rarement le cafard.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Stabilité émotionnelle",
  "session": 3
 },
 {
  "id": "V82_M7_20",
  "moduleNumber": 7,
  "text": "Je n'ai pas beaucoup d'imagination.",
  "options": [
   {
    "key": "A",
    "text": "Très inexact"
   },
   {
    "key": "B",
    "text": "Plutôt inexact"
   },
   {
    "key": "C",
    "text": "Ni exact ni inexact"
   },
   {
    "key": "D",
    "text": "Plutôt exact"
   },
   {
    "key": "E",
    "text": "Très exact"
   }
  ],
  "dimension": "Big Five — Ouverture (imagination)",
  "reversed": true,
  "session": 3
 }
];

export const V82_BASE_EN: Record<string, V82Translation> = {
 "V82_M0_01": {
  "text": "Which age range appeals to you most in a partner?",
  "options": {}
 },
 "V82_M0_02": {
  "text": "And which ages would you genuinely accept, beyond that ideal range?",
  "options": {}
 },
 "M0_Q02": {
  "text": "The geographic scope of your search:",
  "options": {
   "A": "Near me (my city and region)",
   "B": "Same region",
   "C": "My whole country (national)",
   "D": "International (no borders)"
  }
 },
 "M0_Q03": {
  "text": "Are you willing to relocate for your partner?",
  "options": {
   "A": "Yes, unconditionally",
   "B": "Yes, if the life plan is solid",
   "C": "It depends on the distance",
   "D": "No, I’m staying where I am"
  }
 },
 "M0_Q10": {
  "text": "Which languages are you comfortable living a relationship in, day to day? (several answers possible)",
  "options": {
   "A": "French — Français",
   "B": "English",
   "C": "Arabic — العربية",
   "D": "Lingala",
   "E": "Kiswahili",
   "F": "Wolof",
   "G": "Portuguese — Português",
   "H": "Spanish — Español",
   "J": "Creole — Kreyòl",
   "I": "Another language (please specify)"
  }
 },
 "M0_Q04": {
  "text": "Your current situation:",
  "options": {
   "A": "Single",
   "B": "Separated / divorced",
   "C": "Widowed",
   "D": "In transition: separation or divorce not yet finalised"
  }
 },
 "V82_M0_03": {
  "text": "Do you have children? If so, where do they mostly live? (several answers possible)",
  "options": {
   "A": "I don't have children",
   "B": "With me, most of the time",
   "C": "Shared custody",
   "D": "Mainly with their other parent",
   "E": "They are adults or independent"
  }
 },
 "M0_Q06": {
  "text": "Do you want to have children (or more children) in the future?",
  "options": {
   "A": "Yes, absolutely",
   "B": "Yes, if the conditions are right",
   "C": "I’m not sure",
   "D": "No, that’s final",
   "E": "I prefer not to answer"
  }
 },
 "M0_Q14": {
  "text": "A partner who already has children:",
  "options": {
   "A": "That suits me completely",
   "B": "That suits me, as long as they don’t live with us full-time",
   "C": "I’d rather avoid it",
   "D": "I couldn’t accept it"
  }
 },
 "M3_Q04": {
  "text": "In a blended family, the step-parent’s place with the other’s children:",
  "options": {
   "A": "A full parent, with no difference between the children",
   "B": "An affectionate place, each parent keeping their role with their own children",
   "C": "A caring presence, without direct parental authority",
   "D": "A place built over time and through trust"
  }
 },
 "V82_M8_01": {
  "text": "What are you looking for in a relationship today?",
  "options": {
   "A": "A marriage or an official commitment",
   "B": "A lasting relationship with a shared project",
   "C": "A serious relationship, built step by step",
   "D": "To get to know someone, without deciding the form right away"
  }
 },
 "V82_M8_02": {
  "text": "If the relationship goes well, when would you like an official commitment?",
  "options": {
   "A": "Within a year",
   "B": "Within one to two years",
   "C": "In more than two years",
   "D": "Not necessarily an official commitment",
   "E": "I don't know yet"
  }
 },
 "M8_Q16": {
  "text": "For you, a marriage is only complete with: (several answers possible)",
  "options": {
   "A": "A civil marriage",
   "B": "A religious marriage",
   "C": "A customary marriage (bride price, meeting of the families)",
   "D": "No ceremony is essential to me"
  }
 },
 "M8_Q19": {
  "text": "Living together before marriage:",
  "options": {
   "A": "Ruled out for me",
   "B": "Only after an engagement",
   "C": "Possible once the relationship is solid",
   "D": "Desirable, to really get to know each other"
  }
 },
 "V82_M8_05": {
  "text": "If one of you wanted to settle permanently in another country, what would your position be?",
  "options": {
   "A": "I am open to building that plan",
   "B": "I could accept it with concrete guarantees",
   "C": "I want to stay in my current country for the long term",
   "D": "I don't know yet"
  }
 },
 "M0_Q09": {
  "text": "Do you smoke?",
  "options": {
   "A": "No, never",
   "B": "Occasionally",
   "C": "Yes, regularly"
  }
 },
 "M0_Q11": {
  "text": "Tobacco in a partner:",
  "options": {
   "A": "I couldn’t live with it",
   "B": "Acceptable if it stays occasional",
   "C": "Doesn’t matter to me",
   "D": "Acceptable if never at home or around children"
  }
 },
 "M0_Q12": {
  "text": "Do you drink alcohol yourself?",
  "options": {
   "A": "Never",
   "B": "Only on occasions (celebrations, meals)",
   "C": "Every week",
   "D": "Almost every day"
  }
 },
 "M0_Q13": {
  "text": "Alcohol in a partner:",
  "options": {
   "A": "I couldn’t live with it, even occasionally",
   "B": "Acceptable if it stays occasional",
   "C": "Doesn’t matter to me",
   "D": "Acceptable in moderation, never drunk"
  }
 },
 "M0_Q15": {
  "text": "Yourself, gambling (sports betting, casino, lottery):",
  "options": {
   "A": "Never",
   "B": "Rarely, for fun",
   "C": "Every week",
   "D": "Almost every day"
  }
 },
 "M0_Q16": {
  "text": "Gambling (sports betting, casino, lottery) in a partner:",
  "options": {
   "A": "I couldn’t accept it, even rarely",
   "B": "Acceptable if it stays rare and low-stakes",
   "C": "Doesn’t matter to me"
  }
 },
 "V82_M1_01": {
  "text": "Which cultures, family languages or traditions matter in your identity? (two at most, optional)",
  "options": {
   "A": "Guided free entry (country, people, region, language)",
   "B": "I prefer not to answer"
  }
 },
 "M1_Q16": {
  "text": "Your religion or belief:",
  "options": {
   "A": "Christian: Catholic",
   "B": "Christian: Protestant or Evangelical",
   "C": "Christian: another Church",
   "D": "Muslim",
   "E": "Jewish",
   "F": "Buddhist",
   "K": "Hindu",
   "G": "A traditional or ancestral religion",
   "H": "A personal spirituality, without religion",
   "I": "No religion",
   "J": "Another religion",
   "L": "Agnostic",
   "M": "Atheist",
   "N": "I prefer not to answer"
  }
 },
 "V82_M1_02": {
  "text": "Do your religious or philosophical beliefs guide your major decisions as a couple?",
  "options": {
   "A": "Yes, they are central and I want them to be shared",
   "B": "Yes, but a difference remains compatible with my outlook",
   "C": "A little, as long as respect is mutual",
   "D": "No, not really",
   "E": "I prefer not to answer"
  }
 },
 "M1_Q17": {
  "text": "Your religious practice (prayer, services, fasting…):",
  "options": {
   "A": "Every day",
   "B": "Every week",
   "C": "Mostly for religious holidays and major occasions",
   "D": "Rarely or never",
   "E": "I prefer not to answer"
  }
 },
 "M1_Q18": {
  "text": "If the person you love did not share your religion or beliefs:",
  "options": {
   "A": "It wouldn’t be possible: I’m looking for someone who shares them",
   "B": "It would be a condition: they would have to adopt mine before marriage",
   "C": "I would wish for it, without making it a condition",
   "D": "We would each keep our own, respecting the other’s",
   "E": "I could adopt theirs myself"
  }
 },
 "M1_Q19": {
  "text": "Your eating habits (religious rules or convictions):",
  "options": {
   "A": "I eat halal, strictly",
   "B": "I eat kosher, strictly",
   "C": "I’m vegetarian or vegan",
   "D": "Another strict rule (religious or personal)",
   "E": "A few rules, which I adapt to the context",
   "F": "No rules: I eat everything",
   "G": "I prefer not to answer"
  }
 },
 "V82_M1_03": {
  "text": "What place would you like each partner’s traditions to have in your future home?",
  "options": {
   "A": "We would mostly share the same traditions",
   "B": "We would build a balance between our two cultures",
   "C": "Each of us could keep our own practices",
   "D": "We would decide case by case",
   "E": "I don't know yet"
  }
 },
 "V82_M1_04": {
  "text": "If your families disapproved of your union for cultural or religious reasons, how would you decide?",
  "options": {
   "A": "Their approval would be essential",
   "B": "I would seek mediation before deciding",
   "C": "I would listen to them, then we would decide together",
   "D": "Our choice as a couple would come first, even without their approval"
  }
 },
 "M4_Q17": {
  "text": "The bride price for your marriage:",
  "options": {
   "A": "Essential: my marriage won’t happen without it",
   "B": "Important, in a symbolic or modernised form",
   "C": "Not part of my culture, but I would respect it in my partner’s",
   "D": "I don’t adhere to it, even if my partner cares about it",
   "E": "I prefer not to answer"
  }
 },
 "V82_M4_08": {
  "text": "The Mahr (the gift from husband to wife required in an Islamic marriage) for your marriage:",
  "options": {
   "A": "Essential: our marriage will not happen without a Mahr",
   "B": "Important, with a form or amount we decide together",
   "C": "It is not part of my beliefs, but I would respect it if my partner cares about it",
   "D": "I don't subscribe to it, even if my partner cares about it",
   "E": "I prefer not to answer"
  }
 },
 "M1_Q20": {
  "text": "For your own relationship, polygamy (one husband with several wives):",
  "options": {
   "A": "Ruled out, not open to discussion",
   "B": "Ruled out, but I’m willing to talk about it",
   "C": "Conceivable if everyone consents, within a religious or customary framework",
   "D": "I don’t have a settled position yet",
   "E": "I prefer not to answer"
  }
 },
 "V82_M8_03": {
  "text": "What kind of exclusivity are you looking for in a lasting relationship?",
  "options": {
   "A": "Mutual emotional and sexual exclusivity",
   "B": "Exclusivity, with limits to define together",
   "C": "I am open to other forms of relationship, with everyone's consent",
   "D": "I don't know yet",
   "E": "I prefer not to answer"
  }
 },
 "M6_Q19": {
  "text": "In your view, which of these behaviours by your partner would already be unfaithful? (several answers possible)",
  "options": {
   "A": "Exchanging flirtatious messages with someone else",
   "B": "Keeping an active profile on a dating app",
   "C": "Confiding in someone else what they don’t tell me",
   "D": "Seeing an ex without telling me",
   "E": "Kissing someone else",
   "F": "Watching adult content",
   "G": "None of these: only a physical relationship counts"
  }
 },
 "M10_Q17": {
  "text": "Physical intimacy before marriage:",
  "options": {
   "A": "Ruled out for me: I’m waiting for marriage",
   "B": "I’d rather wait for a serious commitment (engagement, official plans)",
   "C": "Possible once the relationship is solid, without waiting for an official commitment",
   "D": "I’d rather talk about it directly with the person",
   "E": "I prefer not to answer"
  }
 },
 "V82_M8_04": {
  "text": "If you raise children, which approach seems fairest to you?",
  "options": {
   "A": "A firm, explained and consistent framework",
   "B": "Lots of dialogue, with age-appropriate rules",
   "C": "Broad autonomy within a safe framework",
   "D": "I would decide according to the child and with the other parent",
   "E": "I prefer not to answer"
  }
 },
 "M8_Q18": {
  "text": "In which religion would you raise your children?",
  "options": {
   "A": "In my religion — it’s essential",
   "B": "In one of ours, chosen together",
   "C": "In both our traditions; they’ll choose later",
   "D": "Without a religious upbringing"
  }
 },
 "M8_Q20": {
  "text": "A smack or spanking to discipline a child:",
  "options": {
   "A": "It’s part of a good upbringing",
   "B": "Acceptable in exceptional cases",
   "C": "I’d rather avoid it",
   "D": "Never: it’s a form of violence"
  }
 },
 "M8_Q10": {
  "text": "Which of these signs would make you run quickly? (3 at most)",
  "options": {
   "A": "Very fast, overwhelming declarations of love",
   "B": "Controlling jealousy: phone searched, location demanded",
   "C": "Disappearing for days without explanation, then coming back as if nothing happened",
   "D": "Staying vague about intentions: “we’ll see”, no commitment",
   "E": "Badmouthing all their exes",
   "F": "Being rude to waiters, strangers or their family",
   "G": "Relying on the other person’s money to live",
   "H": "Never admitting they were wrong",
   "I": "Not respecting a “no” or a boundary",
   "J": "Eyes glued to their phone during time together"
  }
 },
 "M8_Q12": {
  "text": "Which of these topics are non-negotiable for you, to the point that a disagreement would make you give up the relationship? (3 at most)",
  "options": {
   "A": "Having children, or not",
   "B": "Religion and its practice",
   "C": "Fidelity",
   "D": "How money is managed",
   "E": "Where we live",
   "F": "The place of family in the couple",
   "G": "Physical intimacy before marriage",
   "H": "Polygamy",
   "I": "Tobacco or alcohol",
   "J": "The roles of men and women in the home",
   "K": "None: for me, everything can be discussed"
  }
 },
 "V82_M2_01": {
  "text": "When someone I love takes much longer than usual to reply, I worry they are pulling away.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_02": {
  "text": "I need to hear regularly that I matter to my partner.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_03": {
  "text": "If my partner wants to spend time without me, I usually feel at ease with it.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_04": {
  "text": "After a minor tension, I keep wondering for a long time whether the relationship is at risk.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M10_01": {
  "text": "What most often makes you feel a budding closeness with someone?",
  "options": {
   "A": "A deep and sincere conversation",
   "B": "Light exchanges, with plenty of humour",
   "C": "A calm presence and attentive listening",
   "D": "Concrete gestures and thoughtfulness",
   "E": "I can't tell before meeting"
  }
 },
 "V82_M10_02": {
  "text": "In a relationship that starts without photos, which pace of discovery makes you most comfortable?",
  "options": {
   "A": "Written exchanges first, then a spoken conversation",
   "B": "A spoken conversation fairly soon",
   "C": "Gradual discovery, with no timetable",
   "D": "I prefer to agree on it with the person"
  }
 },
 "V82_M10_04": {
  "text": "For you, what place should physical intimacy have in a lasting relationship?",
  "options": {
   "A": "A central place",
   "B": "An important place among others",
   "C": "A rather secondary place",
   "D": "I prefer to agree on it with the person",
   "E": "I prefer not to answer"
  }
 },
 "V82_M2_05": {
  "text": "When a relationship becomes very emotionally close, I sometimes need to step back.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_06": {
  "text": "Talking about a personal difficulty with my partner usually comes naturally to me.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_07": {
  "text": "Even when I need support, I prefer to rely only on myself.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_08": {
  "text": "I readily let my partner take care of me when I am vulnerable.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M3_01": {
  "text": "Which description best fits your last serious relationship?",
  "options": {
   "A": "I have never been in a serious relationship",
   "B": "The separation is still in progress",
   "C": "It ended less than six months ago",
   "D": "It ended more than six months ago",
   "E": "I prefer not to answer"
  }
 },
 "V82_M3_02": {
  "text": "Today, what kind of contact do you keep with your last partner?",
  "options": {
   "A": "No contact",
   "B": "Only for shared responsibilities (children, housing)",
   "C": "Cordial relations, without closeness",
   "D": "A friendship or real closeness",
   "E": "I prefer not to answer"
  }
 },
 "M3_Q12": {
  "text": "In the home where you grew up, disagreements between adults were most often settled:",
  "options": {
   "A": "By talking, sometimes heatedly, then making up",
   "B": "With shouting or arguments that kept coming back",
   "C": "With silence: problems were not talked about",
   "D": "One person decided, the others followed",
   "E": "I didn’t grow up with two adults in a couple"
  }
 },
 "V82_M6_01": {
  "text": "In an argument, I criticise who the other person is rather than a specific behaviour.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_02": {
  "text": "When I am upset, I say what I felt without attacking the other person.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_03": {
  "text": "When I feel hurt, I sometimes become sarcastic or mocking.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_04": {
  "text": "During a disagreement, I can still acknowledge my partner's efforts.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "M6_Q05": {
  "text": "Insults or hurtful words during an argument:",
  "options": {
   "A": "An absolute limit for me — unacceptable",
   "B": "Serious, but I can forgive a first time",
   "C": "Hard, but it can happen in a couple",
   "D": "I try to ignore it if it’s not recurring"
  }
 },
 "M6_Q04": {
  "text": "Physical violence in a relationship:",
  "options": {
   "A": "Immediate break-up — an absolute, non-negotiable limit",
   "B": "Unacceptable, but I would first try to talk it through",
   "C": "It depends on the circumstances",
   "D": "I don’t know how I would react"
  }
 },
 "V82_M6_05": {
  "text": "When I am criticised, my first reflex is to justify myself.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_06": {
  "text": "When things get too heated, I say I need a break and suggest coming back to it.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_07": {
  "text": "During tension, I sometimes stop responding without saying when we will talk again.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_08": {
  "text": "After an argument, I come back to it to check that we both felt heard.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M6_09": {
  "text": "Your partner wants to stop a difficult discussion and pick it up tomorrow. How do you react?",
  "options": {
   "A": "I agree and we set a time to resume",
   "B": "I agree, but I need a reassuring sign",
   "C": "I feel frustrated and would like to settle it now",
   "D": "I keep going despite their request"
  }
 },
 "V82_M2_09": {
  "text": "When I receive a hard remark, I can consider explanations other than an intention to hurt me.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_10": {
  "text": "When I get angry, I can reconsider the situation before I respond.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_11": {
  "text": "When I feel sad, I often make sure nobody sees it.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_12": {
  "text": "Even when I am upset, I rarely show my emotions.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_13": {
  "text": "Even when I don't share my partner's view, I can imagine why they feel that way.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M2_14": {
  "text": "When I read a silence as rejection, I can question that interpretation.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "V82_M9_01": {
  "text": "For an important decision you disagree on, how do you prefer to proceed?",
  "options": {
   "A": "Look for an agreement that suits us both",
   "B": "Let the person most concerned decide",
   "C": "One of us decides after hearing the other",
   "D": "Postpone until we find a compromise"
  }
 },
 "V82_M9_02": {
  "text": "I can ask clearly for what I need, without waiting for the other person to guess.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "M9_Q16": {
  "text": "When I don’t get what I want, I let it show (sulking, coldness).",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M9_03": {
  "text": "A partner should be able to keep their activities, friendships and time alone without asking for permission.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "M5_Q08": {
  "text": "Access to your partner’s phone and messages:",
  "options": {
   "A": "Total transparency — each has access to everything",
   "B": "Each keeps their phone to themselves",
   "C": "Access only in case of serious doubt",
   "D": "I’ve never thought about it"
  }
 },
 "V82_M9_05": {
  "text": "Sharing your real-time location as a couple:",
  "options": {
   "A": "I would like it, if we both decide so",
   "B": "Only occasionally (a journey, a trip)",
   "C": "I prefer not to, except in an emergency",
   "D": "I don't mind"
  }
 },
 "V82_M9_06": {
  "text": "In past relationships, I have looked at a partner's phone without their consent.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "V82_M9_07": {
  "text": "I have asked a partner to share their location when they did not want to.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "M9_Q24": {
  "text": "When my partner refuses something that concerns them (a gesture, an outing, a purchase), I insist until they give in.",
  "options": {
   "A": "Never",
   "B": "Rarely",
   "C": "Sometimes",
   "D": "Often",
   "E": "Very often",
   "NA": "Not applicable"
  }
 },
 "M6_Q24": {
  "text": "In a couple, there are situations where a slap can be understood.",
  "options": {
   "A": "Strongly disagree",
   "B": "Somewhat disagree",
   "C": "Neither agree nor disagree",
   "D": "Somewhat agree",
   "E": "Strongly agree"
  }
 },
 "M10_Q19": {
  "text": "When your partner suggests intimacy and you don’t feel like it:",
  "options": {
   "A": "I say so simply, and we find another tender moment",
   "B": "I go along with it anyway, so as not to disappoint them",
   "C": "I refuse, but I feel guilty",
   "D": "I refuse without difficulty",
   "E": "I prefer not to answer"
  }
 },
 "V82_M4_01": {
  "text": "For the expenses of a shared home, which arrangement would seem fairest to you?",
  "options": {
   "A": "A fully joint budget",
   "B": "Contributions in proportion to income",
   "C": "An equal split of shared costs",
   "D": "Separate finances with occasional agreements",
   "E": "We would decide according to our incomes and obligations"
  }
 },
 "V82_M4_02": {
  "text": "If your partner lost their job for several months while actively looking, how would you handle it?",
  "options": {
   "A": "I would support them with no deadline",
   "B": "We would set a plan and sustainable limits together",
   "C": "I would help for a while, with a clear timeline",
   "D": "I could not consider prolonged financial dependence"
  }
 },
 "M4_Q16": {
  "text": "Supporting your family financially (parents, brothers and sisters…) once you are a couple:",
  "options": {
   "A": "A regular duty: my family counts on me, it’s not up for discussion",
   "B": "Regular help, with the amount decided together",
   "C": "Occasional help, when there is a real need",
   "D": "The household’s money should not go to the extended family"
  }
 },
 "V82_M4_03": {
  "text": "Today, do you regularly support relatives financially?",
  "options": {
   "A": "No",
   "B": "Occasionally, when needed",
   "C": "Regularly, a small share of my income",
   "D": "Regularly, a large share of my income",
   "E": "I prefer not to answer"
  }
 },
 "V82_M4_04": {
  "text": "If you discovered your partner had a large loan before moving in together, which reaction would be closest to yours?",
  "options": {
   "A": "I would need full transparency before any commitment",
   "B": "I would talk about it to understand its impact on our plans",
   "C": "It would be private as long as our household is not affected",
   "D": "I don't know"
  }
 },
 "V82_M7_01": {
  "text": "I am the life of the party.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_02": {
  "text": "I sympathize with others' feelings.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_03": {
  "text": "I get chores done right away.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_04": {
  "text": "I have frequent mood swings.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_05": {
  "text": "I have a vivid imagination.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_06": {
  "text": "I don't talk a lot.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_07": {
  "text": "I am not interested in other people's problems.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_08": {
  "text": "I often forget to put things back in their proper place.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_09": {
  "text": "I am relaxed most of the time.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_10": {
  "text": "I am not interested in abstract ideas.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M4_05": {
  "text": "If one of you worked many more hours than the other, how would you share household tasks?",
  "options": {
   "A": "According to each person’s available time and total load",
   "B": "Equally, whatever the constraints",
   "C": "According to preferences and skills, adjusting as we go",
   "D": "According to predefined roles for men and women",
   "E": "We would revisit it regularly"
  }
 },
 "V82_M4_06": {
  "text": "If a shared project required lowering your standard of living for a year, what would you most likely do?",
  "options": {
   "A": "I would gladly cut back if we agree",
   "B": "I would accept with a budget and a date to review",
   "C": "I would rather postpone the project to keep our stability",
   "D": "I would refuse to lower my standard of living for long"
  }
 },
 "V82_M5_01": {
  "text": "A relative unfairly criticises your partner in front of you. What do you most often do?",
  "options": {
   "A": "I step in right away to set a boundary",
   "B": "I back my partner, then talk to the relative privately",
   "C": "I first try to understand the context",
   "D": "I let the people involved sort it out"
  }
 },
 "V82_M5_02": {
  "text": "For major decisions as a couple, what role should parents and relatives play?",
  "options": {
   "A": "Their approval is necessary",
   "B": "Their opinion matters, but we decide together",
   "C": "We inform them once the decision is made",
   "D": "We decide without family involvement"
  }
 },
 "V82_M5_03": {
  "text": "If a family member wanted to live with you for several months, how would you react?",
  "options": {
   "A": "I would welcome them naturally, even with no end date",
   "B": "I would want us to agree on a length of stay and rules",
   "C": "I would agree only in an exceptional situation",
   "D": "I don't want a long-term cohabitation"
  }
 },
 "V82_M5_04": {
  "text": "When a family obligation clashes with a commitment you made to your partner, what do you do?",
  "options": {
   "A": "I almost always put my family first",
   "B": "I explain the constraints and look for a balanced solution",
   "C": "I keep the commitment I made to my partner",
   "D": "It depends on how serious each request is"
  }
 },
 "V82_M7_11": {
  "text": "I talk to a lot of different people at parties.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_12": {
  "text": "I feel others' emotions.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_13": {
  "text": "I like order.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_14": {
  "text": "I get upset easily.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_15": {
  "text": "I have difficulty understanding abstract ideas.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_16": {
  "text": "I keep in the background.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_17": {
  "text": "I am not really interested in others.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_18": {
  "text": "I make a mess of things.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_19": {
  "text": "I seldom feel blue.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 },
 "V82_M7_20": {
  "text": "I do not have a good imagination.",
  "options": {
   "A": "Very inaccurate",
   "B": "Moderately inaccurate",
   "C": "Neither accurate nor inaccurate",
   "D": "Moderately accurate",
   "E": "Very accurate"
  }
 }
};
