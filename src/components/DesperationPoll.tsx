import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { trackEngagement } from "@/lib/analytics";
import { useAuth } from "@/lib/useAuth";
import { useCurrentCity } from "@/lib/useCurrentCity";

type Tone = "danger" | "thread" | "chill";

type PollChoice = {
  key: Tone;
  emoji: string;
  label: string;
  accent: string;
  bar: string;
};

type Poll = {
  id: string;
  question: string;
  choices: PollChoice[];
};

const TONE_STYLE: Record<Tone, { accent: string; bar: string; emoji: string }> = {
  danger: {
    emoji: "🔴",
    accent:
      "border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:border-red-300/70 shadow-[0_0_18px_rgba(248,113,113,0.25)]",
    bar: "from-red-500 to-rose-400",
  },
  thread: {
    emoji: "🟡",
    accent:
      "border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.25)]",
    bar: "from-amber-400 to-yellow-300",
  },
  chill: {
    emoji: "🟢",
    accent:
      "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-300/70 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
    bar: "from-emerald-400 to-teal-300",
  },
};

function makeChoice(key: Tone, label: string): PollChoice {
  const s = TONE_STYLE[key];
  return { key, emoji: s.emoji, label, accent: s.accent, bar: s.bar };
}

const POLLS: Poll[] = [
  {
    id: "friday_huddle",
    question:
      "Your manager asks for a 'quick 5-minute huddle' at 4:45 PM on a Friday. What's your move?",
    choices: [
      makeChoice("danger", "Fake a sudden internet outage"),
      makeChoice("thread", "Accept and cry silently with camera off"),
      makeChoice("chill", "Press the Panic Button and run"),
    ],
  },
  {
    id: "buzzword_rage",
    question:
      "Which corporate synergy buzzword makes you want to throw your laptop into a lake?",
    choices: [
      makeChoice("danger", "'Let's circle back & align'"),
      makeChoice("thread", "'Let's take this offline'"),
      makeChoice("chill", "'Let's maximize our bandwidth'"),
    ],
  },
  {
    id: "standup_waste",
    question:
      "What percentage of your daily standup could have been a 2-line Slack message?",
    choices: [
      makeChoice("danger", "80% (Absolute waste of time)"),
      makeChoice("thread", "100% (Could've been an email)"),
      makeChoice("chill", "120% (It actively hurt my brain)"),
    ],
  },
  {
    id: "battery_life",
    question: "Current state of your corporate battery life right now:",
    choices: [
      makeChoice("danger", "1% (Running on pure dark humor)"),
      makeChoice("thread", "Critical Saver Mode"),
      makeChoice("chill", "Completely fried"),
    ],
  },
  {
    id: "eta_panic",
    question:
      "Your manager asks for your 'updated ETA' on a task you started exactly 14 minutes ago. Current status?",
    choices: [
      makeChoice("danger", "Writing a 3-page justification essay"),
      makeChoice("thread", "Intentionally moving Jira tickets back and forth"),
      makeChoice("chill", "Closing laptop to seek immediate sanctuary"),
    ],
  },
  {
    id: "urgent_alignment",
    question:
      "A Friday email arrives titled: 'Urgent Alignment on Cross-Functional Synergies'. Your internal translation?",
    choices: [
      makeChoice("danger", "Someone panicked and scheduled a 2-hour meeting"),
      makeChoice("thread", "My weekend plans are officially under heavy risk"),
      makeChoice("chill", "Mark as read and escape to the nearest brewery"),
    ],
  },
  {
    id: "meeting_overrun",
    question:
      "Primary survival mechanism when a meeting extends 20 minutes past its scheduled end?",
    choices: [
      makeChoice("danger", "Staring blankly at my wallpaper"),
      makeChoice("thread", "Aggressively typing passive-aggressive Slack vents"),
      makeChoice("chill", "Double-clicking the 'Panic Button' for visual peace"),
    ],
  },
  {
    id: "ai_tracking_tool",
    question:
      "Your team adopts a new 'AI-powered productivity tracking tool'. Immediate response?",
    choices: [
      makeChoice("danger", "Setting up an automated mouse-jiggler macro"),
      makeChoice("thread", "Looking for a new job with a less dystopian stack"),
      makeChoice("chill", "Generating a high-cringe Broetry card about it"),
    ],
  },
  {
    id: "mandatory_fun",
    question:
      "Newsletter announces a 'Mandatory Virtual Friday Happy Hour'. Your vibe?",
    choices: [
      makeChoice("danger", "Maximum awkwardness over Zoom camera"),
      makeChoice("thread", "Claiming my local camera hardware just malfunctioned"),
      makeChoice("chill", "Sneaking out to a real taproom under an anonymous mask"),
    ],
  },
  {
    id: "calendar_optimized",
    question:
      "Your calendar has been 'optimized' with 6 back-to-back huddles on Friday morning. Remaining energy?",
    choices: [
      makeChoice("danger", "0% (Running entirely on caffeine and spite)"),
      makeChoice("thread", "Critical thermal throttling"),
      makeChoice("chill", "Sub-zero motivation"),
    ],
  },
  {
    id: "offline_translation",
    question:
      "What does 'Let's take this offline' actually mean in an executive board meeting?",
    choices: [
      makeChoice("danger", "'Stop talking, you are ruining my slide deck'"),
      makeChoice("thread", "'We are never going to discuss this again'"),
      makeChoice("chill", "'Meet me at the nearest pub in 10 minutes'"),
    ],
  },
  {
    id: "hyper_hybrid_matrix",
    question:
      "Your company rolls out a 'Hyper-Hybrid-Synchronous Workspace Collaboration Matrix'. What even is that?",
    choices: [
      makeChoice("danger", "A random string of words HR found on LinkedIn"),
      makeChoice("thread", "An expensive way to track my badge sign-ins"),
      makeChoice("chill", "An undeniable sign that I need a cold craft beer"),
    ],
  },
  {
    id: "friday_prod_bug",
    question:
      "You find a massive bug in production at 4:55 PM on a Friday. Standard protocol?",
    choices: [
      makeChoice("danger", "Blame a deprecated third-party microservice API"),
      makeChoice("thread", "Commit, push, turn off phone, and run"),
      makeChoice("chill", "Pretend the entire cloud region is experiencing an outage"),
    ],
  },
  {
    id: "ballpark_estimate",
    question:
      "PM asks for a 'High-Level Ballpark Estimation' that will become a hard deadline. Your estimate strategy?",
    choices: [
      makeChoice("danger", "Take my true estimate and multiply it by 4"),
      makeChoice("thread", "Guess a random number between 1 and 45 weeks"),
      makeChoice("chill", "Shrug and look for the nearest happy hour slot"),
    ],
  },
  {
    id: "tech_park_traffic",
    question:
      "The tech-park corridor outside your office is completely red on Google Maps at 4 PM. Your strategy?",
    choices: [
      makeChoice("danger", "Wait it out in a highly depressing cubicle"),
      makeChoice("thread", "Brave the gridlock and question my life choices"),
      makeChoice("chill", "Take refuge at the closest brewery on the radar grid"),
    ],
  },
  {
    id: "linkedin_cringe",
    question:
      "Influencer posts: 'Why I love waking up at 4 AM to review legacy enterprise codebases'. Your reaction?",
    choices: [
      makeChoice("danger", "Report the post for deeply offensive content"),
      makeChoice("thread", "Instantly feed it to the Broetry Engine for a parody"),
      makeChoice("chill", "Close LinkedIn forever out of pure cringe"),
    ],
  },
  {
    id: "hey_navin",
    question:
      "Your manager Slacks 'Hey Navin.' with no further context or typing indicator. State of mind?",
    choices: [
      makeChoice("danger", "Calculating my severance package options"),
      makeChoice("thread", "Heart rate instantly spiking past 150 BPM"),
      makeChoice("chill", "Disappearing into anonymous camouflage mode"),
    ],
  },
  {
    id: "pantry_downgrade",
    question:
      "The pantry replaces premium coffee with a budget instant-mix. What is this signal?",
    choices: [
      makeChoice("danger", "The company's Q3 budget runway is actively collapsing"),
      makeChoice("thread", "A declaration of war against the engineering team"),
      makeChoice("chill", "Time to transition my portfolio to a pub table"),
    ],
  },
  {
    id: "weekly_report",
    question:
      "Weekly report demands 'Actionable, Data-Driven Key Results'. Your actual status?",
    choices: [
      makeChoice("danger", "Survived 4 status alignment huddles"),
      makeChoice("thread", "Wrote 3 lines of code and deleted 400 lines"),
      makeChoice("chill", "Spent the entire day looking at the spatial radar"),
    ],
  },
  {
    id: "laptop_boot_25min",
    question:
      "Your corporate laptop takes 25 minutes to boot from security scans. What is that time used for?",
    choices: [
      makeChoice("danger", "Questioning why I chose a career in software delivery"),
      makeChoice("thread", "Drinking a third cup of tea in deep silence"),
      makeChoice("chill", "Checking the local tech-park burnout leaderboard"),
    ],
  },
  {
    id: "retro_spillover",
    question:
      "Your Scrum Master adds an 'Urgent Retrospective Spillover Sync' to your calendar. What is this?",
    choices: [
      makeChoice("danger", "A meeting about a meeting that could have been a chat"),
      makeChoice("thread", "An elaborate strategy to waste my remaining brain cells"),
      makeChoice("chill", "My cue to double-click the Manager Panic Button"),
    ],
  },
  {
    id: "jira_honesty",
    question:
      "Before a stakeholder review, the honest state of your Jira ticket?",
    choices: [
      makeChoice("danger", "In Progress (I haven't opened the codebase yet)"),
      makeChoice("thread", "Under Review (I'm praying it compiles)"),
      makeChoice("chill", "Fled to Taproom (The ticket is abandoned)"),
    ],
  },
  {
    id: "wellness_webinar",
    question:
      "Mandatory 'Corporate Wellness Webinar on Overcoming Burnout'. When is it scheduled?",
    choices: [
      makeChoice("danger", "Friday at 4:30 PM (The ultimate irony)"),
      makeChoice("thread", "During my lunch break"),
      makeChoice("chill", "I don't know, I marked it as spam instantly"),
    ],
  },
  {
    id: "bandwidth_synergy",
    question:
      "A colleague says 'Let's maximize our human bandwidth synergy' in casual chat. Your reaction?",
    choices: [
      makeChoice("danger", "Visibly flinch and mute my Zoom microphone"),
      makeChoice("thread", "Send their name directly to the Broetry Engine"),
      makeChoice("chill", "Stare into space and question my entire life path"),
    ],
  },
  {
    id: "music_blocked",
    question:
      "IT blocks your favorite music streaming app on your office laptop. What is this signal?",
    choices: [
      makeChoice("danger", "A direct assault on developer productivity"),
      makeChoice("thread", "They want me to listen to server fans hum all day"),
      makeChoice("chill", "Time to close the lid and head to the nearest brewery"),
    ],
  },
  {
    id: "zero_meetings",
    question:
      "Friday morning: zero meetings scheduled. Your immediate reaction?",
    choices: [
      makeChoice("danger", "This is a trap, a crisis is definitely cooking"),
      makeChoice("thread", "Close my laptop slowly and walk away before they notice"),
      makeChoice("chill", "Celebrate by checking the local tech park radar"),
    ],
  },
  {
    id: "quick_second",
    question:
      "Manager Slacks 'Got a quick second?'. What do they actually mean?",
    choices: [
      makeChoice("danger", "'Prepare to absorb a massive task no one else wants'"),
      makeChoice("thread", "'I am going to micro-manage your afternoon'"),
      makeChoice("chill", "'Please save me from this stakeholder review huddle'"),
    ],
  },
  {
    id: "micro_sprints",
    question:
      "Team moves to 'Daily Micro-Sprints with Hourly Standups'. Your survival plan?",
    choices: [
      makeChoice("danger", "Automate my Git commits using a randomized cron job"),
      makeChoice("thread", "Quietly resign and become a full-time mixologist"),
      makeChoice("chill", "Hide behind an anonymous mask on the DrinkedIn feed"),
    ],
  },
  {
    id: "collab_pods",
    question:
      "Expensive new 'Ergonomic Open Office Collab Pods' are unveiled. Actual use?",
    choices: [
      makeChoice("danger", "Taking calls from recruiters in complete privacy"),
      makeChoice("thread", "Hiding from my cross-functional project delivery lead"),
      makeChoice("chill", "Looking at pictures of cold craft beers on my phone"),
    ],
  },
  {
    id: "value_vectors",
    question:
      "Align your scope with the 'Overarching Global Strategic Value Vectors'. Your strategy?",
    choices: [
      makeChoice("danger", "Using an AI generator to string random buzzwords together"),
      makeChoice("thread", "Nodding intensely on the video call while muted"),
      makeChoice("chill", "Mapping out the spatial path to the closest happy hour"),
    ],
  },
  {
    id: "os_update_45min",
    question:
      "OS forces a 45-minute update mid-deployment. Your move?",
    choices: [
      makeChoice("danger", "Stare at the progress bar with pure existential dread"),
      makeChoice("thread", "Use it as an unassailable excuse to take an early lunch"),
      makeChoice("chill", "Open DrinkedIn on my personal mobile device instantly"),
    ],
  },
  {
    id: "paradigm_shift_deck",
    question:
      "Leadership drops a 50-slide deck: 'The Future of Our Paradigm Shift'. How many slides do you read?",
    choices: [
      makeChoice("danger", "0 slides (Downloaded the PDF and archived it)"),
      makeChoice("thread", "1 slide (The cover slide, out of pure accident)"),
      makeChoice("chill", "Only the final slide to see if there is an exit package"),
    ],
  },
  {
    id: "weekend_grind",
    question:
      "Manager asks you to work the weekend for an arbitrary client deadline. Internal response?",
    choices: [
      makeChoice("danger", "Drafting a highly professional 'No' email template"),
      makeChoice("thread", "Setting my Slack status to 'Out of Office' permanently"),
      makeChoice("chill", "Taking a drive straight out of the tech park to a pub"),
    ],
  },
  {
    id: "compliance_trivia",
    question:
      "HR hosts a virtual trivia game about compliance policies. Your engagement level?",
    choices: [
      makeChoice("danger", "Sub-zero (Muted, camera off, looking at flight tickets)"),
      makeChoice("thread", "Intentionally clicking the wrong answers to fail fast"),
      makeChoice("chill", "Escaping to the live local vibe board to see who is out"),
    ],
  },
  {
    id: "hr_linkedin_request",
    question:
      "HR director sends you a LinkedIn request at 8 PM on a weekday. What is this?",
    choices: [
      makeChoice("danger", "An absolute boundary violation"),
      makeChoice("thread", "They found my anonymous confessions profile"),
      makeChoice("chill", "Time to switch to a self-declared corporate mask"),
    ],
  },
  {
    id: "deprecated_docs",
    question:
      "Shared docs drive has 4,000 pages of deprecated frameworks. How do you navigate it?",
    choices: [
      makeChoice("danger", "Close the browser tab and pray the system doesn't break"),
      makeChoice("thread", "Ask an AI chatbot to summarize the madness"),
      makeChoice("chill", "Give up entirely and seek an immediate cold beverage"),
    ],
  },
  {
    id: "rto_innovation",
    question:
      "Strict RTO policy for 'In-Person Organic Innovation'. What have you innovated so far?",
    choices: [
      makeChoice("danger", "New ways to look busy while staring at an empty Excel sheet"),
      makeChoice("thread", "A deep understanding of peak tech-park traffic hours"),
      makeChoice("chill", "Sneaking out of the building completely unnoticed"),
    ],
  },
  {
    id: "ui_rewrite_3days",
    question:
      "Stakeholder demands a UI rewrite three days before launch. Your response?",
    choices: [
      makeChoice("danger", "Cry in the server room"),
      makeChoice("thread", "Update my resume while the deployment script runs"),
      makeChoice("chill", "Run a Haversine proximity scan for the nearest taproom"),
    ],
  },
  {
    id: "lean_startup_irony",
    question:
      "'Operate like a lean startup' but 14 approvals for a $10 server upgrade. The reality?",
    choices: [
      makeChoice("danger", "Corporate matrix comedy at its finest"),
      makeChoice("thread", "Running on pure bureaucratic friction"),
      makeChoice("chill", "Time to take this offline permanently at a bar"),
    ],
  },
  {
    id: "emergency_channel",
    question:
      "You've been added to '#project-recovery-emergency-alignment'. Your stress level?",
    choices: [
      makeChoice("danger", "Off the charts (Heart rate matching a high-velocity server cluster)"),
      makeChoice("thread", "Looking for the 'Leave Channel' button instantly"),
      makeChoice("chill", "Activating full-screen corporate camouflage mode"),
    ],
  },
  {
    id: "deep_dive_blocker",
    question:
      "45 unread messages saying 'Let's deep-dive into this blocker'. What are you doing?",
    choices: [
      makeChoice("danger", "Closing the app and pretending my laptop went offline"),
      makeChoice("thread", "Replying with a single generic thumbs-up emoji"),
      makeChoice("chill", "Heading towards the nearest happy hour slot immediately"),
    ],
  },
  {
    id: "self_eval",
    question:
      "Self-evaluation: your 'Core Technical Leadership Triumphs' this quarter?",
    choices: [
      makeChoice("danger", "'I survived 90 separate huddles without losing my mind'"),
      makeChoice("thread", "'I successfully avoided updating my Jira tickets'"),
      makeChoice("chill", "'I built a secret spatial radar to find local breweries'"),
    ],
  },
  {
    id: "eu_friday_sync",
    question:
      "Your manager suggests an 'urgent sync' on Friday afternoon, completely violating the sacred weekend boundary. Your move?",
    choices: [
      makeChoice("danger", "Close laptop immediately and cite European labor laws"),
      makeChoice("thread", "Log off silently and pretend my home internet router exploded"),
      makeChoice("chill", "Run directly to the nearest pub/bistro for an early pint"),
    ],
  },
  {
    id: "eu_friday_330",
    question:
      "It is 3:30 PM on a Friday in Amsterdam/Berlin. What percentage of your engineering team is actually still online?",
    choices: [
      makeChoice("danger", "10% (Just the interns who forgot it's Friday)"),
      makeChoice("thread", "0% (Everyone has already transitioned to the Fredagsbar/Aperitivo)"),
      makeChoice("chill", "-5% (The Slack statuses are active but everyone is out)"),
    ],
  },
  {
    id: "eu_cross_border_matrix",
    question:
      "Your company sets up a 'Cross-Border Synergy Alignment Matrix' across 4 European time zones. What is the outcome?",
    choices: [
      makeChoice("danger", "4 hours of completely missing calendar invites"),
      makeChoice("thread", "Endlessly debating who has to take the late huddle"),
      makeChoice("chill", "An immediate reason to close the lid and grab a cold drink"),
    ],
  },
  {
    id: "eu_with_all_due_respect",
    question:
      "What does an email from a London-based director saying 'With all due respect' actually mean?",
    choices: [
      makeChoice("danger", "'You are completely wrong and I am highly annoyed'"),
      makeChoice("thread", "'I didn't read your documentation updates'"),
      makeChoice("chill", "'Meet me at the Shoreditch pub in 5 minutes'"),
    ],
  },
];

