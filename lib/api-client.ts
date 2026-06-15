// ============================================================================
// Backend API Client — Connects the Next.js frontend to the Express backend
// ============================================================================
// All calls go to http://localhost:4000/api

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200, 2500];

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return false;
  return err instanceof TypeError;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ── Generic fetcher ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const method = String(options?.method || "GET").toUpperCase();
  const canRetry = RETRYABLE_METHODS.has(method);
  const maxAttempts = canRetry ? RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
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
        const shouldRetry =
          canRetry &&
          RETRYABLE_STATUS_CODES.has(res.status) &&
          attempt < maxAttempts - 1;
        if (shouldRetry) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }

        const contentType = res.headers.get("content-type") || "";
        let data: unknown = null;

        if (contentType.includes("application/json")) {
          data = await res.json().catch(() => null);
        } else {
          const text = await res.text().catch(() => "");
          data = text ? { error: text } : null;
        }

        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `API error ${res.status}`;

        throw new ApiError(res.status, message, data);
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
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const shouldRetry = canRetry && attempt < maxAttempts - 1 && isRetryableNetworkError(err);
      if (shouldRetry) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw err;
    }
  }

  throw new Error("Request failed after retries");
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

export interface AiTemplateMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateAiTemplateInput {
  prompt: string;
  templateName: string;
  institutionName?: string;
  tone?: string;
  colorPalette?: string;
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

export function getWalletAuth(wallet: import("./types").WalletState): WalletAuth | null {
  if (!wallet.connected || !wallet.address || !wallet.signer) return null;
  return {
    address: wallet.address,
    signMessage: (message: string) => wallet.signer!.signMessage(message),
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
  lookup?: "certId" | "documentHash";
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

export interface BackendCertificateRecord {
  certId: string;
  studentName: string;
  studentId?: string | null;
  studentWallet: string;
  degree: string;
  institution: string;
  issueDate: string;
  status: "issued" | "revoked" | "verified" | "pending" | "invalid";
  blockchain?: {
    txHash?: string | null;
    blockNumber?: number | null;
    gasUsed?: number | null;
    issuedAt?: string;
  };
  ipfs?: {
    documentHash?: string | null;
    ipfsHash?: string | null;
    pinned?: boolean;
    gateway?: string | null;
  };
  ipfsHash?: string;
  qr?: {
    saved?: boolean;
    filePath?: string | null;
  };
  email?: {
    sent?: boolean;
    sentAt?: string | null;
    error?: string | null;
  };
  createdAt?: string;
  warning?: string;
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
  options: { templateName?: string; sendEmails?: boolean } | undefined,
  wallet: WalletAuth
): Promise<{
  jobId: string;
  status: string;
  totalRecords: number;
  message?: string;
  createdAt?: string;
  completedAt?: string;
  progress?: JobStatus["progress"];
  summary?: JobStatus["summary"];
  results?: JobStatus["results"];
  error?: string;
}> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch("/api/bulk/process", {
    method: "POST",
    body: JSON.stringify({ jobId, ...options }),
    headers,
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

/** Generate a certificate template with Gemini AI and save it as an institution template. */
export async function generateAiTemplate(
  input: GenerateAiTemplateInput,
  wallet: WalletAuth
): Promise<{
  success: boolean;
  templateId: string;
  owner: string;
  message: string;
  placeholders: string[];
  previewHtml: string | null;
  previewWarning?: string;
}> {
  const authHeaders = await getWalletAuthHeaders(wallet);
  return apiFetch("/api/templates/generate-ai", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(input),
  });
}

/** Save or overwrite an institution-owned HTML template. */
export async function saveTemplateHtml(
  templateId: string,
  html: string,
  wallet: WalletAuth,
  institutionName?: string
): Promise<{
  success: boolean;
  templateId: string;
  owner: string;
  message: string;
  previewHtml: string | null;
  previewWarning?: string;
}> {
  const authHeaders = await getWalletAuthHeaders(wallet);
  return apiFetch(`/api/templates/${encodeURIComponent(templateId)}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ html, institutionName }),
  });
}

/** Improve an institution-owned template with Gemini AI. */
export async function editTemplateWithAi(
  templateId: string,
  prompt: string,
  wallet: WalletAuth,
  institutionName?: string
): Promise<{
  success: boolean;
  templateId: string;
  owner: string;
  message: string;
  placeholders: string[];
  previewHtml: string | null;
  previewWarning?: string;
}> {
  const authHeaders = await getWalletAuthHeaders(wallet);
  return apiFetch(`/api/templates/${encodeURIComponent(templateId)}/edit-ai`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ prompt, institutionName }),
  });
}

/** Delete an institution-owned template. */
export async function deleteTemplate(
  templateId: string,
  wallet: WalletAuth
): Promise<{
  success: boolean;
  templateId: string;
  owner: string;
  message: string;
}> {
  const authHeaders = await getWalletAuthHeaders(wallet);
  return apiFetch(`/api/templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE",
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
  documentMode?: "template" | "upload";
  documentFile?: File;
}, wallet: WalletAuth): Promise<SingleIssueResult> {
  const headers = await getWalletAuthHeaders(wallet);
  const formData = new FormData();
  formData.append("studentName", data.studentName);
  formData.append("studentId", data.studentId);
  formData.append("degree", data.degree);
  formData.append("institution", data.institution);
  formData.append("issueDate", data.issueDate);
  formData.append("documentMode", data.documentMode || "template");
  if (data.email) formData.append("email", data.email);
  if (data.templateName) formData.append("templateName", data.templateName);
  if (data.documentFile) formData.append("document", data.documentFile);

  return apiFetch("/api/certificates/issue", {
    method: "POST",
    body: formData,
    headers,
  });
}

/** Verify certificate via backend */
export async function verifyCertificateViaBackend(
  certId: string
): Promise<VerifyResult> {
  return apiFetch(`/api/certificates/verify/${certId}`);
}

/** Fetch certificate data from backend database (with actual block number) */
export async function getCertificateData(
  certId: string
): Promise<BackendCertificateRecord | null> {
  try {
    return await apiFetch<BackendCertificateRecord>(`/api/certificates/${certId}/data`);
  } catch (err) {
    console.warn(`Failed to fetch certificate data for ${certId}:`, err);
    return null;
  }
}

/** List certificates from backend by wallet or txHash */
export async function listCertificatesFromBackend(params: {
  wallet?: string;
  txHash?: string;
}): Promise<BackendCertificateRecord[]> {
  try {
    const query = new URLSearchParams();
    if (params.wallet) query.set("wallet", params.wallet);
    if (params.txHash) query.set("txHash", params.txHash);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return await apiFetch<BackendCertificateRecord[]>(`/api/certificates${qs}`);
  } catch (err) {
    console.warn("Failed to list certificates from backend:", err);
    return [];
  }
}

/** Get most recent certificates from backend database */
export async function getRecentCertificatesFromBackend(limit: number = 10): Promise<BackendCertificateRecord[]> {
  try {
    return await apiFetch<BackendCertificateRecord[]>(`/api/certificates/recent?limit=${limit}`);
  } catch (err) {
    console.warn("Failed to fetch recent certificates from backend:", err);
    return [];
  }
}

/** Verify an uploaded certificate document by hashing and comparing with on-chain IPFS file */
export async function verifyCertificateDocumentFile(
  certId: string | null | undefined,
  file: File
): Promise<DocumentVerificationResult> {
  const formData = new FormData();
  const normalizedCertId = certId?.trim();
  if (normalizedCertId) formData.append("certId", normalizedCertId);
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

/** Revoke a single certificate (requires wallet auth) */
export async function revokeCertificate(
  certId: string,
  wallet: WalletAuth
): Promise<{ success: boolean; certId: string; txHash: string; blockNumber: number; message: string }> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch(`/api/certificates/${encodeURIComponent(certId)}/revoke`, {
    method: "POST",
    headers,
  });
}

/** Bulk revoke certificates (requires wallet auth, max 50) */
export async function bulkRevokeCertificates(
  certIds: string[],
  wallet: WalletAuth
): Promise<{
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: { certId: string; success: boolean; txHash?: string; error?: string }[];
}> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch("/api/certificates/bulk-revoke", {
    method: "POST",
    headers,
    body: JSON.stringify({ certIds }),
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

export interface InstitutionApplication {
  id: string;
  institutionName: string;
  registrationNumber: string;
  country: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  appliedDate: string;
  authorizedOnChain: boolean;
}

export interface InstitutionOnChainInfo {
  name: string;
  registrationNumber: string;
  country: string;
  isActive: boolean;
  authorizedDate: number;
  totalIssued: number;
  isAuthorized: boolean;
}

/** Get institution info for connected wallet (requires auth headers) */
export async function getMyInstitutionInfo(
  walletAddress: string,
  signature: string,
  message: string
): Promise<{
  walletAddress: string;
  application: InstitutionApplication | null;
  blockchain: InstitutionOnChainInfo | null;
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

export interface AdminCertificateRecent {
  certId: string;
  studentName: string;
  studentId: string | null;
  institution: string;
  degree: string;
  status: "issued" | "revoked";
  createdAt: string;
}

export interface AdminInstitutionVolume {
  institution: string;
  total: number;
  issued: number;
  revoked: number;
}

export interface AdminStats {
  totalApplications: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  totalOnChainInstitutions: number;
  recentApplications: Record<string, unknown>[];
  certificates: {
    total: number;
    issued: number;
    revoked: number;
    issuedThisMonth: number;
    issuedThisWeek: number;
    emailsSent: number;
    emailsFailed: number;
    recent: AdminCertificateRecent[];
    topInstitutions: AdminInstitutionVolume[];
  };
  students: {
    total: number;
  };
  blockchain: {
    totalCertificates: number;
    totalInstitutions: number;
    totalRevocations: number;
  };
}

/** Get admin stats */
export async function adminGetStats(
  auth: { address: string; signature: string; message: string }
): Promise<AdminStats> {
  return apiFetch("/api/admin/stats", {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

// ── Admin: Certificates (platform-wide) ──────────────────────────────────────

export interface AdminCertificateRecord extends BackendCertificateRecord {
  _id?: string;
  studentEmail?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
}

/** List all certificates across all institutions (admin) */
export async function adminListCertificates(
  auth: { address: string; signature: string; message: string },
  params?: { status?: "issued" | "revoked"; institution?: string; search?: string; page?: number; limit?: number }
): Promise<{
  certificates: AdminCertificateRecord[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.institution) query.set("institution", params.institution);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/api/admin/certificates${qs}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** Get full certificate record (admin) */
export async function adminGetCertificateDetails(
  auth: { address: string; signature: string; message: string },
  certId: string
): Promise<{ certificate: AdminCertificateRecord }> {
  return apiFetch(`/api/admin/certificates/${certId}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** Revoke any certificate platform-wide (admin) */
export async function adminRevokeCertificate(
  auth: { address: string; signature: string; message: string },
  certId: string
): Promise<{ success: boolean; certId: string; txHash: string; blockNumber: number; message: string }> {
  return apiFetch(`/api/admin/certificates/${certId}/revoke`, {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

// ── Admin: Students (platform-wide) ──────────────────────────────────────────

export interface AdminStudentSummary {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  institutions: string[];
  totalCertificates: number;
  issuedCount: number;
  revokedCount: number;
  lastIssuedAt: string;
}

export interface AdminStudentDetails {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  institutions: { name: string; count: number }[];
  stats: { total: number; issued: number; revoked: number };
  certificates: AdminCertificateRecord[];
}

/** List unique students aggregated across all certificates (admin) */
export async function adminListStudents(
  auth: { address: string; signature: string; message: string },
  params?: { search?: string; page?: number; limit?: number }
): Promise<{
  students: AdminStudentSummary[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/api/admin/students${qs}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

/** Get full certificate history for a student (admin) */
export async function adminGetStudentDetails(
  auth: { address: string; signature: string; message: string },
  studentId: string
): Promise<AdminStudentDetails> {
  return apiFetch(`/api/admin/students/${studentId}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

export type AdminTransactionType =
  | "certificate_issued"
  | "certificate_revoked"
  | "institution_authorized"
  | "institution_deauthorized";

export interface AdminTransaction {
  type: AdminTransactionType;
  txHash: string;
  blockNumber: number | null;
  timestamp: string;
  certId?: string;
  studentName?: string;
  studentId?: string | null;
  studentWallet?: string;
  institution?: string;
  walletAddress?: string;
  actor?: string | null;
}

/** List all on-chain transactions platform-wide (admin) */
export async function adminListTransactions(
  auth: { address: string; signature: string; message: string },
  params?: { type?: AdminTransactionType; search?: string; page?: number; limit?: number }
): Promise<{
  transactions: AdminTransaction[];
  pagination: { page: number; limit: number; total: number; pages: number };
  counts: Record<AdminTransactionType, number>;
}> {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/api/admin/transactions${qs}`, {
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

/** Sync approved institutions from DB to blockchain (admin) */
export async function adminSyncInstitutionsToBlockchain(auth: {
  address: string;
  signature: string;
  message: string;
}): Promise<{
  success: boolean;
  message: string;
  synced: Array<{ id: string; name: string; wallet: string; txHash: string; blockNumber: number }>;
  failed: Array<{ id: string; name: string; wallet: string; error: string }>;
}> {
  return apiFetch("/api/admin/sync-to-blockchain", {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

export interface BlogAuditLogEntry {
  id: string;
  blogId: string | null;
  blogTitle: string;
  blogSlug: string;
  action: "create" | "update" | "submit_review" | "approve" | "reject" | "delete";
  actorWallet: string;
  actorRole: "author" | "admin" | "system";
  note: string;
  statusBefore: "draft" | "pending_review" | "published" | "rejected" | null;
  statusAfter: "draft" | "pending_review" | "published" | "rejected" | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Blog API ────────────────────────────────────────────────────────────────

export type BlogStatus = "draft" | "pending_review" | "published" | "rejected";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown?: string;
  coverImageUrl: string;
  tags: string[];
  status: BlogStatus;
  readTimeMinutes: number;
  contentHash: string;
  author: {
    wallet: string;
    displayName: string;
  };
  moderation?: {
    reviewNote: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
  };
  chainAnchor: {
    chainId: number | null;
    chainName: string | null;
    blockNumber: number | null;
    blockHash: string | null;
    anchoredAt: string | null;
    anchorError?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string;
  publishedAt: string | null;
  permissions: {
    isOwner: boolean;
    isAdmin: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canReview: boolean;
  };
}

export interface BlogListResponse {
  blogs: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminBlogListResponse extends BlogListResponse {
  summary: {
    pendingReview: number;
    published: number;
    drafts: number;
    rejected: number;
  };
}

export interface BlogInput {
  title: string;
  excerpt?: string;
  contentMarkdown: string;
  coverImageUrl?: string;
  tags?: string[] | string;
  authorDisplayName?: string;
  status?: "draft" | "pending_review";
}

export async function listBlogs(params?: {
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}): Promise<BlogListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.tag) query.set("tag", params.tag);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<BlogListResponse>(`/api/blogs${qs}`);
}

export async function getBlogBySlug(slug: string): Promise<{ blog: BlogPost }> {
  return apiFetch<{ blog: BlogPost }>(`/api/blogs/${encodeURIComponent(slug)}`);
}

export async function listMyBlogs(
  wallet: WalletAuth,
  params?: { status?: BlogStatus; search?: string; page?: number; limit?: number }
): Promise<BlogListResponse> {
  const headers = await getWalletAuthHeaders(wallet);
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<BlogListResponse>(`/api/blogs/my${qs}`, { headers });
}

export async function getMyBlogById(wallet: WalletAuth, blogId: string): Promise<{ blog: BlogPost }> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch<{ blog: BlogPost }>(`/api/blogs/my/${blogId}`, { headers });
}

export async function createBlog(wallet: WalletAuth, payload: BlogInput): Promise<{
  success: boolean;
  message: string;
  blog: BlogPost;
}> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch("/api/blogs", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function updateBlog(
  wallet: WalletAuth,
  blogId: string,
  payload: Partial<BlogInput & { status?: BlogStatus }>
): Promise<{ success: boolean; message: string; blog: BlogPost }> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch(`/api/blogs/${blogId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function deleteBlog(wallet: WalletAuth, blogId: string): Promise<{ success: boolean; message: string }> {
  const headers = await getWalletAuthHeaders(wallet);
  return apiFetch(`/api/blogs/${blogId}`, {
    method: "DELETE",
    headers,
  });
}

export async function listPendingReviewBlogs(
  auth: { address: string; signature: string; message: string },
  params?: { search?: string; page?: number; limit?: number }
): Promise<BlogListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<BlogListResponse>(`/api/blogs/pending-review${qs}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

export async function reviewBlog(
  auth: { address: string; signature: string; message: string },
  blogId: string,
  action: "approve" | "reject",
  note?: string
): Promise<{ success: boolean; message: string; blog: BlogPost }> {
  return apiFetch(`/api/blogs/${blogId}/review`, {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
    body: JSON.stringify({ action, note }),
  });
}

export async function adminListBlogs(
  auth: { address: string; signature: string; message: string },
  params?: { status?: BlogStatus | "all"; search?: string; page?: number; limit?: number }
): Promise<AdminBlogListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<AdminBlogListResponse>(`/api/admin/blogs${qs}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}

export async function adminReviewBlog(
  auth: { address: string; signature: string; message: string },
  blogId: string,
  action: "approve" | "reject",
  note?: string
): Promise<{ success: boolean; message: string; blog: BlogPost }> {
  return apiFetch(`/api/admin/blogs/${blogId}/review`, {
    method: "POST",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
    body: JSON.stringify({ action, note }),
  });
}

export async function adminDeleteBlog(
  auth: { address: string; signature: string; message: string },
  blogId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/admin/blogs/${blogId}`, {
    method: "DELETE",
    headers: adminHeaders(auth.address, auth.signature, auth.message),
    body: JSON.stringify({ reason }),
  });
}

// ── Student Portal API ──────────────────────────────────────────────────────

export interface StudentLoginResult {
  success: boolean;
  token: string;
  student: {
    studentId: string;
    studentName: string;
    institutions: { name: string; count: number }[];
    totalCertificates: number;
  };
}

export interface StudentCertificate {
  certId: string;
  studentName: string;
  studentId: string | null;
  degree: string;
  institution: string;
  issueDate: string;
  status: "issued" | "revoked";
  blockchain: { txHash: string | null; blockNumber: number | null; issuedAt: string | null };
  ipfs: { ipfsHash: string | null; documentHash: string | null; gateway: string | null };
  revokedAt: string | null;
  createdAt: string;
}

export interface StudentProfile {
  studentId: string;
  studentName: string;
  institutions: string[];
  stats: { total: number; issued: number; revoked: number };
}

export interface StudentLookupResult {
  found: true;
  studentId: string;
  studentName: string;
  institutions: { name: string; count: number }[];
  total: number;
}

/** Look up which institutions have issued certificates for a student ID.
 *  Returns only institutions that actually have certs for that ID — used to
 *  populate the institution dropdown and prevent invalid selections. */
export async function lookupStudentById(studentId: string): Promise<StudentLookupResult> {
  return apiFetch<StudentLookupResult>(
    `/api/student/lookup?studentId=${encodeURIComponent(studentId)}`
  );
}

/** Authenticate as a student using student ID */
export async function studentLogin(studentId: string, institutionName?: string): Promise<StudentLoginResult> {
  return apiFetch<StudentLoginResult>("/api/student/login", {
    method: "POST",
    body: JSON.stringify({ studentId, institutionName }),
  });
}

/** List all certificates for the authenticated student */
export async function getStudentCertificates(
  token: string,
  params?: { institution?: string; status?: "issued" | "revoked" }
): Promise<{ certificates: StudentCertificate[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.institution) query.set("institution", params.institution);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch(`/api/student/certificates${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Get authenticated student's profile */
export async function getStudentProfile(token: string): Promise<StudentProfile> {
  return apiFetch<StudentProfile>("/api/student/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminListBlogLogs(
  auth: { address: string; signature: string; message: string },
  params?: { action?: string; actor?: string; blogId?: string; page?: number; limit?: number }
): Promise<{
  logs: BlogAuditLogEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const query = new URLSearchParams();
  if (params?.action) query.set("action", params.action);
  if (params?.actor) query.set("actor", params.actor);
  if (params?.blogId) query.set("blogId", params.blogId);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";

  return apiFetch(`/api/admin/blog-logs${qs}`, {
    headers: adminHeaders(auth.address, auth.signature, auth.message),
  });
}
