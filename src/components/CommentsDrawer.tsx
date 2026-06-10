import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";

export type DrawerComment = {
  id: string;
  post_id: string;
  author_name: string;
  body_text: string;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postTitle: string | null;
  postId: string | null;
  comments: DrawerComment[];
  onSubmit: (postId: string, text: string) => Promise<void> | void;
  signedIn: boolean;
  onRequireAuth: () => void;
};

function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "??";
}

export default function CommentsDrawer({
  open,
  onOpenChange,
  postTitle,
  postId,
  comments,
  onSubmit,
  signedIn,
  onRequireAuth,
}: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset composer when post changes
  useEffect(() => {
    setText("");
  }, [postId]);

  // Auto-scroll on new comment
  const last = comments[comments.length - 1]?.id;
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last, open]);

  const sorted = useMemo(
    () => [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [comments]
  );

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!postId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!signedIn) {
      onRequireAuth();
      return;
    }
    setSending(true);
    try {
      await onSubmit(postId, trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[460px] bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-zinc-900 border-l border-amber-500/20 flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-amber-500/15">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-4 text-amber-300" />
            Office Replies
          </SheetTitle>
          <SheetDescription className="text-xs truncate">
            {postTitle ? `Re: ${postTitle}` : "Anonymous threaded chatter — live."}
          </SheetDescription>
        </SheetHeader>

        {/* Composer pinned at top of drawer */}
        <form onSubmit={handle} className="px-4 pt-3 pb-3 border-b border-amber-500/10 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="size-8 shrink-0 rounded-full bg-amber-500/20 grid place-items-center text-[11px] font-bold text-amber-200">
              {signedIn ? "🤫" : "🔒"}
            </div>
            <div className="flex-1 relative">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Drop an office reply anonymously... 🤫"
                disabled={!postId || sending}
                className="h-9 rounded-full bg-background pr-10 text-sm"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending || !postId}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7 rounded-full grid place-items-center text-primary disabled:text-muted-foreground hover:bg-primary/10 transition"
                aria-label="Post reply"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
          {!signedIn && (
            <p className="text-[10.5px] text-amber-300/80 mt-1.5 pl-10">
              Sign in to drop a reply — keeps our breakroom spam-free.
            </p>
          )}
        </form>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        >
          {sorted.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-10">
              Crickets in the breakroom. Be the first to weigh in. 🦗
            </p>
          ) : (
            <ul className="space-y-2.5">
              {sorted.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200"
                >
                  <div className="size-8 shrink-0 rounded-full bg-primary/20 grid place-items-center text-[11px] font-bold text-primary">
                    {initials(c.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold truncate">{c.author_name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-snug mt-0.5 whitespace-pre-wrap break-words">
                        {c.body_text}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
