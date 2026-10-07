# Analyse d'impact (AIPD) : Sondeur, relecture par l'IA et détection de danger

Document interne de BOLIGO, 7 octobre 2026. Première version, rédigée à partir
du code. **À relire et à signer par un juriste ou un délégué à la protection
des données avant l'ouverture au public.** Les points marqués « à valider »
sont des choix proposés, pas des avis juridiques.

Structure : modèle de la CNIL (description, nécessité et proportionnalité,
risques, mesures, avis).

## 1. Pourquoi une AIPD

Le traitement réunit plusieurs critères de la liste des lignes directrices du
CEPD (WP248) :

- données sensibles (art. 9) : vie sexuelle, santé mentale (détresse),
  violences subies, convictions religieuses ;
- personnes vulnérables : victimes de violences, personnes en détresse ;
- usage innovant : modèles d'IA qui lisent chaque réponse ;
- évaluation de personnes : lectures de journée, bilan, scores de
  compatibilité ;
- transferts hors de l'Union européenne.

Deux critères suffisent à rendre l'AIPD obligatoire (art. 35 RGPD).

## 2. Description du traitement

### 2.1 Ce que fait le Sondeur

Deux membres qui ont passé le Grand Entretien suivent un parcours de trois
jours. Chaque jour, ils répondent séparément aux mêmes questions, puis voient
les réponses de l'autre.

| Étape | Données lues | Qui traite |
|---|---|---|
| Choix des questions | écarts et accords entre les deux entretiens ; prénom, âge, genre, ville | gabarits (parcours non payé) ; modèle rédacteur puis relecteur (parcours payé) |
| Relecture de chaque réponse à l'envoi | texte de la réponse | règles du code, puis un modèle d'IA (tous les parcours) |
| Lecture de journée, question d'approfondissement, bilan | réponses des deux membres, prénom, âge | modèle rédacteur, vérifié par les règles du code (parcours payé) ; texte fixe sinon |
| Détection de danger | texte de la réponse | règles du code et modèle d'IA ; décision par une personne de l'équipe |

### 2.2 Données

- Identité réduite : prénom, âge, genre, ville. Jamais l'e-mail, le téléphone,
  l'adresse ni la photo dans les appels aux modèles.
- Réponses à l'entretien : seuls les points d'accord ou d'écart servent à
  choisir les questions. Un sujet sensible (vie intime, religion, santé,
  violences) n'est jamais repris sans le consentement explicite des deux
  membres ; sans consentement, ces réponses sont effacées.
- Réponses au Sondeur : texte libre, qui peut contenir une donnée sensible que
  le membre choisit d'écrire.
- Signalements : catégorie, date, statut, décision. Le texte reste dans la
  base, visible seulement depuis le tableau de bord.

### 2.3 Personnes concernées

Membres majeurs, en France et en Afrique francophone surtout. Les mineurs sont
exclus par les CGU ; un indice de minorité déclenche un signalement urgent.

### 2.4 Destinataires et sous-traitants

| Sous-traitant | Rôle | Lieu | Encadrement du transfert |
|---|---|---|---|
| Supabase | base de données | UE (Francfort) | sans transfert |
| Render | hébergement de l'API | États-Unis | cadre UE-États-Unis ou CCT (à vérifier) |
| OpenRouter | accès aux modèles payants | États-Unis | CCT ; routage limité aux fournisseurs qui n'entraînent pas leurs modèles sur les données |
| Anthropic (via OpenRouter) | rédacteur | États-Unis | idem |
| OpenAI (via OpenRouter) | relecteur | États-Unis | idem |
| Groq | modèle économique (modération courante) | États-Unis | CCT (à vérifier dans le DPA de Groq) |
| Daily.co | appel vidéo de 7 minutes, non enregistré | États-Unis | CCT ou cadre UE-États-Unis |
| Prestataire d'e-mails | alertes à l'équipe, sans nom ni réponse | selon le prestataire choisi | à documenter |

Aucun modèle gratuit n'est utilisé : les offres gratuites peuvent conserver ou
réutiliser les textes envoyés (`src/ai/openrouter.config.ts`).

### 2.5 Durées de conservation

Reprises de la politique de confidentialité, section 6 :

- réponses et lectures du Sondeur : durée du parcours, puis 12 mois en archive
  restreinte, puis suppression ;
