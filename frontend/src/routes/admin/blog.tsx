import { createFileRoute } from "@tanstack/react-router";
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
  CheckCircle,
  Eye,
  X,
  FileText,
  Save,
  Globe,
  Settings,
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
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-muted">/ blog</div>
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
                  Cover Image URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or absolute CDN path"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full rounded border border-border bg-bg-soft/40 px-3 py-2 text-xs font-mono focus:border-primary/50 focus:outline-none"
                />
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
        /* Blog Posts List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-bg-elev p-5 flex flex-col justify-between hover:border-primary/20 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="font-mono text-[8px] text-text-muted uppercase">
                      {new Date(post.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${
                        post.published
                          ? "bg-green-400/10 text-green-400 border border-green-400/20"
                          : "bg-bg-soft text-text-muted border border-border"
                      }`}
                    >
                      {post.published ? "published" : "draft"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground line-clamp-1 mb-1.5">
                    {post.title}
                  </h3>

                  <p className="text-xs text-text-muted line-clamp-3 mb-4 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="font-mono text-[9px] text-text-faint truncate max-w-[120px]">
                    /{post.slug}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-1 rounded bg-bg-soft text-text-muted hover:text-primary transition-colors border border-border"
                      title="Edit article"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      className="p-1 rounded bg-red-400/5 text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/15"
                      title="Delete article"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
