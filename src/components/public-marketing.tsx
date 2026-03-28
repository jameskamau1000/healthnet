"use client";

import Image from "next/image";
import { CompensationSettings, money } from "@/lib/compensation";

export type LandingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string | null;
  price: number;
  imageUrl: string | null;
};

export type HeroSlide = {
  kicker: string;
  title: string;
  subtitle: string;
  gradient: string;
};

const cardClass =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_8px_30px_-12px_rgba(20,83,45,0.18)] ring-1 ring-emerald-950/[0.04] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-16px_rgba(20,83,45,0.22)] hover:ring-amber-500/20";
const cardAccentBar =
  "pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-ayur-green via-ayur-gold to-ayur-maroon";
const cardHeaderClass =
  "relative border-b border-emerald-100/90 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 px-5 py-4";
const cardBodyTextClass = "text-sm leading-relaxed font-medium text-slate-600";
const inputClass =
  "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-inner shadow-slate-900/5 focus:border-ayur-green focus:outline-none focus:ring-2 focus:ring-ayur-green/25";

/** Avoid `next/image` runtime errors for arbitrary catalog URLs (external hosts, SVG + fill, etc.). */
function ProductThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
  );
}

export type PublicMarketingProps = {
  heroSlide: number;
  setHeroSlide: (i: number) => void;
  heroSlides: HeroSlide[];
  landingProducts: LandingProduct[];
  settings: CompensationSettings | null;
};

