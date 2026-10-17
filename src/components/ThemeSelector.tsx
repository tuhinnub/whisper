import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { THEMES, ThemeId, ThemeConfig } from '../utils/theme';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  variant?: 'compact' | 'full';
}

export function ThemeSelector({ currentTheme, onSelectTheme, variant = 'compact' }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeConfig = THEMES[currentTheme] || THEMES.slate;

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all active:scale-[0.98]"
        title="Change Chat Room Theme"
        aria-label="Theme Switcher"
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0"
          style={{ backgroundColor: activeConfig.accentHex }}
        />
        <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span className="hidden sm:inline">{activeConfig.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 z-50 animate-fade-in">
          <div className="px-2 py-1.5 mb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Select Chat Theme
          </div>
          <div className="space-y-1">
            {(Object.values(THEMES) as ThemeConfig[]).map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-xs flex items-center justify-center"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                    <div>
                      <div className="leading-tight">{theme.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                        {theme.isDark ? 'Dark Mode' : 'Light Mode'}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
