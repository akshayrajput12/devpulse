import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  getAdminBlogPosts,
  saveAdminBlogPost,
  deleteAdminBlogPost,
} from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import {
  Plus,
  BookOpen,
  Edit2,
  Trash2,
  Eye,
  X,
  FileText,
  Save,
  Globe,
  Clock,
  Calendar,
  ImageOff,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog")({
  component: AdminBlog,
});

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

// ─── Dynamic CKEditor 5 CDN Textarea ─────────────────────────
function CKEditorTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    let active = true;

    const initEditor = () => {
      if (!textareaRef.current || !active) return;

      // If already active, set value directly if different
      if (editorInstanceRef.current) {
        if (editorInstanceRef.current.getData() !== value) {
          editorInstanceRef.current.setData(value);
        }
        return;
      }

      const ClassicEditor = (window as any).ClassicEditor;
      if (!ClassicEditor) return;

      ClassicEditor.create(textareaRef.current, {
        toolbar: [
          "heading",
          "|",
          "bold",
          "italic",
          "link",
          "bulletedList",
          "numberedList",
          "blockQuote",
          "insertTable",
          "undo",
          "redo",
        ],
      })
        .then((editor: any) => {
          if (!active) {
            editor.destroy();
            return;
          }
          editorInstanceRef.current = editor;
          editor.setData(value);
          editor.model.document.on("change:data", () => {
            const data = editor.getData();
            onChange(data);
          });
        })
        .catch((err: any) => {
          console.error("Failed to initialize CKEditor:", err);
        });
    };

    // Append script dynamically
    if (!(window as any).ClassicEditor) {
      const scriptId = "ckeditor-cdn-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.ckeditor.com/ckeditor5/41.1.0/classic/ckeditor.js";
        script.async = true;
        document.head.appendChild(script);
      }

      const handleScriptLoad = () => {
        initEditor();
      };

      script.addEventListener("load", handleScriptLoad);
      return () => {
        active = false;
        script.removeEventListener("load", handleScriptLoad);
        if (editorInstanceRef.current) {
          editorInstanceRef.current.destroy().then(() => {
            editorInstanceRef.current = null;
          });
        }
      };
    } else {
      initEditor();
      return () => {
        active = false;
        if (editorInstanceRef.current) {
          editorInstanceRef.current.destroy().then(() => {
            editorInstanceRef.current = null;
          });
        }
      };
    }
  }, []);

  return (
    <div className="ckeditor-wrapper text-foreground bg-bg-soft/50 rounded-lg overflow-hidden border border-border mt-1">
      <textarea ref={textareaRef} style={{ display: "none" }} />
      <style>{`
        /* Main Container and Reset */
        .ck.ck-editor {
          border-radius: var(--radius-md, 6px) !important;
          overflow: hidden !important;
          border: 1px solid var(--border) !important;
          background-color: var(--bg-elev) !important;
        }
        .ck.ck-editor__top {
          border-bottom: 1px solid var(--border) !important;
        }
        .ck.ck-editor__top .ck-sticky-panel .ck-sticky-panel__content {
          border: none !important;
        }
        
        /* Toolbar styling */
        .ck.ck-toolbar {
          background-color: var(--bg-soft) !important;
          border: none !important;
          padding: 6px !important;
        }
        .ck.ck-toolbar__separator {
          background-color: var(--border) !important;
        }
        
        /* Button styling */
        .ck.ck-button {
          color: var(--text-muted) !important;
          border-radius: var(--radius-sm, 4px) !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
        }
        .ck.ck-button:hover {
          background-color: var(--bg-elev) !important;
          color: var(--text) !important;
        }
        .ck.ck-button.ck-on {
          background-color: var(--accent) !important;
          color: var(--accent-ink, #000) !important;
        }
        .ck.ck-button.ck-on:hover {
          background-color: var(--accent) !important;
          color: var(--accent-ink, #000) !important;
        }
        
        /* Dropdowns & list items */
        .ck.ck-dropdown__panel {
          background-color: var(--bg-elev) !important;
          border: 1px solid var(--border) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          border-radius: var(--radius-md, 6px) !important;
          z-index: 100 !important;
        }
        .ck.ck-list__item, .ck.ck-list__item button {
          background-color: var(--bg-elev) !important;
          color: var(--text) !important;
          transition: all 0.1s ease !important;
        }
        .ck.ck-list__item:hover button, .ck.ck-list__item button:hover {
          background-color: var(--bg-soft) !important;
          color: var(--accent) !important;
        }
        .ck.ck-list__item button.ck-on {
          background-color: var(--accent-soft) !important;
          color: var(--accent) !important;
        }
        
        /* The editable content window */
        .ck-editor__editable, .ck.ck-editor__editable_inline {
          background-color: var(--bg-code) !important;
          color: var(--text) !important;
          padding: 16px 20px !important;
          font-family: var(--font-sans) !important;
          min-height: 350px !important;
          max-height: 350px !important;
          height: 350px !important;
          overflow-y: auto !important;
          border: none !important;
        }
        .ck.ck-editor__editable_inline:focus {
          outline: none !important;
          box-shadow: inset 0 0 0 1px var(--accent) !important;
        }
        
        /* Placeholders & Links */
        .ck.ck-editor__editable [data-placeholder]::before {
          color: var(--text-faint) !important;
        }
        .ck.ck-link_selected {
          background-color: var(--accent-soft) !important;
        }
      `}</style>
    </div>
  );
}