const VOTED_KEY = (pollId: string) => `drinkedin_voted_poll_${pollId}`;

// Deterministic pseudo-random per pollId+hub so the % chart feels "localized" but stable.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function simulatedCounts(pollId: string, hub: string): Record<Tone, number> {
  const seed = hash(`${pollId}::${hub}`);
  const a = 80 + (seed % 220);
  const b = 60 + ((seed >> 7) % 240);
  const c = 50 + ((seed >> 14) % 260);
  return { danger: a, thread: b, chill: c };
}

export default function DesperationPoll({ onSignUp }: { onSignUp: (reason?: string) => void }) {
  const { user } = useAuth();
  const hub = useCurrentCity();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [choice, setChoice] = useState<Tone | null>(null);
  const [counts, setCounts] = useState<Record<Tone, number>>({
    danger: 0,
    thread: 0,
    chill: 0,
  });

  // Pick a random poll on mount (client-only to avoid SSR hydration drift).
  useEffect(() => {
    const picked = POLLS[Math.floor(Math.random() * POLLS.length)];
    setPoll(picked);
    setCounts(simulatedCounts(picked.id, hub));
    if (typeof window !== "undefined") {
      try {
        const prior = localStorage.getItem(VOTED_KEY(picked.id));
        if (prior === "danger" || prior === "thread" || prior === "chill") {
          setChoice(prior);
        }
      } catch {
        /* ignore */
      }
    }
  }, [hub]);

  const total = useMemo(
    () => counts.danger + counts.thread + counts.chill,
    [counts],
  );

  function vote(opt: Tone) {
    if (!poll || choice) return;
    setChoice(opt);
    setCounts((prev) => ({ ...prev, [opt]: prev[opt] + 1 }));
    try {
      localStorage.setItem(VOTED_KEY(poll.id), opt);
    } catch {
      /* ignore */
    }
    trackEngagement("desperation_poll_vote", {
      poll_id: poll.id,
      choice: opt,
      hub,
    });
  }

  function handleSignUp(reason?: string) {
    trackEngagement("desperation_poll_signup_click", {
      poll_id: poll?.id ?? "none",
      choice: choice ?? "none",
      hub,
    });
    onSignUp(reason);
  }

  function rollNextPoll() {
    if (!user) {
      handleSignUp(
        "Want to keep rolling the burnout matrix? Lock in your permanent anonymous streak with 1-click Google Sign-In.",
      );
      return;
    }
    // Signed-in users get a fresh random poll (different from the current one).
    const pool = poll ? POLLS.filter((p) => p.id !== poll.id) : POLLS;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setPoll(next);
    setCounts(simulatedCounts(next.id, hub));
    try {
      const prior = localStorage.getItem(VOTED_KEY(next.id));
      setChoice(prior === "danger" || prior === "thread" || prior === "chill" ? prior : null);
    } catch {
      setChoice(null);
    }
    trackEngagement("desperation_poll_roll_next", { poll_id: next.id, hub });
  }

  return (
    <Card className="p-5 border-border animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200/90">
            📊 Today's Desperation Index{" "}
            <span className="text-[10px] text-muted-foreground normal-case tracking-normal">
              · {hub}
            </span>
          </h3>
          <p className="mt-1 text-[13px] text-foreground/85 leading-snug">
            {poll?.question ?? "Loading today's question…"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
          Live · {total.toLocaleString()} votes
        </span>
      </div>

      {poll && !choice && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 animate-fade-in">
          {poll.choices.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => vote(opt.key)}
              className={`group flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition hover-scale ${opt.accent}`}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[13px] font-bold leading-tight">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {poll && choice && (
        <div className="space-y-2 animate-fade-in">
          {poll.choices.map((opt) => {
            const value = counts[opt.key];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const mine = opt.key === choice;
            return (
              <div key={opt.key} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span
                    className={`font-semibold ${
                      mine ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                    {mine && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
                        Your pick
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums font-mono text-[11px] text-muted-foreground">
                    {pct}% · {value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${opt.bar} transition-[width] duration-700 ease-out ${
                      mine ? "shadow-[0_0_12px_rgba(251,191,36,0.45)]" : ""
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <SlackStatusAutomator choice={choice} />



          <button
            type="button"
            onClick={rollNextPoll}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 via-purple-500/15 to-fuchsia-500/15 hover:from-fuchsia-500/25 hover:to-fuchsia-500/25 hover:border-fuchsia-300/70 transition px-3 py-2.5 text-[12px] font-bold tracking-wide text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,0.18)]"
          >
            🎲 Roll Next Funny Poll
            {!user && <span className="text-[10px] font-normal text-fuchsia-200/75">(1-click Google)</span>}
          </button>

          {!user && (
            <button
              type="button"
              onClick={() => handleSignUp()}
              className="mt-2 w-full text-left rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/15 hover:border-amber-300/60 transition px-3 py-2.5 text-[12px] leading-snug text-amber-100/95"
            >
              🔗{" "}
              <span className="font-bold">
                Lock your vote on the live leaderboard
              </span>{" "}
              and drop an anonymous confession.{" "}
              <span className="underline decoration-amber-300/60 underline-offset-2">
                Tap to sign in
              </span>{" "}
              <span className="text-amber-200/75">(1-Click Google)</span>
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
