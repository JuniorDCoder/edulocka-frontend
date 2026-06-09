export interface Certificate {
  certId: string;
  txHash: string;
  blockNumber: number;
  studentName: string;
  studentWallet: string;
  degree: string;
  institution: string;
  issueDate: string;
  ipfsHash: string;
  status: "verified" | "pending" | "invalid";
  gasUsed?: number;
  networkFee?: string;
}

export interface WalletState {
  connected: boolean;
  address: string;
  balance: string;
  chainId: number;
  chainName: string;
  signer?: import("ethers").JsonRpcSigner;
}

export interface NetworkInfo {
  name: string;
  chainId: number;
  gasPrice: string;
  blockNumber: number;
  isTestnet: boolean;
}

export interface TransactionStep {
  label: string;
  status: "waiting" | "processing" | "completed" | "failed";
  txHash?: string;
  blockNumber?: number;
  timestamp?: string;
}

// ── Institution Types ───────────────────────────────────────────────────────

export interface InstitutionInfo {
  address: string;
  name: string;
  registrationNumber: string;
  country: string;
  isActive: boolean;
  isAuthorized: boolean;
  authorizedDate: number;
  totalIssued: number;
}

export interface InstitutionApplication {
  _id: string;
  institutionName: string;
  registrationNumber: string;
  country: string;
  walletAddress: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  description?: string;
  documents: {
    registrationCert?: string;
    accreditationProof?: string;
    letterOfIntent?: string;
    idDocument?: string;
  };
  status: "pending" | "under_review" | "approved" | "rejected";
  verificationChecks: {
    documentVerified: boolean;
    governmentRegistryChecked: boolean;
    accreditationVerified: boolean;
    physicalAddressVerified: boolean;
  };
  adminNotes: string;
  blockchainTxHash?: string;
  authorizedOnChain: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Student Portal Types ─────────────────────────────────────────────────────

export interface StudentProfile {
  studentId: string;
  studentName: string;
  institutions: string[];
  stats: { total: number; issued: number; revoked: number };
}

export interface StudentCertificate {
  certId: string;
  studentName: string;
  studentId: string | null;
  degree: string;
  institution: string;
  issueDate: string;
  status: "issued" | "revoked";
  blockchain: {
    txHash: string | null;
    blockNumber: number | null;
    issuedAt: string | null;
  };
  ipfs: {
    ipfsHash: string | null;
    documentHash: string | null;
    gateway: string | null;
  };
  revokedAt: string | null;
  createdAt: string;
}

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

export interface AdminStats {
  totalApplications: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  totalOnChainInstitutions: number;
  recentApplications: InstitutionApplication[];
}
