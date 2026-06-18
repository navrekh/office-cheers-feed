import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

type Status = "idle" | "starting" | "scanning" | "success" | "error";

const SCANNER_ID = "drinkedin-qr-scanner-region";

/**
 * Extract a Drinkedin handle from a scanned string.
 * Accepts:
 *   - https://drinkedin.me/u/handle
 *   - https://*.lovable.app/u/handle
 *   - /u/handle
 *   - @handle
 *   - bare "handle"
 */
function parseHandle(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Try as URL
  try {
    const url = new URL(s, window.location.origin);
    const m = url.pathname.match(/\/u\/([A-Za-z0-9_.-]{2,32})/);
    if (m) return m[1].toLowerCase();
  } catch {}

  // /u/handle
  const path = s.match(/^\/?u\/([A-Za-z0-9_.-]{2,32})$/);
  if (path) return path[1].toLowerCase();

  // @handle or bare handle
  const tag = s.match(/^@?([A-Za-z0-9_.-]{2,32})$/);
  if (tag) return tag[1].toLowerCase();

  return null;
}

export function QrScannerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus("starting");
    setError(null);
    setDecoded(null);

    const start = async () => {
      try {
        // Wait one tick so the DOM node exists
        await new Promise((r) => setTimeout(r, 50));
        if (cancelled) return;

        const instance = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            const handle = parseHandle(decodedText);
            if (!handle) {
              // Not a Drinkedin badge — keep scanning but flash a hint
              setError(`Scanned: "${decodedText.slice(0, 40)}" — not a Drinkedin badge.`);
              return;
            }
            setDecoded(handle);
            setStatus("success");
            // Stop scanning and navigate
            instance
              .stop()
              .catch(() => {})
              .finally(() => {
                toast.success(`Decoded @${handle} — opening dossier…`);
                navigate({ to: "/u/$handle", params: { handle } });
                onClose();
              });
          },
          () => {
            // per-frame failure callback — ignore noise
          },
        );

        if (!cancelled) setStatus("scanning");
      } catch (e: any) {
        if (cancelled) return;
        console.error("[QrScanner] failed to start:", e);
        const msg =
          e?.name === "NotAllowedError"
            ? "Camera access was denied. Enable it in your browser settings and try again."
            : e?.name === "NotFoundError"
            ? "No camera found on this device."
            : "Could not start the camera. Make sure no other app is using it.";
        setError(msg);
        setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (inst) {
        inst
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              inst.clear();
            } catch {}
          });
      }
    };
  }, [open, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-amber-400/30 bg-neutral-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80">
            <Camera className="size-3.5" /> Decode a dossier
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="grid size-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-black aspect-square">
          <div id={SCANNER_ID} className="absolute inset-0 [&>video]:!w-full [&>video]:!h-full [&>video]:object-cover" />

          {status === "starting" && (
            <div className="absolute inset-0 grid place-items-center text-center text-xs text-neutral-400">
              <div>
                <div className="mx-auto mb-2 size-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                Starting camera…
              </div>
            </div>
          )}

          {status === "scanning" && (
            <>
              {/* Reticle */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="relative size-60">
                  <span className="absolute left-0 top-0 size-6 border-l-2 border-t-2 border-amber-400" />
                  <span className="absolute right-0 top-0 size-6 border-r-2 border-t-2 border-amber-400" />
                  <span className="absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-amber-400" />
                  <span className="absolute bottom-0 right-0 size-6 border-b-2 border-r-2 border-amber-400" />
                  <span className="absolute inset-x-0 top-1/2 h-px bg-amber-400/60 animate-pulse" />
                </div>
              </div>
              <div className="absolute bottom-2 inset-x-2 rounded-md bg-black/60 backdrop-blur px-3 py-1.5 text-center text-[11px] text-amber-100">
                Point at a Drinkedin badge QR
              </div>
            </>
          )}

          {status === "success" && decoded && (
            <div className="absolute inset-0 grid place-items-center bg-black/80">
              <div className="text-center">
                <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-400" />
                <div className="text-xs uppercase tracking-wider text-emerald-300">Decoded</div>
                <div className="mt-1 font-mono text-lg font-bold text-amber-200">@{decoded}</div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
              <div>
                <AlertCircle className="mx-auto mb-2 size-10 text-rose-400" />
                <p className="text-xs text-neutral-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        {error && status === "scanning" && (
          <p className="mt-3 rounded-md bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
            {error}
          </p>
        )}

        <p className="mt-3 text-center text-[10px] text-neutral-500">
          Tip: badges look like <span className="font-mono text-neutral-400">drinkedin.me/u/handle</span>
        </p>
      </div>
    </div>
  );
}

export default QrScannerModal;
