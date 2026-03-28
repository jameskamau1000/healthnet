"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildRegisterLoginHref } from "@/lib/referral-query";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-inner shadow-slate-900/5 focus:border-ayur-green focus:outline-none focus:ring-2 focus:ring-ayur-green/25";
const primaryBtnClass =
  "w-full rounded-xl bg-gradient-to-r from-ayur-gold to-amber-500 px-4 py-2.5 font-bold text-ayur-maroon shadow-md shadow-amber-900/15 transition hover:brightness-105 disabled:opacity-70";

type MeResponse = {
  user: { id: string; email: string; name: string; role: "ADMIN" | "MEMBER" } | null;
  defaultAdmin?: { email: string; password: string } | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
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
  const [loginChallengeId, setLoginChallengeId] = useState<string | null>(null);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [registerChallengeId, setRegisterChallengeId] = useState<string | null>(null);
  const [registerOtpCode, setRegisterOtpCode] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetChallengeId, setResetChallengeId] = useState<string | null>(null);
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const registerHref = useMemo(
    () => buildRegisterLoginHref({ ref: regReferralCode, position: regPosition }),
    [regReferralCode, regPosition],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "register") setMode("register");
    else if (tab === "forgot") setMode("forgot");
    else setMode("login");
    const ref = params.get("ref");
    const position = params.get("position");
    if (ref?.trim()) setRegReferralCode(ref.trim());
    if (position === "left" || position === "right") setRegPosition(position);
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
        body: loginChallengeId
          ? JSON.stringify({ challengeId: loginChallengeId, otpCode: loginOtpCode })
          : JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await response.json()) as {
        error?: string;
        otpRequired?: boolean;
        challengeId?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      if (data.otpRequired && data.challengeId) {
        setLoginChallengeId(data.challengeId);
        setNotice("OTP sent to your email. Enter it below to complete login.");
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
        body: registerChallengeId
          ? JSON.stringify({ challengeId: registerChallengeId, otpCode: registerOtpCode })
          : JSON.stringify({
              name: regName,
              email: regEmail,
              password: regPassword,
              phoneNumber: regPhoneNumber || undefined,
              packageId: regPackageId,
              referralCode: regReferralCode || undefined,
              position: regReferralCode ? regPosition : undefined,
            }),
      });
      const data = (await response.json()) as {
        error?: string;
        name?: string;
        otpRequired?: boolean;
        challengeId?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      if (data.otpRequired && data.challengeId) {
        setRegisterChallengeId(data.challengeId);
        setNotice("OTP sent to your email. Enter it below to complete registration.");
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
      setRegisterChallengeId(null);
      setRegisterOtpCode("");
      setMode("login");
      router.replace("/login");
    } catch {
      setError("Unable to register right now");
    } finally {
      setLoading(false);
    }
  }

  function goLogin() {
    setMode("login");
    setError(null);
    setNotice(null);
    setResetChallengeId(null);
    setResetOtpCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    router.replace("/login");
  }

  async function onForgotRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        ok?: boolean;
        challengeId?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not send reset email");
        return;
      }
      setNotice(data.message ?? "Check your email for a reset code.");
      if (data.challengeId) {
        setResetChallengeId(data.challengeId);
      }
    } catch {
      setError("Unable to send reset email right now");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotVerifyRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetNewPassword !== resetConfirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: resetChallengeId,
          otpCode: resetOtpCode.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Reset failed");
        return;
      }
      const savedEmail = forgotEmail.trim();
      setLoginEmail(savedEmail);
      setLoginPassword("");
      setForgotEmail("");
      setResetChallengeId(null);
      setResetOtpCode("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setMode("login");
      setError(null);
      setNotice(data.message ?? "Password updated. Sign in with your new password.");
      router.replace("/login");
    } catch {
      setError("Unable to reset password right now");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-50/60 via-[#fafcf9] to-amber-50/40 text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 marketing-grain opacity-70"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-ayur-gold/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <div className="w-full rounded-3xl bg-gradient-to-br from-ayur-green via-emerald-700 to-ayur-maroon p-[1px] shadow-[0_24px_60px_-20px_rgba(20,83,45,0.35)]">
          <section className="rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/40 p-6 shadow-inner sm:p-8">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white/90 p-3 shadow-md ring-1 ring-emerald-900/10">
                <Image
                  src="/ayur-logo.png"
                  alt="Ayur Health International"
                  width={280}
                  height={80}
                  className="h-12 w-auto max-w-[240px] object-contain sm:h-14 sm:max-w-[260px]"
                  priority
                />
              </div>
            </div>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-ayur-green via-ayur-gold to-ayur-maroon" />
            <h1 className="mt-4 text-center text-2xl font-bold text-slate-900">
              {mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : resetChallengeId
                    ? "Set new password"
                    : "Reset password"}
            </h1>
            <p className="mt-1 text-center text-sm text-slate-600">
              {mode === "login"
                ? "Access your member or admin dashboard."
                : mode === "register"
                  ? "Register your member account to join the platform."
                  : resetChallengeId
                    ? "Enter the code from your email and choose a new password (min. 6 characters)."
                    : "We will email you a one-time code to confirm it is you."}
            </p>
            {mode !== "forgot" ? (
              <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-emerald-200/60 bg-white/80 p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setNotice(null);
                    setResetChallengeId(null);
                    setForgotEmail("");
                    setResetOtpCode("");
                    setResetNewPassword("");
                    setResetConfirmPassword("");
                    router.replace("/login");
                  }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    mode === "login"
                      ? "bg-gradient-to-r from-ayur-green to-emerald-700 text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setNotice(null);
                    router.replace(registerHref);
                  }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    mode === "register"
                      ? "bg-gradient-to-r from-ayur-maroon to-rose-900 text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Register
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    goLogin();
                  }}
                  className="w-full rounded-lg border border-emerald-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-inner hover:bg-white"
                >
                  ← Back to sign in
                </button>
              </div>
            )}

            {hint && (
              <p className="mt-4 rounded-xl border border-ayur-gold/40 bg-amber-50/80 p-3 text-xs text-ayur-maroon">
                {hint}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>
            )}
            {notice && (
              <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 p-3 text-xs text-emerald-900">
                {notice}
              </p>
            )}

            {mode === "forgot" ? (
              !resetChallengeId ? (
                <form className="mt-5 space-y-3" onSubmit={onForgotRequest}>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Account email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  </label>
                  <button type="submit" disabled={loading} className={primaryBtnClass}>
                    {loading ? "Sending..." : "Send reset code"}
                  </button>
                </form>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={onForgotVerifyRequest}>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">One-time code (email)</span>
                    <input
                      value={resetOtpCode}
                      onChange={(e) => setResetOtpCode(e.target.value)}
                      className={fieldClass}
                      placeholder="6-digit code"
                      minLength={6}
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">New password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className={fieldClass}
                      minLength={6}
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Confirm new password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className={fieldClass}
                      minLength={6}
                      required
                    />
                  </label>
                  <button type="submit" disabled={loading} className={primaryBtnClass}>
                    {loading ? "Updating..." : "Update password"}
                  </button>
                </form>
              )
            ) : mode === "login" ? (
              <form className="mt-5 space-y-3" onSubmit={onLogin}>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Password</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </label>
                {loginChallengeId && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">One-time code (OTP)</span>
                    <input
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value)}
                      className={fieldClass}
                      placeholder="6-digit code"
                      minLength={6}
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </label>
                )}

                <button type="submit" disabled={loading} className={primaryBtnClass}>
                  {loading ? "Signing in..." : loginChallengeId ? "Verify OTP and sign in" : "Sign in"}
                </button>
                {!loginChallengeId && (
                  <p className="text-center text-sm">
                    <button
                      type="button"
                      className="font-semibold text-ayur-green hover:underline"
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        setForgotEmail(loginEmail);
                        setResetChallengeId(null);
                        setMode("forgot");
                        router.replace("/login?tab=forgot");
                      }}
                    >
                      Forgot password?
                    </button>
                  </p>
                )}
              </form>
            ) : (
              <form className="mt-5 space-y-3" onSubmit={onRegister}>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Full name</span>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Password</span>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Phone (optional)</span>
                  <input
                    value={regPhoneNumber}
                    onChange={(e) => setRegPhoneNumber(e.target.value)}
                    className={fieldClass}
                    placeholder="07... or 254..."
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Package</span>
                  <select
                    value={regPackageId}
                    onChange={(e) => setRegPackageId(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="starter">Starter / Common</option>
                    <option value="fair">Fair</option>
                    <option value="good">Good</option>
                    <option value="better">Better</option>
                    <option value="best">Best</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Referral code (optional)</span>
                  <input
                    value={regReferralCode}
                    onChange={(e) => setRegReferralCode(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                {regReferralCode && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Preferred tree side</span>
                    <select
                      value={regPosition}
                      onChange={(e) => setRegPosition(e.target.value as "left" | "right")}
                      className={fieldClass}
                    >
                      <option value="left">Join left</option>
                      <option value="right">Join right</option>
                    </select>
                  </label>
                )}
                {registerChallengeId && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">One-time code (OTP)</span>
                    <input
                      value={registerOtpCode}
                      onChange={(e) => setRegisterOtpCode(e.target.value)}
                      className={fieldClass}
                      placeholder="6-digit code"
                      minLength={6}
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </label>
                )}
                <button type="submit" disabled={loading} className={primaryBtnClass}>
                  {loading
                    ? "Creating account..."
                    : registerChallengeId
                      ? "Verify OTP and create account"
                      : "Register"}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-slate-600">
              Go back to{" "}
              <Link href="/" className="font-semibold text-ayur-green hover:underline">
                platform home
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
