import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Ghost, RefreshCw, Hash, User, Palette } from 'lucide-react';
import { generateRandomName, getRandomColor, generateRoomCode, AVATAR_COLORS } from '../utils/nameGenerator';
import { UserProfile } from '../types';
import { THEMES, ThemeId } from '../utils/theme';

interface LobbyProps {
  initialRoomCode?: string;
  themeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onJoinRoom: (roomCode: string, user: UserProfile) => void;
}

export function Lobby({ initialRoomCode, themeId, onSelectTheme, onJoinRoom }: LobbyProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [roomCodeToCreate, setRoomCodeToCreate] = useState(generateRoomCode());
  const [roomCodeToJoin, setRoomCodeToJoin] = useState(initialRoomCode || '');
  const [username, setUsername] = useState(generateRandomName());
  const [selectedColor, setSelectedColor] = useState(getRandomColor());
  const [joinError, setJoinError] = useState('');

  const currentTheme = THEMES[themeId] || THEMES.slate;

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeToJoin(initialRoomCode.toUpperCase());
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const handleShuffleName = () => {
    setUsername(generateRandomName());
  };

  const handleShuffleCode = () => {
    setRoomCodeToCreate(generateRoomCode());
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const user: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: username.trim(),
      color: selectedColor,
    };

    onJoinRoom(roomCodeToCreate, user);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    const formattedCode = roomCodeToJoin.trim().toUpperCase();
    if (!formattedCode) {
      setJoinError('Please enter a room code');
      return;
    }

    if (!username.trim()) {
      setJoinError('Please enter a display name');
      return;
    }

    const user: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: username.trim(),
      color: selectedColor,
    };

    onJoinRoom(formattedCode, user);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-14 transition-colors">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
        <div className={`inline-flex items-center gap-2 text-xs font-semibold tracking-wider ${currentTheme.accentText} uppercase mb-3`}>
          <Zap className="w-4 h-4" />
          <span>Zero-Login Ephemeral Chat</span>
        </div>
        <h1 className={`text-3xl md:text-5xl font-extrabold tracking-tight ${currentTheme.textPrimary} mb-4`}>
          Temporary messaging with friends in one click
        </h1>
        <p className={`text-base md:text-lg ${currentTheme.textSecondary} leading-relaxed`}>
          No sign up, no passwords, no logs. Generate a code or join with an invite, chat in real time, and leave without a trace.
        </p>
      </div>

      {/* Main Action Container */}
      <div className={`max-w-md mx-auto ${currentTheme.cardBg} rounded-2xl border ${currentTheme.borderClass} shadow-xl overflow-hidden transition-colors`}>
        {/* Mode Switcher Tabs */}
        <div className={`grid grid-cols-2 p-1.5 bg-black/5 dark:bg-white/5 m-3 rounded-xl border ${currentTheme.borderClass}`}>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'create'
                ? `${currentTheme.cardBg} ${currentTheme.textPrimary} shadow-sm border ${currentTheme.borderClass}`
                : `${currentTheme.textSecondary} hover:${currentTheme.textPrimary}`
            }`}
          >
            Create New Room
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'join'
                ? `${currentTheme.cardBg} ${currentTheme.textPrimary} shadow-sm border ${currentTheme.borderClass}`
                : `${currentTheme.textSecondary} hover:${currentTheme.textPrimary}`
            }`}
          >
            Join Existing Room
          </button>
        </div>

        <div className="p-6 pt-2">
          {/* Identity Config */}
          <div className="mb-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold ${currentTheme.textPrimary} flex items-center gap-1.5`}>
                  <User className="w-3.5 h-3.5" />
                  Your Anonymous Nickname
                </label>
                <button
                  type="button"
                  onClick={handleShuffleName}
                  className={`text-xs ${currentTheme.accentText} hover:underline flex items-center gap-1 font-medium`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Shuffle
                </button>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                placeholder="Enter a temporary handle"
                className={`w-full px-3.5 py-2.5 ${currentTheme.inputBg} border ${currentTheme.borderClass} rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
              />
            </div>

            {/* Avatar Color Picker */}
            <div>
              <span className={`text-xs font-semibold ${currentTheme.textPrimary} block mb-2`}>
                Avatar Accent
              </span>
              <div className="flex items-center gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      selectedColor === c
                        ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Chat Room Theme Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-semibold ${currentTheme.textPrimary} flex items-center gap-1.5`}>
                  <Palette className="w-3.5 h-3.5" />
                  Room Theme
                </span>
                <span className={`text-[11px] ${currentTheme.textSecondary}`}>
                  {currentTheme.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(THEMES) as ThemeId[]).map((tKey) => {
                  const t = THEMES[tKey];
                  const isSelected = tKey === themeId;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => onSelectTheme(tKey)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition-all text-left ${
                        isSelected
                          ? `border-emerald-500 ring-2 ring-emerald-500/20 ${currentTheme.textPrimary} font-bold`
                          : `border-black/10 dark:border-white/10 ${currentTheme.textSecondary} hover:bg-black/5 dark:hover:bg-white/5`
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: t.accentHex }}
                      />
                      <span className="truncate">{t.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`border-t ${currentTheme.borderClass} my-5`} />

          {activeTab === 'create' ? (
            /* Create Form */
            <form onSubmit={handleCreateSubmit} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${currentTheme.textPrimary} flex items-center gap-1.5`}>
                    <Hash className="w-3.5 h-3.5" />
                    Generated Room Code
                  </label>
                  <button
                    type="button"
                    onClick={handleShuffleCode}
                    className={`text-xs ${currentTheme.textSecondary} hover:${currentTheme.textPrimary} flex items-center gap-1`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    New Code
                  </button>
                </div>
                <div className={`flex items-center justify-between p-3.5 ${currentTheme.inputBg} border ${currentTheme.borderClass} rounded-xl`}>
                  <span className={`font-mono text-xl font-bold tracking-wider ${currentTheme.accentText}`}>
                    {roomCodeToCreate}
                  </span>
                  <span className={`text-xs ${currentTheme.textSecondary}`}>
                    Share code with friends
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm ${currentTheme.accentBtn} transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2`}
              >
                <span>Launch Private Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Join Form */
            <form onSubmit={handleJoinSubmit} className="space-y-5">
              <div>
                <label className={`text-xs font-semibold ${currentTheme.textPrimary} block mb-1.5`}>
                  Enter 6-Character Room Code
                </label>
                <input
                  type="text"
                  value={roomCodeToJoin}
                  onChange={(e) => {
                    setRoomCodeToJoin(e.target.value.toUpperCase());
                    setJoinError('');
                  }}
                  placeholder="e.g. SKY-742"
                  maxLength={10}
                  className={`w-full px-3.5 py-2.5 ${currentTheme.inputBg} border ${currentTheme.borderClass} rounded-xl text-base font-mono uppercase font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                />
                {joinError && (
                  <p className="text-xs text-rose-500 mt-1.5 font-medium">
                    {joinError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm ${currentTheme.accentBtn} transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2`}
              >
                <span>Join Chat Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Feature Value Props */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-10 md:mt-14 pt-8 border-t ${currentTheme.borderClass}`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-9 h-9 rounded-xl ${currentTheme.badgeBg} border flex items-center justify-center shrink-0`}>
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${currentTheme.textPrimary}`}>
              Self-Destructing Rooms
            </h2>
            <p className={`text-xs ${currentTheme.textSecondary} mt-1 leading-relaxed`}>
              When all participants leave the room, the session and message history are wiped from server memory immediately.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className={`w-9 h-9 rounded-xl ${currentTheme.badgeBg} border flex items-center justify-center shrink-0`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${currentTheme.textPrimary}`}>
              Zero Login & Tracking
            </h2>
            <p className={`text-xs ${currentTheme.textSecondary} mt-1 leading-relaxed`}>
              No account creation, emails, phone numbers, or analytics cookies. Pick a fun alias and start messaging immediately.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className={`w-9 h-9 rounded-xl ${currentTheme.badgeBg} border flex items-center justify-center shrink-0`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${currentTheme.textPrimary}`}>
              Real-Time WebSockets
            </h2>
            <p className={`text-xs ${currentTheme.textSecondary} mt-1 leading-relaxed`}>
              Sub-10ms delivery with live typing indicators, instant emoji reactions, and QR code sharing for fast mobile invites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
