"use client";

import Link from "next/link";
import { useState } from "react";
import {
  GraduationCap,
  Building2,
  Users,
  CheckCircle,
  Shield,
  Lock,
  FileText,
  Download,
  Search,
  ArrowRight,
  Mail,
  QrCode,
  LayoutTemplate,
  BadgeCheck,
  Globe,
  ChevronDown,
  FileCheck,
  Layers,
  Eye,
  Zap,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";

// ── Visual step card ────────────────────────────────────────────────────────

function Step({
  number,
  icon: Icon,
  title,
  body,
  color = "blue",
}: {
  number: string;
  icon: React.ElementType;
  title: string;
  body: string;
  color?: "blue" | "green" | "orange" | "purple";
}) {
  const colors = {
    blue: {
      num: "border-blue-400 bg-blue-600 text-white dark:border-blue-600",
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
      bar: "bg-blue-500",
    },
    green: {
      num: "border-green-400 bg-green-600 text-white dark:border-green-600",
      icon: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400",
      bar: "bg-green-500",
    },
    orange: {
      num: "border-orange-400 bg-orange-500 text-white dark:border-orange-600",
      icon: "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
      bar: "bg-orange-400",
    },
    purple: {
      num: "border-purple-400 bg-purple-600 text-white dark:border-purple-600",
      icon: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
      bar: "bg-purple-500",
    },
  }[color];

  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-2 font-mono text-sm font-bold ${colors.num}`}>
          {number}
        </div>
      </div>
      <div className="flex-1 pb-8">
        <div className={`mb-3 inline-flex items-center justify-center rounded-none p-2.5 ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mb-1.5 text-base font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{body}</p>
      </div>
    </div>
  );
}

// ── Persona tab ─────────────────────────────────────────────────────────────

