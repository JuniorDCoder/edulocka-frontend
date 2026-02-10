import { Certificate, NetworkInfo } from "./types";

// These are still used as fallbacks when the chain is unreachable
export const mockCertificates: Certificate[] = [];

export const mockNetworkInfo: NetworkInfo = {
  name: "Hardhat Local",
  chainId: 31337,
  gasPrice: "1.0 Gwei",
  blockNumber: 0,
  isTestnet: true,
};

export const mockStats = {
  totalCertificates: 0,
  totalInstitutions: 0,
  totalVerifications: 0,
  activeNodes: 1,
};

export const mockRecentActivity: {
  type: "issued" | "revoked";
  certId: string;
  institution: string;
  timestamp: string;
  blockNumber: number;
}[] = [];

export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function truncateHash(hash: string): string {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
