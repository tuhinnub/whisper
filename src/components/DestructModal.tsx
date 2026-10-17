import { Flame, X, AlertTriangle } from 'lucide-react';

interface DestructModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roomCode: string;
}

export function DestructModal({ isOpen, onClose, onConfirm, roomCode }: DestructModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xl p-6 relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="destruct-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <Flame className="w-6 h-6 animate-pulse" />
        </div>

        <h3 id="destruct-modal-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Self-Destruct Room {roomCode}?
        </h3>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs mb-5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            All messages, participant connections, and ephemeral memory state will be wiped permanently without a trace for everyone in this room.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 active:scale-[0.98]"
          >
            Destruct Now
          </button>
        </div>
      </div>
    </div>
  );
}
