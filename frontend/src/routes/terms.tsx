import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Check, Shield, Lock, FileText, ArrowLeft } from "lucide-react";
import { Perspective, Highlight } from "@/components/ui/perspective-highlight";

export const Route = createFileRoute("/terms")({
  component: TermsRoute,
});

function TermsRoute() {
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
            / legal and safety
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tightest text-foreground font-sans">
            Terms of Service
          </h1>
          <p className="max-w-[56ch] mx-auto text-text-muted text-xs md:text-sm leading-relaxed">
            Last Updated: May 27, 2026 • Please read these terms carefully before utilizing our continuous code diagnostics engines.
          </p>
        </div>

        {/* Interactive 3D Perspective Box */}
        <div className="max-w-4xl mx-auto">
          <Perspective>
            <div className="rounded-2xl border border-border/60 bg-bg-elev/40 backdrop-blur-md p-8 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.3)] space-y-8">
              
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> 1. Agreement to Terms
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  By accessing and using DevPulse (the "Service", "we", "us", or "our"), including our web application, GitHub Application integration, and database schema audit tools, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you are prohibited from using the Service.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> 2. User Accounts & Code Privacy
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  To use many features of the Service, you must connect via GitHub OAuth or register stand-alone credentials. You are entirely responsible for maintaining the confidentiality of your account credentials and permissions. 
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  <strong>Code Security Commitment:</strong> DevPulse processes your pull request diff lines strictly in-memory during real-time diagnostics scans. Your source code is <Highlight color="red">never stored permanently on our servers</Highlight> or utilized to train external LLM foundation models.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> 3. Service Scope & Fair Usage
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We grant you a limited, non-exclusive, non-transferable license to access DevPulse audits strictly in compliance with these terms. You agree not to:
                </p>
                <ul className="list-disc list-inside pl-4 text-sm text-text-muted space-y-2 leading-relaxed">
                  <li>Deploy automated scripts to scrape diagnostic reports.</li>
                  <li>Circumvent or attempt to override active user credit limits.</li>
                  <li>Exhaust model tokens through malicious looping PR webhooks.</li>
                  <li>Submit code containing illegal, malicious, or destructive payloads.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 4. Billing, Subscriptions & Dynamic Credits
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Subscribing to Developer Pro activates a monthly pool of <Highlight color="green">150 credits</Highlight>, subject to standard limits on parallel PR files. Subscriptions are billed in Indian Rupees (INR) and securely processed through our Razorpay checkout gateways.
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  Credit resets occur exactly 30 days after the plan cycle initiation. Active credits do not carry over to the subsequent billing month. You may cancel your subscription at any time directly from the user settings dashboard panel.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 5. Limitation of Liability & Warranty
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  DevPulse AI diagnostics are provided on an "AS IS" and "AS AVAILABLE" basis. While our parallel engines are designed to catch critical security vulnerabilities (such as SQL injections, concurrency locks, and N+1 database leaks), we <Highlight color="purple">do not guarantee</Highlight> that the AI outputs will be 100% complete, flawless, or free from false positives. Code deployment decisions rest solely on your engineering judgment.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> 6. Amendments to Services & Terms
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  We reserve the right, at our sole discretion, to modify or replace these terms at any time. When material adjustments occur, we will provide notification by updating the "Last Updated" timestamp at the top of this page. Continuing to utilize DevPulse after changes implies complete acceptance of updated guidelines.
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
          © {new Date().getFullYear()} DevPulse AI • Security Safeguards Active
        </div>

      </div>
    </div>
  );
}
