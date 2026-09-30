import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';
import { storage, STORAGE_KEYS } from './storage';

declare const __DEV__: boolean;

/**
 * Client Socket.IO pour la messagerie temps réel.
 *
 * Contrat serveur (ChatGateway) :
 *  - le JWT doit être fourni dans `handshake.auth.token`, sinon le serveur
 *    ferme la connexion immédiatement ;
 *  - événements client → serveur : joinJourney, leaveJourney, sendMessage,
 *    markAsRead, typing, callUser, rejectCall ;
 *  - événements serveur → client : messageHistory, newMessage, messagesRead,
 *    userTyping, incomingCall, callRejected, error.
 *
 * Une seule instance est partagée par toute l'application ; elle est
 * reconnectée automatiquement et détruite à la déconnexion de l'utilisateur.
 */
export interface ChatSocketMessage {
  id: string;
  journeyId: string;
  content: string;
  sender?: { id: string; firstName?: string; lastName?: string };
  senderId?: string;
  sentAt: string | Date;
  isRead?: boolean;
  type?: string;
}

export const SOCKET_EVENTS = {
  // client → serveur
  joinJourney: 'joinJourney',
  leaveJourney: 'leaveJourney',
  sendMessage: 'sendMessage',
  markAsRead: 'markAsRead',
  typing: 'typing',
  callUser: 'callUser',
  rejectCall: 'rejectCall',
  // serveur → client
  messageHistory: 'messageHistory',
  newMessage: 'newMessage',
  messagesRead: 'messagesRead',
  userTyping: 'userTyping',
  incomingCall: 'incomingCall',
  callRejected: 'callRejected',
  error: 'error',
} as const;

let socketInstance: Socket | null = null;
let socketToken: string | null = null;
const joinedRooms = new Set<string>();

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const debug = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

function createSocket(token: string): Socket {
  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    // Fonction évaluée à chaque (re)connexion : un token rafraîchi entre-temps
    // est automatiquement pris en compte.
    auth: (cb) => {
      storage
        .getItem(STORAGE_KEYS.accessToken)
        .then((current) => cb({ token: current || token }))
        .catch(() => cb({ token }));
    },
  });

  socket.on('connect', () => {
    debug('🔌 [Socket] connecté', socket.id);
    // Après une reconnexion, on rejoint les conversations ouvertes pour
    // recevoir à nouveau l'historique et les nouveaux messages.
    joinedRooms.forEach((journeyId) => socket.emit(SOCKET_EVENTS.joinJourney, { journeyId }));
  });
  socket.on('disconnect', (reason) => debug('🔌 [Socket] déconnecté :', reason));
  socket.on('connect_error', (err) => debug('⚠️ [Socket] erreur de connexion :', err.message));
  socket.on(SOCKET_EVENTS.error, (payload) => debug('⚠️ [Socket] erreur serveur :', payload));

  return socket;
}

/** Retourne le socket partagé, connecté avec le JWT courant. */
export const connectChatSocket = async (): Promise<Socket> => {
  const token = await storage.getItem(STORAGE_KEYS.accessToken);
  if (!token) {
    throw new Error('Utilisateur non authentifié : connexion temps réel impossible.');
  }

  if (socketInstance && socketToken !== token) {
    // Changement d'utilisateur ou de session : on repart d'une instance propre.
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
    joinedRooms.clear();
  }

  if (!socketInstance) {
    socketInstance = createSocket(token);
    socketToken = token;
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};

export const getChatSocket = (): Socket | null => socketInstance;

export const joinJourneyRoom = async (journeyId: string) => {
  const socket = await connectChatSocket();
  joinedRooms.add(journeyId);
  socket.emit(SOCKET_EVENTS.joinJourney, { journeyId });
};

export const leaveJourneyRoom = (journeyId: string) => {
  joinedRooms.delete(journeyId);
  if (socketInstance?.connected) {
    socketInstance.emit(SOCKET_EVENTS.leaveJourney, { journeyId });
  }
};

export const markJourneyAsRead = (journeyId: string) => {
  if (socketInstance?.connected) {
    socketInstance.emit(SOCKET_EVENTS.markAsRead, { journeyId });
  }
};

export const sendTypingState = (journeyId: string, isTyping: boolean) => {
  if (socketInstance?.connected) {
    socketInstance.emit(SOCKET_EVENTS.typing, { journeyId, isTyping });
  }
};

/** À appeler à la déconnexion : ferme la connexion et oublie les rooms. */
export const disconnectChatSocket = () => {
  joinedRooms.clear();
  socketToken = null;
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
};
