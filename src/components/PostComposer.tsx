import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Video as VideoIcon, Hash, AtSign, Loader2, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { getSelectedCity } from "@/lib/cityStore";
import { broadcastTyping } from "@/lib/presence";

const COMPANY_TAGS = [
  "TCS", "Infosys", "Wipro", "Capgemini", "Cognizant", "HCLTech",
  "TechMahindra", "Accenture", "Deloitte", "Google", "Meta", "Apple",
  "Amazon", "Microsoft", "Stripe",
];

const MENTION_POOL = [
  "BurntOutPM", "SprintZombie", "DeadlineDodger", "StealthPTO",
  "JiraGhost", "SlackLurker", "MidweekMartyr", "TaproomScout",
];

const MAX_IMAGE = 8 * 1024 * 1024;   //  8 MB
const MAX_VIDEO = 25 * 1024 * 1024;  // 25 MB
const MAX_BODY = 600;

type Suggestion = { kind: "tag" | "mention"; value: string };

export default function PostComposer({
  requireAuth,
  onPosted,
  weekend = false,
}: {
  requireAuth: (reason?: string) => boolean;
  onPosted?: () => void;
  weekend?: boolean;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("drinkedin_active_mood");
      if (stored) setMood(stored);
    } catch {}
  }, []);
  const updateMood = (next: string | null) => {
    setMood(next);
    try {
      if (next) window.localStorage.setItem("drinkedin_active_mood", next);
      else window.localStorage.removeItem("drinkedin_active_mood");
    } catch {}
  };
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [popover, setPopover] = useState<Suggestion[] | null>(null);
  const [popoverTrigger, setPopoverTrigger] = useState<"#" | "@" | null>(null);
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  // Build attachment preview URL safely
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Detect last #/@ token for the suggestion popover.
  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value.slice(0, MAX_BODY);
    setBody(v);
    if (v.length > 0) broadcastTyping();
    const caret = e.target.selectionStart ?? v.length;
    const head = v.slice(0, caret);
    const m = head.match(/(^|\s)([#@])([A-Za-z0-9_]*)$/);
    if (!m) {
      setPopover(null);
      setPopoverTrigger(null);
      return;
    }
    const trigger = m[2] as "#" | "@";
    const q = m[3].toLowerCase();
    const pool = trigger === "#" ? COMPANY_TAGS : MENTION_POOL;
    const filtered = pool
      .filter((x) => x.toLowerCase().startsWith(q))
      .slice(0, 6)
      .map((value) => ({ kind: trigger === "#" ? ("tag" as const) : ("mention" as const), value }));
    setPopover(filtered.length ? filtered : null);
    setPopoverTrigger(trigger);
  }

  function applySuggestion(s: Suggestion) {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? body.length;
    const before = body.slice(0, caret).replace(/([#@])[A-Za-z0-9_]*$/, `$1${s.value} `);
    const after = body.slice(caret);
    const next = (before + after).slice(0, MAX_BODY);
    setBody(next);
    setPopover(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function pickImage() {
    if (!requireAuth("Sign in to share a photo with the breakroom.")) return;
    imgInputRef.current?.click();
  }
  function pickVideo() {
    if (!requireAuth("Sign in to drop a short video into the feed.")) return;
    vidInputRef.current?.click();
  }

  function onFile(kind: "image" | "video", f: File | null) {
    if (!f) return;
    const max = kind === "image" ? MAX_IMAGE : MAX_VIDEO;
    if (f.size > max) {
      toast.error(`${kind === "image" ? "Image" : "Video"} too large`, {
        description: `Max ${kind === "image" ? "8" : "25"} MB.`,
      });
      return;
    }
    setFile(f);
    setMediaType(kind);
  }

  function clearAttachment() {
    setFile(null);
    setMediaType(null);
    if (imgInputRef.current) imgInputRef.current.value = "";
    if (vidInputRef.current) vidInputRef.current.value = "";
  }

  // Extract #tags + @mentions for storage in tags[]
  const extractedTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of body.matchAll(/#([A-Za-z0-9_]{2,30})/g)) set.add("#" + m[1]);
    for (const m of body.matchAll(/@([A-Za-z0-9_]{2,30})/g)) set.add("@" + m[1]);
    return [...set].slice(0, 12);
  }, [body]);

  async function submit() {
    if (submitting) return;
    if (!body.trim() && !file) {
      toast.error("Write something or attach a photo/video first.");
      return;
    }
    if (!requireAuth("Sign in to post — your mask stays on, just need a session.")) return;
    const uid = user?.id;
    if (!uid) return;

    setSubmitting(true);
    try {
      let attached_visual_url: string | null = null;
      let mtype: "image" | "video" | null = null;

      if (file && mediaType) {
        const ext = file.name.split(".").pop()?.toLowerCase() || (mediaType === "image" ? "jpg" : "mp4");
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post_media")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        attached_visual_url = path; // store the storage path; sign on read
        mtype = mediaType;
      }

      const HUBS = ["TCS", "Infosys", "Wipro", "Capgemini", "Cognizant", "HCL", "Accenture", "Deloitte", "Google", "Meta", "Amazon", "Microsoft"];
      const ROLES = ["Dev", "Survivor", "Refugee", "Lead", "Intern", "PM", "Ghost", "Zombie", "Martyr", "Scout"];
      const hub = HUBS[Math.floor(Math.random() * HUBS.length)];
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      const baseAlias = `Anon_${hub}_${role}`;
      const alias = mood ? `${baseAlias} [${mood}]` : baseAlias;
      const headline = `Anonymous · ${getSelectedCity()}`;

      const { error } = await (supabase as any).from("posts").insert({
        author_name: alias,
        author_headline: headline,
        body_text: body.trim(),
        user_id: uid,
        post_type: "user",
        attached_visual_url,
        media_type: mtype,
        tags: extractedTags,
      });
      if (error) throw error;

      setBody("");
      updateMood(null);
      clearAttachment();
      toast.success("Posted to the breakroom feed.");
      onPosted?.();
      window.dispatchEvent(new CustomEvent("drinkedin:post-created"));
      window.dispatchEvent(new CustomEvent("drinkedin:radar-pulse"));
    } catch (e: any) {
      toast.error("Couldn't post", { description: e?.message ?? "Try again in a moment." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-4 shadow-xl"
      style={{
        background: "rgba(13, 13, 13, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid #1f1f1f",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-[0.24em] font-bold text-amber-300/90">
          📝 Drop a Post · Photos · Tags
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {body.length}/{MAX_BODY}
        </span>
      </div>

      <div className="relative">
        <textarea
          ref={taRef}
          value={body}
          onChange={handleBodyChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!body && !mood) setFocused(false); }}
          rows={focused || body ? 3 : 2}
          placeholder="Type your confession… use #TCS, #Capgemini, or @SprintZombie to tag."
          className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 leading-snug whitespace-normal break-words"
        />

        {popover && popover.length > 0 && (
          <div className="absolute z-20 left-2 -bottom-2 translate-y-full max-w-xs rounded-lg border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur p-1">
            <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              {popoverTrigger === "#" ? "Company / Tag" : "Mention"}
            </div>
            {popover.map((s) => (
              <button
                key={s.kind + s.value}
                type="button"
                onClick={() => applySuggestion(s)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-foreground hover:bg-white/5"
              >
                {s.kind === "tag" ? <Hash className="size-3 text-fuchsia-300" /> : <AtSign className="size-3 text-cyan-300" />}
                <span className="font-mono">{s.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="mt-3 relative rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-64">
          {mediaType === "image" ? (
            <img src={previewUrl} alt="preview" className="w-full max-h-64 object-contain" />
          ) : (
            <video src={previewUrl} controls className="w-full max-h-64" />
          )}
          <button
            type="button"
            onClick={clearAttachment}
            aria-label="Remove attachment"
            className="absolute top-2 right-2 size-7 grid place-items-center rounded-full bg-black/70 text-white hover:bg-black"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {extractedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {extractedTags.map((t) => (
            <span
              key={t}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                t.startsWith("#")
                  ? "bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30"
                  : "bg-cyan-500/15 text-cyan-200 border border-cyan-400/30"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      )}


      {(focused || body || mood) && (
      <div className="mt-3 flex items-center gap-2 flex-wrap animate-in fade-in duration-200">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {weekend ? "Current Mood State (Weekend):" : "Current Mood:"}
        </span>
        {(weekend
          ? [
              "🛠️ Side Hustling",
              "📴 Ghosting Slack",
              "🍻 Decompressing",
              "🛌 Over-Sleeping",
              "🚨 On-Call Hell",
            ]
          : [
              "🤯 Burnt Out",
              "🥱 In a Meeting",
              "🤫 Stealth PTO",
              "🔋 1% Battery",
              "🍻 Ready for Toit",
            ]
        ).map((m) => {
          const active = mood === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => updateMood(active ? null : m)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition whitespace-nowrap ${
                active
                  ? "bg-amber-500/10 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                  : "bg-zinc-950/40 border-white/10 text-foreground/80 hover:border-white/25"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFile("image", e.target.files?.[0] ?? null)}
          />
          <input
            ref={vidInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => onFile("video", e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={pickImage}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition whitespace-normal break-words leading-tight"
          >
            <ImageIcon className="size-3.5" /> Photo
          </button>
          <button
            type="button"
            onClick={pickVideo}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 transition whitespace-normal break-words leading-tight"
          >
            <VideoIcon className="size-3.5" /> Video
          </button>
          <button
            type="button"
            onClick={() => setBody((b) => (b.endsWith(" ") || b === "" ? b + "#" : b + " #"))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-fuchsia-200 border border-fuchsia-400/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition"
          >
            <Hash className="size-3.5" /> Tag
          </button>
          <button
            type="button"
            onClick={() => setBody((b) => (b.endsWith(" ") || b === "" ? b + "@" : b + " @"))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition"
          >
            <AtSign className="size-3.5" /> Mention
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={submitting || (!body.trim() && !file)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-extrabold text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition whitespace-normal break-words leading-tight"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
