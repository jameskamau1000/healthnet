export function isCallbackAuthorized(request: Request): boolean {
  const expected = process.env.MPESA_CALLBACK_TOKEN;
  if (!expected) return true;

  const url = new URL(request.url);
  const provided = url.searchParams.get("token");
  return provided === expected;
}
