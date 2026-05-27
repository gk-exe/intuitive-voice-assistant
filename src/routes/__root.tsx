import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import "@/services/i18n";
import { useApplyTheme } from "@/hooks/useApplyTheme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">This page doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="touch-target inline-flex items-center justify-center rounded-2xl bg-primary px-5 text-primary-foreground"
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again in a moment.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="touch-target mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-5 text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { name: "theme-color", content: "#c46a3f" },
      { title: "Voice — Talk naturally. Stay organized." },
      {
        name: "description",
        content:
          "A calm voice-first assistant that listens, understands, and organizes your day.",
      },
      { property: "og:title", content: "Voice — Talk naturally. Stay organized." },
      { property: "og:description", content: "An intuitive voice assistant that personalizes user experiences through conversational onboarding and dynamic workspace generation." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Voice — Talk naturally. Stay organized." },
      { name: "description", content: "An intuitive voice assistant that personalizes user experiences through conversational onboarding and dynamic workspace generation." },
      { name: "twitter:description", content: "An intuitive voice assistant that personalizes user experiences through conversational onboarding and dynamic workspace generation." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b4d27a4-7b99-4ce5-8bb2-564ecf62d835/id-preview-a9005c86--a46f9338-97ce-4db7-a35e-2111c7be3006.lovable.app-1779879053616.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b4d27a4-7b99-4ce5-8bb2-564ecf62d835/id-preview-a9005c86--a46f9338-97ce-4db7-a35e-2111c7be3006.lovable.app-1779879053616.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
  useApplyTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
