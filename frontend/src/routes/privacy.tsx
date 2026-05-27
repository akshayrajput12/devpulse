import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Check, Shield, Lock, FileText, ArrowLeft } from "lucide-react";
import { Perspective, Highlight } from "@/components/ui/perspective-highlight";

export const Route = createFileRoute("/privacy")({
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans pb-16">
      {/* Background glowing neons */}
      <div className="absolute top-[-10%] left-[5%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[5%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute inset-0 dp-grid-bg opacity-20 pointer-events-none" />

      <AppNav />

      <div className="mx-auto max-w-[1240px] px-6 py-12 relative">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-primary transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="font-mono text-[9px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2.5 py-0.5 rounded inline-block">
            / security and privacy
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tightest text-foreground font-sans">
            Privacy Policy
          </h1>
          <p className="max-w-[56ch] mx-auto text-text-muted text-xs md:text-sm leading-relaxed">
            Last Updated: May 27, 2026 • Learn how we safeguard your developer profiles, PR git-diff lines, and account transactions.
          </p>
        </div>

        {/* Interactive 3D Perspective Box */}
        <div className="max-w-4xl mx-auto">
          <Perspective>
            <div className="rounded-2xl border border-border/60 bg-bg-elev/40 backdrop-blur-md p-8 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.3)] space-y-8">
              
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> 1. Information We Collect
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We process data solely to execute stable diagnostics and maintain subscription records. This includes:
                </p>
                <ul className="list-disc list-inside pl-4 text-sm text-text-muted space-y-2 leading-relaxed">
                  <li><strong>GitHub Profile Parameters:</strong> Avatar, User ID, user_name, and public email address.</li>
                  <li><strong>Diagnostics Targets:</strong> Public or connected private repository names, pull request titles, commit hashes, and git diff lines.</li>
                  <li><strong>Billing History:</strong> Invoice amount, billing cycle (monthly/annual), and Razorpay transaction status logs. We do not store credit card details.</li>
                  <li><strong>SMTP Notification Preferences:</strong> Recipient email addresses for automated inbox reports.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> 2. Complete Zero-Retention Code Safety
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We maintain a rigorous zero-retention architecture to guarantee code safety:
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  * <Highlight color="green">Complete Zero-Retention Code Safety:</Highlight> When you execute a PR review or database audit, we fetch diff code, slice it into context-aware chunks, and feed it directly into the AI models over TLS-encrypted channels. 
                  <br />
                  * <Highlight color="red">No Disk Caching:</Highlight> Diff payloads are cleared immediately after analysis generation. Your raw code is **never written to databases or stored permanently** on our hard drives.
                  <br />
                  * <Highlight color="purple">No AI Model Training:</Highlight> We explicitly call commercial enterprise APIs (Google Gemini and OpenAI) under data privacy agreements that prevent them from using your uploaded code chunks to train future public LLM foundation models.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> 3. Cookies & Local Cache
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We utilize technical cookies and HTML5 localStorage strictly to preserve UI session tokens, layout preferences (light/dark theme choices), and active onboarding spotlight tour configurations. We do not employ third-party tracking cookies or ad network trackers.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 4. Data Sharing & Third-Party Auditing
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We communicate with third-party service providers strictly to perform operational tasks:
                </p>
                <ul className="list-disc list-inside pl-4 text-sm text-text-muted space-y-2 leading-relaxed">
                  <li><strong>Supabase:</strong> For standard RLS-protected database storage (profile metadata and findings).</li>
                  <li><strong>Nodemailer / SMTP:</strong> To dispatch premium dark-themed HTML review reports to your designated email.</li>
                  <li><strong>Razorpay:</strong> To process secure transactions in Indian Rupees (INR) under PCI-DSS compliance.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 5. Data Security Compliance
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Our backend employs robust row-level security (RLS) policies. Only you can view your diagnostic history. All communications across your browser, Supabase brokers, GitHub, and AI gateways are encrypted via high-grade SSL/TLS protocols.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 6. Your Rights & Data Purging
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  You retain complete control of your data. You may request absolute data deletion at any time by contacting our support team or deleting your connected GitHub app credentials.
                </p>
              </div>

              {/* Founder Signature */}
              <div className="pt-6 border-t border-border/40 flex justify-end">
                <div 
                  className="text-right select-none"
                  style={{ fontFamily: "cursive" }}
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-faint block mb-1">Founder</span>
                  <span className="text-xl font-semibold text-primary hover:scale-105 transition-transform inline-block">
                    Akshay Pratap Singh
                  </span>
                </div>
              </div>

            </div>
          </Perspective>
        </div>

        {/* Page Footer operational tag */}
        <div className="mt-12 text-center font-mono text-[10px] text-text-faint uppercase tracking-wider">
          © {new Date().getFullYear()} DevPulse AI • GDPR and SOC-2 Compliant Pipelines
        </div>

      </div>
    </div>
  );
}
