import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-bg-elev p-6 shadow-2xl overflow-hidden"
      >
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 h-1.5 w-16 bg-gradient-to-r from-transparent to-primary/40" />

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 rounded-lg border p-2 shrink-0 ${isDanger ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-primary/20 bg-primary/10 text-primary'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground leading-snug">{title}</h3>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3 font-mono text-xs">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-text-muted hover:text-foreground hover:bg-bg-soft transition"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              isDanger
                ? 'bg-destructive text-white hover:opacity-90'
                : 'bg-primary text-black hover:opacity-90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
