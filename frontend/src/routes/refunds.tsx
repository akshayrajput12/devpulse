import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Check, Shield, Lock, FileText, ArrowLeft, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/refunds")({
  component: RefundsRoute,
});

function RefundsRoute() {
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
            / pricing and refunds
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tightest text-foreground font-sans">
            Cancellation & Refund
          </h1>
          <p className="max-w-[56ch] mx-auto text-text-muted text-xs md:text-sm leading-relaxed">
            Last Updated: May 27, 2026 • Discover how we process cancellations, credit resets, and transaction adjustments transparently.
          </p>
        </div>

        {/* Refunds Box Content */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-border/60 bg-bg-elev/40 backdrop-blur-md p-8 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.3)] space-y-8 font-sans">
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 1. Subscription & Cancellation Flow
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              When you upgrade to the **Developer Pro** subscription, your account immediately receives **150 monthly credits** to process large reviews, DB concurrency analyses, and deep folder structure audits.
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              <strong>Cancel Anytime:</strong> You can terminate your active subscription recurring status at any given second through the User Settings modal on your dashboard. Once cancelled, your Pro tier features and remaining credits will continue to remain fully active until your current 30-day billing cycle officially expires.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> 2. 7-Day Refund Policy
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              We stand behind the quality of our diagnostics engines. If you are not satisfied with the depth of the AI audits, we offer a **100% money-back refund within 7 days** from your initial purchase transaction.
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              <strong>Requirement for Refunds:</strong> Refunds are granted if you have utilized **less than 15 credits** of your monthly credit pool, to prevent policy exploitation. Refund transactions exclude the non-refundable minor standard payment gateway processing fees charged by Razorpay (~2-3%).
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> 3. Processing Failures & Reinstatements
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              If an review run fails due to server outages, SMTP connection errors, or AI engine time-outs, your spent credits will be **automatically reinstated** to your active pool within minutes. If the credit update fails to reflect, reach out to our active chat support for instant manual balance adjustments.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" /> 4. How to Request a Refund
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              To request a refund:
            </p>
            <ol className="list-decimal list-inside pl-4 text-xs text-text-muted space-y-2 leading-relaxed">
              <li>Log in to your DevPulse dashboard.</li>
              <li>Find your **Review ID** or the specific billing **Order ID** sent in your receipt.</li>
              <li>Send a brief email to <span className="text-primary font-mono select-all">billing@devpulse.app</span> containing your account parameters and request details.</li>
              <li>Our finance desk will process the refund. Funds typically clear to your original payment method (UPI, NetBanking, or card) within **5 to 7 business days**.</li>
            </ol>
          </div>

        </div>

        {/* Page Footer operational tag */}
        <div className="mt-12 text-center font-mono text-[10px] text-text-faint uppercase tracking-wider">
          © {new Date().getFullYear()} DevPulse AI • Transparent Financial Gateways
        </div>

      </div>
    </div>
  );
}
