export type ThemeId = 'slate' | 'light' | 'cyberpunk' | 'ocean' | 'emerald' | 'sunset';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  isDark: boolean;
  accentHex: string;
  previewBg: string;
  bgClass: string;
  headerBg: string;
  cardBg: string;
  borderClass: string;
  textPrimary: string;
  textSecondary: string;
  ownBubble: string;
  otherBubble: string;
  inputBg: string;
  accentBtn: string;
  accentText: string;
  badgeBg: string;
  description: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  slate: {
    id: 'slate',
    name: 'Stealth Slate',
    isDark: true,
    accentHex: '#10B981',
    previewBg: '#0B0F17',
    bgClass: 'bg-[#0B0F17]',
    headerBg: 'bg-[#111827]/90 backdrop-blur-md',
    cardBg: 'bg-[#111827]/80 backdrop-blur-md',
    borderClass: 'border-slate-800',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    ownBubble: 'bg-emerald-600 text-white',
    otherBubble: 'bg-slate-800 text-slate-100',
    inputBg: 'bg-slate-800/80 text-white placeholder-slate-500',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20',
    accentText: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Clean dark obsidian with emerald accents.',
  },
  light: {
    id: 'light',
    name: 'Daylight Minimal',
    isDark: false,
    accentHex: '#059669',
    previewBg: '#F8FAFC',
    bgClass: 'bg-slate-50',
    headerBg: 'bg-white/95 backdrop-blur-md',
    cardBg: 'bg-white shadow-sm',
    borderClass: 'border-slate-200',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-500',
    ownBubble: 'bg-slate-900 text-white',
    otherBubble: 'bg-slate-100 text-slate-900 border border-slate-200/60',
    inputBg: 'bg-slate-100 text-slate-900 placeholder-slate-400',
    accentBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10',
    accentText: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Crisp high-contrast daylight theme.',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    isDark: true,
    accentHex: '#EC4899',
    previewBg: '#090812',
    bgClass: 'bg-[#090812]',
    headerBg: 'bg-[#120F24]/90 backdrop-blur-md',
    cardBg: 'bg-[#120F24]/80 backdrop-blur-md',
    borderClass: 'border-fuchsia-900/50',
    textPrimary: 'text-fuchsia-50',
    textSecondary: 'text-fuchsia-300/70',
    ownBubble: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-lg shadow-pink-600/20',
    otherBubble: 'bg-[#1C1635] text-fuchsia-100 border border-fuchsia-900/40',
    inputBg: 'bg-[#1C1635] text-fuchsia-100 placeholder-fuchsia-400/50',
    accentBtn: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-pink-600/30',
    accentText: 'text-pink-400',
    badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    description: 'Dark cyber aesthetics with neon fuchsia and violet glows.',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Cobalt',
    isDark: true,
    accentHex: '#0284C7',
    previewBg: '#050D1A',
    bgClass: 'bg-[#050D1A]',
    headerBg: 'bg-[#0B192E]/90 backdrop-blur-md',
    cardBg: 'bg-[#0B192E]/80 backdrop-blur-md',
    borderClass: 'border-cyan-900/40',
    textPrimary: 'text-sky-50',
    textSecondary: 'text-sky-300/70',
    ownBubble: 'bg-sky-600 text-white shadow-lg shadow-sky-600/20',
    otherBubble: 'bg-[#102444] text-sky-100 border border-sky-900/50',
    inputBg: 'bg-[#102444] text-sky-100 placeholder-sky-400/50',
    accentBtn: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30',
    accentText: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'Deep midnight nautical blue with bright cyan highlights.',
  },
  emerald: {
    id: 'emerald',
    name: 'Terminal Matrix',
    isDark: true,
    accentHex: '#10B981',
    previewBg: '#040D07',
    bgClass: 'bg-[#040D07]',
    headerBg: 'bg-[#08180E]/90 backdrop-blur-md',
    cardBg: 'bg-[#08180E]/80 backdrop-blur-md',
    borderClass: 'border-emerald-900/50',
    textPrimary: 'text-emerald-50',
    textSecondary: 'text-emerald-400/70',
    ownBubble: 'bg-emerald-700 text-emerald-50 border border-emerald-500/30',
    otherBubble: 'bg-[#0E2616] text-emerald-100 border border-emerald-900/60',
    inputBg: 'bg-[#0E2616] text-emerald-100 placeholder-emerald-600/60 font-mono',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30',
    accentText: 'text-emerald-400 font-mono',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-mono',
    description: 'Hacker matrix aesthetic with glowing emerald phosphor accents.',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber',
    isDark: true,
    accentHex: '#F59E0B',
    previewBg: '#120B09',
    bgClass: 'bg-[#120B09]',
    headerBg: 'bg-[#1C120D]/90 backdrop-blur-md',
    cardBg: 'bg-[#1C120D]/80 backdrop-blur-md',
    borderClass: 'border-amber-900/40',
    textPrimary: 'text-amber-50',
    textSecondary: 'text-amber-300/70',
    ownBubble: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-orange-600/20',
    otherBubble: 'bg-[#291A14] text-amber-100 border border-amber-900/40',
    inputBg: 'bg-[#291A14] text-amber-100 placeholder-amber-400/50',
    accentBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30',
    accentText: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Warm espresso and golden amber dusk atmosphere.',
  },
};
