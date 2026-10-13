SA = {'M1_Q02': 'V82_M1_03', 'M1_Q13': 'V82_M1_03 (+ M8_Q18 déjà actif)', 'M1_Q15': 'V82_M1_04', 'M3_Q13': 'V82_M3_02 avec M6_Q19 D',
      'M4_Q03': 'V82_M4_05 (option D) avec M8_Q12 J', 'M4_Q04': 'V82_M4_05 (option D) avec M8_Q12 J', 'M4_Q11': 'V82_M4_02', 'M4_Q12': 'V82_M4_06',
      'M5_Q02': 'V82_M5_01', 'M5_Q03': 'V82_M5_03', 'M5_Q10': 'V82_M5_04', 'M7_Q08': 'V82_M9_03', 'M7_Q36': 'V82_M8_05'}
SB = ['M4_Q10', 'M4_Q13', 'M4_Q14', 'M5_Q07', 'M5_Q09', 'M6_Q18', 'M8_Q09', 'M8_Q11', 'M8_Q13', 'M9_Q07', 'M10_Q15', 'M10_Q18', 'M7_Q02', 'M7_Q19']
COV = {'M9_Q11': 'Signal de contrôle toujours porté par M5_Q08 et M8_Q10 (liste CONTROL_TOPICS) ; comportements V82_M9_06/07 dans le circuit de sécurité.',
       'M9_Q19': 'La bouderie reste dans les sujets de fond via M9_Q16 (conservée).',
       'M2_Q07': 'Thème communication : 96 % des créneaux restent personnalisés ; réconciliation mesurée par V82_M6_08 pour le portrait.',
       'M2_Q22': 'Thème communication (96 %) ; reconnaissance et réparation mesurées par V82_M6_04 et V82_M6_08.',
       'M6_Q11': 'Thème communication (96 %) ; réparation V82_M6_08.', 'M6_Q16': 'Thème communication (96 %) ; pause constructive V82_M6_06 ; M6_Q17 partiellement relayée.',
       'M8_Q04': 'Thème communication (96 %) ; ce qui crée la proximité V82_M10_01 pour le portrait.', 'M8_Q06': 'Thème communication (96 %) ; expression des besoins V82_M9_02.',
       'M9_Q02': 'Thème communication (96 %).', 'M9_Q06': 'Thème communication (96 %) ; compromis matériel V82_M4_06.',
       'M9_Q25': 'Règle silencieuse (accord seulement) du thème communication (96 %).', 'M8_Q14': 'Règle d’accord seulement (« certains désaccords durent ») ; aucun écart produit, perte limitée à une phrase d’accord.'}
INU = {'M2_Q23': 'Sert uniquement à neutraliser une ancienne règle V6 ; un membre V8.2 n’a pas de réponse V6.',
       'M1_Q21': 'Origine culturelle : la V8.2 exclut volontairement l’origine de toute compatibilité (risque de discrimination) ; V82_M1_01 sert au portrait.',
       'M6_Q03': 'Rôle dans le Sondeur : ne jamais citer un aveu personnel. Sans réponse, rien à protéger. Le comportement est mesuré par V82_M6_05 pour le portrait.',
       'M6_Q13': 'Même rôle (aveu jamais cité) ; mépris mesuré par V82_M6_03.', 'M6_Q15': 'Même rôle (aveu jamais cité) ; retrait mesuré par V82_M6_07.',
       'M9_Q03': 'Même rôle (aveu jamais cité) ; aucun équivalent nécessaire.',
       'M2_Q19': 'Timidité : trait de personnalité ; la V8.2 n’utilise jamais les traits pour la compatibilité.',
       'M7_Q05': 'Rapport au changement : trait (ouverture, Mini-IPIP), jamais utilisé pour la compatibilité en V8.2.'}
assert len(SA) + len(SB) + len(COV) + len(INU) == 47 and not (set(SA) & set(SB) & set(COV) & set(INU))
