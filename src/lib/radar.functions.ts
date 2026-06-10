import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const WINDOW_MS = 3 * 60 * 60 * 1000;
const EARTH_KM = 6371;

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

export type ScrubbedBlip = {
  id: string;
  distKm: number;
  bearingRad: number; // 0 = north, +pi/2 = east
  color: "cyan" | "amber"; // cyan = same declared_company, amber = nearby
};

export type ScrubbedBlipsResult = {
  blips: ScrubbedBlip[];
  hasDeclaredCompany: boolean;
};

type Input = {
  latitude: number;
  longitude: number;
  maxKm: number;
};

export const getScrubbedRadarBlips = createServerFn({ method: "POST" })
  .inputValidator((data: Input) => {
    if (
      typeof data?.latitude !== "number" ||
      typeof data?.longitude !== "number" ||
      typeof data?.maxKm !== "number"
    ) {
      throw new Error("Invalid radar payload");
    }
    if (Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
      throw new Error("Invalid coordinates");
    }
    const maxKm = Math.min(50, Math.max(0.1, data.maxKm));
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      maxKm,
    };
  })
  .handler(async ({ data }): Promise<ScrubbedBlipsResult> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // 1. Optional caller identity. Anonymous homepage visitors still receive
    // scrubbed amber blips; signed-in users may receive same-company coloring.
    const authHeader = getRequestHeader("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : "";
    let userId = "";
    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData.user?.id ?? "";
    }
    const { data: me } = userId
      ? await supabaseAdmin
          .from("profiles")
          .select("declared_company")
          .eq("id", userId)
          .maybeSingle()
      : { data: null };
    const myCompany = ((me as any)?.declared_company ?? "").toString().trim().toLowerCase();

    // 2. Recent geo-tagged posts (admin read OK — we strip PII below)
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data: posts } = await supabaseAdmin
      .from("posts")
      .select("id, user_id, latitude, longitude, created_at")
      .gte("created_at", since)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .eq("is_hidden", false)
      .limit(250);

    if (!posts || posts.length === 0) {
      return { blips: [], hasDeclaredCompany: Boolean(myCompany) };
    }

    // 3. Look up declared_company for those authors in one shot
    const authorIds = Array.from(
      new Set(
        posts
          .map((p: any) => p.user_id)
          .filter((id: string | null): id is string => Boolean(id)),
      ),
    );
    let companyByUser = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: authors } = await supabaseAdmin
        .from("profiles")
        .select("id, declared_company")
        .in("id", authorIds);
      for (const a of (authors ?? []) as any[]) {
        const c = (a.declared_company ?? "").toString().trim().toLowerCase();
        if (c) companyByUser.set(a.id, c);
      }
    }

    const origin = { latitude: data.latitude, longitude: data.longitude };

    // 4. Compute scrubbed blips. Never echo company strings, names, or user_ids.
    const blips: ScrubbedBlip[] = [];
    for (const p of posts as any[]) {
      const target = { latitude: p.latitude, longitude: p.longitude };
      const distKm = haversineKm(origin, target);
      if (!isFinite(distKm) || distKm > data.maxKm) continue;
      const dLat = target.latitude - origin.latitude;
      const dLng =
        (target.longitude - origin.longitude) *
        Math.cos((origin.latitude * Math.PI) / 180);
      const bearingRad = Math.atan2(dLng, dLat);
      const authorCompany = p.user_id ? companyByUser.get(p.user_id) : undefined;
      const sameCompany =
        Boolean(myCompany) && Boolean(authorCompany) && authorCompany === myCompany;
      blips.push({
        id: p.id,
        distKm,
        bearingRad,
        color: sameCompany ? "cyan" : "amber",
      });
      if (blips.length >= 40) break;
    }

    return { blips, hasDeclaredCompany: Boolean(myCompany) };
  });
