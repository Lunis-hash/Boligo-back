# Recette navigateur — résultats

Date : 2026-10-01T19:28:32.002Z · App : http://localhost:8081 · API : http://localhost:3000/api

| Étape | Résultat | Détail |
|---|---|---|
| Accueil affiché | ✅ |  |
| Slides : 6 écrans parcourus, CTA désactivé tant que les CGU ne sont pas cochées | ✅ |  |
| CGU acceptées → formulaire de profil | ✅ |  |
| Étape 1 (identité, métier, genre, date) validée | ✅ |  |
| Étape 2 (localisation) validée | ✅ |  |
| Étape 3 (périmètre) validée | ✅ |  |
| Compte créé → écran de vérification OTP | ✅ |  |
| Code OTP accepté → entretien module 0 | ✅ |  |
| Entretien : 61 questions répondues, modules 0→10 | ✅ | http://localhost:8081/interview/generation |
| Bilan de compatibilité affiché | ✅ |  |
| Login API du compte créé via l'UI | ✅ |  |
| Découverte : état vide géré | ✅ |  |
| Découverte : profil compatible affiché | ✅ |  |
| Découverte : bloc « Sujets à aborder » (selon les piliers du profil) | ✅ | affiché |
| Like sans crédit → « Plus de crédits disponibles » | ✅ |  |
| Formule chargée depuis le backend (15,00 €) | ✅ |  |
| Code promo validé | ✅ |  |
| Crédit ajouté côté backend après code promo | ✅ | {"credits":1} |
| Solde affiché dans la découverte = 1 crédit | ✅ |  |
| Invitation envoyée (en attente de réponse) | ✅ |  |
| Crédit débité après la connexion | ✅ | {"credits":0} |
| Partenaire accepte (API) → parcours créé | ✅ |  |
| Onglet Matchs : parcours Harmonie visible | ✅ |  |
| Jour 1 terminé → jour 2 verrouillé jusqu'au lendemain | ✅ |  |
| Jour 2 terminé → jour 3 verrouillé jusqu'au lendemain | ✅ |  |
| Sondeur : 21 réponses envoyées via l'UI | ✅ |  |
| Progression Sondeur côté backend = 21/21 | ✅ | {"hasJourney":true,"currentStep":"phase_harmonie","sondeurCompleted":false,"answeredCount":21,"totalQuestions":21,"partnerName":"Nadia","journeyId":"02401823-21 |
| Parcours en chat libre après les réponses des deux membres | ✅ | {"id":"02401823-212f-4ca0-a501-30a3bdbbcb04","currentStep":"chat_libre","currentDay":3,"partnerName":"Nadia","isCompleted":true} |
| Onglet Matchs : CTA « Accéder à la messagerie » affiché | ✅ |  |
| Message envoyé depuis l'app (bulle affichée) | ✅ |  |
| Message persisté côté backend | ✅ | messages=1 |
| Message du partenaire reçu en temps réel (WebSocket) | ✅ |  |
| Message insultant bloqué avant envoi (modération locale) | ✅ | Message non envoyé

Votre message contient des termes inappropriés non autorisés. |
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
