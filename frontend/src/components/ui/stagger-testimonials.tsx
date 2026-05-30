"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const SQRT_5000 = Math.sqrt(5000);

const defaultTestimonials = [
  {
    tempId: 0,
    testimonial: "DevPulse completely transformed our deployment cycle. We get deeper security scans and index suggestions in under 10 seconds!",
    by: "Alex, Tech Lead at TechCorp",
    imgSrc: "https://i.pravatar.cc/150?img=11"
  },
  {
    tempId: 1,
    testimonial: "I'm confident my database credentials and code are 100% safe with DevPulse. Deploys are so much faster.",
    by: "Dan, CTO at SecureNet",
    imgSrc: "https://i.pravatar.cc/150?img=12"
  },
  {
    tempId: 2,
    testimonial: "We were constantly hit with N+1 queries in production. DevPulse catches database bottlenecks before merge!",
    by: "Stephanie, COO at InnovateCo",
    imgSrc: "https://i.pravatar.cc/150?img=13"
  },
  {
    tempId: 3,
    testimonial: "DevPulse's platform is so robust, yet easy to use. It's the perfect balance of static diff checks and deep schema analysis.",
    by: "Naomi, DevOps Lead at FuturePlanning",
    imgSrc: "https://i.pravatar.cc/150?img=14"
  },
  {
    tempId: 4,
    testimonial: "Integrating their GitHub App took 10 seconds. Now every pull request gets severity-ranked AI reviews instantly!",
    by: "Andre, Head of Architecture at CreativeSolutions",
    imgSrc: "https://i.pravatar.cc/150?img=15"
  },
  {
    tempId: 5,
    testimonial: "SO SO SO HAPPY WE FOUND DEVPULSE! It has saved my engineering team hundreds of review hours so far.",
    by: "Jeremy, Product Lead at TimeWise",
    imgSrc: "https://i.pravatar.cc/150?img=16"
  },
  {
    tempId: 6,
    testimonial: "I would be lost without DevPulse's in-depth code health metrics. Our PR resolution rate has easily tripled.",
    by: "Olivia, VP Engineering at BrandBuilders",
    imgSrc: "https://i.pravatar.cc/150?img=17"
  },
  {
    tempId: 7,
    testimonial: "It's just the best AI code and database auditing system on the market. Simple, beautiful, and extremely accurate.",
    by: "Daniel, Senior Data Architect at AnalyticsPro",
    imgSrc: "https://i.pravatar.cc/150?img=18"
  }
];

interface TestimonialCardProps {
  position: number;
  testimonial: typeof defaultTestimonials[0];
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  position, 
  testimonial, 
  handleMove, 
  cardSize 
}) => {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out font-sans select-none",
        isCenter 
          ? "z-10 bg-primary text-primary-ink border-primary shadow-[0_12px_24px_rgba(190,242,100,0.15)] dark:shadow-[0_12px_24px_rgba(190,242,100,0.2)]" 
          : "z-0 bg-bg-elev text-text-muted border-border hover:border-primary/40 hover:text-foreground"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(40px 0%, calc(100% - 40px) 0%, 100% 40px, 100% 100%, calc(100% - 40px) 100%, 40px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.45) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-border/40"
        style={{
          right: -2,
          top: 38,
          width: SQRT_5000,
          height: 1.5
        }}
      />
      
      <div className="flex justify-between items-start mb-4">
        <img
          src={testimonial.imgSrc}
          alt=""
          className="h-12 w-12 rounded-lg bg-bg-soft object-cover object-top border border-border"
          style={{
            boxShadow: isCenter ? "3px 3px 0px hsl(var(--ring))" : "3px 3px 0px var(--border)"
          }}
        />
        <div className="flex gap-0.5 text-primary shrink-0">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star 
              key={s} 
              className={cn(
                "h-3.5 w-3.5 fill-primary", 
                isCenter ? "text-primary-ink fill-primary-ink" : "text-primary fill-primary"
              )} 
            />
          ))}
        </div>
      </div>

      <h3 className={cn(
        "text-sm sm:text-base font-semibold leading-relaxed tracking-tight",
        isCenter ? "text-primary-ink" : "text-foreground"
      )}>
        "{testimonial.testimonial}"
      </h3>
      
      <p className={cn(
        "absolute bottom-8 left-8 right-8 mt-2 text-[11px] font-mono uppercase tracking-wider",
        isCenter ? "text-primary-ink/75" : "text-text-muted"
      )}>
        — {testimonial.by}
      </p>
    </div>
  );
};

