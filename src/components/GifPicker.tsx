import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

// Public Giphy beta key — safe to ship client-side, rate-limited per IP.
const GIPHY_KEY = "dc6zaTOxFJmzC";

const SUGGESTED = [
  "hungover",
  "beer",
  "zoom meeting",
  "friday",
  "office",
  "monday",
  "cheers",
  "burnout",
];

type GiphyItem = {
  id: string;
  images: {
    fixed_height_small: { url: string; width: string; height: string };
    downsized_medium?: { url: string };
    original?: { url: string };
  };
  title?: string;
};

export function GifPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (url: string) => void;
}) {
  const [query, setQuery] = useState("hungover");
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim() || "beer";
    debounce.current = setTimeout(() => void runSearch(q), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
        q
      )}&limit=24&rating=pg-13&bundle=messaging_non_clips`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Giphy ${res.status}`);
      const json = await res.json();
      setItems((json?.data as GiphyItem[]) || []);
    } catch (e: any) {
      setError("Couldn't reach the GIF jukebox. Try again in a sec.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function pick(item: GiphyItem) {
    const url =
      item.images?.downsized_medium?.url ||
      item.images?.original?.url ||
      item.images?.fixed_height_small?.url;
    if (!url) return;
    onSelect(url);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🎬</span> Add a GIF
          </DialogTitle>
          <DialogDescription>
            Search the corporate-drinking multiverse. Powered by GIPHY.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs… try 'hungover' or 'zoom meeting'"
            className="pl-9 h-10"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                query === s
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="min-h-[260px] max-h-[420px] overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
          {loading && (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="grid place-items-center py-16 text-sm text-muted-foreground">
              {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="grid place-items-center py-16 text-sm text-muted-foreground">
              No GIFs found. Try a different keyword.
            </div>
          )}
          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => pick(it)}
                  className="group relative aspect-square overflow-hidden rounded-md border border-border bg-background hover:border-primary hover:shadow-[0_0_0_2px_var(--primary)] transition"
                  title={it.title || "Use this GIF"}
                >
                  <img
                    src={it.images.fixed_height_small.url}
                    alt={it.title || "Reaction GIF preview"}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          GIFs served by GIPHY. Search results are rated PG-13.
        </p>
      </DialogContent>
    </Dialog>
  );
}
