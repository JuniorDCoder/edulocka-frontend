// ============================================================================
// Contract Interaction Library — All blockchain read/write operations
// ============================================================================

import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL, TARGET_CHAIN_ID } from "./contract-config";
import { Certificate } from "./types";
import type { InstitutionInfo } from "./types";

// ── Provider / Signer helpers ──────────────────────────────────────────────

// Singleton provider — reuse one connection instead of creating a new one per call
let _cachedProvider: ethers.JsonRpcProvider | null = null;

const RATE_LIMIT_RETRY_DELAYS_MS = [400, 1000, 1800] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitedError(err: unknown): boolean {
  if (!err) return false;

  const maybeErr = err as {
    code?: number | string;
    message?: string;
    info?: { error?: { code?: number | string; message?: string } };
  };

  const message =
    maybeErr.message?.toLowerCase() ??
    maybeErr.info?.error?.message?.toLowerCase() ??
    "";

  const code = String(maybeErr.code ?? maybeErr.info?.error?.code ?? "");

  return (
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("-32005") ||
    code === "429" ||
    code === "-32005"
  );
}

async function withRpcRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const canRetry = attempt < RATE_LIMIT_RETRY_DELAYS_MS.length && isRateLimitedError(err);
      if (!canRetry) throw err;
      await sleep(RATE_LIMIT_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error("RPC retry exhausted");
}

/** Get a read-only provider (for view functions — no wallet needed) */
export function getReadProvider(): ethers.JsonRpcProvider {
  if (!_cachedProvider) {
    _cachedProvider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
      staticNetwork: true,       // Don't call eth_chainId on every request
      // Keep requests unbatched so a single throttled RPC call doesn't break the whole batch.
      batchMaxCount: 1,
    });
  }
  return _cachedProvider;
}

/** Get a BrowserProvider from MetaMask (for write functions — needs wallet) */
export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
}

