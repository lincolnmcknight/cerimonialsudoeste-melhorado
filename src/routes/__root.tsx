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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NetworkStatus } from "../components/NetworkStatus";
import { Toaster } from "../components/ui/sonner";

const SUPABASE_BACKEND_ORIGIN = (() => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
})();

function createBackendProxyScript(backendOrigin: string) {
  return `
    (function () {
      var backendOrigin = ${JSON.stringify(backendOrigin)};
      var proxyPrefix = "/api/public/backend";
      if (!backendOrigin || !window.fetch || window.__cerimonialBackendProxyInstalled) return;
      window.__cerimonialBackendProxyInstalled = true;
      var originalFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        try {
          var rawUrl = typeof input === "string"
            ? input
            : (input && typeof input.url === "string" ? input.url : null);
          if (!rawUrl) return originalFetch(input, init);
          var url = new URL(rawUrl, window.location.href);
          // Proxy apenas chamadas de autenticação (auth/v1) — que são as
          // bloqueadas em algumas redes restritas. REST/RPC/Storage/Realtime
          // continuam indo direto para o backend.
          if (url.origin !== backendOrigin || !url.pathname.startsWith("/auth/v1")) {
            return originalFetch(input, init);
          }
          var request = input instanceof Request ? input : new Request(input, init);
          var proxiedUrl = proxyPrefix + url.pathname + url.search;
          var method = request.method;
          var hasBody = method !== "GET" && method !== "HEAD";
          var bodyPromise = hasBody ? request.clone().arrayBuffer() : Promise.resolve(undefined);
          return bodyPromise.then(function (body) {
            var headers = {};
            request.headers.forEach(function (value, key) { headers[key] = value; });
            return originalFetch(proxiedUrl, {
              method: method,
              headers: headers,
              body: body,
              credentials: request.credentials,
              mode: "same-origin",
              redirect: request.redirect,
              referrer: request.referrer,
            });
          });
        } catch (error) {
          console.warn("[Cerimonial] Falha ao usar o proxy interno do backend", error);
        }
        return originalFetch(input, init);
      };
    })();
  `;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center vitral px-5 text-white">
      <div className="max-w-sm text-center">
        <div className="font-display text-8xl leading-none text-white/90">404</div>
        <h1 className="font-display text-3xl mt-4">Página não encontrada</h1>
        <p className="mt-2 text-white/65">O endereço pode estar errado ou a página foi removida.</p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-noite hover:bg-white/90"
        >
          Ver a programação
        </Link>
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
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-4xl">Esta página não carregou</h1>
        <p className="mt-2 text-muted-foreground">
          Pode ter sido uma falha de conexão. Tente de novo; se continuar, volte para o início.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 font-medium hover:bg-muted"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Cerimonial Sudoeste" },
      { property: "og:locale", content: "pt_BR" },
      { name: "description", content: "Cerimonial Sudoeste — programação dos cultos, clara, organizada e sempre atualizada." },
      { name: "theme-color", content: "#1b1340" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Sudoeste" },
      { property: "og:title", content: "Cerimonial Sudoeste" },
      { property: "og:description", content: "Cerimonial Sudoeste — programação dos cultos, clara, organizada e sempre atualizada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Cerimonial Sudoeste" },
      { name: "twitter:description", content: "Cerimonial Sudoeste — programação dos cultos, clara, organizada e sempre atualizada." },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:image", content: "/icon-512.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {SUPABASE_BACKEND_ORIGIN ? (
          <script
            dangerouslySetInnerHTML={{
              __html: createBackendProxyScript(SUPABASE_BACKEND_ORIGIN),
            }}
          />
        ) : null}
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(console.error);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <NetworkStatus />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
