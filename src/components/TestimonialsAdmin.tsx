import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, Pin, PinOff, Trash2, EyeOff, MessageSquareQuote, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  body: string;
  status: "pending" | "approved" | "hidden";
  pinned: boolean;
  created_at: string;
};

export function TestimonialsAdmin({ ownerId }: { ownerId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("profile_testimonials")
      .select("id, body, status, pinned, created_at")
      .eq("owner_id", ownerId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Couldn't load testimonials");
      return;
    }
    setRows((data ?? []) as Row[]);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, fields: Partial<Pick<Row, "status" | "pinned">>, optimisticMsg: string) {
    setBusyId(id);
    const { error } = await (supabase as any).from("profile_testimonials").update(fields).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Couldn't update");
      return;
    }
    toast.success(optimisticMsg);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial permanently?")) return;
    setBusyId(id);
    const { error } = await (supabase as any).from("profile_testimonials").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Couldn't delete");
      return;
    }
    toast.success("Deleted");
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const hidden = rows.filter((r) => r.status === "hidden");

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-amber-500/20 bg-zinc-900/40">
      <div className="flex items-center justify-between gap-3 border-b border-amber-500/15 bg-black/60 px-4 py-2.5">
        <h2 className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">
          <MessageSquareQuote className="h-3.5 w-3.5" />
          Anonymous Peer Reviews · Performance Testimonials
        </h2>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
          <span className="text-amber-400/80">{pending.length} pending</span>
          <span className="text-emerald-400/80">{approved.length} live</span>
        </div>
      </div>

      <div className="px-4 pt-3 sm:px-5">
        <p className="text-[11px] text-zinc-500">
          Reviews submitted via your public card. You alone decide what goes live, what gets pinned, and what gets shredded.
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-8 text-amber-400/70">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12px] text-zinc-500">
          No testimonials yet. Share your card — peers can drop short anonymous reviews.
        </div>
      ) : (
        <div className="space-y-6 px-4 pb-5 pt-3 sm:px-5">
          {pending.length > 0 && (
            <Bucket title="Incoming — awaiting your call" tone="amber">
              {pending.map((r) => (
                <Card
                  key={r.id}
                  row={r}
                  busy={busyId === r.id}
                  onApprove={() => patch(r.id, { status: "approved" }, "Approved")}
                  onPin={() => patch(r.id, { status: "approved", pinned: true }, "Approved & pinned")}
                  onHide={() => patch(r.id, { status: "hidden" }, "Hidden")}
                  onDelete={() => remove(r.id)}
                />
              ))}
            </Bucket>
          )}
          {approved.length > 0 && (
            <Bucket title="Live on your public card" tone="emerald">
              {approved.map((r) => (
                <Card
                  key={r.id}
                  row={r}
                  busy={busyId === r.id}
                  onTogglePin={() => patch(r.id, { pinned: !r.pinned }, r.pinned ? "Unpinned" : "Pinned")}
                  onHide={() => patch(r.id, { status: "hidden", pinned: false }, "Hidden")}
                  onDelete={() => remove(r.id)}
                />
              ))}
            </Bucket>
          )}
          {hidden.length > 0 && (
            <Bucket title="Hidden / archived" tone="zinc">
              {hidden.map((r) => (
                <Card
                  key={r.id}
                  row={r}
                  busy={busyId === r.id}
                  onRestore={() => patch(r.id, { status: "approved" }, "Restored")}
                  onDelete={() => remove(r.id)}
                />
              ))}
            </Bucket>
          )}
        </div>
      )}

      <div className="border-t border-amber-500/10 bg-black/40 px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-amber-400/50">
        ▮ Moderator Console · Only you can approve / pin / delete ▮
      </div>
    </section>
  );
}

function Bucket({ title, tone, children }: { title: string; tone: "amber" | "emerald" | "zinc"; children: React.ReactNode }) {
  const color =
    tone === "amber" ? "text-amber-400/80" : tone === "emerald" ? "text-emerald-400/80" : "text-zinc-500";
  return (
    <div>
      <h3 className={`mb-2 text-[10px] font-bold uppercase tracking-[0.25em] ${color}`}>▸ {title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Card({
  row,
  busy,
  onApprove,
  onPin,
  onTogglePin,
  onHide,
  onRestore,
  onDelete,
}: {
  row: Row;
  busy: boolean;
  onApprove?: () => void;
  onPin?: () => void;
  onTogglePin?: () => void;
  onHide?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-md border border-amber-500/15 bg-black/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-sm leading-relaxed text-zinc-200">
          {row.pinned && <span className="mr-1.5 text-amber-300">★</span>}
          “{row.body}”
        </p>
        <span className="shrink-0 text-[9px] uppercase tracking-widest text-amber-400/40">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {onApprove && (
          <Btn onClick={onApprove} busy={busy} icon={<Check className="h-3 w-3" />} tone="emerald">Approve</Btn>
        )}
        {onPin && (
          <Btn onClick={onPin} busy={busy} icon={<Pin className="h-3 w-3" />} tone="amber">Approve + Pin</Btn>
        )}
        {onTogglePin && (
          <Btn onClick={onTogglePin} busy={busy} icon={row.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />} tone="amber">
            {row.pinned ? "Unpin" : "Pin"}
          </Btn>
        )}
        {onHide && (
          <Btn onClick={onHide} busy={busy} icon={<EyeOff className="h-3 w-3" />} tone="zinc">Hide</Btn>
        )}
        {onRestore && (
          <Btn onClick={onRestore} busy={busy} icon={<RotateCcw className="h-3 w-3" />} tone="emerald">Restore</Btn>
        )}
        <Btn onClick={onDelete} busy={busy} icon={<Trash2 className="h-3 w-3" />} tone="red">Delete</Btn>
      </div>
    </div>
  );
}

function Btn({
  onClick,
  busy,
  icon,
  tone,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "zinc" | "red";
  children: React.ReactNode;
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
      : tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
      : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300 hover:bg-zinc-500/20";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 ${cls}`}
    >
      {icon}
      {children}
    </button>
  );
}
