/**
 * Public site URL for referral links, emails, etc.
 *
 * Prefer APP_BASE_URL or NEXT_PUBLIC_APP_URL in all environments.
 *
 * In production, if the request still looks like localhost (no env, no proxy headers),
 * we fall back to the live site so referral links are shareable.
 */
const PRODUCTION_PUBLIC_FALLBACK = "https://ayurhealthint.com";

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

export function getPublicSiteUrl(request: Request): string {
  const fromEnv =
    process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return stripTrailingSlashes(fromEnv);
  }

  if (process.env.VERCEL_URL) {
    return `https://${stripTrailingSlashes(process.env.VERCEL_URL)}`;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = (forwardedProto?.split(",")[0].trim() || "https").toLowerCase();
    const candidate = `${proto}://${host}`;
    if (process.env.NODE_ENV === "production" && isLoopbackOrigin(candidate)) {
      return stripTrailingSlashes(PRODUCTION_PUBLIC_FALLBACK);
    }
    return candidate;
  }

  const fromRequest = new URL(request.url).origin;
  if (process.env.NODE_ENV === "production" && isLoopbackOrigin(fromRequest)) {
    return stripTrailingSlashes(PRODUCTION_PUBLIC_FALLBACK);
  }
  return fromRequest;
}
