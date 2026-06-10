import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client-side auth hook. Hydrates once from getSession() and then
 * stays in sync with onAuthStateChange. Safe to use across the app.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set up the listener first so we never miss an event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

/** "developer_71@gmail.com" → "developer_71" */
export function emailPrefix(email?: string | null): string {
  if (!email) return "anonymous";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

/** Deterministic funny corporate codename derived from the email prefix. */
export function corporateCodename(email?: string | null): string {
  const prefix = emailPrefix(email);
  const adjectives = [
    "Colleague", "Synergy", "Stakeholder", "Intern", "Coworker",
    "Manager", "Consultant", "Operative", "Specialist", "Associate",
    "Director", "Analyst", "Strategist", "Liaison",
  ];
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) hash = (hash * 31 + prefix.charCodeAt(i)) >>> 0;
  const word = adjectives[hash % adjectives.length];
  const num = (hash % 899) + 100; // 100–998
  return `${word}_${num}`;
}

export async function signOut() {
  await supabase.auth.signOut();
}
