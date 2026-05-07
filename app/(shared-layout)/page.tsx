"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowRight,
  Check,
  Clock,
  Shield,
  TriangleAlert,
  Building2,
  Home as HomeIcon,
  Zap,
} from "lucide-react";
import { FlippingCard } from "@/components/ui/flipping-card";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const role = useQuery(api.roles.myRole, isAuthenticated ? {} : "skip");
  const isStaff = role === "staff";

  // Animated stamp on the hero — settles in after a beat.
  const [stamp, setStamp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStamp(true), 350);
    return () => clearTimeout(t);
  }, []);

  const primaryHref = !isAuthenticated
    ? "/auth/sign-up"
    : isStaff
      ? "/dashboard"
      : "/bankstatement";
  const primaryLabel = !isAuthenticated
    ? "Verify your first document"
    : isStaff
      ? "Open the review queue"
      : "Upload a document";

  return (
    <div className="view">
      {/* ============ HERO ============ */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden />
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-eyebrow">
              Document verification · built for serious work
            </div>
            <h1 className="lp-h1">
              Approve documents
              <br />
              in <span className="lp-mark">minutes</span>,
              <br />
              not <span className="lp-strike">days</span>.
            </h1>
            <p className="lp-lede">
              SmartDMV reads every page of every bank statement, lease, and
              utility bill — checks the names, dates, signatures, and totals — and
              hands your team a decision-ready review.
            </p>
            <div className="lp-cta">
              <Link href={primaryHref} className="btn btn-lg" style={primaryBtnStyle}>
                {primaryLabel} <ArrowRight />
              </Link>
              <button
                className="btn-link"
                onClick={() =>
                  document
                    .getElementById("lp-how")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                See how it works →
              </button>
            </div>
            <div className="lp-trust">
              <span>
                <Shield /> SOC 2 Type II
              </span>
              <span className="dot">·</span>
              <span>
                <Check /> 256-bit encryption
              </span>
              <span className="dot">·</span>
              <span>
                <Clock /> Median 18 sec / doc
              </span>
            </div>
          </div>

          
          
          <aside className="lp-hero-cards" aria-label="Supported documents">
            {HERO_DOCCARDS.map((d) => (
              <FlippingCard
                key={d.kind}
                width={340}
                height={195}
                // Override the component's default white surface so the
                // hero bg shines through. tailwind-merge on cn() resolves
                // the conflict (later class wins), so no !important needed.
                className="bg-transparent border-white/15 dark:border-white/15"
                faceClassName="bg-transparent text-white dark:bg-transparent"
                frontContent={
                  <div className="lp-doccard-front">
                    <div className="lp-doccard-image">{d.icon}</div>
                    <div className="lp-doccard-body">
                      <h3 className="lp-doccard-title">{d.title}</h3>
                      <p className="lp-doccard-blurb">{d.teaser}</p>
                    </div>
                  </div>
                }
                backContent={
                  <div className="lp-doccard-back">
                    <div className="lp-doccard-back-head">
                      {d.icon}
                      <h3>{d.title}</h3>
                    </div>
                    <p>{d.full}</p>
                  </div>
                }
              />
            ))}
          </aside>
        </div>
      </section>

      {/* ============ NUMBERS ============ */}
      <section className="lp-numbers">
        <div className="lp-numbers-inner">
          {[
            {
              n: "99.4%",
              l: "Verification accuracy",
              s: "Across 1.2M reviewed documents.",
            },
            {
              n: "18 sec",
              l: "Median read time",
              s: "From upload to flagged findings.",
            },
            {
              n: "4×",
              l: "Faster approvals",
              s: "Versus a manual reviewer.",
            },
            {
              n: "0",
              l: "Originals stored",
              s: "After 30 days. Period.",
            },
          ].map((x) => (
            <div key={x.l} className="lp-num">
              <div className="lp-num-big">{x.n}</div>
              <div className="lp-num-lbl">{x.l}</div>
              <div className="lp-num-sub">{x.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PRODUCT PEEK ============ */}
      <section className="lp-peek">
        <div className="lp-peek-inner">
          <div className="lp-peek-copy">
            <div className="lp-eyebrow dark">The reviewer&apos;s view</div>
            <h2 className="lp-h2">Findings on the page itself.</h2>
            <p className="lp-body">
              SmartDMV doesn&apos;t dump a JSON report. It marks the document —
              name mismatch on page 4, expired signature on page 1, missing
              initials on page 3 — so your team checks the AI&apos;s work at a
              glance.
            </p>
            <ul className="lp-checks">
              <li>
                <Check />
                Inline highlights for every finding
              </li>
              <li>
                <Check />
                One-click approve or reject
              </li>
              <li>
                <Check />
                Internal notes that stay private
              </li>
            </ul>
          </div>
          <div className="lp-peek-frame">
            <div className="lp-peek-chrome">
              <span></span>
              <span></span>
              <span></span>
              <div className="lp-peek-url">
                smartDMV.app / review / DOC-9201
              </div>
            </div>
            <div className="lp-peek-doc">
              <div className="lp-peek-toolbar">
                <span>PAGE 1 OF 4</span>
                <span className="chip chip-warn">
                  <TriangleAlert />1 flag
                </span>
              </div>
              <div className="lp-peek-paper">
                <h4>Statement of Account</h4>
                <div className="rl">
                  <span>Holder</span>
                  <b className="hl-warn">Léa Bertrant</b>
                </div>
                <div className="rl">
                  <span>Account</span>
                  <span className="m">••••-•••-4421</span>
                </div>
                <div className="rl">
                  <span>Period</span>
                  <span>1 Apr – 30 Apr 2026</span>
                </div>
                <div className="rl">
                  <span>Closing</span>
                  <span className="m">$14,902.55</span>
                </div>
                <div className="rl">
                  <span>Issuer</span>
                  <span>Chase Bank, N.A.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SUPPORTED DOCS ============ */}
      <section className="lp-docs">
        <div className="lp-docs-inner">
          <div className="lp-eyebrow">What SmartDMV reads</div>
          <h2 className="lp-h2 light">Three documents. Verified, not skimmed.</h2>
          <div className="lp-docs-grid">
            {SUPPORTED_DOCS.map((f) => (
              <div key={f.title} className="lp-doc">
                <div className="lp-doc-ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.copy}</p>
                <Link href={f.href} className="btn-link sm">
                  Try it →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW ============ */}
      <section className="lp-how" id="lp-how">
        <div className="lp-how-inner">
          <div className="lp-eyebrow dark">How it works</div>
          <h2 className="lp-h2">Three steps. No training required.</h2>
          <div className="lp-how-grid">
            <div className="lp-step">
              <div className="lp-step-n">01</div>
              <h4>Drop a document.</h4>
              <p>
                Anyone on your team — or your applicants — uploads the file.
                PDFs, scans, photos.
              </p>
            </div>
            <div className="lp-step accent">
              <div className="lp-step-n">02</div>
              <h4>SmartDMV reads every page.</h4>
              <p>
                Signatures, names, dates, totals — checked against your rules
                in seconds.
              </p>
            </div>
            <div className="lp-step">
              <div className="lp-step-n">03</div>
              <h4>Your team approves.</h4>
              <p>
                One reviewer, one screen, one click. Decisions land in under a
                minute.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ QUOTE ============ */}
      <section className="lp-quote">
        <div className="lp-quote-inner">
          <div className="lp-quote-mark" aria-hidden>
            “
          </div>
          <blockquote>
            We were hand-checking 80 statements a week. SmartDMV gave that day
            back to the team. Now we spend it on the applications that{" "}
            <i>actually</i> need a human eye.
          </blockquote>
          <div className="lp-quote-attr">
            <div className="lp-quote-av">MA</div>
            <div>
              <div className="lp-quote-name">Mira Adeyemi</div>
              <div className="lp-quote-role">
                Head of Operations · Boston Properties
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="lp-final">
        <div className="lp-final-inner">
          <h2>Stop re-reading PDFs.</h2>
          <p>Upload your first document free. No card. No setup.</p>
          <div className="lp-cta">
            <Link href={primaryHref} className="btn btn-lg" style={primaryBtnStyle}>
              {primaryLabel} <ArrowRight />
            </Link>
            
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="brand-mark">
              Smart<span className="accent">DMV</span>
            </span>
            <span>© 2026 SmartDMV</span>
          </div>
          <div className="lp-footer-links">
            <a>Product</a>
            <a>Pricing</a>
            <a>Security</a>
            <a>Docs</a>
            <a>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

type HeroDocKind = "lease" | "utility" | "bank";
type HeroDoc = {
  kind: HeroDocKind;
  title: string;
  // Short teaser shown on the front under the icon. ~2 lines max.
  teaser: string;
  // Full description shown on the back when the card flips.
  full: string;
  // The lucide icon, cloned on the back face with a className that the CSS
  // recolors to match the gradient.
  icon: React.ReactElement<{ className?: string }>;
};
const HERO_DOCCARDS: HeroDoc[] = [
  {
    kind: "lease",
    title: "Lease agreement",
    icon: <HomeIcon />,
    teaser:
      "Often required as proof of address — new jobs, loans, government offices.",
    full:
      "A lease agreement is the contract between you and your landlord. It's routinely requested when you apply for a new job, a loan, a credit card, or any service that needs to confirm where you live. Pre-verify it here and you'll know names, dates, and signatures all check out before you submit.",
  },
  {
    kind: "utility",
    title: "Utility bill",
    icon: <Zap />,
    teaser:
      "The most-asked proof of address — banks, the DMV, schools, anywhere.",
    full:
      "A current utility bill (electric, gas, water, internet) doubles as a proof-of-address document. Banks, the DMV, schools, and most government services accept it when it's recent and in your name. SmartRent confirms the address, issue date, and issuer so you don't get rejected for an out-of-window bill.",
  },
  {
    kind: "bank",
    title: "Bank statement",
    icon: <Building2 />,
    teaser:
      "Required for mortgages, leases, and most large financial decisions.",
    full:
      "Bank statements are routinely requested when you apply for a mortgage, rent a property, or take out a loan. Lenders need to see the holder name, statement period, and balance trends. SmartDMV reads every page and flags redactions, mismatched names, or short periods before you submit.",
  },
];

const SUPPORTED_DOCS = [
  {
    title: "Bank statements",
    href: "/bankstatement",
    icon: <Building2 />,
    copy:
      "Holder, account number, period, balance trends. Flags redactions and mismatched names.",
  },
  {
    title: "Lease agreements",
    href: "/lease-agreement",
    icon: <HomeIcon />,
    copy:
      "Confirms every named party signed, dates align, and rent terms are present. Catches missing pages.",
  },
  {
    title: "Utility bills",
    href: "/utility-bill",
    icon: <Zap />,
    copy:
      "Verifies the service address matches your records, the bill is recent, and the issuing utility is real.",
  },
];

// White-on-dark CTA used in hero + final CTA.
const primaryBtnStyle: React.CSSProperties = {
  background: "#fff",
  color: "var(--ink-7)",
  borderColor: "#fff",
};
