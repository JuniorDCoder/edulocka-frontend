// ============================================================================
// Backend API Client — Connects the Next.js frontend to the Express backend
// ============================================================================
// All calls go to http://localhost:4000/api

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
}

// ── Generic fetcher ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {} // Let browser set content-type for FormData
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || `API error ${res.status}`);
  }

  // Handle blob responses (ZIP, PDF)
  const contentType = res.headers.get("content-type") || "";
  if (
    contentType.includes("application/zip") ||
    contentType.includes("application/pdf") ||
    contentType.includes("spreadsheetml")
  ) {
    return res.blob() as unknown as T;
  }

  return res.json();
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface BulkUploadResult {
  jobId: string;
  fileName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  hasErrors: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  preview: BulkRecord[];
  invalidPreview: BulkRecord[];
}

export interface ValidationError {
  field: string;
  message: string;
  row: number;
}

export interface BulkRecord {
  studentName: string;
  studentId: string;
  degree: string;
  institution: string;
  issueDate: string;
  email?: string;
  certId?: string;
  _row?: number;
  _errors?: ValidationError[];
}

export interface JobStatus {
  jobId: string;
  status: "validated" | "processing" | "completed" | "failed";
  fileName: string;
  totalRecords: number;
  createdAt: string;
  completedAt?: string;
  progress: {
    phase: string;
    current: number;
    total: number;
    percent: number;
    succeeded?: number;
    failed?: number;
  } | null;
  summary?: {
    total: number;
    blockchainSuccess: number;
    blockchainFailed: number;
    pdfsGenerated: number;
    qrCodesGenerated: number;
    emailsSent: number;
    emailsFailed: number;
  };
  results?: JobResult[];
  error?: string;
}

export interface JobResult {
  row: number;
  certId: string;
  studentName: string;
  studentId: string;
  degree: string;
  institution: string;
  issueDate: string;
  email: string | null;
  blockchain: {
    status: string;
    txHash: string | null;
    blockNumber: number | null;
    gasUsed: number | null;
    error: string | null;
  };
  pdf: { status: string; fileName: string | null; filePath: string | null };
  ipfs: { hash: string | null; pinned: boolean; gateway: string | null };
  qr: { status: string; fileName: string | null };
}

export interface TemplateInfo {
  id: string;
  name: string;
  path: string;
  owner: string; // "default" or wallet address
}

// ── Wallet auth header helper ───────────────────────────────────────────────

export interface WalletAuth {
  address: string;
  signMessage: (message: string) => Promise<string>;
}

async function getWalletAuthHeaders(wallet: WalletAuth): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `Edulocka Auth: ${timestamp}`;
  const signature = await wallet.signMessage(message);
  return {
    "x-wallet-address": wallet.address,
    "x-wallet-signature": signature,
    "x-wallet-message": message,
  };
}

export interface SingleIssueResult {
  success: boolean;
  certId: string;
  blockchain: { txHash: string; blockNumber: number; gasUsed: number };
  ipfs: { hash: string; documentHash?: string; pinned: boolean; gateway: string | null };
  pdf: { fileName: string; url: string };
  qr: { fileName: string; url: string; dataUrl: string };
  verifyUrl: string;
  email: { sent: boolean; messageId?: string; error?: string } | null;
}

export interface VerifyResult {
  exists: boolean;
  isValid?: boolean;
  studentName?: string;
  studentId?: string;
  degree?: string;
  institution?: string;
  issueDate?: number;
  ipfsHash?: string;
  issuer?: string;
  verifyUrl?: string;
  qrDataUrl?: string;
  message?: string;
}

export interface DocumentVerificationResult {
  exists: boolean;
  certId: string;
  certificate: {
    isValid: boolean;
    studentName: string;
    degree: string;
    institution: string;
    issueDate: number;
    issuer: string;
    ipfsHash: string;
  };
  uploaded: {
    fileName: string;
    mimeType: string;
    size: number;
    sha256: string;
  };
  ipfs: {
    hash: string;
    gatewayUrl: string;
    size: number;
    sha256: string;
  };
  match: {
    sha256: boolean;
    exactBytes: boolean;
  };
  verified: boolean;
  verifyUrl: string;
}

// ── Bulk Issuance ───────────────────────────────────────────────────────────

/** Upload CSV/XLSX for validation and preview */
export async function bulkUploadCSV(file: File): Promise<BulkUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<BulkUploadResult>("/api/bulk/upload", {
    method: "POST",
    body: formData,
  });
}

/** Start processing a validated batch */
export async function processBatch(
  jobId: string,
  options?: { templateName?: string; sendEmails?: boolean }
): Promise<{ jobId: string; status: string; totalRecords: number; message: string }> {
  return apiFetch("/api/bulk/process", {
    method: "POST",
    body: JSON.stringify({ jobId, ...options }),
  });
}

