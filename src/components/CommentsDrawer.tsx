import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, X, CornerDownRight } from "lucide-react";

export type DrawerComment = {
  id: string;
  post_id: string;
  author_name: string;
  body_text: string;
  created_at: string;
  parent_id?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postTitle: string | null;
  postId: string | null;
  comments: DrawerComment[];
  onSubmit: (postId: string, text: string, parentId?: string | null) => Promise<void> | void;
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

const REPLY_PROMPTS = [
  "Drop an office reply anonymously... 🤫",
  "Co-sign, roast, or escalate — your call.",
  "What would you Slack back if HR wasn't watching?",
  "Hot take? Spicy take? Lukewarm take? Send it.",
  "Validate the suffering. Or pile on.",
];

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
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [promptIdx, setPromptIdx] = useState(() => Math.floor(Math.random() * REPLY_PROMPTS.length));
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText("");
    setReplyTo(null);
    if (open && postId) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 180);
      return () => window.clearTimeout(t);
    }
  }, [postId, open]);

  useEffect(() => {
    if (!open || text) return;
    const id = window.setInterval(() => {
      setPromptIdx((i) => (i + 1) % REPLY_PROMPTS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [open, text]);

  const last = comments[comments.length - 1]?.id;
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last, open]);

  // Build a threaded tree: parents in chronological order, replies grouped under.
  const tree = useMemo(() => {
    const sorted = [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const parents = sorted.filter((c) => !c.parent_id);
    const kids: Record<string, DrawerComment[]> = {};
    for (const c of sorted) {
      if (c.parent_id) (kids[c.parent_id] ||= []).push(c);
    }
    return { parents, kids };
  }, [comments]);

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
      await onSubmit(postId, trimmed, replyTo?.id ?? null);
      setText("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  function startReply(c: DrawerComment) {
    setReplyTo({ id: c.id, author: c.author_name });
    inputRef.current?.focus();
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

        <form onSubmit={handle} className="px-4 pt-3 pb-3 border-b border-amber-500/10 bg-zinc-950/60">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1">
              <span className="text-[10.5px] text-amber-200 truncate">
                ↳ replying to <b>{replyTo.author}</b>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="shrink-0 text-amber-200/70 hover:text-amber-100"
                aria-label="Cancel reply"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="size-8 shrink-0 rounded-full bg-amber-500/20 grid place-items-center text-[11px] font-bold text-amber-200">
              {signedIn ? "🤫" : "🔒"}
            </div>
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={replyTo ? `Reply to ${replyTo.author}…` : REPLY_PROMPTS[promptIdx]}
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

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {tree.parents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-10">
              Crickets in the breakroom. Be the first to weigh in. 🦗
            </p>
          ) : (
            <ul className="space-y-2.5">
              {tree.parents.map((c) => (
                <li key={c.id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <CommentRow c={c} onReply={() => startReply(c)} />
                  {tree.kids[c.id]?.length ? (
                    <ul className="mt-2 ml-8 space-y-2 border-l border-amber-500/15 pl-3">
                      {tree.kids[c.id].map((k) => (
                        <li key={k.id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
                          <CommentRow c={k} nested onReply={() => startReply(c)} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CommentRow({ c, nested = false, onReply }: { c: DrawerComment; nested?: boolean; onReply: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`shrink-0 rounded-full grid place-items-center font-bold ${nested ? "size-6 bg-amber-500/15 text-amber-200 text-[9.5px]" : "size-8 bg-primary/20 text-primary text-[11px]"}`}>
        {initials(c.author_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2 ${nested ? "text-[12.5px]" : ""}`}>
          <div className="flex items-baseline gap-2">
            {nested && <CornerDownRight className="size-3 text-amber-400/60 shrink-0" />}
            <span className="text-xs font-semibold truncate">{c.author_name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
          </div>
          <p className="text-sm leading-snug mt-0.5 whitespace-pre-wrap break-words">{c.body_text}</p>
        </div>
        <button
          type="button"
          onClick={onReply}
          className="mt-1 ml-1 text-[10.5px] text-muted-foreground hover:text-amber-300 font-semibold uppercase tracking-wider"
        >
          Reply
        </button>
      </div>
    </div>
  );
}
