export type ReferralFromUrl = {
  ref: string;
  position: "left" | "right";
};

/** Parse `ref` and `position` from a query string (e.g. `window.location.search`). */
export function readReferralFromSearch(search: string): ReferralFromUrl {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const ref = p.get("ref")?.trim() ?? "";
  const pos = p.get("position")?.toLowerCase();
  return {
    ref,
    position: pos === "right" ? "right" : "left",
  };
}

/** `/login` URL with register tab and optional sponsor + leg (only adds params when `ref` is set). */
export function buildRegisterLoginHref(r: ReferralFromUrl): string {
  const u = new URLSearchParams();
  u.set("tab", "register");
  if (r.ref) {
    u.set("ref", r.ref);
    u.set("position", r.position);
  }
  return `/login?${u.toString()}`;
}
