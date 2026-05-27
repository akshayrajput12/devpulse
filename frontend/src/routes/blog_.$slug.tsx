import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { getBlogPostBySlug, getPublishedBlogPosts } from "@/lib/blog.functions";
import { Calendar, Clock, ArrowLeft, BookOpen, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import "@/blogdata.css";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ params }) => {
    try {
      const [post, allPosts] = await Promise.all([
        getBlogPostBySlug({ data: { slug: (params as any).slug } }),
        getPublishedBlogPosts().catch(() => []),
      ]);
      return { post, allPosts: allPosts as any[] };
    } catch (e) {
      console.error(`Failed to load blog post for slug '${(params as any).slug}':`, e);
      throw e;
    }
  },
  component: BlogPostDetail,
  errorComponent: BlogErrorPage,
});

function BlogPostDetail() {
  const { post, allPosts } = Route.useLoaderData() as { post: any; allPosts: any[] };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const estimateReadTime = (content: string) => {
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return Math.max(2, Math.round(words / 180));
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Blog link copied to clipboard!");
    }
  };

  const readTime = estimateReadTime(post.content);

  // Build related/random posts: exclude current, shuffle, take up to 3
  const otherPosts = (allPosts || [])
    .filter((p: any) => p.slug !== post.slug && p.published !== false)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      {/* Detail Container */}
      <main className="mx-auto max-w-[840px] px-6 py-12 md:py-20">

        {/* Back Link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to all articles
        </Link>

        {/* Article Container */}
        <article className="border border-border bg-bg-elev rounded-2xl p-6 md:p-10 shadow-[0_0_50px_-25px_rgba(0,0,0,0.3)]">

          {/* Cover Image */}
          {post.cover_image_url && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-bg-soft mb-8">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Meta Tags */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted mb-4 border-b border-border/40 pb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {formatDate(post.published_at || post.created_at)}
            </span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {readTime} min read
            </span>
            <span className="hidden sm:inline h-1 w-1 rounded-full bg-border" />
            <button
              onClick={copyShareLink}
              className="ml-auto sm:ml-0 inline-flex items-center gap-1 text-primary hover:underline font-semibold"
            >
              <Share2 className="h-3 w-3" /> Share Post
            </button>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-sans leading-tight mb-4">
            {post.title}
          </h1>

          {/* Excerpt */}
          <div
            className="rich-text-content text-base text-text-muted leading-relaxed font-mono italic mb-8 border-l-2 border-primary/40 pl-4 py-1 bg-primary/2"
            dangerouslySetInnerHTML={{ __html: post.excerpt }}
          />

          {/* Rich Content Area */}
          <div
            className="rich-text-content prose prose-invert max-w-none text-sm md:text-base leading-relaxed text-text-muted space-y-5"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

        </article>

        {/* ── More Articles Section ──────────────────────────────── */}
        {otherPosts.length > 0 && (
          <section className="mt-16">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2.5 py-0.5 rounded-sm">
                  More Articles
                </span>
                <h2 className="text-xl font-bold tracking-tight text-foreground mt-2">
                  Keep Reading
                </h2>
              </div>
              <Link
                to="/blog"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Related cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {otherPosts.map((related: any) => {
                const relatedReadTime = Math.max(
                  2,
                  Math.round(
                    (related.excerpt.split(/\s+/).length + 150) / 150
                  )
                );
                return (
                  <article
                    key={related.id}
                    className="group flex flex-col rounded-xl border border-border bg-bg-elev hover:border-primary/40 hover:shadow-[0_0_30px_-15px_rgba(190,242,100,0.15)] transition-all duration-300 overflow-hidden"
                  >
                    {/* Cover / Fallback */}
                    <div className="relative aspect-video w-full overflow-hidden bg-bg-soft border-b border-border shrink-0">
                      {related.cover_image_url ? (
                        <img
                          src={related.cover_image_url}
                          alt={related.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            t.style.display = "none";
                            const fb = t.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = "flex";
                          }}
                        />
                      ) : null}
                      {/* Gradient fallback */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        style={{
                          display: related.cover_image_url ? "none" : "flex",
                          background:
                            "linear-gradient(135deg, #111114 0%, #16161A 50%, #0F0F12 100%)",
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(190,242,100,0.15), rgba(190,242,100,0.04))",
                          }}
                        >
                          <span className="font-mono text-xl font-black text-primary/40 select-none">
                            {related.title.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Read time badge */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-bg-elev/90 border border-border/60 px-2 py-0.5 font-mono text-[8px] text-text-muted backdrop-blur-sm">
                          <Clock className="h-2 w-2 text-primary" /> {relatedReadTime} min
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex flex-col flex-1 p-4">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-text-faint mb-2">
                        <Calendar className="h-2.5 w-2.5 text-primary/60" />
                        {new Date(related.published_at || related.created_at).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors duration-200">
                        <Link to="/blog/$slug" params={{ slug: related.slug }}>
                          {related.title}
                        </Link>
                      </h3>

                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed flex-1">
                        {related.excerpt.replace(/<[^>]*>/g, "")}
                      </p>

                      <div className="mt-3 pt-3 border-t border-border/40">
                        <Link
                          to="/blog/$slug"
                          params={{ slug: related.slug }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-all duration-200 group-hover:gap-2.5"
                        >
                          Read Article <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Back to blog CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-6 py-3 text-sm font-semibold text-text-muted hover:border-primary/40 hover:text-primary transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all articles
          </Link>
        </div>

      </main>
    </div>
  );
}

function BlogErrorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppNav />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-border bg-bg-elev p-12 max-w-[480px]">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Article Not Found</h2>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            The blog post you are looking for might have been moved, draft status deactivated, or the slug is invalid.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-px"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
