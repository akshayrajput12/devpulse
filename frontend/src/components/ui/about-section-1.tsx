"use client";

import React, { useRef } from "react";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { ArrowRight, Linkedin, Github } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AboutSection1() {
  const heroRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.25,
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
    hidden: {
      filter: "blur(8px)",
      y: 30,
      opacity: 0,
    },
  };

  const revealVariants3 = {
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
      },
    }),
    hidden: {
      opacity: 0,
    },
  };

  return (
    <section
      className="relative py-24 px-6 bg-bg overflow-hidden border-t border-border/40"
      ref={heroRef}
      id="about"
    >
      {/* Background Squiggle Clip SVGs */}
      <svg className="absolute -top-[999px] -left-[999px] w-0 h-0">
        <defs>
          <clipPath id="clip-squiggle" clipPathUnits="objectBoundingBox">
            <path
              d="M0.434125 0.00538712C0.56323 -0.00218488 0.714575 -0.000607013 0.814404 0.00302954L0.802642 0.163537C0.813884 0.167475 0.824927 0.172002 0.835358 0.177236C0.869331 0.194281 0.909224 0.225945 0.90824 0.27348C0.907177 0.324883 0.858912 0.354946 0.822651 0.36933C0.857426 0.376783 0.894591 0.387558 0.925837 0.404287C0.968002 0.426862 1.00569 0.464702 0.999287 0.515878C0.993163 0.564818 0.950731 0.597642 0.904098 0.615682C0.88204 0.624216 0.858239 0.62992 0.834803 0.633808C0.858076 0.639299 0.881603 0.646639 0.90267 0.656757C0.946271 0.677698 0.986875 0.715485 0.978905 0.768037C0.972241 0.811979 0.93615 0.843109 0.895204 0.862035C0.858032 0.879217 0.815169 0.887544 0.778534 0.892219C0.704792 0.901628 0.614366 0.901003 0.535183 0.899176C0.508115 0.898551 0.482286 0.89779 0.45773 0.897065C0.404798 0.895504 0.357781 0.894117 0.317008 0.894657C0.301552 0.894862 0.289265 0.895348 0.279749 0.895976C0.251913 0.937168 0.226467 0.980907 0.216015 1L0 0.941216C0.0140558 0.915539 0.051354 0.851547 0.0902557 0.797766C0.118421 0.758828 0.1722 0.745373 0.200402 0.740217C0.168437 0.733484 0.134299 0.723597 0.105102 0.708076C0.0614715 0.684884 0.0263696 0.64687 0.0325498 0.596965C0.0385804 0.548267 0.0803829 0.515256 0.12709 0.496909C0.146901 0.489127 0.168128 0.483643 0.189242 0.479724C0.163739 0.476035 0.137977 0.471053 0.115188 0.463936C0.0874831 0.455285 0.00855855 0.424854 0.016569 0.357817C0.0231721 0.302559 0.0838593 0.276249 0.116031 0.266164C0.149646 0.255625 0.188201 0.2505 0.221821 0.247468C0.208809 0.243824 0.195905 0.239492 0.183801 0.234287C0.152543 0.220846 0.101565 0.189547 0.105449 0.136312C0.108467 0.0949629 0.144168 0.0682612 0.171101 0.0543099C0.197578 0.0405945 0.227933 0.032236 0.25348 0.0267029C0.305656 0.0154021 0.370636 0.00911076 0.434125 0.00538712Z"
              fill="black"
            />
          </clipPath>
        </defs>
      </svg>

      <div className="absolute inset-0 dp-grid-bg opacity-10 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none opacity-20" style={{ background: "radial-gradient(closest-side, rgba(190,242,100,0.1), transparent 70%)" }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* Top Header - Staggered viewport reveals */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <TimelineContent
            as="div"
            animationNum={0}
            timelineRef={heroRef}
            customVariants={revealVariants}
          >
            <div className="text-primary text-xs font-mono uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
              Meet Our Founder
            </div>
          </TimelineContent>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground mb-6">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.15}
              staggerFrom="first"
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 25,
                delay: 0.1,
              }}
              containerClassName="leading-[1.12] text-center justify-center items-center font-sans tracking-tightest"
            >
              {"Architecting Safest AI Code Reviews For Modern Engineering"}
            </VerticalCutReveal>
          </h2>

          <TimelineContent
            as="p"
            animationNum={1}
            customVariants={revealVariants}
            timelineRef={heroRef}
            className="text-text-muted text-center text-sm md:text-base mb-8 leading-relaxed max-w-[56ch] mx-auto font-sans"
          >
            DevPulse was created to eliminate code-review stress. By executing multi-threaded stack-aware diagnostics strictly in-memory, we empower teams to safeguard production.
          </TimelineContent>
        </div>

        {/* Split Grid for Single Founder Showcase */}
        <div className="grid lg:grid-cols-[1.1fr_1.3fr] gap-12 lg:gap-20 items-center max-w-5xl mx-auto">
          
          {/* Left Side: Squiggle Framed Picture of Akshay */}
          <div className="w-full flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10 w-[280px] h-[280px] mx-auto" />
            
            <TimelineContent
              as="figure"
              animationNum={2}
              timelineRef={heroRef}
              customVariants={revealVariants}
              className="w-[280px] h-[340px] md:w-[320px] md:h-[390px] rounded-lg overflow-hidden border border-border shadow-2xl relative group cursor-pointer select-none"
              style={{ clipPath: "url(#clip-squiggle)" }}
            >
              {/* Fallback to high quality stock portrait if /akshay.jpeg is loading, but configured for public folder */}
              <img
                src="/akshay.jpeg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=687&auto=format&fit=crop";
                }}
                alt="Akshay Pratap Singh - Founder & CTO"
                className="object-cover w-full h-full rotate-2 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-0"
              />
            </TimelineContent>
          </div>

          {/* Right Side: Professional Details, Biography, and Social Links */}
          <div className="space-y-6">
            <TimelineContent
              as="div"
              animationNum={3}
              timelineRef={heroRef}
              customVariants={revealVariants}
              className="space-y-2"
            >
              <h3 className="text-2xl font-bold tracking-tightest text-foreground font-sans">
                Akshay Pratap Singh
              </h3>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="text-primary font-semibold uppercase tracking-wider">Founder & CTO</span>
                <span className="text-text-faint">•</span>
                <span className="text-text-muted">Software Developer</span>
              </div>
            </TimelineContent>

            <TimelineContent
              as="p"
              animationNum={4}
              timelineRef={heroRef}
              customVariants={revealVariants}
              className="text-sm leading-relaxed text-text-muted font-sans font-normal"
            >
              Akshay is a passionate software developer and systems engineer dedicated to building hyper-focused development instruments. Seeing engineers exhaust credit limits on slow, context-blind liners, he engineered DevPulse to achieve continuous, multi-threaded code-safeguarding inside secure in-memory pipelines.
            </TimelineContent>

            <TimelineContent
              as="p"
              animationNum={5}
              timelineRef={heroRef}
              customVariants={revealVariants}
              className="text-sm leading-relaxed text-text-muted font-sans"
            >
              Under his architectural stewardship, DevPulse has scaled into a SOC-2 compliant diagnostics hub that processes complex PR diffs, executes pre-emptive database indexes audits, and delivers dynamic dashboards in under 10 seconds.
            </TimelineContent>

            {/* Social Link Cards */}
            <div className="flex flex-wrap gap-4 pt-4">
              <TimelineContent
                as="a"
                href="https://www.linkedin.com/in/1akshay/"
                target="_blank"
                rel="noreferrer"
                animationNum={6}
                customVariants={revealVariants3}
                timelineRef={heroRef}
                className="bg-bg-elev hover:bg-bg-soft border border-border rounded-xl px-4 py-3 flex items-center gap-3 transition cursor-pointer hover:border-primary/50 group select-none shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                <div className="h-8 w-8 rounded-lg bg-[#0077b5]/10 border border-[#0077b5]/20 text-[#0077b5] flex items-center justify-center transition-transform group-hover:scale-105">
                  <Linkedin className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint">LinkedIn</div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition">@1akshay &rarr;</div>
                </div>
              </TimelineContent>

              <TimelineContent
                as="a"
                href="https://github.com/akshayrajput12"
                target="_blank"
                rel="noreferrer"
                animationNum={7}
                customVariants={revealVariants3}
                timelineRef={heroRef}
                className="bg-bg-elev hover:bg-bg-soft border border-border rounded-xl px-4 py-3 flex items-center gap-3 transition cursor-pointer hover:border-primary/50 group select-none shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                <div className="h-8 w-8 rounded-lg bg-foreground/10 border border-foreground/20 text-foreground flex items-center justify-center transition-transform group-hover:scale-105">
                  <Github className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint">GitHub</div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition">@akshayrajput12 &rarr;</div>
                </div>
              </TimelineContent>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