function PersonaSection({
  persona,
  active,
  onClick,
}: {
  persona: { id: string; label: string; icon: React.ElementType; color: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-none px-5 py-3 text-sm font-semibold transition-colors ${
        active
          ? `border-b-2 ${persona.color === "blue" ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
            : persona.color === "green" ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
            : "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"}`
          : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      <persona.icon className="h-4 w-4" />
      {persona.label}
    </button>
  );
}

// ── FAQ item ────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
      >
        {q}
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{a}</p>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

const personas = [
  { id: "student", label: "I'm a Student", icon: GraduationCap, color: "green" },
  { id: "institution", label: "I'm an Institution", icon: Building2, color: "blue" },
  { id: "employer", label: "I need to verify", icon: Users, color: "orange" },
];

export default function HowItWorksPage() {
  const [activePersona, setActivePersona] = useState("student");

  return (
    <div className="grid-pattern min-h-screen">

      {/* ── HERO ── */}
      <section className="border-b border-gray-200 bg-gradient-to-b from-blue-50/50 to-white dark:border-gray-800 dark:from-blue-950/10 dark:to-[#0a0a0a]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-none bg-blue-600 dark:bg-blue-500">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            How Edulocka works
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Certificates that can be issued in minutes, held forever, and verified by anyone in the world — instantly and for free.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/verify"
              className="flex items-center gap-2 rounded-none bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              <Search className="h-4 w-4" /> Verify a Certificate
            </Link>
            <Link href="/student/login"
              className="flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white">
              <GraduationCap className="h-4 w-4" /> Student Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── THE BIG PICTURE ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">The big picture</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500 dark:text-gray-400">
              Think of Edulocka as a notary for academic credentials — except anyone in the world can check the stamp, anytime, for free.
            </p>
          </div>

          {/* Visual flow */}
          <div className="relative flex flex-col items-center gap-0 md:flex-row md:items-start md:justify-center">
            {[
              {
                icon: Building2,
                label: "Institution",
                desc: "Issues the certificate",
                color: "blue",
                bg: "bg-blue-600",
              },
              null, // arrow
              {
                icon: FileText,
                label: "Edulocka",
                desc: "Records & stores it permanently",
                color: "purple",
                bg: "bg-purple-600",
              },
              null,
              {
                icon: GraduationCap,
                label: "Student",
                desc: "Receives & shares it",
                color: "green",
                bg: "bg-green-600",
              },
              null,
              {
                icon: Users,
                label: "Verifier",
                desc: "Confirms it's real in seconds",
                color: "orange",
                bg: "bg-orange-500",
              },
            ].map((item, i) => {
              if (item === null) {
                return (
                  <div key={i} className="flex items-center justify-center md:mt-8">
                    <ArrowRight className="h-5 w-5 rotate-90 text-gray-300 dark:text-gray-600 md:rotate-0" />
                  </div>
                );
              }
              return (
                <div key={item.label} className="flex flex-col items-center gap-3 p-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-none ${item.bg}`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 dark:text-white">{item.label}</p>
                    <p className="mt-0.5 max-w-[8rem] text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PERSONA TABS ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Step-by-step guide</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">Select your role to see what Edulocka looks like from your perspective.</p>
          </div>

          {/* Tab row */}
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
            {personas.map((p) => (
              <PersonaSection key={p.id} persona={p} active={activePersona === p.id} onClick={() => setActivePersona(p.id)} />
            ))}
          </div>
        </div>

        {/* Student flow */}
        {activePersona === "student" && (
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-none bg-green-600">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">For Students</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your institution issues it — you own it forever</p>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="space-y-0 border-r-0 md:border-r md:border-gray-100 md:dark:border-gray-800 md:pr-10">
                <Step number="1" icon={Mail} title="You receive an email" body="When your institution issues your certificate, you automatically get an email with your certificate PDF and a unique verification link." color="green" />
                <Step number="2" icon={GraduationCap} title="Log in to your Student Portal" body="Use your student ID (the same one your institution used when issuing) to access your personal certificate dashboard." color="green" />
                <Step number="3" icon={FileText} title="View all your certificates" body="Your dashboard shows every certificate issued to you — from any institution. See the degree, date, and current status at a glance." color="green" />
              </div>
              <div className="space-y-0 md:pl-10">
                <Step number="4" icon={Download} title="Download your PDF anytime" body="Download a full-quality PDF of any certificate. It includes a QR code that anyone can scan to instantly verify it's genuine." color="green" />
                <Step number="5" icon={QrCode} title="Share the verification link" body="Send employers or other institutions the certificate's verification link. They can confirm it's real in seconds — no login required on their end." color="green" />
                <Step number="6" icon={Shield} title="Your credentials never expire" body="Even if your institution closes or changes, your certificates remain permanently on record and verifiable." color="green" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/student/login"
                className="flex items-center gap-2 rounded-none bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 dark:bg-green-500">
                <GraduationCap className="h-4 w-4" /> Access My Certificates
              </Link>
              <Link href="/verify"
                className="flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:border-green-500 dark:border-gray-600 dark:bg-transparent dark:text-white">
                <Search className="h-4 w-4" /> Verify a Certificate
              </Link>
            </div>
          </div>
        )}

        {/* Institution flow */}
        {activePersona === "institution" && (
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-none bg-blue-600">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">For Institutions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Apply once, issue trusted credentials forever</p>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="space-y-0 border-r-0 md:border-r md:border-gray-100 md:dark:border-gray-800 md:pr-10">
                <Step number="1" icon={FileText} title="Submit your application" body="Fill in your institution's details — name, country, registration number, and upload your accreditation documents. Takes about 10 minutes." color="blue" />
                <Step number="2" icon={ShieldCheck} title="Get verified and approved" body="Our team reviews your application. Once approved, your institution is officially authorized to issue certificates." color="blue" />
                <Step number="3" icon={LayoutTemplate} title="Set up your certificate design" body="Upload your own certificate template with your logo and branding. We also provide default designs you can use right away." color="blue" />
              </div>
              <div className="space-y-0 md:pl-10">
                <Step number="4" icon={FileCheck} title="Issue single certificates" body="Fill in a student's name, degree, and issue date. A PDF is generated, stored, and emailed to the student automatically." color="blue" />
                <Step number="5" icon={Layers} title="Or issue in bulk" body="Upload a spreadsheet with hundreds of students. Edulocka processes them all — PDFs, QR codes, emails — in one go." color="blue" />
                <Step number="6" icon={Zap} title="Track everything on your dashboard" body="See every certificate you've issued, check their status, revoke if needed, and download reports." color="blue" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/apply-institution"
                className="flex items-center gap-2 rounded-none bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:bg-blue-500">
                <Building2 className="h-4 w-4" /> Apply as Institution
              </Link>
              <Link href="/issue"
                className="flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white">
                <FileCheck className="h-4 w-4" /> Issue a Certificate
              </Link>
            </div>
          </div>
        )}

        {/* Employer/verifier flow */}
        {activePersona === "employer" && (
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-none bg-orange-500">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">For Employers & Verifiers</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">No account needed — verify any certificate for free</p>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="space-y-0 border-r-0 md:border-r md:border-gray-100 md:dark:border-gray-800 md:pr-10">
                <Step number="1" icon={FileText} title="Get the certificate from the candidate" body="Ask the candidate to share their certificate PDF or the verification link from their Edulocka Student Portal." color="orange" />
                <Step number="2" icon={Search} title="Option A: Upload the PDF" body="Go to our Verify page and drop the PDF you received. We'll instantly check whether it matches the official copy on record." color="orange" />
                <Step number="3" icon={BadgeCheck} title="Option B: Enter the Certificate ID" body="If you have the certificate ID from the document, type it in. You'll see the recipient's name, degree, institution, and current status." color="orange" />
              </div>
              <div className="space-y-0 md:pl-10">
                <Step number="4" icon={QrCode} title="Option C: Scan the QR code" body="Every Edulocka certificate has a QR code. Scan it with any phone camera to open the verification page directly." color="orange" />
                <Step number="5" icon={CheckCircle} title="Get a clear result" body="You'll see: ✓ Authentic — this is the real certificate, or ✗ Doesn't match — the document may have been altered." color="orange" />
                <Step number="6" icon={Globe} title="No account, no cost, no delays" body="Verification is completely free and public. No login, no fees, no waiting for a reply from the institution." color="orange" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/verify"
                className="flex items-center gap-2 rounded-none bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600">
                <Search className="h-4 w-4" /> Verify a Certificate Now
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── WHY IT'S DIFFERENT ── */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111111]">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Traditional certificates vs. Edulocka
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Here's why digital credentials stored on Edulocka are more trustworthy than a scanned PDF or printed paper.
            </p>
          </div>

          <div className="overflow-hidden rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"></div>
              <div className="border-l border-gray-200 px-4 py-3 text-center dark:border-gray-700">
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldOff className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Traditional PDF / Paper</span>
                </div>
              </div>
              <div className="border-l border-blue-200 bg-blue-50 px-4 py-3 text-center dark:border-blue-800/30 dark:bg-blue-950/20">
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">Edulocka Certificate</span>
                </div>
              </div>
            </div>

            {[
              {
                question: "Can it be forged?",
                traditional: "Yes — anyone can edit a PDF or scan a fake",
                edulocka: "No — every certificate has a tamper-evident record",
              },
              {
                question: "How do you verify it?",
                traditional: "Call the institution and wait for a reply",
                edulocka: "Upload the PDF or enter the ID — instant result",
              },
              {
                question: "Does it expire or get lost?",
                traditional: "Paper can be lost, links can break",
                edulocka: "Permanently on record — accessible forever",
              },
              {
                question: "What if the institution closes?",
                traditional: "Records may be lost or inaccessible",
                edulocka: "Certificate remains verifiable regardless",
              },
              {
                question: "Cost to verify?",
                traditional: "Sometimes charged for official transcripts",
                edulocka: "Free, public, no account needed",
              },
              {
                question: "Speed of verification?",
                traditional: "Days to weeks for official confirmation",
                edulocka: "Under 3 seconds",
              },
            ].map((row, i) => (
              <div key={row.question} className={`grid grid-cols-3 border-b border-gray-100 last:border-0 dark:border-gray-800 ${i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-800/20"}`}>
                <div className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{row.question}</div>
                <div className="border-l border-gray-100 px-4 py-3 dark:border-gray-800">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <span className="text-[9px] font-bold text-red-600">✗</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{row.traditional}</span>
                  </div>
                </div>
                <div className="border-l border-blue-100 bg-blue-50/30 px-4 py-3 dark:border-blue-900/20 dark:bg-blue-950/10">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
                      <span className="text-[9px] font-bold text-green-600 dark:text-green-400">✓</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.edulocka}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE TECHNOLOGY (optional / simple) ── */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              The technology behind it
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              You don't need to understand the technology to use Edulocka — but here's a plain-English explanation if you're curious.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                icon: Lock,
                title: "A permanent public ledger",
                body: "Edulocka stores a fingerprint of every certificate on a blockchain — essentially a shared spreadsheet that thousands of computers hold copies of. Once written, no single person or organization can change it.",
                optional: false,
              },
              {
                icon: Eye,
                title: "No middleman needed",
                body: "When you verify a certificate, you're reading directly from that public ledger. We don't have to call the institution or check any private database — the record is public and always available.",
                optional: false,
              },
              {
                icon: Globe,
                title: "IPFS — decentralized file storage",
                body: "The actual certificate PDF is stored on IPFS — a network where files are distributed across many computers. This means your certificate file isn't stored on just one server that could go offline.",
                optional: true,
              },
              {
                icon: Shield,
                title: "File fingerprinting (hashing)",
                body: "Every certificate PDF has a unique mathematical fingerprint (called a hash). When you upload a PDF to verify, we compare its fingerprint to the one recorded at issuance. If they match, the file is unchanged.",
                optional: true,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-none border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-blue-100 dark:bg-blue-950/40">
                    <item.icon className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    {item.optional && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        optional reading
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#111111]">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Frequently asked questions
          </h2>
          <div>
            {[
              {
                q: "Do I need to create an account to verify a certificate?",
                a: "No. Verification is completely free and public. Just go to the Verify page, upload the PDF or enter the Certificate ID, and you'll have a result in seconds.",
              },
              {
                q: "How do I get my certificate if I'm a student?",
                a: "Your institution will email it to you automatically when it's issued. You can also log in to the Student Portal at any time using the Student ID your institution used when issuing the certificate.",
              },
              {
                q: "What if I don't know my Student ID?",
                a: "Contact your institution — they have the ID they used when issuing your certificate. It might be your enrolment number, admission number, or another ID from your records.",
              },
              {
                q: "Can a certificate be revoked?",
                a: "Yes. Institutions can revoke a certificate if it was issued in error. The revocation is also permanently recorded, so verifiers will see that the certificate is no longer valid — not that it was 'not found'.",
              },
              {
                q: "How long do certificates remain verifiable?",
                a: "Indefinitely. Once a certificate is recorded, it stays on the public ledger permanently. Even if Edulocka stops operating, the blockchain record remains.",
              },
              {
                q: "Is my personal information visible to the public?",
                a: "Only the certificate details — name, degree, institution, and issue date — are visible when someone verifies a certificate. No contact information is stored or displayed.",
              },
              {
                q: "Can I verify a certificate from a different country?",
                a: "Yes. Edulocka is global. Any institution on the platform can issue certificates to students anywhere, and those certificates can be verified from anywhere in the world.",
              },
              {
                q: "What does 'blockchain' actually mean here?",
                a: "A blockchain is a public record that thousands of computers hold identical copies of. When Edulocka records a certificate, it's added to this shared record. Because so many independent computers hold the same copy, no one can alter or delete it.",
              },
            ].map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section>
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: GraduationCap,
                label: "Student",
                body: "Access and download all your certificates",
                cta: "Open Student Portal",
                href: "/student/login",
                bg: "bg-green-600 hover:bg-green-700",
                border: "border-green-200 dark:border-green-900",
              },
              {
                icon: Search,
                label: "Verifier",
                body: "Check a certificate you've received",
                cta: "Verify Certificate",
                href: "/verify",
                bg: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500",
                border: "border-blue-200 dark:border-blue-900",
              },
              {
                icon: Building2,
                label: "Institution",
                body: "Start issuing trusted credentials",
                cta: "Apply Now",
                href: "/apply-institution",
                bg: "bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600",
                border: "border-gray-200 dark:border-gray-700",
              },
            ].map((card) => (
              <div key={card.label}
                className={`flex flex-col rounded-none border-2 bg-white p-6 dark:bg-gray-900 ${card.border}`}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-none bg-gray-100 dark:bg-gray-800">
                  <card.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </div>
                <span className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{card.label}</span>
                <p className="mb-4 flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{card.body}</p>
                <Link href={card.href}
                  className={`flex items-center gap-1.5 rounded-none px-4 py-2.5 text-sm font-bold text-white ${card.bg}`}>
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
