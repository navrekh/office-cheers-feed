import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ExternalLink, Ticket } from "lucide-react";
import { SITE } from "@/config";

export interface ClaimTicketModalProps {
  open: boolean;
  ticket: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ClaimTicketModal({ open, ticket, onOpenChange }: ClaimTicketModalProps) {
  const [copied, setCopied] = useState(false);
  const trackUrl = ticket ? SITE.trackUrl(ticket) : "";

  async function copyLink() {
    if (!trackUrl) return;
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      toast.success("Copied! 🍻", {
        description: "Paste it somewhere safe — your laptop, your Notes app, your bartender.",
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy. Long-press the link to grab it manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 text-slate-100">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.35)]">
            <Ticket className="h-7 w-7 text-amber-300" />
          </div>
          <DialogTitle className="text-center text-xl text-amber-200">
            🍻 Post Live — Save Your Claim Ticket
          </DialogTitle>
          <DialogDescription className="text-center text-slate-300">
            Save this link! It lets you track your Cheers count, read comments, and manage your post
            anonymously from any laptop or mobile phone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-amber-500/30 bg-black/40 p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-amber-400/80">
              Your Claim Ticket
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tracking-wider text-amber-200">
              {ticket ?? "—"}
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Secret Tracking Link
            </div>
            <div className="mt-1 break-all font-mono text-xs text-slate-200">{trackUrl}</div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={copyLink}
              className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied! 🍻" : "Copy Secret Tracking Link 📋"}
            </Button>
            {ticket && (
              <Button
                type="button"
                variant="outline"
                asChild
                className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
              >
                <a href={`/track/${ticket}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </a>
              </Button>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-400">
            Lose this link and you lose the keys to your post. No password resets at this bar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClaimTicketModal;
