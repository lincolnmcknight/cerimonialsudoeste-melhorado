import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";

const PROXY_ROUTE_PREFIX = "/api/public/backend/";
const ALLOWED_UPSTREAM_PREFIXES = ["auth/v1", "rest/v1", "storage/v1", "functions/v1"];
const STRIPPED_REQUEST_HEADERS = [
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];
const STRIPPED_RESPONSE_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

export const Route = createFileRoute("/api/public/backend/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyBackendRequest(request),
      POST: ({ request }) => proxyBackendRequest(request),
      PUT: ({ request }) => proxyBackendRequest(request),
      PATCH: ({ request }) => proxyBackendRequest(request),
      DELETE: ({ request }) => proxyBackendRequest(request),
      HEAD: ({ request }) => proxyBackendRequest(request),
      OPTIONS: () => new Response(null, { status: 204 }),
    },
  },
});

async function proxyBackendRequest(request: Request) {
  const incomingUrl = new URL(request.url);
  const upstreamPath = incomingUrl.pathname.slice(PROXY_ROUTE_PREFIX.length);

  if (!isAllowedUpstreamPath(upstreamPath)) {
    return new Response("Endpoint não permitido", { status: 403 });
  }

  const upstreamBaseUrl = process.env.SUPABASE_URL;
  if (!upstreamBaseUrl) {
    return new Response("Configuração do backend indisponível", { status: 500 });
  }

  const upstreamUrl = new URL(upstreamPath + incomingUrl.search, ensureTrailingSlash(upstreamBaseUrl));
  const headers = new Headers(request.headers);
  STRIPPED_REQUEST_HEADERS.forEach((header) => headers.delete(header));

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    STRIPPED_RESPONSE_HEADERS.forEach((header) => responseHeaders.delete(header));

    return new Response(statusAllowsBody(upstreamResponse.status) ? upstreamResponse.body : null, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Cerimonial] Falha no proxy interno do backend", error);
    return new Response("Não foi possível conectar ao backend", { status: 502 });
  }
}

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

function isAllowedUpstreamPath(path: string) {
  return ALLOWED_UPSTREAM_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function statusAllowsBody(status: number) {
  return status !== 204 && status !== 205 && status !== 304;
}