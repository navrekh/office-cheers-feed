import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SITE_URL } from "../config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const siteName = "DrinkedIn";
    const ogImage = `${SITE_URL}/og-card.jpg`;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "author", content: siteName },
        { name: "theme-color", content: "#0a0a0a" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: siteName },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "DrinkedIn — Broetry post preview with amber neon glow" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@drinkedin" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/favicon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Special+Elite&family=Permanent+Marker&family=Courier+Prime:wght@400;700&family=Archivo+Black&family=Hind:wght@400;500;600;700&display=swap",
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: siteName,
                alternateName: ["DrinkedIn.me", "Drinked In", "The Anti-LinkedIn"],
                url: `${SITE_URL}/`,
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE_URL}/favicon.png`,
                  width: 512,
                  height: 512,
                },
                image: ogImage,
                description:
                  "Anti-LinkedIn parody social network for anonymous workplace confessions, satirical corporate humor, and verified happy hours.",
                foundingDate: "2025",
                knowsAbout: [
                  "workplace culture",
                  "corporate satire",
                  "anonymous social networks",
                  "burnout",
                  "job search humor",
                  "LinkedIn parody",
                ],
                sameAs: [
                  "https://twitter.com/drinkedin",
                  "https://www.drinkedin.me",
                ],
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                name: siteName,
                url: `${SITE_URL}/`,
                description:
                  "Anonymous workplace confessions, satirical corporate feed, and verified happy hours. The anti-LinkedIn.",
                publisher: { "@id": `${SITE_URL}/#organization` },
                inLanguage: "en",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${SITE_URL}/?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "WebApplication",
                "@id": `${SITE_URL}/#webapp`,
                name: siteName,
                url: `${SITE_URL}/`,
                applicationCategory: "SocialNetworkingApplication",
                operatingSystem: "Web",
                browserRequirements: "Requires JavaScript. Requires a modern browser.",
                description:
                  "Anonymous social feed for corporate workers. Post confessions, track burnout on #TheGrind, and share a Spy Badge profile.",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                featureList: [
                  "Anonymous confessions feed",
                  "#TheGrind burnout portal",
                  "PII scrubber for screenshots",
                  "Spy Badge shareable profile",
                  "Anonymous peer voting on survival metrics",
                  "Real-time reply notifications",
                ],
              },
              {
                "@type": "FAQPage",
                "@id": `${SITE_URL}/#faq`,
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "What is DrinkedIn?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "DrinkedIn is a satirical, anti-LinkedIn social network where corporate workers post anonymous workplace confessions, track burnout on #TheGrind, and share a Spy Badge profile. It is a parody platform not affiliated with LinkedIn.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Is DrinkedIn actually anonymous?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Yes. Posts and votes on your Spy Badge are identity-isolated — public views show only anonymous handles, and voting never captures user data.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Can I post about my real company?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "No. A composer-side filter blocks real company names and suggests satirical archetypes like 'Big 4 Auditor' or 'FAANG PM' instead. This keeps content legally safe and universally relatable.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "What is #TheGrind?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "#TheGrind is DrinkedIn's layoff-era survival portal — a dashboard with a PII scrubber for screenshots, a Ghost Tracker for job applications, a Shame Index leaderboard by corporate archetype, and a Direct Bypass anonymous referral sandbox.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "How is DrinkedIn different from LinkedIn or Glassdoor?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "LinkedIn is performative career theater. Glassdoor is anonymous but dry. DrinkedIn is the funny, satirical middle — anonymous confessions with humor as the primary format, plus tools for surviving the job market.",
                    },
                  },
                ],
              },
            ],
          }),
        },
      ],

    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors position="bottom-center" theme="dark" />
    </QueryClientProvider>
  );
}
