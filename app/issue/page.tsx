"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "@/lib/wallet-context";
import { TransactionStatus } from "@/components/transaction-status";
import { HashDisplay } from "@/components/hash-display";
import { NetworkBadge } from "@/components/network-badge";
import { TransactionStep } from "@/lib/types";
import {
  issueCertificate,
  getNetworkInfo,
  isAuthorizedInstitution,
  getInstitutionInfo,
  generateCertificateId,
  uploadToIPFS,
} from "@/lib/contract";
import {
  issueSingleViaBackend,
  getCertificatePdfUrl,
  getQRCodeDataUrl,
  listTemplates,
  type TemplateInfo,
} from "@/lib/api-client";
import {
  Wallet,
  Upload,
  FileCheck,
  AlertCircle,
  Fuel,
  ArrowRight,
  Loader2,
  CheckCircle,
  Copy,
  Check,
  X,
  File,
  RefreshCw,
  Server,
  Monitor,
  Mail,
  FileText,
  Download,
} from "lucide-react";

export default function IssuePage() {
  const { wallet, connect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    studentName: "",
    studentId: "",
    degree: "",
    institution: "",
    issueDate: "",
    certId: "",
  });
  const [ipfsHash, setIpfsHash] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [ipfsPinned, setIpfsPinned] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedCertId, setIssuedCertId] = useState("");
  const [txSteps, setTxSteps] = useState<TransactionStep[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    blockNumber: number;
    txHash: string;
    gasUsed: number;
  } | null>(null);
  const [networkInfo, setNetworkInfo] = useState({
    name: "Connecting...",
    isTestnet: true,
    gasPrice: "— Gwei",
    blockNumber: 0,
    chainId: 0,
  });
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Backend pipeline mode
  const [useBackend, setUseBackend] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("default-certificate");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [backendResult, setBackendResult] = useState<{
    certId: string;
    ipfsHash: string;
    documentHash?: string;
    txHash: string;
    pdfUrl?: string;
    qrDataUrl?: string;
  } | null>(null);

  // Fetch network info and authorization status
  useEffect(() => {
    if (!wallet.connected) return;

    const fetchInfo = async () => {
      try {
        const info = await getNetworkInfo();
        setNetworkInfo(info);
        const auth = await isAuthorizedInstitution(wallet.address);
        setIsAuthorized(auth);
        if (auth) {
          const instInfo = await getInstitutionInfo(wallet.address);
          if (instInfo?.name) {
            setInstitutionName(instInfo.name);
            setFormData((prev) => ({
              ...prev,
              institution: prev.institution || instInfo.name,
            }));
          }
        }
      } catch {
        // Network not available
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 60000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address]);

  // Load templates (institution-scoped) — just pass address, no signing needed
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await listTemplates(wallet.address || undefined);
        setTemplates(data.templates);
      } catch {
        // Templates unavailable
      }
    };
    loadTemplates();
  }, [wallet.address]);

  // Auto-generate certificate ID on mount
  useEffect(() => {
    if (!wallet.connected) return;
    if (formData.certId) return; // Don't overwrite if user already has one

    const genId = async () => {
      try {
        const id = await generateCertificateId();
        setFormData((prev) => ({ ...prev, certId: id }));
      } catch {
        // Fallback
      }
    };
    genId();
  }, [wallet.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerateCertId = async () => {
    try {
      const id = await generateCertificateId();
      setFormData((prev) => ({ ...prev, certId: id }));
    } catch {
      // keep existing
    }
  };

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate: PDF or image, max 10MB
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or image file (PNG, JPG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadedFile({ name: file.name, size: file.size });
    setIpfsPinned(false);

    try {
      const result = await uploadToIPFS(file);
      setIpfsHash(result.ipfsHash);
      setDocumentHash(result.documentHash || "");
      setIpfsPinned(result.pinned);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      setUploadedFile(null);
    }

    setIsUploading(false);
  };

  const handleRemoveFile = () => {
    setIpfsHash("");
    setDocumentHash("");
    setIpfsPinned(false);
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowSuccess(false);
    setSuccessData(null);
    setError(null);

    setTxSteps([
      { label: "Preparing transaction...", status: "processing" },
      { label: "Awaiting wallet signature", status: "waiting" },
      { label: "Confirming on chain", status: "waiting" },
      { label: "Finalized", status: "waiting" },
    ]);

    try {
      const issueTimestamp = Math.floor(
        new Date(formData.issueDate).getTime() / 1000
      );

      if (!ipfsHash) {
        setError("Please upload a certificate document first.");
        setIsSubmitting(false);
        setTxSteps([]);
        return;
      }

      setTxSteps([
        { label: "Transaction prepared", status: "completed" },
        { label: "Awaiting wallet signature...", status: "processing" },
        { label: "Confirming on chain", status: "waiting" },
        { label: "Finalized", status: "waiting" },
      ]);

      const { tx, receipt } = await issueCertificate({
        certificateId: formData.certId,
        studentName: formData.studentName,
        studentId: formData.studentId,
        degree: formData.degree,
        institution: formData.institution,
        issueDate: issueTimestamp,
        ipfsHash: ipfsHash,
      });

      setTxSteps([
        { label: "Transaction prepared", status: "completed" },
        { label: "Wallet signature received", status: "completed", txHash: tx.hash },
        { label: "Confirmed on chain", status: "completed", blockNumber: receipt.blockNumber },
        { label: "Finalizing...", status: "processing" },
      ]);

      await new Promise((r) => setTimeout(r, 500));

      setTxSteps([
        { label: "Transaction prepared", status: "completed" },
        { label: "Wallet signature received", status: "completed", txHash: tx.hash },
        { label: "Confirmed on chain", status: "completed", blockNumber: receipt.blockNumber },
        { label: "Finalized", status: "completed", timestamp: new Date().toLocaleString() },
      ]);

      setSuccessData({
        blockNumber: receipt.blockNumber,
        txHash: tx.hash,
        gasUsed: Number(receipt.gasUsed),
      });
      setIssuedCertId(formData.certId); // Save for QR code before clearing
      setShowSuccess(true);

      // Reset form and auto-generate next ID
      setFormData({ studentName: "", studentId: "", degree: "", institution: institutionName || "", issueDate: "", certId: "" });
      setIpfsHash("");
      setIpfsPinned(false);
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Generate next cert ID
      try {
        const nextId = await generateCertificateId();
        setFormData((prev) => ({ ...prev, certId: nextId }));
      } catch { /* keep empty */ }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Issue failed:", error);

      let errorMsg = "Transaction failed. ";
      const msg = error.message || "";
      if (msg.includes("CertificateAlreadyExists")) {
        errorMsg += "A certificate with this ID already exists.";
      } else if (msg.includes("NotAuthorizedInstitution")) {
        errorMsg += "Your wallet is not authorized as an institution.";
      } else if (msg.includes("EmptyStringNotAllowed")) {
        errorMsg += "All fields are required.";
      } else if (msg.includes("user rejected")) {
        errorMsg = "Transaction was rejected in wallet.";
      } else {
        errorMsg += msg.slice(0, 150);
      }

      setError(errorMsg);
      setTxSteps([
        { label: "Transaction prepared", status: "completed" },
        { label: "Transaction failed", status: "failed" },
      ]);
    }

    setIsSubmitting(false);
  };

  // ===== BACKEND PIPELINE SUBMIT =====
  const handleBackendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowSuccess(false);
    setBackendResult(null);
    setError(null);

    setTxSteps([
      { label: "Sending to backend pipeline...", status: "processing" },
      { label: "Generating PDF", status: "waiting" },
      { label: "Uploading to IPFS", status: "waiting" },
      { label: "Recording on blockchain", status: "waiting" },
      { label: "Generating QR code", status: "waiting" },
    ]);

    try {
      setTxSteps([
        { label: "Sent to backend", status: "completed" },
        { label: "Processing pipeline...", status: "processing" },
        { label: "Uploading to IPFS", status: "waiting" },
        { label: "Recording on blockchain", status: "waiting" },
        { label: "Generating QR code", status: "waiting" },
      ]);

      const result = await issueSingleViaBackend({
        studentName: formData.studentName,
        studentId: formData.studentId,
        degree: formData.degree,
        institution: formData.institution,
        issueDate: formData.issueDate,
        email: email || undefined,
        templateName: selectedTemplate,
      });

      setTxSteps([
        { label: "Sent to backend", status: "completed" },
        { label: "PDF generated", status: "completed" },
        { label: "Uploaded to IPFS", status: "completed" },
        { label: "Recorded on blockchain", status: "completed", txHash: result.blockchain.txHash },
        { label: "QR code generated", status: "completed" },
      ]);

      // Fetch QR data URL
      let qrDataUrl: string | undefined;
      try {
        const qrResult = await getQRCodeDataUrl(result.certId);
        qrDataUrl = qrResult.dataUrl;
      } catch { /* optional */ }

      setBackendResult({
        certId: result.certId,
        ipfsHash: result.ipfs.hash,
        documentHash: result.ipfs.documentHash,
        txHash: result.blockchain.txHash,
        pdfUrl: getCertificatePdfUrl(result.certId),
        qrDataUrl,
      });

      setIssuedCertId(result.certId);
      setShowSuccess(true);

      // Reset form
      setFormData({ studentName: "", studentId: "", degree: "", institution: institutionName || "", issueDate: "", certId: "" });
      setEmail("");
      try {
        const nextId = await generateCertificateId();
        setFormData((prev) => ({ ...prev, certId: nextId }));
      } catch { /* keep empty */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Backend pipeline failed";
      setError(msg);
      setTxSteps([
        { label: "Sent to backend", status: "completed" },
        { label: "Pipeline failed", status: "failed" },
      ]);
    }

    setIsSubmitting(false);
  };

  // ===== NOT CONNECTED =====
  if (!wallet.connected) {
    return (
      <div className="grid-pattern min-h-screen">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-32 sm:px-6 lg:px-8">
          <div className="neon-border w-full max-w-md rounded-none bg-white p-8 text-center dark:bg-gray-900">
            <div className="hexagon mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-blue-600 dark:bg-blue-500">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Connect Your Wallet
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You need to connect a wallet to issue certificates on the blockchain.
            </p>
            <div className="mt-8 space-y-3">
              <button
                onClick={connect}
                className="flex w-full items-center justify-between rounded-none border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-orange-100 dark:bg-orange-950/30">
                    <span className="text-lg">🦊</span>
                  </div>
                  <span>MetaMask</span>
                </div>
                <span className="rounded-sm bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/30 dark:text-green-400">
                  POPULAR
                </span>
              </button>
              <button
                onClick={connect}
                className="flex w-full items-center gap-3 rounded-none border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-blue-100 dark:bg-blue-950/30">
                  <span className="text-lg">🔗</span>
                </div>
                <span>WalletConnect</span>
              </button>
              <button
                onClick={connect}
                className="flex w-full items-center gap-3 rounded-none border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-blue-500 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-purple-100 dark:bg-purple-950/30">
                  <span className="text-lg">💰</span>
                </div>
                <span>Coinbase Wallet</span>
              </button>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-sm border border-yellow-200 bg-yellow-50 p-3 text-left dark:border-yellow-800 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Only authorized institutions can issue certificates. Ensure your wallet is registered.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== CONNECTED - ISSUE FORM =====
  return (
    <div className="grid-pattern min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                Issue Certificate
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create a new blockchain-verified academic credential
              </p>
            </div>
            <Link
              href="/bulk"
              className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Bulk Issue →
            </Link>
          </div>

          {/* Mode toggle */}
          <div className="mt-4 flex flex-col rounded-none border-2 border-gray-200 sm:flex-row dark:border-gray-700">
            <button
              type="button"
              onClick={() => setUseBackend(false)}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                !useBackend
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" /> Direct Blockchain (MetaMask)
            </button>
            <button
              type="button"
              onClick={() => setUseBackend(true)}
              className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                useBackend
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <Server className="h-3.5 w-3.5" /> Backend Pipeline (PDF + QR + Email)
            </button>
          </div>
        </div>

        {isAuthorized === false && (
          <div className="mb-6 flex flex-col gap-3 rounded-none border-2 border-red-300 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-800 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  Wallet Not Authorized
                </p>
                <p className="text-xs text-red-600 dark:text-red-400/70">
                  Your wallet is not registered as an authorized institution.
                </p>
              </div>
            </div>
            <Link
              href="/apply-institution"
              className="flex w-full items-center justify-center gap-1 rounded-sm bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 sm:w-auto"
            >
              Apply Now <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* ── Success Banner ── */}
        {showSuccess && (
          <div className="mb-6 rounded-none border-2 border-green-300 bg-green-50 p-5 dark:border-green-700 dark:bg-green-950/30">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                    Certificate Issued Successfully!
                  </h3>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Certificate <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs font-bold text-green-800 dark:bg-green-900/50 dark:text-green-300">{issuedCertId}</code> has been permanently recorded on the blockchain.
                  </p>
                  {successData && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-green-600 dark:text-green-400/80">
                      <span>Block #{successData.blockNumber.toLocaleString()}</span>
                      <span className="text-green-300 dark:text-green-700">•</span>
                      <span>Gas: {successData.gasUsed.toLocaleString()}</span>
                      <span className="text-green-300 dark:text-green-700">•</span>
                      <span className="font-mono">{successData.txHash.slice(0, 10)}...{successData.txHash.slice(-8)}</span>
                    </div>
                  )}
                  {backendResult && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-green-600 dark:text-green-400/80">
                      <span className="font-mono">TX: {backendResult.txHash.slice(0, 10)}...{backendResult.txHash.slice(-8)}</span>
                      {backendResult.ipfsHash && (
                        <><span className="text-green-300 dark:text-green-700">•</span><span className="font-mono">IPFS: {backendResult.ipfsHash.slice(0, 12)}...</span></>
                      )}
                      {backendResult.documentHash && (
                        <><span className="text-green-300 dark:text-green-700">•</span><span className="font-mono">SHA-256: {backendResult.documentHash.slice(0, 12)}...</span></>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/verify?certId=${encodeURIComponent(issuedCertId)}`}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      Verify On-Chain
                    </Link>
                    {backendResult?.pdfUrl && (
                      <a
                        href={backendResult.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm border border-green-300 bg-white px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-900/30"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </a>
                    )}
                    <div className="rounded-sm border border-green-200 bg-white p-1 dark:border-green-800 dark:bg-green-950/30">
                      <QRCodeSVG
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?certId=${encodeURIComponent(issuedCertId)}`}
                        size={48}
                        level="M"
                        bgColor="transparent"
                        fgColor="#16a34a"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setShowSuccess(false); setSuccessData(null); setBackendResult(null); }}
                className="flex-shrink-0 text-green-400 hover:text-green-600 dark:text-green-600 dark:hover:text-green-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6 rounded-none border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-green-500">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-green-700 dark:text-green-400">Connected Wallet</p>
                    <div className="flex items-center gap-2">
                      <code className="truncate font-mono text-xs text-gray-900 sm:text-sm dark:text-white">
                        {wallet.address}
                      </code>
                      <button onClick={handleCopyAddress} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <NetworkBadge name={networkInfo.name} isTestnet={networkInfo.isTestnet} gasPrice={networkInfo.gasPrice} />
              </div>
            </div>

            <form onSubmit={useBackend ? handleBackendSubmit : handleSubmit} className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-gray-900 dark:text-white">
                  <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  CERTIFICATE DATA
                </h2>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Student Name</label>
                    <input type="text" required value={formData.studentName} onChange={(e) => setFormData({ ...formData, studentName: e.target.value })} placeholder="Alice Johnson" className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Student ID</label>
                    <input type="text" required value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} placeholder="STU-2026-001" className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Degree / Certificate</label>
                  <input type="text" required value={formData.degree} onChange={(e) => setFormData({ ...formData, degree: e.target.value })} placeholder="Bachelor of Computer Science" className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500" />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Institution
                    {institutionName && (
                      <span className="ml-2 normal-case text-green-600 dark:text-green-400">✓ Verified</span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.institution}
                    onChange={(e) => {
                      if (!institutionName) setFormData({ ...formData, institution: e.target.value });
                    }}
                    readOnly={!!institutionName}
                    placeholder="MIT - Massachusetts Institute of Technology"
                    className={`w-full rounded-none border-2 px-3 py-2.5 text-sm focus:outline-none ${
                      institutionName
                        ? "border-green-200 bg-green-50 text-gray-900 dark:border-green-800 dark:bg-green-950/20 dark:text-white"
                        : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500"
                    }`}
                  />
                  {institutionName && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      Auto-filled from your authorized institution profile
                    </p>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Issue Date</label>
                    <input type="date" required value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Certificate ID <span className="normal-case text-green-600 dark:text-green-400">(auto-generated)</span></label>
                    <div className="flex gap-2">
                      <input type="text" required readOnly value={formData.certId} className="w-full rounded-none border-2 border-gray-200 bg-gray-100 px-3 py-2.5 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500" />
                      <button type="button" onClick={regenerateCertId} className="flex items-center justify-center rounded-none border-2 border-gray-200 bg-white px-2.5 hover:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500" title="Generate new ID">
                        <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Certificate Document (PDF / Image)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelected}
                    className="hidden"
                  />

                  {useBackend ? (
                    <div className="space-y-3">
                      <div className="rounded-none border-2 border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">PDF auto-generated by backend using template</span>
                        </div>
                        <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/60">
                          The backend will generate a professional PDF certificate and upload it to IPFS automatically.
                        </p>
                      </div>
                      {/* Template selector */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Select Template
                        </label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}{t.owner === "default" ? " (Default)" : " (Custom)"}
                            </option>
                          ))}
                        </select>
                        <a href="/templates" className="mt-1 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400">
                          Manage templates →
                        </a>
                      </div>
                    </div>
                  ) : !uploadedFile ? (
                    <div
                      onClick={handleFileUpload}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && fileInputRef.current) {
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          fileInputRef.current.files = dt.files;
                          fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                      }}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition-colors hover:border-blue-500 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
                    >
                      <Upload className="mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Click to upload or drag and drop</p>
                      <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  ) : (
                    <div className="rounded-none border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-green-100 dark:bg-green-900/30">
                            <File className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                              {isUploading ? " — Uploading to IPFS..." : ipfsPinned ? " — ✓ Pinned on IPFS" : " — ✓ Hash generated (local)"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="flex h-7 w-7 items-center justify-center rounded-sm text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {isUploading && (
                        <div className="mx-4 mb-3">
                          <div className="h-1.5 overflow-hidden rounded-full bg-green-200 dark:bg-green-900">
                            <div className="h-full animate-pulse rounded-full bg-green-500" style={{ width: "60%" }} />
                          </div>
                        </div>
                      )}

                      {ipfsHash && (
                        <div className="border-t border-green-200 px-4 py-2 dark:border-green-800">
                          <HashDisplay hash={ipfsHash} label="IPFS Hash" truncate={false} />
                          {documentHash && (
                            <HashDisplay hash={documentHash} label="Document SHA-256" truncate={false} className="mt-1" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email field — visible in backend mode */}
                {useBackend && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Student Email <span className="normal-case text-gray-400">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full rounded-none border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      If provided, the certificate PDF and QR code will be emailed to the student.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mx-6 mb-4 flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                <button type="submit" disabled={isSubmitting || (!useBackend && isAuthorized === false)} className="flex w-full items-center justify-center gap-2 rounded-none border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Processing{useBackend ? " via Backend..." : " Transaction..."}</>
                  ) : useBackend ? (
                    <><Server className="h-4 w-4" />Issue via Backend Pipeline<ArrowRight className="h-4 w-4" /></>
                  ) : (
                    <><FileCheck className="h-4 w-4" />Sign & Issue Certificate<ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                  <Fuel className="h-3.5 w-3.5 text-orange-500" />
                  TRANSACTION PREVIEW
                </h3>
              </div>
              <div className="space-y-3 p-4 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-gray-900 dark:text-white">{networkInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Gas Price</span>
                  <span className="text-orange-600 dark:text-orange-400">{networkInfo.gasPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Est. Gas</span>
                  <span className="text-gray-900 dark:text-white">~200,000</span>
                </div>
                <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Balance</span>
                    <span className="font-bold text-gray-900 dark:text-white">{wallet.balance} ETH</span>
                  </div>
                </div>
              </div>
            </div>

            {txSteps.length > 0 && (
              <div className="rounded-none border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="font-mono text-xs font-bold text-gray-900 dark:text-white">TRANSACTION STATUS</h3>
                </div>
                <div className="p-4">
                  <TransactionStatus steps={txSteps} />
                </div>
              </div>
            )}

            {showSuccess && successData && (
              <div className="neon-border-green rounded-none bg-white p-4 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">Certificate Issued Successfully!</span>
                </div>
                <div className="mt-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Block</span>
                    <span className="text-gray-900 dark:text-white">#{successData.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Gas Used</span>
                    <span className="text-gray-900 dark:text-white">{successData.gasUsed.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tx Hash</span>
                    <HashDisplay hash={successData.txHash} />
                  </div>
                </div>

                {/* QR Code for instant verification */}
                <div className="mt-4 flex flex-col items-center border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="rounded-sm border-2 border-gray-200 bg-white p-2 dark:border-gray-600">
                    <QRCodeSVG
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?certId=${encodeURIComponent(issuedCertId)}`}
                      size={120}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#111827"
                    />
                  </div>
                  <p className="mt-2 text-center text-[10px] text-gray-500 dark:text-gray-400">
                    Scan to verify this certificate
                  </p>
                  <code className="mt-1 font-mono text-xs text-green-600 dark:text-green-400">{issuedCertId}</code>
                  <Link
                    href={`/verify?certId=${encodeURIComponent(issuedCertId)}`}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <FileCheck className="h-3 w-3" />
                    Verify on-chain →
                  </Link>

                  {/* Backend result extras */}
                  {backendResult?.pdfUrl && (
                    <a
                      href={backendResult.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      <Download className="h-3 w-3" />
                      Download PDF Certificate
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