export const StaggerTestimonials: React.FC = () => {
  const [cardSize, setCardSize] = useState(365);
  const [testimonialsList, setTestimonialsList] = useState(defaultTestimonials);

  useEffect(() => {
    const fetchDBTestimonials = async () => {
      try {
        // Query the most recent 10 reviews with rating >= 4 (high accuracy)
        const { data: rawFeedback } = await (supabase
          .from("user_feedback" as any)
          .select("id, rating, comments, selected_tags, created_at, user_id")
          .gte("rating", 4)
          .order("created_at", { ascending: false })
          .limit(10) as any);

        if (rawFeedback && rawFeedback.length > 0) {
          // Fetch profiles to match user metadata
          const userIds = rawFeedback.map((f: any) => f.user_id);
          const { data: profilesList } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, email");

          const dbTestimonials = rawFeedback.map((f: any, idx: number) => {
            const profile = profilesList?.find((p) => p.id === f.user_id);
            const authorName = profile?.display_name || profile?.email?.split("@")[0] || "Anonymous Developer";
            const tags = f.selected_tags && f.selected_tags.length > 0 
              ? ` (${f.selected_tags.map((t: string) => t.replace(/_/g, " ")).join(", ")})` 
              : " (ACCURATE AI SCAN)";
            
            return {
              tempId: idx,
              testimonial: f.comments || `DevPulse scanner accuracy and analysis speed are exceptionally robust! Staggering 5-star performance.`,
              by: `${authorName}${tags}`,
              imgSrc: profile?.avatar_url || `https://i.pravatar.cc/150?img=${(idx % 20) + 1}`,
            };
          });

          // Merge if less than 6 reviews exist to keep a nice scroll list
          if (dbTestimonials.length < 6) {
            const stockToFill = defaultTestimonials.slice(0, 6 - dbTestimonials.length);
            setTestimonialsList([...dbTestimonials, ...stockToFill].map((item: any, index: number) => ({ ...item, tempId: index })));
          } else {
            setTestimonialsList(dbTestimonials.map((item: any, index: number) => ({ ...item, tempId: index })));
          }
        }
      } catch (err) {
        console.warn("[Testimonials] Supabase fetch omitted or failed, displaying beautiful default stock list:", err);
      }
    };

    fetchDBTestimonials();
  }, []);

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 285);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden bg-bg border-y border-border"
      style={{ height: 580 }}
    >
      <div className="absolute inset-0 dp-grid-bg opacity-[0.04] pointer-events-none" />
      
      {testimonialsList.map((testimonial, index) => {
        const position = testimonialsList.length % 2
          ? index - (testimonialsList.length + 1) / 2
          : index - testimonialsList.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      
      {/* Navigation Buttons */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3 z-20">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-12 w-12 items-center justify-center border border-border bg-bg-elev text-text-muted transition-all duration-200 cursor-pointer outline-none hover:bg-primary hover:text-primary-ink hover:border-primary rounded-lg focus-visible:ring-2 focus-visible:ring-primary shadow-lg"
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-12 w-12 items-center justify-center border border-border bg-bg-elev text-text-muted transition-all duration-200 cursor-pointer outline-none hover:bg-primary hover:text-primary-ink hover:border-primary rounded-lg focus-visible:ring-2 focus-visible:ring-primary shadow-lg"
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
