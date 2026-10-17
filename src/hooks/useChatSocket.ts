import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Message,
  RoomUser,
  ConnectionStatus,
  UserProfile,
  WebSocketInboundMessage,
} from '../types';

interface UseChatSocketProps {
  roomId: string | null;
  user: UserProfile;
  onRoomDestructed?: (reason: string) => void;
}

export function useChatSocket({ roomId, user, onRoomDestructed }: UseChatSocketProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const rateLimitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // References to prevent dependency recreation cycles
  const userRef = useRef(user);
  userRef.current = user;

  const onRoomDestructedRef = useRef(onRoomDestructed);
  onRoomDestructedRef.current = onRoomDestructed;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);

  // Gatekeeper state references
  const connectionEpochRef = useRef(0);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const joinGatekeeperRef = useRef<Map<string, number>>(new Map());
  const leaveGatekeeperRef = useRef<Map<string, number>>(new Map());
  const pendingQueueRef = useRef<string[]>([]);

  // Connect function with Socket Identity Gatekeeper
  const connectSocket = useCallback((targetRoomId: string, targetUserId: string) => {
    if (!targetRoomId || !targetUserId) return;

    // Gatekeeper 1: If socket already open or connecting for this room, do not create duplicate
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Gatekeeper 2: Epoch counter to invalidate any older socket instances
    const epoch = ++connectionEpochRef.current;

    // Clean up previous socket if existing
    if (socketRef.current) {
      try {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
      } catch {
        // Ignore close error on stale socket
      }
      socketRef.current = null;
    }

    setStatus((prev) => (prev === 'disconnected' ? 'connecting' : 'reconnecting'));
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        // Gatekeeper: Check if this socket is still the active epoch
        if (connectionEpochRef.current !== epoch || socketRef.current !== ws) {
          ws.close();
          return;
        }

        setStatus('connected');
        setError(null);

        // Send JOIN payload with latest user values
        ws.send(
          JSON.stringify({
            type: 'JOIN',
            roomId: targetRoomId,
            userId: targetUserId,
            username: userRef.current.name,
            color: userRef.current.color,
          })
        );

        // Flush any pending queued messages
        if (pendingQueueRef.current.length > 0) {
          const queue = [...pendingQueueRef.current];
          pendingQueueRef.current = [];
          queue.forEach((text) => {
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            ws.send(
              JSON.stringify({
                type: 'MESSAGE',
                roomId: targetRoomId,
                messageId,
                text,
              })
            );
          });
        }
      };

      ws.onmessage = (event) => {
        // Gatekeeper: Check if this socket is still the active epoch
        if (connectionEpochRef.current !== epoch || socketRef.current !== ws) {
          return;
        }

        try {
          const data = JSON.parse(event.data) as WebSocketInboundMessage;

          switch (data.type) {
            case 'INIT': {
              seenMessageIdsRef.current.clear();
              data.messages.forEach((m) => seenMessageIdsRef.current.add(m.id));
              setMessages(data.messages);
              setUsers(data.users);
              setTypingUsers(data.typingUsers.filter((u) => u !== userRef.current.name));
              break;
            }

            case 'USER_JOINED': {
              setUsers(data.users);
              const joinUserId = data.user.id;

              // Gatekeeper: Never create duplicate join notifications for oneself
              if (joinUserId === userRef.current.id) {
                break;
              }

              // Gatekeeper: Deduplicate join notifications within 8-second window
              const now = Date.now();
              const lastJoinSeen = joinGatekeeperRef.current.get(joinUserId) || 0;
              if (now - lastJoinSeen < 8000) {
                break; // Suppress duplicate join event
              }
              joinGatekeeperRef.current.set(joinUserId, now);

              if (data.systemMessage && !seenMessageIdsRef.current.has(data.systemMessage.id)) {
                seenMessageIdsRef.current.add(data.systemMessage.id);
                setMessages((prev) => [...prev, data.systemMessage]);
              }
              break;
            }

            case 'USER_LIST_SYNC': {
              // Silent sync of online participant list (no duplicate message or popup)
              setUsers(data.users);
              break;
            }

            case 'USER_LEFT': {
              setUsers(data.users);
              setTypingUsers(data.typingUsers.filter((u) => u !== userRef.current.name));
              const leftUserId = data.userId;

              // Gatekeeper: Deduplicate leave notifications within 5-second window
              const now = Date.now();
              const lastLeaveSeen = leaveGatekeeperRef.current.get(leftUserId) || 0;
              if (now - lastLeaveSeen < 5000) {
                break;
              }
              leaveGatekeeperRef.current.set(leftUserId, now);

              if (data.systemMessage && !seenMessageIdsRef.current.has(data.systemMessage.id)) {
                seenMessageIdsRef.current.add(data.systemMessage.id);
                setMessages((prev) => [...prev, data.systemMessage]);
              }
              break;
            }

            case 'MESSAGE': {
              if (!seenMessageIdsRef.current.has(data.message.id)) {
                seenMessageIdsRef.current.add(data.message.id);
                setMessages((prev) => [...prev, data.message]);
              }
              break;
            }

            case 'TYPING_UPDATE': {
              setTypingUsers(data.typingUsers.filter((u) => u !== userRef.current.name));
              break;
            }

            case 'REACTION_UPDATE': {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === data.messageId
                    ? { ...msg, reactions: data.reactions }
                    : msg
                )
              );
              break;
            }

            case 'ROOM_DESTRUCTED': {
              isManuallyClosedRef.current = true;
              setStatus('disconnected');
              setMessages([]);
              setUsers([]);
              if (onRoomDestructedRef.current) {
                onRoomDestructedRef.current(data.reason);
              }
              break;
            }

            case 'RATE_LIMITED': {
              setRateLimitNotice(data.reason);
              if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
              rateLimitTimerRef.current = setTimeout(() => {
                setRateLimitNotice(null);
              }, data.retryAfterMs || 2000);
              break;
            }

            default:
              break;
          }
        } catch {
          // Packet parse error silently ignored to prevent client-side log leakage
        }
      };

      ws.onerror = () => {
        if (connectionEpochRef.current !== epoch || socketRef.current !== ws) return;
        setError('Connection interrupted');
      };

      ws.onclose = () => {
        // Gatekeeper: Only the active epoch may handle onclose and trigger reconnection
        if (connectionEpochRef.current !== epoch) {
          return;
        }

        socketRef.current = null;
        if (!isManuallyClosedRef.current && targetRoomId) {
          setStatus('reconnecting');
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket(targetRoomId, targetUserId);
          }, 1500);
        } else {
          setStatus('disconnected');
        }
      };
    } catch {
      setStatus('disconnected');
      setError('Connection failed');
    }
  }, []);

  // Effect strictly tied to roomId & user.id
  useEffect(() => {
    if (!roomId || !user.id) {
      if (socketRef.current) {
        try {
          socketRef.current.onopen = null;
          socketRef.current.onmessage = null;
          socketRef.current.onerror = null;
          socketRef.current.onclose = null;
          socketRef.current.close();
        } catch {
          // Ignore
        }
        socketRef.current = null;
      }
      setStatus('disconnected');
      setMessages([]);
      setUsers([]);
      joinGatekeeperRef.current.clear();
      leaveGatekeeperRef.current.clear();
      return;
    }

    isManuallyClosedRef.current = false;
    connectSocket(roomId, user.id);

    return () => {
      isManuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socketRef.current) {
        const ws = socketRef.current;
        socketRef.current = null;
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'LEAVE',
                roomId,
                userId: user.id,
              })
            );
          }
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          ws.close();
        } catch {
          // Ignore
        }
      }
    };
  }, [roomId, user.id, connectSocket]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !roomId) return;

      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        pendingQueueRef.current.push(trimmed);
        return;
      }

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      socketRef.current.send(
        JSON.stringify({
          type: 'MESSAGE',
          roomId,
          messageId,
          text: trimmed,
        })
      );

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketRef.current.send(
        JSON.stringify({
          type: 'TYPING',
          roomId,
          isTyping: false,
        })
      );
    },
    [roomId]
  );

  const reportTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !roomId) {
        return;
      }

      socketRef.current.send(
        JSON.stringify({
          type: 'TYPING',
          roomId,
          isTyping,
        })
      );

      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({
                type: 'TYPING',
                roomId,
                isTyping: false,
              })
            );
          }
        }, 1500);
      }
    },
    [roomId]
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !roomId) {
        return;
      }

      socketRef.current.send(
        JSON.stringify({
          type: 'REACTION',
          roomId,
          messageId,
          emoji,
        })
      );
    },
    [roomId]
  );

  const destructRoom = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !roomId) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: 'DESTRUCT',
        roomId,
      })
    );
  }, [roomId]);

  const leaveRoom = useCallback(() => {
    isManuallyClosedRef.current = true;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && roomId) {
      try {
        socketRef.current.send(
          JSON.stringify({
            type: 'LEAVE',
            roomId,
            userId: user.id,
          })
        );
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.onclose = null;
        socketRef.current.close();
      } catch {
        // Ignore
      }
      socketRef.current = null;
    }
    setStatus('disconnected');
    setMessages([]);
    setUsers([]);
  }, [roomId, user.id]);

  return {
    messages,
    users,
    typingUsers,
    status,
    error,
    rateLimitNotice,
    sendMessage,
    reportTyping,
    toggleReaction,
    destructRoom,
    leaveRoom,
  };
}
