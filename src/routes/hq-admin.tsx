import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import AuthModal from "@/components/AuthModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Users, Trophy, Flame, Loader2 } from "lucide-react";

export const Route = createFileRoute("/hq-admin")({
  head: () => ({
    meta: [
      { title: "HQ Admin — DrinkedIn" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HqAdminPage,
});

type Lead = {
  id: string;
  pub_name: string;
  city: string;
  contact_info: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

type Deal = {
  id: string;
  pub_name: string;
  city: string;
  neighborhood: string | null;
  deal_text: string;
  urgency_level: number;
  heading_there_count: number;
  is_active: boolean;
  activated_at: string;
  expires_at: string;
};

type Metrics = {
  activeUsers: number;
  totalCheers: number;
  activePaidSlots: number;
};

function HqAdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anyAdminExists, setAnyAdminExists] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);

  // ── Identity gate ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: hasAdmin }, { count }] = await Promise.all([
        supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin" as any,
        }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin" as any),
      ]);
      if (cancelled) return;
      const ok = Boolean(hasAdmin);
      setIsAdmin(ok);
      setAnyAdminExists((count ?? 0) > 0);
      setRoleChecked(true);
      if (!ok && (count ?? 0) > 0) {
        toast.error("Unauthorized Entry! 🤫", {
          description:
            "The HR department has been notified of your network intrusion attempt.",
        });
        navigate({ to: "/" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const claimAdmin = useCallback(async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      if (data === true) {
        toast.success("Admin role claimed 🛡️", {
          description: "Welcome to HQ. The dashboard is loading.",
        });
        setIsAdmin(true);
        setAnyAdminExists(true);
      } else {
        toast.error("An admin already exists — ask them to grant you access.");
        navigate({ to: "/" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not claim admin role.");
    } finally {
      setClaiming(false);
    }
  }, [navigate]);

  // ── Guarded shells ──────────────────────────────────────────────────────
  if (authLoading || (user && !roleChecked)) {
    return <AdminSkeleton />;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 max-w-md">
          <h1 className="text-xl font-bold mb-2">HQ Admin</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Sign in with your admin account to continue.
          </p>
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
          <AuthModal
            open={authOpen}
            onOpenChange={setAuthOpen}
            reason="Sign in to access HQ Admin."
          />
        </Card>
      </div>
    );
  }
  if (!isAdmin && anyAdminExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-6 max-w-md text-center">
          <ShieldCheck className="size-10 mx-auto mb-3 text-amber-500" />
          <h1 className="text-xl font-bold mb-2">Claim HQ Admin</h1>
          <p className="text-sm text-muted-foreground mb-4">
            No administrator has been bootstrapped yet. Claim the first admin
            slot for{" "}
            <span className="font-mono">{user.email}</span>.
          </p>
          <Button onClick={claimAdmin} disabled={claiming}>
            {claiming && <Loader2 className="size-4 animate-spin mr-2" />}
            Claim admin role
          </Button>
        </Card>
      </div>
    );
  }
  if (!isAdmin) return <AdminSkeleton />;

  return <AdminDashboard />;
}

// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [metricsRes, leadsRes, dealsRes] = await Promise.all([
      loadMetrics(),
      supabase
        .from("advertiser_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("merchant_deals")
        .select("*")
        .order("activated_at", { ascending: false })
        .limit(50),
    ]);
    setMetrics(metricsRes);
    setLeads((leadsRes.data as Lead[]) ?? []);
    setDeals((dealsRes.data as Deal[]) ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch {
        if (!cancelled) toast.error("Couldn't load HQ data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const approve = useCallback(
    async (lead: Lead) => {
      setBusyId(lead.id);
      try {
        const { error } = await supabase.rpc("admin_approve_lead", {
          p_lead_id: lead.id,
          p_deal_text: null,
          p_urgency: 2,
        });
        if (error) throw error;
        toast.success(`Premium activated for ${lead.pub_name} 🔓`, {
          description: "7-day live slot pushed to the feed.",
        });
        await reload();
      } catch (e: any) {
        toast.error(e?.message ?? "Activation failed");
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const toggleDeal = useCallback(
    async (deal: Deal) => {
      setBusyId(deal.id);
      try {
        const { error } = await supabase.rpc("admin_set_deal_active", {
          p_deal_id: deal.id,
          p_active: !deal.is_active,
        });
        if (error) throw error;
        await reload();
      } catch (e: any) {
        toast.error(e?.message ?? "Update failed");
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-500" />
            <h1 className="text-lg font-bold">HQ Admin Console</h1>
            <Badge variant="outline" className="ml-2">
              restricted
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        <MetricsRow metrics={metrics} />
        <LeadsSection
          leads={leads}
          busyId={busyId}
          onApprove={approve}
        />
        <DealsSection deals={deals} busyId={busyId} onToggle={toggleDeal} />
      </main>
    </div>
  );
}

async function loadMetrics(): Promise<Metrics> {
  const [activeUsers, cheers, paidSlots] = await Promise.all([
    supabase
      .from("check_ins")
      .select("session_id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString()),
    supabase.from("posts").select("cheers_count"),
    supabase
      .from("merchant_deals")
      .select("id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString())
      .eq("is_active", true),
  ]);
  const totalCheers = ((cheers.data as { cheers_count: number }[]) ?? []).reduce(
    (acc, r) => acc + (r.cheers_count ?? 0),
    0,
  );
  return {
    activeUsers: activeUsers.count ?? 0,
    totalCheers,
    activePaidSlots: paidSlots.count ?? 0,
  };
}

// ─── Metrics ────────────────────────────────────────────────────────────────
function MetricsRow({ metrics }: { metrics: Metrics | null }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        title="Total Active Users"
        value={metrics?.activeUsers}
        icon={<Users className="size-4" />}
        accent="from-sky-500/15 to-sky-500/0 text-sky-700 dark:text-sky-300"
      />
      <MetricCard
        title="Global Cheers Counter"
        value={metrics?.totalCheers}
        icon={<Trophy className="size-4" />}
        accent="from-amber-500/15 to-amber-500/0 text-amber-700 dark:text-amber-300"
      />
      <MetricCard
        title="Active Paid Slots"
        value={metrics?.activePaidSlots}
        icon={<Flame className="size-4" />}
        accent="from-rose-500/15 to-rose-500/0 text-rose-700 dark:text-rose-300"
      />
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${accent} p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {title}
        </span>
        {icon}
      </div>
      <div className="mt-4 text-3xl font-bold tabular-nums">
        {value === undefined ? <Skeleton className="h-8 w-20" /> : value.toLocaleString()}
      </div>
    </Card>
  );
}

// ─── Leads ──────────────────────────────────────────────────────────────────
function LeadsSection({
  leads,
  busyId,
  onApprove,
}: {
  leads: Lead[] | null;
  busyId: string | null;
  onApprove: (lead: Lead) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    if (!leads) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.pub_name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.contact_info.toLowerCase().includes(q),
    );
  }, [leads, filter]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Sponsorship Leads</h2>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by pub, city, email…"
          className="max-w-xs"
        />
      </div>
      <Card className="overflow-hidden">
        {filtered === null ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            No leads yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pub</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const approved = !!l.approved_at;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.pub_name}</TableCell>
                    <TableCell>{l.city}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.contact_info}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {approved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          Activated
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={approved || busyId === l.id}
                        onClick={() => onApprove(l)}
                        className="bg-amber-500 hover:bg-amber-400 text-amber-950"
                      >
                        {busyId === l.id && (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        )}
                        Activate Premium 🔓
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}

// ─── Deals ──────────────────────────────────────────────────────────────────
function DealsSection({
  deals,
  busyId,
  onToggle,
}: {
  deals: Deal[] | null;
  busyId: string | null;
  onToggle: (deal: Deal) => void;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Live Merchant Deals</h2>
      <Card className="overflow-hidden">
        {deals === null ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : deals.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            No deals yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pub</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Heading there</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((d) => {
                const expired = new Date(d.expires_at).getTime() <= Date.now();
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.pub_name}</TableCell>
                    <TableCell>{d.city}</TableCell>
                    <TableCell className="max-w-[26rem] truncate" title={d.deal_text}>
                      {d.deal_text}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {d.heading_there_count}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.expires_at).toLocaleString()}
                      {expired && (
                        <Badge variant="outline" className="ml-2">
                          expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={d.is_active ? "outline" : "default"}
                        disabled={busyId === d.id}
                        onClick={() => onToggle(d)}
                      >
                        {busyId === d.id && (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        )}
                        {d.is_active ? "Pause" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────
function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