export function PublicMarketing({
  heroSlide,
  setHeroSlide,
  heroSlides,
  landingProducts,
  settings,
}: PublicMarketingProps) {
  const refPct = settings?.referralPercent ?? 20;
  const binPct = settings?.binaryPercent ?? 15;

  return (
    <div className="relative text-slate-900">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-emerald-50/50 via-[#fafcf9] to-amber-50/30 marketing-grain"
        aria-hidden
      />

      {/* Hero carousel */}
      <div id="home" className="relative min-h-[440px] overflow-hidden md:min-h-[520px]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(250,204,21,0.12),transparent)]"
          aria-hidden
        />
        {heroSlides.map((slide, i) => (
          <div
            key={slide.title}
            className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-700 ${
              i === heroSlide ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none"
            } ${slide.gradient}`}
            aria-hidden={i !== heroSlide}
          >
            <div
              className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-ayur-gold/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.15),rgba(15,23,42,0.55))]"
              aria-hidden
            />
            <div className="marketing-grain absolute inset-0 opacity-40 mix-blend-overlay" aria-hidden />
            <div className="relative mx-auto flex h-full min-h-[440px] max-w-7xl flex-col justify-center px-4 py-20 text-white md:min-h-[520px] sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300 drop-shadow-sm">
                {slide.kicker}
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight drop-shadow-md md:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/92 md:text-xl">
                {slide.subtitle}
              </p>
              <div className="mt-11 flex flex-wrap gap-3">
                <a
                  href="#product"
                  className="inline-flex items-center rounded-xl border-2 border-white/90 bg-white/12 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 backdrop-blur-md transition hover:bg-white/22"
                >
                  Discover products
                </a>
                <a
                  href="/login?tab=register"
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-ayur-gold to-amber-500 px-6 py-3 text-sm font-bold text-ayur-maroon shadow-lg shadow-amber-900/25 transition hover:brightness-105"
                >
                  Join today
                </a>
              </div>
            </div>
          </div>
        ))}
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center gap-2 px-4">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === heroSlide}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === heroSlide ? "w-10 bg-ayur-gold shadow-[0_0_12px_rgba(217,119,6,0.6)]" : "w-2 bg-white/35 hover:bg-white/60"
              }`}
              onClick={() => setHeroSlide(i)}
            />
          ))}
        </div>
      </div>

      {/* Welcome strip */}
      <div className="relative border-b border-emerald-900/10 py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/50 p-8 shadow-[0_20px_50px_-24px_rgba(20,83,45,0.2)] md:p-12">
            <div
              className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-ayur-gold/15 blur-2xl"
              aria-hidden
            />
            <div className="relative mx-auto max-w-3xl text-center">
              <span className="inline-block rounded-full border border-emerald-200/80 bg-white/80 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ayur-green">
                Holistic wellness
              </span>
              <h2 className="mt-5 bg-gradient-to-r from-ayur-forest via-ayur-green to-ayur-warm bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                Welcome to Ayur Health International
              </h2>
              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-ayur-green via-ayur-gold to-ayur-maroon" />
              <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-slate-600 md:text-lg">
                Holistic wellness, member rewards, and transparent operations—aligned with the spirit of trusted
                health communities worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Three pillars */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-ayur-maroon">Why members choose us</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Built for wellness &amp; growth</h3>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Healing & wellness",
              body: "Products and programs designed for everyday vitality and balanced living.",
            },
            {
              title: "Awards & rewards",
              body: `Referral (${refPct}%) and binary (${binPct}%) mechanics with matching bonuses—clear rules, traceable payouts.`,
            },
            {
              title: "Governance you can trust",
              body: "Audit trails, reconciliations, and support workflows built for serious field organizations.",
            },
          ].map((card) => (
            <div key={card.title} className={cardClass}>
              <span className={cardAccentBar} aria-hidden />
              <div className={cardHeaderClass}>
                <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className={cardBodyTextClass}>{card.body}</p>
                <a
                  href="#opportunity"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-ayur-green transition group-hover:gap-2"
                >
                  Learn more <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core values */}
      <div id="about" className="relative border-y border-emerald-900/10 py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-emerald-50/25 to-amber-50/20" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.22em] text-ayur-maroon">
            Our core values
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-center text-lg font-semibold leading-snug text-slate-800 md:text-xl">
            Integrity, Trust, Accountability, Commitment to Customers, Passion, Constant Improvement,
            Leadership, Quality, and Simplicity.
          </p>
          <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-gradient-to-r from-ayur-green via-ayur-gold to-ayur-maroon" />
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {[
              "Integrity",
              "Trust",
              "Accountability",
              "Customer commitment",
              "Leadership",
              "Quality",
              "Simplicity",
            ].map((value) => (
              <span
                key={value}
                className="rounded-full border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/60 px-4 py-2 text-xs font-bold text-ayur-forest shadow-sm shadow-emerald-900/5"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Vision / Mission */}
      <div className="py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 sm:px-6">
          <div className={cardClass}>
            <span className={cardAccentBar} aria-hidden />
            <div className="p-7 pl-8">
              <h3 className="border-l-4 border-ayur-gold pl-4 text-sm font-bold uppercase tracking-[0.15em] text-ayur-green">
                Our vision
              </h3>
              <p className="mt-5 text-base leading-relaxed font-medium text-slate-600">
                To provide superior quality wellness and member services that people recommend to family and friends,
                teams are proud to build, and partners trust for the long term.
              </p>
            </div>
          </div>
          <div className={cardClass}>
            <span className={cardAccentBar} aria-hidden />
            <div className="p-7 pl-8">
              <h3 className="border-l-4 border-ayur-maroon pl-4 text-sm font-bold uppercase tracking-[0.15em] text-ayur-maroon">
                Our mission
              </h3>
              <p className="mt-5 text-base leading-relaxed font-medium text-slate-600">
                To inspire healthier communities by connecting people to real wellness products, fair rewards, and
                dependable digital care—from onboarding to payouts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-ayur-green via-emerald-700 to-ayur-maroon p-[1px] shadow-[0_24px_60px_-20px_rgba(127,29,29,0.35)]">
            <div className="rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/40 p-8 md:p-12">
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">About us</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed font-medium text-slate-600">
                Ayur Health International brings together complementary wellness philosophy, herbal and personal-care
                style products, and a modern member platform. Our digital back-office supports referrals, binary
                placement, BV/PV volume, M-Pesa-ready money movement, and responsive support—so the field can focus on
                people while operations stay auditable.
              </p>
              <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-center">
                <div className="overflow-hidden rounded-2xl border border-emerald-200/60 bg-slate-900/5 shadow-inner ring-1 ring-emerald-900/10">
                  <Image
                    src="/hero-platform.svg"
                    alt="Platform overview"
                    width={640}
                    height={400}
                    className="h-auto w-full"
                  />
                </div>
                <ul className="flex flex-col justify-center space-y-4 text-base font-medium text-slate-700">
                  <li className="flex gap-4 rounded-xl border border-emerald-100/80 bg-white/70 p-4 shadow-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ayur-green to-emerald-700 text-sm font-bold text-white">
                      1
                    </span>
                    <span className="pt-1">10–60 day style nutrition &amp; wellness program framing</span>
                  </li>
                  <li className="flex gap-4 rounded-xl border border-emerald-100/80 bg-white/70 p-4 shadow-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ayur-gold to-amber-600 text-sm font-bold text-ayur-maroon">
                      2
                    </span>
                    <span className="pt-1">Happy members, transparent commissions, and real-time visibility</span>
                  </li>
                  <li className="flex gap-4 rounded-xl border border-emerald-100/80 bg-white/70 p-4 shadow-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ayur-maroon to-rose-900 text-sm font-bold text-white">
                      3
                    </span>
                    <span className="pt-1">Growing catalog of wellness products with BV/PV-aware purchases</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity / modules */}
      <div id="opportunity" className="relative border-t border-emerald-900/10 py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-emerald-50/20" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 md:text-4xl">The opportunity</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base font-medium text-slate-600">
            Built for organizations that want Everhealthy-class depth without compromising on compliance tooling.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                h: "Referral engine",
                t: "Sponsor tracking, left/right links, and instant referral + match credits on volume.",
              },
              {
                h: "Payments ready",
                t: "STK Push deposits and B2C-style withdrawal flows with secured callbacks.",
              },
              {
                h: "Member care",
                t: "Tickets, SMS, and in-app notifications to keep the field informed.",
              },
            ].map((m) => (
              <div key={m.h} className={cardClass}>
                <span className={cardAccentBar} aria-hidden />
                <div className="p-6 text-center">
                  <h4 className="text-lg font-bold text-slate-900">{m.h}</h4>
                  <p className="mt-3 text-sm leading-relaxed font-medium text-slate-600">{m.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative overflow-hidden border-y border-emerald-900/20 py-14 text-white">
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0f2918] via-ayur-green to-[#14532d]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(217,119,6,0.2),transparent_55%)]"
          aria-hidden
        />
        <div className="marketing-grain absolute inset-0 opacity-30 mix-blend-overlay" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 md:grid-cols-4 md:gap-6 sm:px-6">
          {[
            ["10–60", "Day programs"],
            ["12+", "Core workflows"],
            ["24/7", "Platform access"],
            ["100%", "Audit-minded design"],
          ].map(([n, l], idx) => (
            <div
              key={l}
              className={`px-2 text-center md:px-6 ${idx > 0 ? "md:border-l md:border-white/15" : ""}`}
            >
              <p className="bg-gradient-to-b from-white to-emerald-100 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
                {n}
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-white to-white" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">Frequently asked questions</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-600">
            Straight answers on placement, commissions, and your back office.
          </p>
          <div className="mt-10 space-y-4">
            {[
              {
                q: "How do left and right registration links work?",
                a: "Your referral link includes a position. New members are placed in your binary tree with that preference, then spill over naturally if a slot is full.",
              },
              {
                q: "When are commissions created?",
                a: "Qualifying volume from package registration and product purchases creates PV for the buyer and BV for upline legs, with referral, binary, and matching wallet entries per your plan rules.",
              },
              {
                q: "How do I access my back office?",
                a: "Use Register to create an account or Login if you already have one. You will land in your member dashboard after sign-in.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group overflow-hidden rounded-2xl border border-emerald-200/60 bg-white/90 shadow-md shadow-emerald-900/[0.06] open:border-amber-300/50 open:shadow-lg open:shadow-amber-900/10"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-900 transition marker:hidden hover:bg-emerald-50/50 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    <span>{item.q}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-ayur-maroon transition group-open:rotate-180">
                      ▼
                    </span>
                  </span>
                </summary>
                <div className="border-t border-emerald-100/80 bg-gradient-to-br from-emerald-50/30 to-transparent px-5 py-4 text-sm leading-relaxed font-medium text-slate-600">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div id="product" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 md:text-4xl">Our recent products</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base font-medium text-slate-600">
            Browse featured items. Members can apply BV/PV from the back office after signing in.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {landingProducts.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4"
                  >
                    <div className="h-40 rounded-xl bg-gradient-to-br from-emerald-100 to-amber-50" />
                    <div className="mt-4 h-4 w-[75%] rounded bg-slate-200" />
                  </div>
                ))
              : landingProducts.map((p) => (
                  <div
                    key={p.id}
                    className="group overflow-hidden rounded-2xl border border-emerald-200/50 bg-white shadow-lg shadow-emerald-900/[0.07] ring-1 ring-emerald-950/[0.04] transition duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-xl hover:shadow-amber-900/10"
                  >
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50">
                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.12),transparent_50%)]"
                        aria-hidden
                      />
                      {p.imageUrl ? (
                        <ProductThumb src={p.imageUrl} alt={p.name} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="border-t border-emerald-100/80 p-5">
                      <h5 className="font-bold text-slate-900 line-clamp-2">{p.name}</h5>
                      <p className="mt-2 text-base font-bold text-ayur-green">{money(Number(p.price) || 0)}</p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="relative border-t border-emerald-900/10 py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/35 via-white to-emerald-50/25" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">
            Benefits of Ayur Health International
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-ayur-green to-ayur-maroon" />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                h: "Enjoy your life",
                t: "Build toward lifestyle goals with a clear rewards structure and supportive tools.",
              },
              {
                h: "Be of good health",
                t: "Represent wellness products you can stand behind—with operational transparency.",
              },
              {
                h: "Work for results",
                t: "Introduce others with left/right links; track volume and payouts in one place.",
              },
              {
                h: "Come on board",
                t: "Pick a starter package, register, and step into a guided member experience.",
              },
            ].map((b, i) => (
              <div
                key={b.h}
                className={`rounded-2xl border p-6 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${
                  i % 2 === 0
                    ? "border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/50"
                    : "border-amber-200/60 bg-gradient-to-br from-white to-amber-50/40"
                }`}
              >
                <h4 className="text-lg font-bold text-ayur-maroon">{b.h}</h4>
                <p className="mt-3 text-sm leading-relaxed font-medium text-slate-600">{b.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="pb-16 pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-ayur-maroon via-[#5c1515] to-[#0f172a] p-8 text-white shadow-[0_24px_60px_-18px_rgba(127,29,29,0.45)] md:flex md:items-center md:justify-between md:gap-10 md:p-10">
            <div className="relative max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">Stay in the loop</p>
              <h3 className="mt-2 text-2xl font-bold md:text-3xl">Sign up for our newsletter</h3>
              <p className="mt-2 text-sm font-medium text-white/80">
                Product news, releases, and field updates—no clutter.
              </p>
            </div>
            <form className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row md:mt-0">
              <input
                type="email"
                placeholder="Your email"
                className="block w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-ayur-gold focus:outline-none focus:ring-2 focus:ring-ayur-gold/40"
              />
              <button
                type="button"
                className="shrink-0 rounded-xl bg-gradient-to-r from-ayur-gold to-amber-500 px-6 py-3 text-sm font-bold text-ayur-maroon shadow-lg shadow-black/20 transition hover:brightness-105"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        id="contacts"
        className="relative border-t border-emerald-900/30 bg-gradient-to-b from-[#0c1220] to-slate-950 py-14 text-slate-300"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ayur-gold/60 to-transparent"
          aria-hidden
        />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4 sm:px-6">
          <div className="md:col-span-2">
            <div className="inline-block rounded-xl bg-white/95 p-3 shadow-lg shadow-black/20 ring-1 ring-white/10">
              <Image
                src="/ayur-logo.png"
                alt="Ayur Health International"
                width={280}
                height={80}
                className="h-11 w-auto max-w-[240px] object-contain sm:h-12 sm:max-w-[280px]"
              />
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed">
              Trusted digital infrastructure for wellness-focused member organizations—referrals, binary volume,
              and payouts in one place.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#about" className="hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#opportunity" className="hover:text-white">
                  Opportunity
                </a>
              </li>
              <li>
                <a href="#product" className="hover:text-white">
                  Product
                </a>
              </li>
              <li>
                <a href="#contacts" className="hover:text-white">
                  Contacts
                </a>
              </li>
              <li>
                <a href="/login?tab=register" className="hover:text-white">
                  Register
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact</p>
            <p className="mt-3 text-sm">hello@ayurhealthint.com</p>
            <p className="mt-2 text-sm">Nairobi, Kenya</p>
            <p className="mt-4 text-xs text-slate-500">
              Inspired by professional wellness community sites such as{" "}
              <a
                href="https://everhealthyintl.com"
                className="text-ayur-gold hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Everhealthy Multi-Dynamic
              </a>
              .
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-700 px-4 pt-6 text-center text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} Ayur Health International. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
