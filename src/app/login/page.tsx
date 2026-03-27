"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type MeResponse = {
  user: { id: string; email: string; name: string; role: "ADMIN" | "MEMBER" } | null;
  defaultAdmin?: { email: string; password: string } | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhoneNumber, setRegPhoneNumber] = useState("");
  const [regPackageId, setRegPackageId] = useState("starter");
  const [regReferralCode, setRegReferralCode] = useState("");
  const [regPosition, setRegPosition] = useState<"left" | "right">("left");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    setMode(tab === "register" ? "register" : "login");
  }, []);

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return;
      const data = (await response.json()) as MeResponse;
      if (data.user) {
        router.replace("/");
        return;
      }
      if (data.defaultAdmin?.password) {
        setHint(`Local dev admin: ${data.defaultAdmin.email} / ${data.defaultAdmin.password}`);
      }
    };
    run();
  }, [router]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to login right now");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phoneNumber: regPhoneNumber || undefined,
          packageId: regPackageId,
          referralCode: regReferralCode || undefined,
          position: regReferralCode ? regPosition : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; name?: string };
      if (!response.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      setNotice(`Account created for ${data.name ?? "member"}. You can now sign in.`);
      setLoginEmail(regEmail);
      setLoginPassword(regPassword);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegPhoneNumber("");
      setRegReferralCode("");
      setRegPosition("left");
      setMode("login");
      router.replace("/login");
    } catch {
      setError("Unable to register right now");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-ayur-maroon">Ayur Health International</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {mode === "login"
              ? "Access your member or admin dashboard."
              : "Register your member account to join the platform."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                router.replace("/login");
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                router.replace("/login?tab=register");
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Register
            </button>
          </div>

          {hint && (
            <p className="mt-4 rounded border border-ayur-gold/30 bg-amber-50/50 p-2 text-xs text-ayur-maroon">{hint}</p>
          )}
          {error && <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
          {notice && <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}

          {mode === "login" ? (
            <form className="mt-5 space-y-3" onSubmit={onLogin}>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90 disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={onRegister}>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Full name</span>
                <input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Email</span>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Password</span>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Phone (optional)</span>
                <input
                  value={regPhoneNumber}
                  onChange={(e) => setRegPhoneNumber(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  placeholder="07... or 254..."
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Package</span>
                <select
                  value={regPackageId}
                  onChange={(e) => setRegPackageId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  <option value="starter">Starter / Common</option>
                  <option value="fair">Fair</option>
                  <option value="good">Good</option>
                  <option value="better">Better</option>
                  <option value="best">Best</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Referral code (optional)</span>
                <input
                  value={regReferralCode}
                  onChange={(e) => setRegReferralCode(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </label>
              {regReferralCode && (
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Preferred tree side</span>
                  <select
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value as "left" | "right")}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  >
                    <option value="left">Join left</option>
                    <option value="right">Join right</option>
                  </select>
                </label>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-ayur-gold px-4 py-2 font-semibold text-ayur-maroon hover:bg-ayur-gold/90 disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Register"}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-slate-600">
            Go back to{" "}
            <Link href="/" className="text-ayur-green hover:underline">
              platform home
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
