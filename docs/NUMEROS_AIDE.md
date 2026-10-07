# Numéros d'aide par pays

Document interne de BOLIGO, vérifié le 7 octobre 2026. Ces numéros sont ceux
que l'application envoie en message privé à un membre dont la réponse au
Sondeur évoque une détresse ou des violences (`src/journey/help-lines.ts`).

## 1. Comment l'application choisit les numéros

- Le pays vient du lieu du profil (« Ville, Pays »). Le membre peut le
  modifier.
- Pays connu : ses numéros de secours, sa ligne d'écoute et sa ligne d'aide
  aux victimes, quand elles existent.
- Pas de ligne fiable dans le pays : le message renvoie vers une personne de
  confiance, un médecin ou une association du pays, et vers les secours.
  Jamais vers la police seule.
- Pays inconnu (ou lieu vide) : message général, avec les numéros français et
  « une association de votre pays ».
- Les numéros courts (3114, 3919, 988, 142…) ne marchent en principe que
  depuis un réseau du pays.

## 2. Règle de fiabilité

Seuls les numéros de confiance **élevée** ou **moyenne** sont affichés. Un
numéro de confiance faible n'est jamais affiché. Le proxy de recherche a
bloqué l'ouverture de la plupart des pages officielles : les numéros
« moyen » ont été confirmés par des extraits de recherche, pas par la page
entière. **À faire avant l'ouverture : ouvrir les pages officielles des
numéros « moyen », ou les tester par un appel.** Revue tous les six mois,
en commençant par l'Afrique.

## 3. Tableau

