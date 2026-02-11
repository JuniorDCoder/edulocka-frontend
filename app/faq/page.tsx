import Link from "next/link";
import { HelpCircle, Search, FileCheck, Building2, ArrowRight } from "lucide-react";

const faqGroups = [
  {
    title: "Verification",
    icon: Search,
    questions: [
      {
        q: "How can I verify a certificate on Edulocka?",
        a: "You can verify by certificate ID, wallet address, or transaction hash. For stronger proof, upload the certificate PDF and Edulocka will compare its SHA-256 hash with the IPFS file reference stored on-chain.",
      },
      {
        q: "What does “Potential Fake” mean in document verification?",
        a: "It means the uploaded document does not match blockchain records. Either the certificate ID is not found on-chain, or the uploaded file hash differs from the original hash anchored by the issuer.",
      },
      {
        q: "Why can verification be inconclusive sometimes?",
        a: "If the IPFS gateway is temporarily unreachable or a legacy certificate has no on-chain document hash, the system cannot complete a cryptographic file comparison at that moment.",
      },
    ],
  },
  {
    title: "Issuance",
    icon: FileCheck,
    questions: [
      {
        q: "Do issued certificates include document hashing?",
        a: "Yes. During issuance, the generated PDF is hashed and uploaded to IPFS. The resulting IPFS reference is then linked to the on-chain certificate record.",
      },
      {
        q: "Can I issue certificates in bulk?",
        a: "Yes. Use the bulk flow to upload a file, validate records, and issue multiple certificates in a batch.",
      },
      {
        q: "Can I customize certificate templates?",
        a: "Yes. Institutions can manage templates and use them while issuing certificates.",
      },
    ],
  },
  {
    title: "Institutions & Access",
    icon: Building2,
    questions: [
      {
        q: "Who can issue certificates?",
        a: "Authorized institutions. Edulocka supports institution onboarding and approval workflows before issuance rights are granted.",
      },
      {
        q: "What wallet/network should institutions use?",
        a: "Use the wallet and network configured for your Edulocka deployment. Your navbar network badge shows the currently connected chain.",
      },
      {
        q: "What should I do if my institution is not yet approved?",
        a: "Submit an institution application from the platform and wait for admin review/approval before issuing certificates.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="grid-pattern min-h-screen">
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <HelpCircle className="h-3.5 w-3.5" />
              Frequently Asked Questions
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Answers for Issuers and Verifiers
            </h1>
            <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg">
              Common questions about verification, document hashing, issuance flow, and institution onboarding.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {faqGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-none border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                  <group.icon className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{group.title}</h2>
              </div>

              <div className="space-y-2">
                {group.questions.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-none border border-gray-200 bg-gray-50 px-3 py-2 open:bg-white dark:border-gray-700 dark:bg-gray-800/50 dark:open:bg-gray-900"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:content-none dark:text-white">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {item.q}
                      </span>
                    </summary>
                    <p className="mt-2 border-t border-gray-200 pt-2 text-sm leading-relaxed text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 py-12 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ready to verify a certificate?</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Use the verification page to check certificate validity and document integrity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Verify Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-none border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white dark:hover:border-blue-500"
            >
              About Edulocka
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
