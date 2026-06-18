import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function AvatarUpload({
  userId,
  value,
  onChange,
  size = 96,
}: {
  userId: string;
  value: string;
  onChange: (url: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use a JPG, PNG, WEBP or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Max 4 MB. Try a smaller image.");
      return;
    }

    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      // Cache-bust path so the browser re-fetches when the same user replaces their avatar
      const path = `${userId}/avatar-${Date.now()}.${ext || "jpg"}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      if (!url) throw new Error("Could not resolve avatar URL");

      onChange(url);
      toast.success("Avatar uploaded. Hit Save to confirm.");
    } catch (e: any) {
      console.error("[avatar upload]", e);
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    onChange("");
    toast("Avatar cleared. Hit Save to confirm.");
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative overflow-hidden rounded-full border-2 border-amber-400/40 bg-zinc-900"
        style={{ width: size, height: size }}
      >
        {value ? (
          <img src={value} alt="Your avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-amber-400/60">
            <Camera className="size-7" />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/70">
            <Loader2 className="size-5 animate-spin text-amber-300" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
        >
          <UploadCloud className="size-3.5" />
          {value ? "Replace photo" : "Upload photo"}
        </button>
        {value && (
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className="inline-flex items-center gap-2 self-start rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            <Trash2 className="size-3.5" /> Remove
          </button>
        )}
        <p className="text-[10px] text-neutral-500">JPG/PNG/WEBP · max 4 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

export default AvatarUpload;
