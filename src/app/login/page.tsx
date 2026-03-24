"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type MeResponse = {
  user: { id: string; email: string; name: string; role: "ADMIN" | "MEMBER" } | null;
  defaultAdmin?: { email: string; password: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@healthnet.local");
  const [password, setPassword] = useState("ChangeMe123!");
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
      if (data.defaultAdmin) {
        setHint(`Default admin: ${data.defaultAdmin.email} / ${data.defaultAdmin.password}`);
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <section className="w-full rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">HealthNet</p>
          <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">
            Access your member or admin dashboard.
          </p>

          {hint && (
            <p className="mt-4 rounded bg-cyan-900/40 p-2 text-xs text-cyan-100">{hint}</p>
          )}
          {error && <p className="mt-4 rounded bg-rose-900/50 p-2 text-xs text-rose-100">{error}</p>}

          <form className="mt-5 space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-400">
            Go back to <Link href="/" className="text-cyan-300 hover:underline">platform home</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