| Pays | Secours | Écoute (détresse) | Violences | Confiance | Sources |
|---|---|---|---|---|---|
| France | 112 · 15 · 17 · 18 · 114 | 3114 (24 h/24) | 3919 (24 h/24) | élevée | [3114.fr](https://3114.fr/), [info.gouv.fr](https://www.info.gouv.fr/actualite/violences-sexistes-et-sexuelles-le-3919-desormais-disponible-a-toute-heure) |
| Guadeloupe, Martinique, Guyane, La Réunion | 112 · 15 · 17 · 18 · 114 | 3114 | 3919 | élevée | [ARS Guadeloupe](https://www.guadeloupe.ars.sante.fr/media/121795/download), [ARS Martinique](https://www.martinique.ars.sante.fr/media/140400/download), [ARS Guyane](https://www.guyane.ars.sante.fr/media/105136/download), [ARS Réunion](https://www.lareunion.ars.sante.fr/system/files/2025-09/CP-ARS-Journ%C3%A9e%20mondiale%20pr%C3%A9vention%20suicide-10092025_.pdf) |
| Mayotte | 112 · 15 · 17 · 18 | 3114 (pas de source propre à Mayotte) | 3919 | U et V élevée, D moyenne | [Préfecture de Mayotte](https://www.mayotte.gouv.fr/contenu/telechargement/22146/170411/file/CP%20-%20Accompagner%20les%20femmes%20victimes%20de%20violences%20conjugales.pdf) |
| Belgique | 112 · 101 | 0800 32 123 (FR) · 1813 (NL) | 0800 30 030 (FR) · 1712 (NL) | élevée | [police.be](https://www.police.be/5296/node/12684), [wallonie.be](https://www.wallonie.be/fr/violences-conjugales-et-intrafamiliales) |
| Suisse | 112 · 117 · 144 · 118 | 143 | 142 (pas un numéro d'urgence) | élevée | [ch.ch](https://www.ch.ch/fr/police), [vd.ch](https://www.vd.ch/actualites/actualite/news/26239-142-ligne-nationale-daide-aux-victimes) |
| Luxembourg | 112 · 113 | 45 45 45 (pas la nuit) | 2060 1060 | élevée (24 h/24 du 2060 1060 : moyenne) | [guichet.lu](https://guichet.public.lu/fr/citoyens/sante/services-urgence/appel-urgence.html), [454545.lu](https://454545.lu/notre-offre/telephone/) |
| Monaco | 112 · 17 · 18 | aucune retenue | aucune retenue | **à vérifier** (hors recherche) | — |
| Royaume-Uni | 999 ou 112 | 116 123 | 0808 2000 247 (Angleterre) et lignes d'Écosse, du pays de Galles, d'Irlande du Nord | élevée | [nationaldahelpline.org.uk](https://www.nationaldahelpline.org.uk/), [NHS](https://www.nhs.uk/live-well/getting-help-for-domestic-violence/) |
| Autres pays de l'UE et Norvège | 112 | aucune retenue | aucune retenue | élevée (112) | numéro d'urgence européen |
| Canada | 911 | 988 | Québec 1 800 363-9010 ; ailleurs, ligne de la province (sheltersafe.ca) | élevée | [CRTC](https://crtc.gc.ca/fra/phone/988.htm), [canada.ca](https://www.canada.ca/en/women-gender-equality/gender-based-violence/crisis-lines.html) |
| États-Unis | 911 | 988 | 1 800 799-7233 | élevée | [snohd.org](https://www.snohd.org/DocumentCenter/View/14908/Crisis-Lines---04-01-25) |
| Haïti | 114 · 115 · 116 | aucune | 8919 | U élevée, V moyenne | [gov.uk](https://www.gov.uk/foreign-travel-advice/haiti/getting-help), [PNUD](https://www.undp.org/fr/node/571656) |
| Côte d'Ivoire | 170/110/111 · 180 · 185 | 143 | 1308 | U et V élevée, D moyenne | [gov.uk](https://www.gov.uk/foreign-travel-advice/cote-d-ivoire/getting-help), [Fraternité Matin](https://www.fratmat.info/article/2641063/societe/relation-services-de-sante-et-populations-le-ministere-affiche-10-179-usagers-pour-la-ligne-verte), [famille.gouv.ci](https://famille.gouv.ci/vbg_app/public/storage/vbg/V1_Kit_Media_Engagement_National_VBG.pdf) |
| Sénégal | 17 · 18 · 1515 | aucune | 800 805 805 (8 h-17 h) | U élevée, V moyenne | [sante.gouv.sn](https://sante.gouv.sn/node/96), [femmesjuristes.org](https://femmesjuristes.org/?page_id=434) |
| Cameroun | 117 · 118 | aucune | aucune (le 116 est faible) | U moyenne | [voyage.gc.ca](https://voyage.gc.ca/assistance/ambassades-consulats/cameroun) |
| Congo RDC | 112 · 118 (Kinshasa) | aucune | 122 (pas de source après 2021) | moyenne | [UNFPA RDC](https://drc.unfpa.org/fr/news/la-ligne-122-assistance-et-orientations-des-survivantes-de-vbg-vers-les-structures-de-prise-en) |
| Congo | 117 · 118 | aucune | aucune (le 1444 est faible) | U moyenne | [travel.gc.ca](https://travel.gc.ca/destinations/congo-brazzaville) |
| Gabon | 177 · 18 · 1300 | aucune (le 1324 est faible) | 1404 | moyenne | [voyage.gc.ca](https://voyage.gc.ca/assistance/ambassades-consulats/gabon), [Gabonactu](https://gabonactu.com/blog/2024/11/29/violences-faites-aux-femmes-a-lecoute-des-victimes) |
| Bénin | 117 · 118 | aucune | aucune pour les adultes | U élevée | [gov.uk](https://www.gov.uk/foreign-travel-advice/benin/getting-help) |
| Togo | 117 · 118 | aucune | 1014 (signalement à la police) | moyenne | [gov.uk](https://www.gov.uk/government/publications/togo-information-for-survivors-of-rape-and-sexual-assault/information-for-survivors-of-rape-and-sexual-assault-in-togo) |
| Mali | 17 · 15 · 18 | aucune | 80333 | moyenne | [gov.uk](https://www.gov.uk/foreign-travel-advice/mali/getting-help), [ONU Femmes](https://www.unwomen.org/en/news/stories/2015/11/hotline-helps-prevent-gender-based-violence-in-mali) |
| Burkina Faso | 17 · 18 ; 112 hors Ouagadougou | aucune | 80 00 12 87 | moyenne | [Burkina24](https://www.burkina24.com/2021/03/02/burkina-faso-un-numero-vert-pour-lutter-contre-les-violences-basees-sur-le-genre/) |
| Niger | 17 · 15 · 18 | aucune | aucune | U moyenne | [gov.uk](https://www.gov.uk/foreign-travel-advice/niger/getting-help) |
| Guinée | 122 | aucune | aucune (le 116 est faible) | U moyenne | [gov.uk](https://www.gov.uk/foreign-travel-advice/guinea/getting-help) |
| Madagascar | 117 · 118 (17 · 18 depuis un fixe) | aucune | aucune (le 813 est faible) | U élevée | [gov.uk](https://www.gov.uk/foreign-travel-advice/madagascar/getting-help) |
| Maroc | 190 · 150 · 177 | aucune | 8350 | U élevée, V moyenne | [gov.uk](https://www.gov.uk/government/publications/domestic-abuse-information-for-victims-in-morocco/information-for-victims-of-domestic-abuse-in-morocco) |
| Algérie | 17 ou 1548 · 1055 · 14 ou 1021 | aucune | 1026 | élevée | [Algérie360](https://www.algerie360.com/algerie-un-nouveau-numero-vert-pour-proteger-les-femmes-victimes-de-violences/) |
| Tunisie | 197 · 190 · 198 · 193 | 80 10 50 50 (en journée) | 1899 | U et V élevée, D moyenne | [gov.uk](https://www.gov.uk/foreign-travel-advice/tunisia/getting-help), [Business News](https://businessnews.com.tn/2026/03/02/violences-faites-aux-femmes-en-tunisie-4-485-signalements-en-2025/1390388/) |
| Rwanda, Maurice | — | — | — | non couverts : message général | — |

## 4. Écarts entre sources, à trancher

- Sénégal : SAMU au 1515 ou au 15 (le 1515 est retenu, source du ministère).
- Cameroun : numéro du SAMU (119 ou 112), non retenu.
- Gabon : les sources britannique et canadienne divergent.
- Guinée : pompiers au 18 ou au 1717, non retenus.
- Tunisie : horaires du 80 10 50 50.

## 5. Pour modifier un numéro

Changer `src/journey/help-lines.ts`, mettre à jour ce tableau et la date en
tête, puis lancer `npx jest src/journey/help-lines.spec.ts`.
