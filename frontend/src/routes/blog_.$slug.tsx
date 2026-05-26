import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { getBlogPostBySlug } from "@/lib/blog.functions";
import { Calendar, Clock, ArrowLeft, BookOpen, Share2 } from "lucide-react";
import { toast } from "sonner";
import "@/blogdata.css";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ params }) => {
    try {
      return await getBlogPostBySlug({ data: { slug: (params as any).slug } });
    } catch (e) {
      console.error(`Failed to load blog post for slug '${(params as any).slug}':`, e);
      throw e;
    }
  },
  component: BlogPostDetail,
  errorComponent: BlogErrorPage,
});

function BlogPostDetail() {
  const post = Route.useLoaderData() as any;

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
