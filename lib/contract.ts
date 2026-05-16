// ============================================================================
// Contract Interaction Library — All blockchain read/write operations
// ============================================================================

import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL, TARGET_CHAIN_ID, FALLBACK_RPCS } from "./contract-config";
import { Certificate } from "./types";
import type { InstitutionInfo } from "./types";
import { getCertificateData, listCertificatesFromBackend, getRecentCertificatesFromBackend } from "./api-client";

// ── Provider / Signer helpers ──────────────────────────────────────────────

// Singleton provider — reuse one connection instead of creating a new one per call
let _cachedProvider: ethers.JsonRpcProvider | null = null;
let _triedFallbacks = false;

const RATE_LIMIT_RETRY_DELAYS_MS = [400, 1000, 1800] as const;
const RECENT_CERTIFICATES_CACHE_TTL = 30_000;

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

  // Log RPC errors for debugging
  if (code === "-32600" || code === "-32000" || code === "-32002" || code === "-32001") {
    console.warn(
      `[RPC Error ${code}] ${message || maybeErr.message || "Unknown error"}`,
      maybeErr
    );
  }

  return (
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("-32005") ||
    message.includes("-32000") ||
    message.includes("-32002") ||
    message.includes("-32001") ||
    code === "429" ||
    code === "-32005" ||
    code === "-32000" ||
    code === "-32002" ||
    code === "-32001"
  );
}

async function withRpcRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const canRetry = attempt < RATE_LIMIT_RETRY_DELAYS_MS.length && isRateLimitedError(err);
      if (!canRetry) {
        console.error(
          `[RPC Non-Retryable Error] Attempt ${attempt + 1}:`,
          (err as any)?.code ?? (err as any)?.message ?? String(err)
        );
        throw err;
      }
      console.warn(
        `[RPC Rate Limited] Attempt ${attempt + 1}, retrying in ${RATE_LIMIT_RETRY_DELAYS_MS[attempt]}ms...`
      );
      await sleep(RATE_LIMIT_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error("RPC retry exhausted");
}

type RecentCertificatesCacheEntry = {
  data: Certificate[];
  timestamp: number;
};

const _recentCertificatesCache = new Map<number, RecentCertificatesCacheEntry>();
const _recentCertificatesInFlight = new Map<number, Promise<Certificate[]>>();

/** Get a read-only provider (for view functions — no wallet needed) */
export function getReadProvider(): ethers.JsonRpcProvider {
  if (!_cachedProvider) {
    _cachedProvider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
      staticNetwork: true,       // Don't call eth_chainId on every request
      // Keep requests unbatched so a single throttled RPC call doesn't break the whole batch.
      batchMaxCount: 1,
      pollingInterval: 4000,     // Reduce polling frequency to avoid RPC spam
    });
    console.log(`[Contract] Created RPC provider for ${RPC_URL}`);
  }
  return _cachedProvider;
}

/** Attempt to fall back to a different RPC URL if primary is rate limited */
export async function tryFallbackProvider(): Promise<ethers.JsonRpcProvider | null> {
  if (_triedFallbacks || FALLBACK_RPCS.length === 0) return null;
  
  _triedFallbacks = true;
  
  for (const fallbackUrl of FALLBACK_RPCS) {
    try {
      console.log(`[Contract] Trying fallback RPC: ${fallbackUrl}`);
      const provider = new ethers.JsonRpcProvider(fallbackUrl, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
        pollingInterval: 4000,
      });
      
      // Quick test to verify the provider works
      await provider.getBlockNumber();
      
      _cachedProvider = provider;
      console.log(`[Contract] Fallback RPC ${fallbackUrl} is working`);
      return provider;
    } catch (err) {
      console.warn(`[Contract] Fallback RPC ${fallbackUrl} failed:`, (err as any)?.message);
      continue;
    }
  }
  
  return null;
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
  return await withRpcRateLimitRetry(() => contract.isAuthorizedInstitution(address));
}

/** Check if a certificate exists */
export async function certificateExists(certId: string): Promise<boolean> {
  const contract = getReadContract();
  return await withRpcRateLimitRetry(() => contract.certificateExistsCheck(certId));
}

