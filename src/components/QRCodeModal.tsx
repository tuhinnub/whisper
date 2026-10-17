import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export function QRCodeModal({ isOpen, onClose, roomCode }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${roomCode}`
    : `https://whispercode.app/?room=${roomCode}`;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        roomUrl,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        },
        () => {
          // Handled without logging
        }
      );
    }
  }, [isOpen, roomUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 id="qr-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
              Scan to Join Room
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No login required. Instant end-to-end temporary session.
            </p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 my-4">
          <canvas ref={canvasRef} className="rounded-lg shadow-sm max-w-[220px] max-h-[220px]" />
        </div>

        {/* Room Code Badge */}
        <div className="text-center mb-4">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unique Code:</span>
          <div className="text-2xl font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
            {roomCode}
          </div>
        </div>

        {/* Direct Link Action */}
        <button
          onClick={handleCopyLink}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 dark:text-white" />
              <span>Link Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Direct Invite Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
