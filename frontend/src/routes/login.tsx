import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Activity, ArrowRight, Github, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// ── Eye Tracking Standalone Components ──────────────────────────────────────
interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "#1e293b",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.08s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ 
  size = 48, 
  pupilSize = 16, 
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "#1e293b",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.08s ease-out',
          }}
        />
      )}
    </div>
  );
};

// ── Main Authentication Route ───────────────────────────────────────────────
export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, Math.random() * 4000 + 3000);
      return blinkTimeout;
    };
    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, Math.random() * 4000 + 3000);
      return blinkTimeout;
    };
    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => {
            setIsPurplePeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };
      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
  }, [password, showPassword]);

  const calculateLeanPosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculateLeanPosition(purpleRef);
  const blackPos = calculateLeanPosition(blackRef);
  const yellowPos = calculateLeanPosition(yellowRef);
  const orangePos = calculateLeanPosition(orangeRef);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally { setBusy(false); }
  }

  async function github() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/dashboard",
        scopes: "read:user user:email repo",
      },
    });
    if (error) { toast.error(error.message); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 font-sans overflow-hidden bg-background">
      <div className="hidden flex-col justify-between border-r border-border bg-bg-soft/40 p-12 lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-primary/3 rounded-full blur-3xl pointer-events-none" />

        <a href="/" className="relative z-20 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-primary text-slate-950">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tightest font-sans text-foreground">DevPulse</span>
        </a>

        <div className="relative z-20 flex items-end justify-center h-[340px] mt-4 mb-4 select-none pointer-events-none">
          <div className="relative" style={{ width: '480px', height: '320px' }}>
            <div 
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '50px',
                width: '150px',
                height: (isTyping || (password.length > 0 && !showPassword)) ? '340px' : '300px',
                backgroundColor: '#6C3FF5',
                borderRadius: '10px 10px 0 0',
                zIndex: 1,
                transform: (password.length > 0 && showPassword)
                  ? `skewX(0deg)`
                  : (isTyping || (password.length > 0 && !showPassword))
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(30px)` 
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${18}px` : isLookingAtEachOther ? `${50}px` : `${36 + purplePos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? `${30}px` : isLookingAtEachOther ? `${60}px` : `${36 + purplePos.faceY}px`,
                }}
              >
                <EyeBall 
                  size={18} 
                  pupilSize={7} 
                  maxDistance={5} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall 
                  size={18} 
                  pupilSize={7} 
                  maxDistance={5} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            <div 
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out border border-white/5"
              style={{
                left: '190px',
                width: '100px',
                height: '240px',
                backgroundColor: '#27272a',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transform: (password.length > 0 && showPassword)
                  ? `skewX(0deg)`
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(15px)`
                    : (isTyping || (password.length > 0 && !showPassword))
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)` 
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-5 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${8}px` : isLookingAtEachOther ? `${28}px` : `${20 + blackPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? `${24}px` : isLookingAtEachOther ? `${10}px` : `${28 + blackPos.faceY}px`,
                }}
              >
                <EyeBall 
                  size={16} 
                  pupilSize={6} 
                  maxDistance={4} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall 
                  size={16} 
                  pupilSize={6} 
                  maxDistance={4} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            <div 
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '0px',
                width: '190px',
                height: '150px',
                zIndex: 3,
                backgroundColor: '#FF9B6B',
                borderRadius: '95px 95px 0 0',
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${40}px` : `${64 + (orangePos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${65}px` : `${70 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil size={11} maxDistance={4} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -4 : undefined} forceLookY={(password.length > 0 && showPassword) ? -3 : undefined} />
                <Pupil size={11} maxDistance={4} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -4 : undefined} forceLookY={(password.length > 0 && showPassword) ? -3 : undefined} />
              </div>
            </div>

            <div 
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '250px',
                width: '120px',
                height: '180px',
                backgroundColor: '#E8D754',
                borderRadius: '60px 60px 0 0',
                zIndex: 4,
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div 
                className="absolute flex gap-5 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${18}px` : `${44 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${30}px` : `${36 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil size={11} maxDistance={4} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -4 : undefined} forceLookY={(password.length > 0 && showPassword) ? -3 : undefined} />
                <Pupil size={11} maxDistance={4} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -4 : undefined} forceLookY={(password.length > 0 && showPassword) ? -3 : undefined} />
              </div>
              <div 
                className="absolute w-14 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${10}px` : `${32 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${72}px` : `${72 + (yellowPos.faceY || 0)}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">/ what you get</div>
            <h2 className="mt-2 max-w-[28ch] font-medium tracking-tightest font-sans text-xl leading-snug">
              5 free reviews. No credit card. Connect GitHub to review private repos.
            </h2>
            <p className="mt-2 max-w-[48ch] text-xs leading-relaxed text-text-muted font-sans">
              Sign in with GitHub to grant repository read access — we use it strictly in-memory to fetch the PR diff. Email/password works too for public repositories.
            </p>
          </div>
          <div className="font-mono text-[9px] text-text-faint uppercase tracking-wider">
            © {new Date().getFullYear()} DevPulse · Built for shipping
          </div>
        </div>
      </div>

      <div className="grid place-items-center p-8 bg-background relative">
        <div className="w-full max-w-sm">
          <a href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-slate-950">
              <Activity className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tightest font-sans text-foreground">DevPulse</span>
          </a>

          <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
            {mode === "signup" ? "/ create account" : "/ sign in"}
          </div>
          <h1 className="mt-2 text-2xl font-medium tracking-tightest font-sans text-foreground">
            {mode === "signup" ? "Get your first review free" : "Welcome back"}
          </h1>

          <button 
            onClick={github} 
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:-translate-y-px disabled:opacity-50 cursor-pointer h-11"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>

          {mode === "signup" ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-6 font-sans text-xs text-text-muted leading-relaxed">
              <div className="font-semibold text-foreground mb-1 flex items-center gap-1 font-sans">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> GitHub Signup Only
              </div>
              To ensure secure pull-request scanning and instant codebase access, signup is exclusively supported via GitHub authentication.
            </div>
          ) : (
            <>
              <div className="my-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-text-muted">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    className="w-full rounded-md border border-border bg-bg-elev px-3 py-2.5 text-sm outline-none transition focus:border-primary font-sans h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-text-muted">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
                      className="w-full rounded-md border border-border bg-bg-elev pl-3 pr-10 py-2.5 text-sm outline-none transition focus:border-primary font-sans h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button 
                  disabled={busy} 
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-px disabled:opacity-50 cursor-pointer h-11 mt-2"
                >
                  {busy ? "Signing in..." : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          <button 
            onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-sm text-text-muted hover:text-foreground cursor-pointer font-sans"
          >
            {mode === "signin" ? "No account yet? Create one →" : "Have an account? Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
}
