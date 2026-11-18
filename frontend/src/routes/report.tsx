import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, FolderTree, GitPullRequest } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { HeroMetricsStrip, type ReportViewMode } from "@/components/Report/HeroMetricsStrip";
import { SimpleGuideSection } from "@/components/Report/SimpleGuideSection";
import { ScopeMatrixSection } from "@/components/Report/ScopeMatrixSection";
import { AiAgentsArchitecture } from "@/components/Report/AiAgentsArchitecture";
import { PrReviewPipelineSection } from "@/components/Report/PrReviewPipelineSection";
import { SystemDesignSection } from "@/components/Report/SystemDesignSection";
import { DataFlowDiagramSection } from "@/components/Report/DataFlowDiagramSection";
import { DatabaseAndApiSection } from "@/components/Report/DatabaseAndApiSection";
import { DesignSystemSection } from "@/components/Report/DesignSystemSection";

export const Route = createFileRoute("/report")({
  component: ReportPage,
});

const ALL_SECTION_IDS = [
  "scope",
  "agents",
  "glossary",
  "pipeline",
  "system-design",
  "dfd",
  "data-api",
  "design-system",
];

function ReportPage() {
  const [mode, setMode] = useState<ReportViewMode>("simple");
  const [activeSection, setActiveSection] = useState<string>("scope");

  useEffect(() => {
    document.title = "DevPulse — Visual Architecture, AI Agents & Data Flow Blueprint";

    const observers: IntersectionObserver[] = [];
    ALL_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: "-25% 0px -60% 0px", threshold: 0.05 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [mode]);

  return (
    <div className="min-h-screen bg-bg text-foreground">
      <AppNav />

      <main>
        <HeroMetricsStrip activeSection={activeSection} mode={mode} onModeChange={setMode} />

        {mode === "simple" ? (
          <>
            <SimpleGuideSection />
            <PrReviewPipelineSection />
            <DataFlowDiagramSection />
            <DesignSystemSection />
          </>
        ) : (
          <>
            <ScopeMatrixSection />
            <AiAgentsArchitecture />
            <PrReviewPipelineSection />
            <SystemDesignSection />
            <DataFlowDiagramSection />
            <DatabaseAndApiSection />
            <DesignSystemSection />
          </>
        )}
      </main>

      {/* Compact Blueprint Footer */}
      <footer className="border-t border-border bg-bg-elev/60 py-8 print:hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div>
              <div className="text-sm font-semibold tracking-tightest text-foreground">
                DevPulse Visual Architecture Blueprint
              </div>
              <div className="font-mono text-[10px] text-text-faint">
                V2.4 · 10 AI Agents · 4 Audit Scopes · Full DFD Level 0–2 · 17 RLS Tables
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Link
              to="/reviews/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition hover:-translate-y-px"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              Run PR Review
            </Link>
            <Link
              to="/folder-analysis"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-foreground transition hover:border-primary/50"
            >
              <FolderTree className="h-3.5 w-3.5 text-primary" />
              Folder Audit
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-text-muted transition hover:text-foreground"
            >
              Pricing
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
