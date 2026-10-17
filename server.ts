import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Security: Disable x-powered-by header to prevent fingerprinting
app.disable('x-powered-by');

// Security: Strict body limit for REST endpoints
app.use(express.json({ limit: '32kb' }));

// Ephemeral in-memory chat state
interface Message {
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

interface RoomUser {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

interface Room {
  id: string;
  code: string;
  createdAt: number;
  lastActiveAt: number;
  users: Map<string, RoomUser>;
  messages: Message[];
  typingUsers: Set<string>;
  joinAnnouncements: Map<string, number>; // userId -> timestamp of last join broadcast
  pendingLeaves: Map<string, NodeJS.Timeout>; // userId -> grace period timeout
}

// In-memory registry of active ephemeral rooms
const rooms = new Map<string, Room>();

// Token-Bucket Rate Limiter implementation
interface RateLimiterConfig {
  maxTokens: number;
  refillRatePerSec: number;
}

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRatePerSec: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.refillRatePerSec = config.refillRatePerSec;
    this.lastRefill = Date.now();
  }

  tryConsume(cost = 1): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSec * this.refillRatePerSec);
    this.lastRefill = now;

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return { allowed: true, retryAfterMs: 0 };
    }

    const missingTokens = cost - this.tokens;
    const retryAfterMs = Math.max(300, Math.ceil((missingTokens / this.refillRatePerSec) * 1000));
    return { allowed: false, retryAfterMs };
  }
}

// Track socket session and rate-limiters
interface ClientSession {
  roomId: string;
  userId: string;
  username: string;
  isAlive: boolean;
  globalLimiter: TokenBucketRateLimiter; // Global packet rate limit across all packet types
  messageLimiter: TokenBucketRateLimiter; // Chat message pipeline
  typingLimiter: TokenBucketRateLimiter;  // Typing indicator pipeline
  reactionLimiter: TokenBucketRateLimiter; // Emoji reaction pipeline
  floodViolations: number;
}

const clientSessions = new Map<WebSocket, ClientSession>();

// Security Sanitizers: Strip control chars, bidi overrides, zero-width characters, and HTML tokens
function sanitizeText(str: unknown, maxLen = 2000): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // ASCII control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '') // BiDi override characters
    .trim()
    .slice(0, maxLen);
}

function sanitizeUsername(str: unknown, maxLen = 24): string {
  if (typeof str !== 'string') return 'Anonymous';
  const cleaned = str
    .replace(/[<>"'&/\\`]/g, '') // Strip HTML & injection delimiters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, maxLen);
  return cleaned || 'Anonymous';
}

function sanitizeId(str: unknown, maxLen = 36): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
}

function sanitizeRoomCode(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
}

function sanitizeEmoji(str: unknown): string {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim().slice(0, 8);
  return trimmed.replace(/[<>"'&/\\`\u0000-\u001F]/g, '');
}

// Broadcast payload to all sockets in a specific room
function broadcastToRoom(roomId: string, data: object, excludeSocket?: WebSocket) {
  const json = JSON.stringify(data);
  for (const [ws, session] of clientSessions.entries()) {
    if (session.roomId === roomId && ws !== excludeSocket && ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }
}

// Clean up room if no users remain and no pending leaves
function checkAndPurgeRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.users.size === 0 && room.pendingLeaves.size === 0) {
    rooms.delete(roomId);
  }
}

// REST health endpoint (strictly operational, no sensitive user data)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

// Room verification endpoint (strictly existence check, zero leak of members or messages)
app.get('/api/room/:code', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  const room = rooms.get(code);
  if (!room) {
    return res.json({ exists: false, userCount: 0 });
  }
  return res.json({
    exists: true,
    userCount: room.users.size,
  });
});

// WebSocket Server attached strictly to /ws path
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8192 });