/** Get a read-only contract instance */
export function getReadContract(): ethers.Contract {
  const provider = getReadProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/** Get a writable contract instance (connected to user's wallet) */
export async function getWriteContract(): Promise<ethers.Contract> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error("No wallet detected. Please install MetaMask.");
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// ── Read Functions (free — no gas) ─────────────────────────────────────────

/** Get total number of certificates issued */
export async function getTotalCertificates(): Promise<number> {
  const contract = getReadContract();
  const total = await withRpcRateLimitRetry(() => contract.getTotalCertificates());
  return Number(total);
}

/** Get total number of authorized institutions */
export async function getTotalInstitutions(): Promise<number> {
  const contract = getReadContract();
  const total = await withRpcRateLimitRetry(() => contract.totalInstitutions());
  return Number(total);
}

/** Get total number of revoked certificates */
export async function getTotalRevocations(): Promise<number> {
  const contract = getReadContract();
  const total = await withRpcRateLimitRetry(() => contract.totalRevocations());
  return Number(total);
}

/** Check if an address is an authorized institution */
export async function isAuthorizedInstitution(address: string): Promise<boolean> {
  const contract = getReadContract();
  return await contract.isAuthorizedInstitution(address);
}

/** Check if a certificate exists */
export async function certificateExists(certId: string): Promise<boolean> {
  const contract = getReadContract();
  return await contract.certificateExistsCheck(certId);
}

/** Get contract owner address */
export async function getContractOwner(): Promise<string> {
  const contract = getReadContract();
  return await contract.owner();
}

/** Get a certificate by ID — returns our frontend Certificate type */
export async function getCertificateById(certId: string): Promise<Certificate | null> {
  try {
    const contract = getReadContract();
    const cert = await contract.getCertificate(certId);

    // Find the tx that issued this cert by querying events
    const filter = contract.filters.CertificateIssued(certId);
    const events = await contract.queryFilter(filter);
    const event = events[0];

    let txHash = "";
    let blockNumber = 0;
    let gasUsed = 0;

    if (event) {
      txHash = event.transactionHash;
      blockNumber = event.blockNumber;
      const receipt = await event.getTransactionReceipt();
      if (receipt) {
        gasUsed = Number(receipt.gasUsed);
      }
    }

    return {
      certId,
      txHash,
      blockNumber,
      studentName: cert.studentName,
      studentWallet: cert.issuer,
      degree: cert.degree,
      institution: cert.institution,
      issueDate: new Date(Number(cert.issueDate) * 1000).toISOString().split("T")[0],
      ipfsHash: cert.ipfsHash,
      status: cert.isValid ? "verified" : "invalid",
      gasUsed,
      networkFee: gasUsed > 0 ? `${(gasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
    };
  } catch {
    return null;
  }
}

/** Find a certificate by its transaction hash */
export async function getCertificateByTxHash(txHash: string): Promise<Certificate | null> {
  try {
    const provider = getReadProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) return null;

    const contract = getReadContract();
    const issuedFilter = contract.filters.CertificateIssued();
    const events = await contract.queryFilter(issuedFilter, receipt.blockNumber, receipt.blockNumber);

    // Find the event in this specific tx
    const matchingEvent = events.find((e) => e.transactionHash.toLowerCase() === txHash.toLowerCase());
    if (!matchingEvent) return null;

    // We can't decode the indexed string certId from the event topic,
    // so iterate stored cert IDs and match by tx hash
    const count = Number(await contract.getAllCertificateIdsCount());
    for (let i = 0; i < count; i++) {
      const certId: string = await contract.getCertificateIdByIndex(i);
      const filter = contract.filters.CertificateIssued(certId);
      const certEvents = await contract.queryFilter(filter);
      if (certEvents.length > 0 && certEvents[0].transactionHash.toLowerCase() === txHash.toLowerCase()) {
        return await getCertificateById(certId);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Find all certificates issued by a wallet address */
export async function getCertificatesByWallet(walletAddress: string): Promise<Certificate[]> {
  try {
    const contract = getReadContract();
    const count = Number(await contract.getAllCertificateIdsCount());
    const results: Certificate[] = [];

    for (let i = 0; i < count; i++) {
      const certId: string = await contract.getCertificateIdByIndex(i);
      const cert = await contract.getCertificate(certId);
      if (cert.issuer.toLowerCase() === walletAddress.toLowerCase()) {
        const fullCert = await getCertificateById(certId);
        if (fullCert) results.push(fullCert);
      }
    }
    return results;
  } catch {
    return [];
  }
}

/** Verify a certificate — quick check returning validity + basic info */
export async function verifyCertificateOnChain(certId: string): Promise<{
  isValid: boolean;
  studentName: string;
  degree: string;
  institution: string;
  issueDate: number;
  issuer: string;
} | null> {
  try {
    const contract = getReadContract();
    const result = await contract.verifyCertificate(certId);
    return {
      isValid: result.isValid,
      studentName: result.studentName,
      degree: result.degree,
      institution: result.institution,
      issueDate: Number(result.issueDate),
      issuer: result.issuer,
    };
  } catch {
    return null;
  }
}

/** Get all certificates from the chain */
export async function getAllCertificates(): Promise<Certificate[]> {
  try {
    const contract = getReadContract();
    const count = Number(await contract.getAllCertificateIdsCount());
    const certificates: Certificate[] = [];

    for (let i = 0; i < count; i++) {
      const certId = await contract.getCertificateIdByIndex(i);
      const cert = await getCertificateById(certId);
      if (cert) certificates.push(cert);
    }

    return certificates;
  } catch {
    return [];
  }
}

// ── Cached network info (avoids repeated RPC calls) ─────────────────────────
let _networkInfoCache: {
  data: Awaited<ReturnType<typeof _fetchNetworkInfo>>;
  timestamp: number;
} | null = null;
const NETWORK_CACHE_TTL = 30_000; // 30 seconds

async function _fetchNetworkInfo() {
  const provider = getReadProvider();
  const [block, feeData] = await Promise.all([
    withRpcRateLimitRetry(() => provider.getBlockNumber()),
    withRpcRateLimitRetry(() => provider.getFeeData()),
  ]);
  const gasPrice = feeData.gasPrice
    ? `${(Number(feeData.gasPrice) / 1e9).toFixed(1)} Gwei`
    : "N/A";

  return {
    name: TARGET_CHAIN_ID === 31337
      ? "Hardhat Local"
      : TARGET_CHAIN_ID === 11155111
        ? "Sepolia Testnet"
        : `Chain ${TARGET_CHAIN_ID}`,
    chainId: TARGET_CHAIN_ID,
    gasPrice,
    blockNumber: block,
    isTestnet: true,
  };
}

/** Get network info from the provider (cached for 30s) */
export async function getNetworkInfo() {
  try {
    const now = Date.now();
    if (_networkInfoCache && now - _networkInfoCache.timestamp < NETWORK_CACHE_TTL) {
      return _networkInfoCache.data;
    }
    const data = await _fetchNetworkInfo();
    _networkInfoCache = { data, timestamp: now };
    return data;
  } catch {
    return {
      name: "Disconnected",
      chainId: 0,
      gasPrice: "N/A",
      blockNumber: 0,
      isTestnet: true,
    };
  }
}

/** Get recent CertificateIssued events */
export async function getRecentActivity(limit: number = 5) {
  try {
    const contract = getReadContract();
    const count = Number(await contract.getAllCertificateIdsCount());

    if (count === 0) return [];

    type ActivityItem = {
      type: "issued" | "revoked";
      certId: string;
      institution: string;
      timestamp: string;
      blockNumber: number;
    };

    const activities: ActivityItem[] = [];
    // Walk backwards from the latest certificate (most recent first)
    const start = Math.max(0, count - limit);

    for (let i = count - 1; i >= start; i--) {
      const certId: string = await contract.getCertificateIdByIndex(i);
      const cert = await contract.getCertificate(certId);

      // Get the issuance event for this specific cert
      const filter = contract.filters.CertificateIssued(certId);
      const events = await contract.queryFilter(filter);
      const event = events[0];

      let blockNumber = 0;
      let timestamp = "Unknown";

      if (event) {
        blockNumber = event.blockNumber;
        const block = await event.getBlock();
        if (block) timestamp = formatTimeAgo(block.timestamp);
      }

      activities.push({
        type: cert.isValid ? "issued" : "revoked",
        certId: String(certId),
        institution: String(cert.institution),
        timestamp,
        blockNumber,
      });
    }

    return activities;
  } catch {
    return [];
  }
}

// ── Write Functions (cost gas — need wallet signature) ─────────────────────

/** Issue a new certificate on-chain */
export async function issueCertificate(params: {
  certificateId: string;
  studentName: string;
  studentId: string;
  degree: string;
  institution: string;
  issueDate: number; // unix timestamp
  ipfsHash: string;
}): Promise<{ tx: ethers.TransactionResponse; receipt: ethers.TransactionReceipt }> {
  const contract = await getWriteContract();
  const tx = await contract.issueCertificate(
    params.certificateId,
    params.studentName,
    params.studentId,
    params.degree,
    params.institution,
    params.issueDate,
    params.ipfsHash
  );
  const receipt = await tx.wait();
  return { tx, receipt };
}

/** Revoke a certificate on-chain */
export async function revokeCertificate(
  certId: string
): Promise<{ tx: ethers.TransactionResponse; receipt: ethers.TransactionReceipt }> {
  const contract = await getWriteContract();
  const tx = await contract.revokeCertificate(certId);
  const receipt = await tx.wait();
  return { tx, receipt };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique certificate ID: CERT-{YEAR}-{sequential from chain count + random suffix} */
export async function generateCertificateId(): Promise<string> {
  try {
    const total = await getTotalCertificates();
    const year = new Date().getFullYear();
    const seq = String(total + 1).padStart(3, "0");
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CERT-${year}-${seq}-${rand}`;
  } catch {
    // Fallback if chain is unreachable
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${year}-${rand}`;
  }
}

/** Upload a file to IPFS via our API route */
export async function uploadToIPFS(file: File): Promise<{
  ipfsHash: string;
  documentHash?: string;
  pinned: boolean;
  gateway?: string;
  message?: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Upload failed");
  }

  return response.json();
}

function formatTimeAgo(unixTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixTimestamp;

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Institution Functions ──────────────────────────────────────────────────

/** Get institution info from the blockchain */
export async function getInstitutionInfo(address: string): Promise<InstitutionInfo | null> {
  try {
    const contract = getReadContract();
    const inst = await contract.getInstitution(address);
    const isAuth = await contract.isAuthorizedInstitution(address);

    // If name is empty, institution doesn't exist on-chain
    if (!inst.name) return null;

    return {
      address,
      name: inst.name,
      registrationNumber: inst.registrationNumber,
      country: inst.country,
      isActive: inst.isActive,
      isAuthorized: isAuth,
      authorizedDate: Number(inst.authorizedDate),
      totalIssued: Number(inst.totalIssued),
    };
  } catch {
    return null;
  }
}

/** Get all institutions from the blockchain */
export async function getAllInstitutions(): Promise<InstitutionInfo[]> {
  try {
    const contract = getReadContract();
    const count = Number(await contract.getAllInstitutionCount());
    const institutions: InstitutionInfo[] = [];

    for (let i = 0; i < count; i++) {
      const addr: string = await contract.getInstitutionAddressByIndex(i);
      const info = await getInstitutionInfo(addr);
      if (info) institutions.push(info);
    }

    return institutions;
  } catch {
    return [];
  }
}
