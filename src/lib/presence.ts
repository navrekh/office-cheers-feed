import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedCity } from "@/lib/cityStore";

/**
 * Global breakroom presence channel.
 * - Tracks how many anons are "sipping" right now (presence)
 * - Broadcasts ephemeral typing pings ("someone in Bangalore is typing…")
 *
 * Singleton — joined once for the whole app, never per-component.
 */

type TypingPing = { id: string; city: string; at: number };

let channel: ReturnType<typeof supabase.channel> | null = null;
let joined = false;
let presenceCount = 0;
let typingPeers: TypingPing[] = [];
const countListeners = new Set<(n: number) => void>();
const typingListeners = new Set<(t: TypingPing[]) => void>();
const selfId =
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) + ":" + Date.now();

function pruneTyping() {
  const now = Date.now();
  const next = typingPeers.filter((t) => now - t.at < 3500 && t.id !== selfId);
  if (next.length !== typingPeers.length) {
    typingPeers = next;
    typingListeners.forEach((fn) => fn(typingPeers));
  }
}

function ensureJoined() {
  if (joined || typeof window === "undefined") return;
  joined = true;
  channel = supabase.channel("breakroom-presence", {
    config: { presence: { key: selfId }, broadcast: { self: false } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel!.presenceState();
      presenceCount = Object.keys(state).length;
      countListeners.forEach((fn) => fn(presenceCount));
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const p = payload as TypingPing;
      if (!p?.id || p.id === selfId) return;
      typingPeers = [...typingPeers.filter((t) => t.id !== p.id), { ...p, at: Date.now() }];
      typingListeners.forEach((fn) => fn(typingPeers));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel!.track({ city: getSelectedCity(), at: Date.now() });
        } catch {
          /* ignore */
        }
      }
    });

  setInterval(pruneTyping, 1500);
}

export function usePresenceCount() {
  const [n, setN] = useState(presenceCount);
  useEffect(() => {
    ensureJoined();
    countListeners.add(setN);
    setN(presenceCount);
    return () => {
      countListeners.delete(setN);
    };
  }, []);
  return n;
}

export function useTypingPeers() {
  const [peers, setPeers] = useState<TypingPing[]>(typingPeers);
  useEffect(() => {
    ensureJoined();
    typingListeners.add(setPeers);
    return () => {
      typingListeners.delete(setPeers);
    };
  }, []);
  return peers;
}

/** Throttled — call freely from a textarea onChange. */
let lastTypingSent = 0;
export function broadcastTyping() {
  ensureJoined();
  const now = Date.now();
  if (now - lastTypingSent < 1200) return;
  lastTypingSent = now;
  channel?.send({
    type: "broadcast",
    event: "typing",
    payload: { id: selfId, city: getSelectedCity(), at: now },
  });
}

/**
 * Listen to new posts inserted into the feed and fire a slim toast.
 * Mount once at the app root.
 */
export function useNewPostsNotifier(onNew?: () => void) {
  const ready = useRef(false);
  useEffect(() => {
    // Skip the initial backlog (first 4s) so we don't toast on mount
    const armTimer = setTimeout(() => {
      ready.current = true;
    }, 4000);

    const ch = supabase
      .channel("posts-firehose")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          if (!ready.current) return;
          import("sonner").then(({ toast }) => {
            const row = payload.new as { author_name?: string | null; body?: string | null };
            const who = row?.author_name || "an anon";
            const snippet = (row?.body ?? "").slice(0, 60);
            toast(`🍺 ${who} just dropped a sip`, {
              description: snippet ? `"${snippet}${(row?.body?.length ?? 0) > 60 ? "…" : ""}"` : undefined,
              duration: 4000,
              action: onNew
                ? {
                    label: "Jump to feed",
                    onClick: () => {
                      onNew();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    },
                  }
                : undefined,
            });
          });
        },
      )
      .subscribe();

    return () => {
      clearTimeout(armTimer);
      supabase.removeChannel(ch);
    };
  }, [onNew]);
}