wss.on('connection', (ws: WebSocket) => {
  const session: ClientSession = {
    roomId: '',
    userId: '',
    username: '',
    isAlive: true,
    // Global packet limiter: 30-packet burst, 15/s refill
    globalLimiter: new TokenBucketRateLimiter({ maxTokens: 30, refillRatePerSec: 15 }),
    // Message pipeline limiter: 5-message burst, 1.5/s refill
    messageLimiter: new TokenBucketRateLimiter({ maxTokens: 5, refillRatePerSec: 1.5 }),
    // Typing indicator limiter: 4-event burst, 1.0/s refill
    typingLimiter: new TokenBucketRateLimiter({ maxTokens: 4, refillRatePerSec: 1.0 }),
    // Reaction limiter: 6-event burst, 2.0/s refill
    reactionLimiter: new TokenBucketRateLimiter({ maxTokens: 6, refillRatePerSec: 2.0 }),
    floodViolations: 0,
  };
  clientSessions.set(ws, session);

  ws.on('pong', () => {
    session.isAlive = true;
  });

  ws.on('message', (rawData: string) => {
    // Security 1: Global rate-limiter check across all packet types to prevent CPU exhaustion
    const globalCheck = session.globalLimiter.tryConsume(1);
    if (!globalCheck.allowed) {
      session.floodViolations++;
      if (session.floodViolations > 15) {
        ws.close(4029, 'Rate limit exceeded');
        return;
      }
      ws.send(
        JSON.stringify({
          type: 'RATE_LIMITED',
          retryAfterMs: globalCheck.retryAfterMs,
          reason: 'Global packet rate limit exceeded. Please slow down.',
        })
      );
      return;
    }

    // Security 2: Reject oversize packets before parsing
    if (typeof rawData === 'string' && rawData.length > 8192) {
      return;
    }

    try {
      const data = JSON.parse(rawData.toString());
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return;
      }

      // Security 3: Prototype pollution guard
      if (
        Object.prototype.hasOwnProperty.call(data, '__proto__') ||
        Object.prototype.hasOwnProperty.call(data, 'constructor') ||
        Object.prototype.hasOwnProperty.call(data, 'prototype')
      ) {
        return;
      }

      const { type } = data;

      switch (type) {
        case 'JOIN': {
          const roomId = sanitizeRoomCode(data.roomId);
          const userId = sanitizeId(data.userId);
          const username = sanitizeUsername(data.username, 24);
          const userColor = typeof data.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(data.color)
            ? data.color
            : '#10B981';

          if (!roomId || !userId) return;

          let room = rooms.get(roomId);
          const isNewRoom = !room;
          if (!room) {
            room = {
              id: roomId,
              code: roomId,
              createdAt: Date.now(),
              lastActiveAt: Date.now(),
              users: new Map(),
              messages: [],
              typingUsers: new Set(),
              joinAnnouncements: new Map(),
              pendingLeaves: new Map(),
            };
            rooms.set(roomId, room);
          }

          room.lastActiveAt = Date.now();

          // Gatekeeper 1: Cancel any pending leave grace period for this user
          const pendingLeaveTimeout = room.pendingLeaves.get(userId);
          if (pendingLeaveTimeout) {
            clearTimeout(pendingLeaveTimeout);
            room.pendingLeaves.delete(userId);
          }

          // Gatekeeper 2: Supersede any old active socket for this exact user in this room
          for (const [otherWs, otherSession] of clientSessions.entries()) {
            if (otherWs !== ws && otherSession.roomId === roomId && otherSession.userId === userId) {
              otherSession.roomId = '';
              otherWs.close(4000, 'Superseded');
            }
          }

          // Gatekeeper 3: Check if join was recently announced (within 8 seconds) or user already registered
          const lastJoinAnnouncement = room.joinAnnouncements.get(userId) || 0;
          const isWithinJoinCooldown = Date.now() - lastJoinAnnouncement < 8000;
          const wasAlreadyInRoom = room.users.has(userId);

          const roomUser: RoomUser = {
            id: userId,
            name: username,
            color: userColor,
            joinedAt: wasAlreadyInRoom ? (room.users.get(userId)?.joinedAt || Date.now()) : Date.now(),
          };
          room.users.set(userId, roomUser);

          session.roomId = roomId;
          session.userId = userId;
          session.username = username;

          let systemMsg: Message | null = null;

          // Gatekeeper 4: ONLY create and broadcast system join message if NOT on cooldown and NOT already in room
          if (!wasAlreadyInRoom && !isWithinJoinCooldown) {
            room.joinAnnouncements.set(userId, Date.now());

            systemMsg = {
              id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              roomId,
              senderId: 'system',
              senderName: 'System',
              senderColor: '#64748B',
              text: isNewRoom
                ? `${username} initialized the secure session.`
                : `${username} joined the chat.`,
              timestamp: Date.now(),
              reactions: {},
              isSystem: true,
            };
            room.messages.push(systemMsg);
            if (room.messages.length > 200) room.messages.shift();
          }

          // Send current state to connecting socket
          ws.send(
            JSON.stringify({
              type: 'INIT',
              roomId,
              users: Array.from(room.users.values()),
              messages: room.messages,
              typingUsers: Array.from(room.typingUsers),
            })
          );

          // Broadcast to other participants in room
          if (systemMsg) {
            broadcastToRoom(
              roomId,
              {
                type: 'USER_JOINED',
                user: roomUser,
                users: Array.from(room.users.values()),
                systemMessage: systemMsg,
              },
              ws
            );
          } else {
            // Silent sync if user reconnected or was already announced
            broadcastToRoom(
              roomId,
              {
                type: 'USER_LIST_SYNC',
                users: Array.from(room.users.values()),
              },
              ws
            );
          }
          break;
        }

        case 'MESSAGE': {
          const targetRoomId = sanitizeRoomCode(data.roomId);
          // Security 4: Cross-room authorization guard (socket must belong to target room)
          if (!targetRoomId || session.roomId !== targetRoomId || !session.userId) {
            return;
          }

          // Security 5: TokenBucket Message Rate Limiter
          const msgRateCheck = session.messageLimiter.tryConsume(1);
          if (!msgRateCheck.allowed) {
            ws.send(
              JSON.stringify({
                type: 'RATE_LIMITED',
                retryAfterMs: msgRateCheck.retryAfterMs,
                reason: `Please wait ${Math.ceil(msgRateCheck.retryAfterMs / 1000)}s before sending another message.`,
              })
            );
            return;
          }

          const text = sanitizeText(data.text, 2000);
          if (!text) return;

          const room = rooms.get(targetRoomId);
          if (!room) return;

          const now = Date.now();

          // Security 6: Authoritative identity derived from session, ignoring spoofed client senderId
          const user = room.users.get(session.userId);
          const senderName = user ? user.name : session.username || 'Anonymous';
          const senderColor = user ? user.color : '#10B981';

          const msg: Message = {
            id: sanitizeId(data.messageId) || `msg-${now}-${Math.random().toString(36).slice(2, 7)}`,
            roomId: targetRoomId,
            senderId: session.userId,
            senderName,
            senderColor,
            text,
            timestamp: now,
            reactions: {},
            isSystem: false,
          };

          room.messages.push(msg);
          if (room.messages.length > 200) room.messages.shift();
          room.lastActiveAt = now;

          if (room.typingUsers.has(senderName)) {
            room.typingUsers.delete(senderName);
          }

          broadcastToRoom(targetRoomId, {
            type: 'MESSAGE',
            message: msg,
          });
          break;
        }

        case 'TYPING': {
          const targetRoomId = sanitizeRoomCode(data.roomId);
          if (!targetRoomId || session.roomId !== targetRoomId || !session.username) {
            return;
          }

          // Security 7: Typing rate-limiter to prevent broadcast flooding
          const typingCheck = session.typingLimiter.tryConsume(1);
          if (!typingCheck.allowed) {
            return;
          }

          const room = rooms.get(targetRoomId);
          if (!room) return;

          const isTyping = Boolean(data.isTyping);

          if (isTyping) {
            room.typingUsers.add(session.username);
          } else {
            room.typingUsers.delete(session.username);
          }

          broadcastToRoom(
            targetRoomId,
            {
              type: 'TYPING_UPDATE',
              typingUsers: Array.from(room.typingUsers),
            },
            ws
          );
          break;
        }

        case 'REACTION': {
          const targetRoomId = sanitizeRoomCode(data.roomId);
          if (!targetRoomId || session.roomId !== targetRoomId || !session.userId) {
            return;
          }

          // Security 8: Reaction rate-limiter to prevent reaction spam storms
          const reactionCheck = session.reactionLimiter.tryConsume(1);
          if (!reactionCheck.allowed) {
            return;
          }

          const room = rooms.get(targetRoomId);
          if (!room) return;

          const messageId = sanitizeId(data.messageId);
          const sanitizedEmoji = sanitizeEmoji(data.emoji);
          if (!messageId || !sanitizedEmoji) return;

          const targetMsg = room.messages.find((m) => m.id === messageId);
          if (!targetMsg) return;

          if (!targetMsg.reactions[sanitizedEmoji]) {
            targetMsg.reactions[sanitizedEmoji] = [];
          }

          const existingIndex = targetMsg.reactions[sanitizedEmoji].indexOf(session.userId);
          if (existingIndex > -1) {
            targetMsg.reactions[sanitizedEmoji].splice(existingIndex, 1);
            if (targetMsg.reactions[sanitizedEmoji].length === 0) {
              delete targetMsg.reactions[sanitizedEmoji];
            }
          } else {
            targetMsg.reactions[sanitizedEmoji].push(session.userId);
          }

          broadcastToRoom(targetRoomId, {
            type: 'REACTION_UPDATE',
            messageId,
            reactions: targetMsg.reactions,
          });
          break;
        }

        case 'DESTRUCT': {
          const targetRoomId = sanitizeRoomCode(data.roomId);
          if (!targetRoomId || session.roomId !== targetRoomId || !session.userId) {
            return;
          }

          const room = rooms.get(targetRoomId);
          if (!room) return;

          // Clear any pending timeouts
          for (const timeout of room.pendingLeaves.values()) {
            clearTimeout(timeout);
          }

          broadcastToRoom(targetRoomId, {
            type: 'ROOM_DESTRUCTED',
            reason: `${session.username || 'A participant'} self-destructed this chat session.`,
          });

          // Irreversible wipe from server RAM
          rooms.delete(targetRoomId);
          break;
        }

        case 'LEAVE': {
          handleClientExit(ws);
          break;
        }

        default:
          break;
      }
    } catch {
      // Malformed packet silently discarded
    }
  });

  ws.on('close', () => {
    handleClientExit(ws);
    clientSessions.delete(ws);
  });
});

