/**
 * Strict separation between local SQLite and production SQLite.
 *
 * - Set `HEALTHNET_DATABASE_ROLE=live` only on the production host.
 * - Local / CI: omit the variable or use `HEALTHNET_DATABASE_ROLE=local`.
 *
 * Live role refuses DATABASE_URL values that match known dev filenames so a bad
 * deploy or .env copy cannot point the app at `prisma/local.db` or legacy `dev.db`.
 */

export type DatabaseRole = "local" | "live";

/** Path fragments that must never appear in DATABASE_URL when role is `live`. */
const FORBIDDEN_IN_LIVE = [
  "prisma/local.db",
  "file:./prisma/local.db",
  "/prisma/local.db",
  "file:./dev.db",
  "/dev.db",
  "file:./prisma/dev.db",
  "/prisma/dev.db",
];

export function getDatabaseRole(): DatabaseRole {
  const v = process.env.HEALTHNET_DATABASE_ROLE?.trim().toLowerCase();
  if (v === "live") return "live";
  return "local";
}

function normalizeUrl(url: string): string {
  return url.replace(/\\/g, "/").toLowerCase();
}

export function enforceDatabaseRoleForProcess(): void {
  const url = (process.env.DATABASE_URL ?? "").trim();
  const role = getDatabaseRole();

  if (role === "live") {
    if (!url) {
      throw new Error(
        "[database] HEALTHNET_DATABASE_ROLE=live requires DATABASE_URL (e.g. file:./data/live.db on the server).",
      );
    }
    const n = normalizeUrl(url);
    for (const bad of FORBIDDEN_IN_LIVE) {
      if (n.includes(bad)) {
        throw new Error(
          `[database] Live database URL must not use a dev/local SQLite file. Forbidden: "${bad}" in DATABASE_URL.`,
        );
      }
    }
    return;
  }

  if (url) {
    const n = normalizeUrl(url);
    if (n.includes("data/live.db") || n.endsWith("/live.db")) {
      console.warn(
        "[database] DATABASE_URL looks like the production live DB, but HEALTHNET_DATABASE_ROLE is not `live`. Use file:./prisma/local.db for local development unless you intend to open production data.",
      );
    }
  }
}