// ─── Main Admin Blog Component ───────────────────────────────
function AdminBlog() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [published, setPublished] = useState(false);

  const fetchPosts = async () => {
    if (!session?.access_token) return;
    try {
      const res = await getAdminBlogPosts({ data: { access_token: session.access_token } });
      setPosts(res as BlogPost[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [session]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!id) {
      // Auto generate slug for new posts
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40);
      setSlug(generated);
    }
  };

  const handleCreateNew = () => {
    setId(undefined);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("<p>Write your article here...</p>");
    setCoverImageUrl("");
    setPublished(false);
    setShowForm(true);
  };

  const handleEdit = (post: BlogPost) => {
    setId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setCoverImageUrl(post.cover_image_url || "");
    setPublished(post.published);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!title.trim() || !slug.trim() || !content.trim() || !excerpt.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      await saveAdminBlogPost({
        data: {
          access_token: session.access_token,
          id,
          title,
          slug,
          excerpt,
          content,
          cover_image_url: coverImageUrl || undefined,
          published,
        }
      });

      toast.success(id ? "Blog post updated!" : "New blog post published successfully.");
      setShowForm(false);
      fetchPosts();
    } catch (e: any) {
      toast.error(e.message || "Failed to save post");
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!session?.access_token) return;
    const confirm = window.confirm(`Are you sure you want to delete post "${post.title}"?`);
    if (!confirm) return;

    try {
      await deleteAdminBlogPost({
        data: {
          access_token: session.access_token,
          id: post.id,
        }
      });
      toast.success("Blog post deleted successfully.");
      fetchPosts();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete post");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Manage Blog Posts</h1>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Write blog articles, update content, and publish them to your website.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-mono font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-px"
          >
            <Plus className="h-4 w-4" /> New Article
          </button>
        )}
      </div>

      {showForm ? (
        /* Blog Editor Form */
        <div className="rounded-xl border border-border bg-bg-elev p-6 shadow-[0_0_50px_-25px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> {id ? "Edit Article" : "New Article"}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 text-text-muted hover:text-foreground hover:bg-bg-soft rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Title / Slug Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-text-muted font-bold">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mastering N+1 SQL Queries"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full rounded border border-border bg-bg-soft/40 px-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-text-muted font-bold">
                  URL path (slug) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mastering-n-1-sql-queries"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded border border-border bg-bg-soft/40 px-3 py-2 text-xs font-mono focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Excerpt / Cover Image Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-text-muted font-bold">
                  Summary <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Provide a short summary of this post..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full rounded border border-border bg-bg-soft/40 px-3 py-2 text-xs focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-text-muted font-bold">
                  Cover Image URL <span className="normal-case text-text-faint">(postimage.cc, imgur, etc.)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://i.postimg.cc/... or any CDN URL"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full rounded border border-border bg-bg-soft/40 px-3 py-2 text-xs font-mono focus:border-primary/50 focus:outline-none"
                />
                {/* Live image preview */}
                {coverImageUrl && (
                  <div className="mt-2 relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-bg-soft">
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-2 text-text-faint"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span class="font-mono text-[10px]">Image failed to load</span></div>`;
                        }
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <a
                        href={coverImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-bg-elev/90 border border-border px-2 py-0.5 font-mono text-[9px] text-text-muted hover:text-primary"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> Open
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Editor block */}
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase text-text-muted font-bold">
                Content <span className="text-red-400">*</span>
              </label>
              <CKEditorTextarea value={content} onChange={setContent} />
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-3 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className={`inline-flex items-center gap-1.5 rounded border px-4 py-2 font-mono text-[10px] font-bold uppercase transition-all duration-200 ${
                  published
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-bg-soft border-border text-text-muted hover:border-primary/20"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                {published ? "Published" : "Draft"}
              </button>

              <div className="text-[10px] font-mono text-text-muted leading-tight">
                {published
                  ? "This post will show on the blog page immediately."
                  : "This post will be saved as a draft."}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-xs font-mono font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-px"
              >
                <Save className="h-4 w-4" /> Save Article
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border bg-bg-soft px-5 py-2.5 text-xs font-mono font-medium text-text-muted hover:text-foreground transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Blog Posts List Grid — Rich Preview Cards */
        <div>
          {/* Stats row */}
          {!loading && posts.length > 0 && (
            <div className="flex items-center gap-4 mb-5 font-mono text-[10px] text-text-muted">
              <span><span className="text-foreground font-bold">{posts.length}</span> articles total</span>
              <span>·</span>
              <span><span className="text-green-400 font-bold">{posts.filter(p => p.published).length}</span> published</span>
              <span>·</span>
              <span><span className="text-text-faint font-bold">{posts.filter(p => !p.published).length}</span> drafts</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full flex h-48 items-center justify-center">
                <DevPulseLoader />
              </div>
            ) : posts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-16 text-center">
                <BookOpen className="h-10 w-10 text-text-muted/40 mb-4" />
                <h3 className="text-sm font-semibold mb-1">No articles found</h3>
                <p className="text-xs text-text-muted mb-4 max-w-[28ch]">
                  Create your first article to start writing.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-mono font-bold text-primary-foreground"
                >
                  New Article
                </button>
              </div>
            ) : (
              posts.map((post) => {
                const wordCount = post.excerpt.split(/\s+/).length + 150;
                const readTime = Math.max(2, Math.round(wordCount / 150));
                const formattedDate = new Date(post.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                });

                return (
                  <article
                    key={post.id}
                    className="group relative flex flex-col rounded-xl border border-border bg-bg-elev hover:border-primary/30 hover:shadow-[0_0_30px_-15px_rgba(190,242,100,0.15)] transition-all duration-300 overflow-hidden"
                  >
                    {/* Cover Image / Fallback */}
                    <div className="relative aspect-video w-full overflow-hidden bg-bg-soft border-b border-border shrink-0">
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {/* Gradient fallback (always rendered, hidden when image loads) */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        style={{ display: post.cover_image_url ? 'none' : 'flex',
                          background: 'linear-gradient(135deg, #111114 0%, #16161A 50%, #0F0F12 100%)'
                        }}
                      >
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
                          style={{ background: 'linear-gradient(135deg, rgba(190,242,100,0.15), rgba(190,242,100,0.04))' }}
                        >
                          <span className="font-mono text-2xl font-black text-primary/40 select-none">
                            {post.title.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 font-mono text-[9px] text-text-faint">
                          <ImageOff className="h-2.5 w-2.5" /> No cover image
                        </span>
                      </div>

                      {/* Status badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider backdrop-blur-sm ${
                            post.published
                              ? "bg-green-400/15 text-green-400 border border-green-400/25"
                              : "bg-bg-elev/90 text-text-muted border border-border"
                          }`}
                        >
                          <span className={`h-1 w-1 rounded-full ${post.published ? 'bg-green-400' : 'bg-text-faint'}`} />
                          {post.published ? "published" : "draft"}
                        </span>
                      </div>

                      {/* Read time */}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-bg-elev/90 border border-border/60 px-2 py-0.5 font-mono text-[8px] text-text-muted backdrop-blur-sm">
                          <Clock className="h-2 w-2 text-primary" /> {readTime} min
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-col flex-1 p-4">
                      {/* Date */}
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-text-faint mb-2">
                        <Calendar className="h-2.5 w-2.5 text-primary/60" />
                        {formattedDate}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors duration-200">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed flex-1">
                        {post.excerpt.replace(/<[^>]*>/g, '')}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                        <span className="font-mono text-[9px] text-text-faint truncate max-w-[110px]" title={`/blog/${post.slug}`}>
                          /blog/{post.slug}
                        </span>
                        <div className="flex items-center gap-1">
                          {post.published && (
                            <Link
                              to="/blog/$slug"
                              params={{ slug: post.slug }}
                              target="_blank"
                              className="p-1.5 rounded bg-bg-soft text-text-muted hover:text-primary transition-colors border border-border"
                              title="View live post"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleEdit(post)}
                            className="p-1.5 rounded bg-bg-soft text-text-muted hover:text-primary transition-colors border border-border"
                            title="Edit article"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(post)}
                            className="p-1.5 rounded bg-red-400/5 text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/15"
                            title="Delete article"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
