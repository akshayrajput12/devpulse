import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BlockedModalProps {
  isBlocked: boolean;
}

export function BlockedModal({ isBlocked }: BlockedModalProps) {
  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg/85 backdrop-blur-sm p-4 font-sans text-center animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-bg-elev p-8 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mb-6 animate-pulse">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">Account Suspended</h2>
        <p className="text-xs text-text-muted leading-relaxed mb-6">
          Your DevPulse developer account has been suspended by system administrative command due to profile audits or credit constraints.
        </p>
        <div className="rounded-xl border border-border bg-bg-soft/50 p-4 font-mono text-xs text-text-muted space-y-2 select-all text-center">
          <div>✉ akshayrajput2616@gmail.com</div>
          <div>📞 +91 9653814628</div>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="mt-6 w-full rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition cursor-pointer"
        >
          Logout Session
        </button>
      </div>
    </div>
  );
}
