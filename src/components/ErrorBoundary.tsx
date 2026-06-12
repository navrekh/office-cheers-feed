import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Short label describing the wrapped surface (e.g. "Radar", "Broetry Engine"). */
  label?: string;
  /** Custom one-liner used in the fallback micro-card. */
  message?: string;
  /** Fully custom fallback renderer. Receives reset + error. */
  fallback?: (ctx: { error: Error; reset: () => void }) => ReactNode;
};

type State = { error: Error | null };

/**
 * Catches render-time errors in a contained subtree and renders a
 * humorous, on-brand micro-card instead of nuking the dashboard.
 *
 * Use to wrap async/AI-powered surfaces (radar sonar, Broetry engine,
 * meme card preview) where an invalid payload should degrade gracefully.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn(`[ErrorBoundary:${this.props.label ?? "subtree"}]`, error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    const headline = this.props.label
      ? `${this.props.label} hit a snag`
      : "This module hit a snag";
    const body =
      this.props.message ??
      "The radar hit a temporary cloud of corporate synergy. Refreshing the sonar scan…";

    return (
      <Card
        role="alert"
        className="p-5 border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950"
      >
        <div className="flex items-start gap-3">
          <span className="inline-grid place-items-center size-9 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 shrink-0">
            <AlertTriangle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-amber-100">{headline}</h3>
            <p className="text-[12px] text-amber-50/80 mt-1 leading-snug">{body}</p>
            <button
              type="button"
              onClick={this.reset}
              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-amber-400/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 transition"
            >
              <RefreshCw className="size-3.5" />
              Try again
            </button>
          </div>
        </div>
      </Card>
    );
  }
}
