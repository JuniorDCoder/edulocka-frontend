"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { ethers } from "ethers";
import { WalletState } from "./types";
import { HARDHAT_CHAIN_ID } from "./contract-config";

interface WalletContextType {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const defaultWallet: WalletState = {
  connected: false,
  address: "",
  balance: "0",
  chainId: 0,
  chainName: "",
};

const WalletContext = createContext<WalletContextType>({
  wallet: defaultWallet,
  connect: async () => {},
  disconnect: () => {},
});

function getChainName(chainId: number): string {
  switch (chainId) {
    case 1: return "Ethereum Mainnet";
    case 5: return "Goerli Testnet";
    case 11155111: return "Sepolia Testnet";
    case 31337: return "Hardhat Local";
    default: return `Chain ${chainId}`;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(defaultWallet);

  // Fetch balance and chain info for a connected address
  const updateWalletInfo = useCallback(async (address: string) => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const signer = await provider.getSigner(address);

      setWallet({
        connected: true,
        address,
        balance: parseFloat(ethers.formatEther(balance)).toFixed(4),
        chainId,
        chainName: getChainName(chainId),
        signer,
      });
    } catch (err) {
      console.error("Failed to update wallet info:", err);
    }
  }, []);

  // Ensure user is on Hardhat local network, prompt switch if not
  const switchToHardhat = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${HARDHAT_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: unknown) {
      // Chain not added yet — add it
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${HARDHAT_CHAIN_ID.toString(16)}`,
                chainName: "Hardhat Local",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["http://127.0.0.1:8545"],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Hardhat chain:", addError);
        }
      }
    }
  }, []);

  // Connect wallet via MetaMask
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install MetaMask to use this app.");
      return;
    }

    try {
      // Request account access
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length === 0) return;

      // Switch to Hardhat local network
      await switchToHardhat();

      // Update wallet state
      await updateWalletInfo(accounts[0]);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  }, [switchToHardhat, updateWalletInfo]);

  // Disconnect wallet (client-side only — MetaMask stays connected)
  const disconnect = useCallback(() => {
    setWallet(defaultWallet);
  }, []);

  // Listen for account & chain changes from MetaMask
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        setWallet(defaultWallet);
      } else {
        updateWalletInfo(accs[0]);
      }
    };

    const handleChainChanged = () => {
      // Re-fetch wallet info on chain change
      if (wallet.address) {
        updateWalletInfo(wallet.address);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [wallet.address, updateWalletInfo]);

  // Auto-reconnect if already authorized
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    (async () => {
      try {
        const accounts = (await window.ethereum!.request({
          method: "eth_accounts",
        })) as string[];
        if (accounts.length > 0) {
          await updateWalletInfo(accounts[0]);
        }
      } catch {
        // Silently fail
      }
    })();
  }, [updateWalletInfo]);

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
