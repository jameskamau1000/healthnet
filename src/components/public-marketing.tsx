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
  "flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.08)]";
const cardHeaderClass = "border-b border-slate-300 bg-slate-100 px-4 py-3";
const cardBodyTextClass = "text-sm leading-relaxed font-medium text-slate-700";
const inputClass =
  "block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-ayur-green focus:outline-none focus:ring-1 focus:ring-ayur-green";

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
    <div className="bg-white text-slate-900">
      {/* Hero carousel — Everhealthy-style full-width band */}
      <div id="home" className="relative min-h-[420px] overflow-hidden md:min-h-[480px]">
        {heroSlides.map((slide, i) => (
          <div
            key={slide.title}
            className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-700 ${
              i === heroSlide ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none"
            } ${slide.gradient}`}
            aria-hidden={i !== heroSlide}
          >
            <div className="mx-auto flex h-full min-h-[420px] max-w-7xl flex-col justify-center px-4 py-16 text-white md:min-h-[480px] sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200/90">
                {slide.kicker}
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
                {slide.subtitle}
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="#product"
                  className="inline-flex items-center rounded border-2 border-white bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  + Discover products
                </a>
                <a
                  href="#auth"
                  className="inline-flex items-center rounded bg-ayur-gold px-5 py-2.5 text-sm font-bold text-ayur-maroon shadow hover:bg-ayur-gold/90"
                >
                  Register
                </a>
              </div>
            </div>
          </div>
        ))}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === heroSlide}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === heroSlide ? "scale-125 bg-white" : "bg-white/40 hover:bg-white/70"
              }`}
              onClick={() => setHeroSlide(i)}
            />
          ))}
        </div>
      </div>

      {/* Welcome strip */}
      <div className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Welcome to Ayur Health International
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base font-medium text-slate-700">
            Holistic wellness, member rewards, and transparent operations—aligned with the spirit of trusted
            health communities worldwide.
          </p>
        </div>
      </div>

      {/* Three pillars — Bootstrap card row */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
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
              <div className={cardHeaderClass}>
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className={cardBodyTextClass}>{card.body}</p>
                <a
                  href="#opportunity"
                  className="mt-4 inline-block text-sm font-bold text-ayur-green hover:underline"
                >
                  Learn more →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core values */}
      <div id="about" className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-ayur-maroon">
            Our core values
          </h2>
          <p className="mx-auto mt-4 max-w-4xl text-center text-lg font-medium text-slate-800 md:text-xl">
            Integrity, Trust, Accountability, Commitment to Customers, Passion, Constant Improvement,
            Leadership, Quality, and Simplicity.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              "Integrity",
              "Trust",
              "Accountability",
              "Customer commitment",
              "Leadership",
              "Quality",
              "Simplicity",
            ].map((value) => (
              <span key={value} className="rounded border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
                {value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Vision / Mission */}
      <div className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 sm:px-6">
          <div className={cardClass}>
            <div className="p-6">
            <h3 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wide text-ayur-green">
              Our vision
            </h3>
            <p className="mt-4 text-base leading-relaxed font-medium text-slate-700">
              To provide superior quality wellness and member services that people recommend to family and friends,
              teams are proud to build, and partners trust for the long term.
            </p>
            </div>
          </div>
          <div className={cardClass}>
            <div className="p-6">
            <h3 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wide text-ayur-green">
              Our mission
            </h3>
            <p className="mt-4 text-base leading-relaxed font-medium text-slate-700">
              To inspire healthier communities by connecting people to real wellness products, fair rewards, and
              dependable digital care—from onboarding to payouts.
            </p>
            </div>
          </div>
        </div>
      </div>

      {/* About — jumbotron style */}
      <div className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded border border-slate-200 bg-slate-50 p-8 shadow-inner md:p-10">
            <h2 className="text-2xl font-bold text-slate-900">About us</h2>
            <p className="mt-4 text-base leading-relaxed font-medium text-slate-700">
              Ayur Health International brings together complementary wellness philosophy, herbal and personal-care
              style products, and a modern member platform. Our digital back-office supports referrals, binary
              placement, BV/PV volume, M-Pesa-ready money movement, and responsive support—so the field can focus on
              people while operations stay auditable.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <Image
                  src="/hero-platform.svg"
                  alt="Platform overview"
                  width={640}
                  height={400}
                  className="h-auto w-full"
                />
              </div>
              <ul className="flex flex-col justify-center space-y-3 text-base font-medium text-slate-800">
                <li className="flex gap-2">
                  <span className="font-bold text-ayur-green">1</span>
                  <span>10–60 day style nutrition &amp; wellness program framing</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-ayur-green">2</span>
                  <span>Happy members, transparent commissions, and real-time visibility</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-ayur-green">3</span>
                  <span>Growing catalog of wellness products with BV/PV-aware purchases</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunity / modules */}
      <div id="opportunity" className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">The opportunity</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-base font-medium text-slate-700">
            Built for organizations that want Everhealthy-class depth without compromising on compliance tooling.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
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
                <div className="p-5 text-center">
                  <h4 className="text-lg font-semibold text-slate-900">{m.h}</h4>
                  <p className="mt-2 text-sm leading-relaxed font-medium text-slate-700">{m.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-slate-200 bg-ayur-green py-12 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 md:grid-cols-4 sm:px-6">
          {[
            ["10–60", "Day programs"],
            ["12+", "Core workflows"],
            ["24/7", "Platform access"],
            ["100%", "Audit-minded design"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-3xl font-bold tracking-tight md:text-4xl">{n}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" className="bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          <div className="mt-8 space-y-3">
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
                className="group rounded-md border border-slate-300 bg-white shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.08)] open:shadow-md"
              >
                <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {item.q}
                    <span className="text-ayur-gold group-open:rotate-180">▼</span>
                  </span>
                </summary>
                <div className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed font-medium text-slate-700">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div id="product" className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">Our recent products</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-base font-medium text-slate-700">
            Browse featured items. Members can apply BV/PV from the back office after signing in.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {landingProducts.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-md border border-slate-300 bg-slate-100 p-4"
                  >
                    <div className="h-36 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-[75%] rounded bg-slate-200" />
                  </div>
                ))
              : landingProducts.map((p) => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.08)] transition hover:shadow-md"
                  >
                    <div className="relative h-44 border-b border-slate-100 bg-slate-50">
                      {p.imageUrl ? (
                        <ProductThumb src={p.imageUrl} alt={p.name} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h5 className="font-bold text-slate-900 line-clamp-2">{p.name}</h5>
                      <p className="mt-1 text-sm font-semibold text-ayur-green">
                        {money(Number(p.price) || 0)}
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="border-t border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Benefits of Ayur Health International
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            ].map((b) => (
              <div key={b.h} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-lg font-semibold text-ayur-maroon">{b.h}</h4>
                <p className="mt-2 text-sm leading-relaxed font-medium text-slate-700">{b.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-md border border-slate-300 bg-white p-8 shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.08)] md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Sign up for newsletter</h3>
              <p className="mt-1 text-base font-medium text-slate-700">Product news, releases, and field updates.</p>
            </div>
            <form className="mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row md:mt-0">
              <input
                type="email"
                placeholder="Your email"
                className={inputClass}
              />
              <button
                type="button"
                className="rounded border border-ayur-gold bg-ayur-gold px-5 py-2 text-sm font-bold text-ayur-maroon hover:bg-ayur-gold/90"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer id="contacts" className="border-t border-slate-200 bg-slate-900 py-12 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4 sm:px-6">
          <div className="md:col-span-2">
            <Image
              src="/ayur-health-logo.svg"
              alt="Ayur Health International"
              width={200}
              height={52}
              className="h-10 w-auto"
            />
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
                <a href="/login" className="hover:text-white">
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
