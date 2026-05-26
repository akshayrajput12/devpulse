import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, Zap, Shield, Lock, CreditCard, Coins, AlertTriangle, X } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({ component: PricingRoute });

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PricingRoute() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Interactive Payment Workflow States
  const [paymentState, setPaymentState] = useState<"idle" | "initiating" | "checkout_active" | "verifying" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");



  useEffect(() => {
    fetchApi("/api/pricing/plans")
      .then((data) => {
        if (data && data.length > 0) {
          setPlans(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch database plans, using offline failover:", err);
        setPlans([
          {
            id: "free",
            name: "Free Forever",
            price_monthly: 0,
            price_annual_monthly: 0,
            credits: 10,
            max_files_per_pr: 5,
            features: [
              "10 Monthly Credits",
              "Max 5 files/PR limit",
              "Google Gemini-Only routing",
              "No credit card required"
            ],
            recommended: false,
          },
          {
            id: "pro",
            name: "Developer Pro",
            price_monthly: 999,
            price_annual_monthly: 799,
            credits: 150,
            max_files_per_pr: 35,
            features: [
              "150 Monthly Credits",
              "Max 35 files/PR limit",
              "Resilient OpenAI Fallback (failover lock)",
              "Direct priority developer support"
            ],
            recommended: true,
          },
        ]);
      });
  }, []);

  const handlePurchase = async (planId: string) => {
    if (planId === "free") {
      navigate({ to: "/login" });
      return;
    }

    if (!session?.access_token) {
      toast.error("Please login to upgrade your account.");
      navigate({ to: "/login" });
      return;
    }

    setLoadingPlan(planId);
    setPaymentState("initiating");
    setErrorMsg("");
    try {
      const checkoutData = await fetchApi("/api/pricing/razorpay/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ billingCycle }),
      });

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay payment SDK. Please try again.");
        setLoadingPlan(null);
        setPaymentState("idle");
        return;
      }

      setPaymentState("checkout_active");

      const options = {
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "DevPulse",
        description: `Developer Pro Plan — ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
        image: "https://raw.githubusercontent.com/akshayrajput12/code-pulse/main/logo.png",
        order_id: checkoutData.orderId,
        prefill: {
          name: session.user?.user_metadata?.full_name || "",
          email: session.user?.email || "",
        },
        theme: {
          color: "#bef264", // matching signature primary neon-green
        },
        handler: async function (response: any) {
          try {
            setPaymentState("verifying");
            const verifyResult = await fetchApi("/api/pricing/razorpay/verify", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                billingCycle,
              }),
            });

            if (verifyResult.success) {
              setPaymentState("success");
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 4000);
            } else {
              setPaymentState("error");
              setErrorMsg("Signature verification rejected. Please contact support.");
              setLoadingPlan(null);
            }
          } catch (verifyErr: any) {
            setPaymentState("error");
            setErrorMsg(verifyErr.message || "Failed to complete signature verification.");
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            toast.info("Payment checkout cancelled.");
            setLoadingPlan(null);
            setPaymentState("idle");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPaymentState("error");
      setErrorMsg(err.message || "Failed to launch Razorpay checkout.");
      setLoadingPlan(null);
    }
  };



  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background neon orb glows */}
      <div className="absolute top-[-10%] left-[5%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[5%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />

      <AppNav />
      <div className="mx-auto max-w-[1240px] px-6 py-20 relative">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tightest text-foreground">
            Start Free. Resilient Failover.
          </h1>
          <p className="max-w-[56ch] mx-auto text-text-muted text-sm md:text-base leading-relaxed font-sans">
            All prices in Indian Rupees (INR). Razorpay secures UPI, cards, net banking, and wallets. Upgraded credits active instantly.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-6 flex justify-center">
            <div className="bg-bg-elev/60 border border-border p-1 rounded-lg flex items-center gap-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-md font-sans text-xs font-medium transition-all cursor-pointer ${billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-text-muted hover:text-foreground"
                  }`}
              >
                Monthly Plan
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 rounded-md font-sans text-xs font-medium transition-all relative flex items-center gap-1.5 cursor-pointer ${billingCycle === "annual"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-text-muted hover:text-foreground"
                  }`}
              >
                Annual Billing
                <span className="bg-sev-ok/25 text-sev-ok text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 max-w-[880px] mx-auto items-stretch">
          {plans.map((p) => {
            const isPro = p.id === "pro";
            const price = billingCycle === "annual" ? p.price_annual_monthly : p.price_monthly;
            const cadence = p.id === "free" ? "forever" : "/ month";

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-bg-elev/40 backdrop-blur-md p-8 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${p.recommended
                  ? "border-primary shadow-[0_0_50px_-15px_rgba(190,242,100,0.25)]"
                  : "border-border/60 hover:border-primary/20"
                  }`}
              >
                {p.recommended && (
                  <div className="absolute -top-3 left-8 rounded-sm bg-primary px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary-foreground flex items-center gap-1 font-semibold shadow-sm">
                    <Sparkles className="h-3 w-3" /> recommended tier
                  </div>
                )}

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{p.name}</div>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-medium tracking-tight text-foreground">₹{price}</span>
                    <span className="text-xs font-mono text-text-muted">{cadence}</span>
                  </div>
                  {billingCycle === "annual" && isPro && (
                    <div className="text-[10px] text-text-faint font-mono mt-1">
                      (Billed annually at ₹{price * 12}/year)
                    </div>
                  )}

                  {/* Limits details */}
                  <div className="mt-6 border-y border-border/40 py-4 space-y-2 font-mono text-xs text-text-muted">
                    <div className="flex justify-between">
                      <span>Monthly Credit Pool:</span>
                      <span className="text-foreground font-bold">{p.credits} Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PR Audits Limit:</span>
                      <span className="text-foreground font-bold">Max {p.max_files_per_pr} files/PR</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="mt-8 space-y-3.5 text-xs text-text-muted leading-relaxed font-sans">
                    {p.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Purchase Trigger Button */}
                <div className="mt-8 pt-4">
                  {p.id === "free" ? (
                    <Link
                      to="/login"
                      className="w-full inline-flex items-center justify-center rounded-lg border border-border bg-bg-soft hover:bg-bg-soft/75 px-4 py-3 text-xs font-semibold font-sans tracking-wider uppercase text-foreground transition"
                    >
                      Start Free Cycle
                    </Link>
                  ) : (
                    <button
                      onClick={() => handlePurchase(p.id)}
                      disabled={loadingPlan === p.id}
                      className="w-full inline-flex items-center justify-center rounded-lg bg-primary hover:bg-primary/95 hover:-translate-y-px text-primary-foreground px-4 py-3 text-xs font-semibold font-sans tracking-wider uppercase transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loadingPlan === p.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                          Spawning checkout...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 mr-2 animate-pulse text-primary-foreground fill-primary-foreground" />
                          Upgrade with Razorpay
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="font-mono text-[9px] text-text-faint uppercase tracking-wider">
            Powered securely by Razorpay • Instant payment updates • 100% SLA uptime
          </p>
        </div>
      </div>

      <style>{`
        @keyframes draw-circle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes scan-bar {
          0%, 100% {
            top: 5%;
            opacity: 0.3;
          }
          50% {
            top: 95%;
            opacity: 0.9;
          }
        }
        @keyframes float-p-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-15px) rotate(8deg) scale(1.05); }
        }
        @keyframes float-p-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-20px) rotate(-12deg) scale(0.95); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes redirect-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        .success-circle {
          stroke-dasharray: 283;
          stroke-dashoffset: 283;
          animation: draw-circle 0.9s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          transform-origin: center;
        }
        .success-check {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: draw-check 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.7s forwards;
        }
        .animate-scan {
          animation: scan-bar 4s ease-in-out infinite;
        }
        .animate-float-1 {
          animation: float-p-1 5s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-p-2 6s ease-in-out infinite;
        }
        .animate-rotate-slow {
          animation: rotate-slow 15s linear infinite;
        }
        .animate-redirect-progress {
          animation: redirect-progress 4s linear forwards;
        }
      `}</style>

      {/* ========================================================
          ACTIVE CHECKOUT & VERIFICATION STAGE BACKDROP OVERLAY
         ======================================================== */}
      {/* ========================================================
          ACTIVE CHECKOUT BACKDROP OVERLAY (z-30, non-blocking)
         ======================================================== */}
      {paymentState !== "idle" && (
        <div className="fixed inset-0 z-30 bg-black/95 backdrop-blur-xl pointer-events-none select-none animate-in fade-in duration-300">

          {/* Animated Matrix/Pulsing Cyber-Grid Background */}
          <div className="absolute inset-0 dp-grid-bg opacity-30 pointer-events-none" />

          {/* Scanning Neon green Laser Bar */}
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_#bef264,0_0_35px_#bef264] pointer-events-none animate-scan" />

          {/* Floating Cyber Elements representing what our webapp does (Payment, Code review, Credits) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Credits Token */}
            <div className="absolute top-[15%] left-[10%] opacity-20 text-primary font-mono text-3xl animate-float-1 flex items-center gap-1.5">
              <Coins className="h-6 w-6" />
              <span>+150</span>
            </div>
            {/* Code Brackets */}
            <div className="absolute bottom-[20%] left-[12%] opacity-15 text-primary font-mono text-5xl animate-float-2">
              {"{...}"}
            </div>
            {/* Git PR token */}
            <div className="absolute top-[25%] right-[15%] opacity-20 text-primary font-mono text-xs border border-primary/20 bg-primary/5 px-3 py-1.5 rounded animate-float-2">
              git commit -m "verify: sign"
            </div>
            {/* Security SSL lock */}
            <div className="absolute bottom-[15%] right-[10%] opacity-25 text-primary font-mono text-sm flex items-center gap-1.5 animate-float-1 border border-primary/20 bg-primary/5 px-2.5 py-1 rounded">
              <Lock className="h-4 w-4" />
              <span>SSL 256-bit</span>
            </div>
          </div>

          {/* Rotating Cybernetic Outer Rings in background center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="relative flex items-center justify-center animate-pulse">
              <div className="absolute w-72 h-72 border border-dashed border-primary/40 rounded-full animate-rotate-slow" />
              <div className="absolute w-56 h-56 border border-primary/20 rounded-full shadow-[0_0_80px_rgba(190,242,100,0.15)]" />
              <Shield className="w-16 h-16 text-primary" />
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          ACTIVE DIALOG CARD POPUPS (z-50, screen-blocking)
         ======================================================== */}
      {(paymentState === "verifying" || paymentState === "success" || paymentState === "error") && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">

          <div className="relative max-w-md w-full text-center space-y-8 flex flex-col items-center z-10">

            {/* Verifying Animation */}
            {paymentState === "verifying" && (
              <div className="relative flex items-center justify-center">
                {/* Rotating Cybernetic Outer Rings */}
                <div className="absolute w-44 h-44 border border-dashed border-primary/30 rounded-full animate-rotate-slow" />
                <div className="absolute w-36 h-36 border border-primary/10 rounded-full shadow-[0_0_60px_rgba(190,242,100,0.1)]" />

                {/* Scanning Center Emblem */}
                <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-primary/5 border border-primary/30 shadow-[0_0_30px_rgba(190,242,100,0.05)]">
                  <Shield className="w-12 h-12 text-primary animate-bounce" />
                </div>
              </div>
            )}

            {/* Success Animation */}
            {paymentState === "success" && (
              <div className="relative flex flex-col items-center animate-in zoom-in-90 duration-300">
                <svg className="w-24 h-24 text-primary" viewBox="0 0 100 100">
                  <circle className="success-circle" cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
                  <path className="success-check" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" d="M30 52 l14 14 l28 -28" />
                </svg>
                {/* Visual glow backdrop for checkmark */}
                <div className="absolute -z-10 w-24 h-24 rounded-full bg-primary/15 blur-[25px]" />
              </div>
            )}

            {/* Error Animation */}
            {paymentState === "error" && (
              <div className="relative flex flex-col items-center animate-in zoom-in-90 duration-300">
                <div className="w-24 h-24 flex items-center justify-center rounded-full bg-sev-crit/10 border border-sev-crit/40 relative shadow-[0_0_40px_rgba(251,113,133,0.15)]">
                  <AlertTriangle className="w-12 h-12 text-sev-crit animate-bounce" />
                </div>
              </div>
            )}

            {/* Labels and Details */}
            <div className="space-y-3">
              {paymentState === "verifying" && (
                <>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2.5 py-0.5 rounded inline-block animate-pulse">
                    / crypto auditing
                  </div>
                  <h2 className="text-2xl md:text-3xl font-medium tracking-tightest text-foreground">
                    Verifying Cryptography...
                  </h2>
                  <p className="text-text-muted text-xs max-w-[36ch] mx-auto font-sans leading-relaxed">
                    Executing backend HMAC-SHA256 signature verification and logging transactions safely to the subscription cache.
                  </p>
                </>
              )}

              {paymentState === "success" && (
                <div className="space-y-6 max-w-sm w-full bg-bg-elev/80 border border-primary rounded-xl p-6 shadow-[0_0_50px_rgba(190,242,100,0.15)] backdrop-blur-md animate-in slide-in-from-bottom-8 duration-300">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-bold">
                      TRANSACTION SUCCESSFUL
                    </span>
                    <h2 className="text-xl font-medium tracking-tightest text-foreground">
                      Developer Pro Activated!
                    </h2>
                  </div>

                  {/* High fidelity Brutalist subscription log receipt */}
                  <div className="border-t border-b border-primary/20 py-3 space-y-2 font-mono text-[10px] text-left text-text-muted">
                    <div className="flex justify-between">
                      <span>PLAN CODE :</span>
                      <span className="text-foreground font-semibold">DEV_PRO_TIER</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CREDITS POOL :</span>
                      <span className="text-primary font-semibold font-bold">+150 CREDITS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI AUDITING :</span>
                      <span className="text-foreground">RESILIENT FAILOVER</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-center">
                    <p className="text-text-faint font-mono text-[9px] uppercase tracking-wider">
                      Redirecting to dashboard in 4 seconds...
                    </p>
                    <div className="w-full h-1 bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-redirect-progress" />
                    </div>
                  </div>
                </div>
              )}

              {paymentState === "error" && (
                <div className="space-y-6 max-w-sm w-full bg-bg-elev/80 border border-sev-crit/30 rounded-xl p-6 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-8 duration-300">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-sev-crit font-bold">
                      TRANSACTION TERMINATED
                    </span>
                    <h2 className="text-xl font-medium tracking-tightest text-foreground">
                      Payment Verification Failed
                    </h2>
                  </div>

                  <div className="bg-bg-soft border border-border/80 p-3.5 rounded text-left font-mono text-[10px] text-sev-crit max-h-[80px] overflow-y-auto leading-relaxed">
                    {errorMsg || "Transaction was aborted or gateway timed out."}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentState("idle")}
                      className="flex-1 rounded bg-bg-soft hover:bg-bg-soft/80 border border-border text-foreground font-semibold font-sans text-xs py-2.5 transition cursor-pointer"
                    >
                      Close Window
                    </button>
                    <button
                      onClick={() => handlePurchase("pro")}
                      className="flex-1 rounded bg-primary hover:bg-primary/95 text-primary-foreground font-semibold font-sans text-xs py-2.5 transition shadow cursor-pointer"
                    >
                      Retry Purchase
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}    </div>
  );
}
