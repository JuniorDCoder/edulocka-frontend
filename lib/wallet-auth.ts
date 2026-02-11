"use client";

import { WalletAuth } from "@/lib/api-client";
import { WalletState } from "@/lib/types";

export function getWalletAuth(wallet: WalletState): WalletAuth | null {
  if (!wallet.connected || !wallet.address || !wallet.signer) return null;
  return {
    address: wallet.address,
    signMessage: (message: string) => wallet.signer!.signMessage(message),
  };
}

export async function signAdminAuth(wallet: WalletState): Promise<{
  address: string;
  signature: string;
  message: string;
}> {
  if (!wallet.connected || !wallet.address || !wallet.signer) {
    throw new Error("Connect wallet before admin authentication.");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `Edulocka Admin: ${timestamp}`;
  const signature = await wallet.signer.signMessage(message);
  return { address: wallet.address, signature, message };
}
