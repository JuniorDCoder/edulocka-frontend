// ============================================================================
// Contract Configuration — ABI + Address for the deployed CertificateRegistry
// ============================================================================

// ── Network Configuration ────────────────────────────────────────────────────
// Toggle between local dev and Sepolia testnet via NEXT_PUBLIC_NETWORK env var.
// Default: "sepolia" for production, "local" for local development.
const ACTIVE_NETWORK = process.env.NEXT_PUBLIC_NETWORK || "sepolia";

// Contract addresses per network (update SEPOLIA address after deployment)
const ADDRESSES: Record<string, string> = {
  local: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  sepolia: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
};

const RPC_URLS: Record<string, string> = {
  local: "http://127.0.0.1:8545",
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR-KEY",
};

const CHAIN_IDS: Record<string, number> = {
  local: 31337,
  sepolia: 11155111,
};

export const CONTRACT_ADDRESS = ADDRESSES[ACTIVE_NETWORK] || ADDRESSES.sepolia;
export const RPC_URL = RPC_URLS[ACTIVE_NETWORK] || RPC_URLS.sepolia;
export const TARGET_CHAIN_ID = CHAIN_IDS[ACTIVE_NETWORK] || CHAIN_IDS.sepolia;

// Keep legacy exports for backward compatibility
export const HARDHAT_CHAIN_ID = TARGET_CHAIN_ID;
export const HARDHAT_RPC_URL = RPC_URL;

// Etherscan base URL for the active network
export const ETHERSCAN_BASE_URL =
  ACTIVE_NETWORK === "local" ? "" : "https://sepolia.etherscan.io";

export const IS_LOCAL = ACTIVE_NETWORK === "local";

// Minimal ABI — only the functions/events we use from the frontend
export const CONTRACT_ABI = [
  // ── Read Functions (free, no gas) ──────────────────────────────────────
  "function getTotalCertificates() view returns (uint256)",
  "function totalInstitutions() view returns (uint256)",
  "function totalRevocations() view returns (uint256)",
  "function getAllCertificateIdsCount() view returns (uint256)",
  "function getCertificateIdByIndex(uint256 _index) view returns (string)",
  "function isAuthorizedInstitution(address _institution) view returns (bool)",
  "function isAuthorized(address) view returns (bool)",
  "function certificateExistsCheck(string _certificateId) view returns (bool)",
  "function owner() view returns (address)",
  "function maxDailyCertificates() view returns (uint256)",

  // getCertificate returns a tuple (struct)
  "function getCertificate(string _certificateId) view returns (tuple(string studentName, string studentId, string degree, string institution, uint256 issueDate, string ipfsHash, address issuer, bool isValid, bool exists))",

  // verifyCertificate returns multiple values
  "function verifyCertificate(string _certificateId) view returns (bool isValid, string studentName, string degree, string institution, uint256 issueDate, address issuer)",

  // Institution management reads
  "function getInstitution(address _institution) view returns (tuple(string name, string registrationNumber, string country, bool isActive, uint256 authorizedDate, uint256 totalIssued, uint256 dailyIssued, uint256 lastIssuedDate))",
  "function getAllInstitutionCount() view returns (uint256)",
  "function getInstitutionAddressByIndex(uint256 _index) view returns (address)",

  // ── Write Functions (cost gas) ─────────────────────────────────────────
  "function issueCertificate(string _certificateId, string _studentName, string _studentId, string _degree, string _institution, uint256 _issueDate, string _ipfsHash)",
  "function revokeCertificate(string _certificateId)",
  "function addInstitution(address _institution, string _name, string _registrationNumber, string _country)",
  "function removeInstitution(address _institution)",
  "function suspendInstitution(address _institution)",
  "function reactivateInstitution(address _institution)",
  "function setMaxDailyCertificates(uint256 _limit)",

  // ── Events ─────────────────────────────────────────────────────────────
  "event CertificateIssued(string indexed certificateId, string studentName, string institution, address indexed issuer, uint256 timestamp)",
  "event CertificateRevoked(string indexed certificateId, address indexed revokedBy, uint256 timestamp)",
  "event CertificateVerified(string indexed certificateId, address verifier, bool isValid)",
  "event InstitutionAdded(address indexed institution, address indexed authorizedBy, string name, string registrationNumber, string country)",
  "event InstitutionRemoved(address indexed institution, address indexed removedBy)",
  "event InstitutionSuspended(address indexed institution, address indexed suspendedBy)",
  "event InstitutionReactivated(address indexed institution, address indexed reactivatedBy)",
  "event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit)",
] as const;