/** Get contract owner address */
export async function getContractOwner(): Promise<string> {
  const contract = getReadContract();
  return await withRpcRateLimitRetry(() => contract.owner());
}

/** Get a certificate by ID — returns our frontend Certificate type */
export async function getCertificateById(certId: string): Promise<Certificate | null> {
  // Find the tx that issued this cert by querying events with block range
  // (Alchemy free tier limit: 10 block range)
  let foundTxHash = "";
  let foundBlockNumber = 0;
  let foundGasUsed = 0;

  try {
    const backendData = await getCertificateData(certId);
    if (backendData && backendData.blockchain) {
      foundTxHash = backendData.blockchain.txHash || "";
      foundBlockNumber = backendData.blockchain.blockNumber || 0;
      foundGasUsed = backendData.blockchain.gasUsed || 0;
        
      if (foundBlockNumber > 0) {
        console.log(`[getCertificateById] Using backend data for ${certId}, block ${foundBlockNumber}`);
        return {
          certId: backendData.certId,
          txHash: foundTxHash,
          blockNumber: foundBlockNumber,
          studentName: backendData.studentName,
          studentWallet: backendData.studentWallet,
          degree: backendData.degree,
          institution: backendData.institution,
          issueDate: backendData.issueDate,
          ipfsHash: backendData.ipfs?.ipfsHash || "",
          status: backendData.status === "issued" ? "verified" : 
                  backendData.status === "revoked" ? "invalid" : 
                  backendData.status || "verified",
          gasUsed: foundGasUsed,
          networkFee: foundGasUsed ? `${(foundGasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
        };
      }
      console.log(`[getCertificateById] Backend data for ${certId} has txHash ${foundTxHash} but blockNumber is 0. Will attempt fallback.`);
    }
  } catch (backendErr) {
    console.info(`[getCertificateById] Backend API not available, falling back to contract lookup:`, (backendErr as any)?.message);
  }

  // STRATEGY 2: Fallback to contract + event lookup
  const contract = getReadContract();
  const provider = getReadProvider();
  const cert = await contract.getCertificate(certId);

  try {
    const filter = contract.filters.CertificateIssued(certId);
    let events: any[] = [];
      
    // Try querying recent blocks first
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100);
    const toBlock = currentBlock;
      
    events = await contract.queryFilter(filter, fromBlock, toBlock);

    // If not found in recent blocks, try older blocks
    if (events.length === 0 && currentBlock > 100) {
      const olderFromBlock = Math.max(0, currentBlock - 2000);
      const olderToBlock = Math.max(0, currentBlock - 100);
      events = await contract.queryFilter(filter, olderFromBlock, olderToBlock);
    }

    const event = (events as any[])[0];
    if (event) {
      foundTxHash = event.transactionHash;
      foundBlockNumber = event.blockNumber;
      const receipt = await event.getTransactionReceipt();
      if (receipt) {
        foundGasUsed = Number(receipt.gasUsed);
      }
    } else if (foundTxHash && foundTxHash !== "unknown" && foundTxHash.startsWith("0x")) {
      // STRATEGY 2.5: If we have a txHash but no event, try getting the block number from the receipt directly
      console.log(`[getCertificateById] Event not found but txHash ${foundTxHash} is known, fetching receipt...`);
      try {
        const receipt = await provider.getTransactionReceipt(foundTxHash);
        if (receipt) {
          foundBlockNumber = receipt.blockNumber;
          foundGasUsed = Number(receipt.gasUsed);
        }
      } catch (receiptErr) {
        console.warn(`[getCertificateById] Failed to fetch receipt for ${foundTxHash}:`, (receiptErr as any)?.message);
      }
    }
  } catch (eventErr) {
    console.warn(`[getCertificateById] Failed to fetch events for ${certId}:`, (eventErr as any)?.message);
      
    // Fallback for Strategy 2: If event query fails but we have some info
    if (foundTxHash && foundTxHash !== "unknown" && foundTxHash.startsWith("0x") && foundBlockNumber === 0) {
      try {
        const receipt = await provider.getTransactionReceipt(foundTxHash);
        if (receipt) {
          foundBlockNumber = receipt.blockNumber;
          foundGasUsed = Number(receipt.gasUsed);
        }
      } catch (receiptErr) {
        // ignore
      }
    }
  }

  return {
    certId,
    txHash: foundTxHash,
    blockNumber: foundBlockNumber,
    studentName: cert.studentName,
    studentWallet: cert.issuer,
    degree: cert.degree,
    institution: cert.institution,
    issueDate: new Date(Number(cert.issueDate) * 1000).toISOString().split("T")[0],
    ipfsHash: cert.ipfsHash,
    status: cert.isValid ? "verified" : "invalid",
    gasUsed: foundGasUsed,
    networkFee: foundGasUsed > 0 ? `${(foundGasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
  };
}

/** Find a certificate by its transaction hash */
export async function getCertificateByTxHash(txHash: string): Promise<Certificate | null> {
  try {
    // STRATEGY 1: Try backend first
    try {
      const backendResults = await listCertificatesFromBackend({ txHash });
      if (backendResults && backendResults.length > 0) {
        const backendData = backendResults[0];
        console.log(`[getCertificateByTxHash] Found cert ${backendData.certId} in backend for tx ${txHash}`);
        return {
          certId: backendData.certId,
          txHash: backendData.blockchain?.txHash || txHash,
          blockNumber: backendData.blockchain?.blockNumber || 0,
          studentName: backendData.studentName,
          studentWallet: backendData.studentWallet,
          degree: backendData.degree,
          institution: backendData.institution,
          issueDate: backendData.issueDate,
          ipfsHash: backendData.ipfs?.ipfsHash || "",
          status: backendData.status === "issued" ? "verified" : 
                  backendData.status === "revoked" ? "invalid" : 
                  backendData.status || "verified",
          gasUsed: backendData.blockchain?.gasUsed || 0,
          networkFee: backendData.blockchain?.gasUsed ? `${(backendData.blockchain.gasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
        };
      }
    } catch (backendErr) {
      console.warn(`[getCertificateByTxHash] Backend lookup failed:`, (backendErr as any)?.message);
    }

    // STRATEGY 2: Smart Contract Event Filtering (Targeted)
    const provider = getReadProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return null;

    // Check if the transaction was to our contract
    if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) return null;

    const contract = getReadContract();
    const issuedFilter = contract.filters.CertificateIssued();
    
    // Query events only for this specific block
    const events = await contract.queryFilter(issuedFilter, receipt.blockNumber, receipt.blockNumber);

    // Find the event in this specific tx
    const matchingEvent = (events as any[]).find((e) => e.transactionHash.toLowerCase() === txHash.toLowerCase());
    
    if (matchingEvent && matchingEvent.args) {
      // The first argument of CertificateIssued is certificateId
      const certId = matchingEvent.args[0] || matchingEvent.args.certificateId;
      if (certId) {
        console.log(`[getCertificateByTxHash] Decoded certId ${certId} from event in tx ${txHash}`);
        const fullCert = await getCertificateById(certId);
        if (fullCert) {
          return {
            ...fullCert,
            txHash, // Ensure we use the exact txHash searched
          };
        }
      }
    }

    // STRATEGY 2.5: If event lookup failed, but we have a valid receipt, try to see if we can get certId from logs
    if (receipt && receipt.logs) {
      console.log(`[getCertificateByTxHash] Searching logs in receipt for ${txHash}`);
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "CertificateIssued") {
            const certId = parsedLog.args[0] || parsedLog.args.certificateId;
            if (certId) {
              console.log(`[getCertificateByTxHash] Decoded certId ${certId} from receipt logs for tx ${txHash}`);
              const fullCert = await getCertificateById(certId);
              if (fullCert) return { ...fullCert, txHash };
            }
          }
        } catch (e) {
          // Not our event or can't parse
        }
      }
    }

    // STRATEGY 3: Fallback (Heavy scanning - last resort)
    const count = Number(await contract.getAllCertificateIdsCount());
    // Only scan a limited number of recent certs to avoid hanging
    const scanLimit = Math.min(count, 50); 
    for (let i = count - 1; i >= count - scanLimit; i--) {
      const certId: string = await contract.getCertificateIdByIndex(i);
      const fullCert = await getCertificateById(certId);
      if (fullCert && fullCert.txHash && fullCert.txHash.toLowerCase() === txHash.toLowerCase()) {
        return {
          ...fullCert,
          txHash,
        };
      }
    }

    return null;
  } catch (err) {
    console.error(`[getCertificateByTxHash] Error:`, (err as any)?.message);
    return null;
  }
}

/** Find all certificates issued by a wallet address */
export async function getCertificatesByWallet(walletAddress: string): Promise<Certificate[]> {
  try {
    // STRATEGY 1: Try backend first
    try {
      const backendResults = await listCertificatesFromBackend({ wallet: walletAddress });
      if (backendResults && backendResults.length > 0) {
        console.log(`[getCertificatesByWallet] Found ${backendResults.length} certs in backend for ${walletAddress}`);
        return backendResults.map(backendData => ({
          certId: backendData.certId,
          txHash: backendData.blockchain?.txHash || "",
          blockNumber: backendData.blockchain?.blockNumber || 0,
          studentName: backendData.studentName,
          studentWallet: backendData.studentWallet,
          degree: backendData.degree,
          institution: backendData.institution,
          issueDate: backendData.issueDate,
          ipfsHash: backendData.ipfs?.ipfsHash || "",
          status: backendData.status === "issued" ? "verified" : 
                  backendData.status === "revoked" ? "invalid" : 
                  backendData.status || "verified",
          gasUsed: backendData.blockchain?.gasUsed || 0,
          networkFee: backendData.blockchain?.gasUsed ? `${(backendData.blockchain.gasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
        }));
      }
    } catch (backendErr) {
      console.warn(`[getCertificatesByWallet] Backend lookup failed:`, (backendErr as any)?.message);
    }

    // STRATEGY 2: On-chain scanning (Filtered & limited)
    const contract = getReadContract();
    const count = Number(await contract.getAllCertificateIdsCount());
    const results: Certificate[] = [];

    // Scan backwards, limited to 100 most recent for performance
    const scanLimit = Math.min(count, 100);
    for (let i = count - 1; i >= count - scanLimit; i--) {
      const certId: string = await contract.getCertificateIdByIndex(i);
      const cert = await contract.getCertificate(certId);
      if (cert.issuer.toLowerCase() === walletAddress.toLowerCase()) {
        const fullCert = await getCertificateById(certId);
        if (fullCert) results.push(fullCert);
      }
    }
    return results;
  } catch (err) {
    console.error(`[getCertificatesByWallet] Error:`, (err as any)?.message);
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

/** Get recent certificates without scanning the entire chain state */
export async function getRecentCertificates(limit: number = 5): Promise<Certificate[]> {
  const normalizedLimit = Math.max(1, Math.min(25, Math.floor(limit)));
  const now = Date.now();

  const cached = _recentCertificatesCache.get(normalizedLimit);
  if (cached && now - cached.timestamp < RECENT_CERTIFICATES_CACHE_TTL) {
    return cached.data;
  }

  const inFlight = _recentCertificatesInFlight.get(normalizedLimit);
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      // STRATEGY 1: Try fetching everything from backend first (fastest & most reliable for recent)
      try {
        const backendCerts = await getRecentCertificatesFromBackend(normalizedLimit);
        if (backendCerts && backendCerts.length > 0) {
          const mappedCerts: Certificate[] = backendCerts.map((bc: any) => ({
            certId: bc.certId,
            txHash: bc.blockchain?.txHash || "",
            blockNumber: bc.blockchain?.blockNumber || 0,
            studentName: bc.studentName,
            studentWallet: bc.studentWallet,
            degree: bc.degree,
            institution: bc.institution,
            issueDate: bc.issueDate,
            ipfsHash: bc.ipfs?.ipfsHash || "",
            status: bc.status === "issued" ? "verified" : 
                    bc.status === "revoked" ? "invalid" : 
                    bc.status || "verified",
            gasUsed: bc.blockchain?.gasUsed || 0,
            networkFee: bc.blockchain?.gasUsed ? `${(bc.blockchain.gasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
          }));

          // If we got enough certificates from backend, use them directly
          if (mappedCerts.length >= normalizedLimit) {
            console.log(`[Certificate Loader] Loaded ${mappedCerts.length} certificates from backend`);
            _recentCertificatesCache.set(normalizedLimit, { data: mappedCerts, timestamp: Date.now() });
            return mappedCerts;
          }
        }
      } catch (err) {
        console.warn("[Certificate Loader] Backend recent fetch failed, falling back to blockchain scan:", err);
      }

      // STRATEGY 2: Fallback to manual blockchain scan (legacy mode)
      const contract = getReadContract();
      
      let count: number;
      try {
        count = Number(
          await withRpcRateLimitRetry(() => contract.getAllCertificateIdsCount())
        );
      } catch (err) {
        console.error("[Certificate Loader] Failed to get certificate count:", err);
        _recentCertificatesCache.set(normalizedLimit, { data: [], timestamp: now });
        return [];
      }

      if (count === 0) {
        _recentCertificatesCache.set(normalizedLimit, { data: [], timestamp: now });
        return [];
      }

      const start = Math.max(0, count - normalizedLimit);
      const certificates: Certificate[] = [];

      // Get current block number once for efficient event querying
      let currentBlock: number = 0;
      try {
        const provider = getReadProvider();
        currentBlock = await withRpcRateLimitRetry(() => provider.getBlockNumber());
        console.log(`[Certificate Loader] Current block: ${currentBlock}`);
      } catch (err) {
        console.warn("[Certificate Loader] Failed to get current block number:", err);
      }

      for (let i = count - 1; i >= start; i--) {
        try {
          const certId = await withRpcRateLimitRetry(() => contract.getCertificateIdByIndex(i));
          
          // STRATEGY 1: Try backend database first
          let backendCert: any = null;
          try {
            backendCert = await getCertificateData(certId);
            if (backendCert && backendCert.blockchain?.blockNumber && backendCert.blockchain.blockNumber > 0) {
              console.log(`[Certificate Loader] Using backend data for ${certId}, block ${backendCert.blockchain.blockNumber}`);
              certificates.push({
                certId: backendCert.certId,
                txHash: backendCert.blockchain.txHash || "",
                blockNumber: backendCert.blockchain.blockNumber,
                studentName: backendCert.studentName,
                studentWallet: backendCert.studentWallet,
                degree: backendCert.degree,
                institution: backendCert.institution,
                issueDate: backendCert.issueDate,
                ipfsHash: backendCert.ipfs?.ipfsHash || "",
                status: backendCert.status === "issued" ? "verified" : 
                        backendCert.status === "revoked" ? "invalid" : 
                        backendCert.status || "verified",
                gasUsed: backendCert.blockchain?.gasUsed || 0,
                networkFee: backendCert.blockchain?.gasUsed ? `${(backendCert.blockchain.gasUsed * 0.000000001).toFixed(6)} ETH` : undefined,
              });
              continue;
            }
          } catch (backendErr) {
            console.debug(`[Certificate Loader] Backend not available for ${certId}, using contract lookup`);
          }

          // STRATEGY 2: Fallback to contract + event lookup
          const cert = await withRpcRateLimitRetry(() => contract.getCertificate(certId));

          // Query events for this certificate, limited to recent blocks (Alchemy free tier: max 10 block range)
          const filter = contract.filters.CertificateIssued(certId);
          let events: any[] = [];
          try {
            // Start with the most recent 100 blocks to catch recent certificates
            // If that doesn't work, fall back to searching older blocks in chunks
            const toBlock = currentBlock;
            const fromBlock = Math.max(0, currentBlock - 100); // Query last 100 blocks

            console.log(`[Certificate Loader] Querying events for ${certId} from block ${fromBlock} to ${toBlock}`);
            events = await withRpcRateLimitRetry(() =>
              contract.queryFilter(filter, fromBlock, toBlock)
            );

            // If not found in recent blocks, try older blocks in smaller chunks
            if (events.length === 0 && currentBlock > 100) {
              console.log(
                `[Certificate Loader] Certificate ${certId} not in recent blocks, searching older blocks...`
              );
              // Try blocks 100-1000 in the past
              const olderFromBlock = Math.max(0, currentBlock - 1000);
              const olderToBlock = Math.max(0, currentBlock - 100);
              events = await withRpcRateLimitRetry(() =>
                contract.queryFilter(filter, olderFromBlock, olderToBlock)
              );
            }
          } catch (eventErr) {
            console.warn(
              `[Certificate Loader] Failed to query events for ${certId}:`,
              (eventErr as any)?.message || eventErr
            );
            // Continue without event data — we have the certificate data already
          }
          const event = events[0];

          certificates.push({
            certId: String(certId),
            txHash: event?.transactionHash ?? "",
            blockNumber: event?.blockNumber ?? 0,
            studentName: cert.studentName,
            studentWallet: cert.issuer,
            degree: cert.degree,
            institution: cert.institution,
            issueDate: new Date(Number(cert.issueDate) * 1000).toISOString().split("T")[0],
            ipfsHash: cert.ipfsHash,
            status: cert.isValid ? "verified" : "invalid",
            gasUsed: 0,
            networkFee: undefined,
          });
        } catch (itemErr) {
          console.warn(`[Certificate Loader] Failed to load certificate at index ${i}:`, itemErr);
          // Continue to next certificate instead of failing entirely
        }
      }

      _recentCertificatesCache.set(normalizedLimit, {
        data: certificates,
        timestamp: Date.now(),
      });

      return certificates;
    } catch (err) {
      console.error("[Certificate Loader] Unexpected error:", err);
      return [];
    }
  })();

  _recentCertificatesInFlight.set(normalizedLimit, request);

  try {
    return await request;
  } finally {
    _recentCertificatesInFlight.delete(normalizedLimit);
  }
}

// ── Cached network info (avoids repeated RPC calls) ─────────────────────────
let _networkInfoCache: {
  data: Awaited<ReturnType<typeof _fetchNetworkInfo>>;
  timestamp: number;
} | null = null;
let _networkInfoInFlight: Promise<Awaited<ReturnType<typeof _fetchNetworkInfo>>> | null = null;
const NETWORK_CACHE_TTL = 120_000; // 2 minutes

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

/** Get network info from the provider (cached for 2 minutes) */
export async function getNetworkInfo() {
  try {
    const now = Date.now();
    if (_networkInfoCache && now - _networkInfoCache.timestamp < NETWORK_CACHE_TTL) {
      return _networkInfoCache.data;
    }

    if (!_networkInfoInFlight) {
      _networkInfoInFlight = _fetchNetworkInfo();
    }

    const data = await _networkInfoInFlight;
    _networkInfoCache = { data, timestamp: Date.now() };
    return data;
  } catch {
    return {
      name: "Disconnected",
      chainId: 0,
      gasPrice: "N/A",
      blockNumber: 0,
      isTestnet: true,
    };
  } finally {
    _networkInfoInFlight = null;
  }
}

/** Get recent CertificateIssued events */
export async function getRecentActivity(limit: number = 5) {
  try {
    type ActivityItem = {
      type: "issued" | "revoked";
      certId: string;
      institution: string;
      timestamp: string;
      blockNumber: number;
    };

    const recentCertificates = await getRecentCertificates(limit);
    const activities: ActivityItem[] = recentCertificates.map((cert) => {
      const issueDateSeconds = Math.floor(
        new Date(`${cert.issueDate}T00:00:00Z`).getTime() / 1000
      );
      const timestamp = Number.isFinite(issueDateSeconds)
        ? formatTimeAgo(issueDateSeconds)
        : cert.issueDate;

      return {
        type: cert.status === "invalid" ? "revoked" : "issued",
        certId: cert.certId,
        institution: cert.institution,
        timestamp,
        blockNumber: cert.blockNumber,
      };
    });

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