function handleClientExit(ws: WebSocket) {
  const session = clientSessions.get(ws);
  if (!session || !session.roomId) return;

  const { roomId, userId, username } = session;
  session.roomId = ''; // Disassociate socket immediately

  const room = rooms.get(roomId);
  if (!room) return;

  // Gatekeeper: Check if user has other active open sockets in this room
  let hasOtherActiveSocket = false;
  for (const [otherWs, otherSession] of clientSessions.entries()) {
    if (
      otherWs !== ws &&
      otherWs.readyState === WebSocket.OPEN &&
      otherSession.roomId === roomId &&
      otherSession.userId === userId
    ) {
      hasOtherActiveSocket = true;
      break;
    }
  }

  if (hasOtherActiveSocket) {
    return;
  }

  // Clear any existing pending leave for this user
  const existingTimeout = room.pendingLeaves.get(userId);
  if (existingTimeout) clearTimeout(existingTimeout);

  // Gatekeeper Debounce: 3.5s grace period before broadcasting user leave
  const leaveTimeout = setTimeout(() => {
    room.pendingLeaves.delete(userId);

    // Verify user has not reconnected on another socket
    let stillActive = false;
    for (const [oWs, oSession] of clientSessions.entries()) {
      if (
        oWs.readyState === WebSocket.OPEN &&
        oSession.roomId === roomId &&
        oSession.userId === userId
      ) {
        stillActive = true;
        break;
      }
    }

    if (!stillActive && room.users.has(userId)) {
      room.users.delete(userId);
      room.typingUsers.delete(username);
      room.joinAnnouncements.delete(userId);

      const leaveMsg: Message = {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#64748B',
        text: `${username || 'A friend'} left the chat.`,
        timestamp: Date.now(),
        reactions: {},
        isSystem: true,
      };

      room.messages.push(leaveMsg);
      if (room.messages.length > 200) room.messages.shift();

      broadcastToRoom(roomId, {
        type: 'USER_LEFT',
        userId,
        username,
        users: Array.from(room.users.values()),
        typingUsers: Array.from(room.typingUsers),
        systemMessage: leaveMsg,
      });

      checkAndPurgeRoom(roomId);
    }
  }, 3500);

  room.pendingLeaves.set(userId, leaveTimeout);
}

// Heartbeat ping every 30s
const interval = setInterval(() => {
  for (const [ws, session] of clientSessions.entries()) {
    if (!session.isAlive) {
      handleClientExit(ws);
      ws.terminate();
      clientSessions.delete(ws);
      continue;
    }
    session.isAlive = false;
    ws.ping();
  }
}, 30000);

// Inactive rooms sweep every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (
      (room.users.size === 0 && room.pendingLeaves.size === 0) ||
      now - room.lastActiveAt > 2 * 60 * 60 * 1000
    ) {
      for (const timeout of room.pendingLeaves.values()) {
        clearTimeout(timeout);
      }
      rooms.delete(roomId);
    }
  }
}, 120000);

wss.on('close', () => {
  clearInterval(interval);
});

// Vite & Express Integration
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[WhisperCode] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[WhisperCode] Fatal server error:', err);
  process.exit(1);
});
