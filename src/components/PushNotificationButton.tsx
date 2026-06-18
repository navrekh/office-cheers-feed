import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { savePushSubscription, deletePushSubscription } from "@/lib/push.functions";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push.config";

type Status = "unsupported" | "denied" | "default" | "subscribed" | "loading";

export function PushNotificationButton() {
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(deletePushSubscription);
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (cancelled) return;

        if (Notification.permission === "denied") {
          setStatus("denied");
        } else if (sub) {
          setStatus("subscribed");
        } else {
          setStatus("default");
        }
      } catch (e) {
        console.error("[push] check failed", e);
        if (!cancelled) setStatus("default");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        toast.error("Notifications blocked. Enable them in your browser settings.");
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration("/sw-push.js")) ||
        (await navigator.serviceWorker.register("/sw-push.js", { scope: "/" }));
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Browser returned an incomplete subscription");
      }

      await save({
        data: {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        },
      });

      setStatus("subscribed");
      toast.success("🔔 You'll get a ping the moment someone decodes you.");
    } catch (e: any) {
      console.error("[push] enable failed", e);
      toast.error(e?.message || "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        try { await remove({ data: { endpoint } }); } catch {}
      }
      setStatus("default");
      toast("Notifications turned off.");
    } catch (e) {
      console.error("[push] disable failed", e);
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Loader2 className="size-3.5 animate-spin" /> Checking notifications…
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2 font-semibold text-neutral-300">
          <BellOff className="size-4" /> Push not supported here
        </div>
        <p className="mt-1 leading-snug">
          Your browser doesn't support web push, or you're inside an in-app browser.
          On iPhone, open this page in Safari and add it to your Home Screen first.
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
        <div className="flex items-center gap-2 font-semibold">
          <BellOff className="size-4" /> Notifications blocked
        </div>
        <p className="mt-1 leading-snug">
          You blocked notifications for this site. Re-enable them in your browser's site settings,
          then refresh.
        </p>
      </div>
    );
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex items-center gap-2 text-xs text-emerald-200">
          <BellRing className="size-4" />
          <span className="font-semibold">Push notifications: ON</span>
          <span className="hidden sm:inline text-emerald-300/70">— you'll be pinged when decoded</span>
        </div>
        <button
          onClick={disable}
          disabled={busy}
          className="rounded-md border border-emerald-500/40 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          Turn off
        </button>
      </div>
    );
  }

  // default
  return (
    <button
      onClick={enable}
      disabled={busy}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-left transition hover:border-amber-400/60 hover:bg-amber-400/10 disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-amber-400/15 text-amber-300">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
        </span>
        <div>
          <div className="text-sm font-bold text-amber-100">
            Get pinged when someone decodes you
          </div>
          <div className="text-[11px] text-neutral-400">
            Live push notification — fires the second a spy opens your dossier.
          </div>
        </div>
      </div>
      <span className="rounded-md bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-neutral-950 group-hover:bg-amber-300">
        Enable
      </span>
    </button>
  );
}

export default PushNotificationButton;
