import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Info, X } from 'lucide-react';
import { UserProfile } from './types';
import { THEMES, ThemeId } from './utils/theme';
import { useChatSocket } from './hooks/useChatSocket';
import { Lobby } from './components/Lobby';
import { ChatRoom } from './components/ChatRoom';
import { ThemeSelector } from './components/ThemeSelector';

export default function App() {
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whispercode_theme') as ThemeId;
      if (saved && THEMES[saved]) return saved;
    }
    return 'slate';
  });

  const [destructNotice, setDestructNotice] = useState<string | null>(null);
  const [initialRoomFromUrl, setInitialRoomFromUrl] = useState<string>('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const currentTheme = THEMES[themeId] || THEMES.slate;

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('whispercode_theme', themeId);
    } catch {
      // Storage unavailable
    }

    if (currentTheme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.setAttribute('data-theme', themeId);
  }, [themeId, currentTheme.isDark]);

  // Read URL query parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomFromUrl(roomParam.trim().toUpperCase());
    }
  }, []);

  const handleRoomDestructed = useCallback((reason: string) => {
    setActiveRoomCode(null);
    setDestructNotice(reason || 'The chat room was self-destructed and wiped.');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Hook for real-time WebSocket communication
  const {
    messages,
    users,
    typingUsers,
    status,
    rateLimitNotice,
    sendMessage,
    reportTyping,
    toggleReaction,
    destructRoom,
    leaveRoom,
  } = useChatSocket({
    roomId: activeRoomCode,
    user: currentUser || { id: '', name: '', color: '' },
    onRoomDestructed: handleRoomDestructed,
  });

  const handleJoinRoom = (roomCode: string, user: UserProfile) => {
    setCurrentUser(user);
    setActiveRoomCode(roomCode);
    setDestructNotice(null);
    window.history.replaceState({}, '', `?room=${roomCode}`);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setActiveRoomCode(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleDestructRoom = () => {
    destructRoom();
    setActiveRoomCode(null);
    setDestructNotice('You self-destructed the session. All messages have been wiped from memory.');
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className={`min-h-screen ${currentTheme.bgClass} ${currentTheme.textPrimary} font-sans transition-colors flex flex-col selection:bg-emerald-500 selection:text-white`}>
      {/* Top Bar Contract (3 zones separated by gap-8) */}
      <header className={`flex items-center justify-between gap-8 px-4 md:px-8 py-3.5 border-b ${currentTheme.borderClass} ${currentTheme.headerBg} sticky top-0 z-40 transition-colors`}>
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            if (activeRoomCode) {
              handleLeaveRoom();
            }
          }}
          className={`text-lg font-bold tracking-tight ${currentTheme.textPrimary} whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity`}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: currentTheme.accentHex }}
          >
            <Lock className="w-4 h-4" />
          </div>
          <span>WhisperCode</span>
        </button>

        {/* Zone 2: 4 clean single-line text links */}
        <nav className={`hidden md:flex items-center gap-6 text-xs font-medium ${currentTheme.textSecondary}`}>
          <button
            onClick={() => setShowSecurityModal(true)}
            className={`hover:${currentTheme.textPrimary} transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero-Retention Policy</span>
          </button>
          <span>·</span>
          <span className="whitespace-nowrap shrink-0">
            Ephemeral WebSockets
          </span>
          <span>·</span>
          <span className="whitespace-nowrap shrink-0">
            No Account Required
          </span>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeSelector currentTheme={themeId} onSelectTheme={setThemeId} />
        </div>
      </header>

      {/* Ephemeral Destruct Notification Banner */}
      {destructNotice && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-300 px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <Info className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{destructNotice}</span>
          </div>
          <button
            onClick={() => setDestructNotice(null)}
            className="p-1 hover:bg-rose-500/20 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {!activeRoomCode || !currentUser ? (
          <Lobby
            initialRoomCode={initialRoomFromUrl}
            themeId={themeId}
            onSelectTheme={setThemeId}
            onJoinRoom={handleJoinRoom}
          />
        ) : (
          <ChatRoom
            roomCode={activeRoomCode}
            user={currentUser}
            messages={messages}
            users={users}
            typingUsers={typingUsers}
            status={status}
            themeId={themeId}
            rateLimitNotice={rateLimitNotice}
            onSelectTheme={setThemeId}
            onSendMessage={sendMessage}
            onReportTyping={reportTyping}
            onToggleReaction={toggleReaction}
            onDestructRoom={handleDestructRoom}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>

      {/* Privacy & Protocol Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md ${currentTheme.cardBg} rounded-2xl border ${currentTheme.borderClass} p-6 shadow-2xl relative`}>
            <button
              onClick={() => setShowSecurityModal(false)}
              className={`absolute top-4 right-4 p-2 ${currentTheme.textSecondary} hover:${currentTheme.textPrimary}`}
              aria-label="Close security info"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`w-9 h-9 rounded-xl ${currentTheme.badgeBg} flex items-center justify-center`}>
                <Shield className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${currentTheme.textPrimary}`}>
                  Zero-Retention Privacy Model
                </h3>
                <p className={`text-xs ${currentTheme.textSecondary}`}>How temporary messaging works</p>
              </div>
            </div>
            <div className={`space-y-3 text-xs ${currentTheme.textSecondary} leading-relaxed`}>
              <p>
                <strong className={currentTheme.textPrimary}>In-Memory Only:</strong> All chat rooms and messages reside solely in volatile server RAM. No SQL database, disk cache, or external loggers are attached.
              </p>
              <p>
                <strong className={currentTheme.textPrimary}>Automatic Purge on Exit:</strong> When the last participant leaves or closes their tab, the server immediately frees memory and wipes all messages.
              </p>
              <p>
                <strong className={currentTheme.textPrimary}>Manual Self-Destruct:</strong> Any participant can tap the flame icon to immediately trigger an irreversible session burn, expelling all sockets and wiping data without delay.
              </p>
            </div>
            <button
              onClick={() => setShowSecurityModal(false)}
              className={`w-full mt-6 py-2.5 rounded-xl ${currentTheme.accentBtn} text-xs font-semibold`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
