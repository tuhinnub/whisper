export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> array of userIds
  isSystem?: boolean;
}

export interface RoomUser {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface UserProfile {
  id: string;
  name: string;
  color: string;
}

export type WebSocketInboundMessage =
  | {
      type: 'INIT';
      roomId: string;
      users: RoomUser[];
      messages: Message[];
      typingUsers: string[];
    }
  | {
      type: 'USER_JOINED';
      user: RoomUser;
      users: RoomUser[];
      systemMessage: Message;
    }
  | {
      type: 'USER_LIST_SYNC';
      users: RoomUser[];
    }
  | {
      type: 'USER_LEFT';
      userId: string;
      username: string;
      users: RoomUser[];
      typingUsers: string[];
      systemMessage: Message;
    }
  | {
      type: 'MESSAGE';
      message: Message;
    }
  | {
      type: 'TYPING_UPDATE';
      typingUsers: string[];
    }
  | {
      type: 'REACTION_UPDATE';
      messageId: string;
      reactions: Record<string, string[]>;
    }
  | {
      type: 'ROOM_DESTRUCTED';
      reason: string;
    }
  | {
      type: 'RATE_LIMITED';
      retryAfterMs: number;
      reason: string;
    };
