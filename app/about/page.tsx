import Link from "next/link";
import {
  ShieldCheck,
  Blocks,
  FileCheck,
  Building2,
  Lock,
  SearchCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const pillars = [
  {
    title: "Integrity by Design",
    description:
      "Each certificate is anchored to blockchain state and linked to immutable storage, reducing reliance on manual trust checks.",
    icon: ShieldCheck,
  },
  {
    title: "Transparent Verification",
    description:
      "Employers, schools, and students can independently verify credentials without waiting for email-based confirmations.",
    icon: SearchCheck,
  },
  {
    title: "Institutional Control",
    description:
      "Authorized institutions manage issuance, templates, and workflow while preserving a single verifiable source of truth.",
    icon: Building2,
  },
];

const workflow = [
  {
    title: "Issue",
    text: "Institutions generate a certificate PDF, hash the document, and anchor metadata plus IPFS reference on-chain.",
    icon: FileCheck,
  },
  {
    title: "Anchor",
    text: "The transaction creates tamper-evident proof tied to certificate ID, issuer, and blockchain record.",
    icon: Blocks,
  },
  {
    title: "Verify",
    text: "Anyone can verify by ID, wallet, tx hash, or uploaded PDF hash comparison against on-chain IPFS document.",
    icon: Lock,
  },
];

export default function AboutPage() {
  return (
    <div className="grid-pattern min-h-screen">
      <section className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute -left-16 bottom-0 h-60 w-60 rounded-full bg-green-500/10 blur-3xl dark:bg-green-500/20" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              About Edulocka
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Building Trust for Academic Credentials
            </h1>
            <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg">
              Edulocka helps institutions issue verifiable certificates and helps anyone validate credentials quickly with cryptographic proof.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-none border-2 border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-sm border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                <pillar.icon className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white/70 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How Edulocka Works</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              A simple verification pipeline designed for institutions and third-party verifiers.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-none border-2 border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-xs font-mono font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  0{index + 1}
                </span>
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-sm border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
                  <step.icon className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-none border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Why this matters</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Traditional credential checks are often slow and fragmented. Edulocka enables instant confidence by combining blockchain records, institution authorization, and document-level hash checks.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Tamper-evident certificate records",
                "Document hash integrity checks",
                "Public, independent verification",
                "Institution-authenticated issuance",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-none border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 py-12 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Need quick answers?</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Read common verification and issuance questions in the FAQ.
            </p>
          </div>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Go to FAQ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