- signalements et décisions : 3 ans ;
- journaux techniques : 12 mois ;
- les fournisseurs d'IA ne conservent pas les textes au-delà de ce que prévoit
  leur contrat (zéro rétention à demander quand l'offre le permet).

## 3. Finalités et bases légales

| Finalité | Base légale proposée | Donnée sensible : exception art. 9 |
|---|---|---|
| Proposer les questions et les lectures du parcours | exécution du contrat (art. 6.1.b) | consentement explicite (art. 9.2.a), recueilli avant tout sujet sensible |
| Relire chaque réponse (insulte, contact, contenu sexuel) | intérêt légitime (art. 6.1.f) : sécurité des membres | le texte sensible écrit par le membre lui-même (art. 9.2.a, consentement donné en l'écrivant, à valider) |
| Détecter un danger (détresse, menace, violence, mineur) | intérêt légitime (art. 6.1.f) ; intérêts vitaux (art. 6.1.d) en cas de danger immédiat | intérêts vitaux (art. 9.2.c) quand la personne ne peut pas consentir ; sinon 9.2.a (à valider) |
| Garder la trace des signalements | obligation de modération et défense en justice (art. 6.1.f, 9.2.f) | 9.2.f |

**À valider :** l'usage de 9.2.a pour la relecture suppose que l'information
soit claire avant la première réponse. Elle figure dans la politique de
confidentialité (section 4) et doit aussi apparaître dans l'écran de
consentement du parcours.

## 4. Nécessité et proportionnalité

- **Minimisation.** Les modèles reçoivent le prénom et l'âge, jamais un moyen
  de contact. Les réponses de l'entretien ne sortent qu'à l'état d'accords ou
  d'écarts, et les sujets sensibles seulement avec consentement.
- **Pas de décision automatique.** L'IA ne bloque que l'insulte, le contenu
  sexuel explicite et les coordonnées. Un danger met la réponse en attente et
  ferme la messagerie, mais seule une personne de l'équipe confirme et clôt un
  parcours.
- **Victimes protégées.** Le récit d'une violence subie n'est jamais refusé ni
  classé comme menace ; il ne cache rien à l'autre membre s'il est seul.
- **Échec fermé.** Quand l'IA ne répond pas, la réponse reste cachée et la
  messagerie fermée jusqu'à ce qu'une relecture aboutisse, sur tous les
  parcours.
- **Information.** Politique de confidentialité, sections 4 à 6 ; mention dans
  l'application des questions bâties sur les accords d'entretien.
- **Droits.** Accès, rectification, effacement, opposition et explication
  d'un score par l'adresse de contact. Un signalement confirmé reste conservé
  3 ans malgré une demande d'effacement (art. 17.3.e).

## 5. Risques

Gravité et vraisemblance sur l'échelle de la CNIL (1 négligeable à 4 maximale),
après les mesures en place.

| Risque | Source | Gravité | Vraisemblance | Mesures |
|---|---|---|---|---|
| Une réponse sensible est lue par l'autre membre sans que l'auteur le veuille | conception du parcours | 3 | 2 | sujets sensibles soumis au consentement des deux ; phrase d'information dans l'écran de consentement (mesure 4, à ajouter) |
| L'autre membre déduit une réponse de l'entretien | phrases d'accord | 2 | 3 | seules les réponses identiques sont reprises, jamais un sujet sensible sans accord ; information dans l'application |
| Fuite d'un texte chez un fournisseur d'IA | sous-traitant | 3 | 1 | modèles payants seulement, sans entraînement ; prénom et âge seuls |
| Une victime est prise pour un agresseur | erreur de classement | 3 | 2 | règles d'attribution, consigne au modèle, décision humaine, choix de la catégorie exigé |
| Un danger n'est pas vu (faux négatif) | détection incomplète | 4 | 2 | double détection (code et IA), échec fermé, signalement par les membres, alerte e-mail immédiate |
| Un danger est vu mais traité trop tard | astreinte absente | 4 | 3 tant que l'astreinte n'existe pas | alerte e-mail, badge et tri « Urgent », délais cibles (procédure des signalements) |
| Accès interne abusif aux réponses | personnel | 3 | 1 | tableau de bord réservé aux administrateurs, origine contrôlée, aucune copie hors du tableau de bord |
| Ré-identification par les e-mails d'alerte | messagerie | 2 | 1 | aucun nom ni texte dans l'alerte, seulement la catégorie |

## 6. Mesures restant à prendre

1. Mettre en place l'astreinte et renseigner `SAFETY_ALERT_EMAILS`
   (procédure des signalements).
2. Signer les DPA d'OpenRouter, de Groq, de Render, de Daily.co et du
   prestataire d'e-mails ; vérifier leurs clauses de transfert et demander la
   rétention zéro quand elle existe.
3. Valider avec un juriste les bases légales de la section 3, surtout 9.2.a
   pour la relecture et 9.2.c pour l'intervention en cas de danger immédiat.
4. Ajouter à l'écran de consentement du parcours une phrase sur la relecture
   par l'IA de chaque réponse et sur la détection de danger.
5. Tenir le registre des traitements (art. 30) avec ce traitement.
6. Revoir cette analyse à chaque changement de modèle, de fournisseur ou de
   règle de détection, et au moins une fois par an.

## 7. Avis

- Responsable du traitement : _à compléter_
- Délégué à la protection des données ou juriste : _à compléter_
- Avis des personnes concernées (art. 35.9) : _à recueillir, par exemple
  auprès d'un panel de membres et d'une association d'aide aux victimes_
- Décision : _à compléter_. Si le risque « danger traité trop tard » reste
  élevé, consulter la CNIL avant l'ouverture (art. 36).