/** Poll job status */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/api/bulk/status/${jobId}`);
}

/** Download batch ZIP (PDFs + QR codes) */
export async function downloadBatch(jobId: string): Promise<Blob> {
  return apiFetch<Blob>(`/api/bulk/download/${jobId}`);
}

/** Download Excel report */
export async function downloadReport(jobId: string): Promise<Blob> {
  return apiFetch<Blob>(`/api/reports/${jobId}`);
}

// ── Templates (institution-scoped) ──────────────────────────────────────────

/** List available certificate templates. Pass wallet address for institution-specific templates (no signing needed). */
export async function listTemplates(walletAddress?: string): Promise<{ templates: TemplateInfo[] }> {
  const headers: Record<string, string> = {};
  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress;
  }
  return apiFetch("/api/templates", { headers });
}

/** Upload a custom HTML certificate template (requires wallet auth) */
export async function uploadTemplate(file: File, wallet: WalletAuth): Promise<{
  success: boolean;
  templateId: string;
  owner: string;
  message: string;
  placeholders: string[];
}> {
  const authHeaders = await getWalletAuthHeaders(wallet);
  const formData = new FormData();
  formData.append("template", file);
  return apiFetch("/api/templates/upload", {
    method: "POST",
    body: formData,
    headers: authHeaders,
  });
}

/** Preview template with sample data. Pass wallet for institution templates. */
export async function previewTemplate(
  templateName: string,
  sampleData?: Record<string, string>,
  wallet?: WalletAuth
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (wallet) {
    Object.assign(headers, await getWalletAuthHeaders(wallet));
  }
  const res = await fetch(buildApiUrl("/api/templates/preview"), {
    method: "POST",
    headers,
    body: JSON.stringify({ templateName, sampleData }),
  });
  return res.text();
}

// ── Single Certificate ──────────────────────────────────────────────────────

/** Issue a single certificate via backend (full pipeline: PDF + QR + IPFS + blockchain + email) */
export async function issueSingleViaBackend(data: {
  studentName: string;
  studentId: string;
  degree: string;
  institution: string;
  issueDate: string;
  email?: string;
  templateName?: string;
}): Promise<SingleIssueResult> {
  return apiFetch("/api/certificates/issue", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Verify certificate via backend */
export async function verifyCertificateViaBackend(
  certId: string
): Promise<VerifyResult> {
  return apiFetch(`/api/certificates/verify/${certId}`);
}

/** Verify an uploaded certificate document by hashing and comparing with on-chain IPFS file */
export async function verifyCertificateDocumentFile(
  certId: string,
  file: File
): Promise<DocumentVerificationResult> {
  const formData = new FormData();
  formData.append("certId", certId);
  formData.append("document", file);
  return apiFetch<DocumentVerificationResult>("/api/certificates/verify-file", {
    method: "POST",
    body: formData,
  });
}

/** Get QR code data URL for a cert */
export async function getQRCodeDataUrl(
  certId: string
): Promise<{ certId: string; dataUrl: string; verifyUrl: string }> {
  return apiFetch(`/api/qr/${certId}?format=dataurl`);
}

/** Generate/download PDF for a certificate */
export function getCertificatePdfUrl(certId: string, template?: string): string {
  const params = template ? `?template=${template}` : "";
  return buildApiUrl(`/api/certificates/${certId}/pdf${params}`);
}

/** Get generated file URL */
export function getOutputUrl(path: string): string {
  return buildApiUrl(path);
}

/** Send certificate email */
export async function sendCertificateEmail(data: {
  to: string;
  certId: string;
  studentName: string;
  degree: string;
  institution: string;
  issueDate: string;
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  return apiFetch("/api/email/send", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Bulk export QR codes as ZIP */
export async function bulkExportQR(certIds: string[]): Promise<Blob> {
  return apiFetch<Blob>("/api/qr/bulk-export", {
    method: "POST",
    body: JSON.stringify({ certIds }),
  });
}

/** Health check */
export async function checkBackendHealth(): Promise<{
  status: string;
  timestamp: string;
}> {
  return apiFetch("/health");
}

// ── Institution Application ─────────────────────────────────────────────────

/** Submit an institution application */
export async function submitInstitutionApplication(data: {
  institutionName: string;
  registrationNumber: string;
  country: string;
  walletAddress: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  description?: string;
  authorizedPersonName: string;
  authorizedPersonTitle?: string;
  physicalAddress?: string;
  documents?: {
    registrationCert?: File;
    accreditationProof?: File;
    letterOfIntent?: File;
    idDocument?: File;
  };
}): Promise<{ success: boolean; applicationId: string; message: string }> {
  const formData = new FormData();
  formData.append("institutionName", data.institutionName);
  formData.append("registrationNumber", data.registrationNumber);
  formData.append("country", data.country);
  formData.append("walletAddress", data.walletAddress);
  formData.append("contactEmail", data.contactEmail);
  if (data.contactPhone) formData.append("contactPhone", data.contactPhone);
  if (data.website) formData.append("website", data.website);
  if (data.description) formData.append("description", data.description);
  formData.append("authorizedPersonName", data.authorizedPersonName);
  if (data.authorizedPersonTitle) formData.append("authorizedPersonTitle", data.authorizedPersonTitle);
  if (data.physicalAddress) formData.append("physicalAddress", data.physicalAddress);

  if (data.documents) {
    if (data.documents.registrationCert) formData.append("registrationCert", data.documents.registrationCert);
    if (data.documents.accreditationProof) formData.append("accreditationProof", data.documents.accreditationProof);
    if (data.documents.letterOfIntent) formData.append("letterOfIntent", data.documents.letterOfIntent);
    if (data.documents.idDocument) formData.append("idDocument", data.documents.idDocument);
  }

  return apiFetch("/api/institution/apply", {
    method: "POST",
    body: formData,
  });
}

/** Check application status by ID */
export async function getApplicationStatus(
  applicationId: string
): Promise<{
  status: string;
  institutionName: string;
  walletAddress: string;
  authorizedOnChain: boolean;
  blockchainTxHash: string | null;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}> {
  return apiFetch(`/api/institution/status/${applicationId}`);
}

/** Check if a wallet address is authorized */
export async function checkAuthorizationStatus(
  walletAddress: string
): Promise<{
  address: string;
  isAuthorized: boolean;
  onChain: boolean;
  application: { status: string; applicationId: string } | null;
}> {
  return apiFetch(`/api/institution/check/${walletAddress}`);
}

/** Get institution info for connected wallet (requires auth headers) */
export async function getMyInstitutionInfo(
  walletAddress: string,
  signature: string,
  message: string
): Promise<{
  application: Record<string, unknown> | null;
  onChainInfo: Record<string, unknown> | null;
  isAuthorized: boolean;
}> {
  return apiFetch("/api/institution/my-info", {
    headers: {
      "x-wallet-address": walletAddress,
      "x-wallet-signature": signature,
      "x-wallet-message": message,
    },
  });
}

// ── Admin API ───────────────────────────────────────────────────────────────

function adminHeaders(address: string, signature: string, message: string): Record<string, string> {
  return {
    "x-wallet-address": address,
    "x-wallet-signature": signature,
    "x-wallet-message": message,
  };
}

/** List all applications (admin) */
export async function adminListApplications(
  auth: { address: string; signature: string; message: string },
  params?: { status?: string; search?: string; page?: number; limit?: number }
): Promise<{
  applications: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/api/admin/applications${qs}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** Get application details (admin) */
export async function adminGetApplication(
  auth: { address: string; signature: string; message: string },
  applicationId: string
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/admin/applications/${applicationId}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** Approve application (admin) */
export async function adminApproveApplication(
  auth: { address: string; signature: string; message: string },
  applicationId: string,
  notes?: string
): Promise<{ success: boolean; txHash: string; message: string }> {
  return apiFetch(`/api/admin/approve/${applicationId}`, {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
    body: JSON.stringify({ notes }),
  });
}

/** Reject application (admin) */
export async function adminRejectApplication(
  auth: { address: string; signature: string; message: string },
  applicationId: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/admin/reject/${applicationId}`, {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
    body: JSON.stringify({ reason, notes }),
  });
}

/** Get admin stats */
export async function adminGetStats(
  auth: { address: string; signature: string; message: string }
): Promise<{
  totalApplications: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  totalOnChainInstitutions: number;
  recentApplications: Record<string, unknown>[];
}> {
  return apiFetch("/api/admin/stats", {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** List authorized institutions (admin) */
export async function adminListInstitutions(
  auth: { address: string; signature: string; message: string }
): Promise<{ institutions: Record<string, unknown>[] }> {
  return apiFetch("/api/admin/institutions", {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** Deauthorize an institution (admin) */
export async function adminDeauthorizeInstitution(
  auth: { address: string; signature: string; message: string },
  walletAddress: string,
  reason?: string
): Promise<{ success: boolean; txHash: string; message: string }> {
  return apiFetch(`/api/admin/deauthorize/${walletAddress}`, {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
    body: JSON.stringify({ reason }),
  });
}
