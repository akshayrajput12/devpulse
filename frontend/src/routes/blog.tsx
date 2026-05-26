import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { getPublishedBlogPosts } from "@/lib/blog.functions";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import "@/blogdata.css";

export const Route = createFileRoute("/blog")({
  loader: async () => {
    try {
      return await getPublishedBlogPosts();
    } catch (e) {
      console.error("Failed to load blog posts in route:", e);
      return [];
    }
  },
  component: BlogList,
});

function BlogList() {
  const posts = Route.useLoaderData() as any[];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const estimateReadTime = (excerpt: string) => {
    // Quick, clean read-time estimate (approx 200 words per min)
    const words = excerpt.split(/\s+/).length + 150; // add baseline content factor
    return Math.max(2, Math.round(words / 150));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      {/* Main Section */}
      <main className="mx-auto max-w-[1240px] px-6 py-16 md:py-24">
        <div className="flex flex-col items-start gap-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2.5 py-0.5 rounded-sm">
            / the devpulse blog
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground font-sans">
            Engineering Insights & Updates
          </h1>
          <p className="max-w-[64ch] text-text-muted text-base leading-relaxed">
            Deep dives into automated codebase auditing, developer velocity, LLM-based PR review patterns, and software architecture optimization.
          </p>
        </div>

        {/* Blog Post List / Grid */}
        {posts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-elev/40 p-16 text-center">
            <BookOpen className="h-10 w-10 text-text-muted/40 mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-1">No articles published yet</h3>
            <p className="text-xs text-text-muted max-w-[34ch]">
              Our engineers are currently crafting deep-dive content. Check back in a moment!
            </p>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const readTime = estimateReadTime(post.excerpt || "");
              return (
                <article
                  key={post.id}
                  className="group relative flex flex-col h-full rounded-xl border border-border bg-bg-elev hover:border-primary/40 hover:shadow-[0_0_30px_-15px_rgba(190,242,100,0.15)] transition-all duration-300"
                >
                  {/* Visual card header */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-xl border-b border-border bg-bg-soft">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-soft via-bg-elev to-bg-soft">
                        <div className="font-mono text-2xl font-black text-text-faint/20 select-none group-hover:text-primary/10 transition-colors duration-300">
                          {post.title.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 font-mono text-[9px] uppercase tracking-wider bg-bg-elev/90 border border-border/60 text-text-muted px-2 py-0.5 rounded-sm flex items-center gap-1.5 backdrop-blur-sm">
                      <Clock className="h-2.5 w-2.5 text-primary" /> {readTime} min read
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col p-6">
                    <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted mb-3">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-primary/70" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                      <Link to="/blog/$slug" params={{ slug: post.slug }}>
                        {post.title}
                      </Link>
                    </h2>

                    <div 
                      className="rich-text-content mt-3 text-sm text-text-muted leading-relaxed line-clamp-3 flex-1"
                      dangerouslySetInnerHTML={{ __html: post.excerpt }}
                    />

                    <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                      <Link
                        to="/blog/$slug"
                        params={{ slug: post.slug }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-all duration-200 group-hover:gap-2.5"
                      >
                        Read Full Post <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
