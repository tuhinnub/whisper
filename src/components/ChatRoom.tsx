import { useState, useRef, useEffect } from 'react';
import {
  Send,
  QrCode,
  Flame,
  LogOut,
  Copy,
  Check,
  Users,
  Smile,
  Shield,
  Wifi,
  WifiOff,
  Link as LinkIcon,
} from 'lucide-react';
import { Message, RoomUser, ConnectionStatus, UserProfile } from '../types';
import { THEMES, ThemeId } from '../utils/theme';
import { QRCodeModal } from './QRCodeModal';
import { DestructModal } from './DestructModal';
import { ThemeSelector } from './ThemeSelector';

interface ChatRoomProps {
  roomCode: string;
  user: UserProfile;
  messages: Message[];
  users: RoomUser[];
  typingUsers: string[];
  status: ConnectionStatus;
  themeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onSendMessage: (text: string) => void;
  onReportTyping: (isTyping: boolean) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDestructRoom: () => void;
  onLeaveRoom: () => void;
}

const COMMON_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '⚡'];

export function ChatRoom({
  roomCode,
  user,
  messages,
  users,
  typingUsers,
  status,
  themeId,
  onSelectTheme,
  onSendMessage,
  onReportTyping,
  onToggleReaction,
  onDestructRoom,
  onLeaveRoom,
}: ChatRoomProps) {
  const [inputText, setInputText] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDestructModal, setShowDestructModal] = useState(false);
  const [showUsersPopover, setShowUsersPopover] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEmojiPickerForMsg, setShowEmojiPickerForMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = THEMES[themeId] || THEMES.slate;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyRoomLink = async () => {
    try {
      const roomUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?room=${roomCode}`
        : `https://whispercode.app/?room=${roomCode}`;
      await navigator.clipboard.writeText(roomUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    onReportTyping(val.length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    inputRef.current?.focus();
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`w-full max-w-4xl mx-auto h-[calc(100vh-68px)] md:h-[calc(100vh-80px)] flex flex-col p-2 md:p-4 transition-colors`}>
      {/* Top Header Controls */}
      <header className={`flex items-center justify-between gap-3 p-3 md:px-5 ${theme.cardBg} rounded-2xl border ${theme.borderClass} shadow-sm mb-3 shrink-0 transition-colors`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className={`p-2 rounded-xl ${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
            title="Leave Room"
            aria-label="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${theme.textSecondary}`}>
                Room
              </span>
              <button
                onClick={handleCopyCode}
                className={`group flex items-center gap-1.5 font-mono text-base font-bold ${theme.textPrimary} hover:${theme.accentText} transition-colors`}
                title="Click to copy room code"
              >
                <span>{roomCode}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                )}
              </button>
            </div>
            <div className={`flex items-center gap-2 text-[11px] ${theme.textSecondary}`}>
              <span className="flex items-center gap-1">
                {status === 'connected' ? (
                  <Wifi className="w-3 h-3 text-emerald-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-amber-500" />
                )}
                {status === 'connected' ? 'Live' : 'Reconnecting...'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-500" />
                Zero-Retention
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Active Participants Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setShowUsersPopover(!showUsersPopover)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${theme.borderClass} ${theme.textPrimary} bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{users.length} Online</span>
            </button>

            {showUsersPopover && (
              <div className={`absolute right-0 mt-2 w-52 ${theme.cardBg} rounded-xl border ${theme.borderClass} shadow-xl p-3 z-30`}>
                <div className={`text-xs font-semibold ${theme.textSecondary} mb-2 px-1`}>
                  Active Participants
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: u.color }}
                      />
                      <span className={`font-medium ${theme.textPrimary} truncate`}>
                        {u.name} {u.id === user.id && '(You)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <ThemeSelector currentTheme={themeId} onSelectTheme={onSelectTheme} />

          {/* Copy Room Link Button */}
          <button
            onClick={handleCopyRoomLink}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 active:scale-[0.98] border ${
              copiedLink
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : `${theme.badgeBg}`
            }`}
            title="Copy full invite link to clipboard"
            aria-label="Copy Room Link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">Copy Room Link</span>
                <span className="sm:hidden font-semibold">Copy Link</span>
              </>
            )}
          </button>

          {/* QR Code Trigger */}
          <button
            onClick={() => setShowQRModal(true)}
            className={`p-2 rounded-xl ${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
            title="Show QR Code to invite friends"
            aria-label="Show QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Self-Destruct Trigger */}
          <button
            onClick={() => setShowDestructModal(true)}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Permanently wipe this room for all participants"
            aria-label="Self-Destruct Room"
          >
            <Flame className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <main className={`flex-1 ${theme.cardBg} rounded-2xl border ${theme.borderClass} shadow-sm p-4 overflow-y-auto space-y-3 relative transition-colors`}>
        {messages.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${theme.textSecondary}`}>
            <div className={`w-12 h-12 rounded-2xl ${theme.badgeBg} flex items-center justify-center mb-3`}>
              <Shield className="w-6 h-6" />
            </div>
            <h2 className={`text-base font-semibold ${theme.textPrimary} mb-1`}>
              Secure Ephemeral Channel
            </h2>
            <p className="text-xs max-w-xs leading-relaxed">
              Zero logs or tracking exist on any server. Send a message or share the code <strong className={`font-mono ${theme.accentText}`}>{roomCode}</strong> with friends.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={handleCopyRoomLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${theme.accentBtn} transition-all shadow-md active:scale-[0.98] flex items-center gap-1.5`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Copy Room Link</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowQRModal(true)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${theme.borderClass} ${theme.textPrimary} bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className={`text-[11px] ${theme.textSecondary} bg-black/5 dark:bg-white/5 border ${theme.borderClass} px-3 py-1 rounded-full`}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isOwn = msg.senderId === user.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group relative`}
              >
                {/* Sender Tag */}
                {!isOwn && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: msg.senderColor }}
                    />
                    <span className={`text-[11px] font-semibold ${theme.textPrimary}`}>
                      {msg.senderName}
                    </span>
                    <span className={`text-[10px] ${theme.textSecondary} font-mono tabular-nums`}>
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message Bubble + Hover Actions */}
                <div className="flex items-center gap-1.5 max-w-[85%] md:max-w-[70%]">
                  {/* Reaction trigger for own messages (left side) */}
                  {isOwn && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          setShowEmojiPickerForMsg(
                            showEmojiPickerForMsg === msg.id ? null : msg.id
                          )
                        }
                        className={`p-1 rounded-lg ${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`}
                        title="Add reaction"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words whitespace-pre-wrap ${
                      isOwn
                        ? `${theme.ownBubble} rounded-br-xs`
                        : `${theme.otherBubble} rounded-bl-xs`
                    }`}
                  >
                    {msg.text}
                    {isOwn && (
                      <div className="text-[9px] opacity-75 text-right mt-1 font-mono tabular-nums">
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    )}
                  </div>

                  {/* Reaction trigger for incoming messages (right side) */}
                  {!isOwn && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          setShowEmojiPickerForMsg(
                            showEmojiPickerForMsg === msg.id ? null : msg.id
                          )
                        }
                        className={`p-1 rounded-lg ${theme.textSecondary} hover:${theme.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`}
                        title="Add reaction"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Emoji Reaction Popup Bar */}
                {showEmojiPickerForMsg === msg.id && (
                  <div
                    className={`flex items-center gap-1 p-1 ${theme.cardBg} border ${theme.borderClass} rounded-full shadow-lg mt-1 z-10 ${
                      isOwn ? 'mr-2' : 'ml-2'
                    }`}
                  >
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onToggleReaction(msg.id, emoji);
                          setShowEmojiPickerForMsg(null);
                        }}
                        className="p-1 hover:scale-125 transition-transform text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Displayed Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                      if (!userIds || userIds.length === 0) return null;
                      const hasReacted = userIds.includes(user.id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                            hasReacted
                              ? `${theme.badgeBg} border`
                              : `bg-black/5 dark:bg-white/5 border ${theme.borderClass} ${theme.textSecondary}`
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="font-mono text-[10px] font-semibold">
                            {userIds.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className={`flex items-center gap-2 px-3 py-1.5 text-xs ${theme.textSecondary}`}>
          <div className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: theme.accentHex }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: theme.accentHex, animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: theme.accentHex, animationDelay: '300ms' }}
            />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.slice(0, 2).join(' and ')} are typing...`}
          </span>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <footer className="mt-3 shrink-0">
        <form
          onSubmit={handleSubmit}
          className={`flex items-center gap-2 p-2 ${theme.cardBg} rounded-2xl border ${theme.borderClass} shadow-sm transition-colors`}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message as ${user.name}...`}
            maxLength={2000}
            className={`flex-1 px-3 py-2 bg-transparent text-sm ${theme.textPrimary} placeholder:opacity-50 focus:outline-none`}
          />

          {/* Quick Reaction Shortcut Buttons */}
          <div className={`hidden sm:flex items-center gap-1 border-l ${theme.borderClass} pl-2`}>
            {COMMON_EMOJIS.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                className="p-1 text-sm hover:scale-125 transition-transform"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-xl ${theme.accentBtn} disabled:opacity-30 transition-all shadow-md active:scale-95`}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* Modals */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        roomCode={roomCode}
      />

      <DestructModal
        isOpen={showDestructModal}
        onClose={() => setShowDestructModal(false)}
        onConfirm={() => {
          setShowDestructModal(false);
          onDestructRoom();
        }}
        roomCode={roomCode}
      />
    </div>
  );
}
