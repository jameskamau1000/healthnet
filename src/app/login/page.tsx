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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-ayur-maroon">Ayur Health International</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">
            Access your member or admin dashboard.
          </p>

          {hint && (
            <p className="mt-4 rounded border border-ayur-gold/30 bg-amber-50/50 p-2 text-xs text-ayur-maroon">{hint}</p>
          )}
          {error && <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}

          <form className="mt-5 space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
