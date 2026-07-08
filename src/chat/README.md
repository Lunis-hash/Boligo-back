# Module Chat - WebSocket Integration

Ce module gère la messagerie en temps réel via WebSocket pour l'application BOLIGO.

## Architecture

- **ChatGateway**: Gère les connexions WebSocket et les événements de messagerie
- **ChatService**: Logique métier et persistance des messages via Prisma
- **ChatController**: Endpoints HTTP REST pour les opérations supplémentaires

## Configuration

Le module utilise Socket.io avec les configurations suivantes:
- CORS activé pour tous les origins
- Authentification JWT requise pour la connexion

## Événements WebSocket

### Client → Serveur

1. **joinJourney** - Rejoindre une conversation
   ```typescript
   socket.emit('joinJourney', { journeyId: 'uuid' })
   ```

2. **leaveJourney** - Quitter une conversation
   ```typescript
   socket.emit('leaveJourney', { journeyId: 'uuid' })
   ```

3. **sendMessage** - Envoyer un message
   ```typescript
   socket.emit('sendMessage', { 
     journeyId: 'uuid', 
     content: 'message text',
     type: 'texte' // optional: 'texte', 'emoji', 'vocal'
   })
   ```

4. **markAsRead** - Marquer les messages comme lus
   ```typescript
   socket.emit('markAsRead', { journeyId: 'uuid' })
   ```

5. **typing** - Indiquer que l'utilisateur est en train d'écrire
   ```typescript
   socket.emit('typing', { journeyId: 'uuid', isTyping: true })
   ```

### Serveur → Client

1. **messageHistory** - Historique des messages (après joinJourney)
   ```typescript
   socket.on('messageHistory', (messages: Message[]) => { ... })
   ```

2. **newMessage** - Nouveau message reçu
   ```typescript
   socket.on('newMessage', (message: Message) => { ... })
   ```

3. **messagesRead** - Notification que les messages sont lus
   ```typescript
   socket.on('messagesRead', ({ journeyId }) => { ... })
   ```

4. **userTyping** - Indication qu'un utilisateur écrit
   ```typescript
   socket.on('userTyping', ({ userId, isTyping }) => { ... })
   ```

5. **error** - Erreur survenue
   ```typescript
   socket.on('error', ({ message }) => { ... })
   ```

## Endpoints HTTP REST

### GET /chat/journeys/:journeyId/messages
Récupérer l'historique des messages d'une conversation

### GET /chat/unread-count
Récupérer le nombre de messages non lus pour l'utilisateur connecté

### GET /chat/journeys/:journeyId/last-message
Récupérer le dernier message d'une conversation

### POST /chat/journeys/:journeyId/read
Marquer tous les messages d'une conversation comme lus

## Connexion WebSocket

Pour se connecter au WebSocket, le client doit envoyer le token JWT:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

Ou via le header Authorization:

```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

## Sécurité

- Authentification JWT requise pour toutes les connexions
- Vérification des droits d'accès avant de rejoindre une conversation
- Seuls les participants d'un journey peuvent accéder à ses messages
- Les messages modérés (bloqués) ne sont pas transmis

## Modèle de données

Les messages sont stockés dans la table `Message` avec les champs:
- `id`: UUID
- `journeyId`: UUID de la conversation
- `senderId`: UUID de l'expéditeur
- `content`: Contenu du message
- `type`: 'texte', 'emoji', ou 'vocal'
- `sentAt`: Date d'envoi
- `isRead`: Statut de lecture
- `moderationStatus`: 'ok', 'en_verification', ou 'bloque'
