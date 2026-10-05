# Recette navigateur — résultats

Date : 2026-10-05T10:17:12.686Z · App : http://localhost:8081 · API : http://localhost:3000/api

| Étape | Résultat | Détail |
|---|---|---|
| Accueil affiché | ✅ |  |
| Accueil → formulaire d’inscription direct (CGU acceptées à l’étape 4) | ✅ |  |
| Ancienne adresse des diapositives → inscription | ✅ | http://localhost:8081/onboarding/profile-details |
| Étape 1 (identité, métier, genre, date) validée | ✅ |  |
| Étape 2 (localisation) validée | ✅ |  |
| Étape 3 (périmètre) validée | ✅ |  |
| Étape 4 : création bloquée tant que les CGU ne sont pas acceptées | ✅ |  |
| Compte créé → écran de vérification OTP | ✅ |  |
| Code OTP accepté → entretien module 0 | ✅ |  |
| Entretien : 74 questions répondues, modules 0→10 | ✅ | http://localhost:8081/interview/generation |
| Bilan de compatibilité affiché | ✅ |  |
| Bilan : aucun texte tronqué ni « undefined » | ✅ |  |
| Login API du compte créé via l'UI | ✅ |  |
| Découverte : état vide géré | ✅ |  |
| Découverte : profil compatible affiché | ✅ |  |
| Découverte : cercle = pourcentage global du serveur | ✅ | 98% / API 98 |
| Découverte : affinités sur les 11 modules du Grand Entretien | ✅ | 11 modules |
| Découverte : analyse rédigée (« Nadia, … ans, … ») | ✅ | Nadia, 25 ans, architecte à Paris, aborde sa recherche avec  |
| Découverte : aucun texte tronqué ni « undefined » | ✅ |  |
| Découverte : bloc « Sujets à aborder » (selon les piliers du profil) | ✅ | non affiché : aucun pilier < 60 % |
| Like sans crédit → « Plus de crédits disponibles » | ✅ |  |
| Formule chargée depuis le backend (15,00 €) | ✅ |  |
| Code promo validé | ✅ |  |
| Crédit ajouté côté backend après code promo | ✅ | {"credits":1} |
| Solde affiché dans la découverte = 1 crédit | ✅ |  |
| Pacte anti-ghosting exigé avant l’invitation (bouton inactif) | ✅ |  |
| Invitation envoyée (en attente de réponse) | ✅ |  |
| Crédit débité après la connexion | ✅ | {"credits":0} |
| Acceptation sans crédit refusée (NO_CREDIT) | ✅ |  |
| Partenaire accepte (API) → parcours créé | ✅ |  |
| Onglet Matchs : parcours Harmonie visible | ✅ |  |
| Jour 1 terminé → jour 2 verrouillé jusqu'au lendemain | ✅ |  |
| Jour 2 terminé → jour 3 verrouillé jusqu'au lendemain | ✅ |  |
| Sondeur : 21 réponses envoyées via l'UI | ✅ |  |
| Progression Sondeur côté backend = 21/21 | ✅ | {"hasJourney":true,"currentStep":"phase_harmonie","sondeurCompleted":false,"answeredCount":21,"totalQuestions":21,"partnerName":"Nadia","journeyId":"f9dd8b01-1e |
| Parcours en chat libre après les réponses des deux membres | ✅ | {"id":"f9dd8b01-1ea3-4ab2-aba8-7af1e17db8ba","currentStep":"chat_libre","result":"en_cours","currentDay":1,"partnerName":"Nadia","isCompleted":true,"ghosting":{ |
| Onglet Matchs : CTA « Accéder à la messagerie » affiché | ✅ |  |
| Message envoyé depuis l'app (bulle affichée) | ✅ |  |
| Message persisté côté backend | ✅ | messages=1 |
| Anti-ghosting : bandeau « Vous attendez la réponse » après mon message | ✅ |  |
| Message du partenaire reçu en temps réel (WebSocket) | ✅ |  |
| Anti-ghosting : bandeau « Nadia attend votre réponse » avec échéance | ✅ |  |
| Anti-ghosting : le partenaire voit qu’il attend, crédit rendu à l’échéance | ✅ | {"waitingOn":"partner","since":"2026-10-05T10:15:39.759Z","closeAt":"2026-10-07T10:15:39.759Z","refundOnClose":true} |
| Message insultant bloqué avant envoi (modération locale) | ✅ | Message non envoyé

Votre message contient des termes inappropriés non autorisés. |
| Fin d'appel sans appel réel (chat libre) → étape inchangée | ✅ | {"success":true,"advanced":false,"currentStep":"chat_libre"} |
| Étape vidéo : les deux membres rejoignent l'appel | ✅ | 201/201 |
| Fin d'appel vidéo (API) → étape échange de contacts | ✅ | {"success":true,"advanced":true,"currentStep":"echange_contacts"} |
| Carte « Échanger vos contacts ? » affichée | ✅ |  |
| Après mon consentement : contacts NON révélés tant que le partenaire n'a pas accepté | ✅ |  |
| Contacts révélés après double consentement | ✅ |  |
| Profil : données réelles du backend | ✅ |  |
| Profession modifiée et persistée (PATCH /profile/me) | ✅ | "Product Manager" |
| Session persistante après rechargement (token stocké) | ✅ | http://localhost:8081/discover |
| Déconnexion → écran de connexion | ✅ | http://localhost:8081/login |
| Mauvais mot de passe → message clair | ✅ | Connexion impossible

Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants. |
| Reconnexion → découverte (entretien déjà complété) | ✅ | http://localhost:8081/discover |
| Mot de passe oublié → écran de saisie du code | ✅ |  |
| Responsive android-petit (360×640) : pas de débordement horizontal | ✅ |  |
| Responsive tablette (768×1024) : pas de débordement horizontal | ✅ |  |
| Aucune erreur JavaScript non gérée pendant le parcours | ✅ |  |
